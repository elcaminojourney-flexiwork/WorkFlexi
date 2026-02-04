-- ============================================================================
-- COMPLETE NOTIFICATIONS SYSTEM MIGRATION
-- ============================================================================
-- This migration creates:
-- 1. Notifications table
-- 2. All reminder notification functions
-- 
-- Run this in Supabase SQL Editor to set up the complete notification system
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE NOTIFICATIONS TABLE
-- ============================================================================

DO $$ 
BEGIN
    -- Create notifications table if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'notifications'
    ) THEN
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            type TEXT NOT NULL CHECK (type IN ('application', 'shift', 'timesheet', 'payment', 'dispute')),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            link TEXT,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create indexes for better query performance
        CREATE INDEX idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX idx_notifications_user_id_is_read ON notifications(user_id, is_read);
        CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
        CREATE INDEX idx_notifications_type ON notifications(type);

        -- Enable RLS
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

        RAISE NOTICE '✅ Notifications table created successfully';
    ELSE
        RAISE NOTICE '✅ Notifications table already exists';
    END IF;

    -- Add missing columns if table exists but columns are missing
    IF EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'notifications'
    ) THEN
        -- Add is_read column if missing
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            AND column_name = 'is_read'
        ) THEN
            ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
            RAISE NOTICE '✅ Added is_read column to notifications table';
        END IF;

        -- Add link column if missing
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            AND column_name = 'link'
        ) THEN
            ALTER TABLE notifications ADD COLUMN link TEXT;
            RAISE NOTICE '✅ Added link column to notifications table';
        END IF;

        -- Add updated_at column if missing
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'notifications' 
            AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
            RAISE NOTICE '✅ Added updated_at column to notifications table';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- PART 2: CREATE RLS POLICIES FOR NOTIFICATIONS
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_authenticated" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_service_role" ON notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;

-- Policy: Users can view their own notifications
CREATE POLICY "notifications_select_own"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Authenticated users can insert notifications for any user
-- This allows the notification service to create notifications for any user
-- (e.g., when worker applies, employer gets notification)
CREATE POLICY "notifications_insert_authenticated"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true); -- Allow any authenticated user to create notifications

-- Policy: Service role can insert notifications (for reminder functions and automated notifications)
CREATE POLICY "notifications_insert_service_role"
ON notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy: Users can update their own notifications (e.g., mark as read)
CREATE POLICY "notifications_update_own"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy: Users can delete their own notifications
CREATE POLICY "notifications_delete_own"
ON notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- PART 3: CREATE REMINDER NOTIFICATION FUNCTIONS
-- ============================================================================

-- Function to send shift reminder notifications
CREATE OR REPLACE FUNCTION send_shift_reminders()
RETURNS TABLE(notifications_sent INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift RECORD;
  v_application RECORD;
  v_hours_until NUMERIC;
  v_shift_datetime TIMESTAMPTZ;
  v_notifications_sent INTEGER := 0;
  v_message TEXT;
  v_title TEXT;
BEGIN
  -- Find shifts that are:
  -- 1. Status = 'open' or 'in_progress'
  -- 2. Have accepted applications (workers assigned)
  -- 3. Are in the next 24 hours (for 1h reminder)
  -- 4. Are in 12-24 hours (for 12h reminder)
  -- 5. Are in 24-48 hours (for 24h reminder)
  
  FOR v_shift IN
    SELECT 
      s.id,
      s.job_title,
      s.shift_date,
      s.start_time,
      s.end_time,
      s.location,
      s.status,
      (s.shift_date || ' ' || s.start_time)::TIMESTAMPTZ as shift_datetime
    FROM shifts s
    WHERE s.status IN ('open', 'in_progress')
      AND s.shift_date >= CURRENT_DATE
      AND (s.shift_date || ' ' || s.start_time)::TIMESTAMPTZ BETWEEN NOW() AND NOW() + INTERVAL '48 hours'
  LOOP
    v_shift_datetime := v_shift.shift_datetime;
    v_hours_until := EXTRACT(EPOCH FROM (v_shift_datetime - NOW())) / 3600;
    
    -- Only send reminders for accepted applications
    FOR v_application IN
      SELECT worker_id
      FROM applications
      WHERE shift_id = v_shift.id
        AND status = 'accepted'
    LOOP
      -- Send reminder based on hours until shift
      IF v_hours_until <= 1 AND v_hours_until > 0 THEN
        -- 1 hour reminder
        v_title := 'Shift Reminder';
        v_message := format('Your shift "%s" starts in less than 1 hour! Time to clock in.', v_shift.job_title);
        
        INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
        VALUES (
          v_application.worker_id,
          'shift',
          v_title,
          v_message,
          format('/worker/shift/%s', v_shift.id),
          false,
          NOW()
        );
        v_notifications_sent := v_notifications_sent + 1;
        
      ELSIF v_hours_until <= 12 AND v_hours_until > 11 THEN
        -- 12 hour reminder
        v_title := 'Shift Reminder';
        v_message := format('Your shift "%s" starts in 12 hours. Get ready!', v_shift.job_title);
        
        INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
        VALUES (
          v_application.worker_id,
          'shift',
          v_title,
          v_message,
          format('/worker/shift/%s', v_shift.id),
          false,
          NOW()
        );
        v_notifications_sent := v_notifications_sent + 1;
        
      ELSIF v_hours_until <= 24 AND v_hours_until > 23 THEN
        -- 24 hour reminder
        v_title := 'Shift Reminder';
        v_message := format('Your shift "%s" starts in 24 hours. Don''t forget!', v_shift.job_title);
        
        INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
        VALUES (
          v_application.worker_id,
          'shift',
          v_title,
          v_message,
          format('/worker/shift/%s', v_shift.id),
          false,
          NOW()
        );
        v_notifications_sent := v_notifications_sent + 1;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT v_notifications_sent;
END;
$$;

-- Function to send clock-in reminders
CREATE OR REPLACE FUNCTION send_clock_in_reminders()
RETURNS TABLE(notifications_sent INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift RECORD;
  v_application RECORD;
  v_shift_datetime TIMESTAMPTZ;
  v_notifications_sent INTEGER := 0;
BEGIN
  -- Find shifts that:
  -- 1. Have started (shift_datetime <= NOW())
  -- 2. Are in the last 15 minutes (to avoid spam)
  -- 3. Have accepted applications
  -- 4. Worker hasn't clocked in yet
  
  FOR v_shift IN
    SELECT 
      s.id,
      s.job_title,
      s.shift_date,
      s.start_time,
      s.employer_id,
      (s.shift_date || ' ' || s.start_time)::TIMESTAMPTZ as shift_datetime
    FROM shifts s
    WHERE s.status IN ('open', 'in_progress')
      AND (s.shift_date || ' ' || s.start_time)::TIMESTAMPTZ BETWEEN NOW() - INTERVAL '15 minutes' AND NOW()
  LOOP
    -- Find workers who haven't clocked in yet
    FOR v_application IN
      SELECT a.worker_id
      FROM applications a
      WHERE a.shift_id = v_shift.id
        AND a.status = 'accepted'
        AND NOT EXISTS (
          SELECT 1
          FROM timesheets t
          WHERE t.shift_id = v_shift.id
            AND t.worker_id = a.worker_id
            AND t.clock_in_time IS NOT NULL
        )
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
      VALUES (
        v_application.worker_id,
        'timesheet',
        'Time to Clock In',
        format('Don''t forget to clock in for your shift: "%s" starting at %s', v_shift.job_title, v_shift.start_time),
        format('/worker/shift/%s', v_shift.id),
        false,
        NOW()
      );
      v_notifications_sent := v_notifications_sent + 1;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT v_notifications_sent;
END;
$$;

-- Function to send clock-out reminders
CREATE OR REPLACE FUNCTION send_clock_out_reminders()
RETURNS TABLE(notifications_sent INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift RECORD;
  v_timesheet RECORD;
  v_shift_end_datetime TIMESTAMPTZ;
  v_notifications_sent INTEGER := 0;
BEGIN
  -- Find shifts that:
  -- 1. Have ended (end_datetime <= NOW())
  -- 2. Are in the last 15 minutes
  -- 3. Worker has clocked in but not clocked out
  
  FOR v_shift IN
    SELECT 
      s.id,
      s.job_title,
      s.shift_date,
      s.end_time,
      (s.shift_date || ' ' || s.end_time)::TIMESTAMPTZ as shift_end_datetime
    FROM shifts s
    WHERE s.status = 'in_progress'
      AND (s.shift_date || ' ' || s.end_time)::TIMESTAMPTZ BETWEEN NOW() - INTERVAL '15 minutes' AND NOW()
  LOOP
    -- Find workers who have clocked in but not clocked out
    FOR v_timesheet IN
      SELECT t.worker_id
      FROM timesheets t
      WHERE t.shift_id = v_shift.id
        AND t.clock_in_time IS NOT NULL
        AND t.clock_out_time IS NULL
    LOOP
      INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
      VALUES (
        v_timesheet.worker_id,
        'timesheet',
        'Time to Clock Out',
        format('Don''t forget to clock out for your shift: "%s" ending at %s', v_shift.job_title, v_shift.end_time),
        format('/worker/shift/%s', v_shift.id),
        false,
        NOW()
      );
      v_notifications_sent := v_notifications_sent + 1;
    END LOOP;
  END LOOP;
  
  RETURN QUERY SELECT v_notifications_sent;
END;
$$;

-- Function to send timesheet confirmation reminders to employers
CREATE OR REPLACE FUNCTION send_timesheet_confirmation_reminders()
RETURNS TABLE(notifications_sent INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timesheet RECORD;
  v_shift RECORD;
  v_hours_since_clockout NUMERIC;
  v_notifications_sent INTEGER := 0;
  v_message TEXT;
BEGIN
  -- Find timesheets that:
  -- 1. Have clock_out_time (worker has clocked out)
  -- 2. Are not employer_confirmed yet
  -- 3. Are not in dispute
  -- 4. Clock-out was 6h, 12h, 18h, or 22h ago
  
  FOR v_timesheet IN
    SELECT 
      t.id,
      t.shift_id,
      t.worker_id,
      t.clock_out_time,
      t.employer_confirmed,
      t.dispute_raised,
      EXTRACT(EPOCH FROM (NOW() - t.clock_out_time)) / 3600 as hours_since_clockout
    FROM timesheets t
    WHERE t.clock_out_time IS NOT NULL
      AND t.employer_confirmed = false
      AND (t.dispute_raised = false OR t.dispute_raised IS NULL)
      AND EXTRACT(EPOCH FROM (NOW() - t.clock_out_time)) / 3600 BETWEEN 5.5 AND 24
  LOOP
    v_hours_since_clockout := v_timesheet.hours_since_clockout;
    
    -- Send reminder at 6h, 12h, 18h, 22h (with 30min window)
    IF (v_hours_since_clockout >= 5.5 AND v_hours_since_clockout <= 6.5) OR
       (v_hours_since_clockout >= 11.5 AND v_hours_since_clockout <= 12.5) OR
       (v_hours_since_clockout >= 17.5 AND v_hours_since_clockout <= 18.5) OR
       (v_hours_since_clockout >= 21.5 AND v_hours_since_clockout <= 22.5) THEN
      
      -- Get shift info
      SELECT s.job_title, s.employer_id
      INTO v_shift
      FROM shifts s
      WHERE s.id = v_timesheet.shift_id;
      
      IF v_shift.employer_id IS NOT NULL THEN
        -- Check if we already sent a reminder for this timesheet in the last hour
        -- (to avoid duplicate reminders)
        IF NOT EXISTS (
          SELECT 1
          FROM notifications n
          WHERE n.user_id = v_shift.employer_id
            AND n.type = 'timesheet'
            AND n.link = format('/employer/timesheet/%s', v_timesheet.id)
            AND n.created_at > NOW() - INTERVAL '1 hour'
        ) THEN
          IF v_hours_since_clockout >= 21.5 THEN
            v_message := format('⚠️ URGENT: Timesheet for "%s" will auto-approve in %s hour(s). Please confirm now!', 
              v_shift.job_title, 
              ROUND(24 - v_hours_since_clockout, 1)
            );
          ELSE
            v_message := format('Reminder: Please confirm the timesheet for "%s". Worker clocked out %s hour(s) ago.', 
              v_shift.job_title, 
              ROUND(v_hours_since_clockout, 1)
            );
          END IF;
          
          INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
          VALUES (
            v_shift.employer_id,
            'timesheet',
            'Timesheet Confirmation Reminder',
            v_message,
            format('/employer/timesheet/%s', v_timesheet.id),
            false,
            NOW()
          );
          v_notifications_sent := v_notifications_sent + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_notifications_sent;
END;
$$;

-- Master function to run all reminder checks
CREATE OR REPLACE FUNCTION run_all_notification_reminders()
RETURNS TABLE(
  shift_reminders INTEGER,
  clock_in_reminders INTEGER,
  clock_out_reminders INTEGER,
  timesheet_reminders INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift_count INTEGER;
  v_clock_in_count INTEGER;
  v_clock_out_count INTEGER;
  v_timesheet_count INTEGER;
BEGIN
  -- Run all reminder functions
  SELECT notifications_sent INTO v_shift_count FROM send_shift_reminders();
  SELECT notifications_sent INTO v_clock_in_count FROM send_clock_in_reminders();
  SELECT notifications_sent INTO v_clock_out_count FROM send_clock_out_reminders();
  SELECT notifications_sent INTO v_timesheet_count FROM send_timesheet_confirmation_reminders();
  
  RETURN QUERY SELECT 
    COALESCE(v_shift_count, 0),
    COALESCE(v_clock_in_count, 0),
    COALESCE(v_clock_out_count, 0),
    COALESCE(v_timesheet_count, 0);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION send_shift_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION send_clock_in_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION send_clock_out_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION send_timesheet_confirmation_reminders() TO authenticated;
GRANT EXECUTE ON FUNCTION run_all_notification_reminders() TO authenticated;

-- ============================================================================
-- PART 4: COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION send_shift_reminders() IS 'Sends shift reminder notifications (24h, 12h, 1h before shift) to workers with accepted applications';
COMMENT ON FUNCTION send_clock_in_reminders() IS 'Sends clock-in reminders to workers when their shift starts';
COMMENT ON FUNCTION send_clock_out_reminders() IS 'Sends clock-out reminders to workers when their shift ends';
COMMENT ON FUNCTION send_timesheet_confirmation_reminders() IS 'Sends timesheet confirmation reminders to employers (6h, 12h, 18h, 22h after clock-out)';
COMMENT ON FUNCTION run_all_notification_reminders() IS 'Master function that runs all reminder checks. Should be called periodically (every 15 minutes recommended)';

-- ============================================================================
-- PART 5: CREATE NOTIFICATION PREFERENCES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Email notification preferences (default: true)
  email_application BOOLEAN DEFAULT true,
  email_shift BOOLEAN DEFAULT true,
  email_timesheet BOOLEAN DEFAULT true,
  email_payment BOOLEAN DEFAULT true,
  email_dispute BOOLEAN DEFAULT true,
  
  -- In-app notification preferences (default: true)
  inapp_application BOOLEAN DEFAULT true,
  inapp_shift BOOLEAN DEFAULT true,
  inapp_timesheet BOOLEAN DEFAULT true,
  inapp_payment BOOLEAN DEFAULT true,
  inapp_dispute BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "notification_preferences_select_own" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_insert_own" ON notification_preferences;
DROP POLICY IF EXISTS "notification_preferences_update_own" ON notification_preferences;

CREATE POLICY "notification_preferences_select_own"
ON notification_preferences
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "notification_preferences_insert_own"
ON notification_preferences
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_preferences_update_own"
ON notification_preferences
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Function to get or create default preferences for a user
CREATE OR REPLACE FUNCTION get_or_create_notification_preferences(p_user_id UUID)
RETURNS notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefs notification_preferences;
BEGIN
  -- Try to get existing preferences
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If not found, create default preferences
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_prefs;
  END IF;
  
  RETURN v_prefs;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_notification_preferences(UUID) TO authenticated;

COMMENT ON TABLE notification_preferences IS 'User preferences for email and in-app notifications. Default: all enabled.';
COMMENT ON FUNCTION get_or_create_notification_preferences(UUID) IS 'Gets existing preferences or creates default (all enabled) for a user';

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Set up Edge Function for email (see supabase/functions/send-email/index.ts)
-- 2. Set up Edge Function for reminders (see supabase/functions/notification-reminders/index.ts)
-- 3. Set up cron triggers in Supabase Dashboard (every 15 minutes)
-- ============================================================================
