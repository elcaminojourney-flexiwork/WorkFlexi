-- Fix invoices table structure to match code expectations
-- This migration:
-- 1. Makes payment_id nullable (since we're in mock mode and don't create payments)
-- 2. Adds missing columns that the code and invoice pages expect

-- ============================================
-- STEP 1: Make payment_id nullable
-- ============================================
ALTER TABLE invoices ALTER COLUMN payment_id DROP NOT NULL;

-- ============================================
-- STEP 2: Add missing columns (if they don't exist)
-- ============================================

-- Add timesheet_id if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'timesheet_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN timesheet_id uuid REFERENCES timesheets(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add job_title if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'job_title'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN job_title text;
    END IF;
END $$;

-- Add shift_date if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'shift_date'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN shift_date date;
    END IF;
END $$;

-- Add location if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'location'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN location text;
    END IF;
END $$;

-- Add regular_hours if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'regular_hours'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN regular_hours numeric DEFAULT 0;
    END IF;
END $$;

-- Add regular_amount if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'regular_amount'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN regular_amount numeric DEFAULT 0;
    END IF;
END $$;

-- Add overtime_hours if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'overtime_hours'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN overtime_hours numeric DEFAULT 0;
    END IF;
END $$;

-- Add overtime_amount if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'overtime_amount'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN overtime_amount numeric DEFAULT 0;
    END IF;
END $$;

-- Add subtotal if missing (or map existing 'amount' to subtotal)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'subtotal'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN subtotal numeric DEFAULT 0;
        -- Copy existing 'amount' values to 'subtotal' if 'amount' exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' 
            AND column_name = 'amount'
            AND table_schema = 'public'
        ) THEN
            UPDATE invoices SET subtotal = amount WHERE subtotal = 0 AND amount IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Add platform_fee_percentage if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'platform_fee_percentage'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN platform_fee_percentage numeric DEFAULT 0.15;
    END IF;
END $$;

-- Add total_charged if missing (or map existing 'total' to total_charged)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'total_charged'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN total_charged numeric DEFAULT 0;
        -- Copy existing 'total' values to 'total_charged' if 'total' exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' 
            AND column_name = 'total'
            AND table_schema = 'public'
        ) THEN
            UPDATE invoices SET total_charged = total WHERE total_charged = 0 AND total IS NOT NULL;
        END IF;
    END IF;
END $$;

-- Add worker_payout if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'worker_payout'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN worker_payout numeric;
    END IF;
END $$;

-- Add invoice_date if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'invoice_date'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN invoice_date timestamptz DEFAULT now();
        -- Copy existing created_at to invoice_date if created_at exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' 
            AND column_name = 'created_at'
            AND table_schema = 'public'
        ) THEN
            UPDATE invoices SET invoice_date = created_at WHERE invoice_date IS NULL;
        END IF;
    END IF;
END $$;

-- Add status if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN status text DEFAULT 'issued';
    END IF;
END $$;

-- Add updated_at if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE invoices ADD COLUMN updated_at timestamptz DEFAULT now();
    END IF;
END $$;

-- ============================================
-- STEP 3: Refresh PostgREST schema cache
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ============================================
-- STEP 4: Verify changes
-- ============================================
DO $$
DECLARE
    col_count integer;
    payment_id_nullable boolean;
BEGIN
    -- Count columns
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'invoices' AND table_schema = 'public';
    
    -- Check if payment_id is nullable
    SELECT is_nullable = 'YES' INTO payment_id_nullable
    FROM information_schema.columns
    WHERE table_name = 'invoices' 
    AND column_name = 'payment_id'
    AND table_schema = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INVOICES TABLE UPDATE COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total columns: %', col_count;
    RAISE NOTICE 'payment_id nullable: %', payment_id_nullable;
    RAISE NOTICE 'Schema cache: Refreshed';
    RAISE NOTICE '========================================';
    
    IF payment_id_nullable = true AND col_count >= 20 THEN
        RAISE NOTICE '✅ All updates successful! Invoices table is ready.';
    ELSE
        RAISE WARNING '⚠️  Some issues detected. Review the messages above.';
    END IF;
END $$;

