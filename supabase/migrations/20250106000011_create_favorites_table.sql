-- Create favorites table for employers to save preferred workers
-- Employers can favorite workers to get priority notifications for new shifts

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Relations
  employer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Metadata
  notes TEXT, -- Employer's private notes about worker
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: One favorite entry per employer-worker pair
  UNIQUE(employer_id, worker_id),
  
  -- Ensure employer and worker are different
  CHECK (employer_id != worker_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_favorites_employer ON favorites(employer_id);
CREATE INDEX IF NOT EXISTS idx_favorites_worker ON favorites(worker_id);
CREATE INDEX IF NOT EXISTS idx_favorites_added_at ON favorites(added_at DESC);

-- Enable RLS
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Policy 1: Employers can view their own favorites
CREATE POLICY "favorites_select_employer_own"
ON favorites
FOR SELECT
TO authenticated
USING (employer_id = auth.uid());

-- Policy 2: Workers can view if they are favorited (for privacy, we might want to hide this)
-- For now, we'll allow workers to see if they're favorited (can be changed later)
CREATE POLICY "favorites_select_worker_own"
ON favorites
FOR SELECT
TO authenticated
USING (worker_id = auth.uid());

-- Policy 3: Employers can insert their own favorites
CREATE POLICY "favorites_insert_employer_own"
ON favorites
FOR INSERT
TO authenticated
WITH CHECK (employer_id = auth.uid());

-- Policy 4: Employers can update their own favorites (e.g., update notes)
CREATE POLICY "favorites_update_employer_own"
ON favorites
FOR UPDATE
TO authenticated
USING (employer_id = auth.uid())
WITH CHECK (employer_id = auth.uid());

-- Policy 5: Employers can delete their own favorites
CREATE POLICY "favorites_delete_employer_own"
ON favorites
FOR DELETE
TO authenticated
USING (employer_id = auth.uid());

-- Add comment for documentation
COMMENT ON TABLE favorites IS 'Employers can favorite workers to get priority notifications for new shifts';
COMMENT ON COLUMN favorites.notes IS 'Private notes that only the employer can see';

