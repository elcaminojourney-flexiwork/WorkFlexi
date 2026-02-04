-- Create notification reminder system
-- This migration creates functions to send reminder notifications for:
-- 1. Shift reminders (24h, 12h, 1h before shift)
-- 2. Clock-in reminders (when shift starts)
-- 3. Clock-out reminders (when shift ends)
-- 4. Timesheet confirmation reminders (6h, 12h, 18h, 22h after clock-out)

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

-- Note: To set up automatic execution, you can:
-- 1. Use Supabase Edge Functions with cron triggers (recommended)
-- 2. Use pg_cron extension (if available in your Supabase plan)
-- 3. Call run_all_notification_reminders() manually or via external cron job

-- Example pg_cron setup (if extension is available):
-- SELECT cron.schedule('send-notification-reminders', '*/15 * * * *', 'SELECT run_all_notification_reminders();');

COMMENT ON FUNCTION send_shift_reminders() IS 'Sends shift reminder notifications (24h, 12h, 1h before shift) to workers with accepted applications';
COMMENT ON FUNCTION send_clock_in_reminders() IS 'Sends clock-in reminders to workers when their shift starts';
COMMENT ON FUNCTION send_clock_out_reminders() IS 'Sends clock-out reminders to workers when their shift ends';
COMMENT ON FUNCTION send_timesheet_confirmation_reminders() IS 'Sends timesheet confirmation reminders to employers (6h, 12h, 18h, 22h after clock-out)';
COMMENT ON FUNCTION run_all_notification_reminders() IS 'Master function that runs all reminder checks. Should be called periodically (every 15 minutes recommended)';
