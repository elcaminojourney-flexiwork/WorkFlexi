# Notification Reminders Edge Function

Ez az Edge Function automatikusan futtatja a reminder notification-öket.

## Deploy

```bash
# Navigate to project root
cd flexiwork-mobile

# Deploy the function
supabase functions deploy notification-reminders
```

## Cron Trigger Beállítása

1. Menj a Supabase Dashboard-ba
2. Navigálj a **Database** → **Cron Jobs** menübe
3. Add hozzá az új cron job-ot:
   - **Name**: `notification-reminders`
   - **Schedule**: `*/15 * * * *` (minden 15 percben)
   - **Function**: `notification-reminders`
   - **Method**: `POST`

## Manuális Tesztelés

```bash
# Test locally (if you have Supabase CLI)
supabase functions serve notification-reminders

# Or call via HTTP
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/notification-reminders \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

## Environment Variables

A function automatikusan használja a Supabase environment változókat:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Ezeket a Supabase automatikusan beállítja, nem kell manuálisan hozzáadni.
