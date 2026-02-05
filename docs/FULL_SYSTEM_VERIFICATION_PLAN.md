# FlexiWork PWA – Teljes rendszerellenőrzési terv

Ez a dokumentum a FlexiWork PWA frontend **teljes, kivétel nélküli** rendszerellenőrzési tervét tartalmazza magyar nyelven. Minden képernyő, flow, kifelejtett pont és javasolt ellenőrzés szerepel.

---

## 1. Bevezetés

- **Cél:** A teljes alkalmazás végigtesztelése képernyőnként és funkciónként.
- **Nyelvek:** A terv magyar; a kód- és fájlhivatkozások eredeti formában.
- **Struktúra:** Fejezetek, táblázatok, checklistek.

---

## 2. Terv tartalma – minden képernyő és flow

### 2.1 Auth (hitelesítés)

| # | Képernyő / flow | Fájl | URL / megjegyzés |
|---|------------------|------|-------------------|
| 1 | **Select user type** | `app/auth/select-user-type.tsx` | `/auth/select-user-type` – Worker / Employer választás, továbbítás login-ra. |
| 2 | **Login (átirányító)** | `app/login.tsx` | **URL:** `/login`. Nem tényleges bejelentkező űrlap: azonnal `router.replace('/auth/select-user-type')`. Tehát `/login` → select-user-type. |
| 3 | **Login (tényleges)** | `app/auth/login.tsx` | **URL:** `/auth/login` (vagy role szerint pl. type=worker/employer). Email/jelszó, Supabase signIn, majd redirect employer/worker dashboard-ra. |
| 4 | **Register** | `app/auth/register.tsx` | Regisztráció; vissza/redirect a login vagy select-user-type felé. |
| 5 | **Reset (jelszó)** | `app/auth/reset.tsx` | Jelszó visszaállítás; vissza/redirect. |
| 6 | **Vissza / redirect** | Minden auth képernyőn | Ellenőrizni: vissza gomb és sikeres művelet utáni redirect (pl. login → employer index / worker index) konzisztens. |

**Auth checklist:**

- [ ] Select-user-type megjelenik, Worker/Employer választás után a megfelelő login URL-ra kerül (pl. type paraméter).
- [ ] `/login` megnyitása → azonnal átirányít `/auth/select-user-type`.
- [ ] `/auth/login` (és role-specifikus) megjelenik, bejelentkezés után a megfelelő dashboard-ra kerül a felhasználó.
- [ ] Register és Reset flow működik; vissza gombok és redirectek helyesek.

---

### 2.2 Employer – minden képernyő és fő funkciók

Alap útvonalak: `app/employer`, `app/employer/rota`, `app/employer/organisation`, `app/employer/settings`, `app/employer/timesheet`, `app/employer/payment`, `app/employer/shift`, stb.

| # | Képernyő / funkció | Fájl / útvonal | Ellenőrzendő |
|---|--------------------|----------------|--------------|
| 1 | **Employer dashboard** | `app/employer/index.tsx` | Vissza (ha van), fő menü/linkek: Post Shift, Applications, Payments, My Shifts, Profile, Notifications, Favorites, My Team, Organisation, Rota. |
| 2 | **Post Shift** | `app/employer/post-shift.tsx` | Létrehozás, mentés, redirect/listafrissítés. |
| 3 | **Applications** | `app/employer/applications.tsx` | Jelentkezések listája, elfogadás/elutasítás (ahol van). |
| 4 | **Payments** | `app/employer/payments.tsx` | Fizetések listája. |
| 5 | **My Shifts** | `app/employer/my-shifts.tsx` | Shift lista; belépés shift részletekre. |
| 6 | **Shift details** | `app/employer/shift/[shiftId].tsx` | Részletek, állapot, booked worker, gombok. |
| 7 | **Edit shift** | `app/employer/edit-shift.tsx` (vagy link a shift detailból) | Szerkesztés, mentés, vissza. |
| 8 | **Cancel shift** | (lásd külön alfejezet) | `app/employer/shift/[shiftId].tsx` – feltétel (nincs booked worker), megerősítés, status cancelled, utána refresh/redirect. |
| 9 | **Timesheet** | `app/employer/timesheet/[timesheetId].tsx` | Időnyilvántartás megtekintés. |
| 10 | **Dispute** | `app/employer/timesheet/dispute.tsx`, `app/employer/timesheet/dispute/[disputeId].tsx` | Vita listája / vita részletek. |
| 11 | **Invoice** | `app/employer/timesheet/[timesheetId]/invoice.tsx` | Számla megtekintés. |
| 12 | **Payment summary** | `app/employer/timesheet/[timesheetId]/payment-summary.tsx` | Fizetés összesítő. |
| 13 | **Review worker** | `app/employer/review-worker/[timesheetId].tsx` | Munkavállaló értékelése. |
| 14 | **Worker profile** | `app/employer/worker-profile.tsx` (vagy paraméterezett) | Munkavállaló profil megtekintés. |
| 15 | **Profile** | `app/employer/profile.tsx` | Employer profil. |
| 16 | **Edit profile** | `app/employer/edit-profile.tsx` | Profil szerkesztés, mentés. |
| 17 | **Notifications (lista/beállítások – 1)** | `app/employer/notifications.tsx` | **Lásd külön alfejezet:** lokál state, nem perzisztál (két notification képernyő külön). |
| 18 | **Notifications (beállítások – 2)** | `app/employer/settings/notifications.tsx` | **Lásd külön alfejezet:** RPC + `notification_preferences`; perzisztált beállítások. |
| 19 | **Favorites** | `app/employer/favorites.tsx` | Kedvencek listája. |
| 20 | **My Team** | `app/employer/my-team.tsx` | Csapat áttekintés (nem rota team). |
| 21 | **Organisation** | `app/employer/organisation/index.tsx` | Szervezet adatok. |
| 22 | **Rota** | `app/employer/rota/index.tsx` | Rota főoldal. |
| 23 | **Rota settings** | `app/employer/rota/settings.tsx` | Rota beállítások. |
| 24 | **Rota add-shift** | `app/employer/rota/add-shift.tsx` | Új shift hozzáadása a rotához. |
| 25 | **Rota shift detail** | `app/employer/rota/shift/[shiftId].tsx` | Rota shift részletek. |
| 26 | **Rota team (lista)** | `app/employer/rota/team/index.tsx` | Team tagok listája; `organisationId` paraméter. |
| 27 | **Rota team tag részletek** | `app/employer/rota/team/[id].tsx` | Team tag adatlap (útvonal: `/employer/rota/team/[id]`; a listából `router.push(.../team/${member.id}?organisationId=...)`). |

**Employer – visszagomb (ConstitutionalScreen / custom back):**

- Minden fenti képernyőn ellenőrizni: `showBack` és `onBack` konzisztencia (ConstitutionalScreen vagy custom header vissza).
- Path paraméterek: `from`, `shiftId`, `organisationId`, stb. – ahol használatban vannak, normalizálás és helyes továbbítás.

---

### 2.3 Cancel shift – részletesen

| Elem | Leírás |
|------|--------|
| **Hol van** | `app/employer/shift/[shiftId].tsx` – „Cancel Shift” gomb. |
| **Feltétel** | Csak akkor engedélyezett, ha **nincs booked worker** (`!hasBookedWorker`). Ha van booked worker, alert: „A worker is already booked...”. |
| **Megerősítés** | `Alert.alert('Cancel Shift', 'Are you sure...', [No, Yes, Cancel])` – destructív opció. |
| **Művelet** | `shifts` tábla: `status: 'cancelled'`, `cancelled_at` beállítása; `.eq('employer_id', user.id)` biztonsági ellenőrzés. |
| **Utána** | Sikeres cancel → `Alert.alert('Success', ...)` → OK gombra `router.replace('/employer/my-shifts')`. |
| **UI** | A „Cancel Shift” gomb csak akkor jelenik meg, ha `shift.status !== 'cancelled' && shift.status !== 'completed'` és nincs booked worker (a kódban `hasBookedWorker` szerint). |

**Checklist:**

- [ ] Cancel gomb csak „no booked worker” esetén kattintható.
- [ ] Megerősítés megjelenik; „Yes, Cancel” után a shift cancelled lesz.
- [ ] Redirect `/employer/my-shifts`-re történik.
- [ ] Oldal frissítése / lista már cancelled státuszt mutat.

---

### 2.4 Worker – minden képernyő és fő funkciók

| # | Képernyő / funkció | Fájl / útvonal | Ellenőrzendő |
|---|--------------------|----------------|--------------|
| 1 | **Worker dashboard** | `app/worker/index.tsx` | Vissza, fő linkek: Browse Shifts, My Shifts, Earnings, Profile, Onboarding, KYC, Calendar, Settings. |
| 2 | **Browse Shifts** | `app/worker/browse-shifts.tsx` | Shift böngészés, szűrés. |
| 3 | **Apply** | (browse vagy shift detail) | Jelentkezés shiftre. |
| 4 | **My Shifts** | `app/worker/my-shifts.tsx` | **Külön pont:** Open / In Progress / Completed / **Cancelled** tabok; cancelled és completed shift megjelenés és szövegek (lásd alfejezet). |
| 5 | **Cancel application** | (My Shifts vagy Applications) | Jelentkezés visszavonása. |
| 6 | **Clock in/out** | (shift detail / timesheet) | Be/ki óráázás. |
| 7 | **Earning(s)** | `app/worker/earnings.tsx`, `app/worker/earning/[paymentId].tsx` | Keret és egy fizetés részlete. |
| 8 | **Review employer** | `app/worker/review-employer/[timesheetId].tsx` | Munkáltató értékelése. |
| 9 | **Profile** | `app/worker/profile.tsx` | Worker profil. |
| 10 | **Edit profile** | `app/worker/edit-profile.tsx` | Profil szerkesztés. |
| 11 | **Onboarding** | `app/worker/onboarding.tsx` | Onboarding flow. |
| 12 | **Employee onboarding** | `app/worker/employee-onboarding.tsx` | Alkalmazotti onboarding. |
| 13 | **KYC** | `app/worker/kyc-upgrade.tsx` | KYC frissítés. |
| 14 | **Calendar** | `app/worker/calendar.tsx` | Naptár, shift státuszok (pl. cancelled szín/szöveg). |
| 15 | **Earnings** | (fent) | Lista + egy elem részlete. |
| 16 | **Settings** | `app/worker/settings.tsx` | Beállítások. |
| 17 | **Shift detail** | `app/worker/shift/[shiftId].tsx` | Shift részletek, clock in/out, státusz. |
| 18 | **Timesheet earning** | `app/worker/timesheet/[timesheetId]/earning.tsx` | Időnyilvántartás / kereset. |

**Worker – My Shifts: cancelled / completed**

- **Completed:** a „Completed” tab mutatja a lezárt shifteket; szövegek és megjelenés ellenőrizendő.
- **Cancelled:** a „Cancelled” tab csak olyan elemeket mutat, ahol `item.status === 'cancelled'`; üzenet pl. „You don't have any cancelled shifts.” ha üres.
- Adatbetöltés: applications/timesheets/payments kapcsolat szerint; status a „source of truth” a tabokhoz.

**Checklist:**

- [ ] My Shifts: Open / In Progress / Completed / Cancelled tabok megfelelően szűrnek.
- [ ] Cancelled shift megjelenik a Cancelled tabban; üres állapot szövege helyes.
- [ ] Completed shift megjelenik és szövegek érthetők.

---

### 2.5 Admin

| # | Képernyő | Fájl | Ellenőrzendő |
|---|-----------|------|--------------|
| 1 | **Admin login** | `app/admin/login.tsx` | Bejelentkezés admin szerepkörrel. |
| 2 | **Profile selector** | `app/admin/profile-selector.tsx` | Profil (felhasználó) választás. |
| 3 | **Manage profile** | `app/admin/manage-profile.tsx` | Profil kezelés. |
| 4 | **Revenue** | `app/admin/revenue.tsx` | Bevétel megtekintés. |
| 5 | **Vissza** | Ahol van | Back/redirect konzisztencia. |

---

### 2.6 Központi komponens: ConstitutionalScreen

| Ellenőrzés | Leírás |
|------------|--------|
| **showBack** | Ha true, a fejlécben vissza gomb jelenik meg. |
| **onBack** | Kötelező megadni, ha showBack true (különben kattintás üres). Konzisztencia: minden képernyőn ahol showBack, ott onBack (pl. `router.back()` vagy konkrét replace). |
| **Path paraméterek** | A `from`, `shiftId`, `organisationId`, `timesheetId` stb. használata: normalizálás (pl. string, optional), és helyes továbbítás a következő képernyőkre. |

**Komponens helye:** `components/ConstitutionalScreen.tsx`; az `app/components/ConstitutionalScreen.tsx` re-exportálja.

---

### 2.7 Services – rövid ellenőrzési lista

| Service | Ellenőrzendő |
|---------|--------------|
| **notifications** | Értesítések küldése/olvasás (ahol az app használja); employer settings/notifications RPC (`get_or_create_notification_preferences`). |
| **reviews** | Értékelés létrehozás/lekérés (employer review worker, worker review employer). |
| **file-upload** | Feltöltés: path kezelés; **deleteFile** létezik (bucket, filePath) – **nincs UI a törlésre** (opcionális ellenőrzés, hogy hívja-e valami). |
| **payments** | Escrow / finalize; **mock mód** (PAYMENTS MOCK logok) – ellenőrizni, hogy teszt során a várt mock viselkedés történik-e. |
| **organisations** | Szervezet CRUD / lekérdezés. |
| **team** | Team tagok (invite, list, resend, terminate); rota team lista és team/[id] adatlap. |
| **rota** | Rota shift műveletek, allocációk. |

---

## 3. Kifelejtett pontok beépítése

### 3.1 (tabs) – (tabs)/index és (tabs)/explore

| Pont | Leírás |
|------|--------|
| **Útvonalak** | `(tabs)/index` → Home, `(tabs)/explore` → Explore. |
| **Megjelenés** | Tab layout: Home és Explore tab; weben WebNavbar (Home → `/(tabs)`, Explore → `/(tabs)/explore`). |
| **Fő flow** | Az alkalmazás **nem** ezen keresztül indul: `app/index.tsx` → `Redirect href="/auth/select-user-type"`. Tehát a fő flow (auth → employer/worker) **nem** használja a (tabs) képernyőket. |
| **Ellenőrzés** | (tabs) megjelenik, ha közvetlenül `/(tabs)` vagy `/(tabs)/explore` URL-t nyitunk; a fő flowtól független. Megjegyezni a tervben: fő flow nem használja. |

---

### 3.2 +not-found (404)

| Pont | Leírás |
|------|--------|
| **Fájl** | `app/+not-found.tsx` |
| **Megjelenés** | „This screen does not exist.” + „Go to home screen!” link. |
| **Link** | `<Link href="/">` – a „Go to home screen!” a gyökérre visz (ami továbbirányít `/auth/select-user-type`-ra). Ellenőrizni: kattintásra nem marad 404. |
| **Kód javítás** | A StyleSheet-ben volt `Platform.OS === 'web'` hivatkozás a `logoBox` stílusban; **Platform** nem volt importálva. **Javítva:** `Platform` hozzáadva az importhoz (`import { StyleSheet, Platform } from 'react-native'`). |

---

### 3.3 Root loading (_layout font loading)

| Pont | Leírás |
|------|--------|
| **Fájl** | `app/_layout.tsx` |
| **Font** | `useFonts({ SpaceMono: require(...) })` |
| **Timeout** | `FONT_LOAD_TIMEOUT_MS = 5000` – ha 5 másodpercig nem tölt be a font, `fontTimeout = true` → `ready = loaded || fontTimeout` → nem végtelen loading. |
| **Ellenőrzés** | Nincs végtelen loading: vagy a font betölt, vagy timeout után az app tovább fut. |

---

### 3.4 Két notification képernyő (employer)

| Képernyő | Útvonal | Adat | Perzisztencia |
|----------|---------|------|----------------|
| **Employer notifications (lista/általános)** | `app/employer/notifications.tsx` | Lokál state (pl. newApplications, shiftUpdates, systemAlerts, marketing) – Switch-ek. | **Nem perzisztál** – nincs RPC/DB mentés. |
| **Employer settings notifications** | `app/employer/settings/notifications.tsx` | RPC: `get_or_create_notification_preferences`, tábla: `notification_preferences`. | **Perzisztál** – mentés Supabase-ba. |

Egyértelműen külön kezelni a tervben és a teszt során: melyik csak UI demo, melyik valódi beállítás.

---

### 3.5 Cancel shift

Lásd **2.3 Cancel shift – részletesen**.

---

### 3.6 Storage delete (deleteFile)

| Pont | Leírás |
|------|--------|
| **Funkció** | `services/file-upload.ts` – `deleteFile(bucket: string, filePath: string): Promise<boolean>`. |
| **UI** | **Nincs** olyan képernyő vagy gomb, ami a fájl törlését hívja (pl. profilképek törlése). |
| **Ellenőrzés** | Opcionális: kódban megállapítani, hogy a deleteFile sehol nincs meghívva; a tervben rögzítve: „deleteFile létezik, UI nincs”. |

---

### 3.7 Login: app/login vs app/auth/login és URL-k

| Fájl | URL | Szerep |
|------|-----|--------|
| `app/login.tsx` | `/login` | Redirect oldal: azonnal `router.replace('/auth/select-user-type')`. |
| `app/auth/login.tsx` | `/auth/login` (és role paraméterek) | Tényleges bejelentkező űrlap; Supabase signIn; redirect employer/worker felé. |

A tervben és a tesztben mindkét URL külön ponttal szerepel.

---

### 3.8 Worker My Shifts: cancelled / completed

Lásd **2.4 Worker – My Shifts: cancelled / completed**.

---

### 3.9 Rota team: team/[id] útvonal

| Eredeti probléma | A listában a kártya `router.push(\`/employer/rota/team/${member.id}?organisationId=...\`)` – korábban **nem** létezett `team/[id].tsx` → 404. |
| **Megoldás** | Létrehozva: `app/employer/rota/team/index.tsx` (lista – korábbi team.tsx tartalma), `app/employer/rota/team/[id].tsx` (tag adatlap). A régi `app/employer/rota/team.tsx` törölve. A rota layout-ban regisztrálva: `Stack.Screen name="team/[id]"`. |
| **Ellenőrzés** | Rota → Team → tag kártyára kattintás → megnyílik a tag részletek képernyő (nem 404). |

---

## 4. Kód javítások (végrehajtva / javaslat)

| # | Javítás | Státusz |
|---|---------|--------|
| 1 | **+not-found.tsx:** StyleSheet a `Platform.OS`-t használta import nélkül. **Végrehajtva:** `Platform` hozzáadva: `import { StyleSheet, Platform } from 'react-native'`. | Kész |
| 2 | **Rota team:** A push hibás volt (nem létező route). **Végrehajtva:** Létrehozva `app/employer/rota/team/` mappa, `index.tsx` (lista), `[id].tsx` (tag adatlap); törölve a régi `team.tsx`; layout-ban `Stack.Screen name="team/[id]"`. | Kész |

---

## 5. Összefoglaló checklistek

### 5.1 Végigtesztelési sorrend (ajánlott)

1. **Auth:** select-user-type → login (auth) → register / reset; vissza és redirectek.
2. **Employer:** dashboard → Post Shift → My Shifts → Shift detail → Edit shift → **Cancel shift** (feltétel, megerősítés, redirect) → Applications → Payments → Timesheet (részletek, dispute, invoice, payment-summary) → Review worker → Worker profile → Profile → Edit profile → **Employer notifications** (notifications.tsx) → **Employer settings/notifications** (settings/notifications.tsx) → Favorites → My Team → Organisation → Rota (index, settings, add-shift, shift detail, **team lista**, **team/[id]**).
3. **Worker:** dashboard → Browse Shifts → Apply → My Shifts (Open, In Progress, **Completed**, **Cancelled** tabok és szövegek) → Cancel application → Clock in/out → Earnings → Review employer → Profile → Edit profile → Onboarding → Employee onboarding → KYC → Calendar → Settings.
4. **Admin:** login → profile-selector → manage-profile → revenue; vissza.
5. **Közös:** +not-found megjelenik, „Go to home screen!” működik; root _layout betöltés (nincs végtelen loading); (tabs) megjelenik és hogy a fő flow nem használja.

### 5.2 Funkció-szintű checklist

- [ ] **Visszagomb** – minden képernyőn ahol kell (ConstitutionalScreen showBack/onBack vagy custom back).
- [ ] **Post Shift** – létrehozás, mentés, megfelelő redirect/listafrissítés.
- [ ] **Notifications** – employer/notifications (lokál) vs employer/settings/notifications (RPC, perzisztált) külön tesztelve.
- [ ] **Team** – employer/rota/team lista és team/[id] tag adatlap; nincs 404.
- [ ] **Rating / review** – employer review worker, worker review employer.
- [ ] **Cancel shift** – feltétel (no booked worker), megerősítés, status cancelled, redirect my-shifts.
- [ ] **Cancel application** – worker jelentkezés visszavonása.
- [ ] **Dispute** – employer timesheet dispute list és detail.
- [ ] **Payments** – employer payments lista; mock flag / PAYMENTS MOCK viselkedés (ahol releváns).
- [ ] **Rota** – index, settings, add-shift, shift detail, team lista, team/[id].
- [ ] **Auth** – select-user-type, app/login redirect, app/auth/login, register, reset; redirectek.
- [ ] **Profile** – employer és worker profile + edit profile.
- [ ] **File upload** – feltöltés működik; deleteFile létezik, UI nincs (opcionális).
- [ ] **Favorites** – employer favorites lista.
- [ ] **Applications** – employer applications; worker apply/cancel application.
- [ ] **Worker My Shifts** – cancelled/completed megjelenés és szövegek.
- [ ] **+not-found** – 404 megjelenik, „Go to home screen!” link működik; Platform import javítva.
- [ ] **Root loading** – nincs végtelen loading (font timeout).
- [ ] **(tabs)** – (tabs)/index és (tabs)/explore megjelenik; fő flow nem használja.

---

*Dokumentum vége. Ez a teljes, kivétel nélküli rendszerellenőrzési terv a FlexiWork PWA projekthez.*
