# 📨 MMA Manager — Event System Audit

> **Date:** 2026-07-10  
> **Scope:** All events — inbox, tick, fight, career, world, contract  
> **Method:** Traced every `g.inbox.unshift()` and event type through all engine and UI files

---

## 1. EVENT CATEGORIES

The game has **7 event categories**, dispatched through the inbox system (`g.inbox.unshift()`):

### 1.1 Fight Offers (`type: "offer"`)

**Source:** `state.js` tick — per-fighter weekly check (35% base chance)

| Sub-type | Trigger | Probability |
|----------|---------|-------------|
| Regular fight | `random() < 0.35` per fighter per week | 35% |
| Mandatory title defense | Champion, 24+ weeks since last fight | Forced |
| Double champ attempt | Champion, every 12 weeks | 20% |
| Interim title | Champion injured 8+ weeks | Conditional |
| Short notice replacement | Any fight offer | 8% |

**Player choices per offer:**
- Accept — book the fight
- Counter — negotiate better purse (promoter relationship check)
- Reject — decline, lose promoter relationship (-8), title stripped if mandatory

**AI involvement:** Opponent generated fresh via `genFighter()` with skill based on rank. AI champion names used but stats are always fresh rolls.

### 1.2 Sponsor Offers (`type: "sponsor"`)

**Source:** `state.js` tick — monthly (week % 4 === 0)

| Trigger | Probability |
|---------|-------------|
| Per brand monthly, rep req met, not already sponsored | 8% per brand per month |
| Max 3 active sponsors enforced | Generation blocked at cap |

**Player choices:**
- Placement fee (flat monthly rate)
- Royalty (60% base + performance bonuses)
- Reject

**AI involvement:** None. Sponsors are brand entities from `SPONSOR_BRANDS` data.

### 1.3 Camp Events (`type: "event"`)

**Source:** `state.js` tick — weekly chemistry check

| Event | Trigger | Probability |
|-------|---------|-------------|
| Sparring conflict | `random() < 0.30`, roster ≥ 2, roll < 0.25 | ~7.5% |
| Coach raise demand | roll < 0.45, non-free coach | ~6% |
| Fighter jealousy | roll < 0.65, 2 fighters | ~6% |
| Fighter viral | roll < 0.80, 2 fighters | ~4.5% |
| Team bonding | roll ≥ 0.80 (else) | ~6% |

**Total camp event probability:** 30% per week when roster ≥ 2.

**Player choices per event:**

| Event | Choices |
|-------|---------|
| Sparring conflict | Separate schedules (+2 chem), Risk (+6/-8 gamble), Mediate (+5 chem) |
| Coach raise | Accept (new salary), Reject (-5 chem, coach may resign 15-60%) |
| Jealousy | Special attention (+3 chem, +6 morale), Ignore (+2/-6 gamble) |
| Viral | Exploit (-3 chem, +8 popularity), Suppress (+3 chem) |
| Team bonding | Let it be (+3 chem), Fund event (-$5K, +6 chem) |

**Systems affected:** Chemistry, morale, coach salary, coach retention, popularity, cash.

### 1.4 Contract Events (`type: "event"`)

**Source:** `state.js` tick — per-fighter monthly check

| Event | Trigger | Dedup |
|-------|---------|-------|
| Contract duration expired | `contractAge >= durationMo * 4` | `durationExpiredId` |
| Fight commitment fulfilled | `fightsLeft <= 0` | `extendFighterId` |
| Renegotiation demand | Top 10 rank OR Diva trait, not already flagged | `renegoFlagged` |
| Release request | `morale < 20` | `releaseFighterId` |
| Retirement consideration | Age ≥ 36, yearly check | `retireFighterId` |
| Fight request | No fight booked for 24+ weeks | `fightRequestId` |
| Complain (no title shot) | Ranked ≤5, no title fight for 48+ weeks | `complainId` |

**Player choices:**
- Contract events: Negotiate extension (opens NegotiateModal), Release
- Retirement: Honor (rep +3), Convince (morale -10, once per career), Convert to coach
- Release request: Release, Retention bonus ($3K-$8K +30 morale), Ignore (-5 chem)
- Fight request: Promise fight (+3 morale), Ignore (-5 morale)

### 1.5 Fight Result Events

**Source:** `FightNight.jsx` `commitResult()` — after every fight

| Event | Trigger |
|-------|---------|
| Career milestone (first win, first finish, streaks) | Automatic detection |
| Rivalry update (rematch, trilogy) | Repeat opponents |
| Title change | Title fight result |
| Giant killer | Beating top-5 ranked opponent |

### 1.6 World Events

**Source:** `engine/world.js` `worldTick()` — monthly

| Event | Trigger | Frequency |
|-------|---------|-----------|
| AI title defense result | Every 24 weeks | Per AI-champion division |
| AI prospect breakthrough | Age ≤24, top 3, points ≥80 | Conditional |
| AI win streak (5+) | Streak tracker hits 5 | Per fighter |
| AI veteran retirement | Age ≥38, 30% chance | Yearly |
| Division maintenance | Yearly | Per division |

### 1.7 Weight Class Change Events

**Source:** `state.js` tick

| Trigger | Direction | Probability |
|---------|-----------|-------------|
| Losing streak ≥ 3 | Down | 25% (50% Family Man, 35% Paycheck) |
| Age ≥ 34 + losing streak/rank >10 | Down | 30% |
| Win streak ≥ 4 (non-champ) | Up | 20% (50% Belt Chaser, 45% Legacy) |
| 3+ titles (champ) | Up | 35% (70% Legacy) |
| Top 3 ranked (non-champ) | Up | 15% (25% Belt Chaser, 30% Legacy) |

**Player choices:** Accept (move class, -20 rank points, vacate title), Reject (morale penalty).

---

## 2. EVENT PROBABILITIES — PER WEEK SUMMARY

Assuming a camp with 5 fighters, 3 coaches, 2 sponsors:

| Event | Weekly Chance | Events/Year |
|-------|--------------|-------------|
| Fight offer (per fighter) | 35% | ~91 offers/year |
| Mandatory defense | Conditional | ~2/year per champ |
| Double champ | 20% per 12 weeks | ~1-2/year per champ |
| Sponsor offer | 8% per brand | ~4/year per eligible brand |
| Camp chemistry event | 30% | ~15/year |
| Contract duration expiry | After ~96 weeks | ~1 per fighter career |
| Fight commitment expiry | After ~16-24 fights | ~1 per fighter career |
| Renegotiation demand | Top 10 or Diva | 1 per fighter |
| Release request | Morale <20 | Rare |
| Retirement | Age 36+ | 15-75% per year |
| Weight class change | As triggered | 0-2 per fighter career |
| AI title defense | Every 24 weeks | 2 per AI champ per year |
| World events | Monthly/weekly | 12-48 per year |

---

## 3. SYSTEMS AFFECTED BY EVENTS

| System | Events That Modify It |
|--------|----------------------|
| **Chemistry** | Sparring conflict, jealousy, viral, team bonding, release ignore, yearly chemistry calc (Team Player/Diva) |
| **Morale** | Jealousy, complain, fight request, renegotiation reject, release retention bonus, retirement |
| **Cash** | Coach raise, team bonding bonus, release retention, retirement coach conversion |
| **Popularity** | Viral event, fight results, Crowd Favorite, Showboat |
| **Coach salary** | Coach raise demand |
| **Coach retention** | Coach raise reject (resign chance), poaching |
| **Contract** | Duration expiry, fight commitment, renegotiation |
| **Roster** | Release, retirement, coach conversion |
| **Reputation** | Retirement honor (+3), title stripping (-5) |
| **Rankings** | Fight results (points), weight class change |
| **World history** | AI title changes, retirements |

---

## 4. PLAYER CHOICES AND CONSEQUENCES

The player makes **2-3 event decisions per game week** on average (during active play).

| Decision Type | Risk Level | Long-term Impact |
|--------------|------------|-----------------|
| Accept/counter/reject fight | Medium | Ranking, title, promoter relationship |
| Accept/reject sponsor | Low | Income stream |
| Resolve camp conflict | Low | Chemistry adjustment |
| Grant/deny coach raise | Medium | Coach retention, salary budget |
| Handle jealousy | Low | Chemistry + morale |
| Exploit/suppress viral | Low | Chemistry vs popularity |
| Fund/ignore team bonding | Low | Chemistry vs cash |
| Extend/release contract | High | Roster composition |
| Honor/convince/convert retirement | High | Rep, morale, coach acquisition |
| Release/retain unhappy fighter | High | Roster, morale, chemistry |
| Promise/ignore fight request | Medium | Morale |
| Accept/reject weight class change | High | Division, ranking, title |

---

## 5. AI INVOLVEMENT

AI generates content but **does not make decisions** about events:

| AI Role | System |
|---------|--------|
| Opponent generation | Fight offers |
| Champion names | Title fights |
| Ranking jitter | Division dynamics |
| World title defenses | AI champ vs #1 contender |
| World win streaks | AI fighter form tracking |
| Sponsor brands | Sponsor offer generation |
| Rival camp activities | Poaching, rep changes |

---

## 6. EVENT CHAINS

### Existing chains:

1. **Coach raise → resign → replacement**: Coach asks raise → player rejects → coach may resign → market refresh provides replacement
2. **Low morale → release → roster gap → scouting**: Fighter morale <25 → release request → player releases → must scout replacement
3. **Contract expiry → negotiation → extension/release**: Contract runs out → NegotiateModal → new terms or free agent
4. **Retirement → convince → final run → retirement**: Age 36+ → retirement offer → convince (once) → one more fight → retires
5. **Losing streak → weight class change → new division**: 3 losses → move down proposal → accept → -20 rank pts + new division
6. **Title win → mandatory defense → double champ → legacy**: Win title → forced defense → double champ attempt → legacy accumulation

### Missing chains:
- No event chain for rival camp interactions beyond poaching
- No chain for fighter-to-fighter relationships developing into narratives
- No chain for "prospect → contender → champion → veteran → coach"
- World events are isolated — don't chain into player-relevant content

---

## 7. RANDOM VS DETERMINISTIC EVENTS

| Event | Type |
|-------|------|
| Fight offers | Random (35% base) with deterministic tier thresholds |
| Mandatory defense | Deterministic (24 weeks trigger) |
| Sponsor offers | Random (8% per brand) |
| Camp chemistry events | Random (30% base, sub-rolled) |
| Contract expiry | Deterministic (duration/fights counters) |
| Renegotiation | Deterministic (rank threshold or Diva trait) |
| Release request | Deterministic (morale < 20) |
| Retirement | Random (15-75% per year, age-based) |
| Weight class change | Random (25-50% per condition) |
| AI title defenses | Random (25% upset chance, 24-week trigger) |

**Ratio:** ~60% deterministic, ~40% random. Most "interesting" events are on timers, not probabilities.

---

## 8. REPEATED OR REDUNDANT EVENTS

### Events that repeat frequently:

| Event | Frequency | Redundancy Risk |
|-------|-----------|----------------|
| Sparring conflict | ~4/year | Low — rotating fighters keep it fresh |
| Coach raise | ~3/year | Medium — same coach can repeat after 48 weeks |
| Jealousy | ~3/year | Medium — depends on popularity gaps |
| Team bonding | ~3/year | Low — flavor text varies |
| Fight offers | ~18/fighter/year | High — but core gameplay, not redundant |
| Sponsor offers | ~4/brand/year | Medium — limited brand pool (6 brands) |

### Events that never fire (dead/rare):

| Event | Why It's Dead |
|-------|---------------|
| Fight request | Requires 24+ weeks without fight — player must actively ignore a fighter |
| Complain (no title shot) | Requires ranked ≤5 + 48 weeks no title fight — player must be neglectful |
| Release request | Requires morale <20 — hard to achieve unless actively sabotaging |
| Coach resign | Fixed in audit but originally never triggered due to type mismatch |
| AI prospect breakthrough | Requires age ≤24 + top 3 + points ≥80 — rare combination |

---

## 9. OVERALL ASSESSMENT

### Strengths

- **7 distinct event categories** cover camp life, contracts, fights, and world
- **Meaningful player choices** with tradeoffs (chemistry vs morale vs cash vs roster)
- **Consequences cascade** — chemistry affects training, morale affects performance
- **Contract system creates urgency** — expiries and renegotiations force decisions
- **World events make AI divisions feel alive** — title changes, streaks, retirements
- **Event deduplication** prevents spam (each event type checks `g.inbox.some()` before generating)

### Weaknesses

- **Camp chemistry events repeat the same 5 types forever** — after 50 weeks, all scenarios have been seen
- **No event variety scaling with camp size/reputation** — a World-Class Institute has the same events as a Local Gym
- **World events don't affect the player** — AI title changes are purely informational
- **No inter-event reactivity** — events don't reference previous events ("After last week's sparring conflict...")
- **3 dead events** (fight request, complain, release request) require neglect that no engaged player would allow
- **No seasonal or milestone events** — no "End of Year Awards", no "Hall of Fame Induction", no "Fight of the Year"

### Replayability

The event system provides **adequate variety for 1-2 playthroughs** (~20-50 hours). After that, the repeating camp chemistry events, the static sponsor pool, and the absence of scaling or seasonal content make the event layer predictable. The core fight/contract loop remains engaging, but the "narrative layer" around it runs out of surprises.

**Grade: B** — Functional and well-structured, but lacks depth scaling and reactive storytelling.
