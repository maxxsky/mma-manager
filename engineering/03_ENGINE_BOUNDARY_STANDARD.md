# Engine Boundary Standard — (Current State Discovery)

> **Domain:** Layer boundaries, allowed dependencies, forbidden imports, separation of concerns
> **Source:** MMA Manager codebase (`app/src/`)
> **Discovery Date:** July 2026
> **Version:** 1.0

---

## 1 — Purpose

This document defines the layer boundaries in the MMA Manager codebase. It answers: what does each layer own? what can it import? what can it NOT import? where does business logic live? where does rendering live? what bridges them?

This is an **engineering standard** based on actual codebase discovery. The boundaries documented here are enforced by code review, not by tooling. Every violation found during discovery is documented in Migration Notes.

---

## 2 — Discovery Summary

### Layers Identified

| Layer | Directory | Files | Primary Role |
|-------|-----------|-------|-------------|
| **Shell** | `App.jsx` | 1 | Orchestration — owns state, distributes `g`, `dispatch`, `up` |
| **Pages** | `ui/*.jsx` | 19 | Full-screen views — reads `g`, triggers actions |
| **Components** | `components/*.jsx` | 12 | Reusable display units — minimal logic |
| **Theme** | `ui/theme.jsx` | 1 | Design primitives — Panel, Btn, Tag, icons |
| **Hooks** | `hooks/*.js` | 5 | Bridge between React and Engine — state management, save/load, fight prep |
| **Engine** | `engine/` | 45+ | All business logic, simulation, data — zero React, zero UI |
| **Services** | `services/*.js` | 1 | External persistence — localStorage, no app dependencies |
| **i18n** | `i18n/index.js` | 1 | Translations — standalone utility |

### Audit Results

| Check | Result |
|-------|--------|
| Engine imports React? | ❌ Zero instances — clean |
| Engine imports UI/Hooks/Components? | ❌ Zero instances — clean |
| Engine imports Services? | ❌ Zero instances — clean |
| UI imports Engine? | ✅ Allowed — uses public exports |
| UI imports Engine reducer directly? | ❌ 1 violation (FighterDetail.jsx) |
| Hooks import Engine? | ✅ Allowed — bridges layers |
| Hooks import UI/Themes/Components? | ❌ Zero instances — clean |
| Services import ANY app code? | ❌ Zero instances — clean |
| Theme import Engine? | ✅ 1 import — `clamp` from `engine/rng.js` |

### Boundary Violations Found

| # | File | Violation | Severity |
|---|------|-----------|----------|
| 1 | `ui/FighterDetail.jsx` | Imports `reducer` from `engine/reducer.js` directly | Major — bypasses dispatch clone + undo |
| 2 | `ui/FighterCard.jsx` | Imports `vacateTitle` from `engine/rankings.js` and `getRel` from `engine/relationships.js` | Minor — engine internals used for display |
| 3 | `components/fight/ResultScreen.jsx` | Imports `generateFightNarrative` from `engine/narrative.js` | Minor — narrative function in Component |
| 4 | Multiple UI files | Import directly from engine submodules instead of `engine/index.js` barrel | Minor — optional barrel usage |

---

## 3 — Current Layer Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                     LAYER DIAGRAM                                │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐   │
│  │  Shell   │───►│  Pages   │───►│Components│    │          │   │
│  │ App.jsx  │    │  ui/*    │    │comp/*.jsx│    │  Theme   │   │
│  │          │    │          │    │          │    │theme.jsx │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘   │
│       │               │                                        │
│       ▼               ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                        HOOKS                             │   │
│  │    useGameState  ·  useSaveLoad  ·  useKeyboard          │   │
│  │    useFightPrep  ·  useFightSeed                         │   │
│  │                    │                                     │   │
│  │                    ▼                                     │   │
│  │  ┌──────────────────────────────────────────────────┐    │   │
│  │  │                    ENGINE                         │    │   │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐      │    │   │
│  │  │  │ state.js │ │reducer.js│ │ rng.js/data.js│      │    │   │
│  │  │  │ tick()   │ │reducers/ │ │ fighter.js    │      │    │   │
│  │  │  └──────────┘ └──────────┘ │ fight.js      │      │    │   │
│  │  │  ┌──────────┐ ┌──────────┐ │ finance.js    │      │    │   │
│  │  │  │ tick/    │ │ world/   │ │ rankings.js   │      │    │   │
│  │  │  │ events/  │ │ fight/   │ │ economy.js    │      │    │   │
│  │  │  │ narrative│ │ dispatch/│ │ ...           │      │    │   │
│  │  │  └──────────┘ └──────────┘ └──────────────┘      │    │   │
│  │  └──────────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
│       │                                                        │
│       ▼                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      SERVICES                            │   │
│  │           saveService.js — localStorage only              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  DEPENDENCY DIRECTION:                                           │
│  Shell → Pages → Components (reads state + dispatch)            │
│  Shell → Hooks (state management)                               │
│  Hooks → Engine (business logic)                                │
│  Hooks → Services (persistence)                                  │
│  Theme → Engine (only `clamp` from rng.js)                      │
│  Engine → NO UPSTREAM DEPENDENCIES                               │
│  Services → NO APP DEPENDENCIES                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Dependency Flow (Text)

```
Player
   │
   ▼
UI (Pages / Components / Theme)
   │
   ▼
Hooks
   │
   ├──► Engine (business logic, simulation, data)
   └──► Services (persistence)

Engine → ONLY imports from other engine modules (internal)
Services → ONLY imports from platform APIs (localStorage)
```

---

## 4 — Layer Responsibilities

### 4.1 Shell (`App.jsx`)

**Owns:** State (`g` via `useState`), lifecycle (load/save/new game), routing (tab state), modal orchestration.

```jsx
// App.jsx creates state and distributes capabilities:
const [g, setG] = useState(() => newGame());
const { up, dispatch, advance } = useGameState(g, setG, saveSlot);
const { loaded, saveSlot, newGame: startNew } = useSaveLoad(setG);

// Distributes to pages
<Dashboard g={g} setTab={setTab} dispatch={dispatch} ... />
<Roster g={g} dispatch={dispatch} up={up} ... />
```

**Allowed imports:** Hooks, Engine (for initialization), Theme, i18n.
**Forbidden:** Services (call through hooks), direct localStorage access.

### 4.2 Pages (`ui/*.jsx`)

**Owns:** Screen-level layout, reads game state, dispatches player actions.

```jsx
export default function Finance({ g }) { ... }         // read-only
export default function Inbox({ g, dispatch }) { ... }  // dispatch actions
export default function Roster({ g, dispatch, up }) {...}  // complex ops
```

**Allowed imports:** Theme, Engine (read-only functions like `avgSkill`, `fmt$`), i18n.
**Forbidden:** Engine reducer (call through `dispatch` only), Services, direct state mutation.

### 4.3 Components (`components/*.jsx`)

**Owns:** Reusable display units. Accept data and callbacks via props.

```jsx
export default function WeeklySummary({ summary, onClose, t }) { ... }
export default function FightCard({ fighter, g, onProceed }) { ... }
```

**Allowed imports:** Theme, Engine (display utilities only: `fmt$`, `ARCH_COLOR`).
**Forbidden:** Engine business logic, reducer, hooks, services.

### 4.4 Theme (`ui/theme.jsx`)

**Owns:** Design primitives (Panel, Btn, Tag, Eyebrow, Mono, OVR, Icon). Color tokens. Global style.

```jsx
export const T = { bg: "#0e1116", surface: "#161b23", ... };
export const Panel = ({ children, style, pad = 16 }) => ( ... );
export const Btn = ({ children, color, onClick, ... }) => ( ... );
```

**Allowed imports:** Engine (only utilities needed for display: `clamp` for Meter bar).
**Forbidden:** Engine business logic (data, fighter, economy), hooks, services.

### 4.5 Hooks (`hooks/*.js`)

**Owns:** Bridge between React lifecycle and Engine logic. State management, persistence orchestration, keyboard shortcuts.

```jsx
// useGameState — clones g, wraps reducer, schedules auto-save
export function useGameState(g, setGOrig, saveSlot) {
  const up = (fn) => setGOrig((old) => {
    const n = JSON.parse(JSON.stringify(clean));
    fn(n);
    // schedule save
    return n;
  });
  const dispatch = (action) => up((n) => { reducer(n, action); });
  const advance = () => up((n) => { tick(n); ... });
}
```

**Allowed imports:** Engine (business logic), Services (saveService for persistence).
**Forbidden:** Theme, UI, Components, direct DOM access.

### 4.6 Engine (`engine/`)

**Owns:** All game business logic. Simulation (tick, training, combat, economy). State initialization (newGame). State mutation (reducer functions). Data definitions (archetypes, traits, sponsors). Algorithms (RNG, ranking, matchmaking).

```jsx
// engine/state.js — pure JS, no React
export function tick(g) {
  g.week++;
  tickTraining(g);
  tickChemistry(g);
  // ...
}
```

**Allowed imports:** Engine modules only (internal). No external dependencies.
**Forbidden:** React, UI, Hooks, Components, Services, Theme, DOM APIs.

### 4.7 Services (`services/*.js`)

**Owns:** External persistence. localStorage serialization and deserialization.

```jsx
export function saveGame(slot, state) {
  localStorage.setItem(saveKey(slot), JSON.stringify(state));
}
```

**Allowed imports:** Platform APIs only (localStorage). No app code imports.
**Forbidden:** Engine, Hooks, UI, Components, Theme.

### 4.8 i18n (`i18n/index.js`)

**Owns:** Translation strings (EN/ID). Utility function `t(key)`.

**Allowed imports:** None (standalone data file with strings).
**Forbidden:** Engine, Hooks, UI, Services.

---

## 5 — Allowed Dependencies

| Layer | Can Import From |
|-------|----------------|
| **Shell** | Hooks, Engine, Theme, i18n |
| **Pages** | Theme, Engine (read-only public exports), i18n |
| **Components** | Theme, Engine (display utilities only) |
| **Theme** | Engine (utility only — `clamp`) |
| **Hooks** | Engine (any public export), Services |
| **Engine** | Engine modules only (internal) |
| **Services** | Platform APIs only (localStorage) |
| **i18n** | Nothing (standalone data) |

### Import Diagram

```
Shell ──► Hooks ──► Engine
  │         │
  │         └──► Services ──► localStorage
  │
  └──► Theme ──► Engine (clamp only)
  │
  └──► i18n
  │
  ├──► Pages ──► Theme
  │         └──► Engine (read-only)
  │         └──► i18n
  │
  └──► Components ──► Theme
                └──► Engine (display utils only)
```

---

## 6 — Forbidden Dependencies

| Layer | Can NOT Import |
|-------|---------------|
| **Engine** | React, UI, Components, Hooks, Services, Theme |
| **Hooks** | UI, Components, Theme |
| **Pages** | Services, Hooks (call hooks from Shell), Reducer directly |
| **Components** | Services, Hooks, Reducer, Business functions from Engine |
| **Theme** | Business logic from Engine (fighter, economy, rankings) |
| **Services** | Any app code from any layer |
| **i18n** | Any app code from any layer |

### Forbidden Dependency Table

| From | To | Why |
|------|----|-----|
| Engine | React | Would break Node.js testability (ADR-004) |
| Engine | UI/Hooks | Would create circular dependency and prevent testing without browser |
| Pages | Reducer directly | Bypasses clone + undo + auto-save mechanism |
| Pages | Services | Must go through Hooks (useSaveLoad) |
| Components | Business logic | Components should render, not calculate |
| Theme | Business engine modules | Theme is visual only — no game data |

---

## 7 — Data Flow Across Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                   DATA FLOW ACROSS LAYERS                       │
│                                                                 │
│  ┌─────┐    read g          ┌─────┐    dispatch/up    ┌────────┐│
│  │ UI  │◄───────────────────│Hooks│◄──────────────────│ Player ││
│  │     │    re-render on    │     │                   │ Click  ││
│  │     │    state change    │     │                   │        ││
│  └─────┘                    └─────┘                   └────────┘│
│    │                            │                               │
│    │ read g                     │                               │
│    ▼                            ▼                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                     ENGINE                               │   │
│  │                                                          │   │
│  │  Hooks calls:     reducer/g.clone → mutation → return    │   │
│  │  Or:              tick(g) → simulation → mutation        │   │
│  │                                                          │   │
│  │  Engine reads g, mutates g (cloned), returns g'          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  DATA DIRECTION:                                                │
│  Player → UI → Hooks → Engine (actions)                         │
│  Engine → Hooks → UI → Player (state updates)                   │
└─────────────────────────────────────────────────────────────────┘
```

### Read Path

```
Player sees screen
  → UI reads g.props (passed from App/Screen)
  → UI computes derived values (filters, sorts, summaries)
  → UI renders using Theme primitives
  → Player sees formatted information
```

### Write Path

```
Player clicks button
  → UI calls dispatch({ type, payload })
  → dispatch() in useGameState:
      1. Intercepts SIGN_CONTRACT_PRE for modal
      2. Calls up((n) => reducer(n, action))
  → up() in useGameState:
      1. Deep-clones g (strips undo stacks)
      2. Calls fn(clone) — reducer runs here
      3. Schedules auto-save (1s debounce)
      4. Returns clone to setG
  → React re-renders with new g
  → UI reads new g → updates display
```

---

## 8 — Decision Tree

Use this tree to decide where new code belongs.

```
"Aku mau menambah logic baru."
         │
         ▼
Apakah ini aturan bisnis game?
(fighter growth, combat formula,
economic calculation, ranking math)
         │
    Yes ───────► ENGINE
         │
    No  │
         ▼
Apakah ini persistence?
(save game, load game, localStorage)
         │
    Yes ───────► SERVICE
         │
    No  │
         ▼
Apakah ini presentasi?
(rendering, layout, styling, animations)
         │
    Yes ───────► UI (page or component)
         │
    No  │
         ▼
Apakah ini visual primitive?
(Panel, Btn, Eyebrow, Tag, Icon, Meter)
         │
    Yes ───────► THEME
         │
    No  │
         ▼
Apakah ini bridge antara React dan Engine?
(state management, lifecycle, save orchestration)
         │
    Yes ───────► HOOK
         │
    No  │
         ▼
Apakah ini orchestration antara hook dan pages?
(shell routing, modal state, keyboard shortcuts)
         │
    Yes ───────► SHELL (App.jsx)
         │
    No  │
         ▼
   Cari layer yang tepat atau tanya Brahma.
```

---

## 9 — Anti-Patterns

### ❌ Calling reducer directly from UI

```jsx
// ANTI-PATTERN — Found in FighterDetail.jsx
import { reducer } from "../engine/reducer.js";
reducer(g, action);
```

**Why it's wrong:** Bypasses the clone mechanism, undo stack, and auto-save. The reducer mutates `g` in place, so it modifies the live state without `setG` being called to trigger a re-render.

**Should be:**
```jsx
dispatch({ type: "ACTION_NAME", ...payload });
```

### ❌ Importing engine internals for display display

```jsx
// ANTI-PATTERN — Found in FighterCard.jsx
import { vacateTitle } from "../engine/rankings.js";
import { getRel } from "../engine/relationships.js";
```

**Why it's wrong:** Engine functions that MUTATE state should not be available to UI components. UI should only import read-only functions (`avgSkill`, `rankOf`, `fmt$`).

**Should be:** Only import read-only functions from engine. If a function modifies state, call it through `dispatch`.

### ❌ Engine functions in Components

```jsx
// ANTI-PATTERN — Found in components/fight/ResultScreen.jsx
import { generateFightNarrative } from "../../engine/narrative.js";
```

**Why it's wrong:** Components should be self-contained display units. Importing narrative generation logic into a component blurs the boundary.

**Should be:** Narrative generation belongs in the Engine (or via a hook). The component receives the result as a prop.

### ❌ Engines importing from outside engine/

```jsx
// ANTI-PATTERN — Not currently found in the codebase
import React from "react";  // would break Node.js testing
import { Panel } from "../ui/theme.jsx";  // creates circular dependency
```

**Why it's wrong:** The engine must remain pure JavaScript that can run in Node.js without a browser. Any React, UI, or DOM dependency breaks testability and creates circular import chains.

### ❌ Pages importing Services directly

```jsx
// ANTI-PATTERN — Not currently found in the codebase
import { saveGame } from "../services/saveService.js";
```

**Why it's wrong:** Persistence orchestration (when to save, which slot, backup management) is handled by hooks. Pages should not manage save lifecycle.

**Should be:** Always go through `useSaveLoad` hook. The hook manages slot, migration, and backup.

---

## 10 — AI Decision Heuristics

1. **Find the correct layer before writing code.** If the code implements a business rule, it belongs in Engine. If it displays data, it belongs in UI. If it bridges the two, it belongs in a Hook.

2. **Do not move logic between layers.** If business logic ends up in a UI component, move it back to the engine. If persistence orchestration ends up in App.jsx, move it to a hook.

3. **Respect dependency direction.** Arrows point down. Engine imports nothing outside engine. Services import nothing outside platform. Theme imports only utilities. Violating dependency direction creates maintenance burden.

4. **Do not create shortcuts across layers.** Calling `reducer` from a UI component because `dispatch` is "too many layers" is a shortcut. The layers exist for a reason — clone, undo, auto-save. Each layer adds necessary capabilities.

5. **Reuse existing boundary patterns.** If existing code puts ranking display logic in a hook, put new ranking display logic in a hook too. If existing code generates narratives in the engine, put new narrative generation in the engine too.

6. **When in doubt, put it in the engine.** It's easier to move logic from engine to UI than to extract it from UI back to engine.

7. **Check what type of function you're importing.** Is it read-only (display formatting, computed values)? Put it in UI. Does it modify state? Put it behind `dispatch`. Is it a data definition? Put it in engine/data.

---

## 11 — Validation Checklist

For any new file or import:

- [ ] **Layer is correct** — is this code in the right directory?
- [ ] **Dependencies are correct** — does the file only import from allowed layers?
- [ ] **No business logic in UI** — are calculations, formulas, and mutations in the engine?
- [ ] **No React in Engine** — does engine/ contain zero React imports?
- [ ] **No engine imports outside engine** — does engine/ only import from engine/?
- [ ] **No direct reducer access from UI** — do all state changes go through `dispatch`?
- [ ] **No direct service access from UI** — do all save/load operations go through hooks?
- [ ] **Data flow is one direction** — does state flow down via props and actions flow up via dispatch?
- [ ] **Import path respects layer boundary** — relative paths don't jump into forbidden layers.

---

## 12 — Migration Notes

### 12.1 Violation: FighterDetail.jsx imports reducer directly

**Location:** `ui/FighterDetail.jsx:5`
**Current code:** `import { reducer } from "../engine/reducer.js";`
**Issue:** Direct reducer call bypasses `dispatch` → `up` → clone → undo → auto-save pipeline.
**Recommended fix:** Replace with `dispatch({ type: "TRAINING_CHANGE" })` or similar action.

### 12.2 Violation: FighterCard.jsx imports engine mutation functions

**Location:** `ui/FighterCard.jsx:5-6`
**Current code:** `import { vacateTitle } from "../engine/rankings.js"` and `import { getRel } from "../engine/relationships.js"`
**Issue:** `vacateTitle` is a state-mutating function exposed to UI. `getRel` is used for display (read-only) but imported alongside mutation functions.
**Recommended fix:** `vacateTitle` should be behind a dispatch action. For now it's used only in context that requires it — document the intentional boundary crossing.

### 12.3 Inconsistency: Engine barrel file exists but not consistently used

**Location:** `engine/index.js`
**Current state:** The barrel re-exports all public engine functions. Some UI files use it, most import directly from individual modules.
**Issue:** Inconsistent import paths — some use `from "../engine/data.js"`, others could use `from "../engine/index.js"`.
**Recommended fix:** No immediate action. Direct imports work correctly. The barrel is available for new files.

### 12.4 Inconsistency: Import path variance across layers

**Current state:** Import paths use relative navigation:
- `ui/` → Engine: `"../engine/xxx.js"`
- `components/` → Engine: `"../engine/xxx.js"` or `"../../engine/xxx.js"`
- `hooks/` → Engine: `"../engine/xxx.js"`
- `engine/` → submodul e: `"./tick/xxx.js"` or `"../xxx.js"` (from subdirectories)

**Standard:** All imports use relative paths. No aliases or absolute imports. This is consistent across the codebase.

---

## 13 — Related Documents

| Document | What It Covers |
|----------|---------------|
| `02_ARCHITECTURE.md` | Layer rules, ADRs — architectural foundation for boundaries |
| `01_PROJECT_OVERVIEW.md` | System map — which domain owns what |
| `02_STATE_STANDARD.md` | State ownership and mutation rules |
| `01_COMPONENT_PATTERN.md` | Component structure and allowed imports |
| `knowledge/08_UI.md` | UI philosophy — presentation layer responsibilities |
| `knowledge/07_SAVE_SYSTEM.md` | Save system — services boundary |
| `engine/index.js` | Engine barrel — public API |
