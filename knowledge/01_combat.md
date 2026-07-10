# Knowledge: Combat

> **Domain:** Fight simulation, matchmaking, results, titles, rankings
> **Audience:** AI agents implementing or modifying combat features
> **Version:** 1.0

---

## 1 — Purpose

Combat is the core gameplay loop. The player manages fighters between fights, then watches them fight via a staged presentation. The combat system simulates exchanges between two fighters round-by-round and produces a winner, a method, and a narrative.

The combat system is not a fighting game. The player does not control individual strikes. Instead, the player sets strategy before the fight (game plan, attitude) and makes tactical calls between rounds (corner advice). The engine resolves the action.

---

## 2 — Responsibilities

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

## 3 — Core Concepts

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

## 4 — Combat Lifecycle

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

## 5 — State Changes

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

## 6 — Key Objects

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

## 7 — Business Rules

### Effective Attribute Calculation

A fighter's effective attribute for an exchange is not their raw `attrs[k]`. It is computed as:

```
effAttr(fighter, attr, stamina, modifiers)
  = fighter.attrs[attr]
    * stamina_weight(STA_BASE_WEIGHT + STA_SCALE_WEIGHT * stamina/100)
    * trait_modifier (Iron Chin, Glass Jaw, Showboat)
    * passed_in_modifiers (attitude, game plan, momentum, phase)
```

This means a tired fighter fights poorly, and traits can shift specific attributes.

### Game Plan Effects

| Plan | Effect |
|------|--------|
| Keep It Standing | Neutral — no special bonus |
| Take It Down | +0.18 takedown chance, affects exchange pool |
| Finish It | +50% knockdown chance, +30% stamina drain |
| Survive & Outpoint | -25% stamina drain, reduced output |

### Corner Strategy Effects

| Strategy | Effect |
|----------|--------|
| Go | Aggression multiplier increased, higher KO chance |
| Save | Stamina drain reduced, defense prioritized |
| Body | Body damage accumulation prioritized |

### Archetype Matchups

Archetype matchup modifiers are computed in `matchup.js`. The system tracks:

- `aStrike / bStrike` — striking advantage
- `aClinch / bClinch` — clinch advantage
- `aTD / bTD` — takedown advantage
- `aTDDef / bTDDef` — takedown defense advantage
- `aGNP / bGNP` — ground-and-pound advantage
- `aSweep / bSweep` — sweep advantage
- `aSub / bSub` — submission advantage

These modifiers affect exchange outcomes but are not explicitly shown to the player. The archetype clash commentary (in `commentary.js`) narrates them.

### Knockdown Check

After each exchange, if cumulative damage exceeds `KD_DMG_THRESHOLD`, a knockdown check runs:

```
kdChance = clamp((damage - 40) / chin * KD_CHIN_MULT + (strength - 40) * KD_STR_MULT,
                 0, KD_CHANCE_MAX)
            * (Finish It ? 1.5 : 1)
            * cautMult
```

If the check passes, the fighter goes down. If `KD_FINISH_CHANCE` also passes, the fight ends via KO/TKO.

### Submission Logic

Submission progress accumulates across exchanges within a round (resets between rounds):

```
adv = (attacker.bjj * 0.8 + attacker.str * 0.2 + position_bonus + sub_mod)
      - (defender.bjj * 0.5 + defender.fightIQ * 0.25)
subProgress += adv
if subProgress >= SUB_THRESHOLD → finish
```

---

## 8 — Extension Points

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

## 9 — Invariants

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

## 10 — Common Mistakes

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

## 11 — Related Documents

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
