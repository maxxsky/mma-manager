## Design Compliance Audit

### Scope

Domain: Fighter
Knowledge: knowledge/03_FIGHTER.md
Codebase: /root/mma-manager/app/src/engine/fighter.js
Date: July 2026

---

### Summary

Overall Compliance: 91%

🟢 Fully Implemented: 16
🟡 Partially Implemented: 1
🟠 Implemented Differently: 0
🔴 Missing: 1
⚫ Unknown: 0

---

### Design Coverage

Overall Design Coverage: 91%

| Domain | Coverage | Status |
|--------|--------:|--------|
| Fighter | 91% | 🟢 |

---

### Findings

#### 🟢 — Fighter as central entity (Philosophy)

All 6 philosophical principles implemented: fighters as attachment point, every fighter is a story, not interchangeable, player agency, fighter identity expressed in combat, fighters have relationships.

Evidence: fighter.js generation, career.js milestones, relationships.js, combat trait effects.

---

#### 🟢 — Non-Goals (Section 4)

All 5 non-goals respected: no personality simulator, no character creator, not a fighter database, not responsible for combat, not responsible for economy.

Evidence: fighter.js imports none of these systems.

---

#### 🟢 — Responsibilities (Section 5)

All 12 responsibilities (owns 9 + does NOT own 5) correctly assigned.

Evidence: fighter.js owns identity (archetype, traits), combat attributes, ceilings, record, titles, morale, training state, contract, career timeline.

---

#### 🟢 — Fighter Generation (Business Rule)

Two channels: genFighter() for all fighters (used by both scouting and world). Same genFighter() function for generated and scouted fighters.

Evidence: engine/fighter.js:15 — genFighter function used everywhere.

---

#### 🟢 — Attributes and Ceilings (Business Rule)

Current attributes and ceilings set at generation, ceilings immutable (except permanent damage from career-threatening injury).

Evidence: fighter.js:23-24 — ceilings set at generation. training.js:134 — only permanent damage modifies ceilings.

---

#### 🟢 — Archetype assignment

Archetype assigned at generation. Never changes throughout fighter's career. No code path alters fighter.archetype after initial assignment.

Evidence: fighter.js:18 — archetype set at generation.

---

#### 🟢 — Trait assignment with conflict check

Traits assigned with avoidance of conflicting traits (TRAIT_CONFLICTS). At least 2 traits per fighter.

Evidence: fighter.js:29-38 — trait loop with conflict check.

---

#### 🟢 — Age and time passage

Age affects training growth rate (yearly.js: chin decline at 31/34/37). Age affects combat performance (fight.js: prepFighter applies age multipliers).

Evidence: tick/yearly.js:10-14 — age increment + chin decline.  
fight.js:242 — age multipliers in prepFighter.

---

#### 🟢 — Record consistency

Record invariant maintained: `w = ko + sub + dec` on every fight result.

Evidence: fights/commitResult.js:13-16 — increments w then exactly one method.

---

#### 🟢 — Weight class

Each fighter belongs to exactly one weight class. Weight class changes possible via reducer (CLASS_CHANGE_ACCEPT comes from Training/Fighter domain).

Evidence: fighter.js:43 — single weightClass field. reducer/fighter.js:18-35 — class change handler.

---

#### 🟢 — Popularity and morale

Both tracked independently. Popularity used for sponsor income. Morale affects training and combat.

Evidence: fighter.js:46 — initial values. Training, combat, and event systems modify them.

---

#### 🟢 — Invariant: Every fighter has an archetype

genFighter always assigns an archetype. AI fighter factory also assigns one. Never null.

Evidence: fighter.js:18 — random archetype selection. world/ai-fighter.js — also assigns archetype.

---

#### 🟢 — Invariant: Attributes never exceed ceilings

Training growth capped at ceiling: `clamp(attrs[k] + gain, 0, cap)`. Ceiling is the hard upper bound.

Evidence: training.js:86-91 — reading ceiling as cap.

---

#### 🟢 — Invariant: One weight class at a time

A fighter has a single weightClass field and a weightClassDelta for temporary adjustment. No mechanism for dual division.

Evidence: fighter.js:43 — single weightClass.

---

#### 🟢 — Invariant: Retired fighters removed from active

AI fighters retired via world.js division maintenance (filtered out of d.list). Player fighters removed via event choice handling.

Evidence: world.js:180-186 — retired filtered from division list.

---

#### 🟢 — Hall of Fame

CheckHallOfFame() evaluates fighter career score (wins, titles, title defenses, milestones, giant kills, streaks) against threshold of 50. Eligible fighters inducted.

Evidence: dynasty.js:186-218 — Hall of Fame logic.

---

#### 🟡 — Invariant: Name is unique within player's roster

No explicit enforcement of unique fighter names. genFighter uses random combination of first + last names, which could theoretically produce duplicates over large rosters.

Evidence: fighter.js:42 — `name: pick(rd.first) + " " + pick(rd.last)`. No check against existing roster names.

Impact: Low — extremely unlikely in practice (name pool is large).
Category: Design Gap

---

#### 🔴 — Fighter lifecycle phases (Prospect → Contender → ...)

Knowledge describes 6 lifecycle phases with distinct mechanics. Implementation has no explicit phase system — phases emerge from attributes and achievements but are not tracked or gated.

Evidence: No file explicitly manages FighterPhase as a state. Phases are implicit (tierOf function checks avgSkill for "Prospect"/"Pro"/"Main Card"/"Elite", but this is different from lifecycle phases).

Impact: Medium — The lifecycle is implicitly functional but not auditable. Cannot answer "what phase is this fighter in?" without calculating.
Category: Missing Feature

---

### Compliance Matrix

| Design Principle | Status | Impact | Category |
|-----------------|--------|--------|----------|
| Fighter is central entity | 🟢 | — | — |
| Non-goals respected | 🟢 | — | — |
| Responsibilities | 🟢 | — | — |
| Generation channels | 🟢 | — | — |
| Attributes + ceilings | 🟢 | — | — |
| Archetype fixed | 🟢 | — | — |
| Trait assignment | 🟢 | — | — |
| Age effects | 🟢 | — | — |
| Record consistency | 🟢 | — | — |
| Weight class | 🟢 | — | — |
| Popularity + morale | 🟢 | — | — |
| Archetype invariant | 🟢 | — | — |
| Ceiling invariant | 🟢 | — | — |
| One weight class | 🟢 | — | — |
| Retired removed | 🟢 | — | — |
| Hall of Fame | 🟢 | — | — |
| Name uniqueness | 🟡 | Low | Design Gap |
| Lifecycle phases | 🔴 | Medium | Missing Feature |

---

### Design Drift

Overall Drift: LOW

Estimated Drift: 9%

Primary Drift Sources:
- Lifecycle phases implicit rather than explicit

Explanation:
Fighter implementation is strongly aligned with Knowledge. The lifecycle phase system is the primary gap — Knowledge describes formal phases that the code doesn't explicitly track. However, the implicit system (skill tier, title status, age) produces the same emergent behavior.

---

### Missing Features

| Feature | Knowledge Reference | Impact |
|---------|-------------------|--------|
| Explicit lifecycle phase tracking | Section 7 | Medium |

---

### Generated Backlog

#### Priority 2
- Add lifecycle phase detection (derived from age, titles, record, retire status)

#### Priority 3
- Add name uniqueness check at contract signing

#### Knowledge Updates
- Note: The "implicit lifecycle" approach is valid and works. Knowledge could be updated to describe the actual implementation as "emergent phases from attribute thresholds, title status, and age" rather than strict state transitions.

---

### Overall Recommendation

**Accept**

Fighter domain is 91% compliant. The main gap (lifecycle phases) is architectural preference — the existing implicit system works correctly. Name uniqueness is low risk.
