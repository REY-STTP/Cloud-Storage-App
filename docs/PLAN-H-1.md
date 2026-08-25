# Plan Fix — H-1: Role & Status Ban "Membeku" di JWT

> Tanggal: 2026-08-26
> Status plan: ⏳ MENUNGGU APPROVE

## Temuan (ringkas dari AUDIT-REPORT.md)

Guard hanya mempercayai klaim di dalam JWT (`payload.role`, masa berlaku 24 jam):
- Admin yang di-demote tetap punya akses penuh panel admin sampai token expire.
- User yang di-ban masih bisa list/download/rename/delete file sampai token expire
  (route download `GET /api/files/:id`, list `GET /api/files`, dan
  `files/batch/download` bahkan tidak pernah cek status ban dari DB).

## Keputusan kebijakan (perlu setuju via approve plan)

Kode lama berkomentar *"Banned users keep read access until their token expires"*.
Plan ini mengubah kebijakan menjadi:

> **Ban = akun beku penuh**, satu-satunya akses tersisa adalah `GET /api/user/profile`
> (supaya UI bisa menampilkan status "Anda diblokir").

Konsekuensi: user yang di-ban langsung kehilangan akses dashboard/list/download,
tidak menunggu token expire. Jika Anda ingin banned tetap bisa baca/download,
sampaikan saat approve — helper akan disesuaikan.

**Di luar scope siklus ini**: rotasi sesi via kolom `token_version` (butuh migrasi DB;
sesi admin demote/ban akan tetap valid untuk *halaman* sampai token habis, tapi semua
API sudah menolak — risiko fungsionalnya minimal). Bisa jadi siklus terpisah nanti.
Proteksi halaman `proxy.ts`/layout juga tetap terpisah (temuan M-3).

## File yang akan diubah

| # | File | Perubahan |
|---|------|-----------|
| 1 | `lib/guards.ts` | **File baru**: `requireUser(req)` & `requireAdmin(req)` |
| 2 | `app/api/files/route.ts` | GET & POST → `requireUser`; hapus cek inline |
| 3 | `app/api/files/[id]/route.ts` | GET/PATCH/DELETE → `requireUser` |
| 4 | `app/api/files/batch/route.ts` | DELETE → `requireUser` |
| 5 | `app/api/files/batch/download/route.ts` | POST → `requireUser` (sebelumnya tanpa cek user sama sekali) |
| 6 | `app/api/user/profile/route.ts` | PATCH/DELETE → `requireUser`; GET → varian *auth-only* (tanpa cek ban) |
| 7 | `app/api/user/storage/route.ts` | GET → `requireUser` |
| 8 | `app/api/admin/users/route.ts` | GET → `requireAdmin` |
| 9 | `app/api/admin/users/[id]/route.ts` | PATCH & DELETE → `requireAdmin` |
| 10 | `app/api/admin/users/batch/route.ts` | PATCH & DELETE → `requireAdmin` |

Total: **10 file** (1 baru). Tanpa dependensi baru, tanpa perubahan DB/API shape.

## Desain helper (`lib/guards.ts`)

```ts
type GuardResult =
  | { ok: true; user: UserRow }            // user segar dari DB
  | { ok: false; response: NextResponse }; // respons siap-dikirim

async function requireAuth(req): Promise<GuardResult>
// verifikasi JWT → fetch user dari DB (getUserById) → 401/404 bila gagal

async function requireUser(req): Promise<GuardResult>
// requireAuth + tolak banned (403 "Your account has been banned")

async function requireAdmin(req): Promise<GuardResult>
// requireAuth + role dari BARIS DB (bukan payload), 403 "Forbidden"
```

Pola pemakaian di tiap handler:
```ts
const guard = await requireUser(req);
if (!guard.ok) return guard.response;
const user = guard.user; // dipakai menggantikan payload.userId
```

Detail konsistensi:
- Pesan/status HTTP mengikuti konvensi existing (401 Unauthorized / 404 User not found /
  403 Your account has been banned / 403 Forbidden) agar client tidak perlu berubah.
- Cek `verified` khusus upload TETAP di route files POST (bukan di helper) karena
  hanya relevan untuk upload.
- `user/profile DELETE`: ikut `requireUser` → user banned tidak bisa self-delete
  (ban = beku; penghapusan tetap lewat admin). Dicatat sebagai kebijakan baru.
- Route admin `[id]`/batch mempertahankan proteksi existing mereka (batch melindungi
  role ADMIN); pembersihan inkonsistensi M-4 bukan bagian siklus ini.

## Risiko & dampak

- **Perubahan perilaku terbesar**: user banned kehilangan akses baca/download seketika
  (sebelumnya 24 jam). Ini inti fix — tapi wajib Anda setujui kebijakannya.
- Semua route user/admin kini menjalankan 1 query DB ekstra per request
  (getUserById). Beberapa route memang sudah melakukannya; dampak latency ~1 round-trip
  Supabase per request, dapat diterima untuk skala aplikasi ini.
- Refactor mekanis di banyak file — risiko typo ditangani tsc + uji fungsional.

## Cara verifikasi setelah fix

1. `npx tsc --noEmit` + eslint pada 10 file.
2. Regresi normal (user valid): login → list files → storage → profile → semua 200.
3. Uji ban efektif seketika:
   - Login sbg user A (dapat cookie), catat akses list sukses.
   - Admin ban A langsung via DB (`update users set banned = true ...`) — tanpa
     menunggu token expire.
   - Ulang request list/download oleh A → harus **403** seketika (sebelumnya 200).
4. Uji admin: token role USER hit `/api/admin/users` → 403; token role ADMIN → 200.
5. Smoke forgot/register masih normal (menyentuh lib yang sama).
