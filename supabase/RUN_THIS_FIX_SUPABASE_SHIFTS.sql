-- =============================================================================
-- FLEXIWORK: Egy fájl – RLS javítások + opcionális teszt shift (UUID nélkül)
-- Futtatás: Supabase Dashboard → SQL Editor → másold be a teljes tartalmat → Run
-- =============================================================================

-- ----- 1. APPLICATIONS + TIMESHEETS (500 fix) -----
DROP POLICY IF EXISTS applications_select_employer_via_shift ON public.applications;
CREATE POLICY applications_select_employer_via_shift ON public.applications
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.shifts s WHERE s.id = shift_id AND s.employer_id = auth.uid())
  );

DROP POLICY IF EXISTS applications_update_employer_via_shift ON public.applications;
CREATE POLICY applications_update_employer_via_shift ON public.applications
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.shifts s WHERE s.id = shift_id AND s.employer_id = auth.uid())
  );

DROP POLICY IF EXISTS timesheets_select_employer_via_shift ON public.timesheets;
CREATE POLICY timesheets_select_employer_via_shift ON public.timesheets
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.shifts s WHERE s.id = shift_id AND s.employer_id = auth.uid())
  );

DROP POLICY IF EXISTS timesheets_update_employer_via_shift ON public.timesheets;
CREATE POLICY timesheets_update_employer_via_shift ON public.timesheets
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.shifts s WHERE s.id = shift_id AND s.employer_id = auth.uid())
  );

-- ----- 2. SHIFTS RLS (POST /shifts 500 – Publish Shift) -----
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shifts_select_employer_own ON public.shifts;
CREATE POLICY shifts_select_employer_own ON public.shifts
  FOR SELECT
  USING (employer_id = auth.uid());

DROP POLICY IF EXISTS shifts_select_worker_browse ON public.shifts;
CREATE POLICY shifts_select_worker_browse ON public.shifts
  FOR SELECT
  USING (status = 'open' AND visibility IN ('marketplace', 'both'));

DROP POLICY IF EXISTS shifts_insert_employer ON public.shifts;
CREATE POLICY shifts_insert_employer ON public.shifts
  FOR INSERT
  WITH CHECK (employer_id = auth.uid());

DROP POLICY IF EXISTS shifts_update_employer_own ON public.shifts;
CREATE POLICY shifts_update_employer_own ON public.shifts
  FOR UPDATE
  USING (employer_id = auth.uid());

DROP POLICY IF EXISTS shifts_delete_employer_own ON public.shifts;
CREATE POLICY shifts_delete_employer_own ON public.shifts
  FOR DELETE
  USING (employer_id = auth.uid());

-- ----- 3. TESZT SHIFT (location_lat/lng NOT NULL a shifts táblában – kötelező) -----
INSERT INTO public.shifts (
  employer_id,
  title,
  job_title,
  industry,
  description,
  shift_date,
  start_time,
  end_time,
  location,
  location_address,
  location_lat,
  location_lng,
  workers_needed,
  experience_level,
  hourly_rate,
  visibility,
  status
)
SELECT
  u.id,
  'Test shift (SQL)',
  'Test shift (SQL)',
  'Food & Beverage',
  'Test',
  CURRENT_DATE,
  (CURRENT_DATE + TIME '09:00')::timestamptz,
  (CURRENT_DATE + TIME '17:00')::timestamptz,
  'Test address',
  'Test address',
  1.3521,
  103.8198,
  1,
  '0-1',
  15.00,
  'marketplace',
  'open'
FROM auth.users u
ORDER BY u.created_at DESC
LIMIT 1;

-- Sikeres futtatás után próbáld a Publish Shift-et az alkalmazásban.
