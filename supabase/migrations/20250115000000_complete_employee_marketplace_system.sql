-- ============================================================================
-- COMPLETE SQL FOR EMPLOYEE & MARKETPLACE SYSTEM
-- ============================================================================
-- This migration combines all necessary changes for:
-- 1. Employee registration and team management
-- 2. Marketplace access control (visibility: internal, marketplace, both)
-- 3. Worker KYC upgrade (employee → marketplace access)
-- 4. Tiered access system (rating-based shift visibility)
-- 5. Profile blocking system (auto-block low-rated workers)
-- 6. File uploads (profile photos, CVs)
-- ============================================================================

-- ============================================================================
-- PART 1: Update onboarding_type to support 'both' (for KYC upgrade)
-- ============================================================================

-- Drop existing constraint
ALTER TABLE profiles 
  DROP CONSTRAINT IF EXISTS profiles_onboarding_type_check;

-- Add new constraint with 'both' option
ALTER TABLE profiles 
  ADD CONSTRAINT profiles_onboarding_type_check 
    CHECK (onboarding_type IS NULL OR onboarding_type IN ('employee', 'marketplace', 'both'));

-- Update comment
COMMENT ON COLUMN profiles.onboarding_type IS 'How worker was onboarded: employee (invite code), marketplace (standard onboarding), or both (upgraded from employee)';

-- ============================================================================
-- PART 2: Ensure all required columns exist (backward compatible)
-- ============================================================================

-- Profiles table columns
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'marketplace'
    CHECK (subscription_tier IS NULL OR subscription_tier IN ('saas_only', 'marketplace', 'both'));

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{"marketplace": true, "scheduling": true, "payroll": false, "training": false}'::jsonb;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN DEFAULT true;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS onboarding_type VARCHAR(20) DEFAULT 'marketplace'
    CHECK (onboarding_type IS NULL OR onboarding_type IN ('employee', 'marketplace', 'both'));

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS employed_by JSONB DEFAULT '[]'::jsonb;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS cv_url TEXT;

-- Shifts table columns
ALTER TABLE shifts 
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'marketplace'
    CHECK (visibility IN ('internal', 'marketplace', 'both'));

ALTER TABLE shifts 
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

-- ============================================================================
-- PART 3: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier) WHERE subscription_tier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_marketplace_enabled ON profiles(marketplace_enabled) WHERE marketplace_enabled = true;
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding_type ON profiles(onboarding_type) WHERE onboarding_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON profiles(is_blocked) WHERE is_blocked = true;
CREATE INDEX IF NOT EXISTS idx_shifts_visibility ON shifts(visibility);
CREATE INDEX IF NOT EXISTS idx_shifts_visibility_status ON shifts(visibility, status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_shifts_posted_at ON shifts(posted_at) WHERE posted_at IS NOT NULL;

-- ============================================================================
-- PART 4: Trigger functions for posted_at and blocking
-- ============================================================================

-- Function to set posted_at when shift becomes open
CREATE OR REPLACE FUNCTION set_shift_posted_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'open' AND (OLD.status IS NULL OR OLD.status != 'open') AND NEW.posted_at IS NULL THEN
    NEW.posted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_shift_posted_at_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'open' AND NEW.posted_at IS NULL THEN
    NEW.posted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically block/unblock profiles based on rating
CREATE OR REPLACE FUNCTION update_profile_block_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.average_rating IS NOT NULL AND NEW.average_rating < 3.0 THEN
    IF NEW.is_blocked IS NULL OR NEW.is_blocked = OLD.is_blocked THEN
      NEW.is_blocked = true;
    END IF;
  ELSIF NEW.average_rating IS NOT NULL AND NEW.average_rating >= 3.0 THEN
    IF NEW.is_blocked IS NULL OR NEW.is_blocked = OLD.is_blocked THEN
      NEW.is_blocked = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: Create triggers
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_set_shift_posted_at ON shifts;
CREATE TRIGGER trigger_set_shift_posted_at
  BEFORE UPDATE ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION set_shift_posted_at();

DROP TRIGGER IF EXISTS trigger_set_shift_posted_at_on_insert ON shifts;
CREATE TRIGGER trigger_set_shift_posted_at_on_insert
  BEFORE INSERT ON shifts
  FOR EACH ROW
  EXECUTE FUNCTION set_shift_posted_at_on_insert();

DROP TRIGGER IF EXISTS trigger_update_profile_block_status ON profiles;
CREATE TRIGGER trigger_update_profile_block_status
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.average_rating IS DISTINCT FROM NEW.average_rating)
  EXECUTE FUNCTION update_profile_block_status();

-- ============================================================================
-- PART 6: Backfill data
-- ============================================================================

-- Backfill posted_at for existing open shifts
UPDATE shifts 
SET posted_at = COALESCE(updated_at, created_at, NOW())
WHERE status = 'open' AND posted_at IS NULL;

-- Backfill is_blocked for existing profiles with low ratings
UPDATE profiles
SET is_blocked = true
WHERE average_rating IS NOT NULL 
  AND average_rating < 3.0 
  AND user_type = 'worker'
  AND (is_blocked = false OR is_blocked IS NULL);

-- ============================================================================
-- PART 7: RLS Policies for shifts (with tiered access and blocking)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "shifts_select_worker_open_shifts" ON shifts;
DROP POLICY IF EXISTS "shifts_select_worker_internal_shifts" ON shifts;

-- Policy for marketplace workers to see open marketplace/both shifts (with tiered access)
CREATE POLICY "shifts_select_worker_open_shifts"
ON shifts
FOR SELECT
TO authenticated
USING (
  status = 'open'
  AND visibility IN ('marketplace', 'both')
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'worker'
    AND (profiles.marketplace_enabled = true OR profiles.marketplace_enabled IS NULL)
    AND profiles.is_blocked = false
    AND (
      -- Tiered access: 0-3 hours - 5 star workers (rating >= 4.5)
      (
        shifts.posted_at IS NOT NULL
        AND NOW() - shifts.posted_at < INTERVAL '3 hours'
        AND (profiles.average_rating >= 4.5 OR profiles.average_rating IS NULL)
      )
      OR
      -- Tiered access: 3-6 hours - 4+ star workers (rating >= 3.5)
      (
        shifts.posted_at IS NOT NULL
        AND NOW() - shifts.posted_at >= INTERVAL '3 hours'
        AND NOW() - shifts.posted_at < INTERVAL '6 hours'
        AND (profiles.average_rating >= 3.5 OR profiles.average_rating IS NULL)
      )
      OR
      -- Tiered access: 6+ hours - everyone
      (
        shifts.posted_at IS NOT NULL
        AND NOW() - shifts.posted_at >= INTERVAL '6 hours'
      )
      OR
      -- Fallback for shifts without posted_at
      (
        shifts.posted_at IS NULL
        AND shifts.updated_at IS NOT NULL
        AND (
          (NOW() - shifts.updated_at < INTERVAL '3 hours' AND (profiles.average_rating >= 4.5 OR profiles.average_rating IS NULL))
          OR
          (NOW() - shifts.updated_at >= INTERVAL '3 hours' AND NOW() - shifts.updated_at < INTERVAL '6 hours' AND (profiles.average_rating >= 3.5 OR profiles.average_rating IS NULL))
          OR
          (NOW() - shifts.updated_at >= INTERVAL '6 hours')
        )
      )
    )
  )
);

-- Policy for workers to see internal/both shifts from their employers
CREATE POLICY "shifts_select_worker_internal_shifts"
ON shifts
FOR SELECT
TO authenticated
USING (
  status = 'open'
  AND visibility IN ('internal', 'both')
  AND EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'worker'
    AND profiles.is_blocked = false
    AND (
      -- Check if employer_id is in employed_by array
      EXISTS (
        SELECT 1
        FROM jsonb_array_elements(profiles.employed_by) AS emp
        WHERE emp->>'employer_id' = shifts.employer_id::text
        AND (emp->>'status' = 'active' OR emp->>'status' IS NULL)
      )
      OR
      -- Fallback for workers linked via applications
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
-- PART 8: Storage policies for file uploads
-- ============================================================================

-- Note: Storage buckets must be created manually in Supabase Dashboard:
-- - employer-profiles (public: true)
-- - employer-documents (public: false)
-- - worker-profiles (public: true)

-- Employer profile photos
DROP POLICY IF EXISTS "Employers can upload their own profile photos" ON storage.objects;
CREATE POLICY "Employers can upload their own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employer-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Employers can update their own profile photos" ON storage.objects;
CREATE POLICY "Employers can update their own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employer-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Employers can delete their own profile photos" ON storage.objects;
CREATE POLICY "Employers can delete their own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'employer-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
CREATE POLICY "Anyone can view profile photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'employer-profiles');

-- Employer documents
DROP POLICY IF EXISTS "Employers can upload their own documents" ON storage.objects;
CREATE POLICY "Employers can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'employer-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Employers can update their own documents" ON storage.objects;
CREATE POLICY "Employers can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'employer-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Employers can delete their own documents" ON storage.objects;
CREATE POLICY "Employers can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'employer-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Employers can view their own documents" ON storage.objects;
CREATE POLICY "Employers can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'employer-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Worker profile photos
DROP POLICY IF EXISTS "Workers can upload their own profile photos" ON storage.objects;
CREATE POLICY "Workers can upload their own profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'worker-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Workers can update their own profile photos" ON storage.objects;
CREATE POLICY "Workers can update their own profile photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'worker-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Workers can delete their own profile photos" ON storage.objects;
CREATE POLICY "Workers can delete their own profile photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'worker-profiles' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Anyone can view worker profile photos" ON storage.objects;
CREATE POLICY "Anyone can view worker profile photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'worker-profiles');

-- ============================================================================
-- PART 9: Comments for documentation
-- ============================================================================

COMMENT ON COLUMN profiles.subscription_tier IS 'Employer subscription tier: saas_only (internal only), marketplace (marketplace only), both (hybrid)';
COMMENT ON COLUMN profiles.features IS 'JSONB feature flags for employers: marketplace, scheduling, payroll, training';
COMMENT ON COLUMN profiles.marketplace_enabled IS 'Whether worker can access marketplace features';
COMMENT ON COLUMN profiles.onboarding_type IS 'How worker was onboarded: employee (invite code), marketplace (standard onboarding), or both (upgraded from employee)';
COMMENT ON COLUMN profiles.employed_by IS 'Array of employers this worker is employed by: [{"employer_id": "uuid", "role": "text", "status": "active|inactive", "team": "text", "added_at": "timestamp"}]';
COMMENT ON COLUMN profiles.is_blocked IS 'Whether the profile is blocked (rating < 3.0 or manually blocked)';
COMMENT ON COLUMN shifts.visibility IS 'Shift visibility: internal (employer workers only), marketplace (all marketplace workers), both (hybrid)';
COMMENT ON COLUMN shifts.posted_at IS 'Timestamp when shift status changed to open (for tiered access calculation)';

-- ============================================================================
-- VERIFICATION QUERIES (uncomment to verify)
-- ============================================================================

-- Verify columns
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
--   AND column_name IN ('subscription_tier', 'marketplace_enabled', 'onboarding_type', 'employed_by', 'is_blocked', 'profile_photo_url', 'cv_url')
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'shifts' 
--   AND column_name IN ('visibility', 'posted_at')
-- ORDER BY ordinal_position;

-- Verify indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('profiles', 'shifts')
--   AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;

-- Verify triggers
-- SELECT trigger_name, event_manipulation, event_object_table, action_statement
-- FROM information_schema.triggers
-- WHERE event_object_table IN ('profiles', 'shifts')
-- ORDER BY event_object_table, trigger_name;
