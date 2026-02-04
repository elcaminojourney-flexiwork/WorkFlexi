-- Create cancellation_requests table for admin-managed cancellation requests
-- Workers and employers can request cancellations within 24h window or when restrictions apply

CREATE TABLE IF NOT EXISTS cancellation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('worker', 'employer')),
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_user_id ON cancellation_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_shift_id ON cancellation_requests(shift_id);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_status ON cancellation_requests(status);
CREATE INDEX IF NOT EXISTS idx_cancellation_requests_created_at ON cancellation_requests(created_at DESC);

-- Enable RLS
ALTER TABLE cancellation_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own cancellation requests
CREATE POLICY "cancellation_requests_insert_own"
  ON cancellation_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can view their own cancellation requests
CREATE POLICY "cancellation_requests_select_own"
  ON cancellation_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy: Admins can view and update all cancellation requests
-- (Assuming admin role check - adjust based on your admin role pattern)
-- For now, we'll allow authenticated users to update their own requests
-- Admin full access can be added later when admin role is defined
CREATE POLICY "cancellation_requests_update_own"
  ON cancellation_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_cancellation_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cancellation_requests_updated_at
  BEFORE UPDATE ON cancellation_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_cancellation_requests_updated_at();

