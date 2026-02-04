-- Add SaaS feature flags to support both SaaS (internal scheduling) and marketplace modes
-- This migration adds new columns to profiles and shifts tables
-- Existing functionality remains unchanged - all new columns have safe defaults

-- ============================================================================
-- PART 1: Add columns to profiles table for employers (subscription tier & features)
-- ============================================================================

-- Add subscription_tier for employers
-- Possible values: 'saas_only', 'marketplace', 'both'
-- Default: 'marketplace' (maintains backward compatibility)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'marketplace'
    CHECK (subscription_tier IS NULL OR subscription_tier IN ('saas_only', 'marketplace', 'both'));

-- Add features JSONB for employers
-- Default: marketplace and scheduling enabled (backward compatible)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '{"marketplace": true, "scheduling": true, "payroll": false, "training": false}'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN profiles.subscription_tier IS 'Employer subscription tier: saas_only (internal only), marketplace (marketplace only), both (hybrid)';
COMMENT ON COLUMN profiles.features IS 'JSONB feature flags for employers: marketplace, scheduling, payroll, training';

-- ============================================================================
-- PART 2: Add columns to profiles table for workers
-- ============================================================================

-- Add marketplace_enabled for workers
-- Default: true (maintains backward compatibility - existing workers can use marketplace)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN DEFAULT true;

-- Add onboarding_type for workers
-- Possible values: 'employee', 'marketplace'
-- Default: 'marketplace' (maintains backward compatibility)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS onboarding_type VARCHAR(20) DEFAULT 'marketplace'
    CHECK (onboarding_type IS NULL OR onboarding_type IN ('employee', 'marketplace'));

-- Add employed_by JSONB for workers
-- Format: [{"employer_id": "uuid", "role": "text", "status": "active|inactive"}]
-- Default: empty array (backward compatible)
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS employed_by JSONB DEFAULT '[]'::jsonb;

-- Add comments for documentation
COMMENT ON COLUMN profiles.marketplace_enabled IS 'Whether worker can access marketplace features';
COMMENT ON COLUMN profiles.onboarding_type IS 'How worker was onboarded: employee (invite code) or marketplace (standard onboarding)';
COMMENT ON COLUMN profiles.employed_by IS 'Array of employers this worker is employed by: [{"employer_id": "uuid", "role": "text", "status": "active|inactive"}]';

-- ============================================================================
-- PART 3: Add visibility column to shifts table
-- ============================================================================

-- Add visibility for shifts
-- Possible values: 'internal', 'marketplace', 'both'
-- Default: 'marketplace' (maintains backward compatibility - existing shifts visible to marketplace)
ALTER TABLE shifts 
  ADD COLUMN IF NOT EXISTS visibility VARCHAR(20) DEFAULT 'marketplace'
    CHECK (visibility IN ('internal', 'marketplace', 'both'));

-- Add comment for documentation
COMMENT ON COLUMN shifts.visibility IS 'Shift visibility: internal (employer workers only), marketplace (all marketplace workers), both (hybrid)';

-- ============================================================================
-- PART 4: Create indexes for performance
-- ============================================================================

-- Index on subscription_tier for filtering employers
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier) WHERE subscription_tier IS NOT NULL;

-- Index on marketplace_enabled for filtering workers
CREATE INDEX IF NOT EXISTS idx_profiles_marketplace_enabled ON profiles(marketplace_enabled) WHERE marketplace_enabled = true;

-- Index on visibility for filtering shifts
CREATE INDEX IF NOT EXISTS idx_shifts_visibility ON shifts(visibility);

-- Index on visibility + status for common queries
CREATE INDEX IF NOT EXISTS idx_shifts_visibility_status ON shifts(visibility, status) WHERE status = 'open';

-- ============================================================================
-- PART 5: Update existing RLS policies (non-breaking)
-- ============================================================================

-- Note: We don't modify existing policies here to ensure backward compatibility
-- New policies for visibility-based access will be added in a separate migration
-- after ensuring the schema changes are applied successfully

-- ============================================================================
-- Verification queries (commented out - uncomment to verify)
-- ============================================================================

-- Verify columns were added
-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'profiles' 
--   AND column_name IN ('subscription_tier', 'features', 'marketplace_enabled', 'onboarding_type', 'employed_by')
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'shifts' 
--   AND column_name = 'visibility';
