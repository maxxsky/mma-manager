---
name: refactor
description: >-
  Workflow standar AI untuk melakukan refactor tanpa mengubah behavior sistem.
  Fokus pada incremental change, behavior preservation, dan safety.
---

# Refactor — AI Refactoring Workflow

## 1. Purpose

Dokumen ini mendefinisikan proses standar untuk melakukan **refactor** —
mengubah struktur kode tanpa mengubah behavior sistem. Tujuannya: meningkatkan
maintainability, readability, atau extensibility dengan **zero functional change**.

Ini adalah workflow transformasi — dirancang untuk menghasilkan kode yang lebih
bersih tanpa merusak apapun yang sudah berfungsi.

---

## 2. When to Use

Gunakan workflow ini ketika menerima task untuk **memperbaiki struktur kode**
tanpa mengubah apa yang dilakukan kode tersebut.

Task yang termasuk:
- Rename variable/function/class yang kurang deskriptif
- Extract logic ke function/module terpisah
- Simplify logic yang terlalu kompleks
- Consolidate duplicate code
- Split file atau function yang terlalu besar
- Remove dead code yang sudah tidak dipakai

Task yang **tidak** termasuk (jangan gunakan):
- Implementasi fitur baru (gunakan IMPLEMENT_FEATURE)
- Bug fix (gunakan FIX_BUG)
- Code review (gunakan CODE_REVIEW)
- Perubahan arsitektur besar — kecuali diminta eksplisit

Rule of thumb: jika behavior sistem sebelum dan sesudah refactor **tidak identik**,
itu bukan refactor — itu implementasi.

---

## 3. Inputs

Sebelum memulai refactor, pastikan input berikut tersedia:

1. **Target code** — file atau modul yang akan direfactor.
2. **Reason for refactoring** — kenapa kode ini perlu di-refactor? (readability? size? duplication?)
3. **Current behavior** — cara memverifikasi bahwa behavior tidak berubah.
4. **Dokumen acuan** — Constitution, architecture docs, shared context.
5. **Test suite** — jika ada, sebagai safety net.

Jika alasan refactoring tidak jelas ("biar lebih bagus"), tanya Brahma untuk
spesifikasi yang lebih konkret.

---

## 4. Preconditions

Sebelum memulai refactor, pastikan:

1. **Kode yang akan di-refactor sudah dipahami.** Jangan refactor kode yang belum dimengerti.
2. **Behavior saat ini bisa diverifikasi.** Ada cara untuk test sebelum vs sesudah.
3. **Alasan refactoring jelas.** Bukan sekadar "kurang suka stylenya."
4. **Backup tersedia.** Git commit sebelum mulai.
5. **Scope terbatas.** Refactor satu hal, bukan seluruh codebase.

---

## 5. Refactoring Workflow

### Step 1 — Understand the Current Implementation

Baca kode yang akan di-refactor secara menyeluruh.

- Apa yang dilakukan kode ini?
- Bagaimana alur datanya?
- Siapa yang memanggilnya? (callers)
- Siapa yang dipanggilnya? (dependencies)
- Apa pattern yang digunakan?

Jangan refactor kode yang belum dipahami. Jika ada bagian yang tidak jelas,
investigasi dulu atau tanya Brahma.

### Step 2 — Identify the Reason for Refactoring

Tentukan alasan spesifik. Jangan gunakan alasan generik.

| Buruk (hindari) | Baik (gunakan) |
|-----------------|----------------|
| "Kodenya jelek" | "Function `process()` 200+ baris — harus di-split agar testable" |
| "Biar lebih clean" | "Ada 3 copy dari logic validasi yang sama — perlu di-consolidate" |
| "Refactor aja sekalian" | "Variable `d`, `x`, `tmp` tidak deskriptif — perlu di-rename" |
| "Best practice" | "Reducer 500 baris dengan 20+ switch cases — extract ke domain modules" |

Alasan yang konkret membantu memilih jenis refactor yang tepat (Section 6)
dan mencegah scope creep.

### Step 3 — Verify Behavior to Preserve

Dokumentasikan behavior yang harus dijaga.

- Apa output dari kode ini?
- Apa side effect-nya?
- State apa yang dimodifikasi?
- Edge case apa yang ditangani?

Cara verifikasi:
- Jika ada test: pastikan test suite passing sebagai baseline.
- Jika tidak ada test: catat input/output manual (curl, console, UI state).

**Ini adalah safety net.** Setiap perubahan akan diukur terhadap baseline ini.

### Step 4 — Locate All Affected References

Cari semua tempat yang memanggil atau bergantung pada kode ini.

- `search_files` untuk menemukan pemanggil fungsi/method.
- `search_files` untuk menemukan import dari modul ini.
- Cek apakah ada code di luar proyek yang depend (API consumers).

**Aturan:** setiap caller harus tetap berfungsi tanpa perubahan.
Jika caller perlu diubah, itu di luar scope refactor — tanya Brahma.

### Step 5 — Plan the Smallest Safe Refactor

Rencanakan perubahan dengan prinsip **incremental**:

- Apa langkah terkecil yang bisa dilakukan?
- Apa yang berubah di setiap langkah?
- Bagaimana memverifikasi setiap langkah?
- Bagaimana rollback jika gagal?

Rencana yang baik:
```
Step 1: Rename variable `d` → `dateRange` di app.py — verify: test suite
Step 2: Extract validasi ke validate_dates() — verify: test suite
```

Rencana yang buruk:
```
Step 1: Refactor seluruh finance module
```

### Step 6 — Refactor Incrementally

Lakukan refactor **satu langkah kecil per waktu**.

- Satu perubahan → verifikasi → commit → lanjut.
- Jangan gabung rename + extract + simplify dalam satu commit.
- Setiap langkah harus reversible.

Urutan yang aman:
1. **Rename** dulu (paling aman, cari-replace)
2. **Extract** (pisahin logic, verify)
3. **Simplify** (bersihin, verify)
4. **Consolidate** (gabung duplicate, verify)
5. **Remove dead code** (paling akhir, setelah semua terverifikasi)

### Step 7 — Verify Behavior is Unchanged

Setelah setiap langkah, verifikasi:

- Output sama persis dengan baseline dari Step 3.
- Side effect sama.
- State modification sama.
- Edge case handling sama.

Gunakan tools:
- Test suite (jika ada)
- Manual test (curl, browser console)
- Compare output before/after

**Jika behavior berubah walau sedikit: itu BUG, bukan refactor. Rollback dan debug.**

### Step 8 — Check for Regressions

Setelah semua langkah selesai, cek regresi:

- Semua caller masih berfungsi.
- Tidak ada error di log.
- Build/tests passing.
- Fitur sekitar tidak terpengaruh.

### Step 9 — Produce Report

Lapor menggunakan format baku (lihat Section 12).

---

## 6. Refactoring Types

Gunakan tipe yang sesuai dengan alasan refactoring. Jangan campur tipe
dalam satu langkah — kerjakan satu per satu.

| Tipe | Definisi | Contoh | Risiko |
|------|----------|--------|--------|
| **Rename** | Mengubah nama tanpa mengubah behavior | `d` → `dateRange` | Rendah — pastikan semua referensi ikut berubah |
| **Extract** | Memisahkan logic ke function/module baru | Extract 50 baris validasi → `validate()` | Sedang — pastikan semua caller ter-update |
| **Simplify** | Menyederhanakan logic yang kompleks | Ganti nested if-else 5 level dengan early return | Tinggi — logic harus dijaga persis sama |
| **Consolidate** | Menggabungkan kode duplikat | 3 fungsi validasi mirip → 1 fungsi dengan parameter | Sedang — pastikan semua use case tertangani |
| **Split** | Memecah file/function besar jadi kecil | Monolith 1000 baris → orchestrator + domain modules | Tinggi — butuh perencanaan dependency |
| **Remove dead code** | Menghapus kode yang tidak dipanggil | Function `oldHelper()` sudah 0 caller | Rendah — pastikan benar-benar tidak dipanggil |

---

## 7. Decision Rules

Hierarki keputusan saat refactoring:

| Prioritas | Aturan |
|-----------|--------|
| 1 (tertinggi) | **Preserve behavior at all costs.** Jika behavior berubah walaupun sedikit, itu bukan refactor — itu bug. |
| 2 | **Never mix refactoring with feature implementation.** Refactor struktur. Fitur baru = task terpisah. |
| 3 | **Never mix refactoring with bug fixing.** Refactor struktur. Bug fix = task terpisah. |
| 4 | **Prefer incremental refactoring.** Satu perubahan kecil → verifikasi → commit. Jangan big bang. |
| 5 | **Reuse existing patterns.** Hasil refactor harus konsisten dengan codebase. |
| 6 | **Stop before architecture changes** kecuali diminta eksplisit. Rename, extract, split = OK. Ubah layer boundary = tidak. |

### Contoh Pelanggaran

```
❌ "Aku refactor dashboard module, sekalian fix bug NaN yang ketemu."
   → Decision Rule #3 violation. Fix bug dulu, refactor nanti.

❌ "Aku split reducer jadi domain modules, terus tambah fitur baru di module baru."
   → Decision Rule #2 violation. Split dulu (refactor), verifikasi, baru fitur (task baru).

✅ "Aku rename semua variable single-letter di finance.py. Tidak ada perubahan behavior."
   → Benar. Rename only, behavior unchanged.
```

---

## 8. Scope Control

Aturan besi untuk menjaga scope refactor tetap terkendali:

### Batasan
- **Refactor hanya scope yang disepakati.** Jangan sentuh file lain.
- **Jangan "bersihin" file yang tidak terkait.** Kalaupun jelek.
- **Hindari cascading refactors.** Refactor A memaksa refactor B memaksa refactor C = stop.
- **Record, don't implement.** Ada ide perbaikan di tempat lain? Catat, jangan dikerjakan.

### Cascading Refactor Protocol

Jika refactor A mengharuskan perubahan di modul B:

1. **Stop.** Jangan lanjut otomatis.
2. **Catat:** "Refactor A terblokir — modul B perlu di-refactor juga."
3. **Tanya Brahma:** "Lanjut refactor B juga, atau berhenti di sini?"

Cascading refactor adalah penyebab utama scope creep. Lebih baik berhenti
dan minta keputusan daripada lanjut tanpa persetujuan.

---

## 9. Validation Checklist

Sebelum menyatakan refactor selesai, pastikan semua ini terpenuhi:

- [ ] **Behavior unchanged** — input/output/side-effect sama persis.
- [ ] **Public API unchanged** — function signature, export, contract tetap.
- [ ] **No regression** — fitur existing tetap berfungsi.
- [ ] **Existing tests still pass** — jika ada test suite, hijau semua.
- [ ] **Existing patterns respected** — hasil refactor konsisten dengan codebase.
- [ ] **Architecture preserved** — layer boundaries, module dependencies tidak berubah.
- [ ] **No unnecessary abstraction introduced** — tidak bikin interface/abstract class karena "best practice."

Jika salah satu gagal, jangan declare selesai. Fix dulu — atau rollback.

---

## 10. Common Failure Modes

### Hidden Behavior Changes
Mengubah urutan eksekusi, tipe return, atau side effect tanpa sadar. Contoh: extract function yang dulu sync jadi async.

**Antidote:** Step 3 — dokumentasikan behavior sebelum refactor. Step 7 — verifikasi setelahnya.

### Over-Refactoring
Refactor yang tidak perlu: bikin abstraction untuk 1 use case, split function yang cuma 20 baris, bikin config system untuk 2 varian.

**Antidote:** Step 2 — pastikan alasan refactoring konkret. "Biar lebih clean" bukan alasan valid.

### Mixing Feature Work
"Sambil refactor, sekalian tambah parameter baru." Ini merusak behavior baseline dan bikin verifikasi mustahil.

**Antidote:** Decision Rule #2 — never mix. Feature = task terpisah.

### Mixing Bug Fixes
"Sambil refactor, sekalian benerin edge case." Sama bahayanya dengan mixing feature.

**Antidote:** Decision Rule #3 — never mix. Bug fix = task terpisah.

### Breaking Public APIs
Refactor internal lalu rename function yang dipanggil dari 10 tempat lain. Semua caller rusak.

**Antidote:** Step 4 — locate ALL callers. Step 7 — verifikasi setiap caller.

### Creating Unnecessary Abstractions
"Extract ke interface biar lebih flexible" — padahal cuma 1 implementasi. "Pake dependency injection" — padahal gak perlu.

**Antidote:** Tanya: "Apakah abstraction ini diperlukan untuk menyelesaikan alasan refactoring?" Jika tidak, jangan.

---

## 11. Stop Conditions

**Prinsip utama: «Never continue by guessing.»**

AI harus **berhenti dan melapor ke Brahma** jika salah satu kondisi berikut
terpenuhi. Jangan lanjutkan refactor.

| # | Kondisi | Tindakan |
|---|---------|----------|
| 1 | **Behavior cannot be verified.** Tidak ada cara untuk memastikan behavior tidak berubah. | Set up test dulu, atau minta Brahma untuk setup verifikasi. |
| 2 | **Public API would change.** Refactor akan mengubah signature atau contract yang dipakai external caller. | Stop. Tanya Brahma — ini bukan refactor murni. |
| 3 | **Scope expands unexpectedly.** Refactor mulai menyentuh modul di luar scope. | Stop. Laporkan, minta keputusan. |
| 4 | **Architecture changes become necessary.** Refactor membutuhkan perubahan layer boundary atau dependency direction. | Stop. Ini di luar scope refactor standar. |
| 5 | **Safe refactoring cannot be guaranteed.** Kode terlalu kompleks, tidak ada test, atau dampaknya tidak bisa diprediksi. | Stop. Laporkan risiko, minta arahan. |

**Setelah berhenti dan melapor, tunggu instruksi Brahma sebelum lanjut.**

---

## 12. Report Format

Gunakan format baku yang konsisten dengan skill lainnya.

```
## Refactor Result

🟢 Overall
**Done** / **Partial** / **Blocked**

📋 Summary
[1-3 kalimat — apa yang direfactor, kenapa, hasilnya]

---

✅ Improvements
• [perubahan yang dilakukan — rename, extract, simplify, dll]
• [dampak positif — readability, maintainability, performance]
• ...

---

⚠️ Risks
• [risiko yang masih ada, edge case yang belum terverifikasi]
• [jika tidak ada risiko, tulis: "None — behavior verified identical."]

---

📊 Statistics

Files Refactored : X
Lines Changed    : +X / -X
Refactor Types  : Rename (X), Extract (X), Simplify (X)
Callers Updated  : X (verified)

---

✅ Validation

✓ Behavior unchanged
✓ Public API preserved
✓ No regression
✓ Tests passing
✓ Architecture preserved
✓ No unnecessary abstraction

---

➡️ Next Action
- [jika Done: commit + push, tidak ada tindakan lanjutan]
- [jika Partial: langkah selanjutnya]
- [jika Blocked: apa yang perlu di-resolve]
```

### Contoh

```
## Refactor Result

🟢 Overall
**Done**

📋 Summary
Extract validasi transaksi ke validators.py. 3 fungsi validasi mirip di
app.py di-consolidate jadi 1 fungsi dengan parameter tipe. Behavior unchanged.

---

✅ Improvements
• Rename: `d` → `dateRange`, `amt` → `amount` di finance.py
• Extract: validasi transaksi → validators.py
• Consolidate: 3 fungsi validasi mirip → 1 `validate_transaction(type)`

---

⚠️ Risks
None — behavior verified identical via test suite (8/8 passing).

---

📊 Statistics

Files Refactored : 2
Lines Changed    : +34 / -87
Refactor Types   : Rename (4), Extract (1), Consolidate (1)
Callers Updated  : 3 (verified — semua endpoint finance tetap OK)

---

✅ Validation

✓ Behavior unchanged
✓ Public API preserved
✓ No regression
✓ Tests passing (8/8)
✓ Architecture preserved
✓ No unnecessary abstraction

---

➡️ Next Action
Commit + push. Tidak ada tindakan lanjutan.
```

---

## 13. Success Criteria

Refactor dinyatakan sukses jika:

1. **Behavior identik** — sebelum dan sesudah tidak ada perbedaan.
2. **Alasan refactoring terpenuhi** — masalah yang jadi alasan refactor sudah teratasi.
3. **Codebase lebih baik** — lebih readable, maintainable, atau performant.
4. **Tidak ada regression** — fitur lain tidak rusak.
5. **Incremental dan reversible** — setiap langkah bisa di-rollback.
6. **Brahma puas** — hasil sesuai ekspektasi.

---

## 14. Related Documents

- **04_TASK_PLANNING.md** — workflow analisis task (pre-refactoring planning)
- **01_IMPLEMENT_FEATURE.md** — workflow implementasi fitur (Minimal Change hierarchy: Reuse > Extend > Patch > Refactor > Rewrite)
- **02_FIX_BUG.md** — workflow debugging (untuk bug yang ditemukan saat refactor — tapi fix di task terpisah)
- **03_CODE_REVIEW.md** — workflow review (untuk me-review hasil refactor)
- **Project Constitution** — aturan main proyek, wajib dipatuhi
- **Developer Protocol (AGENTS.md)** — prosedural dev: backup, commit, verify
