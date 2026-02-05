-- Payments RLS: enable RLS and add policies so employer/worker can read their payments
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor). If policies already exist, drop them first:
--   DROP POLICY IF EXISTS payments_select_employer_own ON public.payments;
--   DROP POLICY IF EXISTS payments_select_worker_own ON public.payments;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Employer: can select own payments (employer_id = current user)
CREATE POLICY payments_select_employer_own
  ON public.payments
  FOR SELECT
  USING (employer_id = auth.uid());

-- Worker: can select own payments (worker_id = current user)
CREATE POLICY payments_select_worker_own
  ON public.payments
  FOR SELECT
  USING (worker_id = auth.uid());

-- Optional: allow insert for employer (e.g. when creating payment from timesheet)
-- CREATE POLICY payments_insert_employer
--   ON public.payments FOR INSERT WITH CHECK (employer_id = auth.uid());

-- Optional: allow update for employer (e.g. status updates)
-- CREATE POLICY payments_update_employer_own
--   ON public.payments FOR UPDATE USING (employer_id = auth.uid());
