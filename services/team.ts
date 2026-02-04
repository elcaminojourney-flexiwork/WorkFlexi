// services/team.ts
// Team member management service

import { supabase } from '../supabase';
import type { Role } from './roles';

// ============================================================
// TYPES
// ============================================================

export interface TeamMember {
  id: string;
  organisation_id: string;
  user_id?: string;
  full_name: string;
  email?: string;
  phone?: string;
  employment_type: 'full_time' | 'part_time';
  status: 'pending' | 'active' | 'inactive' | 'terminated';
  invite_code?: string;
  invite_expires_at?: string;
  invited_by?: string;
  invited_at: string;
  joined_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberWithDetails extends TeamMember {
  roles: (Role & { is_primary: boolean })[];
  venues: { id: string; name: string; is_primary: boolean }[];
  profile?: {
    avatar_url?: string;
    worker_status?: string;
    has_gig_profile?: boolean;
  };
}

export interface CreateTeamMemberInput {
  organisation_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  employment_type: 'full_time' | 'part_time';
  role_ids: string[];
  venue_ids: string[];
  primary_venue_id?: string;
  notes?: string;
}

// ============================================================
// TEAM MEMBER FUNCTIONS
// ============================================================

/**
 * Invite a new team member
 */
export async function inviteTeamMember(
  input: CreateTeamMemberInput
): Promise<{ data: TeamMember | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check employee limit
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('employee_limit')
      .eq('organisation_id', input.organisation_id)
      .single();

    const { count } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('organisation_id', input.organisation_id)
      .in('status', ['active', 'pending']);

    if (subscription && count !== null && count >= subscription.employee_limit) {
      throw new Error(`Employee limit reached (${subscription.employee_limit}). Upgrade your plan to add more team members.`);
    }

    // Create team member
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .insert({
        organisation_id: input.organisation_id,
        full_name: input.full_name,
        email: input.email,
        phone: input.phone,
        employment_type: input.employment_type,
        notes: input.notes,
        invited_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (memberError) throw memberError;

    // Assign roles
    if (input.role_ids.length > 0) {
      const roleInserts = input.role_ids.map((roleId, index) => ({
        team_member_id: member.id,
        role_id: roleId,
        is_primary: index === 0,
        assigned_by: user.id,
      }));

      const { error: rolesError } = await supabase
        .from('team_member_roles')
        .insert(roleInserts);

      if (rolesError) throw rolesError;
    }

    // Assign venues
    if (input.venue_ids.length > 0) {
      const venueInserts = input.venue_ids.map((venueId) => ({
        team_member_id: member.id,
        venue_id: venueId,
        is_primary: venueId === input.primary_venue_id || (input.venue_ids.length === 1),
        assigned_by: user.id,
      }));

      const { error: venuesError } = await supabase
        .from('team_member_venues')
        .insert(venueInserts);

      if (venuesError) throw venuesError;
    }

    return { data: member, error: null };
  } catch (error) {
    console.error('Error inviting team member:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get team member by ID
 */
export async function getTeamMember(
  memberId: string
): Promise<{ data: TeamMemberWithDetails | null; error: Error | null }> {
  try {
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select(`
        *,
        profile:profiles(avatar_url, worker_status, has_gig_profile)
      `)
      .eq('id', memberId)
      .single();

    if (memberError) throw memberError;

    // Get roles
    const { data: memberRoles } = await supabase
      .from('team_member_roles')
      .select(`
        is_primary,
        role:roles(*)
      `)
      .eq('team_member_id', memberId);

    // Get venues
    const { data: memberVenues } = await supabase
      .from('team_member_venues')
      .select(`
        is_primary,
        venue:venues(id, name)
      `)
      .eq('team_member_id', memberId);

    return {
      data: {
        ...member,
        roles: memberRoles?.map((mr) => ({ ...mr.role, is_primary: mr.is_primary })) || [],
        venues: memberVenues?.map((mv) => ({ ...mv.venue, is_primary: mv.is_primary })) || [],
        profile: member.profile,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting team member:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all team members for an organisation
 */
export async function getTeamMembersByOrganisation(
  organisationId: string,
  options?: {
    status?: TeamMember['status'][];
    employment_type?: 'full_time' | 'part_time';
    venue_id?: string;
    role_id?: string;
  }
): Promise<{ data: TeamMemberWithDetails[] | null; error: Error | null }> {
  try {
    let query = supabase
      .from('team_members')
      .select(`
        *,
        profile:profiles(avatar_url, worker_status, has_gig_profile)
      `)
      .eq('organisation_id', organisationId);

    if (options?.status) {
      query = query.in('status', options.status);
    }

    if (options?.employment_type) {
      query = query.eq('employment_type', options.employment_type);
    }

    const { data: members, error: membersError } = await query.order('full_name', { ascending: true });

    if (membersError) throw membersError;

    // Get all roles and venues for these members
    const memberIds = members?.map((m) => m.id) || [];

    const { data: allRoles } = await supabase
      .from('team_member_roles')
      .select(`
        team_member_id,
        is_primary,
        role:roles(*)
      `)
      .in('team_member_id', memberIds);

    const { data: allVenues } = await supabase
      .from('team_member_venues')
      .select(`
        team_member_id,
        is_primary,
        venue:venues(id, name)
      `)
      .in('team_member_id', memberIds);

    // Filter by venue_id if specified
    let filteredMembers = members || [];
    if (options?.venue_id) {
      const venueMembers = allVenues
        ?.filter((v) => v.venue?.id === options.venue_id)
        .map((v) => v.team_member_id);
      filteredMembers = filteredMembers.filter((m) => venueMembers?.includes(m.id));
    }

    // Filter by role_id if specified
    if (options?.role_id) {
      const roleMembers = allRoles
        ?.filter((r) => r.role?.id === options.role_id)
        .map((r) => r.team_member_id);
      filteredMembers = filteredMembers.filter((m) => roleMembers?.includes(m.id));
    }

    // Combine data
    const result: TeamMemberWithDetails[] = filteredMembers.map((member) => ({
      ...member,
      roles: allRoles
        ?.filter((r) => r.team_member_id === member.id)
        .map((r) => ({ ...r.role, is_primary: r.is_primary })) || [],
      venues: allVenues
        ?.filter((v) => v.team_member_id === member.id)
        .map((v) => ({ ...v.venue, is_primary: v.is_primary })) || [],
      profile: member.profile,
    }));

    return { data: result, error: null };
  } catch (error) {
    console.error('Error getting team members:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get team members for a specific venue
 */
export async function getTeamMembersByVenue(
  venueId: string,
  options?: {
    status?: TeamMember['status'][];
    employment_type?: 'full_time' | 'part_time';
    role_id?: string;
  }
): Promise<{ data: TeamMemberWithDetails[] | null; error: Error | null }> {
  try {
    // Get team member IDs for this venue
    const { data: venueMembers, error: vmError } = await supabase
      .from('team_member_venues')
      .select('team_member_id')
      .eq('venue_id', venueId);

    if (vmError) throw vmError;

    const memberIds = venueMembers?.map((vm) => vm.team_member_id) || [];

    if (memberIds.length === 0) {
      return { data: [], error: null };
    }

    let query = supabase
      .from('team_members')
      .select(`
        *,
        profile:profiles(avatar_url, worker_status, has_gig_profile)
      `)
      .in('id', memberIds);

    if (options?.status) {
      query = query.in('status', options.status);
    }

    if (options?.employment_type) {
      query = query.eq('employment_type', options.employment_type);
    }

    const { data: members, error: membersError } = await query.order('full_name', { ascending: true });

    if (membersError) throw membersError;

    // Get roles and venues
    const { data: allRoles } = await supabase
      .from('team_member_roles')
      .select(`
        team_member_id,
        is_primary,
        role:roles(*)
      `)
      .in('team_member_id', memberIds);

    const { data: allVenues } = await supabase
      .from('team_member_venues')
      .select(`
        team_member_id,
        is_primary,
        venue:venues(id, name)
      `)
      .in('team_member_id', memberIds);

    // Filter by role if specified
    let filteredMembers = members || [];
    if (options?.role_id) {
      const roleMembers = allRoles
        ?.filter((r) => r.role?.id === options.role_id)
        .map((r) => r.team_member_id);
      filteredMembers = filteredMembers.filter((m) => roleMembers?.includes(m.id));
    }

    const result: TeamMemberWithDetails[] = filteredMembers.map((member) => ({
      ...member,
      roles: allRoles
        ?.filter((r) => r.team_member_id === member.id)
        .map((r) => ({ ...r.role, is_primary: r.is_primary })) || [],
      venues: allVenues
        ?.filter((v) => v.team_member_id === member.id)
        .map((v) => ({ ...v.venue, is_primary: v.is_primary })) || [],
      profile: member.profile,
    }));

    return { data: result, error: null };
  } catch (error) {
    console.error('Error getting venue team members:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update team member
 */
export async function updateTeamMember(
  memberId: string,
  updates: {
    full_name?: string;
    email?: string;
    phone?: string;
    employment_type?: 'full_time' | 'part_time';
    status?: TeamMember['status'];
    notes?: string;
  }
): Promise<{ data: TeamMember | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', memberId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating team member:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update team member roles
 */
export async function updateTeamMemberRoles(
  memberId: string,
  roleIds: string[],
  primaryRoleId?: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Delete existing roles
    await supabase
      .from('team_member_roles')
      .delete()
      .eq('team_member_id', memberId);

    // Insert new roles
    if (roleIds.length > 0) {
      const roleInserts = roleIds.map((roleId) => ({
        team_member_id: memberId,
        role_id: roleId,
        is_primary: roleId === primaryRoleId || (roleIds.length === 1 && roleIds[0] === roleId),
        assigned_by: user.id,
      }));

      const { error } = await supabase
        .from('team_member_roles')
        .insert(roleInserts);

      if (error) throw error;
    }

    return { error: null };
  } catch (error) {
    console.error('Error updating team member roles:', error);
    return { error: error as Error };
  }
}

/**
 * Update team member venues
 */
export async function updateTeamMemberVenues(
  memberId: string,
  venueIds: string[],
  primaryVenueId?: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Delete existing venues
    await supabase
      .from('team_member_venues')
      .delete()
      .eq('team_member_id', memberId);

    // Insert new venues
    if (venueIds.length > 0) {
      const venueInserts = venueIds.map((venueId) => ({
        team_member_id: memberId,
        venue_id: venueId,
        is_primary: venueId === primaryVenueId || (venueIds.length === 1),
        assigned_by: user.id,
      }));

      const { error } = await supabase
        .from('team_member_venues')
        .insert(venueInserts);

      if (error) throw error;
    }

    return { error: null };
  } catch (error) {
    console.error('Error updating team member venues:', error);
    return { error: error as Error };
  }
}

/**
 * Resend invite to team member
 */
export async function resendInvite(
  memberId: string
): Promise<{ invite_code: string | null; error: Error | null }> {
  try {
    // Generate new invite code
    const newCode = 'FW-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('team_members')
      .update({
        invite_code: newCode,
        invite_expires_at: expiresAt,
        status: 'pending',
      })
      .eq('id', memberId)
      .select('invite_code')
      .single();

    if (error) throw error;
    return { invite_code: data.invite_code, error: null };
  } catch (error) {
    console.error('Error resending invite:', error);
    return { invite_code: null, error: error as Error };
  }
}

/**
 * Accept invite (called when employee joins)
 */
export async function acceptInvite(
  inviteCode: string
): Promise<{ data: TeamMember | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase.rpc('accept_team_invite', {
      p_invite_code: inviteCode,
      p_user_id: user.id,
    });

    if (error) throw error;

    // Get the updated team member
    const { data: member } = await supabase
      .from('team_members')
      .select('*')
      .eq('id', data)
      .single();

    return { data: member, error: null };
  } catch (error) {
    console.error('Error accepting invite:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Terminate team member
 */
export async function terminateTeamMember(
  memberId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('team_members')
      .update({ status: 'terminated' })
      .eq('id', memberId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error terminating team member:', error);
    return { error: error as Error };
  }
}

/**
 * Get team member by invite code
 */
export async function getTeamMemberByInviteCode(
  inviteCode: string
): Promise<{ data: TeamMemberWithDetails | null; error: Error | null }> {
  try {
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select(`
        *,
        organisation:organisations(id, name)
      `)
      .eq('invite_code', inviteCode)
      .eq('status', 'pending')
      .gt('invite_expires_at', new Date().toISOString())
      .single();

    if (memberError) throw memberError;

    // Get roles
    const { data: memberRoles } = await supabase
      .from('team_member_roles')
      .select(`
        is_primary,
        role:roles(*)
      `)
      .eq('team_member_id', member.id);

    // Get venues
    const { data: memberVenues } = await supabase
      .from('team_member_venues')
      .select(`
        is_primary,
        venue:venues(id, name)
      `)
      .eq('team_member_id', member.id);

    return {
      data: {
        ...member,
        roles: memberRoles?.map((mr) => ({ ...mr.role, is_primary: mr.is_primary })) || [],
        venues: memberVenues?.map((mv) => ({ ...mv.venue, is_primary: mv.is_primary })) || [],
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting team member by invite code:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get current user's team memberships
 */
export async function getMyTeamMemberships(): Promise<{
  data: (TeamMemberWithDetails & { organisation: { id: string; name: string } })[] | null;
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select(`
        *,
        organisation:organisations(id, name)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (membersError) throw membersError;

    const memberIds = members?.map((m) => m.id) || [];

    const { data: allRoles } = await supabase
      .from('team_member_roles')
      .select(`
        team_member_id,
        is_primary,
        role:roles(*)
      `)
      .in('team_member_id', memberIds);

    const { data: allVenues } = await supabase
      .from('team_member_venues')
      .select(`
        team_member_id,
        is_primary,
        venue:venues(id, name)
      `)
      .in('team_member_id', memberIds);

    const result = members?.map((member) => ({
      ...member,
      roles: allRoles
        ?.filter((r) => r.team_member_id === member.id)
        .map((r) => ({ ...r.role, is_primary: r.is_primary })) || [],
      venues: allVenues
        ?.filter((v) => v.team_member_id === member.id)
        .map((v) => ({ ...v.venue, is_primary: v.is_primary })) || [],
    }));

    return { data: result || [], error: null };
  } catch (error) {
    console.error('Error getting my team memberships:', error);
    return { data: null, error: error as Error };
  }
}
