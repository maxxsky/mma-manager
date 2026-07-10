# Knowledge: Combat

> **Domain:** Fight simulation, matchmaking, results, titles, rankings
> **Audience:** AI agents implementing or modifying combat features
> **Version:** 1.0

---

## 1 — Purpose

Combat is the core gameplay loop. The player manages fighters between fights, then watches them fight via a staged presentation. The combat system simulates exchanges between two fighters round-by-round and produces a winner, a method, and a narrative.

The combat system is not a fighting game. The player does not control individual strikes. Instead, the player sets strategy before the fight (game plan, attitude) and makes tactical calls between rounds (corner advice). The engine resolves the action.

---

## 2 — Combat Philosophy

### Purpose in the game

Combat is the payoff. Everything the player does — training, contracts, scouting, game planning — leads to the fight. The fight system must deliver a satisfying resolution to those decisions, not override them with randomness.

### Fun over realism

Absolute realism would mean one-punch KOs, frequent injuries, and boring decisions. The system prioritizes dramatic tension: comebacks are possible, championship fights feel different from prelims, and the player's strategic choices visibly affect the outcome.

### Emergent stories over scripted outcomes

The best fight stories come from the simulation: the underdog who survives a beating and wins by submission in the 5th round. The system should generate these moments naturally, not through authored sequences.

### Consistency over perfect simulation

A fighter who is clearly better (higher stats, favourable matchup) should win reliably but not always. The upset rate must be calibrated — too high and stats feel meaningless, too low and RNG is irrelevant. The current calibration targets approximately a 15-25% upset rate based on skill disparity.

---

## 3 — Design Goals

- **Every fight feels unique** — archetype matchups, trait interactions, and game plan choices produce different textures.
- **All archetypes remain viable** — no single fighting style dominates. Wrestlers have a path to victory against strikers and vice versa.
- **Player decisions outweigh RNG** — game plan selection, corner advice, and attitude matter more than the random exchange outcomes.
- **Comebacks are possible but rare** — a fighter who is losing badly should have a narrow path to victory, not a guaranteed loss.
- **The better fighter usually wins** — but upsets happen often enough to keep tension alive.

---

## 4 — Non Goals

- **Not a skill-based fighting game** — the player does not time buttons or execute combos.
- **Not a physics simulation** — strike trajectories, hitboxes, and collision detection do not exist.
- **Not a career mode** — long-term fighter development is owned by Training.
- **Not a matchmaker** — which fights get offered is owned by World / Fight Offers.
- **Not fully deterministic** — RNG introduces variance, but the seedable RNG ensures reproducibility for testing.

---

## 5 — Responsibilities

### Combat owns

- Staged fight experience (Staredown → WeighIn → Entrance → Round → Corner → Result)
- Round-by-round simulation (exchanges, damage, stamina, takedowns, submissions)
- Matchup calculation (archetype advantages, trait effects)
- Commentary generation (striking, clinch, takedown, trait, archetype clash)
- Result processing (win/loss, record updates, popularity, morale, legacy)
- Title changes (champion detection, title defense tracking)
- Rankings (division ranking, P4P ranking, rank point math)

### Combat does NOT own

- Pre-fight management (training, contracts, scouting) — owned by Training / Management
- Post-fight career milestones (Hall of Fame, retirement) — owned by Narrative / Career
- Fight offers and matchmaking (which fights are offered) — owned by World / Fight Offers
- AI fighter generation — owned by World
- Rival camp behavior — owned by Rivals

---

## 6 — Core Concepts

### Fight Structure

```
Fight
  ├── Pre-fight (attitude selection + game plan)
  ├── Round 1..N
  │     ├── Exchanges (striking, clinch, takedowns, ground)
  │     │     ├── Each exchange has one winner/one loser
  │     │     └── Damage, stamina, and points are accumulated
  │     └── KD check (if damage exceeds threshold)
  ├── Corner (between rounds — strategy adjustment)
  └── Result (decision or finish)
```

### Exchange Types

| Type | Occurrence | Description |
|------|-----------|-------------|
| Strike | Standing | Volume striking exchange |
| Power | Standing | Higher-damage single shot |
| Clinch | Standing | Close-range dirty boxing/knees |
| TD | Standing | Takedown attempt by player's fighter |
| TDB | Standing | Takedown attempt by opponent |
| GNP | Ground | Ground-and-pound from top position |
| Sub | Ground | Submission attempt |
| Sweep | Ground | Bottom fighter reverses position |
| Advance | Ground | Top fighter improves position |
| Scramble | Ground | Both fighters return to standing |

### Rounds

- Non-title fights: 3 rounds maximum
- Title fights: 5 rounds maximum
- Each round has a variable number of exchanges (configurable min/max)
- A round ends when the exchange count is reached or a finish occurs

### Damage and Stamina

Damage and stamina operate on separate tracks:

- **Damage** (cumulative): accumulated per fighter each round via `dmgA`/`dmgB`. Used for knockdown checks and round-end stamina drain calculation. Does NOT directly represent health — HP (shown in UI) is derived from total damage accumulated across rounds.
- **Stamina** (depleting): starts at 100 per fighter. Reduced each round by a drain calculation based on activity, damage taken, game plan, corner strategy, and cardio attribute. Stamina affects effective attribute output.

### Position

Position is standardized to a single object structure: `{ type: string, top: "A"|"B"|null }`

- `{ type: "standing", top: null }` — both fighters standing
- `{ type: "guard", top: "A" }` — A on top in guard
- `{ type: "halfGuard", top: "B" }` — B on top in half guard
- `{ type: "sideControl", top: "A" }` — A in side control
- `{ type: "mount", top: "A" }` — A mounted
- `{ type: "backMount", top: "A" }` — A on back

Position transitions: standing → halfGuard → guard → sideControl → mount → backMount (advances) and guard → standing (sweep or scramble).

### Finishes

| Method | Detection | Notes |
|--------|-----------|-------|
| KO/TKO | Knockdown check after an exchange | `knockdown.canRecover = false` |
| Submission | Accumulated sub progress reaches threshold | Progress resets between rounds |
| Doctor Stoppage | Cut (B) ≥ 6, triggered from corner | Player can continue or retire |
| Decision | No finish after all rounds | Winner is higher score |

---

## 7 — Combat Lifecycle

```
                Pre-Fight
           (attitude, game plan)
                   │
                   ▼
     ┌──────────────────────────┐
     │      Round N             │
     │                          │
     │  ┌── Exchange Loop ──┐   │
     │  │ Strike / Clinch   │   │
     │  │ Takedown / Ground │   │
     │  │ KD Check          │   │
     │  └───────────────────┘   │
     │                          │
     │      Finish? ──► Result  │
     │         │                │
     │         ▼                │
     │     Corner (if N < max)  │
     └──────────────────────────┘
                   │
                   ▼
               Result
        (Decision / KO / Sub)
                   │
                   ▼
            Commit Result
     (record, popularity, morale,
      legacy, titles, career)
```

---

## 8 — State Changes

### What Combat Reads

- `g.roster` — fighter attributes, traits, titles, record, contract
- `g.week` — for timestamping fight results
- `g.rep` — for fight offer tier determination
- `g.promoterRel` — for purse bonuses and main event status
- `g.divisions` — for champion status and rankings
- `g.rivals` — for grudge match detection
- `g.chemistry` — indirect effect via training, but not during fight

### What Combat Writes

- `fighter.record.w/l/ko/sub/dec` — fight outcome
- `fighter.morale` — morale change from result
- `fighter.popularity` — popularity change from result
- `fighter.titles` — title gain/loss
- `fighter.titleDefenses` — increment on successful defense
- `fighter.streakW/streakL` — streak tracking
- `fighter.fightHistory` — fight record entry
- `fighter.lastFightWeek` — timestamp
- `fighter.giantKills` — defeating ranked opponent
- `g.rep` — reputation change from result
- `g.legacy` — legacy score from result
- `g.log` — fight result summary

---

## 9 — Key Objects

### Fighter (input to simRound)

A fighter object must provide these properties for combat:

- `name: string` — display name
- `archetype: string` — Boxer, Wrestler, BJJ Specialist, Muay Thai, All-Rounder
- `age: number` — used for age-related attribute adjustments in prepFighter
- `attrs: { striking, wrestling, bjj, cardio, strength, chin, footwork, fightIQ }` — combat stats (0-99)
- `morale: number` — morale multiplier on attributes (converted in prepFighter)
- `weightClassDelta: number` — weight class shift adjustment
- `traits: string[]` — trait modifiers (Iron Chin, Warrior, etc.)
- `titles: string[]` — used for champion display and double champ logic

### Fight Result (output of simRound)

```
{
  log: string[],         // summary commentary entries
  tickLog: string[],     // detailed tick-by-tick entries
  dmgA, dmgB: number,    // cumulative damage this round
  staA, staB: number,    // remaining stamina
  scoreA, scoreB: number,// judges' points this round
  finish: { by: "A"|"B", how: string } | null,
  knockdown: { fighter: "A"|"B", name: string, canRecover: boolean } | null,
  landA, landB: number,  // strikes landed
  tdA, tdB: number,      // takedowns
  momentum: number,       // momentum meter (-100 to 100)
  winner: "A"|"B",       // final winner
}
```

---

## 10 — Business Rules

### Effective Attribute

A fighter's effective attribute is their raw stat, scaled by stamina, modified by traits and game plan. A tired fighter fights poorly regardless of their max stats.

### Game Plan Effects

| Plan | Effect |
|------|--------|
| Keep It Standing | Neutral |
| Take It Down | Increased takedown attempts, affects exchange weighting |
| Finish It | Higher KO chance, higher stamina drain |
| Survive & Outpoint | Reduced stamina drain, lower output |

### Knockdown Check

After damage exceeds a threshold, a chin check runs. The chance depends on the fighter's chin attribute, the attacker's strength, and the current game plan. Traits like Iron Chin and Cautious modulate this chance.

### Submission Logic

Submission progress accumulates across exchanges within a single round (resets between rounds). It is a contest between the attacker's BJJ + position bonus and the defender's BJJ + fight IQ. Once enough progress accumulates, the fight ends.

---

## 11 — Balancing Philosophy

### No dominant strategy

Every game plan, archetype, and corner choice should have clear trade-offs. If one option becomes the default pick in every situation, it needs to be weakened or the alternatives strengthened.

### Power creep is the enemy

Adding new traits, moves, or modifiers increases the overall power level. Each addition must be offset somewhere else or be intentionally situational. The safest approach is to add situational power (strong in specific matchups) rather than universal power (strong always).

### Changes ripple through the entire system

A +5% damage buff to Boxers does not just affect Boxers — it affects Wrestlers (who now lose faster to Boxers), BJJ Specialists (who now face sharper strikers), and every game plan that involves striking exchanges. Consider the full match matrix when tuning.

### Preserve existing calibration

If a change is labelled as a bug fix, its gameplay impact should be minimal. If a change is labelled as a balance tweak, its gameplay impact should be isolated. Do not mix the two.

---

## 12 — AI Decision Heuristics

When modifying combat, follow these guidelines before reaching for new systems.

**Use existing patterns.** Before adding a new exchange type, check if the existing 10 types can be repurposed. Before adding a new modifier, check if an existing trait or game plan covers the need.

**Avoid new stats if modifiers suffice.** A new fighter attribute requires save migration, UI changes, and balancing across all 8 existing attributes. A modifier (trait, game plan flag, temporary buff) achieves the same effect with less surface area.

**Avoid new subsystems if extension points suffice.** A new phase in the exchange loop, a new entry in the commentary table, or a new case in the resolver switch is cheaper than a new orchestration path.

**Prefer the smallest possible change.** A single-line guard in an existing resolver is better than a new resolver. A new constant in config.js is better than a new data file. A new if-branch is better than a new subsystem.

**Consider player visibility.** A change that the player never sees (e.g., a 2% damage adjustment) is probably not worth making. A change that creates new commentary text or a new fight dynamic is visible and therefore valuable.

---

## 13 — Extension Points

### Adding a new exchange type

1. Add the type to `EXCHANGES` in `fight/exchanges.js` with position constraint
2. Add a resolver in `fight/resolve-new-type.js`
3. Wire it into `fight.js` via `resolveGround()` or a new branch in the exchange loop
4. Add commentary templates in `commentary.js` if needed

### Adding a new trait with combat effect

1. Add modifier function in `fight/trait-effects.js`
2. Apply the modifier in `effAttr()` in `fight.js` or directly in the exchange resolver
3. Add commentary in `commentary.js` `traitCommentary()`
4. Add KD reaction in `fight.js` knockdown check section

### Adding a new positional state

1. Add position data in `fight/ground.js` (label, topGNP, bottomSub, sweepChance, advanceChance)
2. Add to `GROUND_ORDER` for position advancement
3. Handle in relevant resolvers (gnp, sub, sweep)

### Adding a new commentary type

1. Add template array or function in `commentary.js`
2. Wire into `fight.js` at the relevant exchange or phase
3. Call via `comm.both()` (visible in both modes) or `comm.tickOnly()` (tick mode only)

---

## 14 — Invariants

These must never be violated. If a change breaks one, the change is wrong.

- **Winner is always "A" or "B"** — never null, never undefined, never a third value.
- `scoreA + scoreB >= landed_strikes` — points must be at least as large as landed strikes (points include strike damage bonuses).
- **Stamina never goes below 0** — clamped in `simRound` return.
- **Stamina never exceeds 100** — clamped.
- **Damage is never negative** — all damage values are clamped to >= 0.
- **A fight always ends** — either by finish (KO/Sub/DrStoppage) or by reaching max rounds (decision).
- **Title fights are 5 rounds** — non-title fights are 3 rounds.
- **Champion card (champ card) and ranking table never show the same fighter** — champion is filtered from `div.list` before ranking display.
- **HP displayed in UI is derived from total damage** — `hp = max(0, 100 - totalDmg / 1.5)`.
- **Position is always a valid object with `{ type, top }`** — never a string, never missing properties.

---

## 15 — Common Mistakes

### Position as string

The old code used `"standing"` as a string and `{ type, top }` as an object for ground positions. This caused type confusion in `pickExchange()` which checked `typeof pos === "object"`. The fix: always use `{ type: "standing", top: null }`.

### Variable scope in extracted resolvers

When extracting exchange resolvers from `simRound()`, ensure all required parameters are passed explicitly. The `position` variable is a common omission — `resolveGNP` needs `position` to return `newPosition: position`.

### Training type crash in tick

If a fighter has an invalid `training.type`, `TRAINING[f.training.type]` returns `undefined`, causing a crash at `t.gains.forEach()`. Always guard with `|| TRAINING.conditioning` when accessing the training object.

### Empty roster in chemistry events

Chemistry events call `pick(g.roster.filter(...))`. If the filtered roster is empty, `pick()` returns `undefined`, causing crashes at `.name` or `.id`. The original code has a guard `if (fa && fb)` but not all paths check this.

### Floating point in score display

Combat uses floating-point values throughout. When displaying scores or damage in the UI, always round with `Math.round()`. Displaying raw floats (e.g., `65.799999`) confuses players.

---

## 16 — Related Documents

| Document | What It Covers |
|----------|---------------|
| `PROJECT_CONSTITUTION.md` | Priority order, DoD, modification rules |
| `01_PROJECT_OVERVIEW.md` | High-level systems map, data flow |
| `02_ARCHITECTURE.md` | Layer rules, communication, ADRs |
| `knowledge/02_training.md` (planned) | Training and fighter development domain |
| `knowledge/03_world.md` (planned) | World simulation, AI, rankings domain |
| `engine/reducer/fight.js` | Reducer actions for fight acceptance/rejection |
| `engine/fight.js` | Combat orchestration |
| `engine/fight/config.js` | All fight constants and thresholds |
| `engine/fight/commentary.js` | Commentary templates and generators |
| `engine/career.js` | Post-fight career processing |
