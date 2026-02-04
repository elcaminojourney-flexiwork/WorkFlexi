# FlexiWork v6 - Web PWA

## 🎨 DIZÁJN

| Szín | Arány | Hex |
|------|-------|-----|
| **Lila** | 45% | #7C3AED, #8B5CF6, #A855F7 |
| **Kék** | 35% | #3B82F6, #2563EB, #60A5FA |
| **Fehér/Szürke** | 20% | #FFFFFF, #F8FAFC |

⚠️ **TILOS**: piros, zöld, narancs, sárga színek

---

## 🚀 BUILD

### Windows

```batch
1. Csomagold ki a ZIP-et
2. Nyisd meg a mappát
3. Dupla klikk: BUILD.bat
4. Várd meg (5-10 perc)
5. Eredmény: dist/ mappa + hostinger-upload.zip
```

### Kézi build (ha BUILD.bat nem működik)

```bash
npm install --legacy-peer-deps
npx expo export --platform web
```

---

## 🌐 DEPLOY

### Netlify (ajánlott)

1. Menj ide: https://app.netlify.com/drop
2. Húzd be a `dist` mappát
3. Várj 1-2 percet
4. Kész! Megkapod az URL-t

### Hostinger

1. File Manager → public_html
2. Töröld a régi fájlokat
3. Töltsd fel: `hostinger-upload.zip`
4. Jobb klikk → Extract
5. Töröld a ZIP-et
6. Kész!

---

## 📁 STRUKTÚRA

```
flexiwork/
├── app/                    # Képernyők
│   ├── auth/               # Login, Register
│   ├── worker/             # Worker oldalak
│   ├── employer/           # Employer oldalak
│   └── admin/              # Admin
├── components/             # UI komponensek
├── constants/              # Színek, témák
├── services/               # Supabase szolgáltatások
├── assets/                 # Képek, fontok
├── public/                 # PWA fájlok
├── BUILD.bat               # Build script
└── CHECKLIST.md            # Tesztelési lista
```

---

## ✅ FUNKCIÓK

### Auth
- Login / Register / Password Reset
- Session kezelés (localStorage)
- Onboarding új felhasználóknak

### Worker
- Browse Shifts
- My Shifts
- Applications
- Earnings
- Calendar
- Settings

### Employer
- Post Shift
- My Shifts
- Applications kezelés
- My Team
- Favorites
- Payments
- Rota (beosztás)
- Settings

### Közös
- Notifications
- Rating (5 csillag)
- Profile szerkesztés

---

## 🐛 HIBAELHÁRÍTÁS

| Hiba | Megoldás |
|------|----------|
| "Unexpected token '<'" | Asset útvonalak hibásak - újra kell buildelni |
| Végtelen loading | Supabase timeout - ellenőrizd a netet |
| Fehér képernyő | F12 → Console → nézd a JS hibát |
| 404 refresh után | .htaccess vagy _redirects hiányzik |

---

## 📞 SUPABASE

```javascript
// supabase.js
URL: https://gqhcuwwzjowdplfyizyb.supabase.co
```

---

**Verzió:** 6.0
**Utolsó módosítás:** 2025-02-04
