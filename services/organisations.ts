// services/organisations.ts
// Organisation and venue management service

import { supabase } from '../supabase';

// ============================================================
// TYPES
// ============================================================

export interface Organisation {
  id: string;
  owner_id: string;
  name: string;
  business_reg_number?: string;
  industry: string;
  billing_email?: string;
  billing_address?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  organisation_id: string;
  name: string;
  address?: string;
  postal_code?: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  operating_hours: OperatingHours;
  timezone: string;
  manager_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OperatingHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface DaySchedule {
  open: string;
  close: string;
  closed: boolean;
}

export interface CreateOrganisationInput {
  name: string;
  business_reg_number?: string;
  industry?: string;
  billing_email?: string;
}

export interface CreateVenueInput {
  organisation_id: string;
  name: string;
  address?: string;
  postal_code?: string;
  city?: string;
  phone?: string;
  email?: string;
  operating_hours?: Partial<OperatingHours>;
  manager_id?: string;
}

// ============================================================
// ORGANISATION FUNCTIONS
// ============================================================

/**
 * Create a new organisation
 */
export async function createOrganisation(
  input: CreateOrganisationInput
): Promise<{ data: Organisation | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('organisations')
      .insert({
        owner_id: user.id,
        name: input.name,
        business_reg_number: input.business_reg_number,
        industry: input.industry || 'food_and_beverage',
        billing_email: input.billing_email || user.email,
      })
      .select()
      .single();

    if (error) throw error;

    // Seed default roles for the new organisation
    await supabase.rpc('seed_default_roles', { org_id: data.id });

    // Create free subscription
    await supabase
      .from('subscriptions')
      .insert({
        organisation_id: data.id,
        tier: 'free',
        employee_limit: 10,
        venue_limit: 1,
        status: 'trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
      });

    return { data, error: null };
  } catch (error) {
    console.error('Error creating organisation:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get organisation by ID
 */
export async function getOrganisation(
  organisationId: string
): Promise<{ data: Organisation | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', organisationId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting organisation:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get organisations owned by current user
 */
export async function getMyOrganisations(): Promise<{
  data: Organisation[] | null;
  error: Error | null;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('organisations')
      .select('*')
      .eq('owner_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting organisations:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update organisation
 */
export async function updateOrganisation(
  organisationId: string,
  updates: Partial<CreateOrganisationInput>
): Promise<{ data: Organisation | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organisations')
      .update(updates)
      .eq('id', organisationId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating organisation:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get organisation with venues and team count
 */
export async function getOrganisationWithDetails(
  organisationId: string
): Promise<{
  data: (Organisation & { venues: Venue[]; team_count: number; subscription: any }) | null;
  error: Error | null;
}> {
  try {
    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .select('*')
      .eq('id', organisationId)
      .single();

    if (orgError) throw orgError;

    const { data: venues, error: venuesError } = await supabase
      .from('venues')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (venuesError) throw venuesError;

    const { count, error: countError } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('organisation_id', organisationId)
      .in('status', ['active', 'pending']);

    if (countError) throw countError;

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organisation_id', organisationId)
      .single();

    return {
      data: {
        ...org,
        venues: venues || [],
        team_count: count || 0,
        subscription: subscription || null,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting organisation details:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// VENUE FUNCTIONS
// ============================================================

/**
 * Create a new venue
 */
export async function createVenue(
  input: CreateVenueInput
): Promise<{ data: Venue | null; error: Error | null }> {
  try {
    // Check subscription limits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('venue_limit')
      .eq('organisation_id', input.organisation_id)
      .single();

    const { count } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })
      .eq('organisation_id', input.organisation_id)
      .eq('is_active', true);

    if (subscription && count !== null && count >= subscription.venue_limit) {
      throw new Error(`Venue limit reached (${subscription.venue_limit}). Upgrade your plan to add more venues.`);
    }

    const { data, error } = await supabase
      .from('venues')
      .insert({
        organisation_id: input.organisation_id,
        name: input.name,
        address: input.address,
        postal_code: input.postal_code,
        city: input.city || 'Singapore',
        phone: input.phone,
        email: input.email,
        operating_hours: input.operating_hours,
        manager_id: input.manager_id,
      })
      .select()
      .single();

    if (error) throw error;

    // Enable all organisation roles at this venue by default
    const { data: roles } = await supabase
      .from('roles')
      .select('id')
      .eq('organisation_id', input.organisation_id)
      .eq('is_active', true);

    if (roles && roles.length > 0) {
      await supabase.from('venue_roles').insert(
        roles.map((role) => ({
          venue_id: data.id,
          role_id: role.id,
          is_active: true,
        }))
      );
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error creating venue:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get venue by ID
 */
export async function getVenue(
  venueId: string
): Promise<{ data: Venue | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting venue:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get venues for an organisation
 */
export async function getVenuesByOrganisation(
  organisationId: string
): Promise<{ data: Venue[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .eq('organisation_id', organisationId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting venues:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Update venue
 */
export async function updateVenue(
  venueId: string,
  updates: Partial<CreateVenueInput>
): Promise<{ data: Venue | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('venues')
      .update(updates)
      .eq('id', venueId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating venue:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Deactivate venue (soft delete)
 */
export async function deactivateVenue(
  venueId: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('venues')
      .update({ is_active: false })
      .eq('id', venueId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deactivating venue:', error);
    return { error: error as Error };
  }
}

/**
 * Get venue with roles and team count
 */
export async function getVenueWithDetails(
  venueId: string
): Promise<{
  data: (Venue & { roles: any[]; team_count: number }) | null;
  error: Error | null;
}> {
  try {
    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .select('*')
      .eq('id', venueId)
      .single();

    if (venueError) throw venueError;

    const { data: venueRoles, error: rolesError } = await supabase
      .from('venue_roles')
      .select(`
        id,
        is_active,
        role:roles(id, name, colour, icon, description)
      `)
      .eq('venue_id', venueId);

    if (rolesError) throw rolesError;

    const { count, error: countError } = await supabase
      .from('team_member_venues')
      .select('*', { count: 'exact', head: true })
      .eq('venue_id', venueId);

    if (countError) throw countError;

    return {
      data: {
        ...venue,
        roles: venueRoles?.map((vr) => ({ ...vr.role, is_active: vr.is_active })) || [],
        team_count: count || 0,
      },
      error: null,
    };
  } catch (error) {
    console.error('Error getting venue details:', error);
    return { data: null, error: error as Error };
  }
}

// ============================================================
// SUBSCRIPTION FUNCTIONS
// ============================================================

/**
 * Get subscription for an organisation
 */
export async function getSubscription(
  organisationId: string
): Promise<{ data: any | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organisation_id', organisationId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error getting subscription:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Check if organisation can add more employees
 */
export async function canAddEmployee(
  organisationId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('employee_limit')
      .eq('organisation_id', organisationId)
      .single();

    const { count } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('organisation_id', organisationId)
      .in('status', ['active', 'pending']);

    const limit = subscription?.employee_limit || 10;
    const current = count || 0;

    return {
      allowed: current < limit,
      current,
      limit,
    };
  } catch (error) {
    console.error('Error checking employee limit:', error);
    return { allowed: false, current: 0, limit: 0 };
  }
}

/**
 * Check if organisation can add more venues
 */
export async function canAddVenue(
  organisationId: string
): Promise<{ allowed: boolean; current: number; limit: number }> {
  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('venue_limit')
      .eq('organisation_id', organisationId)
      .single();

    const { count } = await supabase
      .from('venues')
      .select('*', { count: 'exact', head: true })
      .eq('organisation_id', organisationId)
      .eq('is_active', true);

    const limit = subscription?.venue_limit || 1;
    const current = count || 0;

    return {
      allowed: current < limit,
      current,
      limit,
    };
  } catch (error) {
    console.error('Error checking venue limit:', error);
    return { allowed: false, current: 0, limit: 0 };
  }
}
