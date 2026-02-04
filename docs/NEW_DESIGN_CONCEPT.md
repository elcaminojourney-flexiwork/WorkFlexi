# FlexiWork – Új dizájnnak teljes koncepciója (referencia képek alapján)

## Általános elv
- Tiszta, modern, kártya-alapú UI: világos háttér, fehér kártyák, lila–kék gradient csak kiemelt elemekre (fejléc, banner, fő gombok).
- **Kivétel:** Bejelentkezési oldalak (login, register, stb.) változatlanok maradnak.
- **Első szabály:** A funkcionalitás nem sérülhet – csak vizuális (stílus, layout) változás.

---

## Globális elemek (minden nem-login oldalon)

### Top bar (fejléc sáv)
- Háttér: fehér.
- Bal: kis logó + opcionális „FlexiWork” szöveg.
- Jobb: cégnév / felhasználó + kerek avatar (lila–kék gradient vagy színes).

### Navigáció (tabok), ha van
- Pill alakú gombok. **Aktív:** lila→kék gradient háttér, fehér szöveg. **Inaktív:** fehér háttér, vékony szürke keret (#E2E8F0), sötétszürke szöveg (#334155).

### Üdvözlő / hero banner (dashboard, profil)
- Teljes szélességű gradient (kék balra → lila jobbra), fehér szöveg (üdvözlés, név, alcím). Opcionális Back balra.

---

## Fő tartalom terület

### Oldal háttér
- Világosszürke (#F8F9FA vagy #F1F5F9).

### Kártyák / panelek
- **Alap:** fehér (#FFFFFF), lekerekített sarkok (16–24px), enyhe szürke árnyék, opcionális vékony szürke keret (#E2E8F0).
- **Kivételek:** infó banner (pl. világoszöld); naptár cella: kék (tele) / sárga szaggatott (nyitott); profil banner = gradient.

### Gombok
- **Fő:** lila→kék gradient, fehér szöveg, lekerekített, enyhe árnyék.
- **Másodlagos:** fehér háttér, vékony szürke keret, sötétszürke szöveg.

### Ikonok és tag-ek
- KPI/stat: színes ikon (kék, lila, zöld, narancs). Státusz: zöld (siker), narancs (figyelmeztetés). Skills: pill, fehér háttér, világoskék keret, kék szöveg.

### Tipográfia és színpaletta
- Címek: félkövér, sötét (#111827, #1E293B). Test: 14–16px, szürke másodlagos (#64748B).
- Gradient: #9333EA → #3B82F6. Kék/lila/semleges/zöld/narancs: DESIGN_SPEC_REFERENCE.md 2.8.

---

## Implementáció
- Központi layout: `ConstitutionalScreen` (theme="light": világosszürke háttér, gradient csak fejlécben).
- Kártyák: `CardWhite`, `PanelPurple`, `PanelBlue` – fehér / enyhe lila–kék, árnyék + keret.
- Login oldalak: nem használják ConstitutionalScreen, nincs változtatás.
