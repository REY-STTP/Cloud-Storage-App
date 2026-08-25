# Report Fix — C-3: Fallback JWT Secret Hardcoded di lib/mail.ts

> Tanggal: 2026-08-25
> Plan referensi: `docs/PLAN-C-3.md`

## Status: SELESAI

## Yang diubah

**1 file: `lib/mail.ts`** (baris 5)

```ts
// Sebelum
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this";

// Sesudah (pola identik dengan lib/auth.ts)
const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}
```

Perilaku berubah dari **fail-open** (diam-diam memakai secret publik yang dikenal)
menjadi **fail-closed**: environment tanpa `JWT_SECRET` kini gagal eksplisit saat
modul dimuat, bukan menandatangani token verifikasi/reset dengan secret yang bisa
ditebak siapa pun. Deployment dengan env lengkap tidak terpengaruh sama sekali.

Catatan implementasi: versi awal edit tanpa non-null assertion (`!`) membuat
TypeScript error di `jwt.sign()` (tipe `string | undefined`) — diperbaiki dengan
mengadopsi pola persis seperti `lib/auth.ts` (assertion + runtime guard).

## Hasil verifikasi

| Uji | Hasil |
|-----|-------|
| `npx tsc --noEmit` | ✅ exit 0 |
| `npx eslint lib/mail.ts` | ✅ exit 0 |
| Grep fallback secret di source code (`lib/`, `app/`, `components/`, `hooks/`, `scripts/`) | ✅ BERSIH — string hanya tersisa sebagai kutipan di docs (`AUDIT-REPORT.md`, `docs/PLAN-C-3.md`) |
| Smoke test `POST /api/auth/forgot` | ✅ Respons JSON normal **404** (email tak terdaftar) — modul termuat tanpa crash, guard tidak merusak jalur normal |

## Temuan lain yang terlihat tapi tidak dikerjakan

- Duplikasi guard `JWT_SECRET` antara `lib/auth.ts` dan `lib/mail.ts` bisa dirapikan
  dengan helper bersama (`lib/env.ts`) — refactor kecil, di luar scope siklus ini.
- `/forgot` tetap mengenumerasi email via 404 (temuan **M-1**, siklus terpisah).
