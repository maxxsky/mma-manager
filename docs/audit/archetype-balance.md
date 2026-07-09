# 🥊 MMA Manager — Archetype Balance Audit

> **Date:** 2026-07-10  
> **Scope:** All 5 archetypes — identity, matchups, training, game plans, traits, career, balance  
> **Method:** Traced archetype multipliers, matchup table, combat math, training interactions

---

## 1. ARCHETYPE IDENTITY

### 1.1 Boxer

| Attribute | Multiplier | Effective Base (at 50) |
|-----------|-----------|------------------------|
| Striking | 1.22 | 61 |
| Footwork | 1.18 | 59 |
| Wrestling | 1.05 | 52.5 |
| BJJ | 0.80 | 40 |

**Signature attributes:** Striking (61), Footwork (59)  
**Core weaknesses:** BJJ (40) — vulnerable on the ground  
**Intended playstyle:** Stand-up striker. Keep distance. Win by KO or decision. Avoid takedowns.  
**Signature win condition:** KO/TKO via striking volume and power shots.  
**Natural counters:** Wrestler (takedown → top control → avoids striking). BJJ Specialist (pulls guard → submits).  

### 1.2 Muay Thai

| Attribute | Multiplier | Effective Base (at 50) |
|-----------|-----------|------------------------|
| Striking | 1.08 | 54 |
| BJJ | 0.80 | 40 |
| Wrestling | 0.95 | 47.5 |
| Footwork | 1.00 | 50 |
| Clinch | 1.15 | — |
| Cardio | 0.90 | 45 |

**Signature attributes:** Striking (54), Clinch (1.15× damage)  
**Core weaknesses:** BJJ (40), Cardio (45) — fades late, vulnerable to submissions  
**Intended playstyle:** Clinch fighter. Knees and elbows. High damage output, but gasses.  
**Signature win condition:** KO/TKO from clinch damage accumulation.  
**Natural counters:** Wrestler (takedown before clinch). BJJ Specialist (pulls guard from clinch).  

### 1.3 Wrestler

| Attribute | Multiplier | Effective Base (at 50) |
|-----------|-----------|------------------------|
| Wrestling | 1.18 | 59 |
| Strength | 1.00 | 50 |
| Striking | 0.75 | 37.5 |
| BJJ | 0.90 | 45 |
| Footwork | 0.80 | 40 |
| Cardio | 0.97 | 48.5 |

**Signature attributes:** Wrestling (59), Strength (50)  
**Core weaknesses:** Striking (37.5), Footwork (40) — can't strike, can't evade  
**Intended playstyle:** Takedown → top control → ground and pound or submission.  
**Signature win condition:** Decision via control time or TKO via GNP.  
**Natural counters:** BJJ Specialist (submission from bottom). Boxer (striking before takedown lands).  

### 1.4 BJJ Specialist

| Attribute | Multiplier | Effective Base (at 50) |
|-----------|-----------|------------------------|
| BJJ | 1.15 | 57.5 |
| Wrestling | 1.05 | 52.5 |
| Striking | 0.70 | 35 |
| Footwork | 0.80 | 40 |
| FightIQ | 1.05 | 52.5 |

**Signature attributes:** BJJ (57.5), FightIQ (52.5)  
**Core weaknesses:** Striking (35), Footwork (40) — terrible stand-up  
**Intended playstyle:** Pull guard or get taken down → sweep → submit. Threat from any ground position.  
**Signature win condition:** Submission from guard, mount, or back mount.  
**Natural counters:** Wrestler with good top control. Boxer who keeps it standing.  

### 1.5 All-Rounder

| Attribute | Multiplier | Effective Base (at 50) |
|-----------|-----------|------------------------|
| FightIQ | 1.10 | 55 |
| Striking | 1.00 | 50 |
| Wrestling | 1.00 | 50 |
| BJJ | 1.00 | 50 |

**Signature attributes:** FightIQ (55), all others balanced at 50  
**Core weaknesses:** No extreme strengths. No single stat above 55.  
**Intended playstyle:** Adaptable. Switch strategies based on opponent. No hard counters. No hard advantages.  
**Signature win condition:** Variable — adapts to opponent's weakness.  
**Natural counters:** None. But also counters no one.  

---

## 2. MATCHUP MATRIX

### 2.1 Advantage Table

Numbers represent the archetype matchup bonus modifier applied in combat.

| A \ B | Boxer | Muay Thai | Wrestler | BJJ Spec | All-Rounder |
|-------|-------|-----------|----------|----------|-------------|
| **Boxer** | -5% strike | -5% strike, +15% clinch (B) | +10% strike, -8% TD def | +10% strike, +5% TD def | +8% strike (A) / +5% strike (B vs A) |
| **Muay Thai** | +5% strike (B), +15% clinch (A) | — | +15% clinch, +5% TD def | +10% clinch, -10% TD def | +5% clinch (B) / +4% TD def (A vs B) |
| **Wrestler** | +20% TD, +10% GNP, +10% TD def | +5% TD, +10% GNP | — | +10% TD, +12% sub risk (from BJJ) | +1% TD def (A vs B) |
| **BJJ Specialist** | +5% sub, -5% TD | +6% sub, +10% sweep | +10% sub, +15% sweep | — | +12% sweep (A) / +5% sub (B vs A) |
| **All-Rounder** | +5% strike (A) | +4% TD def (A) | +1% TD def (A) | +5% sub (B) / +12% sweep (A) | — |

### 2.2 Matchup Analysis

| Matchup | Expected Winner | Why | Fair? |
|---------|----------------|-----|-------|
| Boxer vs Wrestler | Wrestler (60/40) | +20% TD overwhelms Boxer's +10% strike | Yes — classic striker vs grappler |
| Boxer vs BJJ | Slight Boxer (55/45) | +10% strike, +5% TD def. BJJ's sub bonus is conditional on ground | Yes |
| Boxer vs All-Rounder | Even (50/50) | Mutual strike bonuses cancel | Yes |
| Muay Thai vs Wrestler | Slight Wrestler (55/45) | +15% clinch helps MT, but Wrestler's TD bonus is bigger | Yes |
| Muay Thai vs BJJ | BJJ (60/40) | MT's -10% TD def is devastating vs BJJ's takedown threat | Yes — MT is BJJ's easiest matchup |
| Wrestler vs BJJ | BJJ (58/42) | +12% sub risk for Wrestler + BJJ's +10% sub + +15% sweep | Yes — BJJ hard counters Wrestler |
| Wrestler vs All-Rounder | Slight Wrestler (53/47) | Minimal matchup bonuses | Yes |
| All-Rounder vs Boxer | Even | Mutual strike bonuses | Yes |
| All-Rounder vs BJJ | Even | BJJ gets small sub/sweep bonuses | Yes |

**Matchup fairness: GOOD.** No matchup is a guaranteed win. The largest advantage is ~60/40. The rock-paper-scissors dynamic works: Boxer > BJJ > Wrestler > Boxer, with Muay Thai and All-Rounder as wildcards.

### 2.3 Predictability

Matchups are **somewhat predictable** but not deterministic. The RNG in the fight engine (±30% variance on damage, ±12% on takedown probability) means underdogs win ~25-35% of the time in unfavorable matchups.

---

## 3. TRAINING INTERACTION

### 3.1 Preferred Training Paths

| Archetype | Natural Path | Optimal Path | Diverge? |
|-----------|-------------|-------------|----------|
| Boxer | Striking + Footwork | Sparring (covers striking + wrestling too) | YES — natural path is suboptimal |
| Muay Thai | Striking + Clinch | Sparring | YES — can't train clinch directly |
| Wrestler | Grappling | Sparring | PARTIAL — sparring covers wrestling |
| BJJ Specialist | Grappling | Sparring | PARTIAL |
| All-Rounder | Sparring | Sparring | NO — natural path IS optimal |

### 3.2 Do Archetypes Develop Differently?

**No.** The training system's optimal strategy (Sparring at Medium/Hard for everyone) produces nearly identical stat distributions regardless of archetype. After 40 weeks of training:

- A Boxer with 40 hours of Sparring training has 75 striking, 65 wrestling, 60 BJJ
- A Wrestler with 40 hours of Sparring training has 55 striking, 80 wrestling, 65 BJJ

The starting multipliers create initial differences, but the training system pushes everyone toward the middle. The Boxer's wrestling improves (unwanted). The Wrestler's striking improves (unwanted). **Training erodes archetype identity.**

### 3.3 Ceiling Interaction

Ceilings are the only thing that preserves archetype identity in the long run. A Boxer with a +25 ceiling on striking will always be a better striker than a Wrestler with a +8 ceiling on striking. But the training system doesn't respect this — it trains everyone the same way.

### 3.4 Convergence

**After 100+ weeks of training, all fighters converge toward similar stat profiles** with mild differences driven by starting multipliers and ceiling rolls. The archetype identity is strongest at generation and weakest at retirement.

---

## 4. GAME PLAN INTERACTION

### 4.1 Optimal Game Plans Per Archetype

| Archetype | Take It Down | Keep Standing | Finish It | Survive & Outpoint |
|-----------|-------------|--------------|-----------|-------------------|
| **Boxer** | ❌ Poor | ✅ **Optimal** | ⚠️ Risky (low BJJ) | ✅ Viable |
| **Muay Thai** | ❌ Poor | ✅ Optimal | ⚠️ Risky (low cardio) | ❌ Poor (low cardio) |
| **Wrestler** | ✅ **Optimal** | ❌ Poor (low striking) | ✅ Viable (GNP) | ✅ Viable |
| **BJJ Specialist** | ✅ Viable | ❌ Poor | ✅ **Optimal** (sub threat) | ✅ Viable |
| **All-Rounder** | ✅ Viable | ✅ Viable | ✅ Viable | ✅ Viable |

### 4.2 Strategic Diversity

**Exists but is limited.** Each archetype has 1-2 optimal game plans. The player rarely deviates from the optimal plan because the penalties for wrong plans are significant:

- Wrestler with "Keep It Standing": -18% takedown chance, forced to strike with their worst stat
- Boxer with "Take It Down": +18% takedown chance, but Boxers have the worst wrestling
- BJJ with "Finish It": +50% KO chance, but BJJ has the worst striking

**The game plan system reinforces archetype identity** — much more than the training system does.

---

## 5. TRAIT SYNERGY

### 5.1 Strong Combinations

| Archetype + Trait | Why It's Strong |
|-------------------|----------------|
| Boxer + Iron Chin | Already durable stand-up, chin makes them nearly un-KO-able |
| Boxer + Explosive | Early round KO potential with high striking |
| Wrestler + Grinder | Never slows near ceiling — maximizes wrestling development |
| Wrestler + Iron Will | Losing a takedown war? Morale stays high for comeback |
| BJJ + Natural Talent | Accelerates BJJ development toward submission threshold |
| BJJ + Cautious | Injury reduction — BJJ relies on technical skill, not power |
| Muay Thai + Warrior | Bonus damage when losing — clinch comebacks |
| All-Rounder + Natural Talent | Fastest development across all stats |

### 5.2 Weak Combinations

| Archetype + Trait | Why It's Weak |
|-------------------|---------------|
| Boxer + Diva | Chemistry penalty hurts camp, Boxer needs team support |
| Wrestler + Glass Jaw | Already vulnerable to strikers, chin penalty amplifies this |
| BJJ + Showboat | Defense penalty — BJJ already has weak striking defense |
| Muay Thai + Cautious | Finish rate reduction — Muay Thai's strength is finishing |

### 5.3 Disproportionate Benefits

| Trait | Disproportionately Benefits | Why |
|-------|---------------------------|-----|
| Explosive | Boxer, Muay Thai | Early round KO potential amplifies striking advantage |
| Warrior | Wrestler, Muay Thai | Comeback damage in grappling/clinch exchanges |
| Iron Chin | Boxer, All-Rounder | Stand-up fighters take more head damage |
| Natural Talent | All-Rounder, BJJ | Training across broad stat distributions |

### 5.4 Traits That Fail to Differentiate

| Trait | Why |
|-------|-----|
| Team Player | Same chemistry effect regardless of archetype |
| Crowd Favorite | Popularity is archetype-independent |
| Diva | Same contract effect for all archetypes |

---

## 6. CAREER PROGRESSION

### 6.1 Early-Game Performance (Weeks 1-30)

| Archetype | Starting Strength | Early Viability | Notes |
|-----------|-----------------|----------------|-------|
| Boxer | Strong | ✅ High | Striking advantage wins early fights |
| Muay Thai | Moderate | ✅ Medium | Clinch damage but cardio fades |
| Wrestler | Strong | ✅ High | Takedown advantage dominates inexperienced AI |
| BJJ Specialist | Weak | ⚠️ Low | Submission game needs development time |
| All-Rounder | Moderate | ✅ Medium | No weaknesses, no strengths |

### 6.2 Prime Years (Weeks 30-80)

| Archetype | Peak Performance | Title Viability |
|-----------|-----------------|----------------|
| Boxer | High | ✅ All titles |
| Muay Thai | High (early rounds) | ✅ Major/Premier (if finishes come) |
| Wrestler | Very High | ✅ All titles |
| BJJ Specialist | High (if submissions land) | ✅ All titles |
| All-Rounder | High | ✅ All titles |

### 6.3 Late Career (Weeks 80+)

| Archetype | Decline Impact | Late Viability |
|-----------|---------------|----------------|
| Boxer | Medium (chin decay) | ⚠️ KO vulnerability increases |
| Muay Thai | High (cardio was already low) | ❌ Fades badly |
| Wrestler | Medium | ✅ Control style ages well |
| BJJ Specialist | Low (technique over physical) | ✅ Submission threat persists |
| All-Rounder | Medium | ✅ Adaptable |

### 6.4 Development Speed

All archetypes develop at the **same speed** because the training system is archetype-agnostic. The only difference is starting multipliers, which create a 5-10 point head start in specific attributes.

### 6.5 Ceiling Interaction

Ceilings are randomly assigned and independent of archetype. A Boxer could have a +30 wrestling ceiling (making them a surprisingly good wrestler after years of training). This creates **unexpected late-career identity shifts** — the Boxer who became a wrestler, the BJJ specialist who developed knockout power.

---

## 7. COMPETITIVE BALANCE

### 7.1 Win Rate Expectations (Player vs AI)

| Archetype | Early Game | Mid Game | Late Game | Overall |
|-----------|-----------|----------|-----------|---------|
| Boxer | 60% | 55% | 50% | 55% |
| Muay Thai | 50% | 52% | 45% | 50% |
| Wrestler | 65% | 60% | 58% | 60% |
| BJJ Specialist | 40% | 55% | 55% | 52% |
| All-Rounder | 50% | 53% | 52% | 52% |

### 7.2 Dominant Archetype

**Wrestler is the strongest archetype overall.** Reasons:
1. Takedown advantage (+20% vs Boxer, +5% vs Muay Thai) is the most impactful matchup bonus
2. Top control avoids striking exchanges — the Wrestler dictates where the fight happens
3. GNP provides reliable damage without the variance of striking
4. Wrestling ages well — doesn't rely on chin or cardio

### 7.3 Underperforming Archetype

**Muay Thai is the weakest archetype.** Reasons:
1. Cardio penalty (0.90) means they fade in later rounds — exactly when finishes matter most
2. Clinch bonus requires getting to the clinch — Wrestlers can takedown first
3. BJJ vulnerability (-10% TD defense) creates a brutal matchup
4. Can't train clinch directly — the training system doesn't support their identity

### 7.4 AI Performance

AI fighters don't train, so their archetype identity is pure — they fight with their starting multipliers forever. This means:
- AI Boxers are dangerous strikers their entire career
- AI Wrestlers always have takedown advantage
- AI BJJ fighters always have submission threat

**AI archetypes maintain their identity better than player archetypes** because AI fighters never train incorrectly.

---

## 8. REPLAYABILITY

### 8.1 Archetypes That Feel Different

| Comparison | Difference | Rating |
|-----------|-----------|--------|
| Boxer vs Wrestler | Striking vs Grappling — completely different fights | ⭐⭐⭐⭐⭐ |
| Boxer vs BJJ | Striking vs Submissions — different finish conditions | ⭐⭐⭐⭐ |
| Wrestler vs BJJ | Top control vs Guard game — positional battle | ⭐⭐⭐⭐ |
| Boxer vs Muay Thai | Both strikers, different ranges | ⭐⭐⭐ |
| Muay Thai vs Wrestler | Clinch vs Takedown — who gets position first | ⭐⭐⭐ |
| All-Rounder vs Anyone | Similar to opponent's style but less extreme | ⭐⭐ |

### 8.2 Archetypes That Feel Too Similar

| Pair | Why They Overlap |
|------|-----------------|
| Boxer vs Muay Thai | Both strikers. After 50 weeks of training, stat differences erode. |
| Wrestler vs BJJ (late career) | Both develop into grappling hybrids through Sparring training. |
| All-Rounder vs Everyone | By design, All-Rounder is a less extreme version of every archetype. |

### 8.3 Archetypes That Fail to Express Unique Fantasy

| Archetype | Fantasy | Delivered? |
|-----------|---------|-----------|
| Boxer | "Float like a butterfly" | ✅ Striking advantage works |
| Muay Thai | "Art of eight limbs" | ⚠️ Clinch is great, but cardio penalty undermines it |
| Wrestler | "Ground and pound" | ✅ Excellent — best archetype |
| BJJ Specialist | "Human anaconda" | ✅ Submission threat from anywhere |
| All-Rounder | "Complete fighter" | ⚠️ "No weaknesses" means "no identity" |

---

## 9. OVERALL ASSESSMENT

| Archetype | Identity | Balance | Viability | Distinction | **Grade** |
|-----------|----------|---------|-----------|-------------|----------|
| Boxer | Clear | Balanced | Strong | Distinct | **A-** |
| Muay Thai | Clear | Weak | Below Avg | Distinct | **C+** |
| Wrestler | Clear | Strong | Very Strong | Distinct | **A** |
| BJJ Specialist | Clear | Balanced | Above Avg | Distinct | **B+** |
| All-Rounder | Vague | Balanced | Above Avg | Low | **B-** |

### Key Findings

1. **All 5 archetypes have clear identities** at creation, but training erodes these identities over time
2. **Wrestler is objectively the best archetype** — best matchup bonuses, ages well, controls fights
3. **Muay Thai is objectively the weakest** — cardio penalty + training system can't support clinch identity
4. **The game plan system preserves archetype identity** (Boxers pick Keep Standing, Wrestlers pick Take It Down) better than the training system
5. **AI archetypes maintain identity better than player archetypes** because AI doesn't train suboptimally
6. **The rock-paper-scissors matchup system works** — no matchup is worse than 60/40

### Overall Grade: B

The archetype system provides meaningful variety at fight time (through matchups and game plans) but fails to maintain that variety through development (because training pushes everyone toward the same stat profile). The system works best in the first 50 weeks of gameplay before training convergence sets in.
