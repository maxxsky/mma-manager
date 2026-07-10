# 01_PROJECT_OVERVIEW — MMA Manager

> **Purpose:** High-level map of the project. Read this first before any other documentation.
> **Audience:** AI agents and new developers.
> **Version:** 1.0

---

## Documentation Read Order

Before modifying any code, read these documents in order:

1. **PROJECT_CONSTITUTION.md** — binding rules, priorities, DoD
2. **01_PROJECT_OVERVIEW.md** — this document, systems map
3. **Relevant Architecture document** — per-system design
4. **Relevant Knowledge document** — per-system context
5. **Relevant Skill document** — per-task procedures
6. **Current task** — the specific requirement

If any document is missing, skip it and continue. Never skip the constitution.

---

## Project Summary

MMA Manager is a single-player browser-based camp management simulation. The player manages a mixed martial arts gym: hires coaches, trains fighters, accepts fights, and builds a legacy over hundreds of in-game weeks.

**Tech stack:** JavaScript (ESM), React 18, Vite 6, no TypeScript, no state management library.

**Deployment:** Static files served by `python3 -m http.server` over PM2 on a Linux VPS. Port 8096. Build: `vite build`, serve from `dist/`.

**Repository:** `github.com/maxxsky/mma-manager`

---

## Core Systems

The game has 30+ interconnected systems. These are the ones you will encounter most often:

```
┌──────────────────────────────────────────────────────────────┐
│                    PLAYER INTERFACE                          │
│  Dashboard · Roster · Scout · Inbox · Finance · Facility     │
│  Rankings · Rivals · Achievements · Dynasty · FightNight     │
└──────────────────────────┬───────────────────────────────────┘
                           │ React state + dispatch
┌──────────────────────────▼───────────────────────────────────┐
│                    APPLICATION LAYER                          │
│  App.jsx — routing, modals, fight flow                       │
│  useGameState — state wrapper, auto-save, dispatch            │
│  useSaveLoad — persistence, migration                         │
│  useKeyboard — shortcuts                                      │
└──────────────────────────┬───────────────────────────────────┘
                           │ up() → structuredClone + mutate
┌──────────────────────────▼───────────────────────────────────┐
│                    GAME ENGINE (pure JS, no React)            │
│                                                              │
│  state.js     — newGame() + tick() orchestration             │
│  reducer.js   — player action → state mutation               │
│  fight.js     — simRound(), prepFighter(), effAttr()         │
│  world.js     — AI progression, title changes, retirements   │
│  events.js    — camp state, flags, delayed consequences      │
│  dispatch.js  — inbox event handler registry                 │
│  narrative.js — story generators from simulation data        │
│  career.js    — fight results, milestones, rivalry           │
│  achievements.js — unlock checking                           │
│  shadow-ai.js — rival camp simulation                        │
└──────────────────────────────────────────────────────────────┘
```

---

## System Ownership

Each major system has a primary owner — the module where its core logic lives. Smaller systems borrow from these owners.

| Domain | Owner Module | Responsibilities |
|--------|-------------|------------------|
| **Combat** | `fight/` + `career.js` | Fight simulation, matchmaking, fight results, title changes, rankings |
| **Training** | `tick/training.js` + `data/training.js` | Attribute growth, overtraining, injury, coach/facility bonuses |
| **World** | `world/` + `tick/rivals.js` | AI fighter progression, division maintenance, rival camp simulation |
| **Narrative** | `narrative/` + `events/` | Story generation, camp events, delayed consequences, flags, memory |
| **Economy** | `tick/settlement.js` + `economy.js` | Cash flow, sponsors, expenses, fight purses |
| **Persistence** | `hooks/useSaveLoad.js` + `services/saveService.js` | Save/load, migration, slot management |
| **State** | `state.js` + `reducer/` | Game state initialization, tick orchestration, all player actions |
| **UI** | `ui/` + `components/` | Screens, modals, overlays, routing, visual primitives |

When modifying a system, start with its owner module. Composing multiple owners is orchestrated by `state.js` (tick) and `App.jsx` (UI).

---

## High-Level Architecture

### Engine/View Separation

The engine (`src/engine/`) contains **zero React imports**. It is pure JavaScript that operates on a plain game state object (`g`). This makes it testable from Node.js without a browser.

The UI (`src/ui/`, `src/components/`) imports from the engine but never modifies it directly. The UI reads `g` properties and calls `dispatch()` or `up()` to trigger state changes.

### State Mutation Model

```
React state ──→ up(fn) ──→ structuredClone(g) ──→ fn(clone) ──→ return clone
                    ↑                                      │
                    └────── React setState ────────────────┘
```

- `g` is a single plain object (no Redux, no Immer, no Proxy).
- `up()` deep-clones the state, applies a mutation function, and returns the clone.
- `dispatch()` wraps `up()` with the reducer function for standardized actions.
- Auto-save throttles at 1 second via `setTimeout`.

### Tick Cycle (Weekly Advance)

```
Space → advance()
         │
         ├── up((n) => {
         │     tick(n)          ← all simulation phases
         │     n.log = slice(30)
         │     checkAchievements(n)
         │   })
         │
         └── setWeekFlash + weekly summary
```

`tick()` runs in this order:
1. Tick Training
2. Chemistry Events
3. Fight Offers
4. Monthly Settlement (every 4 weeks)
5. Yearly Events (every 48 weeks)
6. Weight Class Changes
7. Rival Simulation
8. World Simulation + Narrative + Events

---

## Folder Overview

```
app/src/
├── engine/                     # Pure JS game engine (zero React)
│   ├── state.js                # newGame() + tick() orchestration
│   ├── reducer.js              # Root composed reducer
│   ├── fight.js                # Fight simulation orchestration
│   ├── world.js                # World simulation orchestration
│   ├── events.js               # Event system orchestration
│   ├── dispatch.js             # Inbox event handler registry
│   ├── rng.js                  # Random number generator (seedable)
│   ├── data.js                 # Re-exports from data/ subfolder
│   ├── data/                   # Game data (training, traits, weights, etc.)
│   ├── tick/                   # Tick phase modules (7 files)
│   ├── fight/                  # Fight sub-modules (config, exchanges, ground, etc.)
│   ├── reducer/                # Domain reducers (6 files + constants)
│   ├── world/                  # World sub-modules (config, ai-fighter, history)
│   ├── events/                 # Event generators + config + context
│   ├── narrative/              # Narrative generators + templates + timeline
│   ├── dispatch/               # Event handler modules (5 files)
│   ├── shadow-ai/              # Shadow camp modules (config, state, history)
│   ├── fights/                 # Fight outcome persistence
│   └── *.js                    # career, economy, rankings, onboarding, etc.
│
├── hooks/                      # React custom hooks
│   ├── useGameState.js         # g, dispatch, up, advance, auto-save
│   ├── useSaveLoad.js          # Save/load, migration, slot management
│   ├── useKeyboard.js          # Space, Ctrl+Z, Ctrl+Y shortcuts
│   ├── useFightSeed.js         # Deterministic fight RNG
│   └── useFightPrep.js         # Fighter prep, weight cut, attitude
│
├── ui/                         # React components (pages)
│   ├── App.jsx                 # Application shell + routing
│   ├── theme.jsx               # Visual primitives (Panel, Btn, etc.)
│   └── *.jsx                   # Dashboard, Roster, Inbox, etc.
│
├── components/                 # Reusable React components
│   ├── fight/                  # FightNight stage components (9 files)
│   └── *.jsx                   # FightCard, WeeklySummary, etc.
│
├── services/                   # External services
│   └── saveService.js          # LocalStorage persistence
│
├── i18n/                       # Internationalization
│   └── index.js                # EN + ID translations
│
└── __tests__/                  # Vitest test suite
    ├── helpers.js
    └── *.test.js               # invariants, fight, regression, reducer
```

Files outside these folders (`engine/*.js`, `data/`, `i18n/`, `services/`) are stable infrastructure and should rarely need modification. Most changes happen inside the sub-folders listed above.

---

## Data Flow

### Game State Object (`g`)

The entire game state is a single mutable object with these top-level properties:

```
g = {
  week, cash, rep, chemistry, legacy,  // Core metrics
  roster: [Fighter],                    // Player's fighters
  coaches: [Coach],                     // Player's coaches
  facilities: { mats, ring, weights, medical },
  campTier: 0-4,
  divisions: { [weightClass]: Division },
  rivals: [RivalCamp],
  inbox: [Message],                     // Inbox queue
  log: [String],                        // Weekly log
  prospects: [Prospect],
  sponsors: [Sponsor],
  promoterRel: { [tier]: Number },
  relationships: { [key]: Number },
  _unlocked: [String],                  // Achievement IDs
  _worldHistory: { titleChanges, retiredChamps },
  _hallOfFame: [HallOfFamer],
  _worldRecords: { Object },
  _dynasty: { championsProduced, totalWins, ... },
  _timeline: [TimelineEvent],
  _campState: { boolean flags },
  _undoStack, _redoStack,               // Undo/redo
  _flags, _memory,                      // Flag/memory system
  _delayedEvents,                        // Delayed consequences
}
```

### Action Flow (Player Makes a Decision)

```
1. Player clicks button in UI component
2. Component calls dispatch({ type, payload })
   or up(fn) for complex mutations
3. Reducer applies action to cloned state
4. New state replaces old in React
5. UI re-renders with updated state
```

### Simulation Flow (Weekly Advance)

```
1. Player presses Space
2. advance() calls up((n) => tick(n))
3. tick() runs all simulation phases in order
4. Each phase reads && mutates n
5. advance() captures log highlights for weekly summary
6. React re-renders with n
7. auto-save: setTimeout(() => saveGame(saveSlot, n), 1000)
```

---

## System Dependencies

```
state.js (tick)
  ├── tick/training.js       ← coachBonus, facBonus, calcMentorBonus
  ├── tick/chemistry.js
  ├── tick/fight-offers.js   ← rankOf, stripTitle, genFighter
  ├── tick/settlement.js     ← genCoach, SPONSOR_BRANDS
  ├── tick/yearly.js
  ├── tick/weight-change.js
  ├── tick/rivals.js
  ├── world.js               ← world/config, world/ai-fighter
  ├── events.js              ← events/config, events/context, events/generators/
  ├── narrative-presentation.js ← narrative/ templates, generators, timeline
  └── shadow-ai.js           ← shadow-ai/ config, state, history

reducer.js
  ├── reducer/camp.js
  ├── reducer/fighter.js
  ├── reducer/coach.js
  ├── reducer/contract.js
  ├── reducer/fight.js
  └── reducer/ui.js

fight.js (simRound)
  ├── fight/config.js        ← All fight constants
  ├── fight/matchup.js       ← Archetype matchup modifiers
  ├── fight/exchanges.js     ← Exchange type picker
  ├── fight/ground.js        ← Ground position data
  ├── fight/commentary.js    ← Commentary templates
  ├── fight/trait-effects.js ← Centralized trait modifiers
  ├── fight/resolve-striking.js
  ├── fight/resolve-clinch.js
  ├── fight/resolve-takedown.js
  └── fight/resolve-ground.js
```

---

## AI Entry Points

These are the files you will most frequently modify:

| Area | File | Why You Touch It |
|------|------|------------------|
| New player action | `engine/reducer/camp.js` | Add new reducer case |
| New simulation phase | `engine/state.js` + `engine/tick/` | Add phase to tick cycle |
| New fighter interaction | `engine/reducer/fighter.js` | Fighter actions |
| New fight mechanic | `engine/fight.js` + `engine/fight/resolve-*.js` | Exchange logic |
| New event | `engine/events/generators/` | Event generation |
| New UI page | `App.jsx` + `ui/*.jsx` + `Sidebar.jsx` | Tab routing |
| New UI component | `components/*.jsx` | Reusable UI |
| New narrative | `engine/narrative/generators/` + `templates.js` | Story generation |
| Save fix | `hooks/useSaveLoad.js` + `services/saveService.js` | Migration |

If unsure where to start, search for existing implementations before introducing a new one. Consistency with existing patterns is preferred over inventing a fresh approach.

---

## Glossary

| Term | Definition |
|------|------------|
| `g` | Game state object — single source of truth |
| `tick` | One week of simulation |
| `up(fn)` | State mutation wrapper — clone, mutate, return |
| `dispatch(action)` | Standardized state change via reducer |
| `OVR` | Overall rating (0-99), computed from fighter attributes |
| `Rep` | Camp reputation (2-100) |
| `Chem` | Camp chemistry (0-100) |
| `Tier` | Camp tier (0-4, Local → World-Class) |
| `TRAINING` | Training program definitions (object in data/training.js) |
| `INTENSITY` | Training intensity levels (Light/Medium/Hard) |
| `CAMP_TIERS` | Camp upgrade definitions |
| `SPONSOR_BRANDS` | Sponsor definitions |
| `WEIGHTS` | Weight classes |
| `_worldHistory` | Global simulation history (title changes, retirements) |
| `_campState` | Computed camp state flags (internal tension, etc.) |
| `titleDefenses` | Number of title defenses by a fighter |
| `milestoneFirstTitle` | Flag set when fighter first wins a title |
