-- Add tiered access system for shifts
-- Shifts are first visible to 5-star workers (0-3 hours),
-- then 4+ star workers (3-6 hours),
-- then everyone (6+ hours)

-- ============================================================================
-- PART 1: Add posted_at column to shifts table
-- ============================================================================

ALTER TABLE shifts 
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

COMMENT ON COLUMN shifts.posted_at IS 'Timestamp when shift status changed to open (for tiered access calculation)';

-- ============================================================================
-- PART 2: Create trigger function to set posted_at when shift becomes open
-- ============================================================================

CREATE OR REPLACE FUNCTION set_shift_posted_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Set posted_at when status changes to 'open' (and posted_at is NULL)
  IF NEW.status = 'open' AND (OLD.status IS NULL OR OLD.status != 'open') AND NEW.posted_at IS NULL THEN
    NEW.posted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set posted_at
DROP TRIGGER IF EXISTS trigger_set_shift_posted_at ON shifts;
CREATE TRIGGER trigger_set_shift_posted_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION set_shift_posted_at();

-- Also handle INSERT case (for shifts created directly as 'open')
CREATE OR REPLACE FUNCTION set_shift_posted_at_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'open' AND NEW.posted_at IS NULL THEN
    NEW.posted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_shift_posted_at_on_insert ON shifts;
CREATE TRIGGER trigger_set_shift_posted_at_on_insert
  BEFORE INSERT ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION set_shift_posted_at_on_insert();

-- ============================================================================
-- PART 3: Backfill posted_at for existing open shifts
-- ============================================================================

UPDATE shifts 
SET posted_at = COALESCE(updated_at, created_at, NOW())
WHERE status = 'open' AND posted_at IS NULL;

-- ============================================================================
-- PART 4: Update RLS policy with tiered access logic
-- ============================================================================

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

-- ============================================================================
-- Notes:
-- ============================================================================
-- 
-- Tiered Access System:
-- - 0-3 hours: Only 5-star workers (average_rating >= 4.5)
-- - 3-6 hours: 4+ star workers (average_rating >= 3.5)
-- - 6+ hours: Everyone (no rating restriction)
-- 
-- Workers with NULL average_rating are treated as 5-star (new workers get priority)
-- This encourages new workers to join and build their reputation
