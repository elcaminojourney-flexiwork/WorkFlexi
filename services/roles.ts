// services/roles.ts
// Role management service

import { supabase } from '../supabase';

// ============================================================
// TYPES
// ============================================================

export interface Role {
  id: string;
  organisation_id: string;
  name: string;
  colour: string;
  icon: string;
  description?: string;
  hourly_rate_default?: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface VenueRole {
  id: string;
  venue_id: string;
  role_id: string;
  is_active: boolean;
  role?: Role;
}

export interface CreateRoleInput {
  organisation_id: string;
  name: string;
  colour?: string;
  icon?: string;
  description?: string;
  hourly_rate_default?: number;
}

// Default role colours
export const ROLE_COLOURS = {
  red: '#ef4444',
  orange: '#f59e0b',
  yellow: '#eab308',
  green: '#10b981',
  teal: '#14b8a6',
  blue: '#3b82f6',
  indigo: '#6366f1',
  purple: '#8b5cf6',
  pink: '#ec4899',
  gray: '#64748b',
};

// Default role icons (lucide icon names)
export const ROLE_ICONS = [
  'chef-hat',
  'coffee',
  'utensils',
  'door-open',
  'sparkles',
  'running',
  'wine',
  'banknotes',
  'briefcase',
  'user',
  'users',
  'star',
  'heart',
  'zap',
];

// ============================================================
// ROLE FUNCTIONS
// ============================================================

/**
 * Create a new role
 */
export async function createRole(
  input: CreateRoleInput
): Promise<{ data: Role | null; error: Error | null }> {
  try {
    // Get current max sort_order
    const { data: existingRoles } = await supabase
      .from('roles')
      .select('sort_order')
      .eq('organisation_id', input.organisation_id)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextSortOrder = existingRoles && existingRoles.length > 0 
      ? existingRoles[0].sort_order + 1 
      : 0;

    const { data, error } = await supabase
      .from('roles')
      .insert({
        organisation_id: input.organisation_id,
        name: input.name,
        colour: input.colour || ROLE_COLOURS.blue,
        icon: input.icon || 'briefcase',
        description: input.description,
        hourly_rate_default: input.hourly_rate_default,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error) throw error;

    // Enable this role at all existing venues
    const { data: venues } = await supabase
      .from('venues')
      .select('id')
      .eq('organisation_id', input.organisation_id)
      .eq('is_active', true);

    if (venues && venues.length > 0) {
      await supabase.from('venue_roles').insert(
        venues.map((venue) => ({
          venue_id: venue.id,
          role_id: data.id,
          is_active: true,
        }))
      );
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error creating role:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get role by ID
 */
export async function getRole(
  roleId: string
): Promise<{ data: Role | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting role:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get all roles for an organisation
 */
export async function getRolesByOrganisation(
  organisationId: string
): Promise<{ data: Role[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting roles:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get roles enabled at a specific venue
 */
export async function getRolesByVenue(
  venueId: string
): Promise<{ data: Role[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('venue_roles')
      .select(`
        role:roles(*)
      `)
      .eq('venue_id', venueId)
      .eq('is_active', true);

    if (error) throw error;

    const roles = data
      ?.map((vr) => vr.role)
      .filter((r): r is Role => r !== null)
      .sort((a, b) => a.sort_order - b.sort_order);

    return { data: roles || [], error: null };
  } catch (error) {
    console.error('Error getting venue roles:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update role
 */
export async function updateRole(
  roleId: string,
  updates: Partial<Omit<CreateRoleInput, 'organisation_id'>>
): Promise<{ data: Role | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('roles')
      .update(updates)
      .eq('id', roleId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating role:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Deactivate role (soft delete)
 */
export async function deactivateRole(
  roleId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('roles')
      .update({ is_active: false })
      .eq('id', roleId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deactivating role:', error);
    return { error: error as Error };
  }
}

/**
 * Reorder roles
 */
export async function reorderRoles(
  organisationId: string,
  roleIds: string[]
): Promise<{ error: Error | null }> {
  try {
    const updates = roleIds.map((id, index) => ({
      id,
      sort_order: index,
    }));

    for (const update of updates) {
      await supabase
        .from('roles')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id)
        .eq('organisation_id', organisationId);
    }

    return { error: null };
  } catch (error) {
    console.error('Error reordering roles:', error);
    return { error: error as Error };
  }
}

// ============================================================
// VENUE ROLE FUNCTIONS
// ============================================================

/**
 * Enable a role at a venue
 */
export async function enableRoleAtVenue(
  venueId: string,
  roleId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('venue_roles')
      .upsert({
        venue_id: venueId,
        role_id: roleId,
        is_active: true,
      }, {
        onConflict: 'venue_id,role_id',
      });

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error enabling role at venue:', error);
    return { error: error as Error };
  }
}

/**
 * Disable a role at a venue
 */
export async function disableRoleAtVenue(
  venueId: string,
  roleId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('venue_roles')
      .update({ is_active: false })
      .eq('venue_id', venueId)
      .eq('role_id', roleId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error disabling role at venue:', error);
    return { error: error as Error };
  }
}

/**
 * Get all venue roles with status for an organisation
 */
export async function getVenueRolesMatrix(
  organisationId: string
): Promise<{
  data: {
    roles: Role[];
    venues: { id: string; name: string }[];
    matrix: { [roleId: string]: { [venueId: string]: boolean } };
  } | null;
  error: Error | null;
}> {
  try {
    // Get all roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (rolesError) throw rolesError;

    // Get all venues
    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('id, name')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (venuesError) throw venuesError;

    // Get all venue_roles
    const { data: venueRoles, error: vrError } = await supabase
      .from('venue_roles')
      .select('*')
      .in('venue_id', venues?.map((v) => v.id) || []);

    if (vrError) throw vrError;

    // Build matrix
    const matrix: { [roleId: string]: { [venueId: string]: boolean } } = {};
    
    for (const role of roles || []) {
      matrix[role.id] = {};
      for (const venue of venues || []) {
        const vr = venueRoles?.find(
          (x) => x.role_id === role.id && x.venue_id === venue.id
        );
        matrix[role.id][venue.id] = vr?.is_active ?? false;
      }
    }

    return {
      data: {
        roles: roles || [],
        venues: venues || [],
        matrix,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting venue roles matrix:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Bulk update venue roles
 */
export async function updateVenueRoles(
  venueId: string,
  roleUpdates: { roleId: string; isActive: boolean }[]
): Promise<{ error: Error | null }> {
  try {
    for (const update of roleUpdates) {
      await supabase
        .from('venue_roles')
        .upsert({
          venue_id: venueId,
          role_id: update.roleId,
          is_active: update.isActive,
        }, {
          onConflict: 'venue_id,role_id',
        });
    }

    return { error: null };
  } catch (error) {
    console.error('Error updating venue roles:', error);
    return { error: error as Error };
  }
}

/**
 * Get role with member count
 */
export async function getRoleWithStats(
  roleId: string
): Promise<{
  data: (Role & { member_count: number }) | null;
  error: Error | null;
}> {
  try {
    const { data: role, error: roleError } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (roleError) throw roleError;

    const { count, error: countError } = await supabase
      .from('team_member_roles')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', roleId);

    if (countError) throw countError;

    return {
      data: {
        ...role,
        member_count: count || 0,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting role stats:', error);
    return { data: null, error: error as Error };
  }
}
