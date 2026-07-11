# Knowledge: World

> **Domain:** World simulation, time advancement, AI progression, rankings, titles, matchmaking
> **Audience:** AI agents implementing or modifying world simulation features
> **Version:** 1.0

---

## 1 — Purpose

World is the simulation engine that makes the game feel alive. When the player presses "Next Week," World advances time and orchestrates every system that needs to respond to that advancement: Training grows fighters, Combat resolves booked fights, AI camps develop their own fighters, Rankings update, and Events generate stories. World is the conductor — it does not play the instruments, but it decides when each one enters.

World also maintains the illusion that the game continues even when the player is not interacting with it. AI fighters train, fight, win titles, lose titles, age, and retire — all without requiring the player's attention. This makes the world feel like a living ecosystem rather than a static backdrop for the player's actions.

---

## 2 — World Philosophy

### The world does not wait for the player

The player is the most important actor in the world, but not the only one. While the player manages their camp, AI camps are also training fighters, accepting fights, winning and losing titles. The player should feel like a participant in a living sport, not the sole inhabitant of a theme park built for them.

### Fair simulation, not scripted outcomes

AI fighters succeed or fail through the same systems the player's fighters use. They train with the same growth formulas, fight with the same combat engine, and age with the same decline curves. The AI does not get hidden bonuses or penalties — it simply makes different decisions (or no decisions, relying on default behaviors) than the player.

### Consistency is the highest virtue

A world that behaves unpredictably breaks trust. If a fighter retires at 32 in one save and 40 in another with identical conditions, the player cannot plan. Deterministic simulation (same inputs → same outputs) enables testing, debugging, and player trust. RNG introduces variance, but that variance must be controllable and reproducible.

### The world feels alive through change

A static world where the same 10 champions hold their belts for 50 years is boring. A chaotic world where titles change hands every week is confusing. The simulation should find a middle ground: enough stability that the player can track rivalries and narratives, enough change that the landscape evolves over time.

### Time is the primary resource

Every system in the game is gated by time. Training takes weeks. Recovery takes weeks. Fight camps take weeks. Title shots take weeks to materialize. World is the keeper of time — it decides what happens when, and in what order. The order of operations within a weekly tick is one of the most consequential design decisions in the entire game.

---

## 3 — Design Goals

- **The world feels alive** — AI fighters have careers, not just existence. They debut, rise, peak, decline, and retire.
- **Player and AI share the same rules** — no hidden AI bonuses, no player-exclusive mechanics. Difference comes from decision quality, not system favoritism.
- **Time advancement is predictable** — the player knows what happens each week and can plan around it.
- **Rankings reflect reality** — the best fighters rise to the top. Upsets happen but don't dominate.
- **Divisions maintain healthy populations** — new fighters enter as old ones retire. No division should ever collapse to zero fighters.
- **Titles have meaning** — winning a title is a career-defining achievement that the simulation respects.
- **The simulation is deterministic with controlled randomness** — given the same seed, the world produces the same outcomes. This enables debugging and testing.

---

## 4 — Non Goals

- **Not a calendar app** — World tracks weeks, months, and years, but does not manage scheduling or reminders.
- **Not a narrative generator** — World produces the raw events that Narrative interprets into stories.
- **Not a matchmaker** — World maintains the conditions for matchmaking (rankings, available opponents) but the actual fight offer generation is owned by Fight Offers.
- **Not a save system** — World provides state to be saved, but persistence logic is owned by Save/Load.
- **Not responsible for UI** — World advances state; the UI observes and renders that state.
- **Not an AI decision-maker** — World simulates AI fighter progression, but complex AI decisions (game plans, training programs) use simplified defaults rather than full decision trees.

---

## 5 — Responsibilities

### World owns

- Time advancement (week counter, month detection, year detection)
- Orchestration of weekly tick phases (the order things happen)
- AI fighter generation and population management
- AI fighter progression (attribute growth, aging, decline)
- AI title defenses and title changes
- Division health maintenance (ensuring minimum population)
- AI retirement decisions
- AI fighter debut and introduction
- AI camp simulation (rival camps developing alongside the player)
- Ranking calculations across all divisions
- Trigger conditions for periodic events (monthly, yearly, seasonal)

### World does NOT own

- Player fighter training — owned by Training
- Fight simulation — owned by Combat
- Fight offer generation — owned by Fight Offers
- Event narrative generation — owned by Events / Narrative
- Economy calculations — owned by Economy
- Save persistence — owned by Save/Load
- UI rendering — owned by Presentation layer
- Player decisions — everything the player does is through reducers, not World

---

## 6 — Mental Model

### World as Conductor

```
                         ┌─────────────────┐
                         │     WORLD        │
                         │   (conductor)    │
                         └────────┬────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
            ▼                     ▼                     ▼
      ┌──────────┐         ┌──────────┐         ┌──────────┐
      │ TRAINING │         │  COMBAT  │         │  EVENTS  │
      │ (grows)  │         │ (tests)  │         │(narrates)│
      └──────────┘         └──────────┘         └──────────┘
            │                     │                     │
            └─────────────────────┼─────────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │   RANKINGS +     │
                         │   DIVISIONS      │
                         │   (organizes)    │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │     ECONOMY      │
                         │   (settles)      │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │   UI REFRESH    │
                         │   (displays)    │
                         └─────────────────┘
```

### Thinking in Time Scales

World operates on three nested time scales. Each scale triggers different behaviors:

| Scale | Frequency | What Happens |
|-------|-----------|--------------|
| **Weekly** | Every tick | Training, recovery, chemistry, fight offers, rival activity, narrative beats |
| **Monthly** | Every 4 weeks | Finances, sponsor payments, coach growth, ranking recalculation, weight class changes |
| **Yearly** | Every 48 weeks | Aging, retirement checks, division health, major narrative events, Hall of Fame evaluation |

AI should think about which scale is appropriate for any new mechanic. Adding a yearly check to a weekly loop is wasteful. Adding a weekly mechanic that should be monthly disrupts the game's rhythm.

---

## 7 — System Relationships

World does not operate on fighters directly — it triggers systems that do. Understanding these relationships is essential for knowing where to place new logic.

### Reads (World → System)

World reads state from these systems to make decisions:

| System | What World Reads | Purpose |
|--------|-----------------|---------|
| **Fighter** | All fighter data (player and AI) | Determine who trains, fights, ages, retires |
| **Division** | Champion status, rankings, population | Maintain division health, schedule title fights |
| **Economy** | Camp cash, sponsor status | Trigger financial events, determine AI camp behavior |
| **Rivals** | Rival camp state, rivalry intensity | Drive grudge matches, poaching, competitive dynamics |
| **Save State** | Week counter, game flags | Know where in the timeline we are |

### Triggers (World → System)

World triggers these systems to act:

| System | Trigger | When |
|--------|---------|------|
| **Training** | `tickTraining(world)` | Every week (all fighters, player and AI) |
| **Combat** | Fight resolution for AI vs AI fights | When booked AI fights reach their date |
| **Rankings** | Recalculate division rankings | Monthly + after significant results |
| **Fight Offers** | Generate offers for player fighters | Weekly (based on rankings and availability) |
| **Events** | Generate world events | Weekly (random) + Monthly (scheduled) + Yearly (major) |
| **Narrative** | Generate narrative beats | Weekly (from simulation data) |
| **Economy** | Monthly settlement | Every 4 weeks |
| **Save** | Trigger save | After tick completion (auto-save) |

### Important Distinction

World triggers these systems but does not implement their logic. World says "it is time for training to happen" and Training handles the details. World says "this AI fighter should fight this opponent" and Combat resolves the outcome. This separation is intentional — World is the scheduler, not the executor.

---

## 8 — World Lifecycle

The weekly tick is the heartbeat of the game. Here is the conceptual flow when the player presses "Next Week":

```
┌──────────────────────────────────────────────────────────────────┐
│                        WEEKLY TICK                               │
│                                                                  │
│  PLAYER PRESSES "NEXT WEEK"                                      │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 1: ADVANCE TIME                                    │    │
│  │ • Increment week counter                                 │    │
│  │ • Detect month boundary (every 4 weeks)                  │    │
│  │ • Detect year boundary (every 48 weeks)                  │    │
│  │ • Check for scheduled events (booked fights due)         │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 2: PLAYER CAMP                                     │    │
│  │ • Training — all player fighters grow                   │    │
│  │ • Recovery — injured fighters heal                      │    │
│  │ • Chemistry — camp relationships evolve                  │    │
│  │ • Overtraining — accumulate or decay                     │    │
│  │ • Morale — natural drift toward baseline                 │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 3: FIGHT OFFERS                                     │    │
│  │ • Generate potential matchups for unbooked fighters      │    │
│  │ • Consider rankings, weight class, availability          │    │
│  │ • Deliver offers to player inbox                         │    │
│  │ • Expire old offers that were not accepted               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 4: AI WORLD SIMULATION                             │    │
│  │ • AI fighter training and growth                         │    │
│  │ • AI fighter aging and attribute changes                 │    │
│  │ • AI title defenses (random matchups with contenders)    │    │
│  │ • Title changes (AI champion defeated)                   │    │
│  │ • AI fighter retirements                                 │    │
│  │ • New AI fighter debuts (replacing retirees)             │    │
│  │ • Rival camp progression and activity                    │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 5: DIVISION MAINTENANCE                            │    │
│  │ • Recalculate rankings for all divisions                │    │
│  │ • Ensure minimum division population                     │    │
│  │ • Process weight class changes                           │    │
│  │ • Process champion movement (double champ scenarios)     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 6: PERIODIC SETTLEMENT                             │    │
│  │  [IF MONTHLY]                                            │    │
│  │  • Financial settlement (income, expenses, sponsors)    │    │
│  │  • Coach growth and development                          │    │
│  │  • Fighter requests (contract, training changes)         │    │
│  │                                                          │    │
│  │  [IF YEARLY]                                             │    │
│  │  • Fighter aging (all fighters age +1 year)             │    │
│  │  • Retirement eligibility checks                         │    │
│  │  • Historical record updates                             │    │
│  │  • Hall of Fame evaluation                               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 7: EVENT GENERATION                                │    │
│  │ • Generate weekly events (camp stories, fighter moments) │    │
│  │ • Generate periodic events (monthly, yearly narratives)  │    │
│  │ • Deliver events to inbox                                │    │
│  │ • Process event outcomes and consequences                │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 8: FINALIZATION                                    │    │
│  │ • Cap log entries (prevent unbounded growth)             │    │
│  │ • Check win/loss conditions                              │    │
│  │ • Trigger auto-save                                      │    │
│  │ • Update UI with new state                               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  WEEK COMPLETE — PLAYER SEES UPDATED STATE                       │
└──────────────────────────────────────────────────────────────────┘
```

### Phase Ordering is Sacred

The order of phases within the tick is a critical design constraint. If training runs before recovery, injured fighters train by mistake. If fight offers run before rankings update, they use stale data. If events run before combat, they can't reference fight results. Phase ordering is not cosmetic — it prevents entire categories of bugs.

---

## 9 — Business Rules

### Time Advancement

- One tick = one week of game time.
- The week counter advances exactly once per tick.
- Month boundaries occur every 4 weeks.
- Year boundaries occur every 48 weeks.
- All periodic systems check `week % interval === 0` to determine if they should run.
- Time never moves backward. Undo is a state restoration, not time travel.

### AI Fighter Progression

AI fighters follow the same training and aging rules as player fighters, but with simplified decision-making:

- AI fighters always train at Medium intensity (balanced growth, moderate risk).
- AI fighters use a default training program based on their archetype.
- AI fighters do not choose game plans — they use the auto game plan system.
- AI fighters age at the same rate and with the same decline curves as player fighters.

The AI does not optimize. It does not min-max. It simply applies the baseline rules consistently. This means a well-managed player fighter should outperform an AI fighter of equal potential — the player's advantage comes from better decisions, not from system favoritism.

### Division Health

Every weight class division must maintain a minimum number of active fighters. When a division falls below this threshold (through retirements or fighter movement), new AI fighters are generated to fill the gap. This prevents:

- A division with no contenders for the champion
- Rankings with too few entries to be meaningful
- The player's fighter having no available opponents

New fighters are generated at a quality appropriate to their division. A new fighter in a weak division might be competitive immediately. A new fighter in a stacked division will need time to develop.

### Title Changes

Titles change hands in two ways:

- **Player-initiated**: The player's fighter wins a title fight. This is resolved by Combat.
- **AI-initiated**: An AI contender defeats the AI champion. World simulates these fights using the same Combat engine but with simplified presentation (no staged fight screen).

Title changes trigger: ranking recalculation, narrative events, historical record updates, and (for AI title changes) inbox notifications to the player.

### Retirement

Fighters retire when they reach an age threshold or when specific retirement conditions are met:

- Age-based: fighters above a certain age have increasing probability of retiring each year.
- Performance-based: fighters on extended losing streaks may retire earlier.
- Injury-based: fighters with career-threatening injuries may be forced to retire.

Retired fighters are removed from active divisions and moved to historical records. Their legacy score is calculated. Hall of Fame eligibility is evaluated.

### Debut

New fighters debut to replace retirees and maintain division populations. Debuting fighters are:

- Young (early 20s typically)
- Raw (attributes well below their ceilings)
- Assigned to a weight class based on generated physical characteristics
- Given a random archetype and traits

Debuts are announced to the player as world events when the debuting fighter shows exceptional potential.

### Matchmaking Logic

World maintains the conditions for matchmaking but does not make specific pairing decisions for player fighters. For AI vs AI fights:

- Matchups are determined by ranking proximity
- Champions defend against the top-ranked available contender
- Fighters coming off wins face fighters coming off wins (when possible)
- Rematches have a cooldown period to prevent repetitive pairings

---

## 10 — Simulation Philosophy

### The world runs on rules, not scripts

Every outcome in the world simulation should be traceable back to a rule. A fighter retires because their age exceeded the threshold and the retirement roll succeeded — not because a designer decided "this fighter should retire now." Scripted events undermine the player's trust that the simulation is fair.

### Determinism with controlled randomness

The world simulation should be deterministic when given the same random seed. This is not just for testing — it means that if a player reloads a save and makes the same decisions, they get the same world. Variance comes from the player's choices, not from the simulation being different every time.

### Gradual change over sudden shifts

A division should not go from 30 fighters to 5 in one week. Rankings should not see a fighter jump from unranked to #1 without extraordinary cause (title win). The world should evolve at a pace that feels natural — fast enough to be interesting, slow enough to be believable.

### AI camps are mirrors, not shadows

Rival camps should feel like real competitors, not cardboard cutouts. They develop fighters, hire coaches, accept fights, and build reputations. They operate on a simplified timescale (less frequent decisions, simpler optimization) but follow the same fundamental rules. The player should occasionally lose a prospect to a rival poaching them, or face a fighter trained by a rival camp — these moments make the world feel competitive.

### Systems should degrade gracefully

If a system fails or produces unexpected output, the world should continue operating. A division with zero fighters should auto-populate, not crash. A fighter with corrupted attributes should still be able to fight, using defaults. Graceful degradation is more important than perfect simulation.

---

## 11 — AI Decision Heuristics

When modifying or extending the world simulation, follow these heuristics.

### No shortcuts for AI

Never add a system that gives AI fighters advantages the player cannot access. If the player needs 20 weeks of training to gain 5 striking, the AI should need approximately the same. "Approximately" is key — AI fighters train at default intensity and may progress slightly differently, but they should never gain attributes faster than an optimally-managed player fighter.

### Use the same system for player and AI

Where possible, player and AI fighters should go through the same code paths. If a new training mechanic is added, it should apply to AI fighters automatically (with default settings). If a new combat mechanic is added, AI vs AI fights should use it the same way player fights do. Duplicating systems creates maintenance burden and introduces divergence.

### Maintain determinism

Before adding any new random element to World, consider: can this be deterministic with a good enough result? RNG should be reserved for outcomes where variance adds value (fight results, event selection, retirement timing) — not for outcomes where consistency is expected (ranking calculations, division health, financial settlement).

### Avoid sudden state changes

Events that dramatically change the world state in a single tick (mass retirements, division collapse, sudden champion changes across multiple divisions) feel buggy even if they're "working as intended." These outcomes usually indicate that a threshold was set too aggressively or that a system is not applying gradual pressure over time.

### Phase order is a design constraint

When adding a new tick phase, think carefully about where it goes in the order. A phase that reads fighter attributes should run after Training (so it sees updated values). A phase that produces events should run after Combat (so it can reference fight results). Misplaced phases produce stale data bugs that are hard to diagnose.

### Log everything important

World should produce log entries for significant events: title changes, retirements, notable debuts, division changes. These logs serve two purposes: they keep the player informed, and they create a paper trail for debugging. If something happened in the world and the player has no way to know about it, did it really happen?

---

## 12 — Extension Strategy

### Adding a world event

1. Define the trigger condition — weekly random? monthly scheduled? yearly milestone?
2. Determine what state the event reads and what state it modifies.
3. Place the event generation in the correct tick phase.
4. Ensure the player is notified if the event is significant.
5. Consider: can this event be generated by an existing system (Events) rather than World directly?

### Adding a league or organization

1. Define the organization's relationship to existing divisions — parallel? hierarchical? replacement?
2. Determine fighter eligibility — who can join, how they qualify.
3. Add scheduling logic — when do organization events occur?
4. Implement ranking or seeding — how are participants ordered?
5. Add rewards — what do fighters gain from participation?

### Adding a region

1. Define the region's identity — what makes fighters from this region distinct?
2. Add to fighter generation — region assigned at creation.
3. Determine regional effects — do regional fighters have different opportunity structures? different competition levels?
4. Add regional rankings — separate from global rankings?
5. Consider: is region cosmetic (name only) or mechanical (affects gameplay)?

### Adding a season structure

1. Define season length — how many weeks constitute a season?
2. Determine season triggers — what happens at season start? season end?
3. Add seasonal rankings or awards.
4. Implement season-based matchmaking if different from default.
5. Ensure off-season behavior is defined — what happens between seasons?

### Adding a ranking mechanic

1. Define the ranking formula — what factors determine rank? wins? opponent quality? title history?
2. Determine update frequency — real-time after every fight? weekly? monthly?
3. Add edge case handling — unranked fighters, new debuts, fighters changing weight classes.
4. Surface rankings to the player in a readable format.
5. Ensure ranking changes generate appropriate events and narrative.

### Adding a simulation mechanic

1. Identify the gap — what aspect of the world feels static that should feel dynamic?
2. Determine the timescale — should this run weekly? monthly? yearly?
3. Define player visibility — should the player see this happening? be notified? only see results?
4. Add state tracking — what new data needs to persist across ticks?
5. Consider integration — does this mechanic need to interact with Training? Combat? Economy? Events?

---

## 13 — Invariants

These must never be violated. If a change breaks one, the change is wrong.

- **Time always moves forward** — the week counter increments exactly once per tick. Never zero, never backward.
- **Every division has at least the minimum number of fighters** — auto-population runs when a division falls below the threshold.
- **AI fighters follow the same fundamental rules as player fighters** — training formulas, aging curves, combat resolution. Different decisions, same physics.
- **No fighter fights twice in one week** — a fighter can only participate in one fight per tick.
- **Retired fighters are removed from all active systems** — they do not train, fight, appear in rankings, or receive offers.
- **Title changes always produce a record** — every title change is logged in world history and triggers ranking updates.
- **The world does not crash on empty state** — if a division, roster, or any collection is empty, the system handles it gracefully (defaults, early returns, auto-population).
- **Deterministic output for identical seeds** — given the same RNG seed and the same inputs, World produces identical outputs. This is the foundation of debugging and regression testing.
- **Phase order is never rearranged without explicit architecture review** — the sequence of phases within a tick is a design decision, not an implementation detail.
- **Monthly and yearly events are gated by the week counter** — they never fire at the wrong time. A yearly event at week 47 is a bug.

---

## 14 — Common Mistakes

### Putting logic in the wrong phase

Adding retirement checks during the training phase, or adding training logic during event generation. The phase structure exists precisely to prevent this category of bug. When adding new logic, ask: "Which phase owns this concern?"

### Forgetting that AI fighters age

Implementing a system that only applies to player fighters and forgetting that AI fighters go through the same lifecycle. If player fighters gain a new attribute at age 30, AI fighters should too. If player fighters slow down at age 35, AI fighters should too.

### Division population collapse

A steady trickle of retirements without corresponding debuts will eventually empty a division. The auto-population system prevents this, but it must be tuned correctly — generate too many fighters and divisions bloat, generate too few and they starve.

### Infinite loops in simulation

A while-loop that waits for a condition that never becomes true. Common in matchmaking (looking for an available opponent when none exist) and retirement processing (trying to remove a fighter that is referenced elsewhere). Always have a maximum iteration count and a fallback.

### Stale data across phases

Phase A modifies fighter attributes, Phase B reads them, but Phase C later in the tick also reads them — and gets the pre-modification values because it cached them before Phase A ran. Avoid caching state that changes during the tick.

### RNG without seeding

Using unseeded RNG in a system that claims to be deterministic. If World uses `Math.random()` instead of the seeded RNG, debugging becomes impossible because outcomes cannot be reproduced. Every random call in World must go through the seeded RNG.

### Silent failures

A system encounters an error (null fighter, missing division) and silently returns without logging or notifying. The player sees nothing wrong, but the world is now in an inconsistent state. Failures should be loud — log the error, notify the player if relevant, and apply a safe default.

---

## 15 — Related Documents

| Document | What It Covers |
|----------|---------------|
| `PROJECT_CONSTITUTION.md` | Priority order, DoD, modification rules |
| `01_PROJECT_OVERVIEW.md` | High-level systems map, data flow |
| `02_ARCHITECTURE.md` | Layer rules, communication, ADRs |
| `knowledge/01_combat.md` | Combat domain — resolves AI vs AI fights |
| `knowledge/02_TRAINING.md` | Training domain — grows AI fighter attributes |
| `knowledge/03_FIGHTER.md` | Fighter identity — what World generates and manages |
| `knowledge/05_economy.md` (planned) | Economy domain — funds World simulation |
| `engine/state.js` | Tick orchestration implementation |
| `engine/world.js` | World simulation orchestration |
| `engine/world/ai-fighter.js` | AI fighter generation logic |
| `engine/world/config.js` | World thresholds and constants |
| `engine/world/history.js` | World history tracking |
| `engine/tick/rankings.js` | Ranking calculation |
| `engine/tick/rivals.js` | Rival camp simulation |
| `engine/shadow-ai.js` | Shadow AI camp simulation |
