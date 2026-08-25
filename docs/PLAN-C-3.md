# Plan Fix — C-3: Fallback JWT Secret Hardcoded di lib/mail.ts

> Tanggal: 2026-08-25
> Status plan: ⏳ MENUNGGU APPROVE

## Temuan (ringkas dari AUDIT-REPORT.md)

`lib/mail.ts` baris 5:
```ts
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";
```
`lib/auth.ts` melempar error jika `JWT_SECRET` kosong, tapi `mail.ts` diam-diam
memakai secret default yang dikenal publik untuk menandatangani token
`email-verify` dan `password-reset`.

**Dampak**: jika env var gagal diset di satu environment, siapa pun bisa mem-forge
token reset password untuk akun mana pun (termasuk admin) → full account takeover.

## File yang akan diubah

1. `lib/mail.ts` — hapus fallback, wajibkan `JWT_SECRET` (fail-closed).

Total: **1 file**. Tidak ada perubahan DB, tidak ada dependensi baru,
tidak ada perubahan perilaku saat env terkonfigurasi dengan benar.

## Langkah perbaikan

1. Ganti baris 5 menjadi pola fail-closed yang identik dengan `lib/auth.ts`:
   ```ts
   const JWT_SECRET = process.env.JWT_SECRET;
   if (!JWT_SECRET) {
     throw new Error("JWT_SECRET is not set");
   }
   ```
   `JWT_SECRET` selanjutnya bertipe `string` (bukan `string | undefined`),
   jadi tidak perlu non-null assertion di pemakaian berikutnya.
2. Tidak ada perubahan lain pada fungsi `generateToken()` / `verifyToken()` —
   keduanya tetap memakai konstanta yang sama.

### Alternatif yang dipertimbangkan (tidak diambil)
Mengekstrak secret ke helper bersama (mis. `lib/env.ts`) agar `lib/auth.ts` dan
`lib/mail.ts` tidak menduplikasi guard. Ditolak untuk siklus ini karena menambah
coupling antar-modul — melanggar prinsip perubahan minimal AGENTS.md. Refactor
kecil semacam ini bisa masuk siklus pembersihan nanti.

## Risiko & dampak

- **Perilaku baru saat env hilang**: sebelumnya aplikasi "jalan" diam-diam dengan
  secret publik (rentang diserang); sekarang route yang meng-import `lib/mail.ts`
  gagal load dengan error eksplisit. Ini **fail-closed** — justru tujuan fix.
  Catatan: `lib/auth.ts` sudah berperilaku sama sejak awal, jadi deployment tanpa
  `JWT_SECRET` sebenarnya sudah rusak untuk login; fix ini menyamakan sisi email.
- Deployment yang sudah benar (env terisi) **tidak mengalami perubahan apa pun**.
- Token lama yang tertanda secret default: jika sampai ada environment yang pernah
  jalan tanpa `JWT_SECRET`, semua token verifikasi/reset lama otomatis invalid
  setelah secret asli dipasang — efek yang diinginkan.

## Cara verifikasi setelah fix

1. `npx tsc --noEmit` + `npx eslint lib/mail.ts`.
2. Grep memastikan tidak ada lagi string fallback `"your-secret-key-change-this"`
   di seluruh repo.
3. Smoke test runtime (env lengkap): jalankan dev server, `POST /api/auth/forgot`
   dengan body `{"email":"..."}` → harus tetap merespons JSON normal (400/404/200),
   **bukan** crash/error modul — membuktikan guard tidak merusak jalur normal.
