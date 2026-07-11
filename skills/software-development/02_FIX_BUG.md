---
name: fix-bug
description: >-
  Workflow standar AI untuk debugging dan bug fixing. Berlaku universal
  untuk semua proyek. Fokus pada proses investigasi, bukan detail teknis.
---

# Fix Bug — AI Debugging Workflow

## 1. Purpose

Dokumen ini mendefinisikan proses standar untuk debugging dan memperbaiki bug.
Tujuannya: mengidentifikasi **root cause** dengan efisien, menerapkan **fix
minimal**, dan memastikan **tidak ada regression**.

Ini adalah workflow investigasi — dirancang untuk menggantikan trial-and-error
dengan pendekatan sistematis berbasis bukti.

---

## 2. When to Use

Gunakan workflow ini ketika menerima task yang melibatkan **ketidaksesuaian
antara behavior aktual dan behavior yang diharapkan**.

Task yang termasuk:
- Bug report (crash, error, wrong output, UI mismatch)
- Regression dari fitur yang sebelumnya berfungsi
- Performance degradation
- Error log / exception yang perlu diinvestigasi
- Edge case yang tidak tertangani

Task yang **tidak** termasuk (jangan gunakan):
- Implementasi fitur baru (gunakan implement-feature workflow)
- Code review (gunakan code review workflow)
- Optimasi tanpa bug (gunakan profiling workflow jika ada)
- Diskusi arsitektur murni

Jika ragu apakah suatu task butuh workflow ini: tanya ke Brahma.

---

## 3. Preconditions

Sebelum memulai debugging, pastikan:

1. **Bug sudah direproduksi.** Atau setidaknya ada langkah reproduksi yang jelas.
2. **Bukti awal sudah terkumpul.** Log, screenshot, stack trace, atau deskripsi behavior.
3. **Environment diketahui.** Production / staging / dev? Konfigurasi spesifik?
4. **Dampak dipahami.** Seberapa kritis? Siapa yang terpengaruh?
5. **Dokumen proyek sudah dibaca.** Constitution, AGENTS.md, shared context.

Jika bug tidak bisa direproduksi, jangan lanjut ke workflow — berhenti dan laporkan.

---

## 4. Debugging Workflow

### Step 1 — Reproduce the Bug

Pastikan bug bisa direproduksi secara konsisten.

- Ikuti langkah reproduksi yang diberikan Brahma.
- Jika tidak ada langkah reproduksi, coba cari sendiri based on deskripsi.
- Catat: di environment apa bug muncul? Data apa yang memicu?
- Variasikan input untuk memahami boundary bug.

**Jika bug tidak bisa direproduksi setelah 3 percobaan serius: berhenti.**
Laporkan ke Brahma — mungkin bug intermittent, butuh data tambahan, atau
sudah terfix tanpa sengaja.

### Step 2 — Collect Evidence

Kumpulkan bukti sebelum menarik kesimpulan:

- **Logs** — cari error log, warning, atau pattern aneh di sekitar waktu bug muncul.
- **Stack traces** — baca trace dari bawah ke atas. Cari baris kode yang dipanggil.
- **State** — apa nilai variable? State aplikasi? Data di database?
- **Network** — request/response apa yang gagal? Status code? Payload?
- **Screenshot / UI** — visual mismatch, element hilang, layout rusak.

Gunakan tools: `search_files` (cari pattern error), `terminal` (cek log),
`browser` (cek UI state).

### Step 3 — Identify Root Cause

Analisa bukti untuk menemukan akar masalah.

Pisahkan tiga level:

| Level | Definisi | Contoh |
|-------|----------|--------|
| **Symptom** | Apa yang terlihat salah | Tombol tidak bisa diklik |
| **Root Cause** | Kenapa itu terjadi | Event handler tidak terdaftar karena ID mismatch |
| **Contributing Factor** | Apa yang memperparah | Tidak ada error handling, jadi silent fail |

Teknik:
- **5 Whys** — tanya "kenapa" berulang sampai sampai ke akar.
- **Bisect** — jika perubahan besar, cari commit mana yang memperkenalkan bug.
- **Rubber duck** — jelaskan bug dengan suara keras, sering ketemu jawaban sendiri.

**Aturan: jangan menyentuh kode sebelum root cause teridentifikasi dan diverifikasi.**

### Step 4 — Verify the Root Cause

Sebelum menulis fix, buktikan bahwa root cause yang dihipotesiskan benar.

Cara verifikasi:
- Tambahkan logging sementara untuk mengkonfirmasi alur eksekusi.
- Ubah parameter input untuk memicu jalur kode yang dicurigai.
- Cek dokumentasi atau kode lain dengan pola serupa.
- Search reference: apakah bagian kode ini dipanggil di tempat lain?

**Jika root cause tidak terverifikasi, kembali ke Step 3.**
Jangan lanjut ke implementasi dengan tebakan.

### Step 5 — Plan the Smallest Possible Fix

Rencanakan fix minimal:

- Baris apa yang perlu diubah? Minimal mungkin.
- File apa saja yang terpengaruh?
- Apakah fix ini berisiko regression? Di mana?
- Apa cara paling defensive? (Validasi input, null check, boundary guard.)

Gunakan prinsip **minimal change** dari dokumen implement-feature:
Reuse > Extend > Patch > Refactor > Rewrite.

### Step 6 — Implement

Tulis fix dengan disiplin:

- Satu fix per langkah — jangan perbaiki bug lain yang ditemukan.
- Verifikasi setiap perubahan dengan syntax check.
- Jangan refactor, jangan cleanup, jangan perbaiki code style.

### Step 7 — Verify the Original Bug is Fixed

Reproduksi scenario yang sama dari Step 1. Pastikan bug sudah hilang.

- Jalankan langkah reproduksi yang sama.
- Cek bahwa symptom tidak muncul lagi.
- Jika bug intermittent, test beberapa kali.

### Step 8 — Verify No Regression

Pastikan fix tidak merusak yang lain:

- Test fitur terkait yang mungkin terpengaruh.
- Cek area code yang menggunakan kode yang diubah.
- Jalankan test suite jika tersedia.
- Cek log untuk error baru.

### Step 9 — Report

Lapor menggunakan format baku (lihat Section 11).

---

## 5. Decision Rules

Hierarki keputusan saat debugging:

| Prioritas | Aturan |
|-----------|--------|
| 1 (tertinggi) | **Fix the cause, not the symptom.** Jangan tambal noise kalau sumber masalah ada di dalam. |
| 2 | **Prefer defensive fixes over rewrites.** Null check, boundary guard, validasi input — lebih aman daripada restructure. |
| 3 | **Preserve existing behavior** kecuali bug mengharuskan perubahan. Jangan ubah contract API atau format data tanpa perlu. |
| 4 | **One bug = one fix.** Satu perubahan untuk satu root cause. Jangan gabung multiple bug dalam satu implementasi. |
| 5 | **Never mix bug fixes with refactoring.** Refactor adalah task terpisah. Fix dulu, refactor nanti (jika ditugaskan). |

---

## 6. Root Cause Analysis

**Ini adalah langkah paling penting dalam debugging.**

AI harus secara eksplisit membedakan tiga level analisa. Jika ragu,
tuliskan ketiganya dalam bentuk tabel sebelum melanjutkan:

```
Symptom:           [apa yang terlihat salah]
Root Cause:        [penyebab fundamental]
Contributing:      [faktor yang memperparah atau menyembunyikan bug]
```

### Panduan menemukan root cause

1. **Baca error dari bawah.** Stack trace: line error sebenarnya ada di bagian bawah trace, bukan baris pertama.
2. **Cari asumsi yang salah.** Kebanyakan bug lahir dari asumsi yang tidak terverifikasi — format data, nullability, tipe, state.
3. **Ikuti alur data.** Data masuk dari mana? Berubah dimana? Sampai ke tujuan dengan bentuk apa?
4. **Cari pattern serupa.** Bug ini mirip dengan bug sebelumnya? Cari di codebase bagaimana kasus serupa ditangani.
5. **Gunakan binary search.** Cari di timeline: commit mana yang memperkenalkan bug? `git bisect` jika tersedia.

### Contoh

| Level | Output | Keterangan |
|-------|--------|------------|
| Symptom | Dashboard menampilkan angka "NaN" | Yang terlihat user |
| Root Cause | State variable `total` tidak diinisialisasi sebelum penjumlahan | Penyebab utama |
| Contributing | Tidak ada default value di reducer | Faktor yang memperparah |

**Aturan besi: jangan mulai coding sebelum root cause teridentifikasi.**

---

## 7. Scope Control

Aturan besi selama debugging:

### Batasan
- **Hanya ubah kode untuk fix bug ini.** Jangan perbaiki bug lain yang kebetulan ditemukan.
- **Jangan refactor** sambil debugging — sekalipun kode di sekitar jelek.
- **Jangan cleanup** — komentar, spasi, formatting, semuanya tetap.
- **Jangan optimasi** — fix dulu, performa belakangan.

### Observation vs Action
Ketemu bug lain saat debugging? Catat sebagai observation:

```
Observation during debugging:
- [file:line] menemukan potensi bug X
- [file:line] kode tidak konsisten dengan pattern Y
- [file:line] potensi memory leak
```

Jangan diperbaiki. Brahma bisa menugaskan task terpisah.

---

## 8. Validation Checklist

Sebelum menyatakan bug selesai, pastikan semua ini terpenuhi:

- [ ] **Bug berhasil direproduksi** — tahu persis kondisi munculnya.
- [ ] **Root cause terverifikasi** — bukan tebakan, ada bukti.
- [ ] **Bug sudah hilang** — scenario reproduksi tidak lagi memicu.
- [ ] **Tidak ada regression** — fitur sekitar tetap berfungsi.
- [ ] **Tidak ada architecture violation** — fix sesuai struktur proyek.
- [ ] **Existing patterns tetap dipakai** — fix terlihat seperti bagian dari codebase.
- [ ] **Build/tests lulus** — jika ada build system atau test suite.
- [ ] **Tidak ada debug artifact** — logging sementara, console.log, comment sudah dibersihkan.

Jika salah satu gagal, jangan declare selesai. Fix dulu.

---

## 9. Common Failure Modes

### Fixing Symptoms Instead of Causes
Memperbaiki yang terlihat tanpa menemukan akar masalah. Contoh: nambah null check di UI padahal penyebabnya data dari API tidak divalidasi.

**Antidote:** Root cause analysis (Section 6) wajib dilakukan sebelum coding.

### Trial-and-Error Debugging
Mengubah kode secara acak, jalanin, lihat hasil, ulang — tanpa analisa.

**Antidote:** Jangan sentuh kode sebelum root cause terverifikasi. Gunakan data, bukan tebakan.

### Making Assumptions
"Pasti ini karena X" tanpa bukti. Berhenti di dugaan pertama tanpa mencari alternatif.

**Antidote:** Verifikasi setiap hipotesis. Jika dugaan pertama salah, ada dugaan kedua yang siap.

### Multiple Fixes for One Bug
Memperbaiki satu bug dengan beberapa perubahan di tempat berbeda, karena tidak yakin mana yang jadi penyebab sebenarnya.

**Antidote:** Satu root cause = satu fix. Jika root cause tunggal membutuhkan perubahan di >1 file, pastikan setiap perubahan diperlukan.

### Hidden Regressions
Fix untuk bug A merusak fitur B yang tidak dites. Umum terjadi ketika fix mengubah shared logic.

**Antidote:** Search reference semua kode yang menggunakan function/logic yang diubah. Test area terkait.

### Refactoring While Debugging
"Selagi di sini, mending dibenerin struktur kodenya." Ini memperbesar diff, memperumit rollback, dan bisa introduce bug baru.

**Antidote:** Ingat Decision Rule #5 — never mix bug fixes with refactoring.

---

## 10. Stop Conditions

**Prinsip utama: «Never continue by guessing.»**

AI harus **berhenti dan melapor ke Brahma** jika salah satu kondisi berikut
terpenuhi. Jangan lanjutkan debugging.

| # | Kondisi | Tindakan |
|---|---------|----------|
| 1 | **Bug tidak bisa direproduksi.** Langkah reproduksi tidak jelas, atau bug intermittent dan tidak muncul lagi. | Laporkan kondisi dan apa yang sudah dicoba. Tanya data tambahan. |
| 2 | **Root cause belum ditemukan.** Semua jalur investigasi sudah dicoba tapi akar masalah tidak ketemu. | Stop. Laporkan temuan parsial, minta arahan. |
| 3 | **Informasi tidak cukup.** Log tidak ada, stack trace tidak lengkap, tidak bisa akses environment yang bermasalah. | Berhenti, laporkan apa yang kurang. |
| 4 | **Fix akan melanggar Constitution.** Solusi yang diperlukan bertentangan dengan aturan proyek. | Stop. Jangan eksekusi. Laporkan ke Brahma. |
| 5 | **Dibutuhkan perubahan di luar scope.** Fix membutuhkan perubahan arsitektur atau refactor besar di luar area bug. | Stop. Laporkan temuan, tunggu keputusan. |

**Setelah berhenti dan melapor, tunggu instruksi Brahma sebelum lanjut.**

---

## 11. Report Format

Gunakan format baku berikut untuk melapor hasil debugging.

```
Summary: [1-2 kalimat — bug apa, dimana, fix apa]
Root Cause: [penyebab fundamental, 1-2 kalimat]
Files Changed:
  - [path/file.ext] ([baris]) — [deskripsi perubahan]
Validation:
  - Bug reproduced? Yes/No
  - Root cause verified? Yes/No
  - Bug fixed? Yes/No
  - No regression? Yes/No
Known Limitations: [edge case yang belum dihandle, jika ada]
Next Steps: [yang perlu dilakukan selanjutnya, jika ada]
```

### Contoh

```
Summary: Fix NaN pada dashboard total revenue saat portfolio kosong.
Root Cause: calculateTotal() tidak handle empty array — reduce() tanpa initial value return NaN.
Files Changed:
  - /root/agents/pablo/finance/app.py (line 142) — tambah initial value 0 pada reduce()
Validation:
  - Bug reproduced? Yes
  - Root cause verified? Yes — logging konfirmasi empty array memicu jalur tersebut
  - Bug fixed? Yes — total menampilkan 0 untuk portfolio kosong
  - No regression? Yes — endpoint portfolio normal tetap berfungsi
Known Limitations: None.
Next Steps: None. Fix siap.
```

---

## 12. Success Criteria

Bug fixing dinyatakan sukses jika:

1. **Bug sudah hilang** — langkah reproduksi tidak memicu error.
2. **Root cause terdokumentasi** — bukan hanya symptom yang dihilangkan.
3. **Tidak ada regression** — fitur lain tidak rusak.
4. **Fix minimal** — perubahan sekecil mungkin untuk menyelesaikan masalah.
5. **Brahma puas** — hasil sesuai ekspektasi.

---

## 13. Related Documents

- **01_IMPLEMENT_FEATURE.md** — workflow implementasi fitur (Minimal Change, Decision Rules, Report Format)
- **Project Constitution** — aturan main proyek, pembacaan wajib
- **Systematic Debugging** — skill debugging sistematis 4-phase (teknik detail)
- **Developer Protocol (AGENTS.md)** — prosedural dev: backup, commit, verify
