# Send Email Edge Function

Ez az Edge Function küld email notification-öket.

## Konfiguráció

### Opció 1: Resend (Ajánlott - Ingyenes tier)

1. Regisztrálj a [Resend.com](https://resend.com)-on
2. Hozz létre egy API key-t
3. Add hozzá a Supabase Environment Variables-hoz:
   - Key: `RESEND_API_KEY`
   - Value: `re_xxxxxxxxxxxxx`
4. Uncomment-eld a Resend kódot az `index.ts`-ben
5. Módosítsd a `from` email címet a saját domain-edre

### Opció 2: SendGrid

1. Regisztrálj a [SendGrid.com](https://sendgrid.com)-on
2. Hozz létre egy API key-t
3. Add hozzá a Supabase Environment Variables-hoz:
   - Key: `SENDGRID_API_KEY`
   - Value: `SG.xxxxxxxxxxxxx`
4. Uncomment-eld a SendGrid kódot az `index.ts`-ben
5. Módosítsd a `from` email címet a saját domain-edre

## Deploy

```bash
supabase functions deploy send-email
```

## Tesztelés

```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Test</h1><p>This is a test email.</p>"
  }'
```

## Jelenlegi állapot

A function jelenleg csak logolja az email-öket (nem küldi el). Konfiguráld az email service-t a fenti lépések szerint, hogy ténylegesen küldjön email-t.
