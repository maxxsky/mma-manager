---
name: task-planning
description: >-
  Workflow standar AI untuk menganalisis task sebelum memilih workflow
  implementasi. Fokus pada klasifikasi, risk assessment, dan pemilihan
  pendekatan yang tepat.
---

# Task Planning — AI Analysis Workflow

## 1. Purpose

Dokumen ini mendefinisikan proses standar untuk **menganalisis dan merencanakan
task** sebelum implementasi dimulai. Tujuannya: memastikan AI memahami apa yang
diminta, memilih workflow yang tepat, mengidentifikasi risiko, dan menghasilkan
rencana yang jelas — **sebelum satu baris kode ditulis**.

Ini adalah workflow analisis — dirancang untuk mencegah "langsung coding tanpa
paham" dan memastikan setiap task punya rencana yang solid.

---

## 2. When to Use

Gunakan workflow ini ketika menerima task baru yang membutuhkan **analisis
sebelum eksekusi**.

Task yang termasuk:
- Request fitur baru ("tambah fitur X")
- Bug report yang belum dianalisa ("dashboard crash saat...")
- Permintaan refactor ("pisahin modul X")
- Task ambigu yang perlu klarifikasi
- Task besar yang melibatkan multiple systems
- Brahma memberikan task tanpa spesifikasi detail

Task yang **tidak** termasuk (jangan gunakan):
- Pertanyaan sederhana ("apa itu X?")
- Bug fix straightforward yang sudah jelas root cause + fix-nya
- Code review yang sudah ada diff-nya
- Diskusi tanpa output konkret

Jika ragu: planning selalu lebih baik daripada langsung coding.

---

## 3. Inputs

Sebelum memulai planning, kumpulkan input berikut:

1. **Task description** — apa yang diminta Brahma (verbatim).
2. **Project context** — project mana? MMA Manager? Finance Dashboard?
3. **Dokumen proyek** — Constitution, AGENTS.md, shared context.
4. **Codebase access** — bisa baca file, search, dan grep.
5. **History** — apakah task ini pernah dibahas sebelumnya?

Jika task description terlalu singkat ("fix the bug") atau ambigu, ini jadi
open question — jangan asumsikan, tanya Brahma.

---

## 4. Preconditions

Sebelum memulai planning, pastikan:

1. **Task sudah diterima.** Ada request eksplisit dari Brahma.
2. **Dokumen proyek bisa diakses.** Constitution dan architecture docs.
3. **Codebase bisa dibaca.** File tersedia, struktur bisa dieksplorasi.
4. **Waktu cukup.** Planning butuh 5-15 menit. Jangan skip karena "buru-buru."
5. **Mindset: analysis, not execution.** Ini bukan saatnya coding.

---

## 5. Planning Workflow

### Step 1 — Read the Request

Baca request Brahma dengan teliti. Jangan skim.

- Apa kata-kata tepatnya?
- Apakah ada kata kunci? ("tambah", "fix", "pisahin", "review")
- Apakah ada detail spesifik? (file, fitur, behavior)
- Apakah nadanya urgent atau exploratory?

### Step 2 — Identify the Real Objective

Terjemahkan request ke dalam objective yang jelas.

Tanya:
- Apa yang sebenarnya ingin dicapai?
- Problem apa yang dipecahkan?
- Siapa yang diuntungkan?
- Bagaimana kita tahu ini berhasil?

Contoh:
- Request: "dashboard lambat" → Objective: "Mengurangi load time dashboard di bawah 2 detik"
- Request: "tambah fitur export" → Objective: "User bisa mendownload data sebagai CSV"

**Jika objective tidak bisa diidentifikasi: berhenti, tanya Brahma.**

### Step 3 — Define Scope and Non-Scope

Tentukan batasan yang jelas:

**In Scope:**
- Apa yang HARUS diselesaikan dalam task ini?
- File/sistem apa yang relevan?
- Behavior apa yang harus berubah?

**Out of Scope (eksplisit):**
- Apa yang TIDAK akan disentuh?
- Fitur apa yang TIDAK termasuk?
- Batasan apa yang harus dijaga?

Scope yang jelas mencegah scope creep. Jika Brahma tidak menyebutkan batasan,
tentukan sendiri dan konfirmasi.

### Step 4 — Identify Affected Systems

Mapping sistem yang terpengaruh oleh perubahan:

- File apa yang kemungkinan perlu diubah?
- Modul/sistem apa yang terhubung?
- Apakah ada dependensi eksternal? (API, library, database)
- Apakah perubahan ini menyentuh shared logic?

Gunakan `search_files` untuk mencari kode terkait. Baca file yang relevan.
Ini bukan implementasi — ini reconnaissance.

### Step 5 — Read Required Project Documents

Baca dokumen yang wajib:

- **Project Constitution** — aturan main, prioritas, DoD
- **Architecture document** — bagaimana sistem terhubung
- **Shared context** — `/root/agents/shared/projects/<project>/CONTEXT.md`
- **Relevant knowledge docs** — domain-specific knowledge

Jangan skip. Banyak bug dan rework lahir dari skipping dokumentasi.

### Step 6 — Locate Existing Implementations

Cari pola yang sudah ada:

- Bagaimana fitur serupa diimplementasikan sebelumnya?
- Apakah ada file/modul yang bisa dijadikan referensi?
- Convention apa yang dipakai di area ini?

**Jika tidak ada existing implementation: catat sebagai Unknown (lihat Risk Assessment).**

### Step 7 — Assess Risks

Evaluasi risiko (detail di Section 7 — Risk Assessment):

- Architecture risk — apakah perubahan bisa merusak struktur?
- Regression risk — apakah fitur existing terancam?
- Save compatibility risk — apakah save game/data user terpengaruh?
- Scope creep risk — seberapa mudah task ini meluas?
- Unknowns — apa yang belum kita tahu?

Beri setiap risiko level: **Low / Medium / High**.

### Step 8 — Select the Appropriate Workflow(s)

Pilih workflow yang akan digunakan (detail di Section 9 — Workflow Selection):

- IMPLEMENT_FEATURE — untuk fitur baru atau perubahan signifikan
- FIX_BUG — untuk debugging dan perbaikan
- CODE_REVIEW — untuk meninjau kode yang sudah ada
- REFACTOR — untuk restructuring tanpa mengubah behavior
- BALANCE_GAMEPLAY — untuk tuning parameter game

Satu task = satu workflow utama. Jika task butuh multiple workflow,
pecah menjadi sub-task.

### Step 9 — Produce an Implementation Plan

Tulis rencana implementasi (format di Section 12):

- Urutan langkah
- File yang akan diubah per langkah
- Dependensi antar langkah
- Verification point — kapan kita tahu langkah ini berhasil?

Rencana harus actionable: bisa langsung dieksekusi tanpa analisa tambahan.

---

## 6. Task Classification

Klasifikasikan setiap task ke dalam salah satu kategori berikut.
Jika task masuk ke lebih dari satu kategori, tandai sebagai **Mixed Task**
dan pecah menjadi sub-task independen.

| Kategori | Definisi | Contoh |
|----------|----------|--------|
| **Feature** | Menambah kemampuan baru yang belum ada | "Tambah halaman history transaksi" |
| **Bug Fix** | Memperbaiki behavior yang tidak sesuai | "Dashboard crash saat portfolio kosong" |
| **Refactor** | Mengubah struktur tanpa mengubah behavior | "Pisah reducer 500 baris jadi domain modules" |
| **Code Review** | Meninjau kode yang sudah ditulis | "Review PR #42" |
| **Balance** | Mengubah parameter/nilai tanpa mengubah logic | "Kurangi damage striker sebesar 10%" |
| **Documentation** | Menulis atau memperbaiki dokumentasi | "Update README dengan setup instructions" |
| **Research** | Investigasi tanpa output kode | "Cari library terbaik untuk charting" |
| **Mixed Task** | Kombinasi dua atau lebih kategori di atas | "Refactor finance module + tambah fitur export" |

### Mixed Task Protocol

Jika task masuk Mixed Task:

1. **Pecah menjadi sub-task** berdasarkan kategori.
2. **Tentukan urutan** — mana yang harus dikerjakan lebih dulu?
3. **Setiap sub-task punya workflow sendiri.**
4. **Verifikasi selesai** sebelum lanjut ke sub-task berikutnya.

Contoh:
```
Task: "Refactor finance module dan tambah fitur export CSV"

Sub-task 1: REFACTOR — pisahin finance module (dikerjakan dulu)
Sub-task 2: FEATURE — tambah endpoint export CSV (bergantung pada hasil refactor)
```

---

## 7. Risk Assessment

Nilai 5 dimensi risiko. Beri level **Low / Medium / High** untuk setiap dimensi.
Jika suatu dimensi tidak relevan, tandai N/A.

### Dimensi Risiko

| Dimensi | Pertanyaan Kunci |
|---------|-----------------|
| **Architecture risk** | Apakah perubahan menyentuh fondasi sistem? Apakah ada risiko melanggar layer boundaries? |
| **Regression risk** | Seberapa besar kemungkinan fitur existing rusak? Apakah perubahan menyentuh shared logic? |
| **Save compatibility risk** | Apakah format data/save game berubah? Apakah user bisa kehilangan progress? |
| **Scope creep risk** | Seberapa mudah task ini meluas ke area lain? Apakah ada "sambil sekalian" yang menggoda? |
| **Unknowns** | Apa yang kita belum tahu? Apakah ada asumsi yang belum diverifikasi? |

### Level Risiko

| Level | Arti | Tindakan |
|-------|------|----------|
| **Low** | Risiko minimal, perubahan terlokalisasi. | Lanjut dengan confidence. |
| **Medium** | Ada risiko, tapi bisa dimitigasi dengan hati-hati. | Dokumentasikan mitigation di plan. |
| **High** | Risiko signifikan — butuh mitigasi eksplisit. | Tambah verification step di plan. Bisa jadi alasan untuk escalate ke Brahma. |

### Unknowns

Unknowns adalah asumsi yang belum diverifikasi. Contoh:
- "Saya berasumsi endpoint ini selalu return JSON" → belum dicek
- "Saya berasumsi struktur database tidak berubah" → belum dicek
- "Saya berasumsi user selalu punya portfolio" → asumsi berbahaya

**Semua unknowns harus di-resolve sebelum coding dimulai.**
Jika tidak bisa di-resolve dalam planning, catat sebagai Open Question.

---

## 8. Scope Definition

Output scope harus menjawab 5 pertanyaan ini secara eksplisit:

### In Scope
Apa yang **harus** diselesaikan. Spesifik dan terukur.
```
- Menambah endpoint GET /api/export
- Mengubah Dashboard.jsx: tambah tombol export
- Format output: CSV dengan kolom date, amount, category
```

### Out of Scope
Apa yang **tidak** akan disentuh. Eksplisit!
```
- TIDAK mengubah format data di database
- TIDAK menambah filter/sort di halaman export
- TIDAK menyentuh Finance.jsx
```

### Files Likely Affected
Daftar file yang kemungkinan akan diubah.
```
- /root/agents/pablo/finance/app.py  (line 200-250)
- /root/agents/pablo/finance/templates/index.html  (line 150-170)
```

### Systems Affected
Sistem/modul yang terpengaruh (bisa lebih luas dari file).
```
- Finance Dashboard (primary)
- Export service (new)
- Tidak ada dampak ke Gym Dashboard
```

### Dependencies
Apa yang harus ada sebelum task ini bisa dimulai?
```
- Library csv (built-in Python — no install needed)
- Endpoint /api/transactions sudah ada dan berfungsi
```

---

## 9. Workflow Selection

Pilih workflow yang akan digunakan untuk mengeksekusi task ini.
Pilihan:

| Workflow | Skill File | Kapan Dipakai |
|----------|-----------|---------------|
| **IMPLEMENT_FEATURE** | 01_IMPLEMENT_FEATURE.md | Fitur baru, perubahan signifikan |
| **FIX_BUG** | 02_FIX_BUG.md | Debugging, perbaikan bug |
| **CODE_REVIEW** | 03_CODE_REVIEW.md | Review kode existing |
| **REFACTOR** | (planned) | Restructuring tanpa behavior change |
| **BALANCE_GAMEPLAY** | (planned) | Tuning parameter game |

### Aturan Pemilihan

1. **Satu workflow utama per task.** Jangan campur IMPLEMENT_FEATURE dengan FIX_BUG.
2. **Jika task butuh multiple workflows → pecah jadi sub-task.**
3. **Jelaskan alasan pemilihan.** Bukan cuma "pilih X", tapi kenapa X.

### Contoh Pemilihan

```
Task: "Tambah fitur export CSV di dashboard"

Classification: Feature
Selected Workflow: IMPLEMENT_FEATURE
Reasoning: Ini adalah fitur baru. Tidak ada bug yang perlu difix. Pola existing
  (endpoint API) bisa diikuti. Complexity rendah, bisa satu fase.

Task: "Dashboard crash saat buka dengan portfolio kosong"

Classification: Bug Fix
Selected Workflow: FIX_BUG
Reasoning: Ini adalah bug dengan symptom jelas (crash) dan root cause yang
  perlu diinvestigasi. FIX_BUG workflow menyediakan proses sistematis untuk
  investigasi root cause sebelum coding.
```

---

## 10. Decision Rules

Hierarki keputusan saat planning:

| Prioritas | Aturan |
|-----------|--------|
| 1 (tertinggi) | **Never implement before planning.** Tidak ada kode yang ditulis sebelum plan selesai. |
| 2 | **Prefer one clear workflow.** Satu task = satu workflow. Mixed tasks dipecah. |
| 3 | **Split mixed tasks into independent phases.** Jangan kerjakan refactor sambil nambah fitur. |
| 4 | **Read project documents before planning implementation.** Constitution dan architecture adalah wajib. |
| 5 | **Unknowns must be identified before coding.** Semua asumsi harus diverifikasi atau dicatat sebagai Open Question. |

---

## 11. Stop Conditions

**Prinsip utama: «Never continue by guessing.»**

AI harus **berhenti dan melapor ke Brahma** jika salah satu kondisi berikut
terpenuhi. Jangan lanjutkan planning.

| # | Kondisi | Tindakan |
|---|---------|----------|
| 1 | **Requirement ambigu.** Tidak bisa mengidentifikasi objective dari request. | Tanya Brahma: apa yang sebenarnya ingin dicapai? |
| 2 | **Scope tidak jelas.** Tidak bisa menentukan In Scope / Out Scope. | Tanya Brahma: apa batasan task ini? |
| 3 | **Tujuan bisnis tidak diketahui.** Tidak paham kenapa task ini penting. | Tanya Brahma: konteks dan motivasi di balik request. |
| 4 | **Dokumen penting belum tersedia.** Constitution atau architecture docs tidak bisa diakses. | Minta akses ke dokumen yang diperlukan. |
| 5 | **Risiko terlalu tinggi untuk direncanakan.** Level risiko High pada 3+ dimensi, atau ada risiko yang tidak bisa dimitigasi. | Laporkan risiko, minta keputusan dari Brahma. |

**Setelah berhenti dan melapor, tunggu instruksi Brahma sebelum lanjut.**

---

## 12. Planning Output Format

Gunakan format baku berikut untuk output planning. Format ini harus
diproduksi sebelum implementasi dimulai.

```
## Task Plan

🎯 Objective
[1-2 kalimat — apa yang ingin dicapai]

🏷️ Task Classification
[Feature / Bug Fix / Refactor / Code Review / Balance / Documentation / Research / Mixed]

📐 Scope

In Scope:
- ...
- ...

Out of Scope:
- ...
- ...

🔗 Systems Affected
- [System/Module] — [bagaimana terpengaruh]

Files Likely Affected:
- [path/file] — [jenis perubahan]

⚠️ Risks

| Dimensi | Level | Notes |
|---------|-------|-------|
| Architecture | Low/Med/High | ... |
| Regression | Low/Med/High | ... |
| Save Compat | Low/Med/High | ... |
| Scope Creep | Low/Med/High | ... |
| Unknowns | Low/Med/High | ... |

🔧 Selected Workflow
[IMPLEMENT_FEATURE / FIX_BUG / CODE_REVIEW / ...]
Reasoning: [kenapa workflow ini]

📋 Implementation Plan

1. [Langkah 1] — [file yang diubah] — [verification point]
2. [Langkah 2] — [file yang diubah] — [verification point]
3. ...

❓ Open Questions
- [pertanyaan yang belum terjawab]
```

### Contoh

```
## Task Plan

🎯 Objective
User bisa mendownload data transaksi sebagai CSV dari Finance Dashboard.

🏷️ Task Classification
Feature

📐 Scope

In Scope:
- Endpoint GET /api/export/transactions → return CSV
- Tombol "Export CSV" di halaman Finance

Out of Scope:
- Export PDF/Excel (hanya CSV)
- Filter/sort di halaman export
- Export data gym

🔗 Systems Affected
- Finance Dashboard — tambah endpoint + UI button

Files Likely Affected:
- /root/agents/pablo/finance/app.py — tambah route export
- /root/agents/pablo/finance/templates/index.html — tambah tombol

⚠️ Risks

| Dimensi | Level | Notes |
|---------|-------|-------|
| Architecture | Low | Endpoint baru, tidak menyentuh logic existing |
| Regression | Low | Tidak ada shared logic yang diubah |
| Save Compat | N/A | Tidak ada perubahan format data |
| Scope Creep | Medium | Godaan: "sekaligus tambah filter date range" |
| Unknowns | Low | CSV library built-in, tidak ada dependency baru |

🔧 Selected Workflow
IMPLEMENT_FEATURE
Reasoning: Fitur baru, pola existing (endpoint pattern) bisa diikuti. Complexity rendah.

📋 Implementation Plan

1. Tambah route /api/export/transactions di app.py — verify: curl endpoint return CSV
2. Tambah tombol "Export CSV" di index.html — verify: klik tombol trigger download
3. Test dengan data kosong — verify: return CSV dengan header saja
4. Build + deploy

❓ Open Questions
- None.
```

---

## 13. Success Criteria

Planning dinyatakan sukses jika:

1. **Objective jelas** — bisa dijelaskan dalam 1-2 kalimat.
2. **Scope tegas** — In Scope dan Out of Scope eksplisit.
3. **Risks teridentifikasi** — semua 5 dimensi sudah dinilai.
4. **Workflow terpilih** — dengan reasoning yang jelas.
5. **Implementation plan actionable** — bisa langsung dieksekusi.
6. **Open questions documented** — tidak ada asumsi tersembunyi.
7. **Brahma approve** — plan sudah dikonfirmasi sebelum eksekusi.

---

## 14. Related Documents

- **01_IMPLEMENT_FEATURE.md** — workflow implementasi fitur (output dari planning)
- **02_FIX_BUG.md** — workflow debugging (output dari planning)
- **03_CODE_REVIEW.md** — workflow code review (output dari planning)
- **Project Constitution** — aturan main proyek, wajib dibaca saat planning
- **Developer Protocol (AGENTS.md)** — prosedural dev: backup, commit, verify
