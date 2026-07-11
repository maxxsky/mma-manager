---
name: ai-workflow
description: >-
  Master orchestrator untuk seluruh Skill Library. Menentukan workflow AI
  dari task diterima sampai task selesai. Entry point sebelum menjalankan
  skill apa pun.
---

# AI Workflow — Master Orchestrator

## 1. Purpose

Dokumen ini adalah **orchestrator utama** untuk seluruh Skill Library.
Dokumen ini menentukan alur kerja AI dari awal menerima task sampai
task dinyatakan selesai — termasuk pemilihan workflow, eksekusi,
review, dan recovery dari kegagalan.

Semua skill lain (01–05) beroperasi di bawah orkestrasi dokumen ini.
**AI wajib membaca dokumen ini sebelum menjalankan skill apa pun.**

---

## 2. Workflow Overview

Alur standar dari task diterima sampai selesai:

```
┌─────────────────────────────────────────────────────────────┐
│                      TASK RECEIVED                          │
│            Brahma memberikan task (fitur/bug/refactor)      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   04_TASK_PLANNING                          │
│                                                             │
│  • Klasifikasi task (Feature/Bug/Refactor/Mixed)            │
│  • Analisa scope & risiko                                   │
│  • Pilih workflow yang sesuai                               │
│                                                             │
│  Output: Task Plan                                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   SELECT WORKFLOW    │
              └──────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ 01_FEATURE  │  │ 02_FIX_BUG  │  │05_REFACTOR  │
│             │  │             │  │             │
│ Implementasi│  │ Investigasi │  │ Ubah struktur│
│ fitur baru  │  │ + perbaikan │  │ tanpa ubah   │
│             │  │             │  │ behavior     │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       └────────────────┼────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    03_CODE_REVIEW                           │
│                                                             │
│  • Review hasil implementasi                                │
│  • Periksa Constitution, Architecture, Patterns             │
│  • Beri severity + recommendation                          │
│                                                             │
│  Output: Review Result                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
              ┌──────────────────────┐
              │   REVIEW DECISION    │
              └──────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
   ┌──────────┐   ┌──────────┐   ┌──────────┐
   │ Approve  │   │ Request  │   │  Reject  │
   │          │   │ Changes  │   │          │
   └────┬─────┘   └────┬─────┘   └────┬─────┘
        │              │              │
        ▼              ▼              ▼
   ┌────────┐   ┌──────────┐   ┌──────────┐
   │  DONE  │   │ Kembali  │   │ Laporkan │
   │        │   │ ke       │   │ ke       │
   │        │   │ workflow │   │ Brahma   │
   └────────┘   │ sebelumnya│  └──────────┘
                │ + review  │
                │ ulang     │
                └──────────┘
```

### Ringkasan Alur

| Fase | Skill | Output |
|------|-------|--------|
| 1. Planning | `04_TASK_PLANNING` | Task Plan |
| 2. Execution | `01` / `02` / `05` | Implementation |
| 3. Review | `03_CODE_REVIEW` | Review Result |
| 4. Decision | — | Approve / Request Changes / Reject |

---

## 3. Workflow Selection

Mapping dari task type ke workflow. Digunakan setelah TASK_PLANNING
selesai mengklasifikasikan task.

| Task Type | Primary Workflow | Skill File |
|-----------|-----------------|------------|
| **Feature** | IMPLEMENT_FEATURE | `01_IMPLEMENT_FEATURE.md` |
| **Bug Fix** | FIX_BUG | `02_FIX_BUG.md` |
| **Refactor** | REFACTOR | `05_REFACTOR.md` |
| **Code Review** | CODE_REVIEW | `03_CODE_REVIEW.md` |
| **Documentation** | IMPLEMENT_FEATURE | `01_IMPLEMENT_FEATURE.md` |
| **Research** | TASK_PLANNING (output: plan) | `04_TASK_PLANNING.md` |
| **Balance** | IMPLEMENT_FEATURE | `01_IMPLEMENT_FEATURE.md` |
| **Mixed** | Split → pilih per sub-task | Lihat Section 5 |

### Aturan Pemilihan

1. **Satu task = satu workflow utama.** Jangan menjalankan dua workflow paralel untuk task yang sama.
2. **Planning selalu duluan.** `04_TASK_PLANNING` wajib dijalankan sebelum workflow apapun.
3. **Review selalu di akhir.** `03_CODE_REVIEW` wajib dijalankan setelah implementasi.
4. **Research adalah output planning.** Tidak menghasilkan kode — hanya plan.
5. **Review langsung tanpa planning hanya untuk task "review ini".** Tidak ada kode yang dihasilkan.

---

## 4. Standard Execution Flow

Setiap task mengikuti alur standar ini. Tidak boleh ada langkah yang
dilewati tanpa alasan yang jelas.

### Phase 1 — Planning

```
Trigger: Brahma memberikan task.

Actions:
1. Load 04_TASK_PLANNING.md
2. Jalankan Planning Workflow (9 steps)
3. Hasilkan Task Plan

Gate: Task Plan harus jelas — objective, scope, risk, workflow terpilih.
Jika Task Plan tidak bisa dihasilkan → Stop Conditions (Section 6).
```

### Phase 2 — Execution

```
Trigger: Task Plan disetujui.

Actions:
1. Load workflow yang terpilih (01/02/05)
2. Jalankan workflow sesuai dokumen skill masing-masing
3. Hasilkan output sesuai format skill

Gate: Implementation harus lulus Validation Checklist dari skill tersebut.
Jika gagal → Stop Conditions atau kembali ke workflow (fix issue).
```

### Phase 3 — Review

```
Trigger: Implementation selesai.

Actions:
1. Load 03_CODE_REVIEW.md
2. Jalankan Review Workflow (9 steps)
3. Hasilkan Review Result dengan Merge Recommendation

Gate: Review Result harus punya semua findings dengan severity.
```

### Phase 4 — Decision

```
Trigger: Review Result tersedia.

Decision Tree:

Approve ──────────────► DONE — task selesai.
Approve with Minor ───► DONE — minor bisa dikerjakan terpisah.
Request Changes ──────► KEMBALI ke Phase 2 — fix issue, lalu Phase 3 ulang.
Reject ───────────────► STOP — laporkan ke Brahma dengan alasan reject.
```

### Anti-Patterns

| ❌ Jangan | ✅ Lakukan |
|----------|-----------|
| Skip planning — langsung coding | Planning selalu duluan |
| Skip review — langsung commit | Review selalu di akhir |
| Gabung 3 workflow dalam 1 task | Satu task = satu workflow utama |
| Planning sambil coding | Planning selesai dulu, baru eksekusi |
| Review diri sendiri tanpa format | Gunakan format 03_CODE_REVIEW |

---

## 5. Mixed Task Protocol

Mixed Task adalah task yang melibatkan lebih dari satu tipe pekerjaan.
Contoh: "Refactor modul finance DAN tambah fitur export."

### Protokol

```
1. DETEKSI — TASK_PLANNING mengidentifikasi task sebagai Mixed.
2. PECAH — task dipecah menjadi sub-task independen.
3. URUTKAN — tentukan urutan pengerjaan (dependensi).
4. EKSEKUSI — kerjakan sub-task SATU PER SATU.
5. REVIEW — setiap sub-task di-review secara independen.
6. INTEGRASI — setelah semua sub-task selesai, lapor keseluruhan.
```

### Contoh

```
Task: "Refactor finance module dan tambah fitur export CSV"

Phase 1 — TASK_PLANNING:
  → Mixed Task terdeteksi.
  → Sub-task A: REFACTOR — finance module
  → Sub-task B: FEATURE — export CSV

Phase 2 — Sub-task A: REFACTOR
  → 05_REFACTOR → verify behavior unchanged → 03_CODE_REVIEW → Approve

Phase 3 — Sub-task B: FEATURE
  → 01_IMPLEMENT_FEATURE → implement → 03_CODE_REVIEW → Approve

Phase 4 — Final Report
  → Semua sub-task selesai. Lapor ke Brahma.
```

### Aturan Mixed Task

1. **Satu sub-task selesai dulu sebelum lanjut.** Jangan paralel.
2. **Setiap sub-task punya planning mini.** Tidak perlu full TASK_PLANNING ulang, tapi scope dan risk harus jelas.
3. **Review per sub-task.** Jangan review semua di akhir.
4. **Urutan berdasarkan dependensi.** Refactor dulu, baru feature (jika feature bergantung hasil refactor).

---

## 6. Failure & Recovery

### Ketika Stop Conditions Tercapai

Setiap skill (01–05) memiliki Stop Conditions masing-masing. Ketika
Stop Condition tercapai di fase manapun:

```
1. BERHENTI — jangan lanjutkan eksekusi.
2. LAPORKAN — ke Brahma:
   • Di fase apa stop terjadi?
   • Apa penyebabnya?
   • Apa yang sudah dikerjakan?
   • Apa yang dibutuhkan untuk lanjut?
3. JANGAN BERASUMSI — jangan teruskan dengan tebakan.
4. TUNGGU — instruksi berikutnya dari Brahma.
```

### Recovery Paths

| Stop di Fase | Recovery |
|-------------|----------|
| **Planning** | Minta klarifikasi requirement/scope. Setelah jelas, planning ulang. |
| **Execution** | Diagnosa penyebab: bug? missing info? scope berubah? Fix sesuai workflow (02_FIX_BUG jika bug). |
| **Review** | Request Changes → kembali ke execution. Reject → laporkan ke Brahma. |
| **Decision (Reject)** | Tidak ada recovery path. Brahma yang memutuskan langkah selanjutnya. |

### Prinsip Recovery

- **Jangan hapus hasil kerja.** Simpan — mungkin berguna nanti.
- **Jangan start over tanpa alasan.** Biasanya fixable dengan scope adjustment.
- **Jangan blame.** Fokus pada: apa yang bisa dilakukan sekarang?

---

## 7. Completion Criteria

Task dinyatakan **selesai** jika:

1. ✅ **Semua fase sudah dijalankan** — Planning → Execution → Review → Decision.
2. ✅ **Tidak ada Stop Condition** yang terpicu.
3. ✅ **CODE_REVIEW menghasilkan Approve atau Approve with Minor Changes.**
4. ✅ **Validation Checklist** dari workflow yang digunakan terpenuhi semua.
5. ✅ **Report** diproduksi dengan format baku.
6. ✅ **Brahma diinformasikan** tentang hasil akhir.

Task dinyatakan **tidak selesai** jika:

1. ❌ Stop Condition terpicu di fase manapun.
2. ❌ CODE_REVIEW menghasilkan Request Changes (belum selesai — kembali ke execution).
3. ❌ CODE_REVIEW menghasilkan Reject.
4. ❌ Validation Checklist tidak lengkap.

---

## 8. Output Standards

Setiap fase menghasilkan output dengan format standar. Gunakan format ini
secara konsisten di semua task.

| Fase | Skill | Output Format | Header |
|------|-------|---------------|--------|
| **Planning** | 04_TASK_PLANNING | Task Plan | `## Task Plan` |
| **Feature** | 01_IMPLEMENT_FEATURE | Feature Result | `## Feature Result` |
| **Bug Fix** | 02_FIX_BUG | Bug Fix Result | `## Bug Fix Result` |
| **Refactor** | 05_REFACTOR | Refactor Result | `## Refactor Result` |
| **Review** | 03_CODE_REVIEW | Review Result | `## Review Result` |

### Konvensi Output

Semua output mengikuti format baku skill masing-masing. Jika skill belum
mendefinisikan format baku (Feature Result, Bug Fix Result), gunakan
format berikut sebagai fallback:

```
## [Type] Result

🟢 Overall
[Done / Partial / Blocked]

📋 Summary
[1-3 kalimat]

Files Changed:
- [path/file] — [deskripsi]

✅ Validation
- [checklist dari workflow]

➡️ Next Steps
- ...
```

### Format Summary untuk Brahma

Setelah task selesai (atau berhenti), kirim ringkasan ke Brahma:

```
[STATUS] [Task Type] — [Judul]

[1 kalimat hasil]

Files: [jumlah file diubah]
Review: [Approve / Request Changes / Reject]
```

Contoh:
```
✅ FEATURE — Export CSV di Finance Dashboard
Endpoint export berfungsi, 3 file diubah.
Review: Approve
```

---

## 9. Related Documents

| Dokumen | Peran dalam Orkestrasi |
|---------|----------------------|
| **04_TASK_PLANNING.md** | Phase 1 — analisa dan klasifikasi task |
| **01_IMPLEMENT_FEATURE.md** | Phase 2 — implementasi fitur baru |
| **02_FIX_BUG.md** | Phase 2 — debugging dan perbaikan |
| **05_REFACTOR.md** | Phase 2 — restrukturisasi kode |
| **03_CODE_REVIEW.md** | Phase 3 — review hasil implementasi |
| **Project Constitution** | Aturan mengikat — berlaku di semua fase |
| **Developer Protocol (AGENTS.md)** | Prosedural dev — backup, commit, verify |

---

## Ringkasan Aturan Orkestrasi

1. **Planning selalu duluan.** Tidak ada kode sebelum Task Plan.
2. **Satu task = satu workflow utama.** Mixed dipecah.
3. **Review selalu di akhir.** Tidak ada implementasi tanpa review.
4. **Stop Conditions = berhenti total.** Jangan lanjut dengan tebakan.
5. **Request Changes = kembali ke execution.** Bukan failure, tapi iterasi.
6. **Reject = eskalasi ke Brahma.** AI tidak bisa memutuskan sendiri.
7. **Output standar.** Setiap fase punya format baku.
8. **Recovery, bukan restart.** Jika gagal, cari fix minimal — jangan ulang dari nol.
