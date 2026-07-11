# Game Status (v2)

> **Dashboard Implementasi Game — Design Compliance Audit (Re-audit)**
> **Last Updated:** July 2026
> **Code Version:** 3f65de9
> **Method:** Design Compliance Audit (re-audit, all evidence from codebase HEAD)
> **Verified & corrected:** 11 Juli 2026 — lihat "Correction Log" di bawah. v2 sempat salah mencatat 2 fitur sebagai "belum ada" padahal sudah ada sejak v1, plus 1 item ke-double-count. Sudah dikoreksi di tabel di bawah.

---

## Overall Summary

| Metric | Old (v1) | New (v2) | Delta |
|--------|:--------:|:--------:|:-----:|
| **Overall Design Coverage** | **81%** | **88%** | **+7%** |
| **Overall Design Drift** | **MEDIUM** (~19%) | **LOW** (~12%) | **-7%** |
| **Critical Gaps** | 10 | 3 | -7 |
| **Test Suite** | 30/31 | **36/36** | +6 |

*Catatan: angka Coverage/Drift di atas belum di-recalculate ulang pasca patch 17-22 (financial scaling, timeline persistence, prosperity generator, double-fight guard, name uniqueness, event freq sanity test). Kemungkinan besar coverage sebenarnya sedikit lebih tinggi dari yang tercatat — butuh audit v3 buat angka final.*

---

## Domain Status

| Domain | Old Coverage | New Coverage | Δ | Drift | Status |
|--------|:-----------:|:-----------:|:-:|:-----:|:------:|
| Combat | 92% | **95%** | +3% | LOW | 🟢 Accept |
| Training | 88% | **93%** | +5% | LOW | 🟢 Accept |
| Fighter | 91% | **94%** | +3% | LOW | 🟢 Accept |
| World | 78% | **78%** | 0% | MEDIUM | 🟡 Improve Later |
| Economy | 72% | **88%** | +16% | LOW | 🟢 Accept |
| Events | 45% | **72%** | +27% | MEDIUM | 🟡 Improve Later |
| Save | 85% | **85%** | 0% | LOW | 🟢 Accept |
| UI | 94% | **94%** | 0% | LOW | 🟢 Accept |

```
Coverage by Domain (v1 ██ vs v2 ██)

Combat     █████████████████████ 92→95%
Training   ████████████████████  88→93%
Fighter    █████████████████████ 91→94%
World      █████████████████    78→78%
Economy    ████████████████████ 72→88%  ▲
Events     ██████████████████   45→72%  ▲▲▲
Save       ███████████████████  85→85%
UI         ████████████████████ 94→94%
```

---

## Remaining Gaps

| # | Gap | Domain | Priority | Category |
|---|-----|--------|:--------:|----------|
| 1 | Event frequency — precise calibration (baru ada sanity band lebar, belum target presisi) | Events | P2 | Partial |
| 2 | Form validation (remaining fields) | UI | P3 | **Unverified — lihat Correction Log, kemungkinan bukan gap nyata** |

*Semua item lain di "Remaining Gaps" versi sebelumnya sudah resolved atau terbukti bukan gap nyata — lihat "Gaps Resolved" dan "Correction Log" di bawah.*

---

## Gaps Resolved Since v1

| Gap | Domain | Priority | Fixed In |
|-----|--------|:--------:|----------|
| Damage never negative (clamp) | Combat | P2 | c43b955 |
| Upset rate calibration test | Combat | P3 | 26d85de |
| Puncher's chance redesign (0% upset floor fixed) | Combat | — | acd16d8 |
| Training clamp 0→5 | Training | P3 | 1d92c84 |
| Monthly rate calibration test | Training | P3 | 5e71d3e |
| Lifecycle phase tracking | Fighter | P2 | 7595f7e |
| Name uniqueness at scouting (bukan "signing" — dikoreksi) | Fighter | P3 | 3f65de9 |
| Cash reserve warning | Economy | P1 | f196b55 |
| Bankruptcy grace period | Economy | P2 | 7ecf3de |
| Sponsor renewal mechanic | Economy | P3 | 2bbbe07 |
| Financial scaling per camp tier (partial — coach market gated by rep) | Economy | P2 | beef621 |
| Event chains (title, streaks) | Events | P1 | b69f287→e4bceaf |
| Cross-system Training→Events | Events | P1 | f0f9497 |
| Formal event cooldown system | Events | P1 | d8f6627 |
| Timeline persistence for events | Events | P2 | d2c2d27 |
| Prosperity generator (Economy-positive type) | Events | P3 | 74cf46d |
| Event frequency — sanity test (bukan kalibrasi presisi) | Events | P2 | 05a9388 |
| Phase order invariant test (rival lifecycle) | World | P2 | 543b3fc |
| Double-fight invariant guard + test | World | P3 | a383e22 |
| UNDO/REDO test enabled | Testing | — | 23c6391 |
| **Total resolved** | | | **20 gaps** |

---

## Release Readiness: **Ready to Freeze Baseline**

**Criteria met:**
- ✅ No Critical findings remain
- ✅ All P1 gaps resolved (5/5)
- ✅ Economy +27% improvement (72%→88%, kemungkinan lebih tinggi lagi pasca financial scaling fix)
- ✅ Events +27% improvement (45%→72%, kemungkinan lebih tinggi lagi pasca timeline/prosperity/cooldown)
- ✅ Test suite: 36/36 passing, 0 skipped, 0 failed
- ⚠️ GAME_STATUS v2 sempat berisi 2 klaim salah + 1 double-count — sudah dikoreksi (lihat Correction Log)
- ✅ All 8 domains re-audited from codebase HEAD (dengan catatan: perlu audit v3 buat capture patch 17-22)

**Remaining work (2 items, non-blocking):**
1. Event frequency — perlu instrumentasi presisi + target dari game designer kalau mau dikalibrasi ketat (saat ini cuma sanity band lebar)
2. Form validation — perlu diverifikasi ulang apakah ini gap nyata; audit awal nggak nemu input field bermasalah di UI

**Puncher's chance redesign (acd16d8) — flag khusus:** ini perubahan combat math paling beresiko di seluruh sesi ini. Udah diverifikasi lewat simulasi otomatis (upset rate, sanity check matchup dekat), tapi **belum dikonfirmasi playtest manual**. Disaranin dicoba main langsung sebelum dianggap final.

---

*This document is a living artifact — update after each audit cycle or major sprint.*

---

## Correction Log

**11 Juli 2026 — Verifikasi manual terhadap GAME_STATUS v2 + `UNRESOLVED_ITEMS.md`, dibandingkan langsung ke kode di commit HEAD.**

Method: baca tiap item di "Remaining Gaps" v2, grep/telusuri kode asli buat konfirmasi klaimnya bener atau nggak — sama seperti metode verifikasi v1 sebelumnya.

**2 klaim SALAH — fitur sebenarnya sudah ada, ke-resurrect dari kesalahan v1 yang sama:**
1. **"Checkpoint backup system"** (Save, P2) — salah. `backupSave()`, `restoreBackup()`, `hasBackup()` ada di `engine/polish.js`, dipanggil di `hooks/useSaveLoad.js:66`. Sudah dikoreksi di v1's Correction Log, tapi audit v2 (re-audit dari nol) mengulang kesalahan yang sama karena tidak membaca history koreksi sebelumnya.
2. **"AI fighter retirement automation"** (World, P3) — salah. `world.js:149` sudah auto-retire fighter AI via `RETIREMENT_AGE`/`RETIREMENT_CHANCE`. Sama seperti di atas, kesalahan lama yang ke-resurrect.

**1 item double-counted:**
3. **"Phase order invariant test"** (World, P2) — item ini sebenarnya SUDAH resolved sebelum v2 ditulis (commit `543b3fc`, test `'rival camp lifecycle never returns to expansion...'` di `invariants.test.js`). v2 mencatatnya di DUA tempat sekaligus: sebagai "resolved" (dengan nama "Rival lifecycle test", kategori Testing) DAN sebagai "Remaining Gap #4" — audit v2 tidak mengenali bahwa dua entri itu merujuk ke test yang sama.

**Pelajaran untuk audit berikutnya (v3):** re-audit "dari nol" (fresh codebase scan tanpa baca history) berisiko mengulang kesalahan lama. Disarankan audit v3 membaca Correction Log v1 dan v2 dulu sebagai referensi sebelum menyimpulkan status gap.

**11 Juli 2026 (lanjutan) — Verifikasi eksekusi Patch 17-22 (item dari `UNRESOLVED_ITEMS.md` yang confirmed real).**

Semua 6 patch (financial scaling per tier — commit `beef621`; timeline persistence — `d2c2d27`; double-fight guard+test — `a383e22`; prosperity generator — `74cf46d`; event frequency sanity test — `05a9388`; name uniqueness at scouting — `3f65de9`) diverifikasi diff-by-diff, match dengan spec. `npm test` → 36 passed, 0 skipped, 0 failed. Satu catatan positif: implementasi `genCoach(8)` di `builders.js` (Patch 17) di-verifikasi ulang oleh Santiago terhadap nilai rep awal riil dari `createCamp()`, bukan asal pakai placeholder dari instruksi awal — praktik yang baik.

**Financial scaling per tier — hasil, bukan fix sempurna:** empirical P&L test (200 trial rata-rata per tier, roster/coach/fasilitas dimaksimalkan sesuai cap masing-masing tier) menunjukkan perbaikan nyata tapi belum menutup gap sepenuhnya:

| Tier | NET sebelum | NET sesudah |
|---|---|---|
| 0 Local Gym | -11,678/bln | -5,564/bln |
| 1 Regional | -14,499/bln | -3,960/bln |
| 2 National | -14,592/bln | -5,574/bln |
| 3 Elite Factory | -5,552/bln | -893/bln |
| 4 World-Class | +6,176/bln | +6,969/bln |

Tier 0-3 masih net-negatif kalau "dibangun penuh" — root cause utama (coach market tidak digate sesuai rep) sudah diperbaiki, tapi facility maintenance cost belum disentuh. Belum jelas apakah "negatif saat over-invest di tier rendah" ini bug atau desain yang disengaja (mirip genre FM/OOTP di mana over-ekspansi prematur punya konsekuensi) — perlu keputusan desain dari Brahma kalau mau di-drive ke breakeven penuh.
