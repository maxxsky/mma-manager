# 🌍 MMA Manager — World Simulation Audit

> **Date:** 2026-07-10  
> **Scope:** Long-running save (20+ in-game years) — division health, population, competitive balance, emergent stories  
> **Method:** Traced every system through `rankings.js`, `state.js`, `fighter.js`, `rivals.js`

---

## 1. DIVISION HEALTH

### 1.1 Ranking Stability

**AI ranking movement** (`state.js:683-686`): Every week, all AI fighters receive `RI(-8, 12)` point jitter. This is ±8-12 points per week — **very volatile**. A fighter with 100 points could drop to 92 in one week and rise to 104 the next.

**Player rank decay** (`state.js:710-720`): After 24 weeks without fighting, rank points decay -1/week. After 36 weeks, log warnings appear.

**Fight result impact** (`FightNight.jsx`): Wins add 8-16+ points. Losses multiply points by 0.70.

**Verdict:** Rankings are **highly dynamic** for AI fighters and **sticky but decay-prone** for player fighters. Champions who fight regularly stay at the top. Inactive fighters slide quickly.

### 1.2 Champion Turnover

**Champion generation at game start** (`rankings.js:10-25`): The #1 fighter is designated champion with 17-20 wins and 0-3 losses. All 8 divisions start with an AI champion.

**Player champion turnover mechanisms:**
1. **Mandatory defense** — After 24 weeks without defending, forced title fight against #1 contender
2. **Title stripping** — Rejecting mandatory defense strips the belt, rep -5, morale -15
3. **Vacating** — Moving weight classes vacates the title; #1 contender auto-promoted
4. **Loss** — Losing a title fight transfers the belt to the winner

**AI champion turnover:** AI champions are never actually simulated fighting. They exist as static entities until a player fighter challenges and beats them. The AI champion's name is used to generate an opponent but the AI champion's stats are generated fresh each time from `genFighter(1.45)`.

**Verdict:** AI champions are **essentially immortal until challenged by the player**. There is no off-screen AI title fight simulation. This means uncontested divisions can have the same champion for years.

### 1.3 Title Fight Frequency

**Title fight triggers per fighter per week:**
- **Mandatory defense**: 24 weeks since last fight → forced (rare, once per ~24 weeks per champ)
- **Double champ**: Every 12 weeks, 20% chance if adjacent division has AI champ
- **Title tier progression**: 25-35% chance per week when eligibility met (Regional → National → Minor → Major → Premier)
- **Regular fight offer**: 35% chance per week for non-champs

**Title eligibility requirements:**

| Tier | Rep | Rank | Skill | Prerequisite | Chance |
|------|-----|------|-------|-------------|--------|
| Premier | 80+ | ≤3 | 80+ | Major Champion | 25% |
| Major | 60+ | ≤5 | 72+ | National Champion | 35% |
| Minor | 50+ | ≤8 | 65+ | National Champion, 7+ wins | 30% |
| National | 40+ | ≤10 | 55+ | Regional Champion, 5+ wins | 30% |
| Regional | 20+ | — | 45+ | 3+ wins | 30% |

**Verdict:** Title fights happen **often enough** at lower tiers but **very rarely** at Premier level. A champion could hold the Premier title for years between defenses since there's only a 25% chance per week and the requirements are steep.

### 1.4 Contender Generation

**AI contenders** are generated fresh for each fight offer:
- Title fights: `genFighter(1.45)` with champion's name
- Ranked fights: `genFighter(clamp(c.level || 1, 0.5, 1.5))` from division list

**Division list refresh** (`state.js:688-704`): Every 48 weeks, the bottom 3 AI fighters retire and 3 new prospects enter with `R(0.5, 0.85)` level and `R(10, 25)` points. This means:
- New prospects always enter at the **bottom** of the rankings
- It takes **multiple years** for them to climb near the top (through weekly ±8-12 jitter)
- The top 12 fighters are untouched by rotation

**Verdict:** Contender generation is **adequate but slow**. Top contenders can stagnate for years because only the bottom 3 rotate out. The top 5-10 fighters are effectively permanent fixtures.

### 1.5 Dead Divisions

A division becomes "dead" when:
1. The champion is AI and the player has no fighters in that weight class
2. No player fighter challenges the champion
3. The AI champion stays forever (no off-screen fights)

**Verdict:** At any given time, **5-7 of 8 divisions are dead** — the player can only actively compete in divisions where they have fighters. The AI divisions continue to simulate ranking movement and rotation, but without player engagement, they're purely cosmetic.

---

## 2. FIGHTER POPULATION

### 2.1 Prospect Generation (Player)

- **Scout methods**: 4 tiers ($50-$10,000) with quality ranges 0.35-1.45
- **Scout grade**: Based on camp reputation — C (low rep) to S (high rep)
- **Report accuracy**: Grade C hides chin, fightIQ, traits, ambition. Grade S reveals everything.
- **Prospect pool**: Max 5 tracked at once. Expire after 12 weeks.
- **New prospects**: Only generated when player actively scouts

### 2.2 Retirement vs Replacement

**Player fighters:**
- Generated at age 18-31
- Retire at 36+ with 15-75% yearly chance
- Average career: ~15-20 in-game years = 720-960 weeks
- Player must **actively scout** to replace retirees

**AI fighters:**
- 3 rotate out per division per year (24 total per year across 8 divisions)
- 3 new prospects enter per division per year
- AI prospects: level 0.5-0.85, 0-3 wins, 0-2 losses
- Total AI fighter pool: 8 divisions × 15 fighters = 120 AI fighters

**Verdict:** Replacement is **adequate for AI** (3/year/division) but **entirely dependent on the player** for their own roster. If the player doesn't scout for 12+ weeks, they'll have no prospects when a fighter retires.

### 2.3 Age Distribution

At game start, generated fighters follow:
- Player starters: 2 fighters generated with `genFighter(0.8)` → ages 18-31
- AI division fighters: 15 per division × 8 divisions = 120 fighters
- Rival camps: 3 camps × 4-6 fighters each = 12-18 fighters

After 20 years:
- Original AI fighters have been rotated out 20 times (3/year × 20)
- Player may have cycled through 4-6 generations of fighters
- The age distribution is **uniformly young** — AI prospects always enter fresh

### 2.4 Skill Distribution

**AI fighter skill range:**
- New prospects: level 0.5-0.85 → attributes ~30-50
- Mid-ranked: level depends on initial placement
- Top contenders: original level from generation, modified by jitter
- Champions: level 1.4 → attributes ~84

**Player fighter skill range:**
- Starts: level 0.8 → ~48 average
- Peak (after 40-60 weeks of training): near their ceiling of 70-99
- Decline (age 31+): gradual erosion

**Verdict:** There's a **natural skill gap** between player fighters (who train) and AI fighters (who don't). After 1-2 years, player fighters significantly outclass AI opposition at the same rank.

### 2.5 Archetype Diversity

5 archetypes with random assignment. Each division has 15 fighters — theoretically balanced but random assignment means individual divisions may skew.

### 2.6 Trait Diversity

12 traits, 2 per fighter with conflict resolution. Well-maintained by random generation.

---

## 3. COMPETITIVE BALANCE

### 3.1 Dominant Champions

**Yes, they emerge naturally.** Player fighters who win titles continue training and improving between defenses. AI opponent quality is fixed at genFighter(1.45) — it doesn't scale with the player's growth. After 2-3 title defenses, the skill gap widens significantly. Title reign length is **unbounded**.

### 3.2 Dynasties

**Player dynasties only.** A player can hold multiple titles (Double Champ), accumulate legacy points, and dominate for decades. AI champions never build dynasties because they never defend.

### 3.3 Division Stagnation

**Inevitable in unchallenged divisions.** The top 12 AI fighters persist for years. Only the bottom 3 rotate annually. The champion is the same name until the player acts.

### 3.4 Underdog Rise

**Possible through player development.** An underdog prospect can rise via intensive training, smart fight selection, and trait synergies. **AI underdog rise** is possible through ranking jitter but purely random and very slow (~2-3 years to climb from bottom to top 5).

---

## 4. WORLD EVOLUTION

### Changes Over Time

| System | Time Scale | Change |
|--------|-----------|--------|
| AI rankings | Weekly | ±8-12 point jitter |
| AI rotation | Yearly | Bottom 3 replaced, 3 new enter |
| Rival camps | Weekly | Rep jitter, fighter/coach changes |
| Player camp | Continuous | Tier upgrades, facility expansion |
| Reputation | Cumulative | Grows with wins, decays slowly |
| Promoter relationships | Per fight | +5 on accept, -8 on reject |

### What Creates Change
1. **Ranking jitter**: Prevents complete AI stagnation
2. **Yearly rotation**: Bottom 3 AI fighters retire yearly
3. **Player progression**: Training, tier upgrades, reputation growth
4. **Title chapter system**: Regional → National → Minor → Major → Premier
5. **Aging/retirement**: Player fighters eventually decline and retire
6. **Prospect expiry**: 12-week window creates urgency

### What Keeps the World Stable
1. **AI champions never lose**: Top of divisions frozen until player acts
2. **No AI vs AI fights**: Rankings are cosmetic without player involvement
3. **Fixed prospect quality**: No "generational talent" outliers
4. **No external shocks**: No promotions folding, no rule changes
5. **Fixed reputation thresholds**: Requirements don't scale with world age

---

## 5. EMERGENT STORIES

### Stories That CAN Emerge

| Story | Mechanics | Narrative |
|-------|-----------|-----------|
| **Long Title Reigns** | Unbounded defenses, static AI challengers | "The Era of [Name]" |
| **Rivalries** | Career Identity System — 2nd/3rd fight notifications | "[A] vs [B] III — the rubber match" |
| **Cinderella Runs** | Scout grade C → champion via training | "From Unknown to Champion" |
| **Veteran Gatekeepers** | 15+ fights, ~50% win rate → "Gatekeeper" tag | "The test every prospect must pass" |
| **Declining Champions** | Age 31+ chin decay + retirement threat | "Can the old lion make one last run?" |
| **Prospect Breakthroughs** | S-grade prospect → debut win | "The Next Generation Arrives" |

### Stories That CANNOT Emerge

- AI champion dynasties (no off-screen fights)
- Cross-promotion wars (no competing promotions)
- Weight class drama (no division creation/merging)
- Comeback from retirement (once retired, gone)
- Mentor-protégé narratives (mechanics exist but no story content)
- Inter-generational rivalries (no connection between eras)

---

## 6. LONG-TERM RISKS (20+ Years)

### 6.1 Player Skill Inflation
Player fighters train weekly with 11 growth multipliers. AI fighters never train. After 3+ years, player fighters at 85+ attributes face AI opponents at ~55-70. Fights become increasingly one-sided.

### 6.2 Population Dependency
Player must actively scout to maintain roster. No auto-generation. No free agent pool. Prospect pipeline can dry up if player is distracted.

### 6.3 Repetitive Champions
Every title defense generates the same archetype of opponent. No "rising threat" narrative. No contender who "earned their shot" through wins. Just `genFighter(1.45)` with a new name.

### 6.4 Weak AI Prospect Ceiling
AI prospects always level 0.5-0.85. No "generational talents" ever emerge naturally. The player can only find elite talent through high-grade scouting.

### 6.5 Stagnant Division Tops
Top 12 AI fighters in unchallenged divisions never change. Same champion for decades. Rankings jitter reshuffles but same names persist.

### 6.6 Division Ecology
5-7 of 8 divisions are "dead" at any time. The world simulation is a stage for the player, not a living ecosystem.

---

## 7. OVERALL ASSESSMENT

**The world simulation is a single-player progression engine, not a living MMA ecosystem.**

It's **adequate for 5-10 year saves** (1-2 fighter generations). Beyond that, AI dynamism fades, the skill gap widens, and the world doesn't react to player dominance.

**Grade: C+** — Functional for its purpose, but the simulation depth doesn't match the career depth.
