-- Fix applications (and timesheets) RLS policies: use unqualified column names
-- in USING to avoid 500 Internal Server Error on Supabase REST API.
-- Run in Supabase SQL Editor if you get 500 on applications/shifts queries.

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
