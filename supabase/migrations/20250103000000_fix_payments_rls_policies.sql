-- Fix RLS policies for payments table
-- This migration ensures employers can create escrow payments and workers can view their payments

-- Enable RLS on payments table (if not already enabled)
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on payments table to avoid duplicates
-- (Using IF EXISTS to avoid errors if policies don't exist)
DROP POLICY IF EXISTS "insert_payments_employer_own" ON payments;
DROP POLICY IF EXISTS "update_payments_employer_own" ON payments;
DROP POLICY IF EXISTS "select_payments_employer_or_worker" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
DROP POLICY IF EXISTS "payments_update_policy" ON payments;
DROP POLICY IF EXISTS "payments_select_policy" ON payments;

-- Policy 1: Allow employers to INSERT payments where they are the employer
-- This is used when createEscrowForShift() creates a payment record
CREATE POLICY "insert_payments_employer_own"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (employer_id = auth.uid());

-- Policy 2: Allow employers to UPDATE their own payments
-- This is used when finalizePaymentForTimesheet() updates payment status and amounts
CREATE POLICY "update_payments_employer_own"
ON payments
FOR UPDATE
TO authenticated
USING (employer_id = auth.uid())
WITH CHECK (employer_id = auth.uid());

-- Policy 3: Allow employers and workers to SELECT payments relevant to them
-- Employers can see payments where they are the employer
-- Workers can see payments where they are the worker (after assignment)
-- This is used in:
--   - Employer payments list screen
--   - Worker earnings screen
--   - Admin revenue screen (if admin role exists, may need separate policy)
CREATE POLICY "select_payments_employer_or_worker"
ON payments
FOR SELECT
TO authenticated
USING (
  employer_id = auth.uid()
  OR worker_id = auth.uid()
);

