-- Add profile blocking system
-- Workers with average_rating < 3.0 are automatically blocked
-- Blocked workers cannot see shifts, cannot be invited, and show warning on profile

-- ============================================================================
-- PART 1: Add is_blocked column to profiles table
-- ============================================================================

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

COMMENT ON COLUMN profiles.is_blocked IS 'Whether the profile is blocked (rating < 3.0 or manually blocked)';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON profiles(is_blocked) WHERE is_blocked = true;

-- ============================================================================
-- PART 2: Function to automatically block/unblock profiles based on rating
-- ============================================================================

CREATE OR REPLACE FUNCTION update_profile_block_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-block/unblock if average_rating changed (not if is_blocked was manually changed)
  -- Automatically block if average_rating < 3.0 and rating is not NULL
  -- NULL rating means new worker, don't block them
  IF NEW.average_rating IS NOT NULL AND NEW.average_rating < 3.0 THEN
    -- Only auto-block if is_blocked was not explicitly set to false in this update
    -- (If admin manually set is_blocked = false, don't override it)
    IF NEW.is_blocked IS NULL OR NEW.is_blocked = OLD.is_blocked THEN
      NEW.is_blocked = true;
    END IF;
  ELSIF NEW.average_rating IS NOT NULL AND NEW.average_rating >= 3.0 THEN
    -- Auto-unblock if rating is >= 3.0 (only if is_blocked was not manually set)
    IF NEW.is_blocked IS NULL OR NEW.is_blocked = OLD.is_blocked THEN
      NEW.is_blocked = false;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update block status when rating changes
DROP TRIGGER IF EXISTS trigger_update_profile_block_status ON profiles;
CREATE TRIGGER trigger_update_profile_block_status
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.average_rating IS DISTINCT FROM NEW.average_rating)
  EXECUTE FUNCTION update_profile_block_status();

-- ============================================================================
-- PART 3: Backfill: Block existing profiles with rating < 3.0
-- ============================================================================

UPDATE profiles
SET is_blocked = true
WHERE average_rating IS NOT NULL 
  AND average_rating < 3.0 
  AND user_type = 'worker'
  AND (is_blocked = false OR is_blocked IS NULL);

-- ============================================================================
-- PART 4: Update RLS policies to exclude blocked workers
-- ============================================================================

-- Update shifts_select_worker_open_shifts policy to exclude blocked workers
DROP POLICY IF EXISTS "shifts_select_worker_open_shifts" ON shifts;

CREATE POLICY "shifts_select_worker_open_shifts"
ON shifts
FOR SELECT
TO authenticated
USING (
  -- Only for open shifts
  status = 'open'
  AND
  -- Only marketplace or both visibility
  visibility IN ('marketplace', 'both')
  AND
  -- Only for workers (not employers)
  EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'worker'
    AND (profiles.marketplace_enabled = true OR profiles.marketplace_enabled IS NULL)
    AND profiles.is_blocked = false  -- Blocked workers cannot see shifts
    AND
    -- Tiered access logic based on posted_at and worker rating
    (
      -- Case 1: Shift posted less than 3 hours ago - only 5 star workers (rating >= 4.5)
      (
        shifts.posted_at IS NOT NULL
        AND NOW() - shifts.posted_at < INTERVAL '3 hours'
        AND (profiles.average_rating >= 4.5 OR profiles.average_rating IS NULL)
      )
      OR
      -- Case 2: Shift posted 3-6 hours ago - 4+ star workers (rating >= 3.5)
      (
        shifts.posted_at IS NOT NULL
        AND NOW() - shifts.posted_at >= INTERVAL '3 hours'
        AND NOW() - shifts.posted_at < INTERVAL '6 hours'
        AND (profiles.average_rating >= 3.5 OR profiles.average_rating IS NULL)
      )
      OR
      -- Case 3: Shift posted 6+ hours ago - everyone (no rating restriction)
      (
        shifts.posted_at IS NOT NULL
        AND NOW() - shifts.posted_at >= INTERVAL '6 hours'
      )
      OR
      -- Case 4: Fallback for shifts without posted_at (backward compatibility)
      (
        shifts.posted_at IS NULL
        AND shifts.updated_at IS NOT NULL
        AND (
          -- Less than 3 hours - 5 star workers
          (NOW() - shifts.updated_at < INTERVAL '3 hours' AND (profiles.average_rating >= 4.5 OR profiles.average_rating IS NULL))
          OR
          -- 3-6 hours - 4+ star workers
          (NOW() - shifts.updated_at >= INTERVAL '3 hours' AND NOW() - shifts.updated_at < INTERVAL '6 hours' AND (profiles.average_rating >= 3.5 OR profiles.average_rating IS NULL))
          OR
          -- 6+ hours - everyone
          (NOW() - shifts.updated_at >= INTERVAL '6 hours')
        )
      )
    )
  )
);

-- Update shifts_select_worker_internal_shifts policy to exclude blocked workers
DROP POLICY IF EXISTS "shifts_select_worker_internal_shifts" ON shifts;

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
    AND profiles.is_blocked = false  -- Blocked workers cannot see shifts
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
-- Blocking System:
-- - Workers with average_rating < 3.0 are automatically blocked
-- - Blocked workers cannot see shifts (RLS policy excludes them)
-- - Blocked workers cannot be invited by employers
-- - Blocked profile shows red warning on profile page
-- - Admin can manually unblock profiles
-- - Admin can manually adjust ratings
