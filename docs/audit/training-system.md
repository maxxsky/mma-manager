# 🏋️ MMA Manager — Training System Audit

> **Date:** 2026-07-10  
> **Scope:** Complete training system — programs, intensities, development, supporting systems, long-term engagement  
> **Method:** Traced every multiplier, every decision point, every interaction

---

## 1. TRAINING LOOP

### 1.1 Weekly Training Flow

```
Week Start → tickTraining(g)
  │
  ├── Per Fighter:
  │     ├── Morale drift toward 60 (±2/week)
  │     ├── Injury check (recovery or new injury)
  │     ├── If injured: skip training, deduct medical costs
  │     ├── If healthy:
  │     │     ├── Deduct training cost from cash
  │     │     ├── Calculate attention multiplier (coaches/fighters ratio)
  │     │     ├── If recovery: heal overtraining, boost morale
  │     │     ├── If training:
  │     │     │     ├── Compute 12 multipliers
  │     │     │     ├── Apply gains to target attributes
  │     │     │     ├── Accumulate overtraining
  │     │     │     ├── Roll injury probability
  │     │     │     └── Update training history
  │     │     ├── Apply popularity decay (-0.5 if not booked)
  │     │     └── Decrement booked.weeksLeft if booked
  │     └── End
  │
  └── End
```

**Player interaction:** Must open FighterDetail → click program → click intensity. Per fighter, per week. No bulk assignment. No default training. No auto-revert after Fight Camp.

### 1.2 Decision Frequency

| Action | Frequency | Clicks |
|--------|-----------|--------|
| Set training program | Every week per fighter | 1 click |
| Set training intensity | Every week per fighter | 1 click |
| Switch to recovery | When OT > 60-75 | 1 click |
| Switch back from recovery | When OT < 25 | 1 click |
| Check morale/overtraining | Every 2-3 weeks | 1 click (open FighterDetail) |

**With 5 fighters:** ~10 clicks per week minimum. **With 14 fighters:** ~28 clicks per week. Over a 100-week campaign: ~1,000-2,800 training clicks.

### 1.3 Decision Quality

Training decisions are:
- **Routine for 80% of weeks** — same program, same intensity, same fighter
- **Situational for 15% of weeks** — switch to recovery, switch intensity for injury risk
- **Strategic for 5% of weeks** — change program to develop specific attributes, pre-fight optimization

### 1.4 Repetitiveness

**HIGH.** Once a player settles on a training strategy ("Sparring at Medium for everyone"), they repeat the same clicks every week with no variation. The only disruptors are injuries (force recovery) and Fight Camp (auto-assigned when booked).

---

## 2. TRAINING PROGRAMS

### 2.1 Program Catalog

| Program | Cost/Week | Target Attributes | Attribute Count |
|---------|-----------|------------------|-----------------|
| Sparring | $800 | FightIQ, Striking, Wrestling | 3 |
| Fight Camp | $1,000 | FightIQ, Cardio, Striking, Wrestling | 4 |
| Striking | $500 | Striking, Footwork | 2 |
| Grappling | $500 | Wrestling, BJJ | 2 |
| S&C | $300 | Strength, Cardio | 2 |
| Recovery | $100 | None (heals OT, +morale) | 0 |

### 2.2 Purpose of Each Program

| Program | Primary Use | Optimal For |
|---------|-----------|-------------|
| **Sparring** | General development | Every fighter. Hits FightIQ (most important stat) + 2 combat stats |
| **Fight Camp** | Pre-fight preparation | Auto-assigned when booked (last 2 weeks). Best gains but forced. |
| **Striking** | Stand-up specialization | Boxers, Muay Thai fighters |
| **Grappling** | Ground specialization | Wrestlers, BJJ specialists |
| **S&C** | Physical development | Young fighters building foundation, cheap option |
| **Recovery** | Overtraining management | When OT > 50. Also used for injury-prone or aging fighters. |

### 2.3 Situations Where Each Is Optimal

| Situation | Best Program | Why |
|-----------|-------------|-----|
| **Early development (age 18-22)** | Sparring or S&C | Sparring for all-around, S&C for cheap physical base |
| **Mid-development (age 23-28)** | Sparring | Max attribute coverage per week |
| **Near ceiling (>80% of cap)** | Sparring or specialized | Sparring still best ROI, specialized if specific stat lagging |
| **Pre-fight (last 2 weeks)** | Fight Camp (forced) | Best gains, covers all combat stats |
| **Post-fight recovery** | Recovery | Heal overtraining from fight |
| **Injury recovery** | Forced (can't train) | Automatic |
| **Old fighter (34+)** | Recovery or Light S&C | Maintain without injury risk |
| **Low cash** | S&C ($300) | Cheapest non-recovery option |

### 2.4 Programs Rarely Used

| Program | Why Rarely Used |
|---------|----------------|
| **Recovery** (outside of OT management) | No attribute gains. Only used reactively. |
| **Grappling** (standalone) | Sparring covers wrestling + FightIQ. Grappling only if BJJ is specifically lagging. |
| **Striking** (standalone) | Same — Sparring covers striking. Only if footwork is lagging. |

### 2.5 Dominant Strategy

**Sparring at Medium/Hard for everyone, switch to Recovery when OT > 60, switch back when OT < 25.**

This strategy is optimal because:
1. Sparring hits the most attributes (3) including FightIQ
2. FightIQ affects everything — striking defense, submission defense, game plan effectiveness
3. Medium/Hard gives good gains with manageable injury risk
4. Recovery at OT > 60 prevents injuries without losing too many training weeks

**This strategy works for every fighter, every archetype, every phase of the game.** There is no reason to deviate from it except for very specific edge cases (pure grappler needs BJJ, pure striker needs footwork).

---

## 3. TRAINING INTENSITY

### 3.1 Risk vs Reward

| Intensity | Gain Multiplier | Injury Risk/Week | OT Gain/Week | Break-even (weeks to injury) |
|-----------|----------------|-----------------|-------------|------------------------------|
| Light | 0.6× | 0.5% | +4 | 200 |
| Medium | 1.0× | 2.0% | +9 | 50 |
| Hard | 1.4× | 8.0% | +16 | 12.5 |

**Hard is optimal when:**
- Fighter is young (≤26) — highest age multiplier, fastest recovery
- Fighter is healthy — no recent injuries
- Fighter is far from ceiling — cap multiplier hasn't dropped yet
- Fighter has Cautious trait — -15% injury risk
- Camp has Disciplinarian coach — -15% injury risk
- Medical facility is upgraded — -3% injury risk per level

**Medium is optimal when:**
- Fighter is in prime (27-33) — moderate age multiplier
- Fighter is approaching ceiling — gains are diminishing anyway
- Fighter has had recent injuries — don't want to risk another

**Light is optimal when:**
- Fighter is old (34+) — age multiplier already low, injury risk too high
- Fighter is recovering from a serious injury — need to rebuild gradually
- Fighter has Injury Prone trait — ×2 injury risk makes Hard suicidal

### 3.2 Overtraining

**Accumulation formula:** `overtraining += intensity.ot × ambitionGrinder × disciplinarianCoach - 8`

| Scenario | OT/Week | Weeks to OT 50 | Weeks to OT 75 |
|----------|---------|----------------|----------------|
| Hard, no mitigation | +8 | 6.25 | 9.4 |
| Medium, no mitigation | +1 | 50 | 75 |
| Hard, Grinder ambition | +6 | 8.3 | 12.5 |
| Hard, Disciplinarian coach | +6 | 8.3 | 12.5 |
| Recovery | -30 | N/A (heals) | N/A |

**Overtraining effects:**
- OT < 25: No penalty (1.0× gains)
- OT 25-50: 0.9× gains
- OT 50-75: 0.75× gains
- OT 75-90: 0.5× gains
- OT ≥ 90: Auto-injury (breakdown)

**Optimal OT management:** Train at Hard until OT ~50, then switch to Recovery for 1-2 weeks, then back to Hard. This gives ~6 weeks of Hard training followed by ~2 weeks of Recovery. Net: ~75% Hard, 25% Recovery.

### 3.3 Injury Interaction

Injury risk compounds with intensity:

| Intensity | Base Risk | +OT>50 | +OT>75 | With Cautious | With Disciplinarian | Net Worst Case |
|-----------|----------|--------|--------|---------------|---------------------|---------------|
| Hard | 8% | +5% | +8% | -15% (1.15→0.98) | -15% (0.98→0.83) | ~6.6% |
| Medium | 2% | — | — | — | — | ~1.7% |
| Light | 0.5% | — | — | — | — | ~0.4% |

**At Hard with no mitigation:** ~2 injuries per year. At Hard with full mitigation (Cautious + Disciplinarian + Medical level 3): ~1 injury per year.

---

## 4. FIGHTER DEVELOPMENT

### 4.1 Generalist vs Specialist Builds

**Generalist (Sparring always):**
- Pros: All stats grow, no weakness, adaptable to any opponent
- Cons: No extreme strengths, slower to hit high values in key stats
- Best for: All-Rounder archetype, fighters who fight diverse opponents

**Specialist (Striking or Grappling focused):**
- Pros: Key stats grow faster, creates matchup advantages
- Cons: Other stats lag, exploitable weaknesses
- Best for: Boxer (Striking only), Wrestler (Grappling only)

**Build diversity: LOW.** The optimal strategy (Sparring + Recovery cycling) produces nearly identical fighter profiles regardless of archetype. The archetype multipliers in genFighter create starting differences, but 50 weeks of Sparring training erases most of them.

### 4.2 Attribute Progression

**From 50 → 85 (35 points) at optimal conditions:**
- Hard intensity: ~2.5 points/week → 14 weeks
- Medium intensity: ~1.8 points/week → 20 weeks
- Hard + Natural Talent: ~2.9 points/week → 12 weeks

**From 85 → 95 (10 points, near ceiling):**
- Cap multiplier drops to 0.3 → ~0.5 points/week
- Total: ~20 weeks to close the final gap

**Time to max a fighter:** ~30-40 weeks of training from generation to ceiling. With fight weeks and injury weeks mixed in: ~50-60 calendar weeks.

### 4.3 Ceiling Interaction

Ceilings are generated at fighter creation: `attrs[k] + RI(8, 30)`. A fighter with 50 starting striking and a +20 ceiling roll has a 70 ceiling.

**The ceiling is the single most important factor in fighter quality.** Two fighters with identical starting stats but different ceilings (+10 vs +25) will diverge significantly over 40 weeks of training. The +25 ceiling fighter ends at 75 striking; the +10 ceiling fighter caps at 60.

**Scout grade matters because of ceilings, not current stats.** A C-grade prospect with a hidden +28 ceiling is better than an S-grade prospect with a +8 ceiling. But the player can't see ceilings on low-grade scouts — creating a genuine information asymmetry.

---

## 5. SUPPORTING SYSTEMS

### 5.1 Coach Influence

| Factor | Effect | Max Bonus |
|--------|--------|-----------|
| Specialty match | +2.5% per skill level | +25% at skill 10 |
| No match | No bonus | 0% |
| Disciplinarian | -25% OT, -15% injury risk | Indirect |

**Coach selection is the second most impactful training decision after program selection.** A skill-7 matching coach gives +17.5% to all training in that specialty. Over 40 weeks, that's ~7 extra attribute points per fighter.

### 5.2 Facility Influence

| Facility | Bonus per Level (1-3) | Bonus per Level (4-6) | Max |
|----------|----------------------|----------------------|-----|
| Mats | +6% wrestling/bjj | +3% | +27% |
| Ring | +6% striking/footwork | +3% | +27% |
| Weights | +6% strength/cardio | +3% | +27% |
| Medical | -3% injury risk | -3% | -18% |

**Facilities are the best long-term investment.** They apply to every fighter, forever, with no ongoing cost beyond maintenance. A level-3 facility (+18%) over 100 weeks of training adds ~15-20 attribute points per fighter in that category.

### 5.3 Chemistry Influence

| Chemistry | Training Multiplier |
|-----------|-------------------|
| ≥80 | 1.15× |
| 60-79 | 1.0× |
| 40-59 | 1.0× |
| <40 | 0.9× |

**High chemistry is worth maintaining.** The 1.15× multiplier at ≥80 chemistry adds ~15% to all training gains. Over 40 weeks, that's ~5-6 extra attribute points per fighter.

### 5.4 Mentor Influence

Veterans (age 30+ or 15+ fights) give +1% training per mentor, max +3%. Small but persistent. Over 100 weeks: ~2-3 extra attribute points.

### 5.5 Trait Influence

| Trait | Training Effect | Impact |
|-------|----------------|--------|
| Natural Talent | 1.15× all gains | **Major** — ~6 extra points over 40 weeks |
| Grinder | Flat 0.9 cap multiplier | **Major** — never slows near ceiling |
| Cautious | -15% injury risk | Moderate — enables more Hard training |
| Iron Will | N/A (combat only) | None |

### 5.6 Relationship Influence

Average relationship across all teammates: `clamp(1 + avg × 0.15, 0.85, 1.1)`. Best case (all positive relationships): +10% training. Worst case (all negative): -15%. Relationship effects are minor but persistent.

---

## 6. LONG-TERM GAMEPLAY

### 6.1 Early-Game Training (Weeks 1-30)

**State:** 2-4 fighters, 1-2 coaches, facilities level 1. Limited cash.

**Decisions:** Which program for each fighter? What intensity? Can I afford Sparring ($800/week) for both fighters?

**Interest:** HIGH. Every choice matters. Fighters grow visibly week to week. The player is discovering the training system.

**Dominant strategy:** Not yet discovered. Player experiments.

### 6.2 Mid-Game Training (Weeks 30-100)

**State:** 4-8 fighters, 2-3 coaches, facilities level 2-3. Adequate cash.

**Decisions:** Optimize training. Match coaches to specialties. Manage overtraining. Develop prospects.

**Interest:** MODERATE. The player has settled on a strategy. Training is routine. The interesting part is developing new prospects from scratch.

**Dominant strategy:** Discovered and locked in. Sparring + Recovery cycling.

### 6.3 Late-Game Training (Weeks 100+)

**State:** 8-14 fighters, 4-5 coaches, facilities level 4-6. Infinite cash.

**Decisions:** None meaningful. All fighters are at or near ceiling. Training gains are 0.1-0.3/week. The player clicks through training out of habit, not strategy.

**Interest:** LOW. Training is a solved problem. The only novelty comes from new prospects starting fresh.

**Dominant strategy:** Unchanged. But it doesn't matter anymore — gains are negligible.

### 6.4 Does Training Remain Interesting?

**No.** After ~50 hours of gameplay, training is reduced to muscle memory. The player clicks the same buttons every week without thinking. The system provides no new challenges, no new programs, no new intensities, no specialization paths, no mastery tracks.

**The training system is engaging for ~30-40 in-game hours and then becomes a chore.**

---

## 7. PLAYER AGENCY

### 7.1 Meaningful Choices

| Choice | Why It Matters |
|--------|---------------|
| **Program selection** | Determines which attributes grow. Shapes fighter identity. |
| **Intensity selection** | Risk/reward trade-off. Injury probability vs growth speed. |
| **Recovery timing** | When to heal overtraining. Strategic window management. |
| **Coach hiring** | Specialty matching affects training bonuses permanently. |
| **Facility upgrades** | Permanent training bonuses for all fighters. |
| **Prospect selection** | Ceilings are the most important factor in long-term development. |

### 7.2 Solved Decisions

| Decision | Why It's Solved |
|----------|----------------|
| **Sparring is always best** | 3 attributes including FightIQ — no reason to use anything else |
| **Hard is best until age 30** | Risk is manageable, rewards are highest |
| **Recovery at OT 60** | Mathematically optimal breakpoint |
| **Medical facility first** | Injury reduction is universally beneficial |

### 7.3 Repetitive Actions

| Action | Weekly Frequency | Automation Need |
|--------|-----------------|-----------------|
| Set training program | 1× per fighter | HIGH — could be "remember last" |
| Set training intensity | 1× per fighter | HIGH — could be "remember last" |
| Check overtraining | 1× every 2-3 weeks | MEDIUM — could show warning |
| Switch to recovery | As needed | HIGH — could auto-suggest |
| Reassign after Fight Camp | After every fight | HIGH — should auto-revert |

### 7.4 Automation Opportunities

The game provides ZERO automation for training. Every action requires manual clicks. With 14 fighters, this means ~28 clicks per week, ~2,800 clicks per 100-week campaign.

---

## 8. OVERALL ASSESSMENT

### Strengths

- **12-multiplier system creates genuine depth** — the interaction between age, traits, coaches, facilities, chemistry, morale, and overtraining is rich
- **Ceiling system prevents infinite growth** — every fighter has a defined cap
- **Injury risk creates tension** — Hard intensity has real consequences
- **Supporting systems compound** — coaches, facilities, and chemistry stack meaningfully
- **Scout grades create information asymmetry** — the player can't see ceilings on low-grade reports

### Weaknesses

- **Sparring dominates** — one program is optimal for all fighters, all situations
- **No build diversity** — every fighter ends up with similar stat distributions
- **No late-game depth** — training is a solved problem by hour 30
- **No automation** — repetitive clicks, no "remember last" or bulk assignment
- **No specialization paths** — a Boxer and a Wrestler train identically after the first few weeks
- **No mastery tracks** — no "Striking Specialist" bonus for fighters who train striking exclusively
- **Recovery is purely reactive** — no proactive rest management or periodization

### Grade: B

The training system is **solid and functional** — it does exactly what it needs to do. The multiplier stack creates real depth. The ceiling system prevents infinite growth. But the system doesn't evolve with the player. What's engaging at hour 5 is routine at hour 30 and tedious at hour 100.

**The training system is the game's core loop, and it stops being interesting about halfway through a typical campaign.**
