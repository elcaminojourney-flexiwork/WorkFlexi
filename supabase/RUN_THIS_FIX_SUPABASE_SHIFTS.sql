-- =============================================================================
-- FLEXIWORK: TELJES RLS – egy fájl (rekurzió fix + profiles, disputes, timesheets,
--            applications delete, payments, ADMIN) + opcionális teszt shift
-- Futtatás: Supabase Dashboard → SQL Editor → másold be a teljes tartalmat → Run
-- Részletes audit: supabase/RLS_AUDIT_SUMMARY.md
-- =============================================================================

-- ----- RLS FIX (applications / timesheets / shifts – rekurzió megszüntetése) -----
-- (Ugyanaz, mint: supabase/migrations/20250204130000_rls_fix_recursion_definer.sql)

CREATE OR REPLACE FUNCTION public.get_shift_employer_id(p_shift_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT employer_id FROM public.shifts WHERE id = p_shift_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.worker_can_see_internal_shift(p_shift_id uuid, p_worker_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employer_id uuid;
  v_profile    record;
  v_has_app    boolean;
BEGIN
  SELECT employer_id INTO v_employer_id FROM public.shifts WHERE id = p_shift_id LIMIT 1;
  IF v_employer_id IS NULL THEN RETURN false; END IF;

  SELECT user_type, is_blocked, employed_by INTO v_profile
  FROM public.profiles WHERE id = p_worker_id LIMIT 1;

  IF v_profile IS NULL OR v_profile.user_type <> 'worker' OR (v_profile.is_blocked = true) THEN
    RETURN false;
  END IF;

  IF v_profile.employed_by IS NOT NULL AND v_profile.employed_by <> '[]'::jsonb THEN
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_profile.employed_by) AS emp
      WHERE (emp->>'employer_id') = v_employer_id::text
        AND ((emp->>'status') = 'active' OR (emp->>'status') IS NULL)
    ) THEN RETURN true; END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.applications
    WHERE shift_id = p_shift_id AND worker_id = p_worker_id LIMIT 1
  ) INTO v_has_app;
  RETURN v_has_app;
END;
$$;

-- Applications
DROP POLICY IF EXISTS applications_select_employer_via_shift ON public.applications;
CREATE POLICY applications_select_employer_via_shift ON public.applications FOR SELECT
  USING (public.get_shift_employer_id(shift_id) = auth.uid());
DROP POLICY IF EXISTS applications_update_employer_via_shift ON public.applications;
CREATE POLICY applications_update_employer_via_shift ON public.applications FOR UPDATE
  USING (public.get_shift_employer_id(shift_id) = auth.uid());
DROP POLICY IF EXISTS applications_select_worker_own ON public.applications;
CREATE POLICY applications_select_worker_own ON public.applications FOR SELECT USING (worker_id = auth.uid());
DROP POLICY IF EXISTS "applications_update_worker_own" ON public.applications;
CREATE POLICY "applications_update_worker_own" ON public.applications FOR UPDATE USING (worker_id = auth.uid());
DROP POLICY IF EXISTS applications_insert_worker ON public.applications;
CREATE POLICY applications_insert_worker ON public.applications FOR INSERT WITH CHECK (worker_id = auth.uid());

-- Timesheets
DROP POLICY IF EXISTS timesheets_select_employer_via_shift ON public.timesheets;
CREATE POLICY timesheets_select_employer_via_shift ON public.timesheets FOR SELECT
  USING (public.get_shift_employer_id(shift_id) = auth.uid());
DROP POLICY IF EXISTS timesheets_update_employer_via_shift ON public.timesheets;
CREATE POLICY timesheets_update_employer_via_shift ON public.timesheets FOR UPDATE
  USING (public.get_shift_employer_id(shift_id) = auth.uid());
DROP POLICY IF EXISTS timesheets_select_worker_own ON public.timesheets;
CREATE POLICY timesheets_select_worker_own ON public.timesheets FOR SELECT USING (worker_id = auth.uid());
DROP POLICY IF EXISTS timesheets_update_worker_own ON public.timesheets;
CREATE POLICY timesheets_update_worker_own ON public.timesheets FOR UPDATE USING (worker_id = auth.uid());

-- Shifts
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shifts_select_worker_open_shifts" ON public.shifts;
DROP POLICY IF EXISTS "shifts_select_worker_internal_shifts" ON public.shifts;
DROP POLICY IF EXISTS "shifts_select_worker_linked" ON public.shifts;
DROP POLICY IF EXISTS shifts_select_employer_own ON public.shifts;
DROP POLICY IF EXISTS shifts_select_worker_browse ON public.shifts;
DROP POLICY IF EXISTS shifts_select_worker_internal ON public.shifts;
DROP POLICY IF EXISTS "shifts_update_worker_status" ON public.shifts;
DROP POLICY IF EXISTS "shifts_update_employer_own" ON public.shifts;
DROP POLICY IF EXISTS shifts_update_employer_own ON public.shifts;
DROP POLICY IF EXISTS shifts_insert_employer ON public.shifts;
DROP POLICY IF EXISTS shifts_delete_employer_own ON public.shifts;

CREATE POLICY shifts_select_employer_own ON public.shifts FOR SELECT USING (employer_id = auth.uid());
CREATE POLICY shifts_insert_employer ON public.shifts FOR INSERT WITH CHECK (employer_id = auth.uid());
CREATE POLICY shifts_update_employer_own ON public.shifts FOR UPDATE
  USING (employer_id = auth.uid()) WITH CHECK (employer_id = auth.uid());
CREATE POLICY shifts_delete_employer_own ON public.shifts FOR DELETE USING (employer_id = auth.uid());
CREATE POLICY shifts_select_worker_browse ON public.shifts FOR SELECT
  USING (status = 'open' AND visibility IN ('marketplace', 'both'));
CREATE POLICY shifts_select_worker_internal ON public.shifts FOR SELECT
  USING (status = 'open' AND visibility IN ('internal', 'both') AND public.worker_can_see_internal_shift(id, auth.uid()));
CREATE POLICY "shifts_update_worker_status" ON public.shifts FOR UPDATE
  USING ((status = 'open' OR status = 'in_progress') AND EXISTS (SELECT 1 FROM public.timesheets t WHERE t.shift_id = shifts.id AND t.worker_id = auth.uid()))
  WITH CHECK (status = 'in_progress');

GRANT EXECUTE ON FUNCTION public.get_shift_employer_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_shift_employer_id(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.worker_can_see_internal_shift(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.worker_can_see_internal_shift(uuid, uuid) TO service_role;

-- ----- TELJES RENDSZER: profiles, disputes, timesheets INSERT, applications DELETE, payments -----
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_authenticated ON public.profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS disputes_select_employer ON public.disputes;
CREATE POLICY disputes_select_employer ON public.disputes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.timesheets t WHERE t.id = disputes.timesheet_id AND public.get_shift_employer_id(t.shift_id) = auth.uid()));
DROP POLICY IF EXISTS disputes_select_worker ON public.disputes;
CREATE POLICY disputes_select_worker ON public.disputes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.timesheets t WHERE t.id = disputes.timesheet_id AND t.worker_id = auth.uid()));
DROP POLICY IF EXISTS disputes_insert_own ON public.disputes;
CREATE POLICY disputes_insert_own ON public.disputes FOR INSERT TO authenticated WITH CHECK (raised_by = auth.uid());
DROP POLICY IF EXISTS disputes_update_employer ON public.disputes;
CREATE POLICY disputes_update_employer ON public.disputes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.timesheets t WHERE t.id = disputes.timesheet_id AND public.get_shift_employer_id(t.shift_id) = auth.uid()));
DROP POLICY IF EXISTS disputes_update_worker ON public.disputes;
CREATE POLICY disputes_update_worker ON public.disputes FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.timesheets t WHERE t.id = disputes.timesheet_id AND t.worker_id = auth.uid()));

DROP POLICY IF EXISTS timesheets_insert_worker ON public.timesheets;
CREATE POLICY timesheets_insert_worker ON public.timesheets FOR INSERT TO authenticated WITH CHECK (worker_id = auth.uid());

DROP POLICY IF EXISTS applications_delete_worker_own ON public.applications;
CREATE POLICY applications_delete_worker_own ON public.applications FOR DELETE TO authenticated USING (worker_id = auth.uid());

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payments_select_employer_own ON public.payments;
CREATE POLICY payments_select_employer_own ON public.payments FOR SELECT USING (employer_id = auth.uid());
DROP POLICY IF EXISTS payments_select_worker_own ON public.payments;
CREATE POLICY payments_select_worker_own ON public.payments FOR SELECT USING (worker_id = auth.uid());
DROP POLICY IF EXISTS payments_insert_employer ON public.payments;
CREATE POLICY payments_insert_employer ON public.payments FOR INSERT TO authenticated WITH CHECK (employer_id = auth.uid());
DROP POLICY IF EXISTS payments_update_employer_own ON public.payments;
CREATE POLICY payments_update_employer_own ON public.payments FOR UPDATE TO authenticated USING (employer_id = auth.uid()) WITH CHECK (employer_id = auth.uid());

-- ----- ADMIN: user_type = 'admin' láthat minden profilt, frissíthet bármelyiket, és minden payment-et -----
-- Egy admin user: állítsd be a profiles táblában user_type = 'admin' a megfelelő user id-nál.
DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT p.user_type FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1) = 'admin')
  WITH CHECK ((SELECT p.user_type FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1) = 'admin');
DROP POLICY IF EXISTS payments_select_admin ON public.payments;
CREATE POLICY payments_select_admin ON public.payments FOR SELECT TO authenticated
  USING ((SELECT p.user_type FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1) = 'admin');

-- ----- OPCIONÁLIS: teszt shift (location_lat/lng kötelező) -----
INSERT INTO public.shifts (
  employer_id, title, job_title, industry, description,
  shift_date, start_time, end_time, location, location_address, location_lat, location_lng,
  workers_needed, experience_level, hourly_rate, visibility, status
)
SELECT u.id, 'Test shift (SQL)', 'Test shift (SQL)', 'Food & Beverage', 'Test',
  CURRENT_DATE, (CURRENT_DATE + TIME '09:00')::timestamptz, (CURRENT_DATE + TIME '17:00')::timestamptz,
  'Test address', 'Test address', 1.3521, 103.8198, 1, '0-1', 15.00, 'marketplace', 'open'
FROM auth.users u
ORDER BY u.created_at DESC
LIMIT 1;

-- Sikeres futtatás után a Publish Shift és a shift/application lekérdezések működni fognak.
