-- Allow workers to see all open shifts for browsing
-- This is needed for the browse-shifts page where workers need to see shifts they haven't applied to yet

-- Add policy for workers to SELECT all open shifts (for browsing)
CREATE POLICY "shifts_select_worker_open_shifts"
ON shifts
FOR SELECT
TO authenticated
USING (
  -- Allow workers to see all shifts with status='open'
  -- This enables the browse-shifts functionality
  status = 'open'
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'worker'
  )
);

-- Note: This policy is permissive and will be combined with existing policies using OR
-- Workers can now see:
-- 1. Shifts they're linked to (via existing policy)
-- 2. All open shifts (via this new policy)

