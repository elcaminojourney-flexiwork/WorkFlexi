-- ============================================================
-- FLEXIWORK SCHEMA AUDIT – FK, UUID, DUPLICATE COLUMNS, INDEXES
-- ============================================================
-- 1. Hiányzó Foreign Key constraint-ek (csak ha még nincsenek)
-- 2. UUID default egységesítés: uuid_generate_v4() → gen_random_uuid()
-- 3. Duplikált oszlopok eltávolítása (notifications.read, profiles.rating)
-- 4. Hiányzó indexek
-- 5. availability.weekly_availability JSONB validáció
-- ============================================================
-- Futtatás: Supabase SQL Editor vagy: supabase db push
-- ============================================================

-- Enable extension if needed for gen_random_uuid (usually built-in)
-- uuid_generate_v4 needs: CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PART 1: ADD MISSING FOREIGN KEY CONSTRAINTS
-- Only adds constraint if it does not already exist.
-- ============================================================

DO $$
BEGIN
  -- applications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'applications') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraint_schema_usage WHERE constraint_name = 'applications_shift_id_fkey') THEN
      ALTER TABLE public.applications ADD CONSTRAINT applications_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraint_schema_usage WHERE constraint_name = 'applications_worker_id_fkey') THEN
      ALTER TABLE public.applications ADD CONSTRAINT applications_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraint_schema_usage WHERE constraint_name = 'applications_employer_id_fkey') THEN
      ALTER TABLE public.applications ADD CONSTRAINT applications_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- disputes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'disputes') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_timesheet_id_fkey') THEN
      ALTER TABLE public.disputes ADD CONSTRAINT disputes_timesheet_id_fkey FOREIGN KEY (timesheet_id) REFERENCES public.timesheets(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_payment_id_fkey') THEN
      ALTER TABLE public.disputes ADD CONSTRAINT disputes_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_raised_by_fkey') THEN
      ALTER TABLE public.disputes ADD CONSTRAINT disputes_raised_by_fkey FOREIGN KEY (raised_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disputes_resolved_by_fkey') THEN
      ALTER TABLE public.disputes ADD CONSTRAINT disputes_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- favorites (may already have FKs from create_favorites)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'favorites') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favorites_employer_id_fkey') THEN
      ALTER TABLE public.favorites ADD CONSTRAINT favorites_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'favorites_worker_id_fkey') THEN
      ALTER TABLE public.favorites ADD CONSTRAINT favorites_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- invoices (often already have FKs)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_payment_id_fkey') THEN
      ALTER TABLE public.invoices ADD CONSTRAINT invoices_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_employer_id_fkey') THEN
      ALTER TABLE public.invoices ADD CONSTRAINT invoices_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_shift_id_fkey') THEN
      ALTER TABLE public.invoices ADD CONSTRAINT invoices_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_worker_id_fkey') THEN
      ALTER TABLE public.invoices ADD CONSTRAINT invoices_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_timesheet_id_fkey') THEN
      ALTER TABLE public.invoices ADD CONSTRAINT invoices_timesheet_id_fkey FOREIGN KEY (timesheet_id) REFERENCES public.timesheets(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- notification_preferences
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_preferences') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notification_preferences_user_id_fkey') THEN
      ALTER TABLE public.notification_preferences ADD CONSTRAINT notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- notifications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_user_id_fkey') THEN
      ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- organisations (rota migration may already have owner_id FK)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organisations') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organisations_owner_id_fkey') THEN
      ALTER TABLE public.organisations ADD CONSTRAINT organisations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- payments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_shift_id_fkey') THEN
      ALTER TABLE public.payments ADD CONSTRAINT payments_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_timesheet_id_fkey') THEN
      ALTER TABLE public.payments ADD CONSTRAINT payments_timesheet_id_fkey FOREIGN KEY (timesheet_id) REFERENCES public.timesheets(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_application_id_fkey') THEN
      ALTER TABLE public.payments ADD CONSTRAINT payments_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_worker_id_fkey') THEN
      ALTER TABLE public.payments ADD CONSTRAINT payments_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_employer_id_fkey') THEN
      ALTER TABLE public.payments ADD CONSTRAINT payments_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- reviews (may already have FKs)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_shift_id_fkey') THEN
      ALTER TABLE public.reviews ADD CONSTRAINT reviews_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_timesheet_id_fkey') THEN
      ALTER TABLE public.reviews ADD CONSTRAINT reviews_timesheet_id_fkey FOREIGN KEY (timesheet_id) REFERENCES public.timesheets(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_reviewer_id_fkey') THEN
      ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_reviewee_id_fkey') THEN
      ALTER TABLE public.reviews ADD CONSTRAINT reviews_reviewee_id_fkey FOREIGN KEY (reviewee_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- roles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_organisation_id_fkey') THEN
      ALTER TABLE public.roles ADD CONSTRAINT roles_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- rota_shifts (role_id ON DELETE SET NULL per spec)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rota_shifts') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rota_shifts_venue_id_fkey') THEN
      ALTER TABLE public.rota_shifts ADD CONSTRAINT rota_shifts_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rota_shifts_role_id_fkey') THEN
      ALTER TABLE public.rota_shifts ADD CONSTRAINT rota_shifts_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rota_shifts_created_by_fkey') THEN
      ALTER TABLE public.rota_shifts ADD CONSTRAINT rota_shifts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rota_shifts_published_by_fkey') THEN
      ALTER TABLE public.rota_shifts ADD CONSTRAINT rota_shifts_published_by_fkey FOREIGN KEY (published_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- rota_templates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'rota_templates') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rota_templates_organisation_id_fkey') THEN
      ALTER TABLE public.rota_templates ADD CONSTRAINT rota_templates_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rota_templates_venue_id_fkey') THEN
      ALTER TABLE public.rota_templates ADD CONSTRAINT rota_templates_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rota_templates_created_by_fkey') THEN
      ALTER TABLE public.rota_templates ADD CONSTRAINT rota_templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- shift_allocations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_allocations') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_allocations_allocated_by_fkey') THEN
      ALTER TABLE public.shift_allocations ADD CONSTRAINT shift_allocations_allocated_by_fkey FOREIGN KEY (allocated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- shift_invites
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_invites') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_invites_invited_by_fkey') THEN
      ALTER TABLE public.shift_invites ADD CONSTRAINT shift_invites_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- shift_reminders (table may not exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_reminders') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_reminders_shift_id_fkey') THEN
      ALTER TABLE public.shift_reminders ADD CONSTRAINT shift_reminders_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_reminders_worker_id_fkey') THEN
      ALTER TABLE public.shift_reminders ADD CONSTRAINT shift_reminders_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- shift_swaps (new_allocation_id, manager_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shift_swaps') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_swaps_manager_id_fkey') THEN
      ALTER TABLE public.shift_swaps ADD CONSTRAINT shift_swaps_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_swaps_new_allocation_id_fkey') THEN
      ALTER TABLE public.shift_swaps ADD CONSTRAINT shift_swaps_new_allocation_id_fkey FOREIGN KEY (new_allocation_id) REFERENCES public.shift_allocations(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- shifts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'shifts') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shifts_employer_id_fkey') THEN
      ALTER TABLE public.shifts ADD CONSTRAINT shifts_employer_id_fkey FOREIGN KEY (employer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- subscriptions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_organisation_id_fkey') THEN
      ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_organisation_id_fkey FOREIGN KEY (organisation_id) REFERENCES public.organisations(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- team_member_roles (assigned_by)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_member_roles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_member_roles_assigned_by_fkey') THEN
      ALTER TABLE public.team_member_roles ADD CONSTRAINT team_member_roles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- team_member_venues (assigned_by)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_member_venues') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_member_venues_assigned_by_fkey') THEN
      ALTER TABLE public.team_member_venues ADD CONSTRAINT team_member_venues_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- team_members (invited_by)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_invited_by_fkey') THEN
      ALTER TABLE public.team_members ADD CONSTRAINT team_members_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- timekeeping_records (approved_by)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timekeeping_records') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timekeeping_records_approved_by_fkey') THEN
      ALTER TABLE public.timekeeping_records ADD CONSTRAINT timekeeping_records_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- timesheets
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'timesheets') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timesheets_shift_id_fkey') THEN
      ALTER TABLE public.timesheets ADD CONSTRAINT timesheets_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.shifts(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timesheets_worker_id_fkey') THEN
      ALTER TABLE public.timesheets ADD CONSTRAINT timesheets_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'timesheets_application_id_fkey') THEN
      ALTER TABLE public.timesheets ADD CONSTRAINT timesheets_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- venue_roles (already in rota migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'venue_roles') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'venue_roles_venue_id_fkey') THEN
      ALTER TABLE public.venue_roles ADD CONSTRAINT venue_roles_venue_id_fkey FOREIGN KEY (venue_id) REFERENCES public.venues(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'venue_roles_role_id_fkey') THEN
      ALTER TABLE public.venue_roles ADD CONSTRAINT venue_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- venues (manager_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'venues') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'venues_manager_id_fkey') THEN
      ALTER TABLE public.venues ADD CONSTRAINT venues_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- ============================================================
-- PART 2: STANDARDISE UUID DEFAULTS TO gen_random_uuid()
-- ============================================================

DO $$
DECLARE
  r RECORD;
  tbl TEXT;
BEGIN
  FOR r IN (
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
    WHERE c.table_schema = 'public' AND c.column_name = 'id'
      AND c.data_type = 'uuid'
      AND t.table_type = 'BASE TABLE'
      AND t.table_name IN (
        'favorites','notifications','organisations','reviews','rota_shifts','rota_templates',
        'shift_allocations','shift_invites','shift_reminders','shift_swaps','shifts',
        'subscriptions','team_member_roles','team_member_venues','team_members',
        'timekeeping_records','timesheets','venue_roles','venues'
      )
  ) LOOP
    tbl := quote_ident(r.table_name);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN id SET DEFAULT gen_random_uuid()', r.table_name);
    RAISE NOTICE 'Set default gen_random_uuid() on public.%.id', r.table_name;
  END LOOP;
END $$;

-- ============================================================
-- PART 3: REMOVE DUPLICATE COLUMNS
-- ============================================================

-- notifications: remove 'read', keep 'is_read'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read') THEN
    ALTER TABLE public.notifications DROP COLUMN "read";
    RAISE NOTICE 'Dropped notifications.read (keeping is_read)';
  END IF;
END $$;

-- profiles: remove 'rating' if 'average_rating' exists (keep average_rating)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'average_rating')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'rating') THEN
    ALTER TABLE public.profiles DROP COLUMN rating;
    RAISE NOTICE 'Dropped profiles.rating (keeping average_rating)';
  ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'rating')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'average_rating') THEN
    ALTER TABLE public.profiles RENAME COLUMN rating TO average_rating;
    RAISE NOTICE 'Renamed profiles.rating to average_rating';
  END IF;
END $$;

-- ============================================================
-- PART 4: ADD MISSING INDEXES
-- ============================================================

-- applications
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_worker_id ON public.applications(worker_id);
CREATE INDEX IF NOT EXISTS idx_applications_employer_id ON public.applications(employer_id);
CREATE INDEX IF NOT EXISTS idx_applications_shift_id ON public.applications(shift_id);
CREATE INDEX IF NOT EXISTS idx_applications_status_worker ON public.applications(status, worker_id);
CREATE INDEX IF NOT EXISTS idx_applications_status_employer ON public.applications(status, employer_id);

-- shifts
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_employer_id ON public.shifts(employer_id);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON public.shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_status_start ON public.shifts(status, start_time);

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_worker_id ON public.payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_payments_employer_id ON public.payments(employer_id);
CREATE INDEX IF NOT EXISTS idx_payments_shift_id ON public.payments(shift_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON public.payments(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- timesheets
CREATE INDEX IF NOT EXISTS idx_timesheets_shift_id ON public.timesheets(shift_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_worker_id ON public.timesheets(worker_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON public.timesheets(employer_confirmed);
CREATE INDEX IF NOT EXISTS idx_timesheets_worker_status ON public.timesheets(worker_id, employer_confirmed);

-- team_members
CREATE INDEX IF NOT EXISTS idx_team_members_organisation_id ON public.team_members(organisation_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON public.team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_org_status ON public.team_members(organisation_id, status);

-- rota_shifts
CREATE INDEX IF NOT EXISTS idx_rota_shifts_venue_id ON public.rota_shifts(venue_id);
CREATE INDEX IF NOT EXISTS idx_rota_shifts_shift_date ON public.rota_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_rota_shifts_status ON public.rota_shifts(status);
CREATE INDEX IF NOT EXISTS idx_rota_shifts_venue_date ON public.rota_shifts(venue_id, shift_date);
CREATE INDEX IF NOT EXISTS idx_rota_shifts_gig_platform ON public.rota_shifts(gig_platform_enabled) WHERE gig_platform_enabled = true;

-- reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_shift_id ON public.reviews(shift_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_created ON public.reviews(reviewee_id, created_at DESC);

-- ============================================================
-- PART 5: JSONB VALIDATION – availability.weekly_availability
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'availability') THEN
    ALTER TABLE public.availability DROP CONSTRAINT IF EXISTS availability_weekly_availability_keys_check;
    ALTER TABLE public.availability ADD CONSTRAINT availability_weekly_availability_keys_check
      CHECK (weekly_availability ?& ARRAY['monday','tuesday','wednesday','thursday','friday','saturday','sunday']);
    RAISE NOTICE 'Added availability weekly_availability key check';
  END IF;
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE 'availability check failed: some rows may have missing weekday keys. Fix data first.';
END $$;

-- ============================================================
-- END
-- ============================================================

COMMENT ON TABLE public.profiles IS 'User profiles (employers and workers). Schema audit migration 20250204.';
