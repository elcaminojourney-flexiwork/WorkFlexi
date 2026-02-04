# FlexiWork – Funkcionális teszt checklist

Ez a dokumentum a kritikus user flow-k manuális ellenőrzésére szolgál.

## Előfeltételek

- Bejelentkezett employer vagy worker (vagy teszt fiók).
- Supabase backend elérhető; ha a backend 500-at ad, egyes oldalak üres adattal vagy hibaüzenettel jelenhetnek meg (a frontend nem marad végtelen loading-on).

---

## Employer – Általános

| # | Lépés | Elvárás |
|---|--------|--------|
| 1 | Nyisd meg az employer dashboardot (`/employer`) | Betölt, üdvözlő szöveg, menü (Post Shift, My Shifts, Rota, stb.). Ha a `shifts` lekérdezés 500-at ad, a stat számok 0-k lehetnek, de a lap látszik. |
| 2 | Kattints a **Rota** menüpontra | **Korábbi hiba javítva:** Ha nincs `venueId`, nem marad „Loading rota…” – „Select a venue” üzenet és „My Organisations” gomb jelenik meg. |
| 3 | Kattints **My Organisations** | Organisation lista vagy „Create New Organisation” flow. |
| 4 | Organisation → Create org → Add venue → „Go to Rota” | Rota megnyílik `?venueId=...`-vel; naptár / üres hét látható (vagy hiba, ha a backend RPC/DB hiányzik). |
| 5 | Rota: Add Shift | Add shift űrlap megnyílik (datum, idő, role, stb.). |
| 6 | Rota: egy shift kártyára kattintás | Shift detail oldal (`/employer/rota/shift/[shiftId]`) megnyílik. |
| 7 | Rota: fogaskerék ikon (Settings) | Rota Settings oldal megnyílik. |

---

## Employer – Egyéb oldalak

| # | Oldal / flow | Ellenőrizendő |
|---|----------------|----------------|
| 8 | Post Shift | Lépések 1–4, mentés (ha backend engedi). |
| 9 | My Shifts | Lista betölt (vagy üres). |
| 10 | Applications | Lista betölt. |
| 11 | Favorites, Payments, Profile, Settings | Oldal megnyílik, nincs fehér képernyő. |
| 12 | Timesheet detail, Dispute, Review worker, Invoice, Payment summary | Megnyílik a megfelelő employer oldal (ConstitutionalScreen). |

---

## Worker

| # | Oldal / flow | Ellenőrizendő |
|---|----------------|----------------|
| 13 | Worker dashboard | Betölt, menü. |
| 14 | Browse shifts, My shifts, Calendar | Lista/naptár megjelenik vagy üres state. |
| 15 | Shift detail, Apply, Earnings | Navigáció és űrlapok működnek. |

---

## Backend / hibahelyzetek

- **500 Internal Server Error (pl. Supabase `shifts` vagy RPC):** A frontend most már kezeli: rota hiányzó `venueId` esetén nem végtelen a loading; employer index stat lekérdezések hibája nem akadályozza a dashboard megjelenítését.
- **Rota:** Ha a `get_weekly_rota` RPC nincs a Supabase-ben, a rota lap (venueId-vel) hibát jelez, de a loading véget ér.
- **Routing:** A rota layout csak létező képernyőket deklarál (index, add-shift, shift/[shiftId], team, settings); a „No route named shift/[shiftId]” és „Too many screens” figyelmeztetések megszűntek.

---

## Automatikus ellenőrzés

- Futtasd: `node scripts/check-routes-and-lint.js` – ellenőrzi, hogy a kritikus route fájlok léteznek-e.
- Futtasd: `npm run lint` – kódminőség.
