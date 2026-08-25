# Report Fix — H-1: Role & Status Ban "Membeku" di JWT

> Tanggal: 2026-08-26
> Plan referensi: `docs/PLAN-H-1.md`

## Status: SELESAI

## Yang diubah

### 1. `lib/guards.ts` — **file baru**
Tiga guard terpusat yang selalu re-validasi user ke DB (via `getUserById`):
- `requireAuth(req)` — JWT valid + user masih ada. **Tanpa cek ban** (untuk GET profil sendiri).
- `requireUser(req)` — + tolak banned (`403 "Your account has been banned"`).
- `requireAdmin(req)` — role dicek dari **baris DB**, bukan klaim JWT (`403 "Forbidden"`).

### 2. Route files & user (7 file)
| File | Handler | Guard |
|------|---------|-------|
| `app/api/files/route.ts` | GET, POST | `requireUser` (POST tetap cek `verified` di route) |
| `app/api/files/[id]/route.ts` | GET download, PATCH, DELETE | `requireUser` — **download kini diblokir saat banned** (sebelumnya tanpa cek) |
| `app/api/files/batch/route.ts` | DELETE | `requireUser` (menggantikan cek inline) |
| `app/api/files/batch/download/route.ts` | POST | `requireUser` — **sebelumnya tidak pernah cek user dari DB sama sekali** |
| `app/api/user/profile/route.ts` | PATCH, DELETE | `requireUser` |
| `app/api/user/profile/route.ts` | GET | `requireAuth` — pengecualian kebijakan (banned boleh lihat statusnya) |
| `app/api/user/storage/route.ts` | GET | `requireUser` |

### 3. Route admin (3 file)
Semua handler (`GET /api/admin/users`, `PATCH+DELETE /[id]`, `PATCH+DELETE /batch`)
berpindah dari cek `payload.role !== "ADMIN"` ke `requireAdmin` — role dari baris DB.

### Kebijakan baru (disetujui di plan)
Ban = akun beku penuh seketika; pengecualian tunggal `GET /api/user/profile`.
User banned tidak bisa self-delete lagi.

### Catatan disiplin scope
Saat refactor `admin/users/[id]` sempat ikut menambahkan validasi enum role +
try/catch (milik temuan M-4). Sesuai aturan AGENTS.md, tambahan itu **dikembalikan** —
struktur kedua handler persis seperti semula, hanya guard yang diganti. M-4 tetap terbuka.
Dua masalah lint yang muncul saat verifikasi (`any` di files/route.ts, `archiveFinalized`
di batch/download) adalah pre-existing dan juga tidak disentuh.

## Hasil verifikasi

`tsc --noEmit` ✅ · eslint file berubah ✅ (2 masalah pre-existing di luar scope)

Test fungsional end-to-end via script sekali-pakai (user temporary di DB, dihapus
bersih setelahnya; token **tidak pernah di-re-issue** untuk membuktikan efek seketika):

```
PASS H1-01 fresh user GET /files = 200          PASS H1-08 banned profile DELETE = 403
PASS H1-02 fresh user GET /storage = 200        PASS H1-09 non-admin hit admin API = 403
PASS H1-03 banned GET /files = 403 seketika     PASS H1-10 banned GET profil sendiri = 200
PASS H1-04 banned GET /files/:id = 403          PASS H1-11 promote→admin API = 200 walau token bilang USER
PASS H1-05 banned batch-download = 403          PASS H1-12 demote→admin API = 403 walau token bilang ADMIN
PASS H1-06 banned storage = 403                 PASS H1-13 tanpa token = 401
PASS H1-07 banned profile PATCH = 403
────────────────────────────────────────────────────────────
13/13 PASS
```

H1-11/H1-12 adalah bukti inti: role benar-benar dibaca dari DB — token lama yang
menyebut role lama tidak dipercaya lagi.

## Temuan lain yang terlihat tapi tidak dikerjakan

- **M-4**: proteksi antar-admin di `[id]` PATCH + try/catch + validasi enum role.
- **M-3**: proteksi halaman `/admin/*` & `/dashboard/*` di proxy/layout.
- Rotasi sesi via kolom `token_version`: sesi *halaman* admin demote/ban masih tampil
  UI sampai token habis (semua API sudah menolak). Butuh migrasi DB — kandidat siklus
  terpisah bila dianggap perlu.
- Cost latency: setiap route kini +1 query `getUserById` per request (~satu round-trip
  Supabase). Dapat diterima untuk skala ini; bisa dioptimisasi belakangan jika perlu.
