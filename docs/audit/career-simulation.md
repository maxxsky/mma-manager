# 🥊 MMA Manager — Career Simulation Audit

> **Date:** 2026-07-10  
> **Scope:** Complete fighter lifecycle — generation to retirement  
> **Method:** Traced every system through `state.js`, `fighter.js`, `fight.js`, `FightNight.jsx`

---

## 1. FIGHTER LIFECYCLE

### 1.1 Generation

**File:** `engine/fighter.js` — `genFighter(level)`

A fighter is created with:
- **Age:** `RI(18, 31)` — random between 18-31
- **Archetype:** Random from 5 types (Boxer, Muay Thai, Wrestler, BJJ Specialist, All-Rounder)
- **Region:** Random from 8 regions, determines name generation
- **Attributes:** 8 stats generated at `level * 60 ± 12`, clamped to 15-95
- **Ceilings:** Each attribute ceiling = `attr + RI(8, 30)`, clamped to `[attr, 99]`
- **Traits:** 2 random traits with conflict resolution (no mutually-exclusive pairs)
- **Ambition:** Random from 6 ambitions
- **Morale:** `RI(55, 80)`
- **Popularity:** `RI(0, 25)`
- **Overtraining:** 0
- **Training:** Default `{ type: "conditioning", intensity: "Medium" }`
- **Contract:** `null` (unsigned)
- **Agent:** Assigned based on skill + popularity (`agentFor()`)
- **Record:** `{ w:0, l:0, ko:0, sub:0, dec:0 }`

The `level` parameter controls quality:
- Rival camps: level 0.35-1.2
- AI rankings: level 0.5-1.5
- Scout prospects: level 0.35-1.45
- Fight opponents: level based on ranking

### 1.2 Recruitment

**Systems:** Scouting, NegotiateModal, Contracts

**Player decisions:**
- Choose scout method (4 tiers: $50–$10,000)
- Filter by archetype and weight class
- Review scout reports (grade C/B/A/S based on camp reputation)
- Negotiate contract terms: signing bonus, manager cut %, fight commitment, duration
- Accept or pass on prospects

**AI decisions:**
- Prospects expire after 12 weeks (taken by other camps)
- Scout grade limits report accuracy (grade C hides chin, fightIQ, traits, ambition)

**What changes:** Fighter moves from `g.prospects` → `g.roster`. Contract created. `joinedWeek` set.

**Progression trigger:** Player signs contract → fighter joins roster.

---

### 1.3 Training

**File:** `engine/state.js:107-141` — weekly `tick()`

**Systems active during training:**
- Training program (striking/grappling/conditioning/sparring/recovery/fightcamp)
- Intensity (Light/Medium/Hard)
- Coach bonuses (specialty matching)
- Facility bonuses (mats/ring/weights level)
- Sparring quality (roster size + archetype compatibility)
- Chemistry multiplier (80+ = 1.15×, <40 = 0.9×)
- Morale multiplier (75+ = 1.1×, <40 = 0.85×)
- Overtraining penalty (75+ = 0.5×)
- Age multiplier (see Growth Model below)
- Trait multipliers (Natural Talent 1.15×, Grinder ceiling cap 0.9)
- Relationship bonus (avg relationship × 0.15, clamped 0.85-1.1)
- Ceiling cap (attribute cannot exceed `ceilings[k]`)

**Gain formula per attribute:**
```
gain = R(0.5, 1.4) × intensity × ageMult × otMult × traitMult
     × moraleMult × capMult × chemMult × coachBonus × facBonus
     × sparringMult × relMult
```

**Player decisions:**
- Set training program (6 options)
- Set intensity (Light/Medium/Hard)
- Switch to recovery when overtraining is high
- Hire/fire coaches with matching specialties
- Upgrade facilities

**AI decisions:**
- None — training is fully player-controlled

**What changes:** `f.attrs[k]` increases toward `f.ceilings[k]`. `f.overtraining` accumulates. `f.morale` drifts toward 60.

**Progression trigger:** Fighter is booked for a fight (by accepting inbox offer).

---

### 1.4 Early Career (Age 18-26)

**Age multiplier:** 1.3 (≤21) → 1.15 (≤26) — **peak growth rate**

This is the fastest development window. Fighters gain attributes rapidly and are relatively resistant to decline. Chin begins at baseline (no age-related decay until 31).

**Key dynamics:**
- High training gains — ideal time to build foundation
- Low injury accumulation
- Low popularity — small purses, local/regional fights
- Can build toward first title shot

---

### 1.5 Prime (Age 27-33)

**Age multiplier:** 1.0 (27-30) → 0.90 (31-33) — **plateau begins**

**Chin decay starts at age 31:** -1 chin per year.

Training gains slow but are offset by accumulated skill. Fighters should be near their ceiling. This is when most title runs happen.

**Key dynamics:**
- Attributes near ceiling — gains are capped by `capMult` (0.6 at 70% of ceiling, 0.3 at 90%)
- Injuries accumulate — `seriousInjuries` counter builds
- At 4+ serious injuries: auto-gain "Injury Prone" trait (2× injury risk)
- Career-threatening injuries (5% chance per injury roll) cause **permanent attribute reduction** (random attr -3 to -8, ceiling reduced equivalently)
- Popularity at peak if winning
- Highest purse potential

---

### 1.6 Decline (Age 34+)

**Age multiplier:** 0.75 (34-36) → 0.55 (37+)

**Chin decay:** -2/year (34-36), -3/year (37+)

Training gains are severely reduced. Fighters lose chin points each year — making KOs more likely. This creates a feedback loop: worse chin → more damage → more KOs → more morale loss → worse training.

**Key dynamics:**
- Hard to gain attributes — mostly maintaining
- Chin becomes a liability
- Retirement triggers activate at 36+
- Weight class changes become more likely (move down to compensate)

**Player decisions:**
- Move fighter down a weight class (faster, less strength-dependent)
- Convert to coach (if camp has slots)
- Release or convince to stay

---

### 1.7 Retirement

**File:** `engine/state.js:803-814`

**Trigger conditions:**
- Age ≥ 36
- Probability per year: `(age - 35) × 0.15 + (streakL ≥ 3 ? 0.3 : 0)`
- At age 36: 15% chance per year
- At age 38: 45% chance per year
- At age 40: 75% chance per year
- Losing streak ≥ 3 adds flat +30%

**Retirement event (inbox):**
1. "Hormati pensiun" → `retire: f.id` → fighter removed, rep +3
2. "Bujuk satu run lagi" → `convince: f.id` → morale -10, stays (once per fighter)
3. "Jadikan coach" → `toCoach: f.id` → fighter removed, coach added to staff

**Also: low morale release request** (`state.js:780-791`):
- Morale < 25 for 4+ weeks triggers release request
- Options: release, retention bonus ($3K–$8K), ignore (chemistry -5)

**AI fighter rotation** (`state.js:685-704`):
- Every 48 weeks: bottom 3 AI fighters in each division retire
- 3 new AI prospects generated at level 0.5-0.85
- Keeps AI opposition fresh

---

### 1.8 Replacement

**Replacement comes from scouting:** Player must actively scout to find replacements.

**AI replacement is automatic:** AI divisions auto-generate 3 new fighters every year.

**Player decisions:**
- Scout before current fighter retires (prospects take time)
- Balance roster size (camp tier caps)
- Choose replacement archetype based on camp needs

---

## 2. CAREER TIMELINE

```
Age 18-21  │  YOUNG         │ 1.3× training, 0.9× fight performance
           │  Regional      │ First fights, building record
           │                │
Age 22-26  │  DEVELOPING    │ 1.15× training, peak growth
           │  National      │ Moving up rankings, first title shots
           │                │
Age 27-30  │  PRIME         │ 1.0× training, peak performance
           │  Major/Premier │ Title defenses, biggest purses
           │                │
Age 31-33  │  VETERAN       │ 0.90× training, chin -1/yr
           │  Major         │ Defending against rising contenders
           │                │
Age 34-36  │  DECLINE       │ 0.75× training, chin -2/yr
           │  National      │ Move down weight class, gatekeeper role
           │                │
Age 37+    │  ENDGAME       │ 0.55× training, chin -3/yr
           │  Local         │ Retirement imminent, coach conversion
           │                │
           ▼  RETIREMENT    │ 15-75% yearly chance after 36
```

**Typical career span:** 18-24 in-game years (generated at 18-31, retires 36-42+)

---

## 3. GROWTH MODEL

### 3.1 Potential (Ceilings)

Generated at fighter creation: `ceilings[k] = clamp(attrs[k] + RI(8, 30), attrs[k], 99)`

A fighter with 50 striking and a +25 ceiling roll has a ceiling of 75. They can never exceed 75 striking.

Ceilings can be **permanently reduced** by career-threatening injuries (tier 3, 5% chance per injury).

### 3.2 Attribute Growth

10 multipliers stack multiplicatively:
1. Base: `R(0.5, 1.4)` — random per tick
2. Intensity: `0.6 / 1.0 / 1.4`
3. Age: `1.3 → 0.55` (see timeline)
4. Overtraining: `1.0 → 0.5` (at 75+ OT)
5. Natural Talent: `1.15` (trait)
6. Morale: `1.1 / 0.85`
7. Ceiling cap: `1.0 → 0.3` (at 90% of ceiling)
8. Chemistry: `1.15 / 0.9`
9. Coach: `1.0 + coach.skill × 0.03` (matching specialty)
10. Facility: `1.0 + (facilityLevel - 1) × 0.06`

**Practical growth rate:** At peak (young, high morale, good chemistry, matching coach, good facilities): ~1.5-3.5 points/week. At decline (old, low morale, near ceiling): ~0.1-0.3 points/week.

### 3.3 Training Ceiling Mechanics

The `capMult` controls how fast a fighter approaches their ceiling:
- <70% of ceiling: `capMult = 1.0` (full speed)
- 70-90%: `capMult = 0.6` (slowing)
- 90%+: `capMult = 0.3` (crawling)
- **Grinder trait**: flat `0.9` regardless of progress — never slows down

### 3.4 Aging (Pre-Fight)

`prepFighter()` in `fight.js` applies age + morale modifiers before combat:
- Morale ≥75: +4% attrs
- Morale <40: -6% attrs
- Age ≥37: -15% attrs
- Age 34-36: -10% attrs
- Age 31-33: -5% attrs
- Age ≤21: -10% attrs (inexperience)
- Weight class delta: strength/footwork adjustments

### 3.5 Decline

Decline is multi-layered:
1. **Training gains slow** (age multiplier drops)
2. **Chin decays** (-1 to -3 per year after 31)
3. **Fight performance drops** (age penalty in prepFighter)
4. **Injury risk increases** (more fights = more injury rolls)
5. **Serious injuries accumulate** → "Injury Prone" trait at 4+
6. **Permanent attribute damage** from career-threatening injuries

### 3.6 Retirement Triggers

1. **Age-based** (36+): `(age - 35) × 0.15 + losing streak bonus`
2. **Career-threatening injury accumulation** → retirement retirement event
3. **Low morale release** (<25 for extended period)
4. **Player choice**: release, convince, convert to coach

---

## 4. CAREER RISKS

### 4.1 Injury System

| Tier | Label | Weeks | Cost | Probability | Permanent Damage |
|------|-------|-------|------|-------------|------------------|
| 0 | Minor | 1-2 | $500-2K | 50% | No |
| 1 | Moderate | 3-6 | $2K-8K | 30% | No |
| 2 | Serious | 8-16 | $8K-20K | 15% | No |
| 3 | Career-Threatening | 20-36 | $15K-40K | 5% | **Yes** — random attr -3 to -8, ceiling reduced |

**Injury effects:**
- **Training stops** — injured fighters gain nothing
- **Attribute decay** during long injuries (>4 weeks): tier ≥2 → 6 attrs decay 0.15/week
- **Medical costs**: `injury.costPerWeek × medicalFacilityDiscount`
- **Morale drop**: -14 for serious, -8 for minor/moderate
- **Booked fights cancelled** if injured
- **4+ serious injuries** → permanent "Injury Prone" trait (2× injury risk)

### 4.2 Contract Risk

- **Expiry by duration**: Contract runs out after `durationMo` months → free agent
- **Expiry by fights**: Contract ends after `fightsTotal` fights → free agent
- **Diva renegotiation**: Demands new contract even without top-10 ranking
- **Agent hardness**: Harder agents demand higher cuts

### 4.3 Morale Spiral

- **Loss**: -14 morale (or -4 with Iron Will)
- **Win**: +12 morale
- **Inactivity**: -0.5/week after 16 weeks without fight
- **Injury**: -8 to -14
- **Low morale** (<25 for 4+ weeks) → release request
- Low morale reduces training gains (0.85×) and fight performance (-6% attrs)

### 4.4 Losing Streak

- **Purse reduction**: 0.85× at 1 loss, 0.7× at 2+ losses
- **Easier opponents**: Rank index shifts down 2-4 spots
- **Weight class change**: 3+ losses → move down division
- **Retirement acceleration**: +30% yearly retirement chance
- **Chin decay + losses** → more KOs → more losses (death spiral)

### 4.5 Chemistry

- **Below 40**: 0.9× training multiplier
- **Below 0**: Can't use "Talk" option on poach attempts
- **Monthly drift**: +Team Players, -Divas, ± random events
- **Loss**: -2 chemistry per team loss

---

## 5. PLAYER DECISIONS

During a fighter's career, the player makes these meaningful decisions:

| Stage | Decision | Frequency | Impact |
|-------|----------|-----------|--------|
| Recruitment | Scout method + prospect selection | Per prospect | Fighter quality ceiling |
| Recruitment | Contract terms (cut, fights, duration) | Per signing | Long-term financial + flexibility |
| Training | Training program (6 types) | Every week | Attribute growth direction |
| Training | Training intensity (3 levels) | Every week | Growth speed vs injury/overtraining risk |
| Training | Recovery weeks | As needed | Overtraining + injury management |
| Staff | Hire/fire coaches | As needed | Training bonuses (specialty matching) |
| Facilities | Upgrade mats/ring/weights/medical | As affordable | Training + injury reduction |
| Fight | Accept/counter/reject fight offers | Per offer | Ranking, purse, title opportunities |
| Fight | Attitude (Respectful/Professional/Trash Talk) | Per fight | Small stat modifiers + popularity |
| Fight | Game plan (4 options) | Per fight | Combat strategy |
| Fight | Corner decisions (between rounds) | Per fight | Round-by-round tactics |
| Contract | Renegotiate or release | On expiry/request | Roster management |
| Career | Release unhappy fighter | When morale <25 | Lose asset, chemistry impact |
| Career | Convince retiring fighter | Once per fighter | Extend career 1 run |
| Career | Convert to coach | At retirement | Turn asset into staff |
| Weight | Accept/reject weight class change | When AI proposes | Strategic repositioning |

---

## 6. AI DECISIONS

| Decision | Scope | Frequency | Effect |
|----------|-------|-----------|--------|
| Fight offer generation | Per fighter, per week | Variable based on rank/rep | Quality and tier of opponent |
| Opponent selection | Per fight offer | Based on ranking + streak | Easier/harder matchups |
| Game plan selection | AI opponent only | Per AI fight | `autoGamePlan()` based on stats |
| Ranking movement | All AI fighters | Monthly (±8-12 pts) | Division dynamics |
| Fighter rotation | Bottom 3 per division | Every 48 weeks | Division freshness |
| Weight class change | Player fighters | Conditional (losing streak, age, ambition) | Division strategy |
| Contract renegotiation | Player fighters | Duration/fights expiry + Diva trait | Inbox event |
| Retirement trigger | Player fighters | Age 36+ yearly check | Career end |
| Coach market refresh | Camp | 4-12 week cycle | Hiring pool |
| Sponsor offers | Camp | 8% monthly per brand | Income source |

---

## 7. DEAD ENDS

### 7.1 The Gatekeeper Trap

A fighter who reaches their ceiling but can't win a title becomes a "gatekeeper" — they win enough to stay ranked but can't progress. **No system** exists to:
- Give gatekeepers a narrative arc
- Create "veteran respect" bonuses
- Generate "last chance" title shots
- Make declining fighters compelling to keep

### 7.2 The Injury Spiral

A fighter with 4+ serious injuries gets "Injury Prone" permanently. Combined with declining chin (age 31+), this creates an accelerating death spiral:
- Worse chin → more KOs → more injuries → permanent stat loss → worse performance → more losses → retirement
- **No recovery mechanic** exists for Injury Prone

### 7.3 The Replacement Gap

When a champion retires, the player must:
1. Have been scouting 3-12 weeks before retirement
2. Hope the prospect's ceiling is high enough
3. Develop the prospect for 20-40 weeks before they're competitive

**No system** exists to:
- Fast-track prospects with "mentor" veterans
- Generate "new game+" carry-over benefits
- Create urgency around retirement timing

### 7.4 The Contract Trap

Fighters with Power Agents demand 20%+ manager cuts. Combined with declining performance, the fighter becomes a financial liability. **No system** exists to:
- Renegotiate agent terms
- Convince fighters to change agents
- Get value from "overpaid" veterans (mentoring, popularity, etc.)

### 7.5 The Popularity Flatline

Popularity decays 0.5/week when not fighting. An injured fighter can lose 20+ popularity during a serious injury. **No system** exists to:
- Maintain popularity during injuries (social media, interviews)
- Monetize high-popularity veterans beyond fight purses
- Create "legend" status that persists after decline

---

## 8. OVERALL ASSESSMENT

### Strengths

- **Multi-layered aging**: Training × fight performance × chin decay × injury accumulation — creates genuine decline curve
- **Irreversible consequences**: Career-threatening injuries permanently reduce potential — every fight carries risk
- **Player agency**: 15+ decision points per fighter across their career
- **AI opposition turnover**: Divisions refresh yearly, preventing staleness
- **Retirement options**: Honor, convince, or convert — meaningful final choice

### Weaknesses

- **No mid-career reinvention**: Fighters can't change archetype, learn new styles, or dramatically pivot
- **No legacy system**: Retired fighters disappear completely — no hall of fame, no historical records, no "greatest of all time" tracking
- **No inter-generational connection**: New prospects have no relationship to retired veterans
- **Predictable decline**: Same curve for every fighter — age 31 starts, accelerates at 34, ends at 36+
- **No comeback mechanic**: Once declining, no way to reverse (weight class change helps but doesn't reverse chin decay)
- **Replacement is purely reactive**: Must actively scout — no "youth academy" or passive prospect generation

### Long-term Interest

The career simulation **remains interesting for approximately 2-3 fighter generations** (roughly 60-100 in-game weeks per fighter, or 3-5 real hours). Beyond that, the replacement cycle becomes repetitive because:
1. Every fighter follows the same age curve
2. Scouting is the only acquisition method
3. No narrative emerges between generations
4. Retired fighters leave no legacy

The core systems are sound — the limitation is in the narrative layer between careers, not the mechanics within them.
