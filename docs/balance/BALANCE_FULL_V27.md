# MMA Manager — Bidirectional v27 (BJJ Bottom Sub 30% Gate + WR_vs_AR aTDDef)

**Changes:**
- BJJ bottom sub: separate `bjjGuardProgress`, 30% random gate, threshold 45
- Wrestler_vs_AR: aGNP → aTDDef

---

## Mirror Checks

| Pair | Mirror | Δ v25 |
|------|--------|-------|
| Boxer↔MT | 102.4% ✅ | — |
| Boxer↔Wrestler | 101.9% ✅ | — |
| Boxer↔BJJ | 110.5% ⚠️ | +3.7 |
| Boxer↔AR | 102.1% ✅ | — |
| MT↔Wrestler | 95.2% ✅ | — |
| MT↔BJJ | 94.9% 🟡 | +2.3 |
| MT↔AR | 109.4% 🟡 | — |
| Wrestler↔BJJ | 114.3% ⚠️ | +5.4 |
| Wrestler↔AR | 126.0% ⚠️ | +5.2 |
| BJJ↔AR | 109.7% 🟡 | +1.6 |

---

## Overall

| Archetype | v25 | v27 | Δ |
|-----------|-----|-----|----|
| BJJ | 58.7% | 64.0% | +5.3 |
| Wrestler | 56.3% | 57.0% | +0.7 |
| AR | 51.0% | 50.3% | -0.7 |
| Boxer | 49.1% | 48.4% | -0.7 |
| MT | 47.0% | 46.8% | -0.2 |

---

## Assessment

| Issue | Status |
|-------|--------|
| BJJ guard sub (30% gate) | BJJ +5.3% — mechanic works, needs lowering gate to 20% |
| WR_vs_AR aTDDef | Made worse (126% vs 121%) — wrong lever |
| MT↔BJJ mirror | 94.9% — improved from 92.6% |

**BJJ guard sub mechanic is right direction** but 30% gate too generous. Try 20%.
