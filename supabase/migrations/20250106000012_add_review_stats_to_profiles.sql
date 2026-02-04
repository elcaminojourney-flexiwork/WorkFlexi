-- Add review statistics columns to profiles table
-- These will be computed and updated when reviews are created/updated

ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0 CHECK (average_rating >= 0 AND average_rating <= 5),
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0 CHECK (total_reviews >= 0),
  ADD COLUMN IF NOT EXISTS would_recommend_percentage INTEGER DEFAULT 0 CHECK (would_recommend_percentage >= 0 AND would_recommend_percentage <= 100);

-- Add indexes if needed (profiles table likely already has indexes on id)
-- These columns will be updated via triggers or application logic

-- Add comments for documentation
COMMENT ON COLUMN profiles.average_rating IS 'Average overall rating from all reviews (0-5)';
COMMENT ON COLUMN profiles.total_reviews IS 'Total number of reviews received';
COMMENT ON COLUMN profiles.would_recommend_percentage IS 'Percentage of reviewers who would recommend (would_recommend = true)';

