# 🏕️ MMA Manager — AI Camp Management Audit

> **Date:** 2026-07-10  
> **Scope:** Rival camps, AI fighters, world simulation — all AI-driven camp behavior  
> **Method:** Traced every AI system through `rivals.js`, `state.js`, `world.js`, `rankings.js`

---

## 1. CAMP BUILDING

### 1.1 Fighter Recruitment

**What AI camps do:** NOTHING.

Rival camps are generated once at game start with 4-6 fighters (or 2-3 for Elite Stables). These fighters are never replaced, never added to, never changed. The initial generation is the final roster.

Division AI fighters (120 total across 8 divisions) are generated once at game start. The bottom 3 retire and 3 new prospects enter every 48 weeks — but these are individual fighters, not camp-affiliated. They exist purely as ranking entries.

**AI camps do not:** scout prospects, sign free agents, recruit from other camps, or expand their roster.

### 1.2 Prospect Scouting

**What AI camps do:** NOTHING.

Rival camps have a `lastScoutWeek` property in their data structure (`rivals.js:24`) but it is never updated and never used in any simulation logic. The scouting system is entirely player-only.

**AI camps do not:** send scouts, generate prospect reports, evaluate prospect quality, or sign prospects.

### 1.3 Coach Hiring

**What AI camps do:** Generate coaches once. Elite Stables get 2 coaches; all others get 1. These coaches never change. They never gain skill. They never leave. They never get hired away.

The coach poaching system (`state.js:1005-1035`) allows AI camps to attempt to poach the PLAYER's coaches — but AI camps never poach from each other, and their own coaches are never poached.

**AI camps do not:** hire new coaches, fire coaches, develop coach skills, or respond to coach market changes.

### 1.4 Facility Upgrades

**What AI camps do:** NOTHING.

Rival camps have no facilities data structure. They have no facility levels. The facility system is entirely player-only.

**AI camps do not:** upgrade facilities, maintain facilities, or receive facility bonuses.

### 1.5 Camp Growth Strategy

**What AI camps do:** Reputation jitter only.

Rival camp reputation receives ±2 random movement per week (the same jitter applied to AI ranking fighters). Their rep fluctuates randomly between 5-35 (their generation range).

**AI camps do not:** upgrade camp tier, expand capacity, grow reputation through achievements, or have any growth strategy.

### 1.6 Budget Management

**What AI camps do:** Have a static cash value.

Rival camps are generated with `cash: RI(30000, 100000)`. This cash value is never spent, never earned, never checked. It exists purely as a data field with no mechanical effect.

**AI camps do not:** earn income, pay expenses, manage budgets, or go bankrupt.

---

## 2. FIGHTER MANAGEMENT

### 2.1 Training Decisions

**What AI camps do:** NOTHING.

AI fighters have `training` fields (type and intensity) set at generation. These are never updated. AI fighters never train. Their attributes never improve or decline. They fight at their generation stats forever.

**AI camps do not:** assign training programs, manage intensity, handle overtraining, or develop fighters.

### 2.2 Development Strategy

**What AI camps do:** NOTHING.

AI fighters do not improve. A prospect generated at level 0.5 stays at level 0.5 forever. A champion generated at level 1.4 stays at level 1.4 forever. There is no attribute progression curve for AI fighters.

The world simulation (`world.js:ageAIFighters`) provides lightweight age-based skill adjustment for division fighters: ±0.005-0.02 per level per year. But this is applied to the division list entries, not to rival camp fighters.

**AI camps do not:** develop young fighters, manage prime years, handle decline, or have any development philosophy.

### 2.3 Recovery Management

**What AI camps do:** NOTHING.

AI fighters can be generated with injuries (via `genFighter`), but these injuries never heal. AI camps have no recovery management. They have no medical facilities. They have no concept of injury risk.

**AI camps do not:** manage recovery, handle injuries, prevent overtraining, or address fighter health.

### 2.4 Retirement Handling

**What AI camps do:** NOTHING.

Rival camp fighters never retire. They stay on the roster forever at their generation stats.

Division AI fighters retire only through the bottom-3 rotation system (every 48 weeks), which is a world-level mechanic, not a camp-level decision.

**AI camps do not:** retire aging fighters, hold retirement ceremonies, convert fighters to coaches, or honor legendary careers.

### 2.5 Releasing Fighters

**What AI camps do:** NOTHING.

Rival camp rosters are static. No fighter is ever released, traded, or let go.

**AI camps do not:** release underperforming fighters, manage roster size, clear space for prospects, or respond to contract demands.

### 2.6 Replacing Retired Fighters

**What AI camps do:** NOTHING.

Since rival camp fighters never retire, there is no replacement cycle.

**AI camps do not:** draft replacements, promote from within, or backfill roster gaps.

---

## 3. CONTRACT MANAGEMENT

### 3.1 Contract Renewals

**What AI camps do:** NOTHING.

AI fighters have contracts assigned at generation. These contracts are never renegotiated, never expired, never enforced.

**AI camps do not:** renew contracts, negotiate terms, handle contract disputes, or manage free agency.

### 3.2 Salary Decisions

**What AI camps do:** NOTHING.

AI fighter salaries are part of their contract data. They are never paid. AI camp cash is never deducted.

**AI camps do not:** pay salaries, manage payroll, handle raises, or negotiate compensation.

### 3.3 Fighter Retention

**What AI camps do:** NOTHING.

Fighters never leave AI camps. There is no free agency system. There is no transfer market. Fighters are permanently bound to their generated camp.

**AI camps do not:** retain fighters, lose fighters to free agency, or compete for talent.

### 3.4 Free Agent Recruitment

**What AI camps do:** NOTHING.

There is no free agent pool. No fighter market. No transfer system.

**AI camps do not:** recruit free agents, bid on available fighters, or sign unattached talent.

---

## 4. COMPETITIVE STRATEGY

### 4.1 Fight Acceptance

**What AI camps do:** NOTHING.

AI camps do not accept or decline fights. They do not receive fight offers. They do not have a fight schedule.

The only "fights" involving AI camps are simulated in the rival simulation block (`state.js:940-980`), which randomly pairs fighters from rival camps for exhibition matches that only generate log entries. No fight engine is used. No outcomes are tracked.

The AI title defense system (`world.js:simulateAITitleDefenses`) generates outcomes for AI division champions, but these are lightweight probability checks, not simulated fights.

**AI camps do not:** accept fights, decline fights, counter offers, or manage fight schedules.

### 4.2 Title Fight Decisions

**What AI camps do:** NOTHING.

AI camps do not pursue titles. They do not request title shots. They do not defend titles. Title fights involving AI fighters only happen when the player challenges the AI champion.

**AI camps do not:** pursue championships, defend belts, or manage title fight strategies.

### 4.3 Matchmaking Preferences

**What AI camps do:** NOTHING.

There is no matchmaking system for AI camps. Fighters are never paired against specific opponents by their camps.

**AI camps do not:** select opponents, avoid bad matchups, seek favorable matchups, or build fighter records strategically.

### 4.4 Risk Tolerance

**What AI camps do:** NOTHING.

There is no risk assessment. No decision-making under uncertainty. No strategic trade-offs.

**AI camps do not:** evaluate risk, take calculated gambles, protect assets, or make aggressive moves.

### 4.5 Short Notice Behavior

**What AI camps do:** NOTHING.

Short notice fights are generated for the player's fighters only.

**AI camps do not:** accept short notice fights, prepare on short notice, or handle last-minute changes.

---

## 5. LONG-TERM PLANNING

### 5.1 Building for the Future

**What AI camps do:** NOTHING.

AI camps have no future planning. They do not develop prospects. They do not stockpile resources. They do not prepare for transitions.

### 5.2 Rebuilding After Decline

**What AI camps do:** NOTHING.

Since AI camps never decline (their fighters never age, their rep only jitters), there is no rebuild phase.

### 5.3 Championship Windows

**What AI camps do:** NOTHING.

AI camps have no concept of championship windows. They do not push for titles when strong. They do not rebuild when weak.

### 5.4 Prospect Development Pipeline

**What AI camps do:** NOTHING.

There is no development pipeline. No youth system. No prospect tracking. No succession planning.

### 5.5 Recovery From Poor Decisions

**What AI camps do:** NOTHING.

AI camps make no decisions, so there are no poor decisions to recover from.

---

## 6. CAMP IDENTITY

### 6.1 Do AI Camps Develop Identities?

**At generation only.** Rival camps are assigned one of 5 traits:
- Striking Factory (striking bonus)
- Wrestling Hub (wrestling bonus)
- BJJ Academy (BJJ bonus)
- Prospect Mill (fast fighter regeneration — effect never used)
- Elite Stable (higher quality, smaller roster)

These traits affect initial fighter generation (Elite Stables get higher-level fighters) and the rival camp's `trait` label. But they have no ongoing effect. A "Striking Factory" camp doesn't produce better strikers over time. An "Elite Stable" doesn't maintain elite standards.

### 6.2 Are AI Camps Interchangeable?

**Yes. Completely.** Beyond their name and initial trait label, all AI camps behave identically. Two rival camps with different traits are indistinguishable in every measurable way after generation.

### 6.3 Identities That Could Exist But Don't

| Identity | Would Require | Status |
|----------|--------------|--------|
| Prospect Factory | Scouting + signing young fighters | ❌ No scouting system |
| Elite Championship Camp | Title pursuit + defense | ❌ No fight system |
| Wrestling Camp | Training wrestling specialization | ❌ No training system |
| Striking Camp | Training striking specialization | ❌ No training system |
| Veteran Camp | Retaining aging fighters | ❌ No aging system |

---

## 7. WORLD INTERACTION

### 7.1 Interaction with Fighters

AI camps interact with fighters only at generation. After that, the fighter data is static.

### 7.2 Interaction with Coaches

AI camps generate coaches at creation. These coaches are never referenced again except in the poaching system (where AI camps attempt to poach the PLAYER's coaches).

### 7.3 Interaction with Sponsors

None. AI camps have no sponsors. No sponsor offers. No sponsor income.

### 7.4 Interaction with Contracts

None beyond initial generation. Contracts are never enforced.

### 7.5 Interaction with World Events

AI camps are passive recipients of world events. They appear in:
- Rival camp rep jitter (weekly ±2)
- Coach poaching events (targeting the player)
- Rivalry tracking (player-initiated)

They do not initiate world events. They do not respond to world events.

### 7.6 Interaction with Rival Camps

Rival camps have a `rivalry` field (0-100) that tracks the player's rivalry with that camp. This value changes based on player actions (poaching, fight outcomes). AI camps never interact with each other.

---

## 8. COMPETITIVE BALANCE

### 8.1 AI Resource Management

There are no AI resources to manage. AI camps have static cash that is never used, static rosters that never change, and static facilities that don't exist.

### 8.2 AI Roster Quality

Fixed at generation. Never improves. Never declines. A rival camp generated at game start with fighters at level 0.35-0.85 will have those same fighters at those same levels 500 weeks later.

### 8.3 AI Adaptation Over Decades

Zero. AI camps do not adapt to player success, world changes, or competitive pressure. The world simulation provides lightweight division fighter aging, but this doesn't affect rival camps.

### 8.4 AI Competitiveness Against the Player

AI camps are competitive at game start but rapidly fall behind. A player fighter who trains for 40 weeks gains ~20-30 attribute points. AI fighters gain nothing. By week 50, a player fighter at 75+ attributes faces AI fighters at 40-60 attributes.

### 8.5 AI vs AI Progression

There is no AI vs AI progression. AI camps don't compete with each other in any meaningful way. The division ranking jitter creates the illusion of competition, but no fights are simulated between AI fighters.

---

## 9. OVERALL ASSESSMENT

### What AI Camps Actually Are

AI camps are **static data containers** — not active agents. They are opponent generators that create fighter names and stats once, then sit unchanged for the entire campaign. They have:

- ✅ Names and identity labels
- ✅ Fighter rosters (static)
- ✅ Coach rosters (static)
- ✅ Reputation (mildly dynamic via jitter)
- ✅ A rivalry score with the player

They do NOT have:
- ❌ Any decision-making capability
- ❌ Any resource management
- ❌ Any fighter development
- ❌ Any long-term planning
- ❌ Any competitive strategy
- ❌ Any roster management
- ❌ Any financial system
- ❌ Any scouting or recruitment
- ❌ Any contract management
- ❌ Any interaction with each other

### The Gap Between Player and AI

| System | Player | AI |
|--------|--------|-----|
| Training | 12-multiplier system, 6 programs, 3 intensities | None |
| Scouting | 4 tiers, grade system, prospect management | None |
| Contracts | Negotiation, expiry, renegotiation | None |
| Facilities | 4 facilities, 6 levels each | None |
| Coaches | Hire/fire, 5 specialties, 4 personalities | Static |
| Finance | Income/expense tracking, budget management | None |
| Fighter dev | Age curve, ceiling, injury, retirement | None |
| Fight scheduling | Accept/counter/reject, title pursuit | None |
| Legacy | Career history, milestones, Hall of Fame | None |

### Grade: F

AI camps are not camps. They are not managers. They are not even active participants in the simulation. They are **static data structures with names** — opponent generators that exist solely to give the player something to compete against.

**This is the single largest missing system in the game.** The world simulation and dynasty systems that were added provide background flavor, but AI camps themselves remain hollow shells. Every system that makes the player's camp interesting (training, development, contracts, finances, scouting, legacy) is completely absent from AI camps.

The game is functional as a single-player experience because the player doesn't NEED AI camps to do anything — the player just needs opponents to fight. But the world does not feel alive because the AI camps that populate it are not alive.
