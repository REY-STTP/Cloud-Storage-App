# Report Batch Final — H-2…H-5, M-1…M-8, L-1…L-9

> Tanggal: 2026-08-26
> Plan referensi: `docs/PLAN-BATCH-FINAL.md`
> Mode: ⚡ Batch (sesuai AGENTS.md) — dieksekusi sekaligus atas instruksi user

## Status: SELESAI (16 fixed · 1 partial · 2 deferred)

## Ringkasan per temuan

| ID | Status | Fix singkat |
|----|--------|-------------|
| H-2 | ✅ SELESAI | Password min 8/max 128, nama ≤100, regex email; race duplikat email ditangani (23505 → pesan ramah) |
| H-3 | ✅ SELESAI | Validasi AND (ext+MIME+magic bytes); `.svg`/`.ico` dihapus; maks 10 file/request; presigned URL pakai `Content-Disposition: attachment` |
| H-4 | ✅ SELESAI | Batch ZIP: maks 50 id & 200 MB total; respons streaming via `Readable.toWeb` — tidak ada buffer arsip penuh |
| H-5 | ✅ SELESAI | nodemailer ^9 + `npm audit fix` → **0 vulnerabilities** (`npm audit --omit=dev`) |
| M-1 | ✅ SELESAI | `/forgot` & `/verify-request` balas generik `200` untuk email tak dikenal/sudah terverifikasi |
| M-2 | ✅ SELESAI | Kolom `pwd_changed_at` (migrasi + schema.sql); reset & ganti password mengesetnya; `requireAuth` menolak JWT lama (`iat < pwd_changed_at`) |
| M-3 | ✅ SELESAI | Guard server-side di `app/admin/layout.tsx` + `app/dashboard/layout.tsx` (baru): JWT diverifikasi + role/ban dari DB → redirect `/login` |
| M-4 | ✅ SELESAI | `[id]` PATCH/DELETE: target ADMIN dilindungi (konsisten dgn batch), enum role divalidasi, try/catch |
| M-5 | ✅ SELESAI | Self-delete wajib `currentPassword` benar |
| M-6 | ✅ SELESAI | Register lowercase; migrasi DB cek duplikat case (0 ditemukan) lalu normalisasi (0 baris berubah — data sudah bersih); login/forgot sudah lowercase dari siklus C-1 |
| M-7 | ✅ SELESAI | Headers: nosniff, X-Frame-Options DENY, CSP frame-ancestors 'none', Referrer-Policy, Permissions-Policy, HSTS. CSP penuh ditunda (risiko memecah GSAP/inline styles) |
| M-8 | ⚠️ SEBAGIAN | TLS tetap aktif; strict verification jadi **opt-in** (`DATABASE_SSL_STRICT=true`) karena chain Supabase pooler terbukti gagal di trust store Node saat verifikasi (`SELF_SIGNED_CERT_IN_CHAIN`). Permanen = pasang CA Supabase via `NODE_EXTRA_CA_CERTS` (keputusan ops) |
| L-1 | ✅ SELESAI | try/catch di `GET /api/files`, PATCH & DELETE profile |
| L-2 | ✅ SELESAI | `escapeLike()` untuk semua parameter search ILIKE (files GET ×2, admin users ×3) |
| L-3 | ✅ SELESAI | `BCRYPT_COST=12` (register/reset/hashPassword baru) + progressive rehash saat login |
| L-4 | ✅ SELESAI | Rate key verify-request dari userId cookie saat email kosong |
| L-5 | ⏸️ DEFERRED | Streaming upload ke R2 butuh integration test dengan bucket nyata — mengubah fitur inti tanpa itu berisiko |
| L-6 | ✅ SELESAI | seed.mjs: print password dihapus; tolak default password saat production |
| L-7 | ✅ SELESAI | Tertangani otomatis oleh rewrite H-1 (profile GET tak lagi select password) |
| L-8 | ✅ SELESAI | `shadcn` pindah ke devDependencies |
| L-9 | ⏸️ DEFERRED | Test suite permanen butuh keputusan framework/infra; verifikasi audit memakai script sekali-pakai |

## File yang diubah (18)

Route auth: `register`, `login`, `forgot`, `verify-request`, `reset`
Files/storage: `files/route.ts`, `files/[id]`, `batch/download`, `lib/storage.ts`, `lib/utils.ts` (+`escapeLike`)
User/admin: `user/profile`, `user/storage`(sudah), `admin/users/[id]`, `admin/users/route.ts`
Guard/session: `lib/guards.ts`, `lib/auth.ts`, `lib/users.ts`, `lib/types.ts`, `lib/db.ts`
Halaman: `app/admin/layout.tsx`, **`app/dashboard/layout.tsx` (baru)**
Infrastruktur: `next.config.ts`, `scripts/seed.mjs`, `scripts/supabase-schema.sql`, `package.json`

**Migrasi DB yang sudah dijalankan**: `ALTER TABLE users ADD COLUMN pwd_changed_at` + normalisasi email lowercase (aman — 0 duplikat).

## Hasil verifikasi

| Uji | Hasil |
|-----|-------|
| `npx tsc --noEmit` | ✅ exit 0 |
| eslint file yang disentuh | ✅ bersih (2 error setState-in-effect tersisa milik UI page — pre-existing, di luar scope audit) |
| `npm run build` (production) | ✅ sukses |
| `npm audit --omit=dev` | ✅ **0 vulnerabilities** |
| Smoke nodemailer v9 (Ethereal send) | ✅ |
| Security headers di respons production | ✅ nosniff/DENY/HSTS hadir |
| Anti-enumeration forgot/verify-request | ✅ 200 generik |
| Password policy register | ✅ <8 ditolak 400 |
| M-2 sesi invalidation | ✅ token lama mati setelah `pwd_changed_at` maju, hidup lagi saat kolom dinullkan |
| Regresi guard H-1 (ban/demote/tanpa token) | ✅ semua lolos kembali |
| M-5 self-delete | ✅ 400 tanpa password / 401 password salah |

Total test fungsional akhir: **18/18 PASS** terhadap production build.

## Kejadian selama eksekusi (transparansi)

- Percobaan pertama migrasi dengan TLS strict gagal (`SELF_SIGNED_CERT_IN_CHAIN`) →
  menjadi dasar keputusan M-8 partial/opt-in.
- Satu kasus FAIL pada run pertama test adalah **bug script test** (lupa step promote),
  bukan bug aplikasi — setelah dikoreksi: 18/18.
- Script sekali-pakai (`.tmp-migrate.mjs`, `.tmp-batch-test.mjs`) sudah dihapus;
  dev/prod server uji sudah dimatikan.

## Catatan deploy

1. `npm run build` ulang di environment deployment (build lokal sudah dilakukan).
2. Pastikan env baru didokumentasikan: `DATABASE_SSL_STRICT` (opsional).
3. Kolom `pwd_changed_at` wajib ada di DB sebelum versi ini live — sudah dimigrasi.
