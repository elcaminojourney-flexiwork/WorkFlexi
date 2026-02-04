# FlexiWork v6 - Build Ellenőrző Lista

## 🔧 BUILD ELŐTT

- [ ] Node.js 18+ telepítve (`node -v`)
- [ ] NPM működik (`npm -v`)  
- [ ] package.json létezik a mappában
- [ ] BUILD.bat futtatható

---

## 🏗️ BUILD KÖZBEN

- [ ] `npm install` sikeres (node_modules mappa létrejön)
- [ ] `npx expo export --platform web` sikeres
- [ ] `dist` mappa létrejön
- [ ] `hostinger-upload.zip` létrejön

---

## 🌐 BÖNGÉSZŐBEN TESZTELÉS

### Alap Működés
- [ ] index.html betöltődik (NEM fehér képernyő)
- [ ] NINCS "Unexpected token '<'" hiba a Console-ban
- [ ] NINCS végtelen "Connecting..." / "Loading..." állapot
- [ ] Logo megjelenik bal felső sarokban
- [ ] Gradient háttér látszik (lila-kék)

### Login Oldal
- [ ] /auth/login oldal betölt
- [ ] Email input működik
- [ ] Password input működik
- [ ] "Sign In" gomb kattintható
- [ ] Hibás login → hibaüzenet jelenik meg
- [ ] Sikeres login → átirányítás

### Új Felhasználó Flow
- [ ] Első bejelentkezés → Onboarding oldal
- [ ] Onboarding lépések végigkattinthatók
- [ ] Onboarding végén → Dashboard

### Visszatérő Felhasználó
- [ ] Bejelentkezés → Közvetlen Dashboard (nincs onboarding)
- [ ] Session megmarad refresh után

### Worker Dashboard (/worker)
- [ ] Stat kártyák megjelennek
- [ ] "Browse Shifts" gomb működik
- [ ] "My Shifts" oldal betölt
- [ ] "Applications" lista látható
- [ ] "Earnings" oldal működik
- [ ] "Calendar" naptár megjelenik
- [ ] "Settings" oldal elérhető
- [ ] Back gombok működnek minden oldalon

### Employer Dashboard (/employer)
- [ ] Stat kártyák megjelennek
- [ ] "Post Shift" form működik
- [ ] "My Shifts" lista látható
- [ ] "Applications" kezelés működik
- [ ] "My Team" oldal betölt
- [ ] "Favorites" lista megjelenik
- [ ] "Payments" oldal működik
- [ ] "Rota" naptár működik
- [ ] "Settings" oldal elérhető
- [ ] Back gombok működnek minden oldalon

### Shift Funkciók
- [ ] Post Shift - Új műszak létrehozható
- [ ] Edit Shift - Műszak szerkeszthető
- [ ] Cancel Shift - Törlés confirm dialoggal
- [ ] Apply to Shift - Jelentkezés működik (worker)

### Értékelés (Rating)
- [ ] 5 csillagos rating megjelenik
- [ ] Csillagok kattinthatók
- [ ] Rating mentés működik

### Notifications
- [ ] Értesítések lista betölt
- [ ] Új értesítés jelzés működik (ha van)

### Logout
- [ ] Logout gomb működik
- [ ] Kijelentkezés után → Login oldal
- [ ] Session törlődik (localStorage clear)

---

## 🎨 DIZÁJN ELLENŐRZÉS

- [ ] Minden oldal: Lila-kék gradient háttér
- [ ] Gombok: Lila (#7C3AED) / Kék (#3B82F6) gradient
- [ ] Inputok: Lila keret, fehér háttér
- [ ] Kártyák: Fehér/lila tónusú, árnyékkal
- [ ] **NINCS piros/zöld/narancs/sárga szín**
- [ ] Logo minden oldalon bal felső sarokban

---

## 📱 PWA ELLENŐRZÉS

- [ ] manifest.json betöltődik (DevTools → Application → Manifest)
- [ ] Service Worker regisztrálva (DevTools → Application → Service Workers)
- [ ] PWA ikonok elérhetők (/icons/)
- [ ] "Install" prompt megjelenik (ha támogatott böngésző)

---

## 🚀 DEPLOYMENT ELLENŐRZÉS

### Netlify
- [ ] Drag & drop után betölt
- [ ] Routing működik (refresh nem 404)
- [ ] HTTPS aktív

### Hostinger
- [ ] ZIP feltöltés sikeres
- [ ] Extract sikeres
- [ ] .htaccess működik
- [ ] Routing működik (refresh nem 404)
- [ ] HTTPS aktív

---

## ❌ GYAKORI HIBÁK ÉS MEGOLDÁSOK

### "Unexpected token '<'"
**Ok:** Asset útvonalak hibásak (abszolút helyett relatív kell)
**Megoldás:** Ellenőrizd a dist/index.html-ben, hogy `./assets/` van-e `/assets/` helyett

### Végtelen "Connecting..." / "Loading..."
**Ok:** Supabase connection timeout vagy rossz URL
**Megoldás:** 
1. Ellenőrizd az internet kapcsolatot
2. Ellenőrizd a supabase.js-ben a URL-t
3. Próbáld incognito módban

### Fehér képernyő
**Ok:** JavaScript hiba
**Megoldás:** Nyisd meg a DevTools Console-t (F12) és nézd meg a hibát

### 404 refresh után
**Ok:** SPA routing nincs konfigurálva
**Megoldás:** 
- Netlify: _redirects fájl kell a dist-ben
- Hostinger: .htaccess fájl kell a dist-ben

### PWA nem installálható
**Ok:** manifest.json hibás vagy HTTPS hiányzik
**Megoldás:** 
1. Ellenőrizd a manifest.json-t DevTools-ban (Application tab)
2. Győződj meg róla, hogy HTTPS-en fut

---

## ✅ VÉGSŐ CHECKLIST

- [ ] Minden fenti pont ellenőrizve
- [ ] Nincs hiba a böngésző Console-ban
- [ ] Minden funkció működik
- [ ] Dizájn konzisztens minden oldalon
- [ ] Production URL működik

**Dátum:** ____________
**Tesztelő:** ____________
**Megjegyzések:**

_____________________________________________

_____________________________________________

_____________________________________________
