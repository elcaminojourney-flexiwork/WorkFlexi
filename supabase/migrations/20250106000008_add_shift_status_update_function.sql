-- Fix shift status update by using a database function
-- This ensures the timesheet update and shift update happen in the same transaction context
-- and bypasses RLS timing issues

-- Step 1: Create a function that updates shift status to 'in_progress'
-- This function uses SECURITY DEFINER to bypass RLS, but still validates:
-- 1. That a timesheet exists for the worker
-- 2. That the shift status is 'open' or 'in_progress'
-- 3. That the employer_id matches (security check)
CREATE OR REPLACE FUNCTION update_shift_status_to_in_progress(
  p_shift_id uuid,
  p_worker_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify that a timesheet exists for this worker and shift
  IF NOT EXISTS (
    SELECT 1
    FROM timesheets
    WHERE shift_id = p_shift_id
    AND worker_id = p_worker_id
  ) THEN
    RAISE EXCEPTION 'No timesheet found for this worker and shift';
  END IF;

  -- Update the shift status
  UPDATE shifts
  SET status = 'in_progress'
  WHERE id = p_shift_id
    AND (status = 'open' OR status = 'in_progress')
    AND employer_id IN (
      SELECT employer_id
      FROM timesheets
      WHERE shift_id = p_shift_id
      AND worker_id = p_worker_id
      LIMIT 1
    );

  -- Verify the update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update shift status. Shift may not exist or be in invalid state.';
  END IF;
END;
$$;

-- Step 2: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_shift_status_to_in_progress(uuid, uuid) TO authenticated;

-- Note: This function uses SECURITY DEFINER, which means it runs with the privileges
-- of the function owner (postgres), bypassing RLS. However, we still check:
-- 1. That a timesheet exists for the worker
-- 2. That the shift status is 'open' or 'in_progress'
-- 3. That the employer_id matches (security check)

