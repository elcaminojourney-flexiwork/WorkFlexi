# Notification Reminders Setup Guide

Ez a dokumentum leírja, hogyan kell beállítani az automatikus reminder notification-öket.

## Mi van implementálva?

A reminder notification rendszer a következő értesítéseket küldi:

1. **Shift Reminders** (Worker-nek)
   - 24 órával a shift előtt
   - 12 órával a shift előtt
   - 1 órával a shift előtt

2. **Clock-In Reminders** (Worker-nek)
   - Amikor a shift kezdődik (15 perces ablakban)

3. **Clock-Out Reminders** (Worker-nek)
   - Amikor a shift véget ér (15 perces ablakban)

4. **Timesheet Confirmation Reminders** (Employer-nek)
   - 6 órával a clock-out után
   - 12 órával a clock-out után
   - 18 órával a clock-out után
   - 22 órával a clock-out után (URGENT)

## SQL Migration

A `20250107000001_create_notification_reminders.sql` migration létrehozza a következő function-öket:

- `send_shift_reminders()` - Shift reminder-ek küldése
- `send_clock_in_reminders()` - Clock-in reminder-ek küldése
- `send_clock_out_reminders()` - Clock-out reminder-ek küldése
- `send_timesheet_confirmation_reminders()` - Timesheet confirmation reminder-ek küldése
- `run_all_notification_reminders()` - Minden reminder futtatása egyszerre

## Beállítási lehetőségek

### Opció 1: Supabase Edge Functions (Ajánlott)

1. Hozd létre az Edge Function-t:

```bash
supabase functions new notification-reminders
```

2. A function kódja (`supabase/functions/notification-reminders/index.ts`):

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Call the master function
    const { data, error } = await supabaseClient.rpc('run_all_notification_reminders')

    if (error) throw error

    return new Response(
      JSON.stringify({ 
        success: true, 
        reminders_sent: data[0] 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      },
    )
  }
})
```

3. Deploy:

```bash
supabase functions deploy notification-reminders
```

4. Állíts be cron trigger-t a Supabase Dashboard-ban:
   - Menj a **Database** → **Cron Jobs** menübe
   - Add hozzá: `*/15 * * * *` (minden 15 percben)
   - Function: `notification-reminders`

### Opció 2: pg_cron Extension (Ha elérhető)

Ha a Supabase projektben elérhető a `pg_cron` extension:

```sql
-- Enable pg_cron extension (ha még nincs engedélyezve)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the reminder function to run every 15 minutes
SELECT cron.schedule(
  'send-notification-reminders',
  '*/15 * * * *',
  $$SELECT run_all_notification_reminders();$$
);
```

### Opció 3: Külső Cron Service

Használhatsz külső cron service-t is (pl. cron-job.org, EasyCron):

1. Hozz létre egy API endpoint-ot, ami meghívja a function-t
2. Állíts be cron job-ot, ami 15 percenként meghívja ezt az endpoint-ot

Példa API endpoint (ha van Express server-ed):

```typescript
app.post('/api/reminders', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('run_all_notification_reminders')
    if (error) throw error
    res.json({ success: true, reminders_sent: data[0] })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})
```

### Opció 4: Manuális futtatás (Teszteléshez)

Manuálisan is meghívhatod a function-t a Supabase SQL Editor-ben:

```sql
SELECT run_all_notification_reminders();
```

Vagy csak egy specifikus reminder-t:

```sql
SELECT send_shift_reminders();
SELECT send_clock_in_reminders();
SELECT send_clock_out_reminders();
SELECT send_timesheet_confirmation_reminders();
```

## Tesztelés

1. Futtasd le a migration-t a Supabase SQL Editor-ben
2. Hozz létre egy teszt shift-et, application-t, stb.
3. Manuálisan futtasd a `run_all_notification_reminders()` function-t
4. Ellenőrizd, hogy megjelennek-e a notification-ök a profilokban

## Figyelmeztetések

- A function-ök `SECURITY DEFINER`-rel futnak, ami azt jelenti, hogy bypass-olják az RLS policy-ket
- A reminder-ek duplikáció elkerülése érdekében ellenőrzik, hogy már küldtek-e notification-t az adott időszakban
- A reminder-ek csak akkor küldenek notification-t, ha a megfelelő feltételek teljesülnek (pl. accepted application, clocked in, stb.)

## Hibakeresés

Ha a reminder-ek nem működnek:

1. Ellenőrizd, hogy a migration lefutott-e sikeresen
2. Ellenőrizd, hogy a cron job/Edge Function fut-e
3. Nézd meg a Supabase logs-okat
4. Manuálisan futtasd a function-t és nézd meg az eredményt
5. Ellenőrizd, hogy vannak-e megfelelő adatok (shifts, applications, timesheets)

## További fejlesztési lehetőségek

- Email notification-ök hozzáadása
- Push notification-ök (Expo Push Notifications)
- SMS notification-ök (Twilio)
- Notification preferences (user beállíthatja, milyen reminder-eket szeretne kapni)
