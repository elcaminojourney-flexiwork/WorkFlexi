-- =============================================================================
-- FLEXIWORK: Teljes rendszer RLS – profiles, disputes, timesheets INSERT,
--            applications DELETE, payments INSERT/UPDATE
-- Futtatás: a 20250204130000_rls_fix_recursion_definer.sql UTÁN (get_shift_employer_id kell).
--
-- Rendszer szintű lefedettség (20250204130000 + ez a fájl):
--   profiles      – SELECT (saját + authenticated), UPDATE/INSERT saját
--   shifts        – employer CRUD, worker browse/internal, worker status update
--   applications  – employer SELECT/UPDATE via shift, worker SELECT/UPDATE/INSERT/DELETE
--   timesheets    – employer SELECT/UPDATE via shift, worker SELECT/UPDATE/INSERT
--   payments      – employer SELECT/INSERT/UPDATE, worker SELECT
--   disputes      – employer SELECT/UPDATE via timesheet, worker SELECT/UPDATE/INSERT
--   reviews       – (már korábbi migráció) public/own/about_me, insert/update own
--   favorites     – (már korábbi migráció) employer CRUD, worker SELECT
--   notifications / notification_preferences – (korábbi migráció)
--   organisations / venues / roles / rota – (rota_module migráció)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROFILES – RLS + policy-k (saját + mások olvasása joinokhoz / listákhoz)
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Authenticated users can read other profiles (shifts+profiles join, worker list, employer name)
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_authenticated ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- -----------------------------------------------------------------------------
-- 2. DISPUTES – RLS (employer via timesheet->shift, worker via timesheet)
-- -----------------------------------------------------------------------------

ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS disputes_select_employer ON public.disputes;
CREATE POLICY disputes_select_employer ON public.disputes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      WHERE t.id = disputes.timesheet_id
        AND public.get_shift_employer_id(t.shift_id) = auth.uid()
    )
  );

DROP POLICY IF EXISTS disputes_select_worker ON public.disputes;
CREATE POLICY disputes_select_worker ON public.disputes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      WHERE t.id = disputes.timesheet_id AND t.worker_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS disputes_insert_own ON public.disputes;
CREATE POLICY disputes_insert_own ON public.disputes
  FOR INSERT TO authenticated
  WITH CHECK (raised_by = auth.uid());

DROP POLICY IF EXISTS disputes_update_employer ON public.disputes;
CREATE POLICY disputes_update_employer ON public.disputes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      WHERE t.id = disputes.timesheet_id
        AND public.get_shift_employer_id(t.shift_id) = auth.uid()
    )
  );

DROP POLICY IF EXISTS disputes_update_worker ON public.disputes;
CREATE POLICY disputes_update_worker ON public.disputes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.timesheets t
      WHERE t.id = disputes.timesheet_id AND t.worker_id = auth.uid()
    )
  );

-- -----------------------------------------------------------------------------
-- 3. TIMESHEETS – INSERT (worker clock-in)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS timesheets_insert_worker ON public.timesheets;
CREATE POLICY timesheets_insert_worker ON public.timesheets
  FOR INSERT TO authenticated
  WITH CHECK (worker_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 4. APPLICATIONS – DELETE (worker withdraw)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS applications_delete_worker_own ON public.applications;
CREATE POLICY applications_delete_worker_own ON public.applications
  FOR DELETE TO authenticated
  USING (worker_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 5. PAYMENTS – INSERT + UPDATE (employer create/update payment)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS payments_insert_employer ON public.payments;
CREATE POLICY payments_insert_employer ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (employer_id = auth.uid());

DROP POLICY IF EXISTS payments_update_employer_own ON public.payments;
CREATE POLICY payments_update_employer_own ON public.payments
  FOR UPDATE TO authenticated
  USING (employer_id = auth.uid())
  WITH CHECK (employer_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 6. ADMIN – user_type = 'admin' can update any profile and select all payments
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_update_admin ON public.profiles;
CREATE POLICY profiles_update_admin ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT p.user_type FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1) = 'admin')
  WITH CHECK ((SELECT p.user_type FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1) = 'admin');

DROP POLICY IF EXISTS payments_select_admin ON public.payments;
CREATE POLICY payments_select_admin ON public.payments
  FOR SELECT TO authenticated
  USING ((SELECT p.user_type FROM public.profiles p WHERE p.id = auth.uid() LIMIT 1) = 'admin');
