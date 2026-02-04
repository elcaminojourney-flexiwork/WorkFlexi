-- Allow workers to update shift status to 'in_progress' when they clock in
-- This is the minimal, safest RLS policy for workers to update shift status

-- Ensure RLS is enabled on shifts table
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Policy: Allow workers to update shift status to 'in_progress' if:
-- 1. The shift currently has status 'open'
-- 2. The worker has a timesheet for that shift (proving they're assigned)
-- This prevents workers from modifying shifts they're not assigned to
CREATE POLICY "workers_update_shift_to_in_progress"
ON shifts
FOR UPDATE
TO authenticated
USING (
  -- Only allow if shift is currently 'open'
  status = 'open'
  AND
  -- Only allow if worker has a timesheet for this shift
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
  )
);

