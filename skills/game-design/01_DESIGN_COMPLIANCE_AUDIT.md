---
name: design-compliance-audit
description: >-
  Memverifikasi apakah implementasi code sesuai dengan Game Design dan
  Knowledge Library. BUKAN code review — audit terhadap implementasi desain.
---

# Design Compliance Audit

## 1 — Purpose

Dokumen ini mendefinisikan proses untuk melakukan **design compliance audit**
terhadap implementasi code. Audit ini membandingkan apa yang didokumentasikan
di Knowledge Library (design intent, business rules, invariants) dengan apa
yang benar-benar diimplementasikan di codebase.

Ini BUKAN code review. Code review menilai kualitas kode. Audit ini menilai
**kesesuaian antara design dan implementasi**. Sebuah implementasi bisa
sempurna secara teknis tapi menyimpang dari design — atau sebaliknya,
implementasi bisa valid meskipun Knowledge belum mencerminkannya.

---

## 2 — When to Use

Gunakan workflow ini ketika diminta untuk:
- Memverifikasi bahwa Knowledge Library masih akurat dengan codebase
- Mengecek apakah fitur baru mengikuti design yang sudah ditetapkan
- Menilai apakah ada design drift (implementasi menyimpang dari design)
- Mengevaluasi apakah Knowledge perlu diupdate berdasarkan implementation reality
- Pre-release quality gate — pastikan implementasi sesuai design sebelum deploy

Jangan gunakan untuk:
- Code review biasa (gunakan 03_CODE_REVIEW)
- Bug hunting (gunakan 02_FIX_BUG)
- Performance analysis
- Style/naming/formatting review

---

## 3 — Inputs

Sebelum memulai audit, kumpulkan:

1. **Knowledge document** yang diaudit (misal: `knowledge/02_TRAINING.md`)
2. **Source code** yang mengimplementasikan domain tersebut
3. **Constitution** — aturan main proyek
4. **Architecture document** — untuk memahami konteks sistem
5. **Previous audit reports** (jika ada) — untuk melacak perubahan

---

## 4 — Preconditions

1. **Knowledge document sudah stabil** — bukan draft atau work-in-progress
2. **Codebase bisa diakses dan dibaca** — file tidak terenkripsi atau hilang
3. **Scope audit jelas** — domain apa yang akan diaudit
4. **Waktu cukup** — audit menyeluruh butuh 30-60 menit per domain

---

## 5 — Audit Workflow

### Step 1 — Read Relevant Knowledge

Baca Knowledge document yang akan diaudit secara menyeluruh.

Identifikasi:
- **Design Principles** — prinsip yang harus diikuti
- **Business Rules** — aturan yang harus diimplementasikan
- **Lifecycle** — urutan dan state yang harus ada
- **Responsibilities** — mana yang menjadi tanggung jawab sistem ini
- **System Relationships** — bagaimana sistem ini berinteraksi dengan yang lain
- **Invariants** — kondisi yang tidak boleh dilanggar
- **Golden Rules** — aturan main yang mengikat

### Step 2 — Identify Design Principles

Ekstrak prinsip-prinsip spesifik yang akan diaudit.

Untuk setiap prinsip, catat:
- **Apa yang diharapkan** — berdasarkan Knowledge
- **Bagaimana cara memverifikasi** — apa bukti implementasi yang perlu dicari
- **Severity jika dilanggar** — bagaimana dampaknya terhadap gameplay

### Step 3 — Locate Implementation

Cari implementasi di codebase yang relevan dengan setiap prinsip.

Gunakan tools:
- `search_files` untuk menemukan function, class, atau file terkait
- `read_file` untuk memahami implementasi detail
- `terminal` untuk menjalankan test atau verifikasi

Catat:
- File mana yang mengimplementasikan prinsip ini?
- Baris kode yang relevan?
- Apakah implementasinya lengkap, parsial, atau tidak ada?

### Step 4 — Compare Design vs Code

Bandingkan setiap prinsip design dengan implementasi yang ditemukan.

Tanyakan:
- Apakah behavior code sesuai dengan yang dideskripsikan di Knowledge?
- Apakah ada edge case yang dihandle Knowledge tapi tidak di code?
- Apakah ada behavior di code yang tidak didokumentasikan di Knowledge?
- Apakah invariants dari Knowledge terpenuhi?

### Step 5 — Classify Compliance

Berikan status compliance untuk setiap prinsip:

| Status | Arti | Contoh |
|--------|------|--------|
| 🟢 Fully Implemented | Implementasi sesuai design | Knowledge bilang "morale drifts toward 60", code implement clamp ke 60 |
| 🟡 Partially Implemented | Sebagian behavior ada, sebagian berbeda | Knowledge bilang "5 sponsor tiers", code hanya punya 3 |
| 🟠 Implemented Differently | Implementasi valid tapi approach berbeda | Knowledge bilang "use priority queue", code pakai list + sort |
| 🔴 Missing | Design ada, belum diimplementasi | Knowledge bilang "retirement events", belum ada code |
| ⚫ Unknown | Belum bisa diverifikasi | Butuh akses ke environment tertentu |

### Step 6 — Analyze Impact

Untuk setiap gap, nilai dampaknya:

| Level | Arti | Contoh |
|-------|------|--------|
| **Low** | Gap minor, gameplay hampir tidak terpengaruh | Label atau pesan berbeda |
| **Medium** | Gap signifikan, behavior pemain terpengaruh | Perhitungan berbeda 10-20% |
| **High** | Gap besar, fitur tidak berfungsi sesuai design | Invariant dilanggar, state corrupt |
| **Critical** | Game-breaking, progress pemain terancam | Save corrupt, infinite loop, crash |

### Step 7 — Calculate Design Coverage

Hitung estimasi coverage untuk setiap domain yang diaudit.

Cara:
- 🟢 Fully Implemented = 100%
- 🟡 Partially Implemented = 50%
- 🟠 Implemented Differently = 75% (valid, hanya approach berbeda)
- 🔴 Missing = 0%
- ⚫ Unknown = exclude dari perhitungan

Rumus:
```
Coverage = (jumlah_prinsip × bobot) / (total_prinsip − unknown) × 100%
```

**Coverage adalah estimasi profesional, bukan perhitungan matematis yang presisi.**
Gunakan coverage untuk memberikan gambaran kemajuan, bukan sebagai metrik kinerja.

### Step 8 — Calculate Design Drift

Nilai seberapa jauh implementasi menyimpang dari design intent.

Drift dihitung dari kombinasi:
- Jumlah 🟠 Implemented Differently — approach berbeda dari design
- Jumlah 🔴 Missing — fitur yang belum ada
- Jumlah 🟡 Partially Implemented — behavior yang tidak lengkap

Penilaian:
- **LOW** — < 15% drift, implementasi mostly on track
- **MEDIUM** — 15-30% drift, beberapa area perlu alignment
- **HIGH** — > 30% drift, implementasi signifikan menyimpang dari design

**Drift hanya dihitung dari design yang sudah diaudit.**
Jangan memperluas penilaian ke domain yang belum diaudit.

### Step 9 — Generate Backlog

Berdasarkan findings, generate backlog items:

| Kategori | Sumber |
|----------|--------|
| **Priority 1** — Harus diperbaiki segera | Critical/High impact issues |
| **Priority 2** — Perlu diperbaiki | Medium impact |
| **Priority 3** — Nice to have | Low impact, suggestions |
| **Knowledge Updates** — Knowledge perlu diupdate | Knowledge Gap findings |
| **Engineering Updates** — Code perlu diperbaiki | Bug / Missing Feature findings |

**Backlog hanya boleh berasal dari evidence audit.**
Jangan membuat backlog berdasarkan asumsi.

### Step 10 — Recommend Changes

Untuk setiap gap, rekomendasikan:

- **Update Knowledge** — jika implementasi benar, Knowledge perlu diperbaiki
- **Fix Implementation** — jika implementasi salah, perlu diperbaiki
- **Defer** — gap diketahui dan diterima untuk saat ini
- **Investigate** — belum cukup informasi untuk menentukan

### Step 11 — Produce Audit Report

Tulis laporan menggunakan format baku (Section 11).

---

## 6 — Compliance Levels

```
🟢 Fully Implemented — semua prinsip dan behavior sesuai design
🟡 Partially Implemented — fitur ada tetapi sebagian behavior berbeda
🟠 Implemented Differentially — implementasi valid tetapi menyimpang dari design
🔴 Missing — design ada, implementasi belum ada
⚫ Unknown — belum cukup informasi, jangan berasumsi
```

### Guidance

| Situation | Status |
|-----------|--------|
| Code matches Knowledge exactly | 🟢 |
| Feature exists but some edge cases differ | 🟡 |
| Code works but uses different approach than Knowledge describes | 🟠 |
| Knowledge mentions behavior that has no corresponding code | 🔴 |
| Can't find the implementation or can't access the environment | ⚫ |

**Important:** 🟠 does not mean wrong. It means the implementation differs from the Knowledge description. Either the implementation or the Knowledge may need updating. Both are valid paths.

---

## 7 — Decision Rules

Hierarki keputusan saat audit:

| Prioritas | Aturan |
|-----------|--------|
| 1 (tertinggi) | **Knowledge Library** — design intent adalah acuan utama |
| 2 | **Constitution** — aturan main proyek mengikat di atas implementasi |
| 3 | **Architecture** — struktur sistem harus dihormati |
| 4 | **Engineering Standards** — pola coding yang sudah distandarkan |
| 5 | **Existing Code** — code yang sudah ada adalah sumber informasi, bukan otoritas |

### Jika Code Bertentangan dengan Knowledge

Jangan langsung menyimpulkan bahwa code salah. Tiga kemungkinan:

1. **Knowledge sudah outdated** — implementasi berubah, Knowledge belum diupdate
2. **Code salah** — implementasi tidak sesuai design intent
3. **Knowledge dan code keduanya benar** — ada nuansa yang belum tertangkap di kedua sisi

Catat sebagai **Design Gap** dan beri evidence dari kedua sisi.

### Klasifikasi Temuan

| Kategori | Definisi | Tindakan |
|----------|----------|----------|
| **Bug** | Code tidak berfungsi sesuai intent-nya sendiri | Fix code |
| **Technical Debt** | Code berfungsi tapi tidak maintainable | Catat, defer |
| **Design Gap** | Code berfungsi tapi menyimpang dari Knowledge | Update Knowledge atau fix code |
| **Missing Feature** | Knowledge mendeskripsikan sesuatu yang belum ada code | Implement |
| **Knowledge Gap** | Implementasi punya behavior yang tidak didokumentasikan | Update Knowledge |

### Aturan Coverage, Drift, dan Backlog

| Aturan | Penjelasan |
|--------|------------|
| **Coverage adalah estimasi profesional** | Bukan perhitungan matematis yang presisi. Gunakan untuk trending antar sprint, bukan sebagai metrik kinerja. |
| **Drift hanya dihitung dari design yang sudah diaudit** | Jangan memperluas penilaian ke domain yang belum diaudit. Coverage dan drift hanya mencakup scope audit. |
| **Backlog harus memiliki evidence** | Setiap item di Generated Backlog harus berasal dari finding yang sudah tercatat. Jangan membuat backlog berdasarkan firasat atau asumsi. |
| **Jangan memberikan angka presisi palsu** | Coverage 87.3% terkesan presisi tapi menyesatkan. Cukup 87% atau "sekitar 85-90%". Coverage adalah estimasi. |

---

## 8 — Scope

### What to Audit

- **Business Rules** — logic, thresholds, formulas, conditions
- **Simulation** — tick phases, state transitions, lifecycle
- **Data Flow** — read/write relationships between systems
- **Responsibilities** — does each system own what it should own?
- **System Relationships** — does system A read from system B correctly?
- **Invariants** — are the non-negotiable rules preserved?
- **Golden Rules** — are the design's core principles followed?

### What NOT to Audit

- **Coding style** — formatting, naming, whitespace, comments
- **Code quality** — test coverage, performance, duplication
- **Refactoring needs** — structure improvements not affecting behavior
- **Best practices** — unless they are documented as standards

---

## 9 — Validation

Audit dinyatakan valid jika:

- [ ] Semua prinsip dari Knowledge sudah diidentifikasi
- [ ] Setiap prinsip memiliki status compliance
- [ ] Setiap temuan memiliki evidence (file:line atau log)
- [ ] Impact assessment diberikan untuk setiap gap
- [ ] Tidak ada asumsi tanpa bukti
- [ ] Perbedaan antara Knowledge dan code didokumentasikan secara jelas
- [ ] Rekomendasi actionable — bisa dieksekusi atau ditunda dengan alasan

---

## 10 — Common Failure Modes

### ❌ Confirmation Bias

Hanya mencari bukti bahwa code benar, mengabaikan bukti bahwa code salah.

**Antidote:** Mulai dengan mencari bukti pelanggaran. Jika tidak ada temuan, baru cari konfirmasi.

### ❌ Treating Code as Source of Truth

Menganggap implementasi selalu benar dan Knowledge selalu outdated.

**Antidote:** Ingat Decision Rules — Knowledge adalah acuan utama. Code bisa salah.

### ❌ Over-Auditing

Mencari masalah di area yang tidak relevan dengan scope audit.

**Antidote:** Stay within scope. Jika menemukan sesuatu di luar scope, catat sebagai observation — jangan tambah ke temuan utama.

### ❌ Vague Evidence

"Fitur X tidak sesuai design" tanpa menunjukkan baris kode atau log yang spesifik.

**Antidote:** Setiap temuan harus punya file:line reference atau log kutipan.

### ❌ Missing Classification

Menemukan gap tapi tidak mengklasifikasikan sebagai bug, design gap, atau knowledge gap.

**Antidote:** Decision Rules Section 7 — setiap temuan harus punya kategori.

### ❌ Ignoring Context

Menilai suatu prinsip tanpa memahami sistem yang lebih luas. Sebuah keputusan yang terlihat seperti pelanggaran design mungkin adalah trade-off yang disengaja.

**Antidote:** Sebelum menyimpulkan, tanya: "Apakah ada alasan yang valid untuk implementasi ini?" Lihat architecture docs, ADRs, dan commit messages.

---

## 11 — Report Format

```
## Design Compliance Audit

### Scope

Domain: [domain yang diaudit]
Knowledge: [path ke Knowledge document]
Codebase: [path ke codebase]
Date: [tanggal audit]

---

### Summary

Overall Compliance: [persentase atau perkiraan]

🟢 Fully Implemented: X
🟡 Partially Implemented: X
🟠 Implemented Differently: X
🔴 Missing: X
⚫ Unknown: X

---

### Design Coverage

Overall Design Coverage: [XX%]

Coverage By Domain

| Domain | Coverage | Status |
|--------|--------:|--------|
| Combat | XX% | 🟢/🟡/🔴 |
| ...    | XX% | ... |

---

### Findings

#### [🟢/🟡/🟠/🔴/⚫] — [Nama Prinsip/Invariant]

Requirement (from Knowledge):
[Kutipan atau ringkasan dari Knowledge document]

Current Implementation:
[Deskripsi apa yang dilakukan code, dengan file:line reference]

Status: [Level]
Evidence:
- [file:line] — [deskripsi singkat]
- [file:line] — [deskripsi singkat]

Impact: [Low / Medium / High / Critical]
Category: [Bug / Design Gap / Missing Feature / Knowledge Gap]

Recommendation:
- [Apa yang harus dilakukan]

---

#### [🟢/🟡/🟠/🔴/⚫] — [Nama Prinsip/Invariant]

...

---

### Compliance Matrix

| Design Principle | Status | Impact | Category |
|-----------------|--------|--------|----------|
| ...             | 🟢     | —      | —        |
| ...             | 🔴     | High   | Missing Feature |
| ...             | 🟠     | Low    | Knowledge Gap |

---

### Design Drift

Overall Drift: [LOW / MEDIUM / HIGH]

Estimated Drift: [XX%]

Primary Drift Sources:
- [Domain]
- [Domain]
- [Domain]

Explanation:
[Paragraf singkat — mengapa drift terjadi, apakah disengaja atau perlu diperbaiki]

---

### Missing Features

Daftar fitur yang dideskripsikan di Knowledge tapi belum ada implementasi.

| Feature | Knowledge Reference | Impact |
|---------|-------------------|--------|
| ...     | Section X          | High   |

---

### Design Deviations

Daftar implementasi yang berbeda dari Knowledge.

| Implementation | Knowledge Says | Difference | Status |
|---------------|----------------|------------|--------|
| ...           | ...            | ...        | 🟠     |

---

### Risks

Apa dampaknya jika gap dibiarkan tanpa perbaikan.

| Risk | Gap Source | Impact |
|------|-----------|--------|
| ...  | ...        | ...    |

---

### Generated Backlog

#### Priority 1
- [Item] — [sumber finding]

#### Priority 2
- [Item] — [sumber finding]

#### Priority 3
- [Item] — [sumber finding]

#### Knowledge Updates
- [Knowledge doc] — [apa yang perlu diupdate]

#### Engineering Updates
- [File/area] — [apa yang perlu diperbaiki]

---

### Overall Recommendation

[Accept / Improve Later / High Priority / Critical]

[Paragraf pendek — kesimpulan menyeluruh, rekomendasi prioritas]
```

### Contoh

```
## Design Compliance Audit

### Scope

Domain: Economy
Knowledge: knowledge/05_ECONOMY.md
Codebase: /root/mma-manager/app/src/engine/tick/settlement.js
Date: July 2026

---

### Summary

🟢 Fully Implemented: 8
🟡 Partially Implemented: 2
🟠 Implemented Differently: 0
🔴 Missing: 1
⚫ Unknown: 0

---

### Findings

#### 🟢 — Monthly settlement runs exactly once per month

Requirement (from Knowledge):
"Settlement runs exactly once per month. No double-counting, no skipped months.
The week counter modulo 4 is the gate."

Current Implementation:
tickSettlement() checks `if (g.week % 4 !== 0) return;` before processing.
This runs inside the monthly settlement phase triggered by World tick.

Status: 🟢 Fully Implemented
Evidence:
- engine/tick/settlement.js:10 — `if (g.week % 4 !== 0) return;`
Impact: None
Category: — (compliant)

---

#### 🟡 — Sponsor income is deterministic for a given camp state

Requirement (from Knowledge):
"Sponsor income is deterministic for a given camp state — no random variation
in sponsor payouts. Royalty calculations are formula-based, not RNG-based."

Current Implementation:
Sponsor income is calculated in tickSettlement() based on brand rates,
popularity, and wins. The calculation uses `Math.round()` for rounding,
which is deterministic. However, the royalty boost uses `g.roster.reduce`
which has no RNG component. Partially compliant because the requirement
says "no random variation" — and there isn't any.

Status: 🟡 Partially Implemented
Evidence:
- engine/tick/settlement.js:28-33 — royalty calculation logic
Impact: Low
Category: Knowledge Gap — Knowledge says "no random variation" which is
correct, but doesn't explicitly state that popularity-based modifiers
are allowed.

Recommendation:
Update Knowledge to clarify that popularity and win-based modifiers
are deterministic (not RNG) and within the design intent.

---

### Compliance Matrix

| Design Principle | Status | Impact | Category |
|-----------------|--------|--------|----------|
| Single Source of Truth | 🟢 | — | — |
| Income − Expenses = Net | 🟢 | — | — |
| Deterministic sponsors | 🟡 | Low | Knowledge Gap |
| Cash never negative without consequences | 🔴 | High | Missing Feature |

---

### Risks

| Risk | Gap Source | Impact |
|------|-----------|--------|
| No bankruptcy warning when cash hits 0 | No consequence handler | Players lose progress without warning |

---

### Overall Recommendation

**Improve Later**

Economy implementation is 85% compliant with Knowledge. Main gap is
bankruptcy warning system, which should be added before the next major
release.
```

---

## 12 — Related Documents

| Document | How It Relates |
|----------|---------------|
| **Knowledge Library** (knowledge/*.md) | The design authority — what this audit measures against |
| **03_CODE_REVIEW.md** | Complementary workflow — code review assesses quality, audit assesses design compliance |
| **02_FIX_BUG.md** | For bugs found during audit — fix them properly |
| **04_TASK_PLANNING.md** | For planning implementation of missing features found during audit |
| **Project Constitution** | Binding rules — any violation found is automatically Critical |
| **Engineering Standards** (engineering/*.md) | Reference for how code should be structured |
