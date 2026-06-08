# Firebase → Node.js Backend Migratsiyasi

Ushbu loyiha asli Firebase Firestore bilan ishlardi. Endi to'liq Node.js backend
(temiryol-backend) bilan ishlashga moslandi. **Dizayn va sahifa tuzilmasi**
o'zgartirilmagan — faqat data layer almashtirildi.

---

## Nima o'zgardi

### Yangi
- **`lib/api/client.ts`** — REST API klient (fetch + JWT auth)
- **`lib/api/socket.ts`** — Socket.io klient (real-time eventlar)
- **`.env.local.example`** — env namuna

### O'zgartirilgan service'lar (`lib/firebase/*.ts`)
Eski Firestore signaturalari saqlangan — sahifalar va komponentlar kodi
o'zgarmadi. Ichki implementatsiya REST API + Socket.io ga moslandi:

| Servis | Backend endpoint |
|---|---|
| `approval-service.ts` | `/approvals` (active/grant/revoke + socket) |
| `blocked-codes-service.ts` | `/blocked-codes` |
| `staff-service.ts` | `/staff` |
| `admin-codes-service.ts` | `/users` (role=admin) |
| `audit-service.ts` | `/audit-logs` |
| `presence-service.ts` | `/presence` |
| `submissions-service.ts` | `/submissions` |
| `lokomotiv-service.ts` | `/submissions/lokomotiv` |
| `submission-mutations.ts` | `/submissions/:id` PATCH/DELETE |
| `summary-service.ts` | Backend transaction o'zi summary'ni yangilaydi |
| `report-service.ts` | `/submissions` (davriy filter) |
| `firestore-service.ts` (universal CRUD) | `/app-settings/<collection>` |
| `lokomotiv-rusum-service.ts` | `/app-settings/lokomotivRusumlar` |
| `questions-service.ts` | `/app-settings/questions` |
| `variants-service.ts` | `/app-settings/variants:<stationId>` |
| `fuel-record-writer.ts` | no-op (backend submission transaction'i ichida) |

### Yangi backend endpoint
- **`/app-settings/:key`** GET/PATCH/DELETE — generic key/value JSON store.
  Frontend tomondan murakkab settings hujjatlari (lokomotiv rusumlar, dynamic
  questions, per-station variants) shu orqali saqlanadi.

### Auth o'zgarishi
- Firebase Anonymous Auth → **JWT token** (sessionStorage + `localStorage` da `tymr.token`)
- `signInAnonymously` chaqiruvi → no-op
- `active_sessions` Firestore kolleksiyasi → backend `SessionModel`
- Heartbeat → `POST /auth/heartbeat`

### Login flow
- Login sahifasi `app/(auth)/login/page.tsx` — endi to'g'ridan-to'g'ri
  `POST /auth/login-code` chaqiradi (admin va worker uchun yagona endpoint)
- Backend o'zi staff vault va access_codes'ni tekshiradi va JWT qaytaradi
- Bloklangan kodlar tekshiruvi backend ichida

### Real-time
Firestore `onSnapshot` o'rnida Socket.io eventlar:
- `submission.created`, `submission.updated`, `submission.deleted`
- `staff.updated`, `users.updated`, `blocked-codes.updated`
- `presence.updated`
- `app-settings.updated` (har bir kalit uchun)

---

## O'chirilgan

- `firebase`, `firebase/auth`, `firebase/firestore`, `firebase/storage` —
  `package.json` dan butunlay olib tashlandi
- `firestore.rules`, `firestore.indexes.json` — o'chirildi
- `firbase.ts` (root) — bo'sh stub (eski import'lar buzilmasin)
- `lib/firebase/config.ts` — bo'sh stub
- `app/seed/page.tsx` — backend o'zining `npm run seed` CLI buyrug'i bor, sahifa
  ma'lumot uchun saqlandi

---

## Saqlangan

- **Dizayn va UI 100% bir xil** — barcha sahifa va komponentlar o'zgartirilmagan
- `idb` (offline submissions uchun) saqlandi
- `lib/offline/offline-storage.ts` saqlandi
- `lib/hooks/`, `lib/pdf/`, `lib/utils/` to'liq saqlangan
- Service worker (`public/sw.js`) saqlangan
- PWA manifest saqlangan

---

## Boshlash

```bash
# Backend (alohida terminal)
cd backend
npm install
cp .env.example .env       # MONGODB_URI, JWT_SECRET to'ldiring
npm run seed                # admin: 9999, dev: 9998, ~120 worker kod
npm run dev                 # → http://localhost:4000

# Frontend
cd frontend
npm install
cp .env.local.example .env.local
# .env.local da NEXT_PUBLIC_API_URL=http://localhost:4000 ekanini tekshiring
npm run dev                 # → http://localhost:3000
```

Test login kodi: `9999` (admin) yoki `1225` (Toshkent worker).

---

## Deploy

`backend/DEPLOYMENT.md` to'liq ko'rsatma:
1. MongoDB Atlas M0 (transaction uchun replica set kerak)
2. Backend → Render.com
3. Frontend → Vercel (next.config.ts da output: "export" — statik export)

`NEXT_PUBLIC_API_URL` va `NEXT_PUBLIC_SOCKET_URL` env vars frontend'da backend'ga
ishora qilishi shart.
