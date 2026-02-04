-- Allow workers to update their own applications (for withdrawing)
-- This enables workers to withdraw their pending applications

-- Check if RLS is enabled
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "applications_update_worker_own" ON applications;

-- Create policy for workers to UPDATE their own applications
-- Workers can only update applications where they are the worker_id
-- This allows withdrawing applications (changing status to 'withdrawn')
CREATE POLICY "applications_update_worker_own"
ON applications
FOR UPDATE
TO authenticated
USING (
  -- Worker can update their own applications
  worker_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'worker'
  )
)
WITH CHECK (
  -- Ensure they can only update their own applications
  worker_id = auth.uid()
);

-- Note: Employers already have UPDATE policies for accepting/rejecting applications
-- This policy specifically allows workers to withdraw their applications

