# FlexiWork – Teljes RLS audit összefoglaló

Kivétel nélküli rendszerellenőrzés és javítás. Dátum: 2025-02-04.

---

## 1) Frontend Supabase használat – mátrix

| Tábla / erőforrás | Művelet | Employer | Worker | Admin | Join / megjegyzés |
|-------------------|---------|----------|--------|-------|-------------------|
| **profiles** | SELECT | ✓ (saját, worker lista) | ✓ (saját) | ✓ (keresés, egy profil) | shifts+profiles, applications+profiles |
| **profiles** | UPDATE | ✓ (saját) | ✓ (saját) | ✓ (bármelyik) | |
| **profiles** | INSERT/upsert | ✓ (reg) | ✓ (reg) | – | onConflict: 'id' |
| **shifts** | SELECT | ✓ (saját) | ✓ (browse, internal) | – | profiles!shifts_employer_id_fkey |
| **shifts** | INSERT | ✓ | – | – | |
| **shifts** | UPDATE | ✓ (saját) | ✓ (status in_progress) | – | RPC update_shift_status_to_in_progress |
| **shifts** | DELETE | ✓ | – | – | |
| **applications** | SELECT | ✓ (saját shift) | ✓ (saját) | – | shifts, profiles join |
| **applications** | INSERT | – | ✓ | – | |
| **applications** | UPDATE | ✓ (status) | ✓ (saját) | – | |
| **applications** | DELETE | – | ✓ (saját) | – | |
| **timesheets** | SELECT | ✓ (saját shift) | ✓ (saját) | – | |
| **timesheets** | INSERT | – | ✓ (clock-in) | – | |
| **timesheets** | UPDATE | ✓ | ✓ | – | |
| **payments** | SELECT | ✓ (saját) | ✓ (saját) | ✓ (összes released) | profiles join |
| **payments** | INSERT | ✓ | – | – | |
| **payments** | UPDATE | ✓ | – | – | |
| **disputes** | SELECT | ✓ (timesheet shift) | ✓ (saját timesheet) | – | |
| **disputes** | INSERT | ✓ (raised_by) | ✓ | – | |
| **disputes** | UPDATE | ✓ | ✓ | – | |
| **reviews** | SELECT | ✓ (reviewee_id, is_public) | ✓ | – | profiles, shifts |
| **reviews** | INSERT | ✓ (createReview) | ✓ | – | |
| **favorites** | SELECT | ✓ | ✓ (worker_id) | – | profiles join |
| **favorites** | INSERT | ✓ | – | – | upsert onConflict: employer_id,worker_id |
| **favorites** | UPDATE | ✓ | – | – | upsert |
| **favorites** | DELETE | ✓ | – | – | |
| **notification_preferences** | SELECT/INSERT/UPDATE | ✓ | – | – | RPC get_or_create + direct |
| **organisations** | SELECT | ✓ (rota) | – | – | |
| **venues** | SELECT | ✓ (rota) | – | – | organisations join |
| **roles** | SELECT | ✓ (rota) | – | – | |
| **venue_roles** | SELECT | ✓ (rota) | – | – | roles join |

**RPC:**  
- `get_or_create_notification_preferences(p_user_id)` – employer settings, SECURITY DEFINER, OK.  
- `update_shift_status_to_in_progress(p_shift_id, p_worker_id)` – worker clock-in, SECURITY DEFINER, OK.

**Storage (services/file-upload.ts):**  
- `employer-profiles`: upload, getPublicUrl – path = `{userId}/profile-...` (javítva: nincs bucket a path-ban).  
- `worker-profiles`: ugyanígy.  
- `employer-documents`: path = `{userId}/cv-...`.  
- Storage policy-k: employer-profiles, employer-documents, worker-profiles (migrations) – első mappa = auth.uid().

---

## 2) Admin flow RLS

- **Megoldás:** Admin = olyan user, akinek a `profiles.user_type = 'admin'`.
- **Policy-k:**  
  - `profiles_update_admin`: UPDATE bármely sor, ha a hívó `user_type = 'admin'`.  
  - `payments_select_admin`: SELECT minden payment, ha a hívó admin.  
- **profiles SELECT:** Már minden authenticated user látja a profilo(ka)t (`profiles_select_authenticated`), ezért az admin keresés és profil megnyitás működik.
- **Beállítás:** Állíts be egy usernél a Supabase Table Editorban (vagy SQL-lel): `UPDATE profiles SET user_type = 'admin' WHERE id = '<admin_user_uuid>';`

---

## 3) RPC függvények

| RPC | SECURITY | Ellenőrizve | Megjegyzés |
|-----|----------|-------------|------------|
| get_or_create_notification_preferences | DEFINER | ✓ | notification_preferences read/insert, OK |
| update_shift_status_to_in_progress | DEFINER | ✓ | timesheets + shifts update, OK |

---

## 4) Upsert konfliktusok

| Hely | Tábla | Conflict target | Javítás |
|------|--------|------------------|---------|
| auth/register.tsx | profiles | id | onConflict: 'id' megadva |
| worker/edit-profile.tsx | profiles | id | már volt onConflict: 'id' |
| employer/review-worker, worker-profile | favorites | employer_id, worker_id | onConflict: 'employer_id,worker_id' megadva |

---

## 5) Táblák RLS lefedettség

| Tábla | RLS | SELECT | INSERT | UPDATE | DELETE |
|-------|-----|--------|--------|--------|--------|
| profiles | ✓ | own + authenticated (+ admin update) | own | own + admin | – |
| shifts | ✓ | employer, worker browse/internal | employer | employer, worker status | employer |
| applications | ✓ | employer via shift, worker own | worker | employer, worker | worker |
| timesheets | ✓ | employer via shift, worker own | worker | employer, worker | – |
| payments | ✓ | employer, worker, admin | employer | employer | – |
| disputes | ✓ | employer via timesheet, worker | both | both | – |
| reviews | ✓ | public/own/about_me | own | own | – |
| favorites | ✓ | employer, worker | employer | employer | employer |
| notification_preferences | ✓ | own | own (+RPC) | own | – |
| notifications | ✓ | own | any/service | own | own |
| organisations, venues, roles, venue_roles, team_members, stb. | ✓ | rota migration | rota | rota | rota |
| invoices | (séma létezik) | – | – | – | Frontend nem használja (invoice adat timesheet-ből jön). |

---

## 6) Storage policy-k

- **employer-profiles:** INSERT/UPDATE/DELETE (saját mappa = auth.uid()), SELECT authenticated.  
- **employer-documents:** INSERT/UPDATE/DELETE/SELECT (saját mappa).  
- **worker-profiles:** INSERT/UPDATE/DELETE/SELECT (saját mappa).  
- **Javítás:** `services/file-upload.ts` – feltöltési path csak `{userId}/...`, nincs bucket név a path-ban, így az RLS (első mappa = auth.uid()) egyezik.

---

## 7) Egy fájl: RUN_THIS_FIX_SUPABASE_SHIFTS.sql

A fájl tartalmazza (sorrendben):

1. SECURITY DEFINER: `get_shift_employer_id`, `worker_can_see_internal_shift`  
2. applications: employer SELECT/UPDATE, worker SELECT/UPDATE/INSERT/DELETE  
3. timesheets: employer SELECT/UPDATE, worker SELECT/UPDATE/INSERT  
4. shifts: employer CRUD, worker browse/internal, worker status update  
5. profiles: SELECT (own + authenticated), UPDATE/INSERT own + admin UPDATE  
6. disputes: employer/worker SELECT/INSERT/UPDATE  
7. payments: employer/worker SELECT, employer INSERT/UPDATE, admin SELECT  
8. Admin: profiles_update_admin, payments_select_admin  
9. Opcionális: teszt shift insert  

Futtatás: Supabase Dashboard → SQL Editor → beillesztés → Run.

---

## 8) Egyéb javítások (frontend / service)

- **services/file-upload.ts:** Storage upload path – bucket név eltávolítva a path-ból (employer-profiles, worker-profiles, employer-documents).  
- **app/employer/review-worker, worker-profile:** favorites upsert `onConflict: 'employer_id,worker_id'`.  
- **app/auth/register.tsx:** profiles upsert `onConflict: 'id'`.

---

## Összefoglalás

- Minden frontend Supabase használat (from, rpc, storage) bejárva és a fenti mátrixban rögzítve.  
- Admin: user_type = 'admin' + profiles_update_admin, payments_select_admin.  
- RPC-ök: SECURITY DEFINER, ellenőrizve.  
- Upsert: profiles (id), favorites (employer_id, worker_id) konfliktus target megadva.  
- RLS: minden használt táblára policy-k a RUN_THIS_FIX-ben vagy korábbi migrációkban.  
- Storage: policy-k megvannak, path javítva a file-upload szolgáltatásban.  
- Egy futtatható fix: `supabase/RUN_THIS_FIX_SUPABASE_SHIFTS.sql`.
