# ✅ Notification System - Teljes Beállítási Útmutató

## 📋 Mit tartalmaz ez a rendszer?

### 1. **Notifications Tábla**
- Tárolja az összes notification-t
- Típusok: `application`, `shift`, `timesheet`, `payment`, `dispute`
- Minden notification-nek van `user_id`, `title`, `message`, `link`, `is_read` mezője

### 2. **Azonnali Notification-ök** (már működnek)
- ✅ Shift posting → Worker-ek értesítése
- ✅ Application → Employer értesítése
- ✅ Accept/Reject → Worker értesítése
- ✅ Clock-in/out → Employer és Worker értesítése
- ✅ Clock-in/out confirmation → Worker értesítése
- ✅ Timesheet confirmation → Worker értesítése
- ✅ Payment finalization → Worker értesítése

### 3. **Reminder Notification-ök** (automatikusan futnak)
- ✅ Shift reminders (24h, 12h, 1h előtt)
- ✅ Clock-in reminders (amikor a shift kezdődik)
- ✅ Clock-out reminders (amikor a shift véget ér)
- ✅ Timesheet confirmation reminders (6h, 12h, 18h, 22h után)

## 🚀 Telepítési Lépések

### LÉPÉS 1: SQL Migration Futtatása

1. Nyisd meg a **Supabase Dashboard**-ot
2. Menj a **SQL Editor**-be
3. Másold be és futtasd le a következő fájl tartalmát:
   ```
   supabase/migrations/20250107000000_complete_notifications_system.sql
   ```
4. Ellenőrizd, hogy sikeresen lefutott-e (nem kellene hibát látnod)

### LÉPÉS 2: Edge Function Deploy

1. Telepítsd a Supabase CLI-t (ha még nincs):
   ```bash
   npm install -g supabase
   ```

2. Bejelentkezés a Supabase-be:
   ```bash
   supabase login
   ```

3. Linkeld a projektet (ha még nincs linkelve):
   ```bash
   cd flexiwork-mobile
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   (A PROJECT_REF-et a Supabase Dashboard → Settings → API → Project URL-ből találod meg)

4. Deploy-öld az Edge Function-t:
   ```bash
   supabase functions deploy notification-reminders
   ```

### LÉPÉS 3: Cron Trigger Beállítása

1. Menj a **Supabase Dashboard**-ba
2. Navigálj a **Database** → **Cron Jobs** menübe
3. Kattints az **Add Cron Job** gombra
4. Töltsd ki az űrlapot:
   - **Name**: `notification-reminders`
   - **Schedule**: `*/15 * * * *` (minden 15 percben)
   - **Function**: `notification-reminders`
   - **Method**: `POST`
5. Mentsd el

## ✅ Tesztelés

### 1. Manuális SQL Teszt

Futtasd le a Supabase SQL Editor-ben:

```sql
-- Teszt: Futtasd az összes reminder check-et
SELECT run_all_notification_reminders();

-- Vagy csak egy specifikus reminder-t:
SELECT send_shift_reminders();
SELECT send_clock_in_reminders();
SELECT send_clock_out_reminders();
SELECT send_timesheet_confirmation_reminders();
```

### 2. Edge Function Teszt

```bash
# HTTP request-tel tesztelheted
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/notification-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### 3. App-ban Tesztelés

1. Nyisd meg a worker vagy employer profil oldalt
2. A "Notifications" szekcióban kellene megjelennie az értesítéseknek
3. Kattints egy notification-re, hogy megjelölje olvasottként

## 📁 Fájlok Struktúrája

```
flexiwork-mobile/
├── supabase/
│   ├── migrations/
│   │   └── 20250107000000_complete_notifications_system.sql  ← FŐ SQL FÁJL
│   ├── functions/
│   │   └── notification-reminders/
│   │       ├── index.ts  ← Edge Function kód
│   │       └── README.md
│   └── NOTIFICATIONS_SETUP_COMPLETE.md  ← Ez a fájl
├── services/
│   └── notifications.ts  ← Helper funkciók
└── components/
    └── ui/
        └── NotificationList.tsx  ← UI komponens
```

## 🔧 Hibakeresés

### Problem: "RLS policy error"
**Megoldás**: Futtasd le újra a SQL migration-t, a RLS policy-k benne vannak.

### Problem: "Function not found"
**Megoldás**: Ellenőrizd, hogy a migration lefutott-e, és hogy a function-ök létrejöttek-e:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%reminder%';
```

### Problem: "Edge Function nem fut"
**Megoldás**: 
1. Ellenőrizd, hogy deploy-oltad-e: `supabase functions list`
2. Nézd meg a logs-okat: Supabase Dashboard → Edge Functions → notification-reminders → Logs

### Problem: "Cron job nem fut"
**Megoldás**:
1. Ellenőrizd a cron job beállításokat a Dashboard-ban
2. Nézd meg a cron job logs-okat
3. Manuálisan futtasd a function-t teszteléshez

## 📊 Monitoring

A notification-öket a következőképpen monitorozhatod:

```sql
-- Összes notification száma
SELECT COUNT(*) FROM notifications;

-- Olvasatlan notification-ök
SELECT COUNT(*) FROM notifications WHERE is_read = false;

-- Notification-ök típus szerint
SELECT type, COUNT(*) 
FROM notifications 
GROUP BY type;

-- Legutóbbi notification-ök
SELECT * 
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🎯 Következő Lépések (Opcionális)

1. **Email Notification-ök**: Integrálj egy email service-t (pl. SendGrid, Resend)
2. **Push Notification-ök**: Expo Push Notifications használata
3. **SMS Notification-ök**: Twilio integráció
4. **Notification Preferences**: User beállíthatja, milyen notification-öket szeretne kapni

## ✅ Kész!

A notification rendszer most már teljesen működik! Az azonnali notification-ök automatikusan készülnek, a reminder-ek pedig 15 percenként futnak.

Ha bármilyen kérdésed van, nézd meg a `REMINDER_NOTIFICATIONS_SETUP.md` fájlt részletesebb információkért.
