-- Create reviews table for two-way review system (employer ↔ worker)
-- Reviews are created after shift completion and payment release

-- Drop table if it exists (to handle partial creation from previous attempts)
DROP TABLE IF EXISTS reviews CASCADE;

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  timesheet_id UUID REFERENCES timesheets(id) ON DELETE SET NULL,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_type TEXT NOT NULL CHECK (reviewer_type IN ('employer', 'worker')),
  
  -- Star ratings (1-5)
  -- Overall rating is required, others are optional
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  
  -- Employer reviewing worker ratings
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  reliability_rating INTEGER CHECK (reliability_rating >= 1 AND reliability_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  
  -- Worker reviewing employer ratings
  work_environment_rating INTEGER CHECK (work_environment_rating >= 1 AND work_environment_rating <= 5),
  payment_fairness_rating INTEGER CHECK (payment_fairness_rating >= 1 AND payment_fairness_rating <= 5),
  management_rating INTEGER CHECK (management_rating >= 1 AND management_rating <= 5),
  
  -- Written review
  review_text TEXT CHECK (char_length(review_text) <= 500),
  
  -- Quick tags (array of strings)
  tags TEXT[],
  
  -- Would hire/work again
  would_recommend BOOLEAN DEFAULT false,
  
  -- Metadata
  is_public BOOLEAN DEFAULT true,
  is_flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  -- One review per person per shift (prevents duplicate reviews)
  UNIQUE(shift_id, reviewer_id),
  
  -- Ensure reviewer and reviewee are different people
  CHECK (reviewer_id != reviewee_id)
  -- Note: reviewer_type validation (employer reviews worker, worker reviews employer) 
  -- will be enforced at application level for better error messages
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_shift ON reviews(shift_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(overall_rating);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_timesheet ON reviews(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

-- Enable RLS
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy 1: Anyone can view public reviews (for profile pages)
CREATE POLICY "reviews_select_public"
ON reviews
FOR SELECT
TO authenticated
USING (is_public = true);

-- Policy 2: Reviewers can view their own reviews
CREATE POLICY "reviews_select_own"
ON reviews
FOR SELECT
TO authenticated
USING (reviewer_id = auth.uid());

-- Policy 3: Reviewees can view reviews about them
CREATE POLICY "reviews_select_about_me"
ON reviews
FOR SELECT
TO authenticated
USING (reviewee_id = auth.uid());

-- Policy 4: Reviewers can insert their own reviews
CREATE POLICY "reviews_insert_own"
ON reviews
FOR INSERT
TO authenticated
WITH CHECK (reviewer_id = auth.uid());

-- Policy 5: Reviewers can update their own reviews (only before 7 days)
-- Note: We'll enforce the 7-day rule in application code
CREATE POLICY "reviews_update_own"
ON reviews
FOR UPDATE
TO authenticated
USING (reviewer_id = auth.uid())
WITH CHECK (reviewer_id = auth.uid());

-- Add comment for documentation
COMMENT ON TABLE reviews IS 'Two-way review system: employers review workers and workers review employers after shift completion';
COMMENT ON COLUMN reviews.reviewer_type IS 'Type of reviewer: employer or worker';
COMMENT ON COLUMN reviews.tags IS 'Array of quick tags like professional, reliable, great_attitude, etc.';
COMMENT ON COLUMN reviews.would_recommend IS 'Would hire again (employer) or would work again (worker)';

