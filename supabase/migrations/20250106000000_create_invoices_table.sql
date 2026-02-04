-- Create invoices table for accounting records
-- This table stores invoice records for completed shifts/payments

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  shift_id uuid REFERENCES shifts(id) ON DELETE CASCADE,
  timesheet_id uuid REFERENCES timesheets(id) ON DELETE SET NULL,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  employer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  worker_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Shift details (denormalized for easy querying)
  job_title text,
  shift_date date,
  location text,
  
  -- Payment breakdown
  regular_hours numeric NOT NULL DEFAULT 0,
  regular_amount numeric NOT NULL DEFAULT 0,
  overtime_hours numeric NOT NULL DEFAULT 0,
  overtime_amount numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  platform_fee_percentage numeric NOT NULL DEFAULT 0.15,
  total_charged numeric NOT NULL DEFAULT 0,
  worker_payout numeric,
  
  -- Invoice metadata
  invoice_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'issued', -- 'issued' | 'paid' | 'cancelled'
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_invoices_employer_id ON invoices(employer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_worker_id ON invoices(worker_id);
CREATE INDEX IF NOT EXISTS idx_invoices_shift_id ON invoices(shift_id);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Employers can view their own invoices
CREATE POLICY "invoices_select_employer_own"
ON invoices
FOR SELECT
TO authenticated
USING (employer_id = auth.uid());

-- Workers can view their own invoices
CREATE POLICY "invoices_select_worker_own"
ON invoices
FOR SELECT
TO authenticated
USING (worker_id = auth.uid());

-- System can create invoices (via service functions)
CREATE POLICY "invoices_insert_system"
ON invoices
FOR INSERT
TO authenticated
WITH CHECK (true); -- Allow authenticated users to create invoices (service functions)

-- System can update invoices
CREATE POLICY "invoices_update_system"
ON invoices
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true); -- Allow authenticated users to update invoices (service functions)

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoices_updated_at();

