-- Fix RLS SELECT policies for shifts table
-- This ensures workers can view shifts they're linked to via applications, timesheets, or payments
-- and employers can view their own shifts

-- Step 1: Drop existing SELECT policies on shifts table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'shifts' 
        AND schemaname = 'public'
        AND cmd = 'SELECT'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON shifts';
    END LOOP;
END $$;

-- Step 2: Create policy for employers to SELECT their own shifts
CREATE POLICY "shifts_select_employer_own"
ON shifts
FOR SELECT
TO authenticated
USING (employer_id = auth.uid());

-- Step 3: Create policy for workers to SELECT shifts they're linked to
-- Workers can see shifts if they have:
-- - An application for the shift (any status)
-- - A timesheet for the shift
-- - A payment for the shift
CREATE POLICY "shifts_select_worker_linked"
ON shifts
FOR SELECT
TO authenticated
USING (
  -- Worker has an application for this shift
  EXISTS (
    SELECT 1
    FROM applications
    WHERE applications.shift_id = shifts.id
    AND applications.worker_id = auth.uid()
  )
  OR
  -- Worker has a timesheet for this shift
  EXISTS (
    SELECT 1
    FROM timesheets
    WHERE timesheets.shift_id = shifts.id
    AND timesheets.worker_id = auth.uid()
  )
  OR
  -- Worker has a payment for this shift
  EXISTS (
    SELECT 1
    FROM payments
    WHERE payments.shift_id = shifts.id
    AND payments.worker_id = auth.uid()
  )
);

-- Note: These policies are permissive, so they're combined with OR
-- This means a user can see a shift if EITHER policy allows it
-- - Employers can see their own shifts
-- - Workers can see shifts they're linked to via applications/timesheets/payments

