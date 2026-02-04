// services/swaps.ts
// Shift swap management service

import { supabase } from '../supabase';
import type { RotaShiftWithDetails } from './rota';

// ============================================================
// TYPES
// ============================================================

export interface ShiftSwap {
  id: string;
  rota_shift_id: string;
  original_allocation_id: string;
  requester_id: string;
  target_id: string;
  reason?: string;
  status: 'pending_target' | 'pending_manager' | 'approved' | 'rejected_target' | 'rejected_manager' | 'cancelled' | 'expired';
  target_responded_at?: string;
  target_notes?: string;
  manager_id?: string;
  manager_responded_at?: string;
  manager_notes?: string;
  new_allocation_id?: string;
  requested_at: string;
  completed_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ShiftSwapWithDetails extends ShiftSwap {
  shift: RotaShiftWithDetails & {
    venue: { id: string; name: string };
  };
  requester: {
    id: string;
    full_name: string;
    employment_type: string;
  };
  target: {
    id: string;
    full_name: string;
    employment_type: string;
  };
}

export interface EligibleSwapTarget {
  team_member_id: string;
  full_name: string;
  employment_type: string;
  is_available: boolean;
  conflict_reason?: string;
}

// ============================================================
// SWAP FUNCTIONS
// ============================================================

/**
 * Request a shift swap
 */
export async function requestShiftSwap(
  allocationId: string,
  targetMemberId: string,
  reason?: string
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('request_shift_swap', {
      p_allocation_id: allocationId,
      p_target_member_id: targetMemberId,
      p_reason: reason,
    });

    if (error) throw error;

    // TODO: Send notification to target

    return { data, error: null };
  } catch (error) {
    console.error('Error requesting shift swap:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get eligible swap targets for an allocation
 */
export async function getEligibleSwapTargets(
  allocationId: string
): Promise<{ data: EligibleSwapTarget[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase.rpc('get_eligible_swap_targets', {
      p_allocation_id: allocationId,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting eligible swap targets:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Respond to a swap request (as target)
 */
export async function respondToSwapRequest(
  swapId: string,
  accept: boolean,
  notes?: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.rpc('respond_to_swap_request', {
      p_swap_id: swapId,
      p_accept: accept,
      p_notes: notes,
    });

    if (error) throw error;

    // TODO: Send notification to requester and manager (if accepted)

    return { error: null };
  } catch (error) {
    console.error('Error responding to swap request:', error);
    return { error: error as Error };
  }
}

/**
 * Manager responds to a swap request
 */
export async function managerRespondToSwap(
  swapId: string,
  approve: boolean,
  notes?: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('manager_respond_to_swap', {
      p_swap_id: swapId,
      p_approve: approve,
      p_manager_id: user.id,
      p_notes: notes,
    });

    if (error) throw error;

    // TODO: Send notifications to requester and target

    return { error: null };
  } catch (error) {
    console.error('Error manager responding to swap:', error);
    return { error: error as Error };
  }
}

/**
 * Cancel a swap request (by requester)
 */
export async function cancelSwapRequest(
  swapId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('shift_swaps')
      .update({ status: 'cancelled', completed_at: new Date().toISOString() })
      .eq('id', swapId)
      .eq('status', 'pending_target');

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error cancelling swap request:', error);
    return { error: error as Error };
  }
}

/**
 * Get swap request by ID
 */
export async function getSwapRequest(
  swapId: string
): Promise<{ data: ShiftSwapWithDetails | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('shift_swaps')
      .select(`
        *,
        shift:rota_shifts(
          *,
          role:roles(*),
          venue:venues(id, name)
        ),
        requester:team_members!shift_swaps_requester_id_fkey(id, full_name, employment_type),
        target:team_members!shift_swaps_target_id_fkey(id, full_name, employment_type)
      `)
      .eq('id', swapId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting swap request:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get outgoing swap requests (as requester)
 */
export async function getOutgoingSwapRequests(
  teamMemberId: string
): Promise<{ data: ShiftSwapWithDetails[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('shift_swaps')
      .select(`
        *,
        shift:rota_shifts(
          *,
          role:roles(*),
          venue:venues(id, name)
        ),
        requester:team_members!shift_swaps_requester_id_fkey(id, full_name, employment_type),
        target:team_members!shift_swaps_target_id_fkey(id, full_name, employment_type)
      `)
      .eq('requester_id', teamMemberId)
      .order('requested_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting outgoing swap requests:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get incoming swap requests (as target)
 */
export async function getIncomingSwapRequests(
  teamMemberId: string
): Promise<{ data: ShiftSwapWithDetails[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('shift_swaps')
      .select(`
        *,
        shift:rota_shifts(
          *,
          role:roles(*),
          venue:venues(id, name)
        ),
        requester:team_members!shift_swaps_requester_id_fkey(id, full_name, employment_type),
        target:team_members!shift_swaps_target_id_fkey(id, full_name, employment_type)
      `)
      .eq('target_id', teamMemberId)
      .eq('status', 'pending_target')
      .order('requested_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting incoming swap requests:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get pending swaps for manager approval (by venue)
 */
export async function getPendingSwapsForVenue(
  venueId: string
): Promise<{ data: ShiftSwapWithDetails[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('shift_swaps')
      .select(`
        *,
        shift:rota_shifts!inner(
          *,
          role:roles(*),
          venue:venues(id, name)
        ),
        requester:team_members!shift_swaps_requester_id_fkey(id, full_name, employment_type),
        target:team_members!shift_swaps_target_id_fkey(id, full_name, employment_type)
      `)
      .eq('shift.venue_id', venueId)
      .eq('status', 'pending_manager')
      .order('requested_at', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting pending swaps for venue:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get pending swaps for manager approval (by organisation)
 */
export async function getPendingSwapsForOrganisation(
  organisationId: string
): Promise<{ data: ShiftSwapWithDetails[] | null; error: Error | null }> {
  try {
    // First get all venue IDs for this organisation
    const { data: venues } = await supabase
      .from('venues')
      .select('id')
      .eq('organisation_id', organisationId)
      .eq('is_active', true);

    if (!venues || venues.length === 0) {
      return { data: [], error: null };
    }

    const venueIds = venues.map((v) => v.id);

    const { data, error } = await supabase
      .from('shift_swaps')
      .select(`
        *,
        shift:rota_shifts!inner(
          *,
          role:roles(*),
          venue:venues(id, name)
        ),
        requester:team_members!shift_swaps_requester_id_fkey(id, full_name, employment_type),
        target:team_members!shift_swaps_target_id_fkey(id, full_name, employment_type)
      `)
      .in('shift.venue_id', venueIds)
      .eq('status', 'pending_manager')
      .order('requested_at', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting pending swaps for organisation:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get swap history for a team member
 */
export async function getSwapHistory(
  teamMemberId: string,
  options?: {
    limit?: number;
    status?: ShiftSwap['status'][];
  }
): Promise<{ data: ShiftSwapWithDetails[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('shift_swaps')
      .select(`
        *,
        shift:rota_shifts(
          *,
          role:roles(*),
          venue:venues(id, name)
        ),
        requester:team_members!shift_swaps_requester_id_fkey(id, full_name, employment_type),
        target:team_members!shift_swaps_target_id_fkey(id, full_name, employment_type)
      `)
      .or(`requester_id.eq.${teamMemberId},target_id.eq.${teamMemberId}`);

    if (options?.status) {
      query = query.in('status', options.status);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query.order('requested_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting swap history:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Check if a swap can be requested for an allocation
 */
export async function canRequestSwap(
  allocationId: string
): Promise<{ canSwap: boolean; reason?: string }> {
  try {
    // Check allocation exists and is in valid state
    const { data: allocation, error: allocError } = await supabase
      .from('shift_allocations')
      .select(`
        *,
        shift:rota_shifts(shift_date, start_time, status)
      `)
      .eq('id', allocationId)
      .single();

    if (allocError || !allocation) {
      return { canSwap: false, reason: 'Allocation not found' };
    }

    if (!['allocated', 'confirmed'].includes(allocation.status)) {
      return { canSwap: false, reason: 'Shift is not in a swappable state' };
    }

    // Check shift hasn't started
    const shiftStart = new Date(`${allocation.shift.shift_date}T${allocation.shift.start_time}`);
    if (shiftStart <= new Date()) {
      return { canSwap: false, reason: 'Shift has already started' };
    }

    // Check no pending swap exists
    const { data: pendingSwap } = await supabase
      .from('shift_swaps')
      .select('id')
      .eq('original_allocation_id', allocationId)
      .in('status', ['pending_target', 'pending_manager'])
      .single();

    if (pendingSwap) {
      return { canSwap: false, reason: 'A swap request is already pending' };
    }

    return { canSwap: true };
  } catch (error) {
    console.error('Error checking swap eligibility:', error);
    return { canSwap: false, reason: 'Error checking eligibility' };
  }
}

/**
 * Get swap statistics for an organisation
 */
export async function getSwapStats(
  organisationId: string,
  dateRange?: { start: string; end: string }
): Promise<{
  data: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    cancelled: number;
  } | null;
  error: Error | null;
}> {
  try {
    // Get all venue IDs
    const { data: venues } = await supabase
      .from('venues')
      .select('id')
      .eq('organisation_id', organisationId);

    if (!venues) {
      return { data: null, error: new Error('No venues found') };
    }

    const venueIds = venues.map((v) => v.id);

    // Get all swaps for these venues
    let query = supabase
      .from('shift_swaps')
      .select(`
        status,
        shift:rota_shifts!inner(venue_id, shift_date)
      `)
      .in('shift.venue_id', venueIds);

    if (dateRange) {
      query = query
        .gte('shift.shift_date', dateRange.start)
        .lte('shift.shift_date', dateRange.end);
    }

    const { data, error } = await query;

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      approved: data?.filter((s) => s.status === 'approved').length || 0,
      rejected: data?.filter((s) => ['rejected_target', 'rejected_manager'].includes(s.status)).length || 0,
      pending: data?.filter((s) => ['pending_target', 'pending_manager'].includes(s.status)).length || 0,
      cancelled: data?.filter((s) => ['cancelled', 'expired'].includes(s.status)).length || 0,
    };

    return { data: stats, error: null };
  } catch (error) {
    console.error('Error getting swap stats:', error);
    return { data: null, error: error as Error };
  }
}
