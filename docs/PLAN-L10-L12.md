# Plan Fix — L-10, L-11, L-12 (Catatan Lanjutan dari Report C-1/C-2/C-3)

> Tanggal: 2026-08-25
> Status plan: ✅ DIAPPROVE USER (dieksekusi langsung atas permintaan eksplisit:
> "Lakukan fix untuk ke-3 itu dengan saranmu sekarang saja")

## Temuan

Tiga catatan lanjutan dari report siklus sebelumnya, dipromosikan menjadi temuan resmi:

- **L-10**: Rate limiter in-memory tidak efektif untuk deployment multi-instance/serverless.
  **Pendekatan fix (sesuai saran)**: refaktor `lib/rate-limit.ts` dengan antarmuka
  `RateLimitStore` (get/set) + fungsi `setRateLimitStore()` — tanpa dependensi baru.
  Default tetap MemoryStore; adapter Redis/Upstash tinggal ditambahkan saat dibutuhkan
  tanpa menyentuh caller. Ditambah komentar peringatan serverless di file.
- **L-11**: Slot IP terkonsumsi meski request ditolak kunci lain.
  **Pendekatan fix**: fungsi baru `checkRateLimitAll(entries)` dengan pola two-pass —
  validasi semua kunci dulu, konsumsi belakangan (atomik karena sinkron/single-threaded).
  Register berpindah ke fungsi ini; `checkRateLimit` lama tetap (delegasi ke versi baru).
- **L-12**: Duplikasi guard `JWT_SECRET` di `lib/auth.ts` dan `lib/mail.ts`.
  **Pendekatan fix**: helper bersama `lib/env.ts` mengekspor `JWT_SECRET` tervalidasi
  fail-closed; kedua modul meng-import dari sana.

## File yang akan diubah

1. `lib/rate-limit.ts` — refaktor store abstraction + `checkRateLimitAll` (L-10, L-11)
2. `app/api/auth/register/route.ts` — pakai `checkRateLimitAll` (L-11)
3. `lib/env.ts` — **file baru**, sumber tunggal `JWT_SECRET` (L-12)
4. `lib/auth.ts` — import dari `lib/env.ts` (L-12)
5. `lib/mail.ts` — import dari `lib/env.ts` (L-12)

Total: **5 file** (1 baru). Tanpa dependensi baru, tanpa perubahan DB/API.

## Risiko & dampak

- Refaktor limiter menjaga signature `checkRateLimit(key, windowMs?, max?)` identik —
  caller login/forgot/verify-request tidak berubah perilaku (diverifikasi test regresi).
- Semantik baru `checkRateLimitAll`: request yang ditolak tidak mengonsumsi slot apapun.
  Untuk register artinya retry email sama tidak lagi mempercepat habisnya kuota IP.
- `lib/auth.ts` & `lib/mail.ts` kini punya dependensi ke `lib/env.ts` (tidak siklik).

## Cara verifikasi

1. `npx tsc --noEmit` + eslint pada semua file yang berubah.
2. Uji L-11 (server segar): email sama ×2 → 400 lalu 429; kemudian email BEDA harus
   masih diproses (400) karena kuota IP tidak ikut terbakar; isi sampai 3 → email ke-4 beda → 429.
3. Regresi login: 401 → 429 (default `max=1` utuh).
4. Smoke `/forgot`: respons JSON normal (guard env via helper tidak merusak jalur email).
