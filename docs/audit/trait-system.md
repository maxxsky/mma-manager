# 🧬 MMA Manager — Trait System Audit

> **Date:** 2026-07-10  
> **Scope:** Every fighter trait — definition, generation, gameplay effects, references, dead code  
> **Method:** Grep entire codebase for each trait, trace every reference through all engine and UI files

---

## 1. TRAIT DEFINITIONS

All 12 traits are defined in `engine/data/traits.js`:

| # | Trait | Description (from data) | Conflict |
|---|-------|------------------------|----------|
| 1 | **Iron Will** | Morale tidak anjlok saat kalah | — |
| 2 | **Glass Jaw** | Chin efektif -10 di fight | Iron Chin |
| 3 | **Iron Chin** | Chin efektif +8 di fight | Glass Jaw |
| 4 | **Natural Talent** | Training speed +15% | — |
| 5 | **Team Player** | Chemistry camp +1/bulan | Diva |
| 6 | **Diva** | Chemistry camp -1/bulan | Team Player |
| 7 | **Crowd Favorite** | Popularity naik 2x | — |
| 8 | **Warrior** | Bonus damage saat tertinggal | — |
| 9 | **Cautious** | Risiko cedera -15%, finish rate turun | Explosive |
| 10 | **Explosive** | R1 kuat, output R3 turun 15% | Cautious |
| 11 | **Grinder** | Gain training konsisten, tanpa plateau | — |
| 12 | **Showboat** | Popularity +5 per finish, defense -5% | — |

---

## 2. TRAIT GENERATION

**File:** `engine/fighter.js` — `genFighter(level)`

Every generated fighter gets exactly 2 traits (lines 25-37):
```js
const traits = [];
while (traits.length < 2 && attempts < 100) {
    const t = pick(TRAIT_KEYS);
    if (!traits.includes(t)) {
        const conflicts = TRAIT_CONFLICTS[t];
        if (!conflicts || !traits.some((existing) => conflicts.includes(existing))) {
            traits.push(t);
        }
    }
    attempts++;
}
```

**Conflict resolution:** Mutually exclusive pairs (`Glass Jaw ↔ Iron Chin`, `Cautious ↔ Explosive`, `Diva ↔ Team Player`) can never appear on the same fighter. The generation loop re-rolls until 2 non-conflicting traits are found.

**Scouting:** `makeReport(f, grade)` in `fighter.js:158` reveals traits based on scout grade:
- Grade S: all traits revealed
- Grade A: only first trait revealed
- Grade B and below: traits hidden

---

## 3. PER-TRAIT DEEP AUDIT

### 3.1 Iron Will — `"Morale tidak anjlok saat kalah"`

| System | File:Line | Effect |
|--------|-----------|--------|
| Definition | `data/traits.js:2` | Description text only |
| i18n | `i18n/index.js:36,184` | EN/ID labels |
| **Verdict** | ❌ **FLAVOR ONLY** — Zero gameplay references outside definition and i18n. No code checks for Iron Will anywhere in fight results, morale calculations, or event handlers. |

---

### 3.2 Glass Jaw — `"Chin efektif -10 di fight"`

| System | File:Line | Effect |
|--------|-----------|--------|
| Definition | `data/traits.js:3` | — |
| Conflict | `data/traits.js:17` | Mutually exclusive with Iron Chin |
| **Combat** | `fight.js:21` | `effAttr()`: `if (f.traits?.includes("Glass Jaw")) v -= 10` — chin attribute reduced by 10 during fight |
| Commentary | `fight/commentary.js:61` | `dmgB > 25` → "wobbles — that glass jaw!" |
| i18n | `i18n/index.js:37,185` | EN/ID labels |
| **Verdict** | ✅ **DEEPLY INTEGRATED** — Direct combat impact via chin reduction. Affects knockdown threshold calculation. |

---

### 3.3 Iron Chin — `"Chin efektif +8 di fight"`

| System | File:Line | Effect |
|--------|-----------|--------|
| Definition | `data/traits.js:4` | — |
| Conflict | `data/traits.js:17` | Mutually exclusive with Glass Jaw |
| **Combat** | `fight.js:20` | `effAttr()`: `if (f.traits?.includes("Iron Chin")) v += 8` — chin attribute increased by 8 during fight |
| Commentary | `fight/commentary.js:60` | `dmgA > 20` → "iron chin holding up" |
| i18n | `i18n/index.js:38,186` | EN/ID labels |
| **Verdict** | ✅ **DEEPLY INTEGRATED** — Direct combat impact via chin boost. Reduces knockdown probability. |

---

### 3.4 Natural Talent — `"Training speed +15%"`

| System | File:Line | Effect |
|--------|-----------|--------|
| Definition | `data/traits.js:5` | — |
| **Training** | `state.js:111` | `traitMult = f.traits.includes("Natural Talent") ? 1.15 : 1` — 15% boost to all training gains |
| **Training** | `state.js:133` | `traitMult` multiplied into final gain calculation alongside coach bonuses, facility bonuses, age multiplier, etc. |
| i18n | `i18n/index.js:39,187` | EN/ID labels |
| **Verdict** | ✅ **DEEPLY INTEGRATED** — Systematic training acceleration. Compounds with other multipliers. |

---

### 3.5 Team Player — `"Chemistry camp +1/bulan"`

| System | File:Line | Effect |
|--------|-----------|--------|
| Definition | `data/traits.js:6` | — |
| Conflict | `data/traits.js:19` | Mutually exclusive with Diva |
| **Camp chemistry** | `state.js:591` | `g.roster.filter((f) => f.traits.includes("Team Player")).length` — each Team Player contributes +1 to monthly chemistry change |
| i18n | `i18n/index.js:40,188` | EN/ID labels |
| **Verdict** | ✅ **DEEPLY INTEGRATED** — Direct monthly chemistry calculation. Stacks per fighter. |

---

### 3.6 Diva — `"Chemistry camp -1/bulan"`

| System | File:Line | Effect |
|--------|-----------|--------|
| Definition | `data/traits.js:7` | — |
| Conflict | `data/traits.js:19` | Mutually exclusive with Team Player |
| **Camp chemistry** | `state.js:592` | `g.roster.filter((f) => f.traits.includes("Diva")).length` — each Diva contributes -1 to monthly chemistry change |
| **Contract renegotiation** | `state.js:764` | `f.traits.includes("Diva")` — Divas demand contract renegotiation even when NOT in top 10. Non-Divas only renegotiate when top-10 ranked. |
| **Renegotiation trigger** | `state.js:767` | Log message: `why = "trait Diva"` when triggered by trait vs ranking |
| i18n | `i18n/index.js:41,189` | EN/ID labels |
| **Verdict** | ✅ **DEEPLY INTEGRATED** — Affects chemistry AND triggers early contract renegotiation. |

---

### 3.7 Crowd Favorite — `"Popularity naik 2x"`

| System | File:Line | Effect |
|--------|-----------|--------|
| Definition | `data/traits.js:8` | Description text only |
| i18n | `i18n/index.js:42,190` | EN/ID labels |
| **Fight result (CURRENT)** | `FightNight.jsx:165` | `f.popularity = clamp(f.popularity + 7, 0, 100)` — **HARDCODED +7, no trait check** |
| **Fight result (OLD — removed)** | Git history | Old FightNight had `popMult = (f.traits.includes("Crowd Favorite") ? 2 : 1)` — removed during Ironfist redesign rewrite |
| **Verdict** | ❌ **BROKEN / DEAD** — The 2x popularity multiplier was implemented in the old FightNight but was lost during the redesign rewrite. The trait currently has ZERO gameplay effect. |

---

### 3.8 Warrior — `"Bonus damage saat tertinggal"`

| System | File:Line | Effect |
|--------|-----------|--------|
| Definition | `data/traits.js:9` | Description text only |
| Commentary | `fight/commentary.js:64` | `dmgA > 40` → "keeps firing despite taking damage — true warrior spirit!" |
| i18n | `i18n/index.js:43,191` | EN/ID labels |
| **Combat** | — | **NEVER CHECKED** in `fight.js` combat math. No damage bonus when behind on scorecards. |
| **Verdict** | ❌ **COMMENTARY ONLY** — The "bonus damage" effect is never implemented. Only a flavor line when taking heavy damage. |

---

### 3.9 Cautious — `"Risiko cedera -15%, finish rate turun"`

| System | File:Line | Effect |
|--------|-----------|--------|
| Definition | `data/traits.js:10` | — |
| Conflict | `data/traits.js:18` | Mutually exclusive with Explosive |
| **Injury system** | `state.js:153` | `if (f.traits.includes("Cautious")) injP *= 0.85` — 15% injury risk reduction during training |
| **Finish rate** | `fight.js` | **NEVER CHECKED** — The "finish rate turun" effect is not implemented. Cautious fighters have the same KO/submission probability as others. |
| i18n | `i18n/index.js:44,192` | EN/ID labels |
| **Verdict** | ⚠️ **PARTIALLY IMPLEMENTED** — Injury reduction works. Combat finish rate penalty is missing. |

---

### 3.10 Explosive — `"R1 kuat, output R3 turun 15%"`

| System | File:Line | Effect |
|--------|-----------|--------|
| Definition | `data/traits.js:11` | — |
| Conflict | `data/traits.js:18` | Mutually exclusive with Cautious |
| Commentary | `fight/commentary.js:59` | `rnd === 1` → "explosive style on display early" |
| **Combat R1 boost** | `fight.js` | **NEVER CHECKED** — No round-1 damage/aggression boost in combat math |
| **Combat R3 penalty** | `fight.js` | **NEVER CHECKED** — No round-3 output reduction in combat math |
| i18n | `i18n/index.js:45,193` | EN/ID labels |
| **Verdict** | ❌ **COMMENTARY ONLY** — Both R1 boost and R3 penalty are unimplemented. Only a flavor line in round 1. |

---

### 3.11 Grinder (trait) — `"Gain training konsisten, tanpa plateau"`

| System | File:Line | Effect |
|--------|-----------|--------|
| Definition | `data/traits.js:12` | — |
| **Training ceiling** | `state.js:125` | `capMult = f.traits.includes("Grinder") ? 0.9 : prog < 0.7 ? 1 : prog < 0.9 ? 0.6 : 0.3` — Grinders have a flat 0.9 multiplier, never dropping to 0.6 or 0.3 as they approach ceiling |
| Commentary | `fight/commentary.js:62` | `rnd >= 3` → "grinding pressure wearing opponent down" |
| Fighter bio | `fighter.js:86` | Bio text: "Mental pekerja keras — gak kenal lelah" |
| i18n | `i18n/index.js:46,194` | EN/ID labels |
| **Verdict** | ✅ **DEEPLY INTEGRATED** — Systematic training benefit via ceiling cap. Also has bio and commentary flavor. |

**Note:** Grinder also exists as an **ambition** (`data/traits.js:27`: "Overtraining menumpuk 25% lebih lambat"). The ambition effect is implemented at `state.js:147`: `f.ambition === "Grinder" ? 0.75 : 1`. These are separate mechanics — one fighter could have the trait, the ambition, both, or neither.

---

### 3.12 Showboat — `"Popularity +5 per finish, defense -5%"`

| System | File:Line | Effect |
|--------|-----------|--------|
| Definition | `data/traits.js:13` | — |
| Commentary | `fight/commentary.js:63` | `landA > 20` → "showboating — crowd loves it!" |
| **Popularity +5 per finish** | `FightNight.jsx` | **NOT IMPLEMENTED** — No check for Showboat in fight result processing |
| **Defense -5%** | `fight.js` | **NOT IMPLEMENTED** — No defense penalty in combat math |
| i18n | `i18n/index.js:47,195` | EN/ID labels |
| **Verdict** | ❌ **COMMENTARY ONLY** — Both effects (popularity on finish, defense penalty) are unimplemented. Commentary line is the only active reference. |

---

## 4. TRAIT COVERAGE MATRIX

| Trait | Combat | Training | Recovery | Chemistry | Contract | Injury | Popularity | Commentary | Bio | **Real Impact** |
|-------|--------|----------|----------|-----------|----------|--------|------------|------------|-----|-----------------|
| Iron Will | — | — | — | — | — | — | — | — | — | ❌ None |
| Glass Jaw | ✅ -10 chin | — | — | — | — | — | — | ✅ | — | ✅ Combat |
| Iron Chin | ✅ +8 chin | — | — | — | — | — | — | ✅ | — | ✅ Combat |
| Natural Talent | — | ✅ +15% | — | — | — | — | — | — | — | ✅ Training |
| Team Player | — | — | — | ✅ +1/mo | — | — | — | — | — | ✅ Chemistry |
| Diva | — | — | — | ✅ -1/mo | ✅ renego | — | — | — | — | ✅ Chemistry + Contract |
| Crowd Favorite | — | — | — | — | — | — | ❌ Broken | — | — | ❌ Dead |
| Warrior | — | — | — | — | — | — | — | ✅ | — | ❌ Flavor only |
| Cautious | — | — | — | — | — | ✅ -15% | — | — | — | ⚠️ Partial |
| Explosive | — | — | — | — | — | — | — | ✅ | — | ❌ Flavor only |
| Grinder | — | ✅ ceiling | — | — | — | — | — | ✅ | ✅ | ✅ Training |
| Showboat | — | — | — | — | — | — | ❌ Broken | ✅ | — | ❌ Dead |

---

## 5. CLASSIFICATION

### 5.1 Deeply Integrated (real gameplay impact in multiple systems)

| Trait | Systems | Files |
|-------|---------|-------|
| **Diva** | Chemistry (-1/mo) + Contract renegotiation (always triggers) | `state.js:592,764` |
| **Grinder** | Training ceiling (flat 0.9 cap) + Commentary + Bio | `state.js:125`, `fighter.js:86` |
| **Glass Jaw** | Combat (chin -10) + Commentary | `fight.js:21` |
| **Iron Chin** | Combat (chin +8) + Commentary | `fight.js:20` |
| **Natural Talent** | Training (all gains ×1.15) | `state.js:111,133` |
| **Team Player** | Chemistry (+1/mo per fighter) | `state.js:591` |

### 5.2 Partially Implemented (one effect works, another is missing)

| Trait | Works | Missing |
|-------|-------|---------|
| **Cautious** | Injury risk -15% (`state.js:153`) | Finish rate penalty (not in `fight.js`) |

### 5.3 Broken / Dead Code (description promises effects that don't exist)

| Trait | Promised Effect | Status |
|-------|----------------|--------|
| **Crowd Favorite** | "Popularity naik 2x" | ❌ Removed during FightNight redesign. `f.popularity + 7` hardcoded, no trait check. |
| **Showboat** | "Popularity +5 per finish, defense -5%" | ❌ Neither effect implemented. Popularity gain was in old FightNight (now removed). Defense penalty never existed. |
| **Iron Will** | "Morale tidak anjlok saat kalah" | ❌ Never implemented. No code checks this trait anywhere. |

### 5.4 Commentary Only (flavor text, zero gameplay effect)

| Trait | Commentary Location | Missing Effects |
|-------|--------------------|-----------------|
| **Warrior** | `fight/commentary.js:64` — "keeps firing despite taking damage" | "Bonus damage saat tertinggal" — never checked in combat math |
| **Explosive** | `fight/commentary.js:59` — "explosive style on display early" | "R1 kuat, output R3 turun 15%" — neither round-1 boost nor round-3 penalty exists |
| **Showboat** | `fight/commentary.js:63` — "showboating — crowd loves it!" | All described mechanical effects are dead |

---

## 6. DETAILED DEAD CODE ANALYSIS

### 6.1 Crowd Favorite — Popularity Multiplier (LOST IN REFACTOR)

**Old FightNight (pre-redesign):**
```js
const popMult = (f.traits.includes("Crowd Favorite") ? 2 : 1) * (f.ambition === "Star Power" ? 1.5 : 1);
f.popularity = clamp(f.popularity + (result.how === "Decision" ? 3 : 7) * popMult, 0, 100);
```

**Current FightNight:**
```js
f.popularity = clamp(f.popularity + 7, 0, 100);
```

The 2× multiplier was lost during the Ironfist redesign rewrite of FightNight. The `popMult` variable and its trait/ambition checks were not carried over.

### 6.2 Showboat — Popularity on Finish (LOST IN REFACTOR)

The old FightNight likely had popularity bonus on finish wins, but this was also removed. No evidence of it exists in any current file.

### 6.3 Showboat — Defense Penalty

The description says "defense -5%" but no code ever implemented this. A grep for `Showboat` in all engine files returns only the commentary reference and the data definition. No combat math references exist.

### 6.4 Warrior — Damage Bonus When Behind

Never implemented. The trait description says "Bonus damage saat tertinggal" but there is no code in `fight.js` that checks score differential and applies a damage multiplier for Warriors.

### 6.5 Explosive — Round-Based Output Modulation

The description promises round-1 boost and round-3 penalty. Neither exists in the combat math. The `rnd` parameter is passed to `simRound` but never checked against the Explosive trait.

### 6.6 Iron Will — Morale Protection on Loss

The description says "Morale tidak anjlok saat kalah" but no code anywhere checks for Iron Will during fight result processing. The morale penalty on loss is a flat `-14` regardless of traits.

---

## 7. SUMMARY

| Category | Count | Traits |
|----------|-------|--------|
| ✅ Deeply Integrated | 6 | Diva, Grinder, Glass Jaw, Iron Chin, Natural Talent, Team Player |
| ⚠️ Partially Implemented | 1 | Cautious |
| ❌ Dead / Broken | 3 | Crowd Favorite, Showboat, Iron Will |
| 💬 Commentary Only | 2 | Warrior, Explosive (also Showboat, overlapping) |
| **Total traits** | **12** | |

**Key findings:**
- **3 traits are dead** — Crowd Favorite and Showboat lost their mechanics during the FightNight redesign rewrite. Iron Will was never implemented.
- **2 traits are commentary-only** — Warrior and Explosive have flavor text but no combat math.
- **1 trait is partial** — Cautious has injury reduction but lacks the promised finish rate penalty.
- **6 traits work correctly** — Diva is the most integrated (chemistry + contract), Grinder has the most coverage (training + bio + commentary).
- The **trait-vs-ambition namespace collision** for "Grinder" is confusing — same name, different mechanics, different systems.

**Recovery recommendations (if desired):**
1. **Crowd Favorite**: Restore `popMult` in `FightNight.jsx` `commitResult()`
2. **Showboat**: Add `f.popularity += 5` on finish wins + `effAttr` defense reduction in `fight.js`
3. **Iron Will**: Add `f.morale = clamp(f.morale - 4, 0, 100)` instead of `-14` on loss
4. **Warrior**: Add damage bonus when behind on scorecards in `fight.js`
5. **Explosive**: Add round-1 aggression boost + round-3 output penalty in `fight.js`
6. **Cautious**: Reduce finish probability by 15% in combat math
