// services/rota.ts
// Rota scheduling service

import { supabase } from '../supabase';
import type { Role } from './roles';

// ============================================================
// TYPES
// ============================================================

export interface RotaShift {
  id: string;
  venue_id: string;
  role_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  headcount_needed: number;
  headcount_filled: number;
  status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled';
  gig_platform_enabled: boolean;
  hourly_rate?: number;
  notes?: string;
  created_by?: string;
  published_at?: string;
  published_by?: string;
  created_at: string;
  updated_at: string;
}

export interface RotaShiftWithDetails extends RotaShift {
  role: Role;
  allocations: ShiftAllocation[];
  invites?: ShiftInvite[];
}

export interface ShiftAllocation {
  id: string;
  rota_shift_id: string;
  team_member_id: string;
  status: 'allocated' | 'confirmed' | 'in_progress' | 'completed' | 'no_show' | 'cancelled' | 'swapped_out';
  allocated_by?: string;
  allocated_at: string;
  confirmed_at?: string;
  notes?: string;
  team_member?: {
    id: string;
    full_name: string;
    employment_type: string;
  };
}

export interface ShiftInvite {
  id: string;
  rota_shift_id: string;
  team_member_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  invited_by?: string;
  invited_at: string;
  responded_at?: string;
  expires_at?: string;
  team_member?: {
    id: string;
    full_name: string;
    employment_type: string;
  };
}

export interface CreateRotaShiftInput {
  venue_id: string;
  role_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  headcount_needed?: number;
  notes?: string;
}

export interface WeeklyRotaView {
  shift_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  role_id: string;
  role_name: string;
  role_colour: string;
  headcount_needed: number;
  headcount_filled: number;
  status: string;
  allocations: {
    allocation_id: string;
    team_member_id: string;
    full_name: string;
    employment_type: string;
    status: string;
  }[];
}

// ============================================================
// ROTA SHIFT FUNCTIONS
// ============================================================

/**
 * Create a rota shift
 */
export async function createRotaShift(
  input: CreateRotaShiftInput
): Promise<{ data: RotaShift | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('rota_shifts')
      .insert({
        venue_id: input.venue_id,
        role_id: input.role_id,
        shift_date: input.shift_date,
        start_time: input.start_time,
        end_time: input.end_time,
        headcount_needed: input.headcount_needed || 1,
        notes: input.notes,
        created_by: user.id,
        status: 'draft',
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating rota shift:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Create multiple rota shifts (batch)
 */
export async function createRotaShiftsBatch(
  shifts: CreateRotaShiftInput[]
): Promise<{ data: RotaShift[] | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const shiftsWithDefaults = shifts.map((shift) => ({
      venue_id: shift.venue_id,
      role_id: shift.role_id,
      shift_date: shift.shift_date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      headcount_needed: shift.headcount_needed || 1,
      notes: shift.notes,
      created_by: user.id,
      status: 'draft' as const,
    }));

    const { data, error } = await supabase
      .from('rota_shifts')
      .insert(shiftsWithDefaults)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating rota shifts batch:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get rota shift by ID
 */
export async function getRotaShift(
  shiftId: string
): Promise<{ data: RotaShiftWithDetails | null; error: Error | null }> {
  try {
    const { data: shift, error: shiftError } = await supabase
      .from('rota_shifts')
      .select(`
        *,
        role:roles(*)
      `)
      .eq('id', shiftId)
      .single();

    if (shiftError) throw shiftError;

    // Get allocations
    const { data: allocations } = await supabase
      .from('shift_allocations')
      .select(`
        *,
        team_member:team_members(id, full_name, employment_type)
      `)
      .eq('rota_shift_id', shiftId)
      .not('status', 'in', '("cancelled","swapped_out")');

    // Get invites
    const { data: invites } = await supabase
      .from('shift_invites')
      .select(`
        *,
        team_member:team_members(id, full_name, employment_type)
      `)
      .eq('rota_shift_id', shiftId);

    return {
      data: {
        ...shift,
        allocations: allocations || [],
        invites: invites || [],
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting rota shift:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update rota shift
 */
export async function updateRotaShift(
  shiftId: string,
  updates: Partial<CreateRotaShiftInput> & { status?: RotaShift['status'] }
): Promise<{ data: RotaShift | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('rota_shifts')
      .update(updates)
      .eq('id', shiftId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating rota shift:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete rota shift
 */
export async function deleteRotaShift(
  shiftId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('rota_shifts')
      .delete()
      .eq('id', shiftId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting rota shift:', error);
    return { error: error as Error };
  }
}

/**
 * Cancel rota shift (soft delete)
 */
export async function cancelRotaShift(
  shiftId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('rota_shifts')
      .update({ status: 'cancelled' })
      .eq('id', shiftId);

    if (error) throw error;

    // Cancel all allocations
    await supabase
      .from('shift_allocations')
      .update({ status: 'cancelled' })
      .eq('rota_shift_id', shiftId)
      .in('status', ['allocated', 'confirmed']);

    // Expire all pending invites
    await supabase
      .from('shift_invites')
      .update({ status: 'expired' })
      .eq('rota_shift_id', shiftId)
      .eq('status', 'pending');

    return { error: null };
  } catch (error) {
    console.error('Error cancelling rota shift:', error);
    return { error: error as Error };
  }
}

// ============================================================
// WEEKLY ROTA FUNCTIONS
// ============================================================

/**
 * Get weekly rota for a venue
 */
export async function getWeeklyRota(
  venueId: string,
  weekStart: string // YYYY-MM-DD (Monday)
): Promise<{ data: WeeklyRotaView[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_weekly_rota', {
      p_venue_id: venueId,
      p_week_start: weekStart,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting weekly rota:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Copy rota from one week to another
 */
export async function copyRotaWeek(
  venueId: string,
  sourceWeekStart: string,
  targetWeekStart: string
): Promise<{ count: number; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('copy_rota_week', {
      p_venue_id: venueId,
      p_source_week_start: sourceWeekStart,
      p_target_week_start: targetWeekStart,
      p_created_by: user.id,
    });

    if (error) throw error;
    return { count: data || 0, error: null };
  } catch (error) {
    console.error('Error copying rota week:', error);
    return { count: 0, error: error as Error };
  }
}

/**
 * Publish rota for a week
 */
export async function publishRotaWeek(
  venueId: string,
  weekStart: string
): Promise<{ count: number; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('publish_rota_week', {
      p_venue_id: venueId,
      p_week_start: weekStart,
      p_published_by: user.id,
    });

    if (error) throw error;

    // TODO: Send notifications to team members

    return { count: data || 0, error: null };
  } catch (error) {
    console.error('Error publishing rota week:', error);
    return { count: 0, error: error as Error };
  }
}

/**
 * Get rota shifts by date range
 */
export async function getRotaShiftsByDateRange(
  venueId: string,
  startDate: string,
  endDate: string
): Promise<{ data: RotaShiftWithDetails[] | null; error: Error | null }> {
  try {
    const { data: shifts, error: shiftsError } = await supabase
      .from('rota_shifts')
      .select(`
        *,
        role:roles(*)
      `)
      .eq('venue_id', venueId)
      .gte('shift_date', startDate)
      .lte('shift_date', endDate)
      .neq('status', 'cancelled')
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (shiftsError) throw shiftsError;

    const shiftIds = shifts?.map((s) => s.id) || [];

    const { data: allAllocations } = await supabase
      .from('shift_allocations')
      .select(`
        *,
        team_member:team_members(id, full_name, employment_type)
      `)
      .in('rota_shift_id', shiftIds)
      .not('status', 'in', '("cancelled","swapped_out")');

    const result: RotaShiftWithDetails[] = shifts?.map((shift) => ({
      ...shift,
      allocations: allAllocations?.filter((a) => a.rota_shift_id === shift.id) || [],
    })) || [];

    return { data: result, error: null };
  } catch (error) {
    console.error('Error getting rota shifts by date range:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// ALLOCATION FUNCTIONS
// ============================================================

/**
 * Allocate a team member to a shift
 */
export async function allocateTeamMember(
  shiftId: string,
  teamMemberId: string
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('allocate_team_member', {
      p_rota_shift_id: shiftId,
      p_team_member_id: teamMemberId,
      p_allocated_by: user.id,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error allocating team member:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Remove allocation
 */
export async function removeAllocation(
  allocationId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('shift_allocations')
      .update({ status: 'cancelled' })
      .eq('id', allocationId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error removing allocation:', error);
    return { error: error as Error };
  }
}

/**
 * Get allocations for a team member
 */
export async function getAllocationsForTeamMember(
  teamMemberId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    status?: ShiftAllocation['status'][];
  }
): Promise<{ data: (ShiftAllocation & { shift: RotaShiftWithDetails })[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('shift_allocations')
      .select(`
        *,
        shift:rota_shifts(
          *,
          role:roles(*),
          venue:venues(id, name)
        )
      `)
      .eq('team_member_id', teamMemberId);

    if (options?.status) {
      query = query.in('status', options.status);
    } else {
      query = query.not('status', 'in', '("cancelled","swapped_out")');
    }

    const { data, error } = await query.order('allocated_at', { ascending: false });

    if (error) throw error;

    // Filter by date if specified
    let result = data || [];
    if (options?.startDate) {
      result = result.filter((a) => a.shift.shift_date >= options.startDate!);
    }
    if (options?.endDate) {
      result = result.filter((a) => a.shift.shift_date <= options.endDate!);
    }

    return { data: result, error: null };
  } catch (error) {
    console.error('Error getting allocations for team member:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// INVITE FUNCTIONS
// ============================================================

/**
 * Get eligible team members for a shift invite
 */
export async function getEligibleTeamMembersForShift(
  shiftId: string,
  includeCrossVenue: boolean = false
): Promise<{
  data: {
    team_member_id: string;
    full_name: string;
    employment_type: string;
    venue_name: string;
    is_primary_venue: boolean;
    is_available: boolean;
    conflict_reason?: string;
  }[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc('get_eligible_team_members_for_shift', {
      p_rota_shift_id: shiftId,
      p_include_cross_venue: includeCrossVenue,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting eligible team members:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Send shift invites to part-timers
 */
export async function sendShiftInvites(
  shiftId: string,
  teamMemberIds: string[]
): Promise<{ data: ShiftInvite[] | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get shift details for expiry
    const { data: shift } = await supabase
      .from('rota_shifts')
      .select('shift_date, start_time')
      .eq('id', shiftId)
      .single();

    const expiresAt = shift
      ? new Date(`${shift.shift_date}T${shift.start_time}`).toISOString()
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const invites = teamMemberIds.map((memberId) => ({
      rota_shift_id: shiftId,
      team_member_id: memberId,
      invited_by: user.id,
      status: 'pending' as const,
      expires_at: expiresAt,
    }));

    const { data, error } = await supabase
      .from('shift_invites')
      .insert(invites)
      .select();

    if (error) throw error;

    // TODO: Send notifications to team members

    return { data, error: null };
  } catch (error) {
    console.error('Error sending shift invites:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Accept a shift invite (first-come-first-served)
 */
export async function acceptShiftInvite(
  inviteId: string
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('accept_shift_invite', {
      p_invite_id: inviteId,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error accepting shift invite:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Decline a shift invite
 */
export async function declineShiftInvite(
  inviteId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.rpc('decline_shift_invite', {
      p_invite_id: inviteId,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error declining shift invite:', error);
    return { error: error as Error };
  }
}

/**
 * Get pending invites for a team member
 */
export async function getPendingInvitesForTeamMember(
  teamMemberId: string
): Promise<{ data: (ShiftInvite & { shift: RotaShiftWithDetails })[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('shift_invites')
      .select(`
        *,
        shift:rota_shifts(
          *,
          role:roles(*),
          venue:venues(id, name, address)
        )
      `)
      .eq('team_member_id', teamMemberId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('invited_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting pending invites:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Cancel shift invite
 */
export async function cancelShiftInvite(
  inviteId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('shift_invites')
      .update({ status: 'cancelled' })
      .eq('id', inviteId)
      .eq('status', 'pending');

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error cancelling shift invite:', error);
    return { error: error as Error };
  }
}

// ============================================================
// TEMPLATE FUNCTIONS
// ============================================================

/**
 * Save current week as template
 */
export async function saveRotaAsTemplate(
  venueId: string,
  weekStart: string,
  templateName: string,
  description?: string
): Promise<{ data: any | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get venue's organisation
    const { data: venue } = await supabase
      .from('venues')
      .select('organisation_id')
      .eq('id', venueId)
      .single();

    if (!venue) throw new Error('Venue not found');

    // Get all shifts for the week
    const { data: shifts } = await supabase
      .from('rota_shifts')
      .select('role_id, shift_date, start_time, end_time, headcount_needed')
      .eq('venue_id', venueId)
      .gte('shift_date', weekStart)
      .lt('shift_date', getDatePlusDays(weekStart, 7))
      .neq('status', 'cancelled');

    if (!shifts || shifts.length === 0) {
      throw new Error('No shifts found for this week');
    }

    // Convert to template format (day number instead of date)
    const weekStartDate = new Date(weekStart);
    const templateData = shifts.map((shift) => {
      const shiftDate = new Date(shift.shift_date);
      const dayNumber = Math.floor((shiftDate.getTime() - weekStartDate.getTime()) / (24 * 60 * 60 * 1000));
      return {
        day: dayNumber,
        role_id: shift.role_id,
        start_time: shift.start_time,
        end_time: shift.end_time,
        headcount: shift.headcount_needed,
      };
    });

    const { data, error } = await supabase
      .from('rota_templates')
      .insert({
        organisation_id: venue.organisation_id,
        venue_id: venueId,
        name: templateName,
        description,
        template_data: templateData,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error saving rota template:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Apply template to a week
 */
export async function applyRotaTemplate(
  templateId: string,
  venueId: string,
  weekStart: string
): Promise<{ count: number; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: template, error: templateError } = await supabase
      .from('rota_templates')
      .select('template_data')
      .eq('id', templateId)
      .single();

    if (templateError) throw templateError;

    const templateData = template.template_data as {
      day: number;
      role_id: string;
      start_time: string;
      end_time: string;
      headcount: number;
    }[];

    const shifts = templateData.map((item) => ({
      venue_id: venueId,
      role_id: item.role_id,
      shift_date: getDatePlusDays(weekStart, item.day),
      start_time: item.start_time,
      end_time: item.end_time,
      headcount_needed: item.headcount,
      created_by: user.id,
      status: 'draft' as const,
    }));

    const { data, error } = await supabase
      .from('rota_shifts')
      .insert(shifts)
      .select();

    if (error) throw error;
    return { count: data?.length || 0, error: null };
  } catch (error) {
    console.error('Error applying rota template:', error);
    return { count: 0, error: error as Error };
  }
}

/**
 * Get templates for a venue/organisation
 */
export async function getRotaTemplates(
  organisationId: string,
  venueId?: string
): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('rota_templates')
      .select('*')
      .eq('organisation_id', organisationId);

    if (venueId) {
      query = query.or(`venue_id.eq.${venueId},venue_id.is.null`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting rota templates:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Delete template
 */
export async function deleteRotaTemplate(
  templateId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('rota_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting rota template:', error);
    return { error: error as Error };
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getDatePlusDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

/**
 * Get week start (Monday) for a given date
 */
export function getWeekStart(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

/**
 * Get week end (Sunday) for a given date
 */
export function getWeekEnd(date: Date | string): string {
  const weekStart = getWeekStart(date);
  return getDatePlusDays(weekStart, 6);
}
