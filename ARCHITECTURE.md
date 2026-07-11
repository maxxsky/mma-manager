# 🏗️ MMA Manager — Architecture Review

> **Date:** 2026-07-09  
> **Scope:** Architecture only — module boundaries, data flow, coupling, patterns, scalability  
> **Status:** Single-Player Phase Complete  

---

## 1. HIGH-LEVEL ARCHITECTURE

```
┌─────────────────────────────────────────────┐
│                  App.jsx (399 LOC)           │
│  State wiring · Save/Load · Dispatch bridge  │
│  Routing · Keyboard shortcuts · Modals       │
└──────────┬────────────────────┬─────────────┘
           │                    │
    ┌──────▼──────┐      ┌──────▼──────────────┐
    │   ENGINE     │      │        UI            │
    │  13 files    │      │   17 files            │
    │ ~2,865 LOC   │      │  ~4,501 LOC           │
    │              │      │                       │
    │ Pure JS      │      │ React 18              │
    │ Zero UI deps │      │ Inline styles         │
    │ Testable     │      │ Ironfist theme system │
    └──────────────┘      └───────────────────────┘
```

**The architecture is a clean two-layer system** — engine and UI are fully separated with zero cross-contamination. This is the single strongest architectural decision in the project.

---

## 2. ENGINE LAYER — Internal Architecture

### 2.1 Module Dependency Graph

```
rng.js ───────────── (zero deps — utilities, seeded PRNG)
data.js ──────────── (zero deps — constants, config)
  │
  ├─ fighter.js ──── (rng, data) — entity generation
  │    ├─ rankings.js ── (rng, data, fighter)
  │    ├─ rivals.js ──── (rng, data, fighter)
  │    └─ economy.js ─── (rng, data)
  │
  ├─ relationships.js ─ (rng) — fighter-to-fighter
  ├─ achievements.js ── (data) — unlock tracking
  ├─ i18n.js ────────── (zero deps) — translations
  ├─ finance.js ─────── (fighter, data) — shared calculations
  │
  ├─ reducer.js ─────── (rng, data, fighter, economy, rankings, relationships)
  │                     Action-based state mutation — 19 action types
  │
  ├─ state.js ───────── (rng, data, fighter, economy, rankings, rivals, relationships)
  │                     Game loop (tick) + initialization — 145 LOC (decomposed into tick/ submodules)
  │
  └─ fight.js ───────── (rng, data) — round simulation — 332 LOC
```

### 2.2 Pattern: Data → Generator → Simulation → Mutation

The engine follows a clean layered pattern:

| Layer | Files | Responsibility |
|-------|-------|---------------|
| **Constants** | `data.js`, `i18n.js` | Pure data — traits, training, tiers, strings |
| **Utilities** | `rng.js`, `finance.js` | Seeded PRNG, clamping, formatting, shared calc |
| **Generation** | `fighter.js`, `rivals.js`, `rankings.js` | Entity creation — fighters, camps, divisions |
| **Simulation** | `fight.js`, `economy.js` | Pure computation — round sim, training bonuses |
| **State Mutation** | `reducer.js`, `state.js` | Action dispatch + weekly tick loop |
| **Tracking** | `relationships.js`, `achievements.js` | Cross-entity bookkeeping |

### 2.3 Strengths

- **Engine is fully testable** — `simRound(rnd, A, B, staA, staB, plan, corner)` is a pure function accepting typed inputs and returning a result object. No side effects, no UI, no DOM. Can be tested with any JS runner.
- **Dependency direction is correct** — Data files have zero imports. Utilities only import data. Generators import utilities + data. Simulators import generators + utilities. State mutation imports everything. No circular dependencies.
- **Seeded RNG enables reproducibility** — `mulberry32(seed)` provides deterministic fight outcomes for debugging and balance testing. The `tools/` directory leverages this for batch simulations.
- **i18n is engine-level** — Translation tables live in the engine, not the UI. The engine could be used server-side with full i18n support.

### 2.4 Weaknesses (resolved)

- ~~**`state.js` is too large (1,041 LOC)**~~ — **RESOLVED.** Decomposed into `tick/training.js`, `tick/fight-offers.js`, `tick/settlement.js`, `tick/yearly.js`, `tick/weight-change.js`, `tick/rankings.js`, `tick/rivals.js`. `state.js` now 145 LOC — pure orchestration.
- ~~**`reducer.js` `INBOX_EVENT` handler is 200+ lines**~~ — **RESOLVED.** Replaced with 6 domain reducers (`reducer/camp.js`, `reducer/fighter.js`, `reducer/coach.js`, `reducer/contract.js`, `reducer/fight.js`, `reducer/ui.js`). Main reducer is 75 LOC — delegates to domain modules.
- **In-place mutation everywhere** — The engine mutates state objects directly. This is performant for a game loop but makes undo/redo fragile (deep snapshots) and complicates debugging (no immutable state history).
- **No type system** — JSDoc typedefs exist in `rng.js` but are not enforced. Property shape mismatches are only caught at runtime. TypeScript would catch these at compile time.

---

## 3. UI LAYER — Component Architecture

### 3.1 Component Tree

```
App.jsx
├── Sidebar          (nav: Dashboard, Roster, Rankings, Scout, Inbox, Finance, Facility, Rivals)
├── TopBar           (title, Y·M·W date, KPI chips: Bank/Rep/Chem/Legacy, save/lang)
├── [tab content]
│   ├── Dashboard    (KPI strip, priorities, upcoming fights, camp feed)
│   ├── Roster       (fighter table → FighterDetail)
│   │   └── FighterDetail (identity, AttrTele+OctaRadar, training, contract, history)
│   ├── Rankings     (chip selector, champion banner, ranked table, P4P)
│   ├── Scout        (filters, scout methods, prospect cards → NegotiateModal)
│   ├── Inbox        (fight offers, sponsor cards, events)
│   ├── Finance      (P&L summary, cash reserve, income/expense splits)
│   ├── Facility     (2-col: coaches + camp tier/facilities)
│   └── RivalsScreen (rival cards, top fighters, poach targets)
├── FightNight       (fullscreen overlay: staredown→weigh-in→fight→result)
├── NegotiateModal   (contract negotiation dialog)
└── LangContext      (i18n React context provider)
```

### 3.2 Design System

The `theme.jsx` file defines a centralized design token system:

| Layer | Purpose |
|-------|---------|
| `T` tokens | Colors, fonts, spacing — single source of truth |
| `C` compat | Backward-compat getters for old code (`C.goldDim`) |
| Primitives | `Panel`, `Eyebrow`, `Tag`, `Btn`, `Mono`, `Ovr` |
| Signatures | `AttrTele` (ceiling bar), `CompareBar` (tale of the tape), `OctaRadar`, `Meter` |
| `GlobalStyle` | CSS-in-JS: scrollbars, hover states, focus-visible, reduced-motion |

### 3.3 Strengths

- **All styling through theme tokens** — No hardcoded colors or font families in components. Changing the palette is a one-file edit.
- **Component boundaries match game screens** — Each tab is a self-contained component with clear props interface.
- **FightNight is a standalone overlay** — Does not share state with the main app shell, preventing cross-contamination.
- **Modal pattern correct** — `NegotiateModal` receives data via props and calls back via `onCommit`/`onClose`. Clean separation.

### 3.4 Weaknesses

- **No code splitting / lazy loading** — The entire app is a single ~427KB JS bundle. FightNight (186 LOC) and theme.jsx (276 LOC) could be lazy-loaded since they're not needed on initial render.
- **Props drilling** — `g`, `dispatch`, `t`, `fmt$` are passed through 3+ component levels. Context or a state management library would reduce boilerplate.
- **All inline styles** — While consistent with the design token approach, all 32+ JSX files use inline style objects with zero tooling support (no autocomplete, no linting, no extraction). A CSS-in-JS library or separate stylesheet would improve DX.
- **No `React.memo` / `useMemo` / `useCallback`** — Every state change in `App.jsx` causes a full re-render of the entire component tree. The dashboard KPI strip, roster table, and rankings all recompute on every render.

---

## 4. DATA FLOW

### 4.1 State Mutation Path

```
User Action → UI Component → dispatch(action) → App.dispatch()
                                                    │
                                          ┌─────────▼──────────┐
                                          │ SIGN_CONTRACT_PRE?  │
                                          │ → setNego (modal)   │
                                          └─────────┬──────────┘
                                                    │ else
                                          ┌─────────▼──────────┐
                                          │ up(fn)              │
                                          │ → structuredClone   │
                                          │ → fn(g)             │
                                          │ → reducer(g,action) │
                                          │ → setG              │
                                          └─────────┬──────────┘
                                                    │
                                          React re-render ←────┘
```

### 4.2 Save/Load

```
App mount → localStorage.getItem(SAVE_KEY)
                │
        ┌───────▼────────┐
        │ Migration layer │  ← adds f.training, f.ceilings, f.sponsors, etc.
        └───────┬────────┘
                │
           setG(s) → render
                │
    Every state change → throttle → localStorage.setItem
```

### 4.3 Strengths

- **Single source of truth** — One `g` object contains all game state. No sync issues.
- **Migration layer is explicit** — Old save formats are upgraded in one place before the game loads.
- **dispatch bridge pattern** — App-level `dispatch()` intercepts UI-specific actions (`SIGN_CONTRACT_PRE`) before they reach the engine reducer. Clean separation of concerns.

### 4.4 Weaknesses

- **`structuredClone(g)` on every mutation** — The entire game state is deep-cloned for React immutability. As the game progresses (more fighters, longer log, more divisions), this becomes a performance bottleneck. Should use shallow merge or immutable update patterns.
- **No middleware** — Side effects (save throttling, achievement checks) are mixed into the state update path. A middleware chain would make these composable and testable.
- **Save key is slot-dependent** — `saveKey(saveSlot)` means slots are independent. But there's no export/import, backup, or cloud save.

---

## 5. PATTERNS & ANTI-PATTERNS

### 5.1 ✅ Good Patterns

| Pattern | Where | Why it works |
|---------|-------|-------------|
| **Seeded RNG** | `rng.js` | Deterministic fights for debugging and balance testing |
| **Action-based reducer** | `reducer.js` | Single entry point for state changes — easy to audit and extend |
| **Design token system** | `theme.jsx` | Consistent styling, one-file palette changes |
| **Component-per-screen** | `ui/*.jsx` | Each game tab is one component — clear ownership |
| **Modal callback pattern** | `NegotiateModal` | `onCommit(deal)` / `onClose()` — clean data flow |
| **Save migration** | `App.jsx` useEffect | Old saves upgraded on load, not mutated in-place |

### 5.2 ❌ Anti-Patterns

| Anti-Pattern | Where | Impact |
|-------------|-------|--------|
| ~~**God object**~~ | ~~`state.js` tick()~~ | ~~1,041 LOC monolithic — ~~**RESOLVED.** Decomposed into 8 tick modules, state.js is now 145 LOC of orchestration only. |
| **Deep clone for immutability** | `App.jsx` up() | O(n) per mutation on entire game state — linear degradation |
| **Props drilling** | All components | `g`, `dispatch`, `t` threaded through 3+ levels |
| **Inline style sprawl** | All UI files | All 32+ JSX files use inline styles — no tooling, no reuse |
| **No lazy loading** | Vite config | Single ~427KB bundle — FightNight, theme, Rankings load on first paint |
| ~~**switch-else chain**~~ | ~~`reducer.js` INBOX_EVENT~~ | ~~200+ lines of if/else —~~ **RESOLVED.** 6 domain reducers, 75 LOC main reducer. |

---

## 6. SCALABILITY

### 6.1 Current Limits

| Resource | Limit | Risk |
|----------|-------|------|
| Game state size | Grows unbounded (log, history, divisions) | `structuredClone` cost grows linearly |
| Roster size | 4–14 fighters | Current loop patterns are O(n) — safe |
| Divisions | 8 weight classes × 15 fighters | P4P calculation is O(divisions × fighters) — ~120 iterations |
| Undo stack | Capped at 20 | Each snapshot is full state clone → up to 20× memory |
| localStorage | Browser limit ~5MB | Game state is JSON-serialized — could hit the cap |

### 6.2 Multiplayer Readiness

The engine is **architecturally ready** for server-side use:
- Pure JS, no DOM/React dependencies → can run in Node.js
- Seeded RNG → server can reproduce any fight
- Action-based state → same reducer works server-side

**What's missing for multiplayer:**
- Server runtime (Express + Socket.IO per `backend-blueprint-v1.md`)
- Database persistence (SQLite/PostgreSQL per blueprint)
- JWT auth + user accounts
- Fight scheduling + cron
- WebSocket for live fight streaming

The `backend-blueprint-v1.md` document covers all of this in detail.

---

## 7. RECOMMENDATIONS

### Short-term (low effort, high impact)

1. **Decompose `tick()`** — Extract `tickTraining()`, `tickFightOffers()`, `tickSponsors()`, `tickRivals()` into separate files under `engine/tick/`. The tick function becomes an orchestrator calling each subsystem.

2. **Add React.memo to data-display components** — `Dashboard`, `Roster`, `Rankings`, `Finance` are pure displays of `g` state. Wrapping them in `React.memo` would eliminate unnecessary re-renders.

3. **Extract repeated financial calculations** — `monthlyBurn`/`monthlyIn` already extracted to `finance.js`, but `Dashboard`, `Finance`, and `App.jsx` still duplicate similar calculation patterns.

### Medium-term (architectural improvements)

4. **Introduce a lightweight state manager** — Zustand or Jotai (1-2KB) would eliminate props drilling and provide selective re-rendering without the boilerplate of Redux.

5. **Code-split FightNight** — `React.lazy(() => import('./FightNight'))` would reduce initial bundle by ~30%. FightNight is only needed when a fight starts.

6. **Add TypeScript** — Start with `engine/fight.js` (pure functions, clear input/output types). Incrementally expand. The property shape bugs found during audit would have been caught at compile time.

### Long-term (when multiplayer phase begins)

7. **Move engine to a shared package** — Publish `mma-manager-engine` as an npm workspace. Both client and server import it. Ensures fight simulation is identical on both sides.

8. **Replace in-place mutation with immutable store** — When the server needs to process multiple concurrent fights, in-place mutation becomes a concurrency hazard. An immutable approach (Immer, or Redux-style reducers) would be safer.

---

## 8. SUMMARY

| Dimension | Rating | Notes |
|-----------|--------|-------|
| **Engine/UI Separation** | ⭐⭐⭐⭐⭐ | Perfect — engine has zero UI imports |
| **Module Boundaries** | ⭐⭐⭐⭐ | Clean dependency direction, but `state.js` too large |
| **Data Flow** | ⭐⭐⭐ | Single source of truth, but deep-clone is wasteful |
| **Component Design** | ⭐⭐⭐⭐ | One component per screen, clear props interfaces |
| **Styling System** | ⭐⭐⭐⭐ | Centralized tokens, but inline styles lack tooling |
| **Testability** | ⭐⭐⭐⭐ | Engine is pure JS — highly testable, but no tests exist |
| **Performance** | ⭐⭐⭐ | Good for current scale, no optimizations applied |
| **Multiplayer Readiness** | ⭐⭐⭐⭐ | Engine is server-ready, blueprint exists, not started |
| **Code Quality** | ⭐⭐⭐ | Clean overall, but monolithic functions need decomposition |

**The architecture is fundamentally sound.** The engine/UI separation is the project's strongest asset — it makes the codebase testable, portable, and multiplayer-ready. The main areas for improvement are decomposition of monoliths (`tick()`, `INBOX_EVENT`), performance optimization (memoization, lazy loading), and developer experience (TypeScript, styling tooling).
