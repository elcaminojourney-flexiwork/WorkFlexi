-- ============================================================
-- FLEXIWORK ROTA MODULE - COMPLETE MIGRATION
-- ============================================================
-- Run this SINGLE file in Supabase SQL Editor
-- It creates all tables, functions, and policies in correct order
-- ============================================================

-- ============================================================
-- PART 1: CREATE ALL TABLES (no RLS yet)
-- ============================================================

-- 1.1 ORGANISATIONS
CREATE TABLE IF NOT EXISTS public.organisations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    business_reg_number VARCHAR(100),
    industry VARCHAR(100) DEFAULT 'food_and_beverage',
    billing_email VARCHAR(255),
    billing_address TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organisations_owner_id ON public.organisations(owner_id);

-- 1.2 VENUES
CREATE TABLE IF NOT EXISTS public.venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    postal_code VARCHAR(20),
    city VARCHAR(100) DEFAULT 'Singapore',
    country VARCHAR(100) DEFAULT 'Singapore',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    phone VARCHAR(50),
    email VARCHAR(255),
    operating_hours JSONB DEFAULT '{
        "monday": {"open": "09:00", "close": "22:00", "closed": false},
        "tuesday": {"open": "09:00", "close": "22:00", "closed": false},
        "wednesday": {"open": "09:00", "close": "22:00", "closed": false},
        "thursday": {"open": "09:00", "close": "22:00", "closed": false},
        "friday": {"open": "09:00", "close": "22:00", "closed": false},
        "saturday": {"open": "09:00", "close": "22:00", "closed": false},
        "sunday": {"open": "09:00", "close": "22:00", "closed": true}
    }'::jsonb,
    timezone VARCHAR(50) DEFAULT 'Asia/Singapore',
    manager_id UUID REFERENCES public.profiles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_venues_organisation_id ON public.venues(organisation_id);

-- 1.3 ROLES
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    colour VARCHAR(7) DEFAULT '#3b82f6',
    icon VARCHAR(50) DEFAULT 'briefcase',
    description TEXT,
    hourly_rate_default DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organisation_id, name)
);

CREATE INDEX IF NOT EXISTS idx_roles_organisation_id ON public.roles(organisation_id);

-- 1.4 VENUE_ROLES (junction)
CREATE TABLE IF NOT EXISTS public.venue_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(venue_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_venue_roles_venue_id ON public.venue_roles(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_roles_role_id ON public.venue_roles(role_id);

-- 1.5 TEAM_MEMBERS (your internal employees - NOT gig workers)
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    employment_type VARCHAR(20) NOT NULL DEFAULT 'part_time' CHECK (employment_type IN ('full_time', 'part_time')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'terminated')),
    invite_code VARCHAR(50) UNIQUE,
    invite_expires_at TIMESTAMP WITH TIME ZONE,
    invited_by UUID REFERENCES public.profiles(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organisation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_organisation_id ON public.team_members(organisation_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_invite_code ON public.team_members(invite_code);

-- 1.6 TEAM_MEMBER_ROLES (junction)
CREATE TABLE IF NOT EXISTS public.team_member_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES public.profiles(id),
    UNIQUE(team_member_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_team_member_roles_team_member_id ON public.team_member_roles(team_member_id);

-- 1.7 TEAM_MEMBER_VENUES (junction)
CREATE TABLE IF NOT EXISTS public.team_member_venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES public.profiles(id),
    UNIQUE(team_member_id, venue_id)
);

CREATE INDEX IF NOT EXISTS idx_team_member_venues_team_member_id ON public.team_member_venues(team_member_id);
CREATE INDEX IF NOT EXISTS idx_team_member_venues_venue_id ON public.team_member_venues(venue_id);

-- 1.8 ROTA_SHIFTS
CREATE TABLE IF NOT EXISTS public.rota_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    headcount_needed INTEGER NOT NULL DEFAULT 1 CHECK (headcount_needed >= 1),
    headcount_filled INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'in_progress', 'completed', 'cancelled')),
    gig_platform_enabled BOOLEAN DEFAULT false,
    hourly_rate DECIMAL(10, 2),
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id),
    published_at TIMESTAMP WITH TIME ZONE,
    published_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rota_shifts_venue_id ON public.rota_shifts(venue_id);
CREATE INDEX IF NOT EXISTS idx_rota_shifts_shift_date ON public.rota_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_rota_shifts_venue_date ON public.rota_shifts(venue_id, shift_date);

-- 1.9 SHIFT_ALLOCATIONS
CREATE TABLE IF NOT EXISTS public.shift_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rota_shift_id UUID NOT NULL REFERENCES public.rota_shifts(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated', 'confirmed', 'in_progress', 'completed', 'no_show', 'cancelled', 'swapped_out')),
    allocated_by UUID REFERENCES public.profiles(id),
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(rota_shift_id, team_member_id)
);

CREATE INDEX IF NOT EXISTS idx_shift_allocations_rota_shift_id ON public.shift_allocations(rota_shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_allocations_team_member_id ON public.shift_allocations(team_member_id);

-- 1.10 SHIFT_INVITES
CREATE TABLE IF NOT EXISTS public.shift_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rota_shift_id UUID NOT NULL REFERENCES public.rota_shifts(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
    invited_by UUID REFERENCES public.profiles(id),
    invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(rota_shift_id, team_member_id)
);

CREATE INDEX IF NOT EXISTS idx_shift_invites_rota_shift_id ON public.shift_invites(rota_shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_invites_team_member_id ON public.shift_invites(team_member_id);

-- 1.11 SHIFT_SWAPS
CREATE TABLE IF NOT EXISTS public.shift_swaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rota_shift_id UUID NOT NULL REFERENCES public.rota_shifts(id) ON DELETE CASCADE,
    original_allocation_id UUID NOT NULL REFERENCES public.shift_allocations(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    reason TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'pending_target' CHECK (status IN ('pending_target', 'pending_manager', 'approved', 'rejected_target', 'rejected_manager', 'cancelled', 'expired')),
    target_responded_at TIMESTAMP WITH TIME ZONE,
    target_notes TEXT,
    manager_id UUID REFERENCES public.profiles(id),
    manager_responded_at TIMESTAMP WITH TIME ZONE,
    manager_notes TEXT,
    new_allocation_id UUID REFERENCES public.shift_allocations(id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shift_swaps_rota_shift_id ON public.shift_swaps(rota_shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_requester_id ON public.shift_swaps(requester_id);
CREATE INDEX IF NOT EXISTS idx_shift_swaps_target_id ON public.shift_swaps(target_id);

-- 1.12 TIMEKEEPING_RECORDS
CREATE TABLE IF NOT EXISTS public.timekeeping_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    allocation_id UUID NOT NULL REFERENCES public.shift_allocations(id) ON DELETE CASCADE,
    rota_shift_id UUID NOT NULL REFERENCES public.rota_shifts(id) ON DELETE CASCADE,
    team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    venue_id UUID NOT NULL REFERENCES public.venues(id) ON DELETE CASCADE,
    scheduled_start TIME NOT NULL,
    scheduled_end TIME NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    clock_in_approved_by UUID REFERENCES public.profiles(id),
    clock_out_approved_by UUID REFERENCES public.profiles(id),
    break_minutes INTEGER DEFAULT 0,
    break_auto_calculated BOOLEAN DEFAULT true,
    total_minutes INTEGER,
    regular_minutes INTEGER,
    overtime_minutes INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'clocked_in', 'clocked_out', 'approved', 'disputed', 'cancelled')),
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    dispute_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(allocation_id)
);

CREATE INDEX IF NOT EXISTS idx_timekeeping_records_team_member_id ON public.timekeeping_records(team_member_id);
CREATE INDEX IF NOT EXISTS idx_timekeeping_records_venue_id ON public.timekeeping_records(venue_id);

-- 1.13 SUBSCRIPTIONS
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    tier VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro', 'enterprise')),
    employee_limit INTEGER NOT NULL DEFAULT 10,
    venue_limit INTEGER NOT NULL DEFAULT 1,
    monthly_price DECIMAL(10, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'SGD',
    billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trial')),
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organisation_id)
);

-- 1.14 ROTA_TEMPLATES
CREATE TABLE IF NOT EXISTS public.rota_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.15 AVAILABILITY
CREATE TABLE IF NOT EXISTS public.availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    weekly_availability JSONB DEFAULT '{
        "monday": {"morning": true, "afternoon": true, "evening": true},
        "tuesday": {"morning": true, "afternoon": true, "evening": true},
        "wednesday": {"morning": true, "afternoon": true, "evening": true},
        "thursday": {"morning": true, "afternoon": true, "evening": true},
        "friday": {"morning": true, "afternoon": true, "evening": true},
        "saturday": {"morning": true, "afternoon": true, "evening": true},
        "sunday": {"morning": false, "afternoon": false, "evening": false}
    }'::jsonb,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_member_id)
);

-- ============================================================
-- PART 2: UPDATE PROFILES TABLE
-- ============================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS worker_status VARCHAR(20) DEFAULT 'inactive' CHECK (worker_status IN ('inactive', 'active')),
ADD COLUMN IF NOT EXISTS has_employee_profile BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_gig_profile BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS active_mode VARCHAR(20) DEFAULT 'employee' CHECK (active_mode IN ('employee', 'gig_worker'));

-- Update existing gig workers
UPDATE public.profiles
SET 
    worker_status = 'active',
    has_gig_profile = true,
    active_mode = 'gig_worker'
WHERE user_type = 'worker';

-- ============================================================
-- PART 3: CREATE FUNCTIONS & TRIGGERS
-- ============================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'organisations', 'venues', 'roles', 'team_members', 
            'rota_shifts', 'shift_allocations', 'shift_invites', 
            'shift_swaps', 'timekeeping_records', 'subscriptions', 'rota_templates'
        ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trigger_%s_updated_at ON public.%s;
            CREATE TRIGGER trigger_%s_updated_at
                BEFORE UPDATE ON public.%s
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- Generate invite code function
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_code IS NULL THEN
        NEW.invite_code := 'FW-' || upper(substring(md5(random()::text) from 1 for 8));
        NEW.invite_expires_at := NOW() + INTERVAL '7 days';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_invite_code ON public.team_members;
CREATE TRIGGER trigger_generate_invite_code
    BEFORE INSERT ON public.team_members
    FOR EACH ROW
    EXECUTE FUNCTION generate_invite_code();

-- Update headcount function
CREATE OR REPLACE FUNCTION update_shift_headcount()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.rota_shifts
    SET headcount_filled = (
        SELECT COUNT(*) 
        FROM public.shift_allocations 
        WHERE rota_shift_id = COALESCE(NEW.rota_shift_id, OLD.rota_shift_id)
        AND status IN ('allocated', 'confirmed', 'in_progress', 'completed')
    )
    WHERE id = COALESCE(NEW.rota_shift_id, OLD.rota_shift_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_headcount_on_allocation ON public.shift_allocations;
CREATE TRIGGER trigger_update_headcount_on_allocation
    AFTER INSERT OR UPDATE OR DELETE ON public.shift_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_shift_headcount();

-- Seed default roles function
CREATE OR REPLACE FUNCTION seed_default_roles(org_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO public.roles (organisation_id, name, colour, icon, description, sort_order)
    VALUES
        (org_id, 'Chef', '#ef4444', 'chef-hat', 'Kitchen chef / cook', 1),
        (org_id, 'Barista', '#8b5cf6', 'coffee', 'Coffee preparation specialist', 2),
        (org_id, 'Server', '#3b82f6', 'utensils', 'Front of house service', 3),
        (org_id, 'Host', '#ec4899', 'door-open', 'Guest reception and seating', 4),
        (org_id, 'KP', '#10b981', 'sparkles', 'Kitchen porter / dishwasher', 5),
        (org_id, 'Runner', '#f59e0b', 'running', 'Food runner / busser', 6),
        (org_id, 'Bartender', '#6366f1', 'wine', 'Bar service', 7),
        (org_id, 'Cashier', '#14b8a6', 'banknotes', 'Point of sale / checkout', 8)
    ON CONFLICT (organisation_id, name) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Accept team invite function
CREATE OR REPLACE FUNCTION accept_team_invite(
    p_invite_code VARCHAR,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_team_member_id UUID;
BEGIN
    UPDATE public.team_members
    SET 
        user_id = p_user_id,
        status = 'active',
        joined_at = NOW(),
        invite_code = NULL,
        invite_expires_at = NULL
    WHERE invite_code = p_invite_code
    AND status = 'pending'
    AND (invite_expires_at IS NULL OR invite_expires_at > NOW())
    RETURNING id INTO v_team_member_id;
    
    IF v_team_member_id IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invite code';
    END IF;
    
    UPDATE public.profiles
    SET has_employee_profile = true
    WHERE id = p_user_id;
    
    RETURN v_team_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get weekly rota function
CREATE OR REPLACE FUNCTION get_weekly_rota(
    p_venue_id UUID,
    p_week_start DATE
)
RETURNS TABLE (
    shift_id UUID,
    shift_date DATE,
    start_time TIME,
    end_time TIME,
    role_id UUID,
    role_name VARCHAR,
    role_colour VARCHAR,
    headcount_needed INTEGER,
    headcount_filled INTEGER,
    status VARCHAR,
    allocations JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rs.id as shift_id,
        rs.shift_date,
        rs.start_time,
        rs.end_time,
        rs.role_id,
        r.name as role_name,
        r.colour as role_colour,
        rs.headcount_needed,
        rs.headcount_filled,
        rs.status,
        COALESCE(
            (SELECT jsonb_agg(jsonb_build_object(
                'allocation_id', sa.id,
                'team_member_id', sa.team_member_id,
                'full_name', tm.full_name,
                'employment_type', tm.employment_type,
                'status', sa.status
            ) ORDER BY tm.employment_type DESC, tm.full_name)
            FROM public.shift_allocations sa
            JOIN public.team_members tm ON tm.id = sa.team_member_id
            WHERE sa.rota_shift_id = rs.id
            AND sa.status NOT IN ('cancelled', 'swapped_out')),
            '[]'::jsonb
        ) as allocations
    FROM public.rota_shifts rs
    JOIN public.roles r ON r.id = rs.role_id
    WHERE rs.venue_id = p_venue_id
    AND rs.shift_date >= p_week_start
    AND rs.shift_date < p_week_start + INTERVAL '7 days'
    ORDER BY rs.shift_date, rs.start_time, r.sort_order;
END;
$$ LANGUAGE plpgsql;

-- Copy rota week function
CREATE OR REPLACE FUNCTION copy_rota_week(
    p_venue_id UUID,
    p_source_week_start DATE,
    p_target_week_start DATE,
    p_created_by UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    INSERT INTO public.rota_shifts (
        venue_id, role_id, shift_date, start_time, end_time,
        headcount_needed, notes, created_by, status
    )
    SELECT
        venue_id, role_id,
        shift_date + (p_target_week_start - p_source_week_start),
        start_time, end_time, headcount_needed, notes, p_created_by, 'draft'
    FROM public.rota_shifts
    WHERE venue_id = p_venue_id
    AND shift_date >= p_source_week_start
    AND shift_date < p_source_week_start + INTERVAL '7 days'
    AND status != 'cancelled';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Publish rota week function
CREATE OR REPLACE FUNCTION publish_rota_week(
    p_venue_id UUID,
    p_week_start DATE,
    p_published_by UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    UPDATE public.rota_shifts
    SET 
        status = 'published',
        published_at = NOW(),
        published_by = p_published_by
    WHERE venue_id = p_venue_id
    AND shift_date >= p_week_start
    AND shift_date < p_week_start + INTERVAL '7 days'
    AND status = 'draft';
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Allocate team member function
CREATE OR REPLACE FUNCTION allocate_team_member(
    p_rota_shift_id UUID,
    p_team_member_id UUID,
    p_allocated_by UUID
)
RETURNS UUID AS $$
DECLARE
    v_allocation_id UUID;
    v_shift_record RECORD;
BEGIN
    SELECT rs.*, rs.role_id INTO v_shift_record
    FROM public.rota_shifts rs
    WHERE rs.id = p_rota_shift_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shift not found';
    END IF;
    
    IF v_shift_record.headcount_filled >= v_shift_record.headcount_needed THEN
        RAISE EXCEPTION 'Shift is already fully staffed';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM public.team_member_roles tmr
        WHERE tmr.team_member_id = p_team_member_id
        AND tmr.role_id = v_shift_record.role_id
    ) THEN
        RAISE EXCEPTION 'Team member does not have the required role';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM public.shift_allocations sa
        JOIN public.rota_shifts rs ON rs.id = sa.rota_shift_id
        WHERE sa.team_member_id = p_team_member_id
        AND sa.status IN ('allocated', 'confirmed', 'in_progress')
        AND rs.shift_date = v_shift_record.shift_date
        AND (rs.start_time, rs.end_time) OVERLAPS (v_shift_record.start_time, v_shift_record.end_time)
    ) THEN
        RAISE EXCEPTION 'Team member has a conflicting shift';
    END IF;
    
    INSERT INTO public.shift_allocations (rota_shift_id, team_member_id, allocated_by, status)
    VALUES (p_rota_shift_id, p_team_member_id, p_allocated_by, 'allocated')
    RETURNING id INTO v_allocation_id;
    
    RETURN v_allocation_id;
END;
$$ LANGUAGE plpgsql;

-- Accept shift invite function (first-come-first-served)
CREATE OR REPLACE FUNCTION accept_shift_invite(p_invite_id UUID)
RETURNS UUID AS $$
DECLARE
    v_invite RECORD;
    v_shift RECORD;
    v_allocation_id UUID;
BEGIN
    SELECT * INTO v_invite
    FROM public.shift_invites
    WHERE id = p_invite_id
    FOR UPDATE;
    
    IF NOT FOUND OR v_invite.status != 'pending' THEN
        RAISE EXCEPTION 'Invite not found or already responded';
    END IF;
    
    SELECT * INTO v_shift
    FROM public.rota_shifts
    WHERE id = v_invite.rota_shift_id
    FOR UPDATE;
    
    IF v_shift.headcount_filled >= v_shift.headcount_needed THEN
        UPDATE public.shift_invites
        SET status = 'expired', responded_at = NOW()
        WHERE id = p_invite_id;
        RAISE EXCEPTION 'Shift is already filled';
    END IF;
    
    UPDATE public.shift_invites
    SET status = 'accepted', responded_at = NOW()
    WHERE id = p_invite_id;
    
    INSERT INTO public.shift_allocations (rota_shift_id, team_member_id, allocated_by, status)
    VALUES (v_invite.rota_shift_id, v_invite.team_member_id, v_invite.invited_by, 'allocated')
    RETURNING id INTO v_allocation_id;
    
    IF v_shift.headcount_filled + 1 >= v_shift.headcount_needed THEN
        UPDATE public.shift_invites
        SET status = 'expired', responded_at = NOW()
        WHERE rota_shift_id = v_invite.rota_shift_id
        AND status = 'pending'
        AND id != p_invite_id;
    END IF;
    
    RETURN v_allocation_id;
END;
$$ LANGUAGE plpgsql;

-- Decline shift invite function
CREATE OR REPLACE FUNCTION decline_shift_invite(p_invite_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE public.shift_invites
    SET status = 'declined', responded_at = NOW()
    WHERE id = p_invite_id
    AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invite not found or already responded';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Request shift swap function
CREATE OR REPLACE FUNCTION request_shift_swap(
    p_allocation_id UUID,
    p_target_member_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_allocation RECORD;
    v_shift RECORD;
    v_swap_id UUID;
BEGIN
    SELECT sa.*, tm.id as team_member_id
    INTO v_allocation
    FROM public.shift_allocations sa
    JOIN public.team_members tm ON tm.id = sa.team_member_id
    WHERE sa.id = p_allocation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Allocation not found';
    END IF;
    
    IF v_allocation.status NOT IN ('allocated', 'confirmed') THEN
        RAISE EXCEPTION 'Cannot swap this allocation';
    END IF;
    
    SELECT * INTO v_shift
    FROM public.rota_shifts
    WHERE id = v_allocation.rota_shift_id;
    
    IF NOT EXISTS (
        SELECT 1 FROM public.team_member_roles tmr
        WHERE tmr.team_member_id = p_target_member_id
        AND tmr.role_id = v_shift.role_id
    ) THEN
        RAISE EXCEPTION 'Target does not have the required role';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM public.shift_allocations sa
        JOIN public.rota_shifts rs ON rs.id = sa.rota_shift_id
        WHERE sa.team_member_id = p_target_member_id
        AND sa.status IN ('allocated', 'confirmed', 'in_progress')
        AND rs.shift_date = v_shift.shift_date
        AND (rs.start_time, rs.end_time) OVERLAPS (v_shift.start_time, v_shift.end_time)
    ) THEN
        RAISE EXCEPTION 'Target has a conflicting shift';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM public.shift_swaps
        WHERE original_allocation_id = p_allocation_id
        AND status IN ('pending_target', 'pending_manager')
    ) THEN
        RAISE EXCEPTION 'A swap request is already pending for this shift';
    END IF;
    
    INSERT INTO public.shift_swaps (
        rota_shift_id, original_allocation_id, requester_id, target_id, reason, status, expires_at
    )
    VALUES (
        v_allocation.rota_shift_id, p_allocation_id, v_allocation.team_member_id,
        p_target_member_id, p_reason, 'pending_target', NOW() + INTERVAL '48 hours'
    )
    RETURNING id INTO v_swap_id;
    
    RETURN v_swap_id;
END;
$$ LANGUAGE plpgsql;

-- Respond to swap request function
CREATE OR REPLACE FUNCTION respond_to_swap_request(
    p_swap_id UUID,
    p_accept BOOLEAN,
    p_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    IF p_accept THEN
        UPDATE public.shift_swaps
        SET status = 'pending_manager', target_responded_at = NOW(), target_notes = p_notes
        WHERE id = p_swap_id AND status = 'pending_target';
    ELSE
        UPDATE public.shift_swaps
        SET status = 'rejected_target', target_responded_at = NOW(), target_notes = p_notes, completed_at = NOW()
        WHERE id = p_swap_id AND status = 'pending_target';
    END IF;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Swap request not found or already responded';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Manager respond to swap function
CREATE OR REPLACE FUNCTION manager_respond_to_swap(
    p_swap_id UUID,
    p_approve BOOLEAN,
    p_manager_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_swap RECORD;
    v_new_allocation_id UUID;
BEGIN
    SELECT * INTO v_swap
    FROM public.shift_swaps
    WHERE id = p_swap_id
    FOR UPDATE;
    
    IF NOT FOUND OR v_swap.status != 'pending_manager' THEN
        RAISE EXCEPTION 'Swap request not found or not pending manager approval';
    END IF;
    
    IF p_approve THEN
        UPDATE public.shift_allocations
        SET status = 'swapped_out'
        WHERE id = v_swap.original_allocation_id;
        
        INSERT INTO public.shift_allocations (rota_shift_id, team_member_id, allocated_by, status, notes)
        VALUES (v_swap.rota_shift_id, v_swap.target_id, p_manager_id, 'allocated',
                'Swap from ' || (SELECT full_name FROM public.team_members WHERE id = v_swap.requester_id))
        RETURNING id INTO v_new_allocation_id;
        
        UPDATE public.shift_swaps
        SET status = 'approved', manager_id = p_manager_id, manager_responded_at = NOW(),
            manager_notes = p_notes, new_allocation_id = v_new_allocation_id, completed_at = NOW()
        WHERE id = p_swap_id;
    ELSE
        UPDATE public.shift_swaps
        SET status = 'rejected_manager', manager_id = p_manager_id,
            manager_responded_at = NOW(), manager_notes = p_notes, completed_at = NOW()
        WHERE id = p_swap_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Employee clock in function
CREATE OR REPLACE FUNCTION employee_clock_in(
    p_allocation_id UUID,
    p_approved_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_allocation RECORD;
    v_shift RECORD;
    v_record_id UUID;
BEGIN
    SELECT * INTO v_allocation
    FROM public.shift_allocations
    WHERE id = p_allocation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Allocation not found';
    END IF;
    
    IF v_allocation.status NOT IN ('allocated', 'confirmed') THEN
        RAISE EXCEPTION 'Cannot clock in for this allocation';
    END IF;
    
    SELECT * INTO v_shift
    FROM public.rota_shifts
    WHERE id = v_allocation.rota_shift_id;
    
    INSERT INTO public.timekeeping_records (
        allocation_id, rota_shift_id, team_member_id, venue_id,
        scheduled_start, scheduled_end, clock_in, clock_in_approved_by, status
    )
    VALUES (
        p_allocation_id, v_allocation.rota_shift_id, v_allocation.team_member_id,
        v_shift.venue_id, v_shift.start_time, v_shift.end_time, NOW(), p_approved_by, 'clocked_in'
    )
    ON CONFLICT (allocation_id) DO UPDATE
    SET clock_in = NOW(), clock_in_approved_by = p_approved_by, status = 'clocked_in', updated_at = NOW()
    RETURNING id INTO v_record_id;
    
    UPDATE public.shift_allocations
    SET status = 'in_progress'
    WHERE id = p_allocation_id;
    
    RETURN v_record_id;
END;
$$ LANGUAGE plpgsql;

-- Employee clock out function
CREATE OR REPLACE FUNCTION employee_clock_out(
    p_allocation_id UUID,
    p_approved_by UUID DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_record RECORD;
    v_total_minutes INTEGER;
    v_break_minutes INTEGER;
    v_regular_minutes INTEGER;
    v_overtime_minutes INTEGER;
BEGIN
    SELECT * INTO v_record
    FROM public.timekeeping_records
    WHERE allocation_id = p_allocation_id;
    
    IF NOT FOUND OR v_record.status != 'clocked_in' THEN
        RAISE EXCEPTION 'No active clock-in found';
    END IF;
    
    v_total_minutes := EXTRACT(EPOCH FROM (NOW() - v_record.clock_in)) / 60;
    
    IF v_total_minutes > 360 THEN
        v_break_minutes := 45;
    ELSE
        v_break_minutes := 0;
    END IF;
    
    v_total_minutes := v_total_minutes - v_break_minutes;
    
    IF v_total_minutes > 480 THEN
        v_regular_minutes := 480;
        v_overtime_minutes := v_total_minutes - 480;
    ELSE
        v_regular_minutes := v_total_minutes;
        v_overtime_minutes := 0;
    END IF;
    
    UPDATE public.timekeeping_records
    SET 
        clock_out = NOW(),
        clock_out_approved_by = p_approved_by,
        break_minutes = v_break_minutes,
        total_minutes = v_total_minutes,
        regular_minutes = v_regular_minutes,
        overtime_minutes = v_overtime_minutes,
        status = 'clocked_out',
        updated_at = NOW()
    WHERE allocation_id = p_allocation_id;
    
    UPDATE public.shift_allocations
    SET status = 'completed'
    WHERE id = p_allocation_id;
END;
$$ LANGUAGE plpgsql;

-- Approve timekeeping function
CREATE OR REPLACE FUNCTION approve_timekeeping(
    p_record_id UUID,
    p_approved_by UUID
)
RETURNS void AS $$
BEGIN
    UPDATE public.timekeeping_records
    SET status = 'approved', approved_by = p_approved_by, approved_at = NOW(), updated_at = NOW()
    WHERE id = p_record_id
    AND status = 'clocked_out';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Record not found or not ready for approval';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Switch account mode function
CREATE OR REPLACE FUNCTION switch_account_mode(
    p_user_id UUID,
    p_new_mode VARCHAR
)
RETURNS void AS $$
BEGIN
    IF p_new_mode = 'gig_worker' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = p_user_id AND has_gig_profile = true
        ) THEN
            RAISE EXCEPTION 'User does not have a gig worker profile';
        END IF;
    ELSIF p_new_mode = 'employee' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = p_user_id AND has_employee_profile = true
        ) THEN
            RAISE EXCEPTION 'User does not have an employee profile';
        END IF;
    ELSE
        RAISE EXCEPTION 'Invalid mode';
    END IF;
    
    UPDATE public.profiles
    SET active_mode = p_new_mode
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PART 4: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_member_venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rota_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_swaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timekeeping_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rota_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PART 5: CREATE RLS POLICIES
-- ============================================================

-- ORGANISATIONS policies
CREATE POLICY "org_owner_full_access" ON public.organisations
FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "org_team_members_view" ON public.organisations
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members tm
            WHERE tm.organisation_id = organisations.id
            AND tm.user_id = auth.uid() AND tm.status = 'active')
);

-- VENUES policies
CREATE POLICY "venues_org_owner_full" ON public.venues
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organisations o
            WHERE o.id = venues.organisation_id AND o.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organisations o
            WHERE o.id = venues.organisation_id AND o.owner_id = auth.uid())
);

CREATE POLICY "venues_manager_view" ON public.venues
FOR SELECT USING (manager_id = auth.uid());

CREATE POLICY "venues_team_view" ON public.venues
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_member_venues tmv
            JOIN public.team_members tm ON tm.id = tmv.team_member_id
            WHERE tmv.venue_id = venues.id AND tm.user_id = auth.uid() AND tm.status = 'active')
);

-- ROLES policies
CREATE POLICY "roles_org_owner_full" ON public.roles
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organisations o
            WHERE o.id = roles.organisation_id AND o.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organisations o
            WHERE o.id = roles.organisation_id AND o.owner_id = auth.uid())
);

CREATE POLICY "roles_team_view" ON public.roles
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members tm
            WHERE tm.organisation_id = roles.organisation_id
            AND tm.user_id = auth.uid() AND tm.status = 'active')
);

-- VENUE_ROLES policies
CREATE POLICY "venue_roles_org_owner_full" ON public.venue_roles
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.venues v
            JOIN public.organisations o ON o.id = v.organisation_id
            WHERE v.id = venue_roles.venue_id AND o.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.venues v
            JOIN public.organisations o ON o.id = v.organisation_id
            WHERE v.id = venue_roles.venue_id AND o.owner_id = auth.uid())
);

-- TEAM_MEMBERS policies
CREATE POLICY "team_org_owner_full" ON public.team_members
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organisations o
            WHERE o.id = team_members.organisation_id AND o.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organisations o
            WHERE o.id = team_members.organisation_id AND o.owner_id = auth.uid())
);

CREATE POLICY "team_self_view" ON public.team_members
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "team_colleagues_view" ON public.team_members
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members my_tm
            WHERE my_tm.organisation_id = team_members.organisation_id
            AND my_tm.user_id = auth.uid() AND my_tm.status = 'active')
);

-- TEAM_MEMBER_ROLES policies
CREATE POLICY "tmr_org_owner_full" ON public.team_member_roles
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members tm
            JOIN public.organisations o ON o.id = tm.organisation_id
            WHERE tm.id = team_member_roles.team_member_id AND o.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.team_members tm
            JOIN public.organisations o ON o.id = tm.organisation_id
            WHERE tm.id = team_member_roles.team_member_id AND o.owner_id = auth.uid())
);

CREATE POLICY "tmr_self_view" ON public.team_member_roles
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members tm
            WHERE tm.id = team_member_roles.team_member_id AND tm.user_id = auth.uid())
);

-- TEAM_MEMBER_VENUES policies
CREATE POLICY "tmv_org_owner_full" ON public.team_member_venues
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members tm
            JOIN public.organisations o ON o.id = tm.organisation_id
            WHERE tm.id = team_member_venues.team_member_id AND o.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.team_members tm
            JOIN public.organisations o ON o.id = tm.organisation_id
            WHERE tm.id = team_member_venues.team_member_id AND o.owner_id = auth.uid())
);

CREATE POLICY "tmv_self_view" ON public.team_member_venues
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members tm
            WHERE tm.id = team_member_venues.team_member_id AND tm.user_id = auth.uid())
);

-- ROTA_SHIFTS policies
CREATE POLICY "shifts_org_owner_full" ON public.rota_shifts
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.venues v
            JOIN public.organisations o ON o.id = v.organisation_id
            WHERE v.id = rota_shifts.venue_id AND o.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.venues v
            JOIN public.organisations o ON o.id = v.organisation_id
            WHERE v.id = rota_shifts.venue_id AND o.owner_id = auth.uid())
);

CREATE POLICY "shifts_team_view_published" ON public.rota_shifts
FOR SELECT USING (
    status IN ('published', 'in_progress', 'completed')
    AND EXISTS (SELECT 1 FROM public.team_member_venues tmv
                JOIN public.team_members tm ON tm.id = tmv.team_member_id
                WHERE tmv.venue_id = rota_shifts.venue_id
                AND tm.user_id = auth.uid() AND tm.status = 'active')
);

-- SHIFT_ALLOCATIONS policies
CREATE POLICY "alloc_org_owner_full" ON public.shift_allocations
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.rota_shifts rs
            JOIN public.venues v ON v.id = rs.venue_id
            JOIN public.organisations o ON o.id = v.organisation_id
            WHERE rs.id = shift_allocations.rota_shift_id AND o.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.rota_shifts rs
            JOIN public.venues v ON v.id = rs.venue_id
            JOIN public.organisations o ON o.id = v.organisation_id
            WHERE rs.id = shift_allocations.rota_shift_id AND o.owner_id = auth.uid())
);

CREATE POLICY "alloc_self_view" ON public.shift_allocations
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members tm
            WHERE tm.id = shift_allocations.team_member_id AND tm.user_id = auth.uid())
);

-- SHIFT_INVITES policies
CREATE POLICY "invites_org_owner_full" ON public.shift_invites
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.rota_shifts rs
            JOIN public.venues v ON v.id = rs.venue_id
            JOIN public.organisations o ON o.id = v.organisation_id
            WHERE rs.id = shift_invites.rota_shift_id AND o.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.rota_shifts rs
            JOIN public.venues v ON v.id = rs.venue_id
            JOIN public.organisations o ON o.id = v.organisation_id
            WHERE rs.id = shift_invites.rota_shift_id AND o.owner_id = auth.uid())
);

CREATE POLICY "invites_self_view" ON public.shift_invites
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members tm
            WHERE tm.id = shift_invites.team_member_id AND tm.user_id = auth.uid())
);

CREATE POLICY "invites_self_respond" ON public.shift_invites
FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.team_members tm
            WHERE tm.id = shift_invites.team_member_id AND tm.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.team_members tm
            WHERE tm.id = shift_invites.team_member_id AND tm.user_id = auth.uid())
);

-- SHIFT_SWAPS policies
CREATE POLICY "swaps_org_owner_full" ON public.shift_swaps
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.rota_shifts rs
            JOIN public.venues v ON v.id = rs.venue_id
            JOIN public.organisations o ON o.id = v.organisation_id
            WHERE rs.id = shift_swaps.rota_shift_id AND o.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.rota_shifts rs
            JOIN public.venues v ON v.id = rs.venue_id
            JOIN public.organisations o ON o.id = v.organisation_id
            WHERE rs.id = shift_swaps.rota_shift_id AND o.owner_id = auth.uid())
);

CREATE POLICY "swaps_requester_view" ON public.shift_swaps
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members tm
            WHERE tm.id = shift_swaps.requester_id AND tm.user_id = auth.uid())
);

CREATE POLICY "swaps_target_view" ON public.shift_swaps
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members tm
            WHERE tm.id = shift_swaps.target_id AND tm.user_id = auth.uid())
);

-- TIMEKEEPING_RECORDS policies
CREATE POLICY "timekeeping_org_owner_full" ON public.timekeeping_records
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.venues v
            JOIN public.organisations o ON o.id = v.organisation_id
            WHERE v.id = timekeeping_records.venue_id AND o.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.venues v
            JOIN public.organisations o ON o.id = v.organisation_id
            WHERE v.id = timekeeping_records.venue_id AND o.owner_id = auth.uid())
);

CREATE POLICY "timekeeping_self_view" ON public.timekeeping_records
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members tm
            WHERE tm.id = timekeeping_records.team_member_id AND tm.user_id = auth.uid())
);

-- SUBSCRIPTIONS policies
CREATE POLICY "subs_org_owner_view" ON public.subscriptions
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.organisations o
            WHERE o.id = subscriptions.organisation_id AND o.owner_id = auth.uid())
);

-- ROTA_TEMPLATES policies
CREATE POLICY "templates_org_owner_full" ON public.rota_templates
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.organisations o
            WHERE o.id = rota_templates.organisation_id AND o.owner_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.organisations o
            WHERE o.id = rota_templates.organisation_id AND o.owner_id = auth.uid())
);

-- AVAILABILITY policies
CREATE POLICY "availability_self_full" ON public.availability
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.team_members tm
            WHERE tm.id = availability.team_member_id AND tm.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.team_members tm
            WHERE tm.id = availability.team_member_id AND tm.user_id = auth.uid())
);

CREATE POLICY "availability_manager_view" ON public.availability
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.team_members tm
            JOIN public.organisations o ON o.id = tm.organisation_id
            WHERE tm.id = availability.team_member_id AND o.owner_id = auth.uid())
);

-- ============================================================
-- DONE! All tables, functions, and policies created.
-- ============================================================
