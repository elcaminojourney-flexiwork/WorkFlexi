-- Shifts RLS: enable RLS and allow employer to INSERT (fixes POST /shifts 500 when publishing shift).
-- Run in Supabase SQL Editor if "Publish Shift" returns 500.

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
