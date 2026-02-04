# FlexiWork – Új alkotmányos dizájn (referencia képek alapján)

**Érvényes szabály:** Csak a bejelentkezési (login) oldalak dizánja marad változatlan. Minden más worker/employer oldal ezt a referenciadizájnt követi.

**Első számú szabály:** A funkcionalitás nem sérülhet – csak vizuális (stílus) változtatások.

---

## 1. Referenciaképek összefoglalva

| Kép | Oldal | Fő jellemzők |
|-----|--------|----------------|
| 1 | Employer Dashboard | Fehér top bar, pill tabok (aktív = gradient), üdvözlő gradient banner, fehér KPI kártyák árnyékkal, fehér shift kártyák, Quick Actions (gradient + fehér gombok) |
| 2 | Create Roster | Ugyanaz a fejléc/nav, fehér tartalom, fehér panelek (Roster Details, Calendar), kék/sárga cellák a naptárban |
| 3 | Gig Platform | Kereső + szűrők, pill sub-tabok, fehér „Post Gig Shift” kártya, fehér jelentkezési kártyák, gradient Accept gomb |
| 4 | Worker Profile | Gradient profil banner (név, kép, Add to Favourites), fehér stat kártyák (4 db), Bio, Skills tag-ek (kék keret) |
| 5 | Timesheet Approval | Zöld infó banner, fehér timesheet kártyák, gradient Approve gomb, outline Request Edit |

---

## 2. Központi vizuális szabályok

### 2.1 Oldal háttér
- **Fő tartalom háttér:** világosszürke (`#F8F9FA`, `#F1F5F9`), nem teljes képernyős gradient.
- **Gradient** csak: fejléc sáv, üdvözlő banner, profil banner (ha van) – vízszintes lila→kék.

### 2.2 Top bar / Fejléc
- **Háttér:** fehér vagy enyhe gradient (nav részen).
- **Bal:** logo (kis ikon) + opcionális szöveg (pl. „FlexiWork”).
- **Jobb:** cégnév / felhasználó + kerek avatar (gradient vagy színes).
- **Navigáció (ahol van tab):** pill alakú gombok, lekerekített:
  - **Aktív tab:** lila→kék gradient háttér, fehér szöveg.
  - **Inaktív tab:** fehér háttér, vékony szürke keret (`#E2E8F0`), sötétszürke szöveg (`#334155`).

### 2.3 Üdvözlő / Banner (dashboard, profil)
- Teljes szélességű **gradient** (kék balra → lila jobbra), fehér szöveg (üdvözlés, név, alcím).

### 2.4 Tartalom kártyák (panels)
- **Alap:** fehér háttér (`#FFFFFF`), lekerekített sarkok (16–24px), **enyhe árnyék** (szürke, pl. `shadowColor: '#000'`, `shadowOpacity: 0.06–0.08`, `shadowRadius: 12–16`).
- **Keret:** vékony, világosszürke (`#E2E8F0` vagy `#F1F5F9`) opcionális; a referenciákon főleg árnyék különbözteti meg.
- **Kivétel:** infó banner (pl. „Instant Gig Worker Payments”) lehet világoszöld vagy világoskék háttér; naptár cellák kék (tele) / sárga szaggatott (nyitott).

### 2.5 Gombok
- **Fő (primary):** lila→kék gradient, fehér szöveg, lekerekített (14–16px), enyhe árnyék.
- **Másodlagos (secondary):** fehér háttér, vékony szürke keret, sötétszürke szöveg, lekerekített.

### 2.6 Ikonok és tag-ek
- **KPI / stat ikonok:** színes (kék, lila, zöld, narancs) kis dobozban vagy mellé.
- **Státusz tag:** zöld (pl. „Fully Filled”), narancs (pl. „Slots Open”), kék (pl. „Employee”).
- **Skills tag:** fehér háttér, világoskék keret, kék szöveg, pill alak.

### 2.7 Tipográfia
- Címek: félkövér (600–700), sötét (`#111827`, `#1E293B`).
- Test: 14–16px, szürke árnyalatok másodlagos szövegre (`#64748B`, `#94A3B8`).

### 2.8 Színpaletta (referencia szerint)
- **Gradient:** `#6B46C1` → `#4C51BF`, vagy `#9333EA` → `#3B82F6`.
- **Kék:** `#DBEAFE`, `#BFDBFE`, `#3B82F6`, `#2563EB`.
- **Lila:** `#F3E8FF`, `#E9D5FF`, `#7C3AED`, `#6D28D9`.
- **Semleges:** `#F8F9FA`, `#F1F5F9`, `#E2E8F0`, `#94A3B8`, `#64748B`, `#334155`, `#111827`.
- **Siker / figyelmeztetés:** zöld (`#D1FAE5`, `#059669`), narancs (`#FFEDD5`, `#EA580C`).

---

## 3. Implementációs irányok (funkcionalitás megmarad)

1. **ConstitutionalScreen:** Támogatni „light” módot: világosszürke háttér, fehér fejléc sáv (vagy gradient csak a bannerben), tartalom alatta.
2. **Kártyák:** Alapértelmezetten fehér kártya + árnyék (+ opcionális vékony szürke keret); ahol értelmes, világos kék/lila/zöld csak kiemelésre (pl. infó banner, státusz).
3. **Gombok:** Primary = gradient; secondary = outline (fehér + szürke keret).
4. **Login oldalak:** Nincs változtatás – kivétel az új alkotmányos szabály alól.
5. **Navigáció:** Ahol tab/fül van, pill stílus: aktív = gradient, inaktív = fehér + keret.
6. **Minden meglévő útvonal, state, eseménykezelő, adatlekérés változatlan marad.**
