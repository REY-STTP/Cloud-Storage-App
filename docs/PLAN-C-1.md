# Plan Fix — C-1: Login Tanpa Rate Limiting

> Tanggal: 2026-08-25
> Status plan: ⏳ MENUNGGU APPROVE

## Temuan (ringkas dari AUDIT-REPORT.md)

`app/api/auth/login/route.ts` tidak pernah memanggil `checkRateLimit()`, padahal README
(Security Model) mengklaim login di-rate-limit. Akibatnya brute force password dan
credential stuffing berjalan tanpa hambatan. Diperparah oleh timing difference:
saat email tidak ditemukan, `bcrypt.compare()` dilewati sehingga respons lebih cepat —
bisa dipakai untuk mengenumerasi email terdaftar.

## File yang akan diubah

1. `app/api/auth/login/rate-limit` → **tidak ada**, semua perubahan di:
2. `app/api/auth/login/route.ts` — tambah rate limit + timing equalization
3. `README.md` — **tidak diubah** (klaim rate limit sudah ada; setelah fix klaim jadi benar)

Total: **1 file** (`app/api/auth/login/route.ts`). Tidak ada perubahan DB, tidak ada
dependensi baru (`lib/rate-limit.ts` sudah tersedia dan dipakai route lain).

## Langkah perbaikan

1. Import `checkRateLimit` dari `@/lib/rate-limit`.
2. Normalisasi input sebelum rate limit dieksekusi:
   - `email = String(email ?? "").trim().toLowerCase()` (juga menyamakan gaya dengan
     route forgot/verify-request; lowercase di sini aman tanpa migrasi karena hanya
     memengaruhi lookup).
3. Ambil IP klien: `req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"`.
4. Jalankan dua pemeriksaan rate limit dengan window 60 detik:
   - `login:ip:<ip>` — anti password spraying lintas akun.
   - `login:email:<email>` — anti penargetan satu akun.
   - Jika salah satu ditolak → balas `429` + header `Retry-After`, pesan generik.
5. Timing equalization: jika user **tidak ditemukan**, tetap jalankan
   `comparePassword(password, DUMMY_HASH)` terhadap hash bcrypt statis agar durasi
   respons kira-kira sama dengan kasus user ada. Pesan error tetap seragam
   "Incorrect email or password." (401).
6. Urutan operasi dalam handler menjadi:
   parse body → normalisasi → rate limit (IP lalu email) → lookup user →
   cek banned → compare password (dengan dummy bila perlu) → issue JWT.

## Risiko & dampak

- **Rendah**: user legit yang salah password berkali-kali akan menunggu 60 detik —
  perilaku standar, sama seperti endpoint forgot yang sudah ada.
- Rate limiter in-memory: hanya efektif untuk deployment single-instance (sudah dicatat
  di komentar `lib/rate-limit.ts`); konsisten dengan kondisi aplikasi saat ini.
- Lowercase email pada lookup: jika ada akun terdaftar dengan huruf besar di DB,
  login dengan huruf kecil tetap 404 — ini temuan terpisah (M-6), **tidak** disentuh di sini.
- Tidak ada breaking change API (skema request/response tidak berubah; hanya status 429 baru).

## Cara verifikasi setelah fix

1. `npx tsc --noEmit` — pastikan tidak ada error tipe.
2. Manual test dengan curl/httpie:
   - Login gagal 2× berturut-turut dengan email sama → request ke-3 harus `429` dengan `Retry-After`.
   - Ulangi dengan email beda dari IP sama sampai limit IP terpicu → `429`.
   - Tunggu window lewat → login normal kembali berhasil.
3. Bandingkan durasi respons login email-tak-terdaftar vs password-salah (harus relatif mirip).
