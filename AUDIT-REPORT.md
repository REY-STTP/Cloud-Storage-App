# 🔍 Deep Audit Report — Cloud Storage App

> Tanggal audit: 2026-08-25
> Scope: seluruh API routes, auth, storage (R2), database layer, middleware, dependensi
> Metode: manual code review + `npm audit` + pemeriksaan git history

---

## Ringkasan Eksekutif

| Severity | Jumlah | Ringkasan |
|----------|--------|-----------|
| 🔴 Critical | 0 | — semua sudah diperbaiki |
| 🟠 High | 0 | — semua sudah diperbaiki |
| 🟡 Medium | 0 | — semua diperbaiki (M-8 sebagian: strict TLS jadi opt-in) |
| 🟢 Low tersisa | 2 | L-5 & L-9 berstatus DEFERRED (lihat REPORT-BATCH-FINAL) |
| ✅ Fixed | 25 | C-1–C-3, H-1–H-5, M-1–M-7, L-1–L-4, L-6–L-8, L-10–L-12 |

**Kesimpulan umum (update 2026-08-26):** Seluruh temuan Critical & High telah diperbaiki dan terverifikasi (build + 18/18 test fungsional). Tersisa 2 item Low berstatus DEFERRED dengan alasan di `docs/REPORT-BATCH-FINAL.md`.

---

## 🔴 CRITICAL

### ✅ C-1. Endpoint login tidak memiliki rate limiting sama sekali *(FIXED 2026-08-25 — see docs/REPORT-C-1.md)*
- **File**: `app/api/auth/login/route.ts`
- README (bagian *Security Model*) mengklaim *"Fixed-window rate limiter on login"*, tetapi route ini **tidak pernah memanggil `checkRateLimit()`** — padahal `/forgot` dan `/verify-request` menggunakannya.
- **Dampak**: brute force password & credential stuffing tanpa hambatan. Diperparah karena tidak ada captcha/lockout.
- **Rekomendasi**:
  ```ts
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const emailKey = String(email).trim().toLowerCase();
  // dua kunci: per-IP (anti spraying) & per-email (anti targeting)
  for (const key of [`login:ip:${ip}`, `login:email:${emailKey}`]) {
    const limit = checkRateLimit(key, 60_000);
    if (!limit.allowed) return res429(limit.retryAfterSeconds);
  }
  ```
- Bonus: saat user tidak ditemukan, bcrypt.compare dilewati → timing difference bisa mengenumerasi email terdaftar. Selalu jalankan compare dummy agar waktu respons konsisten.

### ✅ C-2. Endpoint register tidak memiliki rate limiting *(ditambahkan atas permintaan user, 2026-08-25 — FIXED 2026-08-25 — see docs/REPORT-C-2.md)*
- **File**: `app/api/auth/register/route.ts`
- Terkonfirmasi via grep: hanya `/forgot` dan `/verify-request` yang memanggil `checkRateLimit()`.
  `/register` (dan `/login`, sudah tercatat sebagai C-1) tidak sama sekali.
- **Dampak**:
  - Pembuatan akun massal otomatis (bot signup) tanpa hambatan.
  - Setiap registrasi sukses memicu kirim email verifikasi via SMTP Anda → dapat dipakai
    sebagai **alat spam email**, risiko domain/IP SMTP masuk blacklist.
  - Polusi tabel `users` + konsumsi kuota Supabase/R2 gratis tier.
- **Rekomendasi**:
  - Rate limit per-IP (`register:ip:<ip>`) dengan window ketat (mis. 3 request/jam) plus
    per-email seperti endpoint lain.
  - Kombinasikan dengan fix H-2 (password policy) karena menyentuh route yang sama.
  - Opsional: pertimbangkan captcha/turnstile jika bot tetap menembus rate limit IP
    (bypass trivial via rotasi IP).

### ✅ C-3. Fallback JWT secret hardcoded di `lib/mail.ts` *(FIXED 2026-08-25 — see docs/REPORT-C-3.md)*
- **File**: `lib/mail.ts` baris 5:
  ```ts
  const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
  ```
- `lib/auth.ts` melempar error jika `JWT_SECRET` kosong, tapi `mail.ts` **diam-diam memakai secret default yang dikenal publik** untuk menandatangani token `email-verify` dan `password-reset`.
- **Dampak**: jika env var gagal diset di satu environment (mis. salah nama var di Vercel), siapa pun bisa **mem-forge token reset password untuk akhir apa pun** (termasuk admin) → full account takeover. Token session utama aman (auth.ts throw), tapi reset-token adalah pintu masuknya.
- **Rekomendasi**: ganti dengan `const JWT_SECRET = process.env.JWT_SECRET!; if (!JWT_SECRET) throw new Error(...)` — sama persis seperti `lib/auth.ts`. Idealnya ekstrak ke helper bersama.

---

## 🟠 HIGH

### ✅ H-1. Role & status ban "membeku" di JWT — tidak ada re-validasi dari DB *(FIXED 2026-08-26 — see docs/REPORT-H-1.md)*
- **File**: semua route admin (`app/api/admin/users/*`), `lib/auth.ts`, `proxy.ts`
- Guard admin hanya memeriksa `payload.role !== "ADMIN"` dari **isi token** (masa berlaku 24 jam):
  - Admin yang di-**demote** tetap punya akses penuh panel admin sampai token expire.
  - User yang di-**ban** masih bisa list/download/rename/delete file-nya sampai token expire (route `PATCH`/`DELETE`/batch-delete sudah cek `actor.banned` dari DB, tapi **`GET /api/files/:id` (download), `GET /api/files`, dan `files/batch/download` TIDAK**).
- **Dampak**: pembatasan administratif tidak efektif hingga 24 jam.
- **Rekomendasi**:
  1. Buat helper `requireUser(req)` / `requireAdmin(req)` yang **selalu** fetch user dari DB (sudah ada `getUserById`) dan cek `banned` + `role` dari sana. Ganti semua pengecekan `payload.role`.
  2. Saat ban/unban/demote: pertimbangkan rotasi `JWT_SECRET` per-user (tambah kolom `token_version`, ikutkan di payload JWT, bandingkan saat verifikasi).

### ✅ H-2. Registrasi menerima password tanpa syarat kekuatan apa pun *(FIXED 2026-08-26 — see docs/REPORT-BATCH-FINAL.md)*
- **File**: `app/api/auth/register/route.ts`
- Hanya cek `!password` (string kosong). Password `"a"` diterima. Inkonsisten dengan `reset` & `profile PATCH` yang mewajibkan ≥ 6 karakter.
- **Rekomendasi**: validasi min-length (disarankan 8+) di register, plus normalisasi `name.trim()`, panjang maksimum name/email/password (mencegah bcrypt DoS via password >72 byte — bcryptjs memotong diam-diam, tapi tetap batasi input).

### ✅ H-3. Validasi upload berbasis OR + menerima SVG/ICO → stored XSS *(FIXED 2026-08-26 — see docs/REPORT-BATCH-FINAL.md)*
- **File**: `app/api/files/route.ts` (`validateFile`)
- Logika `hasValidExtension || hasValidMimeType` artinya:
  - File `.svg` berisi `<script>` lolos sebagai "image" (cukup extension cocok, MIME boleh salah, bahkan boleh `text/html`).
  - File `.html` direname `.svg` juga lolos.
- Saat file diakses (presigned URL atau `R2_PUBLIC_BASE_URL` jika dikonfigurasi), R2 menyajikan `Content-Type: image/svg+xml` → **JavaScript dieksekusi di origin Anda** → XSS stored, pencurian cookie `token` (httpOnly melindungi cookie, tapi sesi/aksi dalam konteks user tetap bisa dijalankan).
- **Rekomendasi**:
  - Hapus `.svg` dan `.ico` dari daftar diizinkan (paling sederhana), **atau**
  - Wajibkan `extension && mime` (AND, bukan OR) + verifikasi magic bytes untuk kategori image/video.
  - Untuk download, tambahkan `ResponseContentDisposition: attachment` di `GetObjectCommand` supaya browser tidak me-render file inline:
    ```ts
    new GetObjectCommand({ Bucket: BUCKET, Key: key,
      ResponseContentDisposition: `attachment; filename="${safeName}"` })
    ```

### ✅ H-4. Batch ZIP download mem-buffer seluruh arsip di memory *(FIXED 2026-08-26 — see docs/REPORT-BATCH-FINAL.md)*
- **File**: `app/api/files/batch/download/route.ts` (baris 73–118)
- Semua chunk dikumpulkan ke `chunks[]` lalu `Buffer.concat(chunks)`. Tidak ada batas jumlah ID maupun total ukuran. User dengan kuota 1 GB bisa minta ZIP ~1 GB → **memory exhaustion / OOM kill** pada Node (beberapa request konkuren cukup untuk menjatuhkan server).
- **Catatan juga**: `zlib: { level: 9 }` bersama `store: true` kontradiktif (`store: true` menonaktifkan kompresi).
- **Rekomendasi**:
  - Batas jumlah file per request (mis. ≤ 50) dan total bytes terpilih (mis. ≤ 200 MB) sebelum streaming.
  - Kembalikan `NextResponse(archive)` sebagai stream (archiver adalah Readable stream) alih-alih buffer penuh — archiver sudah mendukung piping langsung.

### ✅ H-5. Kerentanan dependensi produksi (npm audit: 9 vulns, 7 high) *(FIXED 2026-08-26 — see docs/REPORT-BATCH-FINAL.md)*
- Hasil `npm audit --omit=dev`:
  - **nodemailer ≤9.0.0** — SMTP command injection, CRLF header injection, TLS cert validation bypass pada OAuth2 (5 advisory high). Fix: `npm install nodemailer@^9` (**breaking change**, wajib regression test flow email).
  - **lodash** (transitif) — prototype pollution & code injection via `_.template`. Fix: `npm audit fix`.
  - **minimatch** (transitif, via glob/readdir-glob) — ReDoS. Fix: `npm audit fix`.
- Rekomendasi: jalankan `npm audit fix` dulu, lalu upgrade nodemailer terpisah dengan pengujian kirim email.

---

## 🟡 MEDIUM

### ✅ M-1. Email enumeration di `/forgot` dan `/verify-request` *(FIXED 2026-08-26 — see docs/REPORT-BATCH-FINAL.md)*
- Keduanya membalas `404 "Email is not registered"` untuk email tak dikenal (ironisnya komentar kode di forgot menyebut "anti-enumeration"). Rate limit hanya per-email, jadi attacker tinggal ganti-ganti email.
- **Fix**: selalu balas `200 { message: "If that email exists, we've sent a link..." }`.

### ✅ M-2. Reset token diklaim single-use padahal reusable *(FIXED 2026-08-26 — see docs/REPORT-BATCH-FINAL.md)*
- Template email berkata *"can only be used once"* dan README mengklaim single-use, tetapi implementasinya JWT biasa 1 jam yang **bisa dipakai berulang** sampai expire. Tidak ada nonce/jti yang disimpan & diblacklist.
- Reset password juga **tidak meng-invalidate sesi lama** (JWT stateless tetap valid).
- **Fix**: simpan `pwd_changed_at`; tolak reset token yang `iat < pwd_changed_at`, dan tolak session JWT dengan `iat < pwd_changed_at` (cek di `requireUser`). Sekaligus menyelesaikan invalidasi sesi.

### ✅ M-3. Halaman `/admin/*` & `/dashboard/*` tanpa guard server-side *(FIXED 2026-08-26 — see docs/REPORT-BATCH-FINAL.md)*
- `proxy.ts` hanya memeriksa **keberadaan** string cookie, bukan tanda tangan JWT.
- `app/admin/layout.tsx` **tidak melakukan pemeriksaan auth/role sama sekali** — UI admin bisa dibuka siapa pun yang punya cookie sembarang; data tetap dilindungi karena API-nya guard, tapi struktur, menu, dan endpoint terekspos.
- **Fix**: di `app/admin/layout.tsx` (Server Component) baca cookie, `verifyJwt`, fetch user dari DB, redirect jika bukan ADMIN. Sama untuk dashboard layout (user exists & !banned).

### ✅ M-4. PATCH admin `[id]` bisa mengedit admin lain & diri sendiri tanpa proteksi *(FIXED 2026-08-26 — see docs/REPORT-BATCH-FINAL.md)*
- `app/api/admin/users/[id]/route.ts`: admin dapat mengubah `role`, `banned`, `verified`, `name` milik **admin mana pun termasuk dirinya sendiri** (demote diri, ban admin lain). Route batch justru melindungi `role='ADMIN'` — **inkonsisten**.
- Juga: nilai `body.role` tidak divalidasi → string arbitrer menabrak CHECK constraint → 500 mentah; dan route ini **tanpa try/catch**.
- **Fix**: larang modifikasi user ber-role `ADMIN` lewat endpoint ini (kecuali self minimal), validasi enum role, tambah try/catch.

### ✅ M-5. Hapus akun sendiri tanpa konfirmasi password *(FIXED 2026-08-26 — see docs/REPORT-BATCH-FINAL.md)*
- `DELETE /api/user/profile` langsung menghapus akun + semua file hanya dengan cookie. Session hijack = kehilangan permanen seluruh data.
- **Fix**: wajibkan `currentPassword` diverifikasi sebelum delete.

### ✅ M-6. Inkonsistensi huruf besar/kecil email *(FIXED 2026-08-26 — see docs/REPORT-BATCH-FINAL.md)*
- `register` & `login` **tidak** lowercase email; `forgot`/`verify-request` **melakukan** lowercase. Akibatnya:
  - Bisa mendaftar `John@Gmail.com` dan `john@gmail.com` sebagai dua akun berbeda.
  - Forgot password untuk akun yang didaftarkan dengan huruf besar **selalu 404**.
- README mengklaim "stored lowercase" — tidak sesuai implementasi.
- **Fix**: lowercase di register & login (dan migrasi `update users set email = lower(email)` + unique index `lower(email)`).

### ✅ M-7. Tidak ada security headers *(FIXED 2026-08-26 — see docs/REPORT-BATCH-FINAL.md)*
- `next.config.ts` nyaris kosong. Belum ada CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`.
- **Fix**: tambahkan `headers()` di next.config (CSP ketat butuh nonce untuk GSAP inline — mulai dari `X-Content-Type-Options: nosniff`, HSTS, frame-ancestors 'none').

### ⚠️ M-8. SSL database dengan `rejectUnauthorized: false` *(SEBAGIAN — strict TLS opt-in via `DATABASE_SSL_STRICT=true`; default permissive karena chain Supabase pooler tidak ada di trust store Node, terbukti saat verifikasi. Permanen butuh CA bundle via NODE_EXTRA_CA_CERTS — keputusan ops)*
- `lib/db.ts` & `scripts/seed.mjs` menonaktifkan verifikasi sertifikat → rentan MITM antara server dan Supabase.
- **Fix**: gunakan sertifikat CA Supabase (`sslrootcert`) atau minimal `rejectUnauthorized: true` dengan pooler yang mendukung.

---

## 🟢 LOW

| # | Temuan | Lokasi | Saran |
|---|--------|--------|-------|
| ✅ L-1 | `GET /api/files` & `PATCH/DELETE /api/user/profile` tanpa try/catch — error DB = crash handler | FIXED 2026-08-26 — see docs/REPORT-BATCH-FINAL.md |
| ✅ L-2 | Input search ILIKE tidak escape `%`/`_` — user bisa scan wildcard | FIXED 2026-08-26 — `escapeLike()`, see docs/REPORT-BATCH-FINAL.md |
| ✅ L-3 | bcrypt cost 10 — di bawah rekomendasi OWASP saat ini (cost ≥ 12 untuk bcryptjs) | FIXED 2026-08-26 — cost 12 + progressive rehash saat login, see docs/REPORT-BATCH-FINAL.md |
| ✅ L-4 | `verify-request` rate-limit key `verify:${email \|\| "cookie"}` — jika lewat cookie tanpa email, SEMUA user berbagi bucket tunggal `verify:cookie` | FIXED 2026-08-26 — key dari userId cookie, see docs/REPORT-BATCH-FINAL.md |
| ⏸️ L-5 | Upload mem-buffer seluruh file (`arrayBuffer()`) per file — beberapa upload 100 MB konkuren menekan memory | **DEFERRED** — butuh integration test dengan bucket R2 nyata; jangan ubah fitur inti secara buta |
| ✅ L-6 | `seed.mjs` mencetak password admin plaintext ke console; default `Admin123!` | FIXED 2026-08-26 — print dihapus + tolak default password di production, see docs/REPORT-BATCH-FINAL.md |
| ✅ L-7 | `profile GET` men-select kolom `password` padahal tidak dipakai | FIXED via rewrite H-1 — profile GET kini memakai data guard tanpa select password |
| ✅ L-8 | `shadcn` CLI terdaftar sebagai dependency runtime (harusnya devDependencies) | FIXED 2026-08-26 — dipindah ke devDependencies |
| ⏸️ L-9 | Tidak ada automated test sama sekali | **DEFERRED** — butuh keputusan framework/infra test; verifikasi audit sementara memakai script sekali-pakai |
| ✅ L-10 | Rate limiter in-memory tidak efektif untuk multi-instance/serverless *(dari catatan REPORT-C-1)* | `lib/rate-limit.ts` | FIXED 2026-08-26 — abstraksi `RateLimitStore` + `setRateLimitStore()`, see docs/REPORT-L10-L12.md |
| ✅ L-11 | Slot IP terkonsumsi meski request ditolak kunci lain *(dari catatan REPORT-C-2)* | `app/api/auth/register/route.ts`, `lib/rate-limit.ts` | FIXED 2026-08-26 — `checkRateLimitAll()` two-pass, see docs/REPORT-L10-L12.md |
| ✅ L-12 | Duplikasi guard `JWT_SECRET` di auth & mail *(dari catatan REPORT-C-3)* | `lib/auth.ts`, `lib/mail.ts` | FIXED 2026-08-26 — helper bersama `lib/env.ts`, see docs/REPORT-L10-L12.md |

## ✅ Hal yang Sudah Baik

- 100% query SQL parameterized (tidak ada string concatenation input user)
- Validasi UUID regex sebelum semua query by-id
- Kuota penyimpanan atomic via `pg_advisory_xact_lock` — bebas race condition
- Cleanup objek R2 orphan saat insert DB gagal
- Cookie `httpOnly` + `sameSite=lax` + `secure` di production
- `Cache-Control: no-store` pada respons sensitif via `jsonNoStore`
- Bucket privat + presigned URL 1 jam (tidak ada link permanen)
- RLS Postgres dikunci penuh, akses hanya via app
- `.env.local` tidak pernah ter-commit ke git history ✓ (diverifikasi)

---

## Urutan Perbaikan yang Disarankan

1. **C-1** rate limit login (+timing equalization) — ~30 menit
2. **C-3** hapus fallback secret mail.ts — ~5 menit
3. **C-2** rate limit register (gabung dengan H-2 password policy) — ~45 menit
4. **H-1** helper `requireAdmin/requireUser` berbasis DB di semua route — ~2 jam
5. **H-3** perketat validasi upload + `ResponseContentDisposition: attachment` — ~1 jam
5. **M-6** normalisasi email lowercase + migrasi DB — ~30 menit
6. **M-3** guard server-side layout admin/dashboard — ~1 jam
7. **M-2/M-1** anti-enumeration + single-use reset — ~1,5 jam
8. **H-5** `npm audit fix` + upgrade nodemailer v9 (test email flow) — ~1 jam
9. **H-4** batas & streaming batch ZIP — ~1 jam
10. **M-7** security headers — ~30 menit
11. Sisanya (Low) bisa mengikuti secara bertahap.
