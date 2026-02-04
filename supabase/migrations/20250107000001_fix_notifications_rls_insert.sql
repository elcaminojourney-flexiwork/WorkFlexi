-- ============================================================================
-- FIX NOTIFICATIONS RLS POLICIES - ADD INSERT FOR AUTHENTICATED USERS
-- ============================================================================
-- This migration fixes the RLS policies to allow authenticated users
-- to insert notifications (for in-app notifications)
-- ============================================================================

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;

-- Policy: Authenticated users can insert notifications (for in-app notifications)
-- This allows the notification service to create notifications for any user
-- (e.g., when worker applies, employer gets notification)
CREATE POLICY "notifications_insert_authenticated"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true); -- Allow any authenticated user to create notifications

-- Also ensure UPDATE and DELETE policies exist for marking as read
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own"
ON notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
