# Plan Fix — C-2: Register Tanpa Rate Limiting

> Tanggal: 2026-08-25
> Status plan: ⏳ MENUNGGU APPROVE

## Temuan (ringkas dari AUDIT-REPORT.md)

`app/api/auth/register/route.ts` tidak memanggil `checkRateLimit()` sama sekali
(terkonfirmasi via grep — hanya `/forgot` dan `/verify-request` yang memakainya).
Dampak: bot signup massal, abuse SMTP (setiap registrasi sukses mengirim email
verifikasi → risiko domain masuk blacklist), dan polusi tabel `users`.

**Scope siklus ini**: HANYA rate limiting. Penguatan password policy adalah temuan
terpisah (H-2) yang akan dikerjakan di siklus sendiri, meski menyentuh route yang sama.

## File yang akan diubah

1. `lib/rate-limit.ts` — ekstensi **backward-compatible**: tambah parameter opsional
   `max` (default `1`) sehingga satu key boleh konsumsi N slot per window.
   Caller existing (login/forgot/verify-request) tidak berubah perilaku.
2. `app/api/auth/register/route.ts` — pasang rate limiting.

Total: **2 file**. Tidak ada perubahan DB, tidak ada dependensi baru.

## Latar desain

Limiter saat ini fixed-window single-slot: begitu satu request dikonsumsi, key
diblokir sampai window habis. Untuk login itu sudah disepakati (C-1), tapi untuk
registrasi, 1 akun/jam/IP terlalu ketat — user di belakang NAT kantor/kampus tidak
bisa daftar lebih dari satu orang. Rekomendasi audit menyebut "~3 request/jam",
maka limiter perlu dukungan multi-slot.

## Langkah perbaikan

### A. Ekstensi `lib/rate-limit.ts`
1. Ubah struktur value bucket dari `number` (expiry) menjadi
   `{ expiresAt: number; count: number }`.
2. Signature baru: `checkRateLimit(key, windowMs = 60_000, max = 1)`.
   - Jika entri masih hidup dan `count >= max` → tolak (perilaku lama untuk `max=1`).
   - Jika masih hidup dan `count < max` → increment `count`, izinkan.
   - Jika kadaluarsa/tidak ada → set `{ expiresAt: now + windowMs, count: 1 }`, izinkan.
3. `retryAfterSeconds` tetap dihitung dari `expiresAt`.
4. Semua caller existing memakai default `max=1` → perilaku identik dengan sebelumnya
   (login C-1, forgot, verify-request tidak tersentuh efeknya).

### B. Pemasangan di `app/api/auth/register/route.ts`
1. Import `checkRateLimit` dari `@/lib/rate-limit`.
2. Normalisasi ringan sebelum pengecekan: ambil IP dari
   `x-forwarded-for` (entry pertama), fallback `"unknown"`.
3. Letakkan pengecekan SETELAH validasi field dasar (`name/email/password` kosong)
   supaya request sampah tidak mengonsumsi kuota, tapi SEBELUM query DB pertama
   (cek duplikat email).
4. Dua kunci:
   - `register:ip:<ip>` → window **1 jam**, `max: 3` (maksimal 3 akun per IP per jam).
   - `register:email:<email lowercase>` → window **10 menit**, `max: 1`
     (anti spam ulang email yang sama; cek duplikat DB tetap yang utama).
5. Jika ditolak → respons **429** + header `Retry-After`, pesan generik:
   `"Too many registration attempts. Please try again later."`

## Risiko & dampak

- **Rendah**: perubahan `lib/rate-limit.ts` menyentuh infrastruktur bersama, tapi
  default `max=1` menjaga perilaku semua caller lain persis sama (diverifikasi lewat
  bentuk data & alur kode; login/forgot punya jalur kode identik).
- User legit di satu IP publik yang mendaftarkan >3 akun dalam 1 jam akan diblok sementara
  — trade-off sadar melawan bot signup; bisa dinaikkan via konstanta jika perlu.
- Tidak ada breaking change API (status 429 baru hanya saat limit terpicu).

## Cara verifikasi setelah fix

1. `npx tsc --noEmit` + `npx eslint` pada kedua file yang berubah.
2. Regression cepat endpoint lain yang pakai limiter: login masih 401→429 seperti
   verifikasi C-1 (memastikan refactor bucket tidak merusak `max=1`).
3. Uji register: request ke-1..3 sukses diproses (400/berhasil sesuai data),
   request ke-4 dari IP sama dalam 1 jam → **429**.
4. Uji kunci email: email sama 2× berturut-turut (dengan nama beda agar lolos cek
   duplikat tidak relevan) → request ke-2 → **429**.
