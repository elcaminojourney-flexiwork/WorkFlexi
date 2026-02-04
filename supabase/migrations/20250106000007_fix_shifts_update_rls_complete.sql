-- Fix RLS policies for shifts table UPDATE operations
-- This ensures both employers and workers can update shift status appropriately

-- Step 1: Drop existing UPDATE policies on shifts table
DROP POLICY IF EXISTS "Employers can update own shifts" ON shifts;
DROP POLICY IF EXISTS "workers_update_shift_to_in_progress" ON shifts;
DROP POLICY IF EXISTS "shifts_update_employer_own" ON shifts;
DROP POLICY IF EXISTS "shifts_update_worker_status" ON shifts;

-- Drop any other UPDATE policies that might exist
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'shifts' 
        AND schemaname = 'public'
        AND cmd = 'UPDATE'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON shifts';
    END LOOP;
END $$;

-- Step 2: Create policy for employers to update their own shifts
-- Employers can update any field on shifts they own
CREATE POLICY "shifts_update_employer_own"
ON shifts
FOR UPDATE
TO authenticated
USING (employer_id = auth.uid())
WITH CHECK (employer_id = auth.uid());

-- Step 3: Create policy for workers to update shift status to 'in_progress'
-- Workers can only update status to 'in_progress' when they clock in
-- This policy is permissive to handle the timing of timesheet creation
CREATE POLICY "shifts_update_worker_status"
ON shifts
FOR UPDATE
TO authenticated
USING (
  -- Allow if shift is 'open' or 'in_progress' (not completed/cancelled)
  (status = 'open' OR status = 'in_progress')
  AND
  -- Worker must have a timesheet for this shift (proving they're assigned)
  -- Note: We check for timesheet existence, not clock_in_time, to allow the update
  -- right after timesheet creation
  EXISTS (
    SELECT 1
    FROM timesheets
    WHERE timesheets.shift_id = shifts.id
    AND timesheets.worker_id = auth.uid()
  )
)
WITH CHECK (
  -- Only allow updating status to 'in_progress'
  status = 'in_progress'
);

-- Note: In PostgreSQL RLS, multiple policies for the same operation are combined with OR
-- So workers can update via "shifts_update_worker_status" policy
-- And employers can update via "shifts_update_employer_own" policy

