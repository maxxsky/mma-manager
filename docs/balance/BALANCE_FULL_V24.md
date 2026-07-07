# MMA Manager — Bidirectional v24 (X_vs_AR entries + BJJ sub 0.07)

**Changes:**
- Added: Boxer_vs_AR, MT_vs_AR, Wrestler_vs_AR, BJJ_vs_AR matchMod entries
- BJJ_vs_MT aSub: 0.05 → 0.07

**Config:** 5,000 × 20 directional, stats ≈60

---

## Mirror Checks

| Pair | A→B | B→A | Mirror | Δ v23 |
|------|-----|-----|--------|-------|
| Boxer↔MT | 47.9% | 54.5% | 102.4% ✅ | — |
| Boxer↔Wrestler | 35.5% | 66.4% | 101.9% ✅ | — |
| Boxer↔BJJ | 49.8% | 54.8% | 104.6% ✅ | — |
| Boxer↔AR | 61.0% | 41.1% | 102.1% ✅ | -0.2 |
| MT↔Wrestler | 51.1% | 44.1% | 95.2% ✅ | — |
| MT↔BJJ | 25.9% | 63.5% | 89.4% ⚠️ | +0.1 |
| MT↔AR | 53.1% | 56.3% | 109.4% 🟡 | -1.4 |
| Wrestler↔BJJ | 54.0% | 52.1% | 106.1% 🟡 | — |
| Wrestler↔AR | 58.0% | 62.8% | 120.8% ⚠️ | +0.7 |
| BJJ↔AR | 63.8% | 39.2% | 103.0% ✅ | -0.2 |

---

## Overall

| Archetype | Win% | Δ v23 |
|-----------|------|-------|
| BJJ | 58.6% | +0.4 |
| Wrestler | 55.6% | +0.1 |
| AR | 49.8% | -1.2 |
| Boxer | 48.6% | +0.1 |
| MT | 46.1% | +0.2 |

---

## Assessment

| Issue | Status |
|-------|--------|
| MT↔AR mirror | 109.4% 🟡 Improved (was 110.8%) |
| Wrestler↔AR mirror | 120.8% ⚠️ No change — matchMod insufficient |
| MT↔BJJ mirror | 89.4% ⚠️ No change — aSub 0.07 didn't help |
| Overall spread | 46-59% — tight |

**Wrestler↔AR** and **MT↔BJJ** are structural — stats gap too large for matchMod alone. Need stat tweaks.
