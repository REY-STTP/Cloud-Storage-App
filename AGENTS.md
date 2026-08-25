# AGENTS.md — Aturan Workflow Audit Fix

Aturan ini **wajib** diikuti oleh setiap agent yang mengerjakan perbaikan hasil audit di project ini.
Tujuannya: memastikan setiap perbaikan terencana, terdokumentasi, dan selalu mendapat persetujuan user
sebelum ada perubahan kode.

---

## 📌 Sumber Kebenaran

| File | Fungsi |
|------|--------|
| `AUDIT-REPORT.md` | Daftar semua temuan audit beserta statusnya. **Jangan ubah isi temuan**, hanya boleh mengubah status. |
| `docs/PLAN-X.md` | Rencana perbaikan untuk satu temuan (dibuat agent, disetujui user). |
| `docs/REPORT-X.md` | Laporan hasil eksekusi perbaikan untuk satu temuan. |

`X` = ID temuan di `AUDIT-REPORT.md` tanpa tanda hubin spasi, format: `C-1`, `C-2`, `H-1`, … `M-1`, … `L-1`, …
Contoh nama file: `docs/PLAN-C-1.md`, `docs/REPORT-C-1.md`.

---

## 🔄 Alur Wajib (satu temuan per siklus)

Kerjakan **SATU temuan saja** per siklus, urut dari severity tertinggi
(Critical → High → Medium → Low; dalam satu severity, ikuti urutan nomor).

### Step 1 — Baca daftar temuan
Baca `AUDIT-REPORT.md` dan pilih temuan berikutnya yang **belum berstatus ✅ selesai**.
Jangan bertanya "mau perbaiki yang mana?" — otomatis ambil urutan prioritas,
kecuali user secara eksplisit menyebut ID tertentu.

### Step 2 — Buat plan (JANGAN menyentuh kode)
Analisis temuan tersebut:
- Baca semua file yang terkait dengan temuan.
- Rinci langkah perbaikan konkret: file mana diubah apa, urutannya bagaimana.
- Catat risiko/efek samping (mis. breaking change, butuh migrasi DB, butuh test).
- Cantumkan estimasi cakupan perubahan (daftar file yang akan dimodifikasi).

### Step 3 — Tulis plan lalu STOP
Tulis hasil analisis ke `docs/PLAN-X.md` dengan struktur:

```markdown
# Plan Fix — [ID]: [Judul singkat temuan]

## Temuan (ringkas dari AUDIT-REPORT.md)
## File yang akan diubah
## Langkah perbaikan (numbered, konkret)
## Risiko & dampak
## Cara verifikasi setelah fix
```

Setelah menulis file plan: **BERHENTI dan tunggu approve user.**
Dilarang mengubah kode apa pun sebelum ada persetujuan eksplisit.

### Step 4 — Eksekusi fix (hanya jika di-approve)
Jika user menyetujui:
- Terapkan langkah-langkah sesuai `docs/PLAN-X.md`.
- Jangan menyimpang dari plan; jika di tengah jalan ternyata perlu perubahan pendekatan,
  **stop dulu**, jelaskan, dan minta persetujuan ulang.
- Jaga perubahan seminimal mungkin — jangan refactor di luar scope temuan.
- Jangan sekalian memperbaiki temuan lain yang kebetulan lewat, cukup catat di report.

### Step 5 — Tulis report lalu STOP
Setelah selesai, tulis `docs/REPORT-X.md` dengan struktur:

```markdown
# Report Fix — [ID]: [Judul singkat]

## Status: SELESAI / SEBAGIAN / GAGAL
## Yang diubah (file + ringkasan diff perubahan)
## Hasil verifikasi (hasil manual check / build / lint yang dijalankan)
## Temuan lain yang terlihat tapi tidak dikerjakan (opsional)
```

Jalankan verifikasi dasar sebelum menulis report (minimal `npm run build` atau `npx tsc --noEmit`,
plus `npm run lint` bila relevan). Setelah file report ditulis:
**BERHENTI dan tunggu review/approve user.**

### Step 6 — Update status di AUDIT-REPORT.md (hanya jika di-approve)
Jika user menyetujui hasil report:
- Edit **status** temuan tersebut di `AUDIT-REPORT.md`:
  - Ubah emoji severity menjadi ✅ di baris judul temuan, tambahkan tanggal + link report.
    Contoh: `### ✅ C-1. ... (FIXED 2026-08-25 — see docs/REPORT-C-1.md)`
  - Perbarui tabel *Ringkasan Eksekutif* (kurangi jumlah pada kolom severity terkait,
    tambahkan ke kolom Fixed bila ada).
- Setelah itu **BERHENTI lagi** dan tanyakan apakah lanjut ke temuan berikutnya
  (kembali ke Step 1 untuk temuan selanjutnya).

## 🚫 Larangan Mutlak

1. **Dilarang mengubah kode sebelum plan di-approve** — termasuk perubahan "kecil" sekalian.
2. **Dilarang mengerjakan lebih dari satu temuan dalam satu siklus.**
3. **Dilarang mengubah isi/deskripsi temuan di `AUDIT-REPORT.md`** — hanya status boleh diubah.
4. **Dilarang menghapus/mengedit `docs/PLAN-X.md` dan `docs/REPORT-X.md` yang sudah ditulis**
   (buat revisi sebagai bagian baru di file yang sama dengan penanda tanggal).
5. **Dilarang menandai temuan FIXED tanpa report yang sudah di-approve user.**

---

## ⚡ Mode Batch (Bulk Fix)

Aktif hanya atas **instruksi eksplisit user** untuk memperbaiki banyak temuan sekaligus
(mis. "fix semua temuan lain"). Dalam mode ini:

1. **Siklus per temuan TIDAK berlaku** — tidak ada stop/approve antar temuan; persetujuan
   user pada instruksi batch dianggap approval untuk seluruh plan gabungan.
2. Agent tetap **wajib menulis plan gabungan** (`docs/PLAN-BATCH-[label].md`) yang merinci
   setiap temuan: kebijakan yang diambil, file yang diubah, risiko, dan verifikasi —
   **sebelum** menyentuh kode.
3. Kelompokkan pengerjaan per tema/file agar tidak saling bertabrakan; eksekusi berurutan,
   verifikasi (`tsc`/`lint`/test fungsional) dijalankan per kelompok dan ulangi di akhir.
4. Temuan yang **sudah terselesaikan secara tidak langsung oleh siklus lain** tidak
   dikerjakan ulang — cukup dicatat di report batch dengan penjelasan.
5. Temuan yang memang **tidak dikerjakan** (mis. butuh keputusan bisnis / infrastruktur
   eksternal / integrasi test yang tidak memungkinkan) diberi status `DEFERRED` dengan
   alasan eksplisit di report — bukan diam-diam dilewati.
6. Setelah semua selesai: tulis **satu report gabungan** (`docs/REPORT-BATCH-[label].md`),
   update status semua temuan terkait di `AUDIT-REPORT.md`, lalu **STOP satu kali** untuk
   review akhir user. User berhak meminta rollback temuan tertentu.

---

## 📝 Konvensi Tambahan

- Semua dokumen plan/report ditulis dalam Bahasa Indonesia, kode & istilah teknis tetap English.
- Commit message (jika diminta commit): `fix(audit): [ID] - judul singkat`,
  contoh: `fix(audit): C-1 add rate limiting to login endpoint`.
- Jika sebuah fix bergantung pada fix lain (mis. helper auth dipakai banyak route),
  sebutkan dependensinya di plan dan usulkan urutan pengerjaan.
- Jika saat mengeksekusi ditemukan bahwa temuan ternyata false positive,
  jangan diam-diam skip: dokumentasikan buktinya di `docs/REPORT-X.md` dengan
  status `FALSE POSITIVE` dan biarkan user yang memutuskan.
