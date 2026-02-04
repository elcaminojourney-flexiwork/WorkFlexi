// services/accountMode.ts
// Account mode switching service (Employee <-> Gig Worker)

import { supabase } from '../supabase';

// ============================================================
// TYPES
// ============================================================

export type AccountMode = 'employee' | 'gig_worker';

export interface AccountModeStatus {
  hasEmployeeProfile: boolean;
  hasGigProfile: boolean;
  activeMode: AccountMode;
  workerStatus: 'inactive' | 'active';
  employeeOrganisations?: {
    id: string;
    name: string;
    venues: string[];
    roles: string[];
  }[];
  gigStats?: {
    completedShifts: number;
    rating: number;
    reviewCount: number;
  };
}

// ============================================================
// MODE FUNCTIONS
// ============================================================

/**
 * Get current account mode status
 */
export async function getAccountModeStatus(): Promise<{
  data: AccountModeStatus | null;
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('has_employee_profile, has_gig_profile, active_mode, worker_status')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const status: AccountModeStatus = {
      hasEmployeeProfile: profile.has_employee_profile || false,
      hasGigProfile: profile.has_gig_profile || false,
      activeMode: profile.active_mode || 'employee',
      workerStatus: profile.worker_status || 'inactive',
    };

    // If has employee profile, get organisations
    if (status.hasEmployeeProfile) {
      const { data: memberships } = await supabase
        .from('team_members')
        .select(`
          organisation:organisations(id, name),
          venues:team_member_venues(venue:venues(name)),
          roles:team_member_roles(role:roles(name))
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');

      status.employeeOrganisations = memberships?.map((m) => ({
        id: m.organisation.id,
        name: m.organisation.name,
        venues: m.venues?.map((v: any) => v.venue.name) || [],
        roles: m.roles?.map((r: any) => r.role.name) || [],
      }));
    }

    // If has gig profile, get stats
    if (status.hasGigProfile) {
      const { count: completedShifts } = await supabase
        .from('timesheets')
        .select('*', { count: 'exact', head: true })
        .eq('worker_id', user.id)
        .eq('status', 'approved');

      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewee_id', user.id);

      const reviewCount = reviews?.length || 0;
      const avgRating = reviewCount > 0
        ? reviews!.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 0;

      status.gigStats = {
        completedShifts: completedShifts || 0,
        rating: Math.round(avgRating * 10) / 10,
        reviewCount,
      };
    }

    return { data: status, error: null };
  } catch (error) {
    console.error('Error getting account mode status:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Switch account mode
 */
export async function switchAccountMode(
  newMode: AccountMode
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('switch_account_mode', {
      p_user_id: user.id,
      p_new_mode: newMode,
    });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error switching account mode:', error);
    return { error: error as Error };
  }
}

/**
 * Check if user can switch to a specific mode
 */
export async function canSwitchToMode(
  mode: AccountMode
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { allowed: false, reason: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('has_employee_profile, has_gig_profile')
      .eq('id', user.id)
      .single();

    if (!profile) return { allowed: false, reason: 'Profile not found' };

    if (mode === 'employee' && !profile.has_employee_profile) {
      return { allowed: false, reason: 'No employee profile. Join an organisation first.' };
    }

    if (mode === 'gig_worker' && !profile.has_gig_profile) {
      return { allowed: false, reason: 'No gig worker profile. Complete verification first.' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error checking mode switch:', error);
    return { allowed: false, reason: 'Error checking eligibility' };
  }
}

/**
 * Start gig worker upgrade process
 */
export async function startGigWorkerUpgrade(): Promise<{
  needsVerification: boolean;
  needsBankDetails: boolean;
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: profile } = await supabase
      .from('profiles')
      .select('singpass_verified, bank_account_number')
      .eq('id', user.id)
      .single();

    return {
      needsVerification: !profile?.singpass_verified,
      needsBankDetails: !profile?.bank_account_number,
      error: null,
    };
  } catch (error) {
    console.error('Error starting gig upgrade:', error);
    return { needsVerification: true, needsBankDetails: true, error: error as Error };
  }
}

/**
 * Complete gig worker upgrade
 */
export async function completeGigWorkerUpgrade(): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Verify all requirements are met
    const { data: profile } = await supabase
      .from('profiles')
      .select('singpass_verified, bank_account_number')
      .eq('id', user.id)
      .single();

    if (!profile?.singpass_verified) {
      throw new Error('SingPass verification required');
    }

    if (!profile?.bank_account_number) {
      throw new Error('Bank account details required');
    }

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({
        has_gig_profile: true,
        worker_status: 'active',
        active_mode: 'gig_worker',
      })
      .eq('id', user.id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error completing gig upgrade:', error);
    return { error: error as Error };
  }
}

/**
 * Get mode-specific dashboard data
 */
export async function getModeSpecificDashboard(
  mode: AccountMode
): Promise<{ data: any; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    if (mode === 'employee') {
      // Get employee-specific data
      const { data: memberships } = await supabase
        .from('team_members')
        .select('id, organisation_id')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!memberships || memberships.length === 0) {
        return { data: { shifts: [], invites: [], swaps: [] }, error: null };
      }

      const memberIds = memberships.map((m) => m.id);

      // Get upcoming shifts
      const today = new Date().toISOString().split('T')[0];
      const { data: allocations } = await supabase
        .from('shift_allocations')
        .select(`
          *,
          shift:rota_shifts(
            *,
            role:roles(name, colour),
            venue:venues(name)
          )
        `)
        .in('team_member_id', memberIds)
        .in('status', ['allocated', 'confirmed'])
        .gte('shift.shift_date', today)
        .order('shift.shift_date', { ascending: true })
        .limit(10);

      // Get pending invites
      const { data: invites } = await supabase
        .from('shift_invites')
        .select(`
          *,
          shift:rota_shifts(
            *,
            role:roles(name, colour),
            venue:venues(name)
          )
        `)
        .in('team_member_id', memberIds)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false })
        .limit(5);

      // Get pending swap requests (as target)
      const { data: swaps } = await supabase
        .from('shift_swaps')
        .select(`
          *,
          shift:rota_shifts(
            shift_date,
            start_time,
            end_time,
            role:roles(name),
            venue:venues(name)
          ),
          requester:team_members!shift_swaps_requester_id_fkey(full_name)
        `)
        .in('target_id', memberIds)
        .eq('status', 'pending_target')
        .order('requested_at', { ascending: false })
        .limit(5);

      return {
        data: {
          shifts: allocations || [],
          invites: invites || [],
          swaps: swaps || [],
        },
        error: null,
      };
    } else {
      // Get gig worker-specific data (existing functionality)
      // Get upcoming accepted shifts
      const { data: shifts } = await supabase
        .from('applications')
        .select(`
          *,
          shift:shifts(
            *,
            employer:profiles(full_name, company_name)
          )
        `)
        .eq('worker_id', user.id)
        .eq('status', 'accepted')
        .gte('shift.date', new Date().toISOString().split('T')[0])
        .order('shift.date', { ascending: true })
        .limit(10);

      // Get earnings summary
      const { data: earnings } = await supabase
        .from('payments')
        .select('worker_payout')
        .eq('worker_id', user.id)
        .eq('status', 'completed');

      const totalEarnings = earnings?.reduce((sum, p) => sum + (p.worker_payout || 0), 0) || 0;

      return {
        data: {
          upcomingShifts: shifts || [],
          totalEarnings,
        },
        error: null,
      };
    }
  } catch (error) {
    console.error('Error getting mode dashboard:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get navigation items based on current mode
 */
export function getNavigationForMode(mode: AccountMode): {
  tabs: { name: string; route: string; icon: string }[];
} {
  if (mode === 'employee') {
    return {
      tabs: [
        { name: 'Home', route: '/employee', icon: 'home' },
        { name: 'Shifts', route: '/employee/shifts', icon: 'calendar' },
        { name: 'Invites', route: '/employee/invites', icon: 'mail' },
        { name: 'Timekeeping', route: '/employee/timekeeping', icon: 'clock' },
        { name: 'Profile', route: '/employee/profile', icon: 'user' },
      ],
    };
  } else {
    return {
      tabs: [
        { name: 'Home', route: '/worker', icon: 'home' },
        { name: 'Browse', route: '/worker/browse-shifts', icon: 'search' },
        { name: 'My Shifts', route: '/worker/my-shifts', icon: 'calendar' },
        { name: 'Earnings', route: '/worker/earnings', icon: 'dollar-sign' },
        { name: 'Profile', route: '/worker/profile', icon: 'user' },
      ],
    };
  }
}
