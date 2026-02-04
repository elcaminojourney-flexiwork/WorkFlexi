-- Fix RLS policy to allow workers to update shift status to 'in_progress'
-- This policy allows workers to update shift status when they clock in

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "workers_update_shift_to_in_progress" ON shifts;

-- Create updated policy that allows workers to update shift status to 'in_progress'
-- Conditions:
-- 1. Worker has a timesheet for this shift with clock_in_time (proving they're assigned and clocked in)
-- 2. Shift status is 'open' OR already 'in_progress' (allows re-clocking in)
-- 3. Can only update status to 'in_progress' (prevents other status changes)
CREATE POLICY "workers_update_shift_to_in_progress"
ON shifts
FOR UPDATE
TO authenticated
USING (
  -- Allow if shift is 'open' or 'in_progress' (not completed/cancelled)
  (status = 'open' OR status = 'in_progress')
  AND
  -- Only allow if worker has a timesheet for this shift with clock_in_time
  EXISTS (
    SELECT 1
    FROM timesheets
    WHERE timesheets.shift_id = shifts.id
    AND timesheets.worker_id = auth.uid()
    AND timesheets.clock_in_time IS NOT NULL
  )
)
WITH CHECK (
  -- Only allow updating status to 'in_progress'
  status = 'in_progress'
  AND
  -- Ensure worker still has a timesheet (defensive check)
  EXISTS (
    SELECT 1
    FROM timesheets
    WHERE timesheets.shift_id = shifts.id
    AND timesheets.worker_id = auth.uid()
    AND timesheets.clock_in_time IS NOT NULL
  )
);

