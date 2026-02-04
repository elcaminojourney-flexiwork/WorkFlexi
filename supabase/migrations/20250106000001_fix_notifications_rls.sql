-- Fix RLS policies for notifications table
-- This allows authenticated users to create notifications for themselves or others (for system notifications)

-- Enable RLS on notifications table (if not already enabled)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on notifications table to avoid duplicates
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON notifications';
    END LOOP;
END $$;

-- Policy 1: Allow users to SELECT their own notifications
CREATE POLICY "notifications_select_own"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Allow authenticated users to INSERT notifications
-- This allows the system/service functions to create notifications for any user
-- (e.g., when payment is released, system creates notification for worker)
CREATE POLICY "notifications_insert_authenticated"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true); -- Allow any authenticated user to create notifications

-- Policy 3: Allow users to UPDATE their own notifications (e.g., mark as read)
CREATE POLICY "notifications_update_own"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 4: Allow users to DELETE their own notifications
CREATE POLICY "notifications_delete_own"
ON notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

