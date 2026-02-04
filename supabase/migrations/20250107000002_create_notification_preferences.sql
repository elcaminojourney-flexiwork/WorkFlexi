-- Create notification preferences table
-- Users can enable/disable different types of notifications
-- Default: all notifications enabled

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
