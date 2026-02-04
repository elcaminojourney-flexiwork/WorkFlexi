-- Create notifications table if it doesn't exist
-- This migration is safe to run multiple times

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

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
