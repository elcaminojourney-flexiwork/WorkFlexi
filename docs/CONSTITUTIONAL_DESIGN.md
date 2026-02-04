# FlexiWork – Alkotmányos dizájnelvárás (Constitutional Design)

**Érvényes spec:** **docs/DESIGN_SPEC_REFERENCE.md** (referencia képek alapján). **Login oldalak változatlanok.** Első szabály: **funkcionalitás nem sérülhet.** A komponens alapértelmezetten „light” theme (világosszürke háttér, fehér kártyák).

Minden **worker** és **employer** oldal (kivéve login) az egységes vizuális rendszert követi.

---

## 1. Háttér (Background)

- **Teljes képernyős gradient** függőlegesen:
  - Felső: **lila** (`#7C3AED`, `#9333EA`, `rgba(139, 92, 246, 0.92–0.95)`)
  - Alsó: **kék** (`#3B82F6`, `#2563EB`, `rgba(59, 130, 246, 0.88–0.92)`)
- **Opcionális**: enyhe, félig átlátszó háttérkép (városkép / épületek), `opacity` ~0.15–0.2, hogy ne legyen lapos a gradient.
- Nincs tiszta fehér vagy szürke teljes oldal háttér.

---

## 2. Fejléc (Header)

- **Gradient sáv** (ugyanaz a lila→kék), a tartalom fölött.
- **Bal**: vissza gomb – fehér nyíl ikon, kerek vagy lekerekített háttér (`rgba(255,255,255,0.2)`).
- **Közép**: oldal címe **fehér**, félkövér (fontWeight 700), kicsit nagyobb betű (pl. 20–22px).
- **Jobb**: opcionális (avatar, ikon, üres hely).
- Padding: felül figyelembe véve a status sávot (web: ~70px, mobil: ~100px), alul ~20px, oldalt ~20px.

---

## 3. Tartalom panelek – színes kék és lila (Content panels)

- **Két panel típus** (váltakozva vagy cél szerint):
  - **Lila panel**: háttér `#FAF5FF`, `#F3E8FF` (purple50/100), enyhe lila szegély vagy árnyék.
  - **Kék panel**: háttér `#EFF6FF`, `#DBEAFE` (blue50/100), enyhe kék szegély vagy árnyék.
- **Fehér kártya** is megengedett: nagy, központi tartalomblokk fehér háttérrel, lekerekített sarkok (pl. 20–24px), enyhe árnyék.
- **Lista sorok** (pl. Beállítások menü):
  - Soronként: bal oldalon **kerek vagy lekerekített ikon doboz** lila vagy kék háttérrel (`#F3E8FF` / `#DBEAFE`), ikon színes (lila/kék).
  - Középen: szöveg sötétszürke/feketés.
  - Jobb oldalon: chevron vagy nyíl (szürke).
  - Vékony elválasztó vonal a sorok között (`#F3F4F6`).

---

## 4. Gombok és CTA

- **Fő gomb** (pl. Bejelentkezés, Logout, Mentés):
  - **Gradient** lila→kék (`#7C3AED` → `#2563EB` vagy `#9333EA` → `#3B82F6`).
  - Szöveg és ikon **fehér**, félkövér.
  - Lekerekített sarkok (pl. 14–16px), enyhe árnyék.
- Másodlagos gomb: lehet outline (lila keret, lila szöveg) vagy világos lila/kék háttér.

---

## 5. Logo és brand

- **Logo** bal felső sarokban: kis doboz fehér vagy majdnem fehér háttérrel, lekerekített sárkok, árnyék. (Egyes oldalakon középen, nagyobb logó is lehet – pl. select-user-type.)
- **Lábléc**: ahol illik (pl. Beállítások), alul középen: **„FlexiWork v1.0.0”** fehér, kisebb betűvel, alacsony kontraszt (`rgba(255,255,255,0.6)`).

---

## 6. Színpaletta – csak ezek

- **Lila**: `#FAF5FF`, `#F3E8FF`, `#E9D5FF`, `#A855F7`, `#9333EA`, `#7C3AED`, `#6D28D9`.
- **Kék**: `#EFF6FF`, `#DBEAFE`, `#BFDBFE`, `#60A5FA`, `#3B82F6`, `#2563EB`, `#1D4ED8`.
- **Semleges**: `#F8FAFC`, `#F1F5F9`, `#E2E8F0`, `#94A3B8`, `#64748B`, `#334155`, `#111827`.
- **Fehér / fekete**: `#FFFFFF`, `#000000`.
- **Színes panelek** = világos lila és világos kék háttér; kiemelések és ikonok sötét lila / sötét kék.

---

## 7. Tipográfia és térköz

- Címek: félkövér (600–700), sötét szöveg (`#111827`, `#1E293B`).
- Test: 14–16px, normál vagy közepes súly, szürke árnyalatok a másodlagos szövegre.
- Konzisztens padding: 16–24px a kártyákon, 12–16px a sorok között.

---

## 8. Összefoglalva

- **Háttér**: mindig gradient (lila→kék) + opcionális enyhe háttérkép.
- **Fejléc**: gradient sáv, fehér vissza + fehér cím.
- **Tartalom**: **színes kék és lila panelek** (világos lila / világos kék háttér) és/vagy fehér kártya.
- **Gombok**: gradient főgomb, fehér szöveg.
- **Lábléc**: „FlexiWork v1.0.0” fehér, alul középen ahol értelmes.
- Nincs tiszta szürke vagy fehér „lapos” oldal – minden képernyő illeszkedik ehhez a vizuális rendszerhez.

---

## 9. Implementációs minta (kód)

- **Wrapper**: minden worker/employer képernyő használja a `components/ConstitutionalScreen.tsx` komponenst.
- **Import**: `import ConstitutionalScreen, { CardWhite, PanelPurple, PanelBlue } from '../components/ConstitutionalScreen';`
- **Loading**: `<ConstitutionalScreen title="…" showBack onBack={…} showLogo><View style={center}><ActivityIndicator color="#FFF" />…</View></ConstitutionalScreen>`
- **Tartalom**: `<ConstitutionalScreen title="…" showBack onBack={…} showLogo showFooter={ha kell}>` + belül `PanelPurple` / `PanelBlue` / `CardWhite` a szekciókhoz.
- **Fő gomb**: `TouchableOpacity` + `LinearGradient` colors={['#7C3AED', '#2563EB']}, fehér szöveg.
- **Beállítások/lábléc**: `showFooter` true → „FlexiWork v1.0.0” megjelenik alul.
