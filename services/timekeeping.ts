// services/timekeeping.ts
// Employee timekeeping service (no payment processing)

import { supabase } from '../supabase';

// ============================================================
// TYPES
// ============================================================

export interface TimekeepingRecord {
  id: string;
  allocation_id: string;
  rota_shift_id: string;
  team_member_id: string;
  venue_id: string;
  scheduled_start: string;
  scheduled_end: string;
  clock_in?: string;
  clock_out?: string;
  clock_in_approved_by?: string;
  clock_out_approved_by?: string;
  break_minutes: number;
  break_auto_calculated: boolean;
  total_minutes?: number;
  regular_minutes?: number;
  overtime_minutes?: number;
  status: 'pending' | 'clocked_in' | 'clocked_out' | 'approved' | 'disputed' | 'cancelled';
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  dispute_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface TimekeepingRecordWithDetails extends TimekeepingRecord {
  team_member: {
    id: string;
    full_name: string;
    employment_type: string;
  };
  shift: {
    id: string;
    shift_date: string;
    start_time: string;
    end_time: string;
    role: {
      id: string;
      name: string;
      colour: string;
    };
  };
  venue: {
    id: string;
    name: string;
  };
}

export interface TimekeepingSummary {
  team_member_id: string;
  full_name: string;
  total_shifts: number;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
  pending_approval: number;
}

// ============================================================
// CLOCK IN/OUT FUNCTIONS
// ============================================================

/**
 * Clock in for a shift
 */
export async function clockIn(
  allocationId: string,
  approvedBy?: string
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('employee_clock_in', {
      p_allocation_id: allocationId,
      p_approved_by: approvedBy,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error clocking in:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Clock out from a shift
 */
export async function clockOut(
  allocationId: string,
  approvedBy?: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.rpc('employee_clock_out', {
      p_allocation_id: allocationId,
      p_approved_by: approvedBy,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error clocking out:', error);
    return { error: error as Error };
  }
}

/**
 * Get current active clock-in for a team member
 */
export async function getActiveClockIn(
  teamMemberId: string
): Promise<{ data: TimekeepingRecordWithDetails | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('timekeeping_records')
      .select(`
        *,
        team_member:team_members(id, full_name, employment_type),
        shift:rota_shifts(
          id,
          shift_date,
          start_time,
          end_time,
          role:roles(id, name, colour)
        ),
        venue:venues(id, name)
      `)
      .eq('team_member_id', teamMemberId)
      .eq('status', 'clocked_in')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return { data: data || null, error: null };
  } catch (error) {
    console.error('Error getting active clock-in:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// TIMEKEEPING RECORD FUNCTIONS
// ============================================================

/**
 * Get timekeeping record by ID
 */
export async function getTimekeepingRecord(
  recordId: string
): Promise<{ data: TimekeepingRecordWithDetails | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('timekeeping_records')
      .select(`
        *,
        team_member:team_members(id, full_name, employment_type),
        shift:rota_shifts(
          id,
          shift_date,
          start_time,
          end_time,
          role:roles(id, name, colour)
        ),
        venue:venues(id, name)
      `)
      .eq('id', recordId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting timekeeping record:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get timekeeping records for a venue
 */
export async function getTimekeepingRecordsByVenue(
  venueId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    status?: TimekeepingRecord['status'][];
    teamMemberId?: string;
  }
): Promise<{ data: TimekeepingRecordWithDetails[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('timekeeping_records')
      .select(`
        *,
        team_member:team_members(id, full_name, employment_type),
        shift:rota_shifts(
          id,
          shift_date,
          start_time,
          end_time,
          role:roles(id, name, colour)
        ),
        venue:venues(id, name)
      `)
      .eq('venue_id', venueId);

    if (options?.status) {
      query = query.in('status', options.status);
    }

    if (options?.teamMemberId) {
      query = query.eq('team_member_id', options.teamMemberId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Filter by date if specified
    let result = data || [];
    if (options?.startDate) {
      result = result.filter((r) => r.shift.shift_date >= options.startDate!);
    }
    if (options?.endDate) {
      result = result.filter((r) => r.shift.shift_date <= options.endDate!);
    }

    return { data: result, error: null };
  } catch (error) {
    console.error('Error getting timekeeping records:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get timekeeping records for a team member
 */
export async function getTimekeepingRecordsForTeamMember(
  teamMemberId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    status?: TimekeepingRecord['status'][];
    limit?: number;
  }
): Promise<{ data: TimekeepingRecordWithDetails[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('timekeeping_records')
      .select(`
        *,
        team_member:team_members(id, full_name, employment_type),
        shift:rota_shifts(
          id,
          shift_date,
          start_time,
          end_time,
          role:roles(id, name, colour)
        ),
        venue:venues(id, name)
      `)
      .eq('team_member_id', teamMemberId);

    if (options?.status) {
      query = query.in('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    // Filter by date if specified
    let result = data || [];
    if (options?.startDate) {
      result = result.filter((r) => r.shift.shift_date >= options.startDate!);
    }
    if (options?.endDate) {
      result = result.filter((r) => r.shift.shift_date <= options.endDate!);
    }

    return { data: result, error: null };
  } catch (error) {
    console.error('Error getting timekeeping records for team member:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// APPROVAL FUNCTIONS
// ============================================================

/**
 * Approve a timekeeping record
 */
export async function approveTimekeeping(
  recordId: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('approve_timekeeping', {
      p_record_id: recordId,
      p_approved_by: user.id,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error approving timekeeping:', error);
    return { error: error as Error };
  }
}

/**
 * Bulk approve timekeeping records
 */
export async function bulkApproveTimekeeping(
  recordIds: string[]
): Promise<{ approved: number; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    let approved = 0;
    for (const recordId of recordIds) {
      const { error } = await supabase
        .from('timekeeping_records')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', recordId)
        .eq('status', 'clocked_out');

      if (!error) approved++;
    }

    return { approved, error: null };
  } catch (error) {
    console.error('Error bulk approving timekeeping:', error);
    return { approved: 0, error: error as Error };
  }
}

/**
 * Dispute a timekeeping record
 */
export async function disputeTimekeeping(
  recordId: string,
  reason: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('timekeeping_records')
      .update({
        status: 'disputed',
        dispute_reason: reason,
      })
      .eq('id', recordId)
      .in('status', ['clocked_out', 'approved']);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error disputing timekeeping:', error);
    return { error: error as Error };
  }
}

/**
 * Update timekeeping record (manual adjustment)
 */
export async function updateTimekeepingRecord(
  recordId: string,
  updates: {
    clock_in?: string;
    clock_out?: string;
    break_minutes?: number;
    notes?: string;
  }
): Promise<{ data: TimekeepingRecord | null; error: Error | null }> {
  try {
    // If times are updated, recalculate hours
    let calculatedUpdates: any = { ...updates };
    
    if (updates.clock_in || updates.clock_out) {
      const { data: record } = await supabase
        .from('timekeeping_records')
        .select('clock_in, clock_out, break_minutes')
        .eq('id', recordId)
        .single();

      if (record) {
        const clockIn = new Date(updates.clock_in || record.clock_in);
        const clockOut = new Date(updates.clock_out || record.clock_out);
        const breakMins = updates.break_minutes ?? record.break_minutes;

        const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000) - breakMins;
        const regularMinutes = Math.min(totalMinutes, 480); // 8 hours
        const overtimeMinutes = Math.max(0, totalMinutes - 480);

        calculatedUpdates = {
          ...calculatedUpdates,
          total_minutes: totalMinutes,
          regular_minutes: regularMinutes,
          overtime_minutes: overtimeMinutes,
          break_auto_calculated: false,
        };
      }
    }

    const { data, error } = await supabase
      .from('timekeeping_records')
      .update(calculatedUpdates)
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating timekeeping record:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// REPORTING FUNCTIONS
// ============================================================

/**
 * Get timekeeping summary for a venue
 */
export async function getTimekeepingSummaryByVenue(
  venueId: string,
  startDate: string,
  endDate: string
): Promise<{ data: TimekeepingSummary[] | null; error: Error | null }> {
  try {
    const { data: records, error: recordsError } = await supabase
      .from('timekeeping_records')
      .select(`
        team_member_id,
        total_minutes,
        regular_minutes,
        overtime_minutes,
        status,
        team_member:team_members(full_name),
        shift:rota_shifts(shift_date)
      `)
      .eq('venue_id', venueId)
      .in('status', ['clocked_out', 'approved']);

    if (recordsError) throw recordsError;

    // Filter by date
    const filteredRecords = records?.filter(
      (r) => r.shift.shift_date >= startDate && r.shift.shift_date <= endDate
    ) || [];

    // Group by team member
    const summaryMap = new Map<string, TimekeepingSummary>();

    for (const record of filteredRecords) {
      const existing = summaryMap.get(record.team_member_id) || {
        team_member_id: record.team_member_id,
        full_name: record.team_member.full_name,
        total_shifts: 0,
        total_hours: 0,
        regular_hours: 0,
        overtime_hours: 0,
        pending_approval: 0,
      };

      existing.total_shifts++;
      existing.total_hours += (record.total_minutes || 0) / 60;
      existing.regular_hours += (record.regular_minutes || 0) / 60;
      existing.overtime_hours += (record.overtime_minutes || 0) / 60;
      if (record.status === 'clocked_out') {
        existing.pending_approval++;
      }

      summaryMap.set(record.team_member_id, existing);
    }

    const summary = Array.from(summaryMap.values()).sort((a, b) => 
      a.full_name.localeCompare(b.full_name)
    );

    return { data: summary, error: null };
  } catch (error) {
    console.error('Error getting timekeeping summary:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Export timekeeping records to CSV format
 */
export async function exportTimekeepingToCSV(
  venueId: string,
  startDate: string,
  endDate: string
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data: records, error: recordsError } = await getTimekeepingRecordsByVenue(
      venueId,
      { startDate, endDate, status: ['approved'] }
    );

    if (recordsError) throw recordsError;
    if (!records || records.length === 0) {
      return { data: null, error: new Error('No records found') };
    }

    // Build CSV
    const headers = [
      'Date',
      'Employee',
      'Role',
      'Scheduled Start',
      'Scheduled End',
      'Clock In',
      'Clock Out',
      'Break (mins)',
      'Total Hours',
      'Regular Hours',
      'Overtime Hours',
      'Status',
    ];

    const rows = records.map((r) => [
      r.shift.shift_date,
      r.team_member.full_name,
      r.shift.role.name,
      r.scheduled_start,
      r.scheduled_end,
      r.clock_in ? new Date(r.clock_in).toLocaleTimeString() : '',
      r.clock_out ? new Date(r.clock_out).toLocaleTimeString() : '',
      r.break_minutes,
      ((r.total_minutes || 0) / 60).toFixed(2),
      ((r.regular_minutes || 0) / 60).toFixed(2),
      ((r.overtime_minutes || 0) / 60).toFixed(2),
      r.status,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    return { data: csv, error: null };
  } catch (error) {
    console.error('Error exporting timekeeping:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get pending approvals count for a venue
 */
export async function getPendingApprovalsCount(
  venueId: string
): Promise<{ count: number; error: Error | null }> {
  try {
    const { count, error } = await supabase
      .from('timekeeping_records')
      .select('*', { count: 'exact', head: true })
      .eq('venue_id', venueId)
      .eq('status', 'clocked_out');

    if (error) throw error;
    return { count: count || 0, error: null };
  } catch (error) {
    console.error('Error getting pending approvals count:', error);
    return { count: 0, error: error as Error };
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Format minutes to hours string (e.g., "8h 30m")
 */
export function formatMinutesToHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format decimal hours (e.g., "8.5 hrs")
 */
export function formatDecimalHours(minutes: number): string {
  return `${(minutes / 60).toFixed(2)} hrs`;
}
