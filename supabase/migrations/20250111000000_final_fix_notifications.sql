-- ============================================================================
-- VÉGLEGES FIX: NOTIFICATIONS RENDSZER
-- ============================================================================
-- Ez a script biztosítja, hogy a notification rendszer 100%-ban működjön
-- Futtasd le ezt a Supabase SQL Editor-ben
-- ============================================================================

-- 1. Ellenőrizzük és javítjuk a notifications tábla struktúráját
DO $$ 
BEGIN
    -- Tábla létrehozása ha nem létezik
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'notifications'
    ) THEN
        CREATE TABLE notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            type TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            link TEXT,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        RAISE NOTICE '✅ Created notifications table';
    ELSE
        RAISE NOTICE '✅ Notifications table already exists';
    END IF;

    -- Hiányzó oszlopok hozzáadása
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'link') THEN
        ALTER TABLE notifications ADD COLUMN link TEXT;
        RAISE NOTICE '✅ Added link column';
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
        ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added is_read column';
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'updated_at') THEN
        ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column';
    END IF;
END $$;

-- 2. Töröljük a régi type constraint-et és létrehozzuk az újat
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('application', 'shift', 'timesheet', 'payment', 'dispute'));

-- 3. Indexek létrehozása (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- 4. RLS beállítása
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 5. Töröljük az ÖSSZES meglévő policy-t
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON notifications';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- 6. Új policy-k létrehozása

-- SELECT: Felhasználók csak a saját notification-jeiket olvashatják
CREATE POLICY "notifications_select_own"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: BÁRMELYIK authenticated user beszúrhat notification-t BÁRMELYIK user-nek
-- Ez KRITIKUS, mert pl. worker pályázik → employer kap notification-t (más user_id!)
CREATE POLICY "notifications_insert_any"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- UPDATE: Felhasználók csak a saját notification-jeiket módosíthatják (pl. is_read)
CREATE POLICY "notifications_update_own"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Felhasználók csak a saját notification-jeiket törölhetik
CREATE POLICY "notifications_delete_own"
ON notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Service role mindenhez hozzáfér
CREATE POLICY "notifications_service_role_all"
ON notifications
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 7. notification_preferences tábla (ha még nem létezik)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'notification_preferences'
    ) THEN
        CREATE TABLE notification_preferences (
            user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
            email_application BOOLEAN DEFAULT true,
            email_shift BOOLEAN DEFAULT true,
            email_timesheet BOOLEAN DEFAULT true,
            email_payment BOOLEAN DEFAULT true,
            email_dispute BOOLEAN DEFAULT true,
            inapp_application BOOLEAN DEFAULT true,
            inapp_shift BOOLEAN DEFAULT true,
            inapp_timesheet BOOLEAN DEFAULT true,
            inapp_payment BOOLEAN DEFAULT true,
            inapp_dispute BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "notification_preferences_select_own"
        ON notification_preferences FOR SELECT TO authenticated
        USING (user_id = auth.uid());
        
        CREATE POLICY "notification_preferences_insert_own"
        ON notification_preferences FOR INSERT TO authenticated
        WITH CHECK (user_id = auth.uid());
        
        CREATE POLICY "notification_preferences_update_own"
        ON notification_preferences FOR UPDATE TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
        
        RAISE NOTICE '✅ Created notification_preferences table with RLS';
    ELSE
        RAISE NOTICE '✅ notification_preferences table already exists';
    END IF;
END $$;

-- 8. get_or_create_notification_preferences függvény
CREATE OR REPLACE FUNCTION get_or_create_notification_preferences(p_user_id UUID)
RETURNS notification_preferences
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_prefs notification_preferences;
BEGIN
    -- Próbáljuk lekérdezni
    SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;
    
    -- Ha nem létezik, létrehozzuk alapértékekkel
    IF NOT FOUND THEN
        INSERT INTO notification_preferences (user_id)
        VALUES (p_user_id)
        ON CONFLICT (user_id) DO NOTHING
        RETURNING * INTO v_prefs;
        
        -- Ha a RETURNING nem adott vissza sort (race condition), újra lekérdezzük
        IF v_prefs IS NULL THEN
            SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;
        END IF;
    END IF;
    
    RETURN v_prefs;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_notification_preferences(UUID) TO authenticated;

-- 9. PostgREST schema cache frissítése
NOTIFY pgrst, 'reload schema';

-- 10. Ellenőrzés
DO $$
DECLARE
    policy_count INTEGER;
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'notifications' AND schemaname = 'public';
    
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'notifications' AND table_schema = 'public';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ NOTIFICATIONS SETUP COMPLETE';
    RAISE NOTICE '✅ Policies created: %', policy_count;
    RAISE NOTICE '✅ Columns: %', col_count;
    RAISE NOTICE '========================================';
END $$;

-- 11. Végső ellenőrzés - policy-k listázása
SELECT 
    policyname as "Policy Name",
    cmd as "Operation",
    CASE 
        WHEN with_check = 'true' THEN '✅ ANY USER'
        ELSE with_check::text
    END as "Insert Check"
FROM pg_policies
WHERE tablename = 'notifications' 
    AND schemaname = 'public'
ORDER BY policyname;
