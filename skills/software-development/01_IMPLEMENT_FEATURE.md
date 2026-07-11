---
name: implement-feature
description: >-
  Workflow standar AI untuk mengimplementasikan fitur baru. Berlaku universal
  untuk semua proyek — MMA Manager, Finance Dashboard, atau apapun.
  Fokus pada proses engineering, bukan detail bahasa/framework.
---

# Implement Feature — AI Engineering Workflow

## 1. Purpose

Dokumen ini mendefinisikan proses standar untuk mengimplementasikan fitur baru.
Tujuannya: menghasilkan kode yang **benar, minimal, konsisten, dan maintainable**
dengan overhead engineering serendah mungkin.

Ini adalah workflow AI — dirancang untuk menggantikan tebakan dan improvisasi
dengan prosedur yang terstruktur.

---

## 2. When to Use

Gunakan workflow ini ketika menerima task yang menghasilkan **kode baru** atau
**perubahan signifikan pada kode existing**.

Task yang termasuk:
- Fitur baru (tambah halaman, endpoint, modul, sistem)
- Perubahan behavior (logika baru, state machine baru)
- Integrasi eksternal (API, library, service)
- Refaktor terbatas untuk membuka jalan fitur baru

Task yang **tidak** termasuk (jangan gunakan):
- Bug fix sederhana (gunakan debugging workflow)
- Code review (gunakan code review workflow)
- Diskusi arsitektur tanpa implementasi
- Dokumentasi murni

Jika ragu apakah suatu task butuh workflow ini: tanya ke Brahma.

---

## 3. Preconditions

Sebelum memulai implementasi, pastikan:

1. **Request sudah clear.** Jika ambiguous, tanya Brahma — jangan interpretasi sendiri.
2. **Project documents sudah dibaca.** Minimal project-constitution dan AGENTS.md.
3. **File terkait sudah di-review.** Pahami struktur sebelum menyentuh apapun.
4. **Scope sudah disepakati.** Brahma dan AI punya ekspektasi yang sama tentang apa yang akan dibuat.
5. **Status environment diketahui.** Service jalan? Port aktif? State saat ini?

---

## 4. Minimal Change

Prinsip **minimal change** memiliki hierarki interpretasi resmi sebagai berikut:

| Prioritas | Aturan | Contoh |
|-----------|--------|--------|
| 1 | **Reuse before create.** Gunakan kode yang sudah ada sebelum menulis baru. | Copy pattern existing daripada bikin struktur baru. |
| 2 | **Extend before replace.** Perluas sistem yang ada sebelum menggantinya. | Tambah parameter daripada ganti fungsi. |
| 3 | **Patch before refactor.** Sunting minimal sebelum refaktor besar. | Edit 3 baris daripada restructure class. |
| 4 | **Refactor before rewrite.** Refaktor daripada bikin ulang dari nol. | Pisah module daripada bikin baru. |

Empat prioritas ini adalah **interpretasi resmi** dari prinsip "minimal change"
di seluruh dokumen ini. Jika ada kebingungan tentang apa arti "minimal" —
kembali ke hierarki di atas.

---

## 5. Stop Conditions

**Prinsip utama: «Never continue by guessing.»**

AI harus **berhenti dan melapor ke Brahma** jika salah satu kondisi berikut
terpenuhi. Jangan lanjutkan implementasi.

| # | Kondisi | Tindakan |
|---|---------|----------|
| 1 | **Requirement ambigu.** Tidak jelas apa yang diminta. | Tanya Brahma untuk klarifikasi. |
| 2 | **Tidak menemukan implementasi existing yang relevan.** Tidak ada pola yang bisa diikuti. | Laporkan temuan, tanya pendekatan yang diinginkan. |
| 3 | **Dua aturan proyek saling bertentangan.** Constitution, AGENTS.md, atau skill memberikan instruksi yang berlawanan. | Laporkan konflik, minta keputusan. |
| 4 | **Implementasi akan melanggar Constitution.** Solusi yang diminta bertentangan dengan aturan proyek. | Stop. Jangan eksekusi. Laporkan ke Brahma. |
| 5 | **Konteks atau file penting tidak tersedia.** File yang diperlukan untuk implementasi tidak bisa ditemukan atau dibaca. | Berhenti, laporkan apa yang hilang. |

**Setelah berhenti dan melapor, tunggu instruksi Brahma sebelum lanjut.**
Jangan berasumsi, jangan melanjutkan dengan tebakan sendiri.

---

## 6. Workflow

### Step 1 — Read Required Documents

Baca dokumen yang relevan dengan proyek dan task:
- **Project Constitution** — aturan main proyek (wajib)
- **AGENTS.md / README** — konteks teknis dan prosedural
- **Shared context** `/root/agents/shared/projects/<project>/CONTEXT.md`
- **Dokumen arsitektur** yang relevan dengan area perubahan

Jangan mulai coding sebelum paham landscape proyek.

### Step 2 — Understand the Request

Analisa permintaan Brahma:
- Apa yang diminta? Fitur baru? Perubahan? Perbaikan?
- Kenapa diminta? Problem apa yang dipecahkan?
- Siapa yang terpengaruh? User? Sistem lain? API consumer?
- Boundary: mana yang termasuk scope, mana yang tidak?

Validasi pemahaman dengan Brahma jika perlu.

### Step 3 — Locate Existing Implementation

Cari kode yang relevan di codebase:
- File mana yang perlu disentuh?
- Pola serupa sudah ada? Bisa diikuti?
- Fungsi/method/endpoint mana yang perlu diperluas?

Gunakan `search_files` untuk menemukan kode terkait.
Baca file-file tersebut sebelum membuat perubahan.

### Step 4 — Reuse Existing Patterns

Ini adalah **langkah paling penting**.

Sebelum menulis kode baru, identifikasi pola existing yang bisa digunakan:
- Bagaimana fitur serupa diimplementasikan sebelumnya?
- Convention apa yang dipakai (naming, struktur, error handling)?
- Library/utility yang sudah tersedia?
- Database pattern (query style, migration approach)?

**Gunakan pola existing, jangan buat pola baru.**

Alasan:
- Konsisten dengan codebase — mudah dibaca developer lain
- Sudah teruji — bug yang sudah diperbaiki tidak kembali
- Prediktif — reviewer tahu apa yang diharapkan

Jika pola existing benar-benar tidak cocok (terjadi <20% kasus), dokumentasikan
alasannya dan konfirmasi ke Brahma.

### Step 5 — Plan Minimal Changes

Rencanakan perubahan dengan prinsip **minimal change**:
- File apa saja yang perlu diubah? Daftar eksplisit.
- Baris kode apa yang perlu ditambah/dihapus/dimodifikasi?
- Apa dampak perubahan? Cek dependensi dan efek samping.

Output: gambaran mental yang clear tentang perubahan yang akan dilakukan.
Jika ada keraguan, tuliskan rencana singkat dan kirim ke Brahma.

### Step 6 — Implement

Tulis kode dengan disiplin:
- Satu perubahan logis per langkah
- Setiap langkah diverifikasi sebelum lanjut
- Jangan gabung perubahan yang tidak terkait
- Ikuti pola yang sudah diidentifikasi di Step 4

Tools: patch, write_file, terminal (syntax check, build, test).

### Step 7 — Self-Review

Review kode sendiri sebelum dianggap selesai:
- Apakah kode sesuai dengan pola existing?
- Apakah ada duplikasi logis?
- Apakah ada dead code / commented code / TODO yang terlewat?
- Apakah error handling konsisten dengan codebase?
- Apakah naming mengikuti convention yang ada?

Jalankan linter atau syntax checker jika tersedia.

### Step 8 — Verify

Verifikasi bahwa implementasi benar-benar berfungsi:
- Test endpoint (curl, browser, atau automated test)
- Test edge cases — input kosong, error state, boundary
- Cek tidak ada regression — fitur existing tetap jalan
- Build/test pipeline passing (jika ada)

Jika error ditemukan, diagnose dulu sebelum fix.
Jangan trial-and-error — pahami root cause.

### Step 9 — Report

Lapor ke Brahma dengan **format baku** berikut. Format ini wajib digunakan
di semua skill Skill Library yang akan datang.

**Output format:**

- **Summary** — 1-2 kalimat: apa yang dibuat dan kenapa.
- **Files Changed** — daftar path file yang dimodifikasi (absolute).
- **Validation** — status checklist: regression, architecture, patterns, build.
- **Known Limitations** — hal yang belum sempurna, edge case yang belum dihandle.
- **Next Steps** — apa yang perlu dilakukan selanjutnya (jika ada).

Contoh:

```
Summary: Added budget history endpoint to Finance Dashboard.
Files Changed:
  - /root/agents/pablo/finance/app.py
  - /root/agents/pablo/finance/templates/index.html
Validation: No regression. Architecture intact. Existing patterns respected.
Known Limitations: Pagination not yet implemented for large datasets.
Next Steps: None. Fitur siap digunakan.
```

Jika menggunakan developer protocol Pablo: commit + push setelah report.

---

## 7. Decision Rules

Hierarki keputusan saat implementasi:

| Prioritas | Aturan |
|-----------|--------|
| 1 (tertinggi) | **Ikuti Project Constitution.** Dokumen ini mengikat. Jangan melanggar. |
| 2 | **Jaga backward compatibility.** Jangan rusak API, data, atau behavior lama. |
| 3 | **Extend existing, jangan buat baru.** Perluas sistem yang sudah ada. |
| 4 | **Gunakan pola existing.** Solusi baru tidak boleh memperkenalkan pattern baru tanpa konfirmasi. |
| 5 | **Prefer simpler solution.** Dua solusi valid? Pilih yang lebih sederhana. |
| 6 | **Minimal patch.** Perubahan terkecil yang menyelesaikan masalah. |

Kasus khusus: jika aturan saling bertentangan, yang lebih tinggi di prioritas menang.

Contoh:
- "Membuat service baru lebih simple daripada extend existing" → Aturan 3 menang, extend existing.
- "Pattern existing jelek, pattern baru lebih baik" → Aturan 4 menang, pakai yang existing kecuali Brahma approve.
- "Perubahan minimal menyebabkan breaking change" → Aturan 2 menang, cari pendekatan lain.

---

## 8. Scope Control

Aturan besi untuk menjaga scope tetap terkendali:

### Batasan
- **Hanya ubah file yang diperlukan** untuk fitur ini.
- **Jangan refactor** kode yang tidak terkait, sekalipun jelek.
- **Jangan touch** file di luar area yang diidentifikasi di Step 3.
- **Jangan optimasi pre-mature.** Optimasi hanya jika diminta atau jika jelas diperlukan.

### Tanda scope creep
- Mulai memperbaiki "coding style" di file tidak terkait
- Ingin "membersihkan" kode lama sambil jalan
- Menambahkan fitur "ini bagus juga kalo ada"
- Inline komentar "nanti kalo ada waktu..." atau "TODO: refactor"

### Cara handle
Ketemu kode jelek di area yang tidak terkait? Catat di report sebagai observasi,
jangan diperbaiki. Brahma bisa menugaskan refactor terpisah nanti.

---

## 9. Validation Checklist

Sebelum menyatakan selesai, pastikan semua ini terpenuhi:

- [ ] **No regression** — fitur existing tetap berfungsi seperti sebelumnya
- [ ] **No architecture violation** — perubahan sesuai dengan struktur proyek
- [ ] **No duplicated logic** — tidak ada copy-paste kode dari tempat lain
- [ ] **Existing patterns respected** — kode baru terlihat seperti bagian dari codebase
- [ ] **Build/tests pass** — jika ada build system atau test suite, hijau semua
- [ ] **Error handling** — konsisten dengan codebase (gak pake pola error yang beda)
- [ ] **No debug artifact** — console.log, print, commented code sudah dibersihkan
- [ ] **Backward compatible** — API, data store, dan interface tidak berubah

Jika salah satu gagal, jangan declare selesai. Fix dulu.

---

## 10. Common Failure Modes

Ini adalah failure mode paling sering yang harus diwaspadai:

### Overengineering
Membangun solusi yang lebih kompleks dari yang dibutuhkan. Tanda: abstraction
yang tidak diperlukan, generic solution untuk satu use case, config system
untuk fitur yang cuma punya satu varian.

**Antidote:** Tanya "apa minimal yang harus dikerjakan agar fitur ini berfungsi?"
Jawab, lalu kerjakan itu. Hanya itu.

### Inventing New Patterns
Memperkenalkan pola baru (error handling, naming, struktur) yang tidak ada
di codebase. Ini memecah konsistensi dan membuat codebase susah diprediksi.

**Antidote:** Step 4 — reuse existing patterns. Jika terpaksa pola baru,
konfirmasi ke Brahma dengan alasan konkret.

### Touching Unrelated Files
Mengubah file di luar scope karena "kebetulan lihat ada yang kurang pas."

**Antidote:** Ingat Scope Control. Catat di report, jangan diubah.

### Hidden Breaking Changes
Perubahan yang terlihat aman tapi merusak sesuatu di tempat lain.
Contoh: rename function yang dipanggil di tempat lain, ubah format data,
tambah required parameter.

**Antidote:** Search references sebelum ubah apapun. Cek semua caller.

### Making Assumptions
Menganggap sesuatu tanpa verifikasi — struktur file, behavior sistem,
intent Brahma.

**Antidote:** Baca file, cek dokumentasi, atau tanya Brahma. Jangan asumsi.

### Skipping Step 4 (Reuse Existing Patterns)
Langsung coding tanpa mencari pola existing. Hasilnya: kode baru yang tidak
konsisten dengan codebase.

**Antidote:** Step 4 adalah langkah paling penting. Jangan pernah skip.

---

## 11. Success Criteria

Implementasi fitur dinyatakan sukses jika:

1. **Fitur berfungsi** sesuai dengan yang diminta Brahma
2. **Tidak ada regression** — fitur lain tidak rusak
3. **Konsisten dengan codebase** — terlihat seperti bagian dari proyek
4. **Minimal diff** — perubahan sekecil mungkin
5. **Brahma puas** — hasil sesuai ekspektasi

---

## 12. Related Documents

- **Project Constitution** — aturan main proyek, pembacaan wajib
- **Developer Protocol (AGENTS.md)** — prosedural dev: backup, commit, verify
- **Writing Plans** — skill untuk membuat rencana implementasi kompleks
- **Systematic Debugging** — skill untuk debugging sistematis (4-phase)
