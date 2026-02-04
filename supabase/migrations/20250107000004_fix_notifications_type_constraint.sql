-- ============================================================================
-- FIX NOTIFICATIONS TYPE CONSTRAINT
-- ============================================================================
-- The constraint currently allows: 'generic', 'shift_posted', 'application', etc.
-- But the code uses: 'shift', 'application', 'timesheet', 'payment', 'dispute'
-- This migration fixes the constraint to match the code
-- ============================================================================

-- Step 1: Drop the old constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Step 2: Add the correct constraint that matches the code
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('application', 'shift', 'timesheet', 'payment', 'dispute'));

-- Step 3: Verify the constraint was added correctly
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'notifications'::regclass
    AND conname = 'notifications_type_check';

-- Expected result:
-- constraint_name: notifications_type_check
-- constraint_definition: CHECK ((type = ANY (ARRAY['application'::text, 'shift'::text, 'timesheet'::text, 'payment'::text, 'dispute'::text])))

-- Step 4: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
