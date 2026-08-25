# Report Fix — L-10, L-11, L-12 (Catatan Lanjutan C-1/C-2/C-3)

> Tanggal: 2026-08-26
> Plan referensi: `docs/PLAN-L10-L12.md`

## Status: SELESAI

## Yang diubah

### 1. `lib/rate-limit.ts` — refaktor (L-10 + L-11)
- **L-10**: Tambah antarmuka `RateLimitStore` (`get`/`set`) + `setRateLimitStore()`
  untuk swap ke store bersama (Redis/Upstash) tanpa mengubah caller. Default tetap
  `MemoryStore` (perilaku sama); sweep dipindah ke dalam MemoryStore; komentar
  peringatan multi-instance/serverless ditambahkan di header file.
- **L-11**: Fungsi baru `checkRateLimitAll(entries)` pola **two-pass** — Pass 1
  memvalidasi semua kunci tanpa konsumsi, Pass 2 baru mengonsumsi semua slot.
  Request yang ditolak kunci manapun kini tidak membakar slot kunci lain.
- Signature lama `checkRateLimit(key, windowMs?, max?)` **tidak berubah** dan
  kini didelegasikan ke `checkRateLimitAll` — caller login/forgot/verify-request otomatis
  mendapat semantik dua-pass yang lebih adil.

### 2. `app/api/auth/register/route.ts` (L-11)
- Loop manual dua kunci diganti satu panggilan `checkRateLimitAll` dengan pasangan
  kunci yang sama (`register:ip` → 3/jam, `register:email` → 1/10 menit).

### 3. `lib/env.ts` — **file baru** (L-12)
- Sumber tunggal `JWT_SECRET` tervalidasi fail-closed (throw jika kosong).

### 4. `lib/auth.ts` & `lib/mail.ts` (L-12)
- Guard lokal dihapus; keduanya `import { JWT_SECRET } from "@/lib/env"`.
- Bonus konsistensi: sebelumnya auth.ts memakai pola assertion, mail.ts sempat
  versi narrowing — kini identik lewat satu sumber.

## Hasil verifikasi

| Uji | Hasil |
|-----|-------|
| `npx tsc --noEmit` | ✅ exit 0 |
| eslint pada 5 file yang berubah | ✅ exit 0 (1 warning unused-var ditemukan & dirapikan) |
| **L-11**: email sama ×2 → lalu email beda | ✅ 400, 429, lalu **400** — penolakan email tidak membakar slot IP |
| Kuota IP tetap maks 3/jam | ✅ email unik ke-3 setelahnya → **429** |
| Regresi login (default `max=1` lewat refaktor) | ✅ 401 → 429 |
| Smoke `/forgot` (guard env via `lib/env.ts`) | ✅ 404 JSON normal, jalur email tidak rusak |

Pengujian tetap memakai domain `*.invalid-domain.test` — nol akun dibuat, nol email terkirim.
Dev server dimatikan setelah pengujian. **Ingat: jalankan `npm run build` ulang sebelum deploy**
(`npm run start` menyajikan build lama — lihat REPORT-C-2).

## Temuan lain yang terlihat tapi tidak dikerjakan

- Adapter Redis/Upstash belum dibuat (butuh akun/kredensial layanan eksternal);
  antarmukanya sudah siap — tinggal implementasi `RateLimitStore` + `setRateLimitStore()`
  saat keputusan deployment serverless diambil.
