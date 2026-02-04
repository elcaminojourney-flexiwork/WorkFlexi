-- Comprehensive script to verify and fix invoices table
-- Run this in Supabase SQL Editor to check RLS status, table structure, and fix issues

-- ============================================
-- STEP 1: Check RLS Status
-- ============================================
DO $$
DECLARE
    rls_status boolean;
BEGIN
    SELECT rowsecurity INTO rls_status
    FROM pg_tables 
    WHERE tablename = 'invoices' AND schemaname = 'public';
    
    IF rls_status IS NULL THEN
        RAISE NOTICE '❌ Invoices table does not exist! Run migration 20250106000000_create_invoices_table.sql first.';
    ELSIF rls_status = true THEN
        RAISE NOTICE '⚠️  RLS is ENABLED on invoices table. Will disable it now...';
    ELSE
        RAISE NOTICE '✅ RLS is already DISABLED on invoices table.';
    END IF;
END $$;

-- ============================================
-- STEP 2: Drop all RLS policies (if any exist)
-- ============================================
DO $$
DECLARE
    r RECORD;
    policy_count integer := 0;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'invoices' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON invoices';
        policy_count := policy_count + 1;
    END LOOP;
    
    IF policy_count > 0 THEN
        RAISE NOTICE '✅ Dropped % RLS policies on invoices table', policy_count;
    ELSE
        RAISE NOTICE '✅ No RLS policies found on invoices table';
    END IF;
END $$;

-- ============================================
-- STEP 3: Disable RLS on invoices table
-- ============================================
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: Verify table structure
-- ============================================
DO $$
DECLARE
    col_count integer;
    missing_cols text[] := ARRAY[]::text[];
    required_cols text[] := ARRAY[
        'id', 'invoice_number', 'shift_id', 'timesheet_id', 'payment_id',
        'employer_id', 'worker_id', 'job_title', 'shift_date', 'location',
        'regular_hours', 'regular_amount', 'overtime_hours', 'overtime_amount',
        'subtotal', 'platform_fee', 'platform_fee_percentage', 'total_charged',
        'worker_payout', 'invoice_date', 'status', 'created_at', 'updated_at'
    ];
    col_name text;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'invoices' AND table_schema = 'public';
    
    RAISE NOTICE '✅ Invoices table has % columns', col_count;
    
    -- Check for required columns
    FOREACH col_name IN ARRAY required_cols LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'invoices' 
            AND table_schema = 'public'
            AND column_name = col_name
        ) THEN
            missing_cols := array_append(missing_cols, col_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_cols, 1) > 0 THEN
        RAISE WARNING '❌ Missing columns: %', array_to_string(missing_cols, ', ');
        RAISE WARNING 'Run migration 20250106000000_create_invoices_table.sql to create missing columns';
    ELSE
        RAISE NOTICE '✅ All required columns exist';
    END IF;
END $$;

-- ============================================
-- STEP 5: Refresh PostgREST schema cache
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ============================================
-- Final Status Report
-- ============================================
DO $$
DECLARE
    rls_status boolean;
    policy_count integer;
    col_count integer;
BEGIN
    -- Check RLS status
    SELECT rowsecurity INTO rls_status
    FROM pg_tables 
    WHERE tablename = 'invoices' AND schemaname = 'public';
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'invoices' AND schemaname = 'public';
    
    -- Count columns
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'invoices' AND table_schema = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'FINAL STATUS REPORT';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS Enabled: %', COALESCE(rls_status::text, 'N/A (table missing)');
    RAISE NOTICE 'RLS Policies: %', policy_count;
    RAISE NOTICE 'Table Columns: %', col_count;
    RAISE NOTICE 'Schema Cache: Refreshed';
    RAISE NOTICE '========================================';
    
    IF rls_status = false AND policy_count = 0 AND col_count >= 20 THEN
        RAISE NOTICE '✅ All checks passed! Invoices table is ready.';
    ELSE
        RAISE WARNING '⚠️  Some issues detected. Review the messages above.';
    END IF;
END $$;

