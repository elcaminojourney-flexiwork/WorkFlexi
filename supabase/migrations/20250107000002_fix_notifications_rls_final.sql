-- ============================================================================
-- FINAL FIX: NOTIFICATIONS RLS POLICIES - ALLOW ALL AUTHENTICATED USERS TO INSERT
-- ============================================================================
-- This migration ensures authenticated users can insert notifications for any user
-- This is necessary for the notification system to work (e.g., worker applies -> employer gets notification)
-- ============================================================================

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;

-- Policy: Authenticated users can insert notifications for any user
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

-- Refresh PostgREST schema cache to ensure changes take effect
NOTIFY pgrst, 'reload schema';
