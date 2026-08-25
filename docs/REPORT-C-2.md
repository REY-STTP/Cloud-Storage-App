# Report Fix — C-2: Register Tanpa Rate Limiting

> Tanggal: 2026-08-25
> Plan referensi: `docs/PLAN-C-2.md`

## Status: SELESAI

## Yang diubah

### 1. `lib/rate-limit.ts` (ekstensi backward-compatible)
- Value bucket berubah dari `number` (expiry) menjadi `{ expiresAt, count }`.
- Signature baru: `checkRateLimit(key, windowMs = 60_000, max = 1)`.
  - `max` = jumlah slot per jendela; request pertama membuka jendela.
  - Default `max = 1` → perilaku identik dengan implementasi lama; caller existing
    (login C-1, forgot, verify-request) tidak berubah.
- `sweep()` dan `retryAfterSeconds` menyesuaikan struktur baru.

### 2. `app/api/auth/register/route.ts`
- Import `checkRateLimit`; pengecekan dipasang **setelah** validasi field dasar,
  **sebelum** query DB pertama dan validasi domain email (sesuai plan).
- Dua kunci:
  - `register:ip:<ip>` → window 1 jam, `max: 3`
  - `register:email:<email lowercase>` → window 10 menit, `max: 1`
- Ditolak → **429** + header `Retry-After`, pesan generik.

## Hasil verifikasi

| Uji | Hasil |
|-----|-------|
| `npx tsc --noEmit` | ✅ exit 0 |
| `npx eslint lib/rate-limit.ts app/api/auth/register/route.ts` | ✅ exit 0 |
| Kunci IP — 4 register email unik | ✅ 400, 400, 400, **429** (maks 3/jam terbukti) |
| Kunci email — email sama 2× (server segar) | ✅ 400 lalu **429** (maks 1/10 menit) |
| Email berbeda setelah kuota IP habis | ✅ **429** oleh kunci IP (kunci bekerja independen) |
| Regression login (`max=1` default) | ✅ 401 lalu **429** — perilaku C-1 tidak berubah |

Catatan proses verifikasi:
- Pengujian memakai domain `*.invalid-domain.test` sehingga **tidak ada akun dibuat**
  di DB dan tidak ada email terkirim (rate limit sengaja dipasang sebelum validasi domain).
- Percobaan awal via `npm run start` menyajikan build lama tanpa fix — diverifikasi
  dan dialihkan ke dev server untuk pengujian kode terbaru. Server sudah dimatikan
  setelah pengujian. **Penting sebelum deploy: jalankan `npm run build` ulang.**

## Temuan lain yang terlihat tapi tidak dikerjakan

- Slot IP tetap terkonsumsi meski request kemudian ditolak kunci lain (limiter
  berjalan berurutan per kunci). Ini by-design fixed-window limiter sederhana;
  dampaknya minim untuk kasus register.
- Password policy masih lemah (temuan **H-2**, siklus terpisah, route yang sama).
- Normalisasi lowercase hanya untuk kunci rate limit; penyimpanan/lookup email
  belum lowercase penuh (temuan **M-6**).
