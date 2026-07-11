# Knowledge: Events

> **Domain:** Event generation, player notification, narrative delivery, consequence application
> **Audience:** AI agents implementing or modifying event systems
> **Version:** 1.0

---

## 1 — Purpose

Events are the narrative layer of the simulation. While World advances time and systems produce changes, Events translate those changes into experiences the player can see, understand, and respond to. An injury is a data change — an event about the injury is the player's window into that change, explaining what happened, why it matters, and what choices the player has.

Events bridge the gap between simulation and player experience. Without events, the player sees numbers changing without context. With events, the player sees a story unfolding — a fighter's rise, a rival's challenge, a camp's crisis. Events make the simulation feel alive.

---

## 2 — Events Philosophy

### Events reflect the world, they do not create it

Events are consequences of simulation state, not causes of it. A fighter does not get injured because an injury event fired — the injury event fires because the simulation determined the fighter was injured. This order is critical: state change first, event second. Events that create state changes directly bypass the systems that should own those changes.

### Narrative follows simulation

The best stories in the game emerge from the interaction of systems — a fighter overcoming long odds, a rivalry developing over multiple fights, a champion's decline. Events should surface these emergent stories, not manufacture them. A scripted "underdog victory" event means nothing if the simulation didn't actually produce an upset.

### Information before surprise

The player should understand why something happened. If a fighter suddenly retires, the events leading up to it (declining performance, increasing injuries, age milestones) should have been visible. Surprising the player with consequences they couldn't anticipate feels unfair — surprising them with consequences they saw coming feels like dramatic tension.

### Player agency over randomness

When events offer choices, those choices should have meaningful, visible consequences. A choice between "Accept" and "Decline" with identical outcomes is not a choice — it's a button press. Every decision point should change something the player cares about.

### The world does not wait for the player to read

Events accumulate in the inbox, but the world continues simulating. A fight offer expires whether the player reads it or not. This reinforces that the world is alive and the player must engage with it actively, not passively consume notifications.

---

## 3 — Design Goals

- **Every important state change produces an event** — title changes, retirements, injuries, contract expiries, sponsor changes, and significant milestones are always surfaced.
- **Events have narrative weight proportional to their impact** — a fighter stubbing their toe is not an event. A fighter breaking their leg is.
- **Player choices have consequences** — choice events should branch the simulation state in visible ways.
- **Events feel contextual** — an event about a fighter should reference their history, relationships, and current situation.
- **Narrative pacing feels natural** — events cluster around important moments (fight nights, monthly settlement) and quiet down during routine weeks.
- **Events are skimmable** — the player can quickly scan their inbox and understand what needs attention.

---

## 4 — Design Principles

| Principle | Meaning |
|-----------|---------|
| **Events Reflect the World** | Every event is caused by a state change in a simulation system. No event appears without a traceable cause. |
| **Narrative Follows Simulation** | Stories emerge from system interactions. Events surface these stories; they do not author them. |
| **Every Important Event Has a Cause** | The player should be able to answer "why did this happen?" by looking at game state. |
| **Information Before Surprise** | Foreshadowing through prior events and visible state changes. The player should sense something coming. |
| **Player Agency Over Randomness** | When RNG determines that an event fires, the player should have agency over the response. |
| **Consistent Narrative Tone** | Events should feel like they belong in the same world. Tone, vocabulary, and framing should be consistent across event types. |
| **Observable Consequences** | When an event applies consequences, the player should see them — in the log, in changed stats, in follow-up events. |

---

## 5 — Non Goals

- **Not a dialogue system** — events are not conversations. They deliver information and offer choices; they do not simulate back-and-forth.
- **Not a quest system** — there are no multi-step quests with objectives and rewards. Event chains exist but are simple cause-and-effect, not tracked missions.
- **Not a cutscene engine** — events are text-based and inbox-delivered. No animated sequences, no camera work.
- **Not responsible for UI layout** — Events produce data. The Inbox UI decides how to display it.
- **Not a replacement for direct state observation** — the player should still be able to check fighter stats, rankings, and finances directly. Events supplement observation, not replace it.
- **Not the only source of information** — the weekly summary, finance tab, and fighter detail views also convey information. Events are for narrative framing, not raw data delivery.

---

## 6 — Responsibilities

### Events owns

- Event generation from simulation triggers
- Event selection and prioritization (which events fire, in what order)
- Event delivery to player inbox
- Player choice processing (when an event offers options)
- Consequence application from player choices
- Event history tracking (what happened, when)
- Event cooldown and duplicate prevention
- Event chaining (Event A naturally leads to Event B)
- Narrative tone and consistency across all event types

### Events does NOT own

- World state changes that trigger events — those are owned by World, Training, Combat, Economy
- The inbox UI — owned by Presentation layer
- The weekly summary — owned by the tick orchestrator
- Fighter generation — owned by Fighter/World
- Combat resolution — owned by Combat
- Economic settlement — owned by Economy

---

## 7 — Mental Model

### Events as State Change Broadcast

```
┌─────────────────────────────────────────────────────────────────┐
│                     SIMULATION LAYER                             │
│                                                                 │
│  World ──► Training ──► Combat ──► Economy ──► Rankings         │
│    │           │           │           │           │             │
│    ▼           ▼           ▼           ▼           ▼             │
│  [state]    [state]     [state]     [state]     [state]         │
│  changes    changes     changes     changes     changes         │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EVENT LAYER                                  │
│                                                                 │
│  1. TRIGGER DETECTION                                           │
│     • Detect significant state changes                          │
│     • Evaluate trigger conditions                               │
│     • Apply cooldown/duplicate checks                           │
│                             │                                    │
│                             ▼                                    │
│  2. EVENT GENERATION                                            │
│     • Select event template based on trigger type               │
│     • Populate with contextual data (fighter names, stats)      │
│     • Determine if event offers player choices                  │
│                             │                                    │
│                             ▼                                    │
│  3. PLAYER DELIVERY                                             │
│     • Add event to inbox                                        │
│     • Generate notification (if important)                      │
│     • Sort by priority/urgency                                  │
│                             │                                    │
│                             ▼                                    │
│  4. PLAYER RESPONSE (if choice event)                           │
│     • Player selects a choice                                   │
│     • Apply consequences to simulation state                    │
│     • Generate follow-up events if applicable                   │
│                             │                                    │
│                             ▼                                    │
│  5. NARRATIVE HISTORY                                           │
│     • Record event in timeline                                  │
│     • Update fighter/camp history with event reference          │
│     • Enable future events to reference past events             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Events are Broadcast, Not Creation

The key mental shift: Events do not create state. They broadcast state changes that already happened. An injury event exists because the simulation already marked the fighter as injured. A title change event exists because the rankings already updated the champion. Events are the messenger, not the message.

---

## 8 — System Relationships

### Reads (Events observes)

| System | What Events Reads | Purpose |
|--------|------------------|---------|
| **Fighter** | Injuries, morale changes, attribute milestones, contract status, record milestones, title status | Generate fighter-specific events |
| **World** | AI fighter retirements, debuts, title changes, division changes | Generate world news events |
| **Economy** | Sponsor changes, financial milestones, cash warnings | Generate financial events |
| **Rankings** | Ranking changes, champion changes, P4P movement | Generate ranking events |
| **Rivals** | Rivalry intensity, poaching attempts, grudge match results | Generate rivalry events |
| **Camp** | Chemistry changes, tier upgrades, reputation milestones | Generate camp events |
| **Timeline** | Past events, milestone history | Context for new events, chain detection |

### Updates (Events modifies)

| System | What Events Changes | When |
|--------|---------------------|------|
| **Inbox** | Adds event messages | When events are generated |
| **Timeline** | Records significant events | After event delivery |
| **Fighter History** | Adds event references | For fighter-specific events |
| **Camp State** | Sets flags for chained events | When an event creates conditions for a follow-up |

### Triggers (Events listens for)

| Trigger | Source System | What It Means for Events |
|---------|--------------|--------------------------|
| **World Tick** | World | Weekly event generation opportunity |
| **Title Change** | Rankings/Combat | Major narrative event — champion crowned or dethroned |
| **Retirement** | World | Career conclusion event — legacy summary |
| **Debut** | World | New fighter introduction event |
| **Injury** | Training | Injury notification — severity, recovery time, impact |
| **Sponsor Change** | Economy | Sponsor acquired or lost — financial impact |
| **Contract Expiry** | Contract | Fighter leaving or re-signing decision |
| **Tournament Result** | Combat | Tournament outcome — celebration or disappointment |
| **Camp Milestone** | Camp | Tier upgrade, reputation threshold, anniversary |

---

## 9 — Cross-System Impact

Events create ripple effects across systems. Understanding these chains is essential for maintaining consistency.

### Example: Title Change Chain

```
┌─────────────────────────────────────────────────────────────────┐
│                    TITLE CHANGE IMPACT CHAIN                     │
│                                                                 │
│  Combat resolves fight → Champion loses                         │
│                │                                                │
│                ▼                                                │
│  Rankings update → New champion crowned                         │
│                │                                                │
│                ▼                                                │
│  EVENT: "New Champion Crowned"                                  │
│  • Notifies player of title change                              │
│  • Includes fight narrative highlights                          │
│                │                                                │
│                ▼                                                │
│  Fighter State Changes:                                         │
│  • Old champion: lose title, morale drop, legacy update         │
│  • New champion: gain title, popularity surge, morale boost     │
│                │                                                │
│                ▼                                                │
│  EVENT: "Champion's First Interview" (follow-up, next week)     │
│  • New champion comments on victory                             │
│  • Player choice: humble or arrogant response → morale effect   │
│                │                                                │
│                ▼                                                │
│  Economy Impact:                                                │
│  • New champion's popularity → increased merchandise revenue    │
│  • Sponsors express interest → sponsor event triggered          │
│                │                                                │
│                ▼                                                │
│  EVENT: "Sponsor Interest" (delayed, 2-4 weeks later)           │
│  • Sponsor offers increased rate for champion's camp            │
│  • Player choice: accept, negotiate, decline                    │
│                │                                                │
│                ▼                                                │
│  World Impact:                                                  │
│  • Contenders shift focus to new champion                       │
│  • Ranking dynamics adjust                                      │
│                │                                                │
│                ▼                                                │
│  EVENT: "Contender Calls Out Champion" (delayed)                │
│  • Top-ranked fighter publicly challenges new champion          │
│  • Rivalry intensity increases                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Insight

A single simulation event (title change) can cascade into 5+ player-facing events over multiple weeks. When designing events, consider the full chain — not just the immediate event, but the ripples that follow. Premature event generation (all events firing at once) feels spammy. Delayed event generation (events trickling in over time) feels like a living world.

---

## 10 — Event Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                       EVENT LIFECYCLE                            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 1: STATE CHANGE OCCURS                             │    │
│  │                                                          │    │
│  │  Simulation system produces a state change:              │    │
│  │  • Fighter gets injured                                  │    │
│  │  • Champion loses title                                  │    │
│  │  • Sponsor contract expires                              │    │
│  │  • Fighter reaches attribute milestone                   │    │
│  │                                                          │    │
│  │  Events does NOT produce this change.                    │    │
│  │  Events observes it and decides to broadcast it.         │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 2: TRIGGER EVALUATION                              │    │
│  │                                                          │    │
│  │  Check: is this state change significant enough?         │    │
│  │  • Injury severity above threshold? → Yes               │    │
│  │  • Minor morale change? → No (too trivial)               │    │
│  │                                                          │    │
│  │  Check: has this event fired recently?                   │    │
│  │  • Cooldown period active? → Skip                        │    │
│  │  • Duplicate of existing inbox event? → Skip             │    │
│  │                                                          │    │
│  │  Check: does the player need to know this?               │    │
│  │  • AI fighter in distant division retires? → Low priority │    │
│  │  • Player's fighter gets title shot? → High priority     │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 3: EVENT GENERATION                                │    │
│  │                                                          │    │
│  │  Select event template matching the trigger type         │    │
│  │  Populate template with contextual data:                 │    │
│  │  • Fighter name, stats, history                          │    │
│  │  • Opponent name (if applicable)                         │    │
│  │  • Specific numbers (injury duration, salary change)     │    │
│  │                                                          │    │
│  │  Determine event type:                                   │    │
│  │  • Informational — player reads and dismisses            │    │
│  │  • Choice — player selects from options                  │    │
│  │  • Chain starter — this event will lead to another       │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 4: PLAYER DELIVERY                                 │    │
│  │                                                          │    │
│  │  Add event to player inbox                               │    │
│  │  Assign priority (affects sort order, notification)      │    │
│  │  Generate notification for urgent events                 │    │
│  │  Add to weekly summary if relevant                       │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 5: PLAYER RESPONSE (choice events only)            │    │
│  │                                                          │    │
│  │  Player opens event in inbox                             │    │
│  │  Reads context and options                               │    │
│  │  Selects a choice                                        │    │
│  │                                                          │    │
│  │  IF choice has immediate consequences:                   │    │
│  │  → Apply to simulation state now                         │    │
│  │                                                          │    │
│  │  IF choice triggers follow-up event:                     │    │
│  │  → Schedule follow-up for future tick                    │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 6: NARRATIVE RECORDING                             │    │
│  │                                                          │    │
│  │  Record event in timeline (for history tab)              │    │
│  │  Update fighter camp history with event reference        │    │
│  │  Set flags for chain detection (future events)           │    │
│  │  Update relationship/rivalry state if relevant           │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  EVENT COMPLETE — PLAYER CONTINUES                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 11 — Business Rules

### Trigger Conditions

Events fire based on specific conditions in the simulation state. A trigger condition answers: "Under what circumstances should this event appear?"

- **Threshold triggers**: event fires when a value crosses a threshold (morale drops below 20, reputation exceeds 80).
- **Change triggers**: event fires when a value changes significantly (ranking moves 5+ positions, cash decreases by 50% in one month).
- **Milestone triggers**: event fires at specific moments (first title win, 50th career fight, camp anniversary).
- **Periodic triggers**: event fires on a schedule (monthly camp report, yearly awards consideration).

### Priority

Events have priority levels that determine their visibility and urgency:

| Priority | Meaning | Examples |
|----------|---------|----------|
| **Urgent** | Requires immediate player attention | Contract expiring this week, fighter critically injured, bankruptcy warning |
| **Important** | Player should know about this soon | Title change in player's division, rival camp poaching attempt |
| **Notable** | Interesting but not time-sensitive | AI fighter retirement, division ranking shifts, milestone achievement |
| **Minor** | Flavor and atmosphere | Camp morale note, minor sponsor news, training observation |

### Cooldown

To prevent event spam, similar events have cooldown periods:

- The same event type cannot fire again within N weeks of its last occurrence.
- Cooldown is per-context — a "fighter injured" event for Fighter A does not prevent a "fighter injured" event for Fighter B.
- Exception: truly urgent events (bankruptcy, contract expiry) bypass cooldowns.

### Duplicate Prevention

The same event should not appear twice in the player's inbox:

- Before generating an event, check if an identical or substantially similar event already exists in the current inbox.
- "Substantially similar" means: same event type, same subject (fighter/sponsor/division), fired within the same tick.
- Duplicates are silently skipped — the player should never see "Fighter X Injured" twice in one week.

### Event Chains

Some events naturally lead to others:

- A "Title Win" event may trigger a "Victory Celebration" event 2-4 weeks later.
- A "Serious Injury" event may trigger a "Recovery Update" event when the fighter returns.
- A "Rival Challenge" event may trigger a "Fight Scheduled" event if the player accepts.

Chains are tracked via flags — when Event A fires, it sets a flag that Event B checks for. Chains create narrative continuity without requiring complex state machines.

### Player Choices

Choice events present the player with options. Each option has:

- **A label**: what the player sees and selects.
- **Consequences**: what changes in the simulation (morale, chemistry, cash, relationships).
- **Follow-up potential**: whether this choice may trigger future events.

Choices should feel meaningfully different. Two options that differ only in flavor text are not real choices. The player should care about which option they pick because the outcome matters.

### Hidden vs Visible Events

Not all events go to the inbox:

- **Visible events**: delivered to inbox, player can read and respond. These are the primary event type.
- **Hidden events**: processed silently for state tracking purposes. Used for flag setting, chain progression, and internal bookkeeping. The player does not see these directly but may see their effects later.
- **Log-only events**: shorter versions of important events that appear in the weekly log but not the inbox. Good for minor happenings that don't need a full message.

### Narrative Persistence

Events should leave traces:

- The timeline records significant events with timestamps.
- Fighter histories reference events that affected them.
- Camp histories track major milestones and crises.
- These records enable future events to reference the past: "Since winning the title in Week 48..." or "After the injury that sidelined him for 12 weeks..."

---

## 12 — Event Philosophy & Narrative

### Stories emerge from simulation

The most memorable moments in the game should come from the interaction of systems, not from pre-written storylines. A fighter who was scouted as a raw prospect, developed slowly, overcame a career-threatening injury, and won the title in an upset — that story emerged from Training, Combat, and World. Events surface this story; they do not write it.

### Don't create events without causes

An event that says "A mysterious benefactor donates $50,000 to your camp" is unsatisfying because the player cannot trace it to any system. An event that says "Your former fighter, now a champion in another organization, sends a thank-you bonus for the training you provided" has a cause rooted in the simulation (a fighter you trained succeeded elsewhere).

### The world keeps spinning

Events accumulate in the inbox regardless of whether the player reads them. A fight offer with a 3-week expiry will vanish if not accepted — the world does not pause. This creates gentle pressure to engage with the inbox regularly, reinforcing the sense that the simulation is alive.

### Important events should be memorable

A title win should feel different from a routine sponsor update. Important events should use stronger language, more dramatic framing, and more prominent delivery. The player should be able to recall their fighter's title win weeks later because the event made an impression.

### Avoid event spam

If the player receives 15 events every week, none of them feel important. Event frequency should ebb and flow — quiet weeks with 1-2 events, busy weeks (post-fight, monthly settlement) with 5-8. The rhythm creates natural pacing.

### Player choices must have consequences

A choice without consequence trains the player to ignore choices. If the player selects "Encourage the fighter" vs "Criticize the fighter" and both result in the same morale change, the illusion of agency is broken. Every choice path should produce a visibly different outcome.

---

## 13 — AI Decision Heuristics

When modifying or extending the event system, follow these heuristics.

### Don't create events without supporting state

Before adding a new event, ensure the simulation state that would trigger it actually exists. An event about "fighter burnout" is meaningless if the simulation doesn't track a burnout mechanic. Build the simulation first, then add the event to surface it.

### Use events to explain important changes

When a significant state change occurs (title loss, major injury, sponsor change), the player should receive an event explaining it. If the player sees a champion without a belt and doesn't know why, the event system has failed. Every important change deserves an explanation.

### Avoid text-only events without impact

An event that the player reads and immediately dismisses with no state change and no decision is filler. Every event should either: inform the player of something actionable, offer a choice, or advance a narrative chain. Pure flavor events are acceptable in very small doses but should not dominate the inbox.

### Use existing triggers before creating new ones

Before adding a custom trigger for a new event, check if the event can fire on an existing trigger. Many events can be variations of "on weekly tick, with conditions" or "on title change" or "on contract expiry." New triggers add complexity to the event system's detection logic.

### Prioritize quality over quantity

Five well-written events with meaningful choices and narrative weight are better than fifty generic events that the player skims past. The event system's value is measured by player engagement, not event count.

### Maintain consistent tone

Events should feel like they come from the same world. A gritty, realistic injury report followed by a cartoonish sponsorship announcement breaks immersion. Define the game's narrative voice and ensure all events adhere to it.

### Chain events create engagement

A single event that resolves immediately is less engaging than an event that leads to another event two weeks later. Chains create anticipation — the player wonders "what will happen next?" and checks the inbox with interest.

### Test event frequency across game phases

An event frequency that feels right in the early game (small camp, few fighters) may feel overwhelming or underwhelming in the late game (large camp, many fighters). Test event generation at multiple camp tiers and sizes.

---

## 14 — Extension Strategy

### Adding a new event

1. Identify the state change that triggers this event — what simulation system produces the condition?
2. Define the trigger type — threshold? change? milestone? periodic?
3. Write the event template — title, body text, tone.
4. Determine if the event offers choices — if yes, define each choice and its consequences.
5. Set priority and cooldown — how urgent is this? how often should it repeat?
6. Add contextual data population — what fighter names, numbers, or history does the event reference?
7. Test: does the event fire when expected? does it respect cooldowns? do choices work?

### Adding an event chain

1. Define the initiating event — what starts the chain?
2. Define each link — what events follow, in what order, with what delay?
3. Determine chain conditions — does every chain link always fire, or are some conditional?
4. Add flag tracking — how does the system know which link comes next?
5. Define chain termination — does the chain have a natural end, or does it continue indefinitely?
6. Test the full chain — do all links fire in order? do conditional links respect conditions?

### Adding a choice event

1. Define the scenario — what situation does the player face?
2. Write each option — label, flavor text, and mechanical consequences.
3. Ensure options are meaningfully different — if they converge to the same outcome, consolidate them.
4. Define follow-up potential — does this choice set flags for future events?
5. Balance the consequences — no option should be strictly better than all others in every situation.
6. Test: do all options produce their stated consequences? are consequences visible to the player?

### Adding a dynamic event

Dynamic events adapt their content based on game state:

1. Define the template parameters — what parts of the event are variable?
2. Define the data sources — where does the variable content come from? (fighter stats, history, relationships)
3. Ensure fallback content — what does the event say if the data source is empty or unavailable?
4. Test with diverse game states — does the event read well with a rookie fighter? a veteran? a champion?

### Adding a seasonal event

1. Define the season — what time period does this event belong to?
2. Determine the trigger — week range? month detection? special condition?
3. Ensure the event makes narrative sense — why does this happen now and not at other times?
4. Add theming — seasonal events can use different language, framing, and visual presentation.
5. Consider replay value — will this event feel fresh on the player's 10th season?

### Adding a story arc

A story arc is a longer narrative that spans multiple events over an extended period:

1. Define the arc's premise — what is the story about? (rise of a contender, downfall of a champion, rivalry escalation)
2. Map the arc beats — what events happen at what points?
3. Identify triggers — what simulation conditions move the arc forward?
4. Build in branches — does the arc have different outcomes based on simulation results?
5. Ensure the arc can fail gracefully — what if the fighter at the center of the arc retires unexpectedly?
6. Test the full arc at different speeds — does it work if triggered early? late? not at all?

---

## 15 — Invariants

These must never be violated. If a change breaks one, the change is wrong.

- **Events never create state changes that bypass simulation systems** — an event can trigger a choice that applies consequences, but it cannot directly modify fighter attributes or rankings without going through the appropriate system.
- **Every event in the inbox has a traceable trigger** — no event appears without a cause in the simulation state.
- **Choice consequences are applied exactly once** — selecting a choice twice (through bugs or race conditions) must not double-apply consequences.
- **Event priority determines sort order, not existence** — low-priority events are still generated; they just appear lower in the inbox.
- **Cooldowns prevent spam but never suppress urgent events** — a bankruptcy warning must fire even if a financial event fired last week.
- **The timeline records events in chronological order** — events appear in the order they occurred, not the order they were generated.
- **Hidden events are invisible to the player** — they must never appear in the inbox, weekly summary, or any player-facing UI.
- **Event text does not contain placeholder tokens in the final output** — if a template has `{fighterName}`, it must be populated before reaching the player.

---

## 16 — Common Mistakes

### Events that create state directly

An event that says "Your fighter gains +5 striking" and directly modifies the attribute, bypassing Training. The correct approach: the event reflects a state change that Training already produced. If no system currently produces this state change, add it to the appropriate system first.

### Spam from multiple triggers

Three different triggers all firing for the same underlying state change, producing three similar events in the player's inbox. Example: a fighter wins a title, triggering "Title Win," "Ranking Update," and "Fighter Milestone" events that all say essentially the same thing. Consolidate related triggers into a single, richer event.

### Choice events with identical outcomes

Presenting the player with options that differ in text but produce the same mechanical result. Players learn to ignore these choices, degrading the value of all choice events. If options aren't meaningfully different, make the event informational (no choice) instead.

### Missing context in event text

An event that says "Champion defeated" without saying WHO defeated them, HOW, or WHAT THIS MEANS for the player. Events should provide complete context — the player should not need to check other screens to understand what happened.

### Events that reference stale state

An event generated at tick time references a fighter's ranking, but the ranking was updated later in the same tick. The event now contains incorrect information. Ensure events reference state that has already been finalized for the current tick.

### Forgetting that the player might not care

An event about a random AI fighter in a distant division that has no connection to the player's camp. The event is factually correct but irrelevant. Filter events for player relevance — would the player actually want to know this?

### Event chains that never terminate

A chain that links Event A → Event B → Event C → Event A, creating an infinite loop. Every chain must have termination conditions — either a fixed number of links, a condition that ends the chain, or a cooldown that prevents re-triggering.

---

## 17 — Related Documents

| Document | What It Covers |
|----------|---------------|
| `PROJECT_CONSTITUTION.md` | Priority order, DoD, modification rules |
| `01_PROJECT_OVERVIEW.md` | High-level systems map, data flow |
| `02_ARCHITECTURE.md` | Layer rules, communication, ADRs |
| `knowledge/01_combat.md` | Combat — generates fight results that trigger events |
| `knowledge/02_TRAINING.md` | Training — generates injury and milestone events |
| `knowledge/03_FIGHTER.md` | Fighter — subject of most events |
| `knowledge/04_WORLD.md` | World — generates world news and AI events |
| `knowledge/05_ECONOMY.md` | Economy — generates financial and sponsor events |
| `engine/events.js` | Event system orchestration |
| `engine/events/config.js` | Event triggers and configuration |
| `engine/events/context.js` | Event context and state detection |
| `engine/events/generators/` | Event generators by category |
| `engine/dispatch.js` | Event handler dispatch |
| `engine/dispatch/handlers/` | Choice event consequence handlers |
| `engine/narrative-presentation.js` | Narrative event presentation |
