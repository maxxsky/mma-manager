# 02_ARCHITECTURE — MMA Manager

> **Purpose:** How systems work together. Read this before implementing any feature that spans multiple files.
> **Audience:** AI agents and developers modifying architecture-relevant code.
> **Version:** 1.0

---

## 1 — Architectural Goals

The architecture exists to serve four goals, in order:

1. **Game state integrity** — the single state object must never be corruptible by UI or by partial engine failures.
2. **Deterministic simulation** — given the same seed and same inputs, the engine must produce identical outputs. This is non-negotiable for regression testing.
3. **Minimal coupling** — adding a new feature should require changes to as few files as possible. The ideal is one domain module + one orchestration call.
4. **Testable from Node.js** — the entire engine must run without a browser. Any import that requires DOM or React is prohibited in `src/engine/`.

---

## 2 — Architectural Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                       │
│  React components, hooks, CSS, i18n                         │
│  File: src/ui/, src/components/, src/hooks/, src/services/  │
│  Dependency: imports from engine/ only.                     │
│  Rule: never imports engine/ internals — only public exports│
│  Rule: never mutates g directly — uses dispatch() or up()  │
├─────────────────────────────────────────────────────────────┤
│                     APPLICATION LAYER                        │
│  App shell, routing, modals, save/load orchestration        │
│  File: App.jsx, useGameState.js, useSaveLoad.js             │
│  Dependency: imports engine/ and ui/                        │
│  Responsibility: connects UI events to engine actions       │
├─────────────────────────────────────────────────────────────┤
│                       ENGINE LAYER                           │
│  Pure JS game logic, no React, no DOM                       │
│  File: src/engine/ (all subdirectories)                     │
│  Dependency: NO imports from ui/, hooks/, components/       │
│  Responsibility: all business rules, simulation, data       │
│  Testable: yes, from Node.js                                │
└─────────────────────────────────────────────────────────────┘
```

### Layer Dependency Rules

```
Presentation ──→ Application ──→ Engine
     │                │              │
     └────────────────┴──────────────┘
              All arrows point DOWN
     Engine NEVER imports anything above itself
```

This is the only dependency direction allowed. Violations must be treated as architecture bugs.

### What Each Layer Contains

**Engine Layer (`src/engine/`)**
- Game state initialization and tick simulation
- All combat math, training math, economy math
- AI simulation (world, shadow camps, rankings)
- Event generation, narrative generation, achievement checking
- Reducers and handlers for all player actions
- Seedable RNG, game data constants

**Application Layer (`src/hooks/`, `src/App.jsx`)**
- Wraps engine functions in React state lifecycle
- Provides `dispatch()` and `up()` to UI components
- Manages save/load with throttled auto-save
- Routes between UI pages and manages modals (Negotiate, FightNight)
- Keyboard shortcuts, fight queue detection

**Presentation Layer (`src/ui/`, `src/components/`)**
- Renders game state as screens and components
- Dispatches user actions via `dispatch()` or `up()`
- Never reads engine files directly — only through state `g` and provided callbacks

---

## 3 — System Boundaries

### Domain Modules vs Orchestrators

Every major system follows a consistent split:

```
Engine/
  ├── orchestrator.js       # < 250 lines, imports domain modules
  └── domain/               # domain modules, no orchestration logic
      ├── config.js         # constants and thresholds
      ├── utils.js          # pure functions
      └── generators/       # event/fight/narrative generators
```

Orchestrators in this project:

| File | What It Orchestrates | Domain Modules |
|------|----------------------|----------------|
| `state.js` | Weekly tick | `tick/`, `world.js`, `events.js`, `narrative-presentation.js` |
| `reducer.js` | Player actions | `reducer/camp.js`, `reducer/fighter.js`, etc. |
| `fight.js` | Fight rounds | `fight/config.js`, `fight/resolve-*.js`, `fight/commentary.js` |
| `dispatch.js` | Inbox events | `dispatch/handlers/*.js` |
| `events.js` | Camp events | `events/config.js`, `events/context.js`, `events/generators/*.js` |
| `narrative-presentation.js` | Story generation | `narrative/templates.js`, `narrative/timeline.js`, `narrative/generators/*.js` |

### Boundary Rules

- An orchestrator imports domain modules but a domain module never imports its orchestrator.
- A domain module never imports another domain module's generator. Shared utilities go in `config.js` or a shared helper.
- Constants that are shared across domains go in the domain's own `config.js`. Cross-domain constants (e.g., tiers) go in `data/`.

---

## 4 — Communication Rules

### State Mutation via `up()`

All game state mutations go through `up()`, defined in `useGameState.js`:

```
up(fn)
  ├── deep-clones g via JSON.parse(JSON.stringify(g))
  ├── removes _undoStack and _redoStack before cloning
  ├── calls fn(n) where n is the clone
  └── returns n to React as new state
```

### Standardized Actions via `dispatch()`

For common player actions, use `dispatch()` which wraps the reducer:

```
dispatch({ type, ...payload })
  └── reducer(g, action)
        ├── camp.js  (facilities, tier, sponsors)
        ├── fighter.js (training, class change, poach)
        ├── coach.js (hire, fire)
        ├── contract.js (sign, extend)
        ├── fight.js (accept, counter, reject)
        └── ui.js (scout, inbox, events)
```

### Inbox Events via `dispatchEvent()`

When an inbox event choice is selected, `dispatchEvent()` looks up the registered handler by choice key:

```
dispatchEvent(g, action)
  └── registry[choiceKey]({ g, c, action })
```

### Tick Simulation — No Communication, Just Order

Tick phases do not communicate with each other. They all receive `g` and mutate it. The only ordering constraint is the phase sequence in `tick()`. If phase A must happen before phase B, that is guaranteed by the tick order — not by events, callbacks, or message passing.

---

## 5 — State Management

### The `g` Object

The entire game state is a single plain JavaScript object. There are no stores, no contexts (beyond theme/i18n), no proxies, no observables.

```
State owner:     App.jsx (useState)
State modifier:  up(fn) → structuredClone + mutate
State reader:    any component via props { g }
```

### State Preservation

- The reducer must never return a new object. It must mutate `g` in place.
- `up()` is the only place where state is cloned.
- The `saveTimer` in `useGameState` throttles writes to localStorage at 1 second.
- Undo/redo snapshots are captured before every non-meta action.

### State That Is Not in `g`

| Data | Owner | Reason |
|------|-------|--------|
| UI state (active tab, scroll position) | React `useState` in components | Not game state |
| Weekly summary overlay | React `useState` in `useGameState` | Derived from tick, displayed once |
| Loading / error states | React `useState` | Browser lifecycle |
| Modals (negotiate, fight) | React `useState` in App.jsx | UI-only, no game impact |

---

## 6 — Extension Points

Adding new functionality is designed to touch minimal files. Here is the pattern for each type of addition:

### New Player Action

1. Add reducer case in the appropriate domain reducer file
2. If it needs constants, add them in that domain's `constants.js`
3. Wire the UI button to call `dispatch({ type: "...", ... })`

### New Tick Phase

1. Create `tick/new-phase.js` with an exported function
2. Import and call it in `state.js` `tick()` at the correct position
3. If it has thresholds, create `tick/new-phase-config.js`

### New Fight Exchange Type

1. Add the exchange type to `fight/exchanges.js` pool
2. Add a resolver in `fight/resolve-new.js`
3. Wire it into `fight.js` exchange loop

### New Inbox Event

1. Create generator in `events/generators/new.js`
2. Wire it into `events.js` `enhanceEvents()`
3. Add handler in `dispatch/handlers/` if the event has choices

### New UI Page

1. Create the component in `ui/NewPage.jsx`
2. Add to `Sidebar.jsx` NAV array (with icon from `theme.jsx` ICONS)
3. Add import + render + tabLabel in `App.jsx`

---

## 7 — Anti-Patterns

### Forbidden

| Pattern | Why | Alternative |
|---------|-----|-------------|
| `engine/` importing from `ui/` | Breaks Node.js testability | Invert: UI imports engine |
| Direct `g.prop = value` outside reducer | Bypasses undo/redo | Always use `up(fn)` or `dispatch(action)` |
| Callbacks passed through 5+ component layers | Prop drilling, hard to debug | Prefer `dispatch()` as the single action channel |
| Event Bus / PubSub / Observer | Hidden coupling | Tick order + function composition |
| Global state outside `g` (window, module-level) | Undo can't track it | Everything in `g` |
| `require()` in ESM files | Path resolution from entry point, not file | Always use `import` (static ESM) |
| `structuredClone` on objects that might have non-cloneable fields (functions, DOM refs) | Silent failure or exception | Only clone game state, not UI state |

### Discouraged but Allowed

| Pattern | When Allowed |
|---------|-------------|
| Direct `g.log.unshift()` in a tick function | This is intentional — log is side-effect, not core state |
| `useRef` for fight animation state | Animation is UI-only, not game state |
| `useMemo` for derived data | Acceptable for performance in render-heavy components |

---

## 8 — Refactoring Guidelines

These rules apply when refactoring is explicitly requested (never refactor "while you're there").

### Monolith Extraction Pattern

When splitting a monolith function into an orchestrator + domain modules:

1. Extract constants into a `config.js` file first
2. Extract domain functions into separate files, preserving exact behavior
3. Keep the original function as an orchestrator that calls the new modules in order
4. Add zero behavioral changes during extraction — that is a separate pass

### What Refactoring Must Preserve

- Public API exports (rename = break callers = unauthorized)
- Simulation order in `tick()`
- Reducer action type names (existing `dispatch()` calls reference them)
- Save data format (changes break existing saves)

### Separation of Concerns Refactor

When told to "separate concerns," follow this specific sequence:

1. Move constants to `config.js`
2. Move factory/init functions to `state.js` or `builders.js`
3. Move business logic to domain modules
4. Keep orchestration (imports + ordered calls) in the original file
5. Verify: behavior before and after must be identical for the same RNG seed

---

## 9 — Architecture Decision Records

### ADR-001 — Single State Object

**Decision:** Use one plain object (`g`) for all game state.

**Context:** The game is small enough that Redux, Zustand, or Context API add complexity without benefit. A single object makes save/load trivial (JSON.stringify), undo/redo simple (snapshot + restore), and the entire game state inspectable in one variable.

**Consequence:** All components must receive `g` as a prop or extract needed slices near the consumer. This is by design — every component has access to the full game state when needed.

### ADR-002 — In-Place Mutation with Clone

**Decision:** Mutate `g` in place after cloning, rather than immutable updates.

**Context:** The engine has complex nested mutation logic (fighters, arrays, nested objects). Immutable patterns would require spread operators or Immer for no meaningful gain in this project size. Cloning before mutation ensures the previous state is preserved for undo.

**Consequence:** Reducer functions look like mutation. This is intentional and not a code smell in this architecture.

### ADR-003 — Registry Over Switch

**Decision:** When a dispatch or handler grows beyond 5 branches, extract into a registry.

**Context:** The original reducer had a 20-branch switch statement. Extracting into domain reducers eliminated merge conflicts, reduced file size, and made each domain independently testable.

**Consequence:** Adding a new action type requires creating a new domain file only if the domain doesn't exist yet. If it does, just add a case to the existing domain reducer.

### ADR-004 — Engine/UI Separation

**Decision:** Zero React imports in `src/engine/`. Engine must run in Node.js.

**Context:** This was a retrospective decision after finding React dependencies in engine code during refactoring. The rule is enforced by code review (not by tooling).

**Consequence:** UI components must import engine functions, never the reverse. If the engine needs data from the UI, the UI should pass it as a parameter.

### ADR-005 — Deterministic RNG

**Decision:** Use a seedable RNG (mulberry32) for all simulation code.

**Context:** Debugging fight outcomes requires reproducibility. With a seedable RNG, the same seed produces the same fight result, enabling regression testing.

**Consequence:** `random()` and `pick()` from `rng.js` must be used instead of `Math.random()`. The RNG state is reset between tests using `resetRNG()`.

---

*This document evolves as architectural decisions are made. Add new ADRs when a decision has lasting consequences for the codebase structure.*
