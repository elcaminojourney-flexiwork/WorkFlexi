-- Disable RLS for invoices table (for testing - invoices are read-only accounting records)
-- Keep RLS enabled for payments table (secure financial data)

-- Step 1: Drop all existing RLS policies on invoices
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'invoices' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON invoices';
    END LOOP;
END $$;

-- Step 2: Disable RLS on invoices table
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- Note: Payments table keeps RLS enabled with secure policies
-- This allows:
-- - Employers to create/update their own payments
-- - Employers and workers to view their own payments
-- - Invoices can be created/read by anyone (for accounting records)

