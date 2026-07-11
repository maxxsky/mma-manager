---
name: code-review
description: >-
  Workflow standar AI untuk melakukan code review terhadap perubahan yang sudah
  selesai diimplementasikan. Fokus pada objektivitas, bukti, dan konsistensi
  dengan standard proyek.
---

# Code Review — AI Review Workflow

## 1. Purpose

Dokumen ini mendefinisikan proses standar untuk melakukan **code review**
terhadap perubahan yang sudah selesai diimplementasikan. Tujuannya: menilai
kualitas, konsistensi, dan risiko dari suatu perubahan secara objektif —
bukan berdasarkan preferensi pribadi.

Ini adalah workflow evaluasi — dirancang untuk menghasilkan review yang
**berbasis bukti, terstruktur, dan actionable**.

---

## 2. When to Use

Gunakan workflow ini ketika menerima task untuk **meninjau perubahan kode**
yang sudah selesai — baik oleh AI, oleh Brahma, atau dari kontribusi lain.

Task yang termasuk:
- Review pull request / merge request
- Review hasil implementasi fitur (post-implement-feature)
- Review hasil bug fix (post-fix-bug)
- Review perubahan kode sebelum deployment
- Review kontribusi eksternal

Task yang **tidak** termasuk (jangan gunakan):
- Self-review saat implementasi (gunakan Step 7 dari implement-feature workflow)
- Debugging (gunakan fix-bug workflow)
- Implementasi fitur baru (gunakan implement-feature workflow)
- Diskusi arsitektur tanpa kode

---

## 3. Inputs

Sebelum memulai review, pastikan input berikut tersedia:

1. **Kode perubahan** — diff atau file yang dimodifikasi.
2. **Requirement asli** — apa yang diminta untuk dibuat/diubah.
3. **Dokumen acuan** — Constitution, AGENTS.md, shared context.
4. **Pola existing** — kode serupa yang sudah ada di codebase (untuk pembanding).
5. **Link atau konteks** — issue tracker, task description, atau komunikasi terkait.

Jika input tidak lengkap, jangan lanjut — berhenti dan minta yang kurang.

---

## 4. Preconditions

Sebelum memulai review, pastikan:

1. **Perubahan sudah selesai.** Bukan work-in-progress.
2. **Kode bisa dibaca.** Format rapi, tidak ada syntax error.
3. **Requirement jelas.** Tahu apa yang seharusnya dibuat.
4. **Standar proyek diketahui.** Constitution dan pola existing sudah dipahami.
5. **Status environment diketahui.** Apakah ini akan di-deploy? Ke mana?

---

## 5. Review Workflow

### Step 1 — Understand the Change

Baca diff atau file yang dimodifikasi secara keseluruhan.

- File apa saja yang berubah?
- Berapa besar perubahan? (baris, file, modul)
- Apa tujuan dari setiap perubahan?
- Apakah perubahan terlihat masuk akal secara intuitif?

Jangan mulai menilai sebelum paham gambaran besarnya.

### Step 2 — Compare Against the Original Requirement

Cocokkan implementasi dengan requirement asli.

- Apakah semua yang diminta sudah diimplementasikan?
- Apakah ada yang tidak diminta tapi ikut dibuat? (scope creep)
- Apakah ada yang diminta tapi tidak dibuat? (miss)
- Apakah behavior sesuai dengan yang diharapkan?

**Jika implementasi tidak sesuai requirement, catat sebagai Critical.**

### Step 3 — Check Constitution Compliance

Review terhadap aturan proyek yang mengikat.

- Apakah perubahan melanggar aturan dalam Constitution?
- Apakah ada pelanggaran terhadap AGENTS.md atau developer protocol?
- Apakah data handling sesuai dengan kebijakan proyek?

**Jika melanggar Constitution, catat sebagai Critical — wajib diperbaiki.**

### Step 4 — Check Architecture Compliance

Review terhadap struktur proyek.

- Apakah perubahan sesuai dengan arsitektur yang ada?
- Apakah penempatan file/modul sudah tepat?
- Apakah tidak memperkenalkan ketergantungan yang salah arah?
- Apakah tidak melanggar separation of concern?

### Step 5 — Check Existing Pattern Consistency

Review terhadap konsistensi dengan codebase.

- Apakah kode baru menggunakan pola yang sama dengan kode existing?
- Apakah naming convention konsisten?
- Apakah error handling mengikuti pattern yang ada?
- Apakah struktur data konsisten?

**Ini adalah area paling sering ditemukan masalah.** Kode baru yang
menggunakan pola berbeda adalah red flag.

### Step 6 — Review Logic Correctness

Review terhadap kebenaran logika.

- Apakah algoritma/logika sudah benar?
- Apakah kondisi dan branching sudah tepat?
- Apakah tidak ada infinite loop atau recursion tak terbatas?
- Apakah state management sudah benar?

### Step 7 — Review Edge Cases

Cari celah di boundary dan kondisi abnormal.

- Apa yang terjadi dengan input kosong?
- Apa yang terjadi dengan data ekstrem?
- Apa yang terjadi ketika dependensi gagal?
- Apa yang terjadi dalam kondisi race?
- Apa yang terjadi saat state tidak terduga?

### Step 8 — Review Regression Risk

Nilai risiko perubahan terhadap fitur existing.

- Apakah perubahan menyentuh shared logic?
- Apakah function/method yang diubah dipanggil di tempat lain?
- Apakah format data berubah?
- Apakah ada perubahan yang tidak backward compatible?
- Apakah area yang terpengaruh sudah dites?

### Step 9 — Produce Review Report

Tulis laporan review menggunakan format baku (lihat Section 12).

Setiap temuan harus memiliki:
- Severity level
- Lokasi spesifik (file:line)
- Evidence (mengapa ini masalah)
- Recommendation (apa yang harus dilakukan)

---

## 6. Review Categories

Review mencakup **10 kategori** berikut. Tidak semua kategori relevan untuk
setiap perubahan — gunakan judgment. Tapi jangan skip lebih dari 3 kecuali
perubahan sangat kecil.

| # | Kategori | Fokus |
|---|----------|-------|
| 1 | **Requirement compliance** | Apakah perubahan memenuhi apa yang diminta? |
| 2 | **Architecture** | Apakah sesuai dengan struktur dan arsitektur proyek? |
| 3 | **Scope control** | Apakah hanya mengubah yang seharusnya? |
| 4 | **Logic correctness** | Apakah logika dan algoritma sudah benar? |
| 5 | **Existing patterns** | Apakah konsisten dengan pola yang ada di codebase? |
| 6 | **Maintainability** | Apakah mudah dipahami dan diubah di masa depan? |
| 7 | **Readability** | Apakah kode jelas dan self-documenting? |
| 8 | **Error handling** | Apakah error, edge case, dan failure state tertangani? |
| 9 | **Regression risk** | Apakah ada risiko merusak fitur lain? |
| 10 | **Performance** | Apakah ada bottleneck yang jelas? (hanya jika relevan) |

---

## 7. Severity Levels

Setiap temuan dalam review harus diberi severity level. **Tidak boleh ada
temuan tanpa severity.**

| Level | Label | Arti | Tindakan |
|-------|-------|------|----------|
| **S0** | **Critical** | Bug, security issue, atau pelanggaran aturan. Wajib diperbaiki sebelum merge. | Blocker. Jangan approve. |
| **S1** | **Major** | Masalah signifikan — inconsistency, missing edge case, pola salah. Sebaiknya diperbaiki. | Recommend fix. Bisa approve dengan catatan. |
| **S2** | **Minor** | Masalah kecil — naming kurang tepat, komentar kurang, formatting. | Nice to fix. Bisa skip. |
| **S3** | **Suggestion** | Improvement opsional — ide alternatif, pengembangan ke depan. | Bisa diabaikan. |

### Panduan penggunaan

- **Critical** hanya untuk: bug nyata, security hole, pelanggaran Constitution,
  atau requirement tidak terpenuhi. Jangan abuse.
- **Major** untuk: pola tidak konsisten, error handling lemah, edge case tidak
  tertangani, readability buruk yang mempengaruhi maintainability.
- **Minor** untuk: preferensi style, komentar kurang, variable naming.
- **Suggestion** untuk: "akan lebih baik jika...", ide untuk iterasi berikutnya.

Jika ragu antara dua level: pilih yang lebih rendah. Review yang kredibel
tidak perlu lebay.

---

## 8. Decision Rules

Hierarki keputusan saat melakukan review:

| Prioritas | Aturan |
|-----------|--------|
| 1 (tertinggi) | **Review against project standards, bukan preferensi pribadi.** Tolok ukurnya adalah Constitution dan pola existing, bukan "menurut saya lebih bagus begini." |
| 2 | **Jangan meminta refactor tanpa alasan yang jelas.** Setiap request perubahan harus punya reasoning — apa risiko jika tidak diperbaiki? |
| 3 | **Prioritaskan correctness daripada style.** Bug dan logic error > naming dan formatting. |
| 4 | **Jangan membuat requirement baru saat review.** Review mengevaluasi terhadap requirement yang sudah ada. "Akan lebih bagus kalo ada fitur X" adalah suggestion, bukan issue. |
| 5 | **Semua temuan harus disertai alasan dan bukti.** Bukan cuma "ini salah" — jelaskan kenapa, dan kutip sumber (Constitution, pola existing, best practice). |

---

## 9. Validation Checklist

Review dinyatakan selesai dan valid jika:

- [ ] **Requirement terpenuhi** — semua yang diminta ada, tidak ada yang missing.
- [ ] **Constitution dipatuhi** — tidak ada pelanggaran terhadap aturan proyek.
- [ ] **Architecture dipatuhi** — perubahan sesuai struktur proyek.
- [ ] **Scope tetap terjaga** — tidak ada perubahan di luar yang diminta.
- [ ] **Tidak ada regression yang terlihat** — risiko minimal terhadap fitur lain.
- [ ] **Existing patterns dipakai** — kode baru konsisten dengan codebase.
- [ ] **Tidak ada hidden breaking change** — format data, API, dan contract tidak berubah secara diam-diam.
- [ ] **Semua temuan memiliki severity** — tidak ada "ini salah" tanpa label S0-S3.

---

## 10. Common Failure Modes

### Nitpicking Style
Mengkritik hal-hal sepele — spasi, nama variable, komentar — sebagai Major atau
Critical. Ini merusak kredibilitas review dan membuang waktu.

**Antidote:** Style issues adalah Minor atau Suggestion. Kecuali melanggar
convention proyek secara eksplisit.

### Meminta Refactor yang Tidak Perlu
"Kode ini perlu di-refactor" tanpa alasan konkret. Refactor request harus
punya justification: apa masalahnya, apa risikonya jika tidak di-refactor.

**Antidote:** Decision Rule #2 — jangan minta refactor tanpa alasan jelas.

### Mengkritik Tanpa Bukti
"Ini bermasalah" tanpa menjelaskan kenapa. Atau "tidak sesuai best practice"
tanpa menyebut best practice apa.

**Antidote:** Decision Rule #5 — setiap temuan harus ada alasan dan bukti.

### Mengabaikan Requirement Asli
Review berdasarkan ekspektasi pribadi, bukan requirement. Contoh: "kenapa
pake pendekatan ini?" padahal pendekatan itu yang diminta.

**Antidote:** Step 2 — compare against original requirement. Itu tolok ukurnya.

### Terlalu Fokus pada Implementasi, Lupa Tujuan Bisnis
Review kode secara teknis sempurna, tapi lupa mengecek apakah perubahan
benar-benar menyelesaikan masalah bisnis yang dimaksud.

**Antidote:** Step 2 dan kategori Requirement compliance.

### Tidak Memberi Severity
Temuan tanpa severity level membuat author bingung: yang mana yang harus
diperbaiki? Yang mana yang boleh diabaikan?

**Antidote:** Setiap temuan wajib punya severity. Tidak ada temuan tanpa label.

---

## 11. Stop Conditions

**Prinsip utama: «Never continue by guessing.»**

AI harus **berhenti dan melapor ke Brahma** jika salah satu kondisi berikut
terpenuhi. Jangan lanjutkan review.

| # | Kondisi | Tindakan |
|---|---------|----------|
| 1 | **Requirement tidak jelas.** Tidak tahu apa yang seharusnya dibuat. | Minta requirement atau task description. |
| 2 | **Patch tidak lengkap.** Kode tidak bisa dibaca, syntax error, atau perubahan belum selesai. | Minta kirimkan versi lengkap. |
| 3 | **Konteks perubahan tidak tersedia.** Tidak tahu kenapa perubahan ini dibuat. | Minta konteks atau link ke task/issue. |
| 4 | **Tidak bisa menentukan dampak perubahan.** Perubahan terlalu besar atau menyentuh area yang tidak dipahami. | Stop. Laporkan keterbatasan, minta arahan. |
| 5 | **Dokumen acuan tidak tersedia.** Constitution, pola existing, atau standar proyek tidak bisa diakses. | Minta dokumen yang diperlukan. |

**Setelah berhenti dan melapor, tunggu instruksi Brahma sebelum lanjut.**

---

## 12. Report Format

Gunakan format baku berikut. Format ini dioptimalkan untuk dibaca di chat
(Telegram) — decision di atas, findings dalam blok terpisah, dan akhiri
dengan next action yang jelas.

```
## Review Result

🟢 Overall
**Approve** / **Approve with Minor Changes** / **Request Changes** / **Reject**

📋 Summary
1–3 kalimat ringkas.

---

✅ Strengths
• ...
• ...
• ...

---

⚠️ Findings

[S1] Judul Issue
📍 Location: file:line

Why it matters:
...

Recommendation:
...

---

[S2] Judul Issue
📍 Location: file:line

Why it matters:
...

Recommendation:
...

---

📊 Statistics

Files Reviewed : X
Issues Found   : X
Critical  (S0) : X
Major     (S1) : X
Minor     (S2) : X
Suggestion (S3) : X

---

✅ Validation

✓ Requirement checked
✓ Constitution checked
✓ Architecture checked
✓ Existing patterns checked
✓ Regression risk reviewed

---

➡️ Next Action

- ...
- ...
```

### Panduan Format

**Overall** — taruh paling atas. Ini yang paling penting, langsung terlihat.
- `Approve` — tidak ada Critical atau Major, siap merge.
- `Approve with Minor Changes` — ada Minor/Suggestion, bisa sambil merge.
- `Request Changes` — ada Major yang perlu diperbaiki sebelum merge.
- `Reject` — ada Critical, pelanggaran Constitution, atau requirement tidak terpenuhi.

**Findings** — setiap issue dalam blok sendiri dengan visual separator `---`.
- Severity badge: `[S0]` `[S1]` `[S2]` `[S3]` di awal judul.
- Location pakai `📍` biar langsung kelihatan.
- Evidence → ganti jadi **Why it matters** — lebih actionable.
- Recommendation singkat, spesifik, bisa langsung dieksekusi.

**Statistics** — ringkasan numerik. Author bisa langsung tahu berapa banyak
yang harus diperbaiki tanpa baca semua findings.

**Validation** — checklist yang menunjukkan reviewer sudah memeriksa apa saja.
Ini bukan hasil, tapi tanda bahwa area tersebut sudah di-review.

**Next Action** — instruksi konkret untuk author. Kalau Request Changes,
sebutkan items spesifik yang harus difix. Kalau Approve, bilang "Ready to merge."

### Contoh

```
## Review Result

🟢 Overall
**Request Changes**

📋 Summary
Implementasi budget history dashboard. 3 file diubah. Pola konsisten,
requirement terpenuhi. 1 Major issue (pagination) dan 2 Minor.

---

✅ Strengths
• Error handling mengikuti pattern existing (flash messages).
• Naming konsisten dengan endpoint lain di dashboard.
• Query menggunakan parameter binding — aman dari SQL injection.

---

⚠️ Findings

[S1] Missing pagination for large datasets
📍 Location: app.py:201

Why it matters:
Query mengambil ALL records tanpa limit. Untuk user dengan 5000+ transaksi,
response bisa slow dan memory-heavy. Endpoint lain di proyek ini (dashboard
utama) sudah menggunakan LIMIT 100.

Recommendation:
Tambahkan default LIMIT 100 dan offset parameter.

---

[S2] Variable naming tidak deskriptif
📍 Location: utils.py:45

Why it matters:
Variable `d` tidak memberi informasi tentang isinya. Fungsi lain di file yang
sama menggunakan nama panjang seperti `transaction_total` — ini lebih mudah
dibaca dan di-debug.

Recommendation:
Rename ke `date_range` atau `duration`.

---

📊 Statistics

Files Reviewed : 3
Issues Found   : 2
Critical  (S0) : 0
Major     (S1) : 1
Minor     (S2) : 1
Suggestion (S3) : 0

---

✅ Validation

✓ Requirement checked
✓ Constitution checked
✓ Architecture checked
✓ Existing patterns checked
✓ Regression risk reviewed

---

➡️ Next Action

1. Tambah pagination (Major) — wajib sebelum merge.
2. Rename variable `d` (Minor) — bisa di iterasi berikutnya.
```

---

## 13. Success Criteria

Code review dinyatakan sukses jika:

1. **Semua kategori relevan sudah direview.** Tidak ada yang terlewat.
2. **Setiap temuan memiliki severity.** Tidak ada temuan tanpa label.
3. **Setiap temuan disertai evidence.** Bukan opini tanpa dasar.
4. **Review objektif.** Berbasis project standards, bukan preferensi pribadi.
5. **Merge recommendation jelas.** Author tahu harus ngapain.
6. **Brahma puas.** Review membantu, bukan menghambat.

---

## 14. Related Documents

- **01_IMPLEMENT_FEATURE.md** — workflow implementasi fitur (menghasilkan kode yang akan di-review)
- **02_FIX_BUG.md** — workflow bug fixing (menghasilkan fix yang akan di-review)
- **Project Constitution** — aturan main proyek, acuan review
- **Developer Protocol (AGENTS.md)** — prosedural dev: standard yang harus dipatuhi
