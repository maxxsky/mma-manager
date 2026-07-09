# 🎮 MMA Manager — Player Decision Space Audit

> **Date:** 2026-07-10  
> **Scope:** Every meaningful player decision — resources, consequences, trade-offs, obsolescence  
> **Method:** Traced all UI interaction points, dispatch calls, and event handlers

---

## 1. DECISION CATALOG

### 1.1 Camp Management Decisions

#### Facility Upgrades (`UPGRADE_FACILITY`)

| Attribute | Detail |
|-----------|--------|
| **When** | Any time, in Facility tab |
| **Resources** | Cash: `lvl * (15000 + campTier * 10000)` |
| **Options** | 4 facilities: Mats, Ring, Weights, Medical. Each has 2-6 levels depending on camp tier |
| **Short-term** | -Cash, +training bonus per facility level (+6% per level above 1) |
| **Long-term** | Cumulative training speed boost across all fighters. Medical reduces injury costs |
| **Trade-off** | Facilities vs coach salaries vs tier upgrades — shared cash pool |

**Assessment:** ⚖️ Meaningful trade-off. Facilities are a long-term investment with compound returns. Always worth upgrading Medical first for injury reduction, then training facilities.

#### Camp Tier Upgrade (`UPGRADE_TIER`)

| Attribute | Detail |
|-----------|--------|
| **When** | Reputation threshold met, in Facility tab |
| **Resources** | Cash: $25K (Regional) → $250K (World-Class). Reputation requirement: 15 → 75 |
| **Options** | 5 tiers from Local Gym to World-Class Institute |
| **Short-term** | -Large cash, +roster cap, +coach cap, +facility max levels, +training bonus |
| **Long-term** | Unlocks higher-tier fight offers, better sponsor deals, more coaches, larger roster |
| **Trade-off** | Delaying tier upgrade saves cash for facilities/coaches but caps growth |

**Assessment:** ⚖️ Meaningful trade-off. Tier upgrades gate the entire game progression. Timing matters — upgrade too early and you can't afford coaches/facilities; too late and you're capped.

#### Coach Hiring (`HIRE_COACH`)

| Attribute | Detail |
|-----------|--------|
| **When** | Coach market refreshes monthly (2-7 coaches based on rep) |
| **Resources** | Monthly salary: `skill × 1600-2400` |
| **Options** | 5 specialties: Striking, Wrestling, BJJ, S&C, Head. Skill level 1-10. 4 personalities |
| **Short-term** | -Salary commitment, +training bonus for matching specialty |
| **Long-term** | Compound training boost. Coaches grow skill over time (+0.5/year). Salaries increase 5% per skill point |
| **Trade-off** | Coach cap vs roster cap vs facility budget. Wrong specialty = wasted slot |

**Assessment:** ⚖️ Meaningful trade-off. Coach selection is one of the most impactful long-term decisions. A level-8 matching coach gives +24% training in that attribute.

#### Coach Firing (`FIRE_COACH`)

| Attribute | Detail |
|-----------|--------|
| **When** | Any time (minimum 1 coach required) |
| **Resources** | Frees salary, loses training bonus, chemistry -8 |
| **Options** | Fire any coach except cannot go below 1 |
| **Short-term** | +Budget, -Training bonus, -Chemistry |
| **Long-term** | Opens slot for better coach. Chemistry recovers |

**Assessment:** 🟢 Rarely optimal except when coach has wrong specialty and a better option is available.

### 1.2 Training Decisions

#### Training Program (`SET_TRAINING`)

| Attribute | Detail |
|-----------|--------|
| **When** | Every week, per fighter, in FighterDetail |
| **Resources** | Cash: $100-1000/week deducted automatically |
| **Options** | 6 programs: Striking, Grappling, S&C, Sparring, Recovery, Fight Camp |
| **Short-term** | +Attributes toward ceiling, +Overtraining accumulation, -Cash |
| **Long-term** | Shapes fighter development. Fight Camp forced when booked |
| **Trade-off** | Growth speed vs overtraining risk. Specialization vs balance |

**Assessment:** ⚖️ Meaningful trade-off with meaningful consequences. The core gameplay loop.

#### Training Intensity (`SET_TRAINING intensity`)

| Attribute | Detail |
|-----------|--------|
| **When** | Every week, per fighter |
| **Resources** | None directly (cost is in injury/overtraining risk) |
| **Options** | Light (0.6× gains, 0.5% injury, +4 OT), Medium (1×, 2%, +9 OT), Hard (1.4×, 8%, +16 OT) |
| **Short-term** | +Faster growth or safer training |
| **Long-term** | Hard training → faster growth but higher injury risk and overtraining |
| **Trade-off** | Speed vs safety. Hard training early, switch to recovery when OT > 50 |

**Assessment:** ⚖️ Meaningful trade-off. The injury risk at Hard (8% per week) is significant over time. Most players oscillate between Medium and Recovery.

### 1.3 Scouting & Recruitment Decisions

#### Scout Method Selection

| Attribute | Detail |
|-----------|--------|
| **When** | Any time, in Scout tab |
| **Resources** | Cash: $50 / $500 / $2,000 / $10,000 per scout |
| **Options** | 4 tiers with quality ranges: 0.35-0.6, 0.5-0.9, 0.8-1.2, 1.0-1.45 |
| **Short-term** | -Cash, +Prospect in pool. Report accuracy based on camp reputation |
| **Long-term** | Prospect becomes roster fighter after signing. Determines fighter ceiling |
| **Trade-off** | Cash now vs fighter quality later. Higher tiers have better ceilings but cost more |

**Assessment:** ⚖️ Meaningful trade-off. Early game: budget scouts. Mid-game: national trips. Late game: Diamond in the Rough for elite prospects.

#### Prospect Selection (Sign/Pass)

| Attribute | Detail |
|-----------|--------|
| **When** | After scouting, up to 5 prospects in pool, 12-week expiry |
| **Resources** | Contract negotiation (signing bonus, manager cut %, fights, duration) |
| **Options** | Sign or pass. Report grade limits information (C hides chin/fightIQ/traits) |
| **Short-term** | -Signing bonus, -Roster slot |
| **Long-term** | Fighter joins roster. Contract terms lock for duration/fights |

**Assessment:** ⚖️ Meaningful trade-off with incomplete information. Grade C prospects are gambles. Grade S prospects are almost always worth signing.

#### Contract Negotiation (`SIGN_CONTRACT`)

| Attribute | Detail |
|-----------|--------|
| **When** | Prospect signing, contract extension, renegotiation |
| **Resources** | Signing bonus, manager cut %, fight commitment, contract duration |
| **Options** | Sliders/toggles for each term. Agent hardness affects negotiation floor |
| **Short-term** | -Signing bonus (one-time), +Fighter on roster |
| **Long-term** | Manager cut affects fight income (player keeps 1-cut%). Fight commitment binds fighter. Duration sets contract length |
| **Trade-off** | Lower cut = happier fighter but less income. Longer contract = stability but less flexibility. More fights = more income but longer commitment |

**Assessment:** ⚖️ Meaningful trade-off. One of the richest decision points in the game.

### 1.4 Fight Management Decisions

#### Fight Offer Response (Accept/Counter/Reject)

| Attribute | Detail |
|-----------|--------|
| **When** | Fight offers arrive in inbox (35% per fighter per week) |
| **Resources** | Promoter relationship, fighter morale, ranking, title status |
| **Options** | Accept, Counter (15-20% better purse, promoter relationship check), Reject |
| **Short-term** | Accept: book fight. Counter: risk rejection. Reject: -8 promoter rel, title stripped if mandatory |
| **Long-term** | Fight outcomes affect ranking, popularity, morale, record, legacy |

**Assessment:** ⚖️ Meaningful trade-off. Counter offers are a gamble — high rel = better chance. Rejecting mandatory defenses has severe consequences.

#### Staredown Attitude

| Attribute | Detail |
|-----------|--------|
| **When** | Start of FightNight |
| **Resources** | Combat modifiers, popularity |
| **Options** | Respectful (+5% footwork, +2 popularity), Professional (neutral +2 rep on win), Trash Talk (+8% striking, opponent +5%, +5 pop, lose penalty) |
| **Short-term** | +Combat modifier for this fight |
| **Long-term** | None — fight-specific only |

**Assessment:** 🟡 Low impact. Trash Talk is high-risk/high-reward. Respectful is always safe. Professional is slightly worse than Respectful in most cases.

#### Game Plan Selection

| Attribute | Detail |
|-----------|--------|
| **When** | Before fight, after weigh-in |
| **Resources** | Combat strategy |
| **Options** | Take It Down (+takedowns), Keep It Standing (+striking), Finish It (+KO/Sub, -stamina), Survive & Outpoint (+defense, -stamina drain) |
| **Short-term** | +Combat modifiers for this fight |
| **Long-term** | None — fight-specific only |

**Assessment:** ⚖️ Meaningful trade-off. Match plan to fighter archetype. Wrestler + Take It Down. Boxer + Keep It Standing. Finish It is risky (stamina burn).

#### Corner Decisions

| Attribute | Detail |
|-----------|--------|
| **When** | Between rounds, 60-second timer |
| **Resources** | Combat modifiers for next round |
| **Options** | Finish him (+aggression, -stamina), Work the body (+body damage), Save gas (+stamina recovery) |
| **Short-term** | +Combat modifier for next round |
| **Long-term** | None — round-specific only |

**Assessment:** ⚖️ Meaningful trade-off under time pressure. The 60-second timer adds urgency.

#### View Mode (Tick-by-Tick / Round Summary)

| Attribute | Detail |
|-----------|--------|
| **When** | Before fight starts |
| **Resources** | Time, engagement |
| **Options** | Tick-by-tick (slow, detailed), Round Summary (fast, overview) |
| **Short-term** | Viewing experience only |
| **Long-term** | None |

**Assessment:** 🟢 Personal preference. No gameplay impact.

### 1.5 Event Response Decisions

#### Coach Raise Request

| Attribute | Detail |
|-----------|--------|
| **When** | Coach demands raise (6% weekly chance per coach) |
| **Resources** | Cash (new salary), chemistry (-5 if denied), coach retention (15-60% resign chance if denied) |
| **Options** | Accept raise, Deny (risk resign) |
| **Short-term** | Accept: higher salary commitment. Deny: -5 chemistry, possible coach loss |
| **Long-term** | Denied 3+ times → ultimatum event. Raises compound over coach career |

**Assessment:** ⚖️ Meaningful trade-off. Good coaches are worth keeping. Denying budget coaches is fine.

#### Sparring Conflict

| Attribute | Detail |
|-----------|--------|
| **When** | Weekly 7.5% chance when roster ≥ 2 |
| **Resources** | Chemistry (+2 to +6) |
| **Options** | Separate schedules (+2 chem), Risk gamble (+6/-8), Mediate (+5 chem) |
| **Short-term** | Chemistry change |
| **Long-term** | Chemistry affects all training. Repeated conflicts build tension |

**Assessment:** 🔴 Mediate is almost always optimal (+5 chem, no risk). Risk is rarely worth it (expected value negative).

#### Fighter Jealousy

| Attribute | Detail |
|-----------|--------|
| **When** | Weekly 6% chance |
| **Resources** | Chemistry (+3), morale (+6 to specific fighter) |
| **Options** | Special attention (+3 chem, +6 morale), Ignore gamble (+2/-6) |
| **Short-term** | Chemistry + morale change |
| **Long-term** | Ignored complaints accumulate → frustration event |

**Assessment:** 🟡 Special attention is usually better unless chemistry is already high and morale is fine.

#### Fighter Viral

| Attribute | Detail |
|-----------|--------|
| **When** | Weekly 4.5% chance |
| **Resources** | Chemistry (-3 vs +3), popularity (+8) |
| **Options** | Exploit momentum (-3 chem, +8 popularity), Suppress (+3 chem) |
| **Short-term** | Chemistry vs popularity |
| **Long-term** | Popularity drives sponsor income. Chemistry drives training |

**Assessment:** ⚖️ Meaningful trade-off. Popularity is money. Chemistry is growth. Depends on camp priorities.

#### Team Bonding

| Attribute | Detail |
|-----------|--------|
| **When** | Weekly 6% chance |
| **Resources** | Chemistry (+3 free vs +6 for $5K) |
| **Options** | Let it be (+3 chem), Fund event (-$5K, +6 chem) |
| **Short-term** | Chemistry + cash change |
| **Long-term** | Chemistry is hard to raise passively — buying it is efficient |

**Assessment:** 🟢 Fund event is usually worth it if cash is available. Chemistry is scarce.

#### Contract Expiry / Renegotiation

| Attribute | Detail |
|-----------|--------|
| **When** | Duration expires, fights fulfilled, renegotiation demanded |
| **Resources** | Contract terms, fighter retention |
| **Options** | Extend contract, Release fighter |
| **Short-term** | Roster change |
| **Long-term** | Lose developed fighter vs keep with new terms |

**Assessment:** ⚖️ Meaningful trade-off. Extending veterans at higher cuts vs developing new prospects.

#### Retirement Decision

| Attribute | Detail |
|-----------|--------|
| **When** | Age 36+, yearly 15-75% chance |
| **Resources** | Reputation, morale, coach slot |
| **Options** | Honor retirement (+3 rep), Convince (morale -10, one-time), Convert to coach (lose fighter, gain coach) |
| **Short-term** | Roster change, rep/coach change |
| **Long-term** | Coach conversion preserves legacy. Honor builds rep. Convince gives one more run |

**Assessment:** ⚖️ Meaningful trade-off. Coach conversion is a unique way to preserve a legend's value.

#### Release Request (Low Morale)

| Attribute | Detail |
|-----------|--------|
| **When** | Morale < 20 for extended period |
| **Resources** | Cash ($3K-$8K bonus), morale (+30), chemistry (-5 if ignored) |
| **Options** | Release, Retention bonus, Ignore |
| **Short-term** | Roster/financial change |
| **Long-term** | Ignored complaints → frustration event |

**Assessment:** 🔴 Retention bonus is almost always optimal (+30 morale for small cash). Release loses investment. Ignore makes things worse.

#### Weight Class Change

| Attribute | Detail |
|-----------|--------|
| **When** | Conditional triggers (losing streak, win streak, age, ambition, titles) |
| **Resources** | Rank points (-20), title (vacated), weight class, natural weight |
| **Options** | Accept, Reject |
| **Short-term** | Division change, ranking reset, title loss |
| **Long-term** | New division = new opportunities. Better matchup potential |

**Assessment:** ⚖️ Meaningful trade-off. Moving up for title shots vs staying put. Moving down to escape losing streaks.

### 1.6 Financial Decisions

#### Sponsor Acceptance

| Attribute | Detail |
|-----------|--------|
| **When** | Sponsor offers arrive (8% per brand per month) |
| **Resources** | Monthly income |
| **Options** | Placement fee (stable), Royalty (60% base + performance bonus), Reject |
| **Short-term** | +Monthly income |
| **Long-term** | Sponsors expire. Max 3 active. Royalty pays more if fighters win |

**Assessment:** 🟡 Royalty is almost always better if you have active fighters. Placement is safer for rebuilding camps.

### 1.7 Roster Decisions

#### Fighter Release

| Attribute | Detail |
|-----------|--------|
| **When** | Contract expiry, low morale, retirement, player choice |
| **Resources** | Roster slot, developed fighter |
| **Options** | Release, Keep (renegotiate) |
| **Short-term** | +Roster slot |
| **Long-term** | Must develop replacement. Lost training investment |

**Assessment:** ⚖️ Meaningful trade-off. Releasing a developed fighter is painful but sometimes necessary for roster health.

---

## 2. DECISION CLASSIFICATION

### 2.1 Always Optimal Decisions

| Decision | Why Always Optimal |
|----------|-------------------|
| Upgrade Medical facility first | Injury reduction is the best ROI |
| Fund Team Bonding ($5K) | Chemistry is scarce, $5K is cheap |
| Mediate sparring conflict (+5 chem) | Highest guaranteed outcome, no risk |
| Retention bonus for unhappy fighter | $3-8K for +30 morale vs losing fighter |
| Accept S-grade prospect | Elite ceiling is always worth the slot |

### 2.2 Almost Never Worth Taking

| Decision | Why Not Worth It |
|----------|-----------------|
| Risk gamble on sparring conflict | -8 outcome is devastating, +6 not worth the variance |
| Ignore coach raise (for elite coaches) | Losing a level-7+ coach for salary savings is false economy |
| Reject mandatory title defense | -5 rep, -15 morale, stripped title — never worth |
| Ignore release request | -5 chem + eventual frustration event — worse than bonus |
| Ignore fighter jealousy with Ignore gamble | -6 morale outcome is severe |

### 2.3 Decisions with Meaningful Trade-offs

| Decision | Trade-off |
|----------|----------|
| Facility vs coaches vs tier upgrade | Shared cash pool — timing matters |
| Training intensity | Speed vs injury risk |
| Scout tier | Cash now vs prospect quality later |
| Contract terms | Cut, fights, duration all trade off |
| Fight: Accept vs Counter vs Reject | Purse vs promoter relationship risk |
| Game plan | Match fighter archetype vs opponent weakness |
| Retirement: Honor vs Convince vs Coach | Rep, one more fight, or staff conversion |
| Weight class change | Reset ranking for new opportunities |
| Sponsor: Placement vs Royalty | Stability vs upside |
| Viral: Exploit vs Suppress | Popularity (money) vs Chemistry (growth) |

### 2.4 Decisions That Become Obsolete

| Decision | When Obsolete | Why |
|----------|--------------|-----|
| Budget scouts ($50-500) | Rep 60+ | Better tiers give higher ceiling prospects |
| Local fight offers | Rep 40+ | Regional+ offers pay more and rank better |
| Roster cap concerns | Tier 4 (14 fighters) | Ample space for all needs |
| Cash management | Late game (cash > $500K) | Money stops being a constraint |
| Chemistry events (all) | Chemistry > 80 | Diminishing returns — extra chemistry doesn't help |
| Training intensity (Hard) | Near ceiling | Gains are already capped by capMult (0.3 at 90%) |
| Recovery weeks | Overtraining < 25 | No penalty at low OT |

---

## 3. DECISION FREQUENCY

| Decision Type | Per Week (avg) | Per Year | How Often Player Must Engage |
|--------------|---------------|----------|------------------------------|
| Training program/intensity | 5-14 (per fighter) | 260-728 | Every week |
| Fight offers | 1-3 | 50-150 | Every 1-3 weeks |
| Camp events | 0.3 | 15 | Every 3-4 weeks |
| Contract/retirement | 0.05-0.1 | 3-5 | Every 10-20 weeks |
| Scout | As needed | 5-20 | Burst activity |
| Coach hire/fire | Every 2-3 months | 4-6 | Infrequent |
| Facility/tier upgrade | Every 6-12 months | 1-2 | Rare |
| Sponsor | Every 1-2 months | 6-12 | Occasional |

---

## 4. RESOURCE ECONOMY

All decisions draw from a shared resource pool:

| Resource | Sources | Sinks | Scarcity |
|----------|---------|-------|----------|
| **Cash** | Fight purses, sponsors, training fees | Coaches, facilities, scouting, medical, bonuses | High early, low late |
| **Chemistry** | Team bonding, mediation, winning, Team Players, Player's Coach | Conflicts, jealousy, losses, Diva | Always scarce (0-100 scale) |
| **Morale** | Wins, bonuses, attention | Losses, injuries, ignored complaints | Per-fighter, volatile |
| **Reputation** | Wins, title wins, retirement honor | Losses, title stripping, scandals | Slow accumulation |
| **Roster Slots** | Camp tier upgrades | New signings | Constrained early, ample late |
| **Coach Slots** | Camp tier upgrades | New hires | Constrained early |
| **Time** | Game weeks | Training, injury recovery, scouting | The ultimate resource |

---

## 5. OVERALL ASSESSMENT

### Player Agency: HIGH

The player has meaningful control over:
- **Which fighters to develop** (scouting, training, contract decisions)
- **How to develop them** (training program, intensity, coach matching)
- **When to fight** (accepting offers, countering, short notice)
- **How to fight** (game plan, corner decisions, attitude)
- **Camp composition** (roster, coaches, facilities, tier)
- **Financial strategy** (sponsors, spending priorities, cash reserves)
- **Career arcs** (retirement, weight class changes, legacy building)

### Decision Density: MODERATE-HIGH

- **Weekly loop**: Training decisions (5-14 per week) + fight offers (1-3) + occasional events
- **Monthly loop**: Financial settlement, coach market refresh, world events
- **Quarterly loop**: Scouting runs, contract reviews, facility upgrades
- **Yearly loop**: Retirement checks, AI rotation, tier upgrade consideration

### Depth vs Breadth

- **Rich decisions**: Contract negotiation, training program selection, retirement choices
- **Shallow decisions**: View mode, "always optimal" event responses, sponsorship type (Royalty usually wins)
- **Missing depth**: No formation/tactics system, no fight camp duration management, no fighter specialization paths beyond training

### The Real Game

The core loop is: **Train → Fight → Earn → Reinvest → Repeat**. Within this, the player constantly balances:
1. Short-term fight readiness vs long-term development
2. Cash spending vs saving for upgrades
3. Roster expansion vs quality depth
4. Risk (hard training, counter offers, Trash Talk) vs safety

The decisions that matter most are the ones with **compound effects**: training (weeks × multipliers), coach hiring (years × salary), facility upgrades (permanent bonuses), and contract terms (lock-in for months).

**Grade: B+** — Rich decision space with meaningful consequences, but some decisions are solved (always-optimal patterns) and late-game cash abundance removes financial tension.
