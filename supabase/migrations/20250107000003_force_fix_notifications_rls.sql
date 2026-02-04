-- ============================================================================
-- FORCE FIX: NOTIFICATIONS RLS POLICIES - ALLOW ALL AUTHENTICATED USERS TO INSERT
-- ============================================================================
-- This migration FORCEFULLY fixes the RLS policies for notifications table
-- Run this if notifications are still failing with RLS errors
-- ============================================================================

-- Step 1: Drop ALL existing policies on notifications table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON notifications';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 3: Create the correct policies from scratch

-- Policy 1: Users can SELECT their own notifications
CREATE POLICY "notifications_select_own"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: ANY authenticated user can INSERT notifications for ANY user
-- This is CRITICAL for the notification system to work
-- Without this, when worker applies, employer cannot get notification (different user_id)
CREATE POLICY "notifications_insert_authenticated"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);  -- CRITICAL: Allow any authenticated user to create notifications for any user

-- Policy 3: Service role can insert notifications (for reminder functions)
CREATE POLICY "notifications_insert_service_role"
ON notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy 4: Users can UPDATE their own notifications (e.g., mark as read)
CREATE POLICY "notifications_update_own"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 5: Users can DELETE their own notifications
CREATE POLICY "notifications_delete_own"
ON notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Step 4: Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Step 5: Verify policies were created
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'notifications' AND schemaname = 'public';
    
    RAISE NOTICE '✅ Created % policies on notifications table', policy_count;
    
    IF policy_count < 5 THEN
        RAISE WARNING 'Expected 5 policies, but only found %. Please check manually.', policy_count;
    END IF;
END $$;
