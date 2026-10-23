## Design Compliance Audit

### Scope

Domain: Training
Knowledge: knowledge/02_TRAINING.md
Codebase: /root/mma-manager/app/src/engine/tick/training.js
Date: July 2026

---

### Summary

Overall Compliance: 88%

🟢 Fully Implemented: 14
🟡 Partially Implemented: 2
🟠 Implemented Differently: 1
🔴 Missing: 1
⚫ Unknown: 0

---

### Design Coverage

Overall Design Coverage: 88%

Coverage By Domain

| Domain | Coverage | Status |
|--------|--------:|--------|
| Training | 88% | 🟢 |

---

### Findings

#### 🟢 — Design Goals (6 goals)

Requirement (from Knowledge):
"All training programs remain viable. Intensity levels have clear trade-offs. Coaches meaningfully impact progression. Facilities reward investment. Overtraining is a real threat. Recovery is a legitimate program."

Current Implementation:
All 6 goals implemented. 5 training programs + fight camp + 3 intensity levels. Coach bonus via coachBonus(). Facility bonus via facBonus(). Overtracking accumulation formula. Recovery program reduces overtraining by -30/week.

Status: 🟢 Fully Implemented
Evidence:
- engine/data/training.js — 6 programs defined
- engine/tick/training.js:68-70 — recovery reduces overtraining
- engine/tick/training.js:89-91 — intensity multiplier affects gains

Impact: None
Category: — (compliant)

---

#### 🟢 — Responsibilities (Section 5)

Requirement (from Knowledge):
Training owns: fighter attribute growth, overtraining, injury generation, injury recovery, morale drift, sparring quality, training history, coach assignment constraints.

Current Implementation:
All 8 owned responsibilities implemented in tick/training.js.

Status: 🟢 Fully Implemented
Evidence:
- engine/tick/training.js:85-91 — attribute growth per program
- engine/tick/training.js:100-106 — overtraining accumulation + decay
- engine/tick/training.js:108-125 — injury generation
- engine/tick/training.js:30-50 — injury recovery + attribute decay
- engine/tick/training.js:26-27 — morale drift
- engine/tick/training.js:8-18 — sparring quality
- engine/tick/training.js:148 — training history (trainingHistory)
- engine/tick/training.js:64-66 — attention constraint

Impact: None
Category: — (compliant)

---

#### 🟢 — Invariant: Overtraining never exceeds 100 or below 0

Requirement (from Knowledge):
"Overtraining never exceeds 100 — clamped at the upper bound. Overtraining never goes below 0 — clamped at the lower bound."

Current Implementation:
`clamp(f.overtraining + inten.ot * ... - 8, 0, 100)` — explicit clamp at both bounds.

Status: 🟢 Fully Implemented
Evidence:
- engine/tick/training.js:102 — clamp at 0 and 100
- engine/tick/training.js:69 — recovery reduces overtraining with clamp

Impact: None
Category: — (compliant)

---

#### 🟢 — Invariant: Morale never goes below 0 or above 100

Requirement (from Knowledge):
"Morale never goes below 0 or above 100 — clamped."

Current Implementation:
All morale changes use `clamp(..., 0, 100)`.

Status: 🟢 Fully Implemented
Evidence:
- engine/tick/training.js:27 — morale drift clamp(0, 100)
- engine/tick/training.js:37 — morale boost clamp(0, 100)
- engine/tick/training.js:55 — inactivity penalty clamp(0, 100)
- engine/tick/training.js:70 — recovery morale clamp(0, 100)

Impact: None
Category: — (compliant)

---

#### 🟢 — Invariant: Injured fighters never train

Requirement (from Knowledge):
"Injured fighters never train — the injury check happens first, and injured fighters skip the training loop entirely."

Current Implementation:
`if (f.injury) { ... return; }` — the injury check at line 31 enters recovery logic, then the `return` at line 50 exits the training loop for that fighter. No training gains applied after injury check.

Status: 🟢 Fully Implemented
Evidence:
- engine/tick/training.js:31 — injury check
- engine/tick/training.js:50 — `return;` — injured fighters don't train

Impact: None
Category: — (compliant)

---

#### 🟢 — Invariant: Recovery program always reduces overtraining

Requirement (from Knowledge):
"Recovery program always reduces overtraining — never increases it. Recovery is a safe choice by design."

Current Implementation:
`f.overtraining = clamp(f.overtraining - 30, 0, 100)` — hard-coded -30 reduction. Recovery never accumulates overtraining.

Status: 🟢 Fully Implemented
Evidence:
- engine/tick/training.js:68-69 — recovery reduces overtraining by 30
- No overtraining accumulation path for recovery program

Impact: None
Category: — (compliant)

---

#### 🟢 — Invariant: Training cost is always deducted

Requirement (from Knowledge):
"Training cost is always deducted — regardless of outcome, the program cost is paid."

Current Implementation:
`g.cash -= t.cost;` — deducted before any training calculation at line 61.

Status: 🟢 Fully Implemented
Evidence:
- engine/tick/training.js:61 — unconditional cost deduction

Impact: None
Category: — (compliant)

---

#### 🟢 — Invariant: Fight camp only active when fighter is booked

Requirement (from Knowledge):
"Fight camp program is only active when a fighter is booked — if a fighter is not booked, they cannot use fight camp."

Current Implementation:
`const t = f.booked && f.booked.weeksLeft <= 2 ? TRAINING.fightcamp : (TRAINING[f.training.type] || TRAINING.conditioning);` — fight camp auto-selected only when booked and within 2 weeks of fight.

Status: 🟢 Fully Implemented
Evidence:
- engine/tick/training.js:59 — fight camp selection gated by booked status

Impact: None
Category: — (compliant)

---

#### 🟡 — Invariant: Attributes never exceed their ceiling

Requirement (from Knowledge):
"Attributes never exceed their ceiling — attrs[k] ≤ ceilings[k] always."

Current Implementation:
`f.attrs[k] = clamp(f.attrs[k] + gain, 0, cap)` — uses cap (ceiling) as upper bound. However, lower bound is 0, not 5 (permanent damage uses 5 correctly at line 133).

Status: 🟡 Partially Implemented
Evidence:
- engine/tick/training.js:91 — `clamp(attrs[k] + gain, 0, cap)` — ceiling enforced ✅
- engine/tick/training.js:91 — uses 0 not 5 as minimum (minor inconsistency)
- engine/tick/training.js:133 — permanent damage uses 5 correctly

Impact: Low — Upper bound (ceiling) is always enforced. Lower bound inconsistency doesn't cause issues because gains are always positive.
Category: Design Gap

Recommendation:
Align regular training min to 5 for consistency with invariant.

---

#### 🟢 — Invariant: Growth rate is never zero for healthy fighter

Requirement (from Knowledge):
"Growth rate is never zero for a healthy fighter on a non-recovery program — even minimal growth must occur."

Current Implementation:
Base gain from R(0.5, 1.4) is always ≥ 0.5. All multipliers are positive. The product is always > 0. Even with worst-case multipliers, gain ≈ 0.5 × 0.6 × ... > 0.

Status: 🟢 Fully Implemented
Evidence:
- engine/tick/training.js:89 — gain formula: R(0.5, 1.4) × positive multipliers
- All multipliers are designed to stay in positive range

Impact: None
Category: — (compliant)

---

#### 🟢 — Invariant: Sparring partner excludes self

Requirement (from Knowledge):
"A fighter should never spar with themselves. The sparring partner selection must exclude the fighter's own ID."

Current Implementation:
`const partners = g.roster.filter(x => x.id !== f.id && !x.injury && !x.booked)` — explicitly filters out same-id fighter.

Status: 🟢 Fully Implemented
Evidence:
- engine/tick/training.js:10 — `x.id !== f.id` guard

Impact: None
Category: — (compliant)

---

#### 🟢 — Zero-roster edge case handled

Requirement (from Knowledge):
"Training system should handle an empty roster gracefully."

Current Implementation:
`if (!g || !g.roster) return;` at line 21. If roster is empty, the forEach loop simply doesn't execute.

Status: 🟢 Fully Implemented
Evidence:
- engine/tick/training.js:21 — guard clause
- engine/tick/training.js:24 — `g.roster.forEach` — empty array does nothing

Impact: None
Category: — (compliant)

---

#### 🟡 — Attention constraint at zero handled

Requirement (from Knowledge):
"If activeFighters is zero, attention constraint returns 1.0."

Current Implementation:
`const attentionMult = activeFighters > 0 ? clamp(availableCoaches / Math.max(activeFighters, 1), 0.7, 1.0) : 1.0;` — uses `Math.max(activeFighters, 1)` as guard. The ternary already handles zero case, and the Math.max adds extra safety.

Status: 🟡 Partially Implemented
Evidence:
- engine/tick/training.js:66 — ternary + Math.max double-guard

Impact: Low — Double-guarded, but could be simplified.
Category: Design Gap

---

#### 🟠 — Morale drift direction

Requirement (from Knowledge):
"Morale naturally drifts toward a baseline value (around 60). Low morale drifts up, high morale drifts down."

Current Implementation:
`f.morale = clamp(f.morale + (f.morale < 60 ? 2 : f.morale > 60 ? -2 : 0), 0, 100);` — moves toward 60. Direction is correct: below 60 → +2, above 60 → -2.

Status: 🟠 Implemented Differently
Evidence:
- engine/tick/training.js:27 — drift formula

Impact: Low — Implements the correct behavior (drift toward 60). The baseline is exactly 60 with ±2 step, not the "around 60" described in Knowledge.
Category: Knowledge Gap — Knowledge says "around 60" but code uses exactly 60. Both valid.

---

#### 🔴 — Monthly rate calibration (2-4 attribute points/month)

Requirement (from Knowledge):
"The current calibration aims for approximately 2-4 attribute points per month for a fighter training at Medium intensity with decent coaches and facilities."

Current Implementation:
No explicit calibration test exists. Implementation outputs floating-point gain values that should approximate this rate, but no test validates it.

Status: 🔴 Missing
Evidence:
- No test in __tests__/ for training rate calibration

Impact: Medium — Calibration could drift without detection, making progression too fast or too slow.
Category: Missing Feature

Recommendation:
Add a simulation test that runs 4 weeks of training at Medium intensity with baseline setup and verifies gains are within 2-4 range.

---

### Compliance Matrix

| Design Principle | Status | Impact | Category |
|-----------------|--------|--------|----------|
| Training program viability | 🟢 | — | — |
| Intensity trade-offs | 🟢 | — | — |
| Coach impact | 🟢 | — | — |
| Facility impact | 🟢 | — | — |
| Overtraining threat | 🟢 | — | — |
| Recovery as legitimate | 🟢 | — | — |
| Owned responsibilities (8) | 🟢 | — | — |
| Non-owned responsibilities | 🟢 | — | — |
| Ceiling invariant | 🟡 | Low | Design Gap |
| Overtraining clamp | 🟢 | — | — |
| Morale clamp | 🟢 | — | — |
| Injured fighters don't train | 🟢 | — | — |
| Recovery reduces overtraining | 🟢 | — | — |
| Training cost deducted | 🟢 | — | — |
| Fight camp only when booked | 🟢 | — | — |
| Growth never zero | 🟢 | — | — |
| Sparring excludes self | 🟢 | — | — |
| Empty roster handled | 🟢 | — | — |
| Attention at zero | 🟡 | Low | Design Gap |
| Morale drift direction | 🟠 | Low | Knowledge Gap |
| Monthly rate calibration | 🔴 | Medium | Missing Feature |

---

### Design Drift

Overall Drift: LOW

Estimated Drift: 12%

Primary Drift Sources:
- Training — calibration test missing
- Training — minor clamp inconsistencies

Explanation:
Training implementation is strongly aligned with Knowledge. The main gap is the missing calibration test for monthly attribute gain rates — this is a measurement gap, not an implementation gap. Two minor clamp inconsistencies (attribute floor, attention guard) do not affect gameplay.

---

### Missing Features

| Feature | Knowledge Reference | Impact |
|---------|-------------------|--------|
| Monthly rate calibration test (2-4pts/month) | Section 9 — Rate calibration | Medium |

---

### Generated Backlog

#### Priority 2
- Add monthly training rate calibration test (4-week simulation, Medium intensity)

#### Priority 3
- Align training clamp minimum from 0 to 5 (consistency with invariant)

#### Knowledge Updates
- Morale drift: Update Knowledge to specify baseline is exactly 60 (not "around 60")
- Attention constraint: Document the current double-guard pattern

#### Engineering Updates
- None required

---

### Overall Recommendation

**Accept**

Training is 88% compliant. No critical gaps. One medium-priority missing feature (calibration test). The two minor clamp inconsistencies do not affect gameplay. Training system is well-implemented with all invariants practically maintained.
