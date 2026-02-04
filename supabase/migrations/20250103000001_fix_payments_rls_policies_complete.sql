-- Complete fix for payments RLS policies
-- This migration drops ALL existing policies and recreates them with correct permissions

-- Step 1: Drop ALL existing policies on payments table
-- (Dropping all possible policy names to ensure clean slate)
DROP POLICY IF EXISTS "insert_payments_employer_own" ON payments;
DROP POLICY IF EXISTS "update_payments_employer_own" ON payments;
DROP POLICY IF EXISTS "select_payments_employer_or_worker" ON payments;
DROP POLICY IF EXISTS "payments_insert_policy" ON payments;
DROP POLICY IF EXISTS "payments_update_policy" ON payments;
DROP POLICY IF EXISTS "payments_select_policy" ON payments;
DROP POLICY IF EXISTS "payments_insert_employer_own" ON payments;
DROP POLICY IF EXISTS "payments_update_employer_own" ON payments;
DROP POLICY IF EXISTS "payments_select_employer_or_worker" ON payments;

-- Drop any other policies that might exist (catch-all)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'payments' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON payments';
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled and forced
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;

-- Step 3: Create the exact policies as specified

-- Policy a) INSERT – employers can create their own payments
CREATE POLICY "payments_insert_employer_own"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (employer_id = auth.uid());

-- Policy b) UPDATE – employers can update their own payments
CREATE POLICY "payments_update_employer_own"
ON payments
FOR UPDATE
TO authenticated
USING (employer_id = auth.uid())
WITH CHECK (employer_id = auth.uid());

-- Policy c) SELECT – employers and workers can see only their own
CREATE POLICY "payments_select_employer_or_worker"
ON payments
FOR SELECT
TO authenticated
USING (
  employer_id = auth.uid()
  OR worker_id = auth.uid()
);

