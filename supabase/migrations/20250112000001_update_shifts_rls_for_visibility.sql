-- Update RLS policies for shifts table to respect visibility column
-- This migration updates existing policies to filter shifts by visibility
-- Existing functionality remains unchanged - all existing shifts default to 'marketplace' visibility

-- ============================================================================
-- PART 1: Update shifts_select_worker_open_shifts policy to respect visibility
-- ============================================================================

-- Drop the existing policy (we'll recreate it with visibility checks)
DROP POLICY IF EXISTS "shifts_select_worker_open_shifts" ON shifts;

-- Recreate policy for workers to SELECT open marketplace/both shifts
-- Only marketplace-enabled workers can see marketplace/both shifts
CREATE POLICY "shifts_select_worker_open_shifts"
ON shifts
FOR SELECT
TO authenticated
USING (
  -- Only for open shifts
  status = 'open'
  AND
  -- Only marketplace or both visibility (internal shifts handled separately)
  visibility IN ('marketplace', 'both')
  AND
  -- Only for workers (not employers)
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'worker'
    -- Worker must have marketplace enabled
    AND (profiles.marketplace_enabled = true OR profiles.marketplace_enabled IS NULL)
  )
);

-- ============================================================================
-- PART 2: Add policy for workers to see internal shifts from their employers
-- ============================================================================

-- Policy for workers to see internal/both shifts from employers they work for
-- This uses JSONB querying to check employed_by array
CREATE POLICY "shifts_select_worker_internal_shifts"
ON shifts
FOR SELECT
TO authenticated
USING (
  -- Only for open shifts
  status = 'open'
  AND
  -- Only internal or both visibility
  visibility IN ('internal', 'both')
  AND
  -- Only for workers (not employers)
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'worker'
    -- Worker must be employed by this shift's employer
    AND (
      -- Check if employer_id is in employed_by array (any status)
      EXISTS (
        SELECT 1
        FROM jsonb_array_elements(profiles.employed_by) AS emp
        WHERE emp->>'employer_id' = shifts.employer_id::text
        -- Only active employments
        AND (emp->>'status' = 'active' OR emp->>'status' IS NULL)
      )
      OR
      -- Also allow if employed_by is empty array but worker has applications/timesheets
      -- (fallback for workers linked via applications)
      (
        (profiles.employed_by = '[]'::jsonb OR profiles.employed_by IS NULL)
        AND EXISTS (
          SELECT 1
          FROM applications
          WHERE applications.shift_id = shifts.id
          AND applications.worker_id = auth.uid()
        )
      )
    )
  )
);

-- ============================================================================
-- Notes:
-- ============================================================================
-- 
-- Policy behavior:
-- 1. shifts_select_employer_own: Employers see all their shifts (unchanged)
-- 2. shifts_select_worker_linked: Workers see shifts they're linked to (unchanged - for applications/timesheets)
-- 3. shifts_select_worker_open_shifts: Marketplace workers see open marketplace/both shifts
-- 4. shifts_select_worker_internal_shifts: Workers see internal/both shifts from their employers
--
-- For 'both' visibility shifts:
-- - Marketplace workers can see them (via shifts_select_worker_open_shifts)
-- - Employees can see them (via shifts_select_worker_internal_shifts)
-- - This is correct - 'both' means both types can see it
--
-- Existing functionality preserved:
-- - All existing shifts have visibility='marketplace' (default)
-- - All existing workers have marketplace_enabled=true (default)
-- - All existing policies still work (we added new ones, didn't remove old ones)
