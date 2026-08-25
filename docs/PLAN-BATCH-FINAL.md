# Plan Batch Final — Seluruh Temuan Tersisa (H-2…H-5, M-1…M-8, L-1…L-9)

> Tanggal: 2026-08-26
> Status: ✅ DIAPPROVE via instruksi eksplisit user ("lakukan fix juga untuk temuan lain")
> Aturan: AGENTS.md ⚡ Mode Batch

## Kelompok & Kebijakan

### Kelompok A — Route Auth (H-2, M-1, M-5, L-4, L-3 parsial)
| Temuan | Fix |
|--------|-----|
| H-2 password policy | Register: min 8 / max 128 char, nama max 100, format email regex; tangkap unique-violation (23505) → pesan ramah |
| M-1 enumerasi | `/forgot` & `/verify-request`: email tak terdaftar / sudah terverifikasi → respons generik `200` (tanpa kirim email) |
| M-5 hapus akun | `DELETE /api/user/profile` wajib `currentPassword` benar |
| L-4 rate key verify-request | Key dari userId cookie saat email kosong |
| L-3 bcrypt | Cost 12 (`BCRYPT_COST` di lib/auth.ts); progressive rehash saat login jika hash lama < 12 |

### Kelompok B — Files & Storage (H-3, H-4, L-1, L-2)
| Temuan | Fix |
|--------|-----|
| H-3 validasi upload | Semantik **AND** (extension && MIME); hapus `.svg` & `.ico`; verifikasi magic bytes (images/video/audio/pdf/office; txt/csv dilewati); maks 10 file/request |
| H-4 ZIP buffering | Batas ≤50 id & total ≤200 MB; respons **streaming** (`Readable.toWeb`) tanpa `Buffer.concat` |
| L-1 try/catch | `GET /api/files`, `PATCH profile` dibungkus try/catch |
| L-2 ILIKE | Helper `escapeLike()` untuk semua parameter search (files GET ×2, admin users GET ×3) |
| Disposisi unduhan | `getDownloadUrl` menambah `ResponseContentDisposition: attachment` (pelengkap H-3 anti-XSS inline render) |

### Kelompok C — Sesi, Admin, Halaman, DB (M-2, M-3, M-4, M-6, M-8)
| Temuan | Fix |
|--------|-----|
| M-2 reset reusable + sesi lama | Kolom `pwd_changed_at` (migrasi + schema.sql); reset & ganti password meng-set kolom tsb; `requireAuth` menolak JWT dengan `iat < pwd_changed_at` |
| M-3 guard halaman | Server-side check di `app/admin/layout.tsx` + `app/dashboard/layout.tsx` baru (redirect `/login`). `proxy.ts` tidak diubah — Edge runtime tidak mendukung jsonwebtoken; layout guard adalah proteksi server-side sebenarnya |
| M-4 admin [id] PATCH/DELETE | Target ber-role ADMIN dilindungi (konsisten dgn batch); enum role divalidasi; try/catch |
| M-6 email lowercase | Register lowercase; migrasi DB cek duplikat case-insensitive lalu `update … set email = lower(email)` |
| M-8 SSL DB | Default `rejectUnauthorized: true` (opt-out tetap ada); konektivitas ditest dulu |

### Kelompok D — Infrastruktur & Dependensi (M-7, H-5, L-6, L-8, sisa L-3)
| Temuan | Fix |
|--------|-----|
| M-7 headers | next.config: nosniff, X-Frame-Options DENY, CSP frame-ancestors 'none', Referrer-Policy, Permissions-Policy, HSTS. CSP penuh ditunda (GSAP inline styles — risiko break UI) |
| H-5 dependensi | `npm audit fix` + upgrade `nodemailer@^9` (breaking); smoke Ethereal send |
| L-6 seed.mjs | Jangan cetak password; tolak password default saat production |
| L-8 shadcn | Pindah ke devDependencies |

### Skip / Deferred
- **L-7** — sudah tertangani oleh rewrite H-1 (profile GET tidak lagi select password).
- **L-5** streaming upload — `DEFERRED`: butuh integration test dengan bucket R2 nyata agar tidak merusak fitur inti secara buta.
- **L-9** automated tests — `DEFERRED`: butuh keputusan framework/infra test; terlalu besar untuk batch ini.

## Risiko utama
- Nodemailer 7→9 breaking (diverifikasi smoke send Ethereal + build).
- Migrasi DB (pwd_changed_at, email lowercase) dieksekusi ke database aktif — keduanya additive/safe-transform; duplikat case dicek dulu dan migrasi berhenti bila ada.
- Streaming ZIP menghilangkan Content-Length dan error mid-stream tak bisa ubah status HTTP (trade-off didokumentasikan).
- Magic-byte check bisa menolak file exotic yang valid — daftar signature mencakup format umum saja.

## Verifikasi akhir
tsc + eslint seluruh file berubah · `npm run build` · `npm audit --omit=dev` bersih ·
migrasi DB · smoke nodemailer Ethereal · regresi guard (script H-1: 13 kasus) ·
uji anti-enumeration & policy baru via request nyata.
