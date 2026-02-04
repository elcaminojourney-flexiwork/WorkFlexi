# Email Notification Setup - Gyors Útmutató

## ✅ Mit csináltam?

1. **Notification Preferences Tábla** - SQL migration létrehozva
2. **Email Service** - Helper funkciók létrehozva (`services/email.ts`)
3. **Beállítások Oldalak** - Worker és Employer számára
4. **Edge Function** - Email küldéshez (de még nincs konfigurálva)

## 🚀 Telepítési Lépések

### LÉPÉS 1: SQL Migration Futtatása

Futtasd le a Supabase SQL Editor-ben:

```sql
-- Fájl: supabase/migrations/20250107000002_create_notification_preferences.sql
```

### LÉPÉS 2: Email Service Konfigurálása

Válassz egy email service-t:

#### A) Resend (Ajánlott - Ingyenes)

1. Regisztrálj: https://resend.com
2. Hozz létre API key-t
3. Supabase Dashboard → Project Settings → Edge Functions → Environment Variables
4. Add hozzá: `RESEND_API_KEY` = `re_xxxxxxxxxxxxx`
5. Nyisd meg: `supabase/functions/send-email/index.ts`
6. Uncomment-eld a Resend kódot (sorok 30-50 körül)
7. Módosítsd: `from: 'FlexiWork <noreply@yourdomain.com>'`

#### B) SendGrid

1. Regisztrálj: https://sendgrid.com
2. Hozz létre API key-t
3. Supabase Dashboard → Environment Variables
4. Add hozzá: `SENDGRID_API_KEY` = `SG.xxxxxxxxxxxxx`
5. Nyisd meg: `supabase/functions/send-email/index.ts`
6. Uncomment-eld a SendGrid kódot
7. Módosítsd: `from: { email: 'noreply@yourdomain.com' }`

### LÉPÉS 3: Edge Function Deploy

```bash
cd flexiwork-mobile
supabase functions deploy send-email
```

### LÉPÉS 4: App URL Beállítása

Nyisd meg: `services/notifications.ts`

Keressd meg ezt a sort (kb. 150. sor):
```typescript
const fullLink = options.link.startsWith('http') 
  ? options.link 
  : `https://your-app-url.com${options.link}`; // TODO: Replace with your actual app URL
```

Cseréld le `https://your-app-url.com`-et a saját app URL-edre.

## ✅ Kész!

Most már:
- ✅ Notification preferences tábla létezik
- ✅ Beállítások oldalak elérhetőek (Worker és Employer profilokban)
- ✅ Email service helper funkciók készen állnak
- ✅ Edge Function létrehozva (de email service-t még konfigurálni kell)

## 📱 Használat

1. **Worker/Employer profil** → **Settings** → **Notification Settings**
2. Itt be/ki lehet kapcsolni az email és in-app notification-öket
3. Alapértelmezetten minden be van kapcsolva
4. Ha email service nincs konfigurálva, az email-ök csak logolódnak (nem küldődnek el)

## ⚠️ Fontos

Az email küldés csak akkor működik, ha:
1. ✅ Futtattad az SQL migration-t
2. ✅ Konfiguráltad az email service-t (Resend vagy SendGrid)
3. ✅ Deploy-oltad az Edge Function-t
4. ✅ Beállítottad az app URL-t

Ha ezek nincsenek meg, az in-app notification-ök továbbra is működnek, csak az email-ök nem küldődnek el.
