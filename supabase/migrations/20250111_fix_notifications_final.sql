-- ============================================================================
-- VÉGLEGES NOTIFICATION FIX - 2025.01.11
-- ============================================================================
-- Ez a script MINDENT javít a notification rendszerben:
-- 1. Ellenőrzi és létrehozza a táblát ha szükséges
-- 2. Javítja a constraint-eket
-- 3. Javítja az RLS policy-kat
-- 4. Teszteli az insertet
-- ============================================================================

-- ============================================================================
-- 1. LÉPÉS: TÁBLA LÉTREHOZÁSA (ha nem létezik)
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
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

-- Indexek létrehozása (ha nem léteznek)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ============================================================================
-- 2. LÉPÉS: CONSTRAINT FIX - Töröljük a régi constraint-et és újat adunk
-- ============================================================================
-- Töröljük a régi type constraint-et (ha létezik)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Új constraint hozzáadása a helyes típusokkal
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('application', 'shift', 'timesheet', 'payment', 'dispute'));

-- ============================================================================
-- 3. LÉPÉS: RLS ENGEDÉLYEZÉSE
-- ============================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. LÉPÉS: ÖSSZES RÉGI POLICY TÖRLÉSE
-- ============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'notifications' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON notifications';
        RAISE NOTICE 'Törölve: %', r.policyname;
    END LOOP;
END $$;

-- ============================================================================
-- 5. LÉPÉS: ÚJ RLS POLICY-K LÉTREHOZÁSA
-- ============================================================================

-- Policy 1: Felhasználók láthatják a SAJÁT notification-jeiket
CREATE POLICY "notifications_select_own"
ON notifications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: BÁRMELY authenticated user létrehozhat notification-t BÁRMELY user-nek
-- Ez KRITIKUS: amikor worker apply-ol, az employer kap notification-t (más user_id!)
CREATE POLICY "notifications_insert_any"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 3: Service role is létrehozhat (reminder functions-höz)
CREATE POLICY "notifications_insert_service"
ON notifications
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy 4: Felhasználók UPDATE-elhetik a SAJÁT notification-jeiket (mark as read)
CREATE POLICY "notifications_update_own"
ON notifications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 5: Felhasználók törölhetik a SAJÁT notification-jeiket
CREATE POLICY "notifications_delete_own"
ON notifications
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- 6. LÉPÉS: PostgREST CACHE FRISSÍTÉSE (FONTOS!)
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- 7. LÉPÉS: ELLENŐRZÉS - Policy-k listázása
-- ============================================================================
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'notifications' AND schemaname = 'public';
    
    IF policy_count >= 5 THEN
        RAISE NOTICE '✅ Notifications: % policy létrehozva', policy_count;
    ELSE
        RAISE WARNING '❌ Hiba: Csak % policy létezik (5 szükséges)', policy_count;
    END IF;
END $$;

-- ============================================================================
-- 8. LÉPÉS: CONSTRAINT ELLENŐRZÉSE
-- ============================================================================
DO $$
DECLARE
    constraint_def TEXT;
BEGIN
    SELECT pg_get_constraintdef(oid) INTO constraint_def
    FROM pg_constraint
    WHERE conrelid = 'notifications'::regclass
      AND conname = 'notifications_type_check';
    
    IF constraint_def IS NOT NULL THEN
        RAISE NOTICE '✅ Type constraint: %', constraint_def;
    ELSE
        RAISE WARNING '❌ Type constraint hiányzik!';
    END IF;
END $$;

-- ============================================================================
-- 9. LÉPÉS: TEST INSERT (SQL Editor-ból, service role-lal)
-- ============================================================================
DO $$
DECLARE
    test_user_id UUID;
    test_id UUID;
BEGIN
    -- Keresünk egy user-t
    SELECT id INTO test_user_id FROM profiles LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '⚠️ Nincs user a profiles táblában - test skip';
        RETURN;
    END IF;
    
    -- Próbálunk beszúrni
    INSERT INTO notifications (user_id, type, title, message, link)
    VALUES (test_user_id, 'shift', 'Test Notification', 'Test message', '/test')
    RETURNING id INTO test_id;
    
    RAISE NOTICE '✅ Test insert sikeres: %', test_id;
    
    -- Töröljük a test rekordot
    DELETE FROM notifications WHERE id = test_id;
    RAISE NOTICE '✅ Test rekord törölve';
    
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Test insert HIBA: % (Code: %)', SQLERRM, SQLSTATE;
END $$;

-- ============================================================================
-- KÉSZ! Futtasd le ezt az egész scriptet a Supabase SQL Editor-ben.
-- Utána FRISSÍTSD A BÖNGÉSZŐT (Ctrl+Shift+R vagy F5)!
-- ============================================================================
