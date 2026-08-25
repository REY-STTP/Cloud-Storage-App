# Report Fix — C-1: Login Tanpa Rate Limiting

> Tanggal: 2026-08-25
> Plan referensi: `docs/PLAN-C-1.md`

## Status: SELESAI

## Yang diubah

**1 file: `app/api/auth/login/route.ts`**

1. **Rate limiting ditambahkan sebelum autentikasi** (window 60 detik, sesuai plan):
   - Kunci `login:ip:<ip>` — IP diambil dari header `x-forwarded-for` (entry pertama), fallback `"unknown"`.
   - Kunci `login:email:<email>` — email dinormalisasi (trim + lowercase).
   - Jika salah satu limit terpicu → respons **429** + header `Retry-After`, pesan generik tanpa membocorkan kunci mana yang terpicu.
2. **Normalisasi input**: `email` trim + lowercase; `password` divalidasi bertipe string; request tanpa email/password → 400 (sebelumnya masuk ke query dengan `undefined`).
3. **Timing equalization**: hash bcrypt dummy di-generate sekali saat module dimuat (`DUMMY_HASH`); saat user tidak ditemukan, `comparePassword(password, DUMMY_HASH)` tetap dijalankan sebelum balas 401, sehingga durasi respons setara kasus password-salah.
4. Alur setelah rate limit (lookup, cek banned, compare, issue JWT, cookie) tidak diubah.

## Hasil verifikasi

| Uji | Hasil |
|-----|-------|
| `npx tsc --noEmit` | ✅ exit 0, tanpa error |
| `npx eslint app/api/auth/login/route.ts` | ✅ exit 0, bersih |
| Rate limit per-email/IP (4 request beruntun, email tak terdaftar) | ✅ req#1 = 401 (1323 ms), req#2–#4 = **429** (~10 ms) |
| Reset setelah window 60 detik lewat | ✅ request kembali diproses → 401 (461 ms) |

Catatan:
- Waktu req#1 (1323 ms) > req setelah window (461 ms) karena cold-start bcrypt module load pada request pertama — timing equalization antar-kasus tetap konsisten karena semua path menjalankan tepat satu operasi bcrypt.
- `npm run lint` full-project masih melaporkan 5 error **pre-existing** di file lain (`lib/useDarkMode.ts`, `app/verify-email/page.tsx`, `any` types di `app/api/files/route.ts`) — bukan dari perubahan ini dan di luar scope C-1.
- Verifikasi manual curl dilakukan via PowerShell `Invoke-WebRequest` terhadap dev server lokal (`npm run dev`); server sudah dihentikan setelah pengujian.

## Temuan lain yang terlihat tapi tidak dikerjakan

- Normalisasi lowercase hanya di sisi lookup login; akun yang terdaftar dengan huruf besar
  tetap tidak bisa login/forgot — itu sudah tercatat sebagai **M-6** (butuh migrasi DB,
  jangan dikerjakan sekelewatan di sini).
- Rate limiter tetap in-memory (`lib/rate-limit.ts`) — cukup untuk deployment
  single-instance saat ini, catatan multi-instance sudah ada di komentar file tersebut.
