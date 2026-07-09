# 🔧 MMA Manager — Code Quality Audit

> **Date:** 2026-07-10  
> **Scope:** Engineering quality — structure, architecture, state, maintainability, technical debt  
> **Method:** Evaluated entire codebase through engineering lens

---

## 1. PROJECT STRUCTURE

### 1.1 Folder Organization

```
app/src/
├── engine/           (44 files) — Pure game logic
│   ├── fight/        (5 files) — Fight engine submodules
│   ├── data/         (9 files) — Split data modules
│   ├── tick/         (3 files) — Tick domain extraction
│   ├── fight.js      — Combat orchestration
│   ├── fighter.js    — Fighter generation
│   ├── state.js      — Game loop + initialization
│   ├── reducer.js    — Action-based state mutation
│   ├── rng.js        — PRNG + utilities
│   ├── dispatch.js   — Inbox event dispatcher
│   ├── (17 more)     — Career, world, events, identity, narrative, etc.
├── ui/               (20 files) — React components
├── i18n/             (1 file)  — Translations
├── services/         (1 file)  — Save/load abstraction
├── App.jsx           — Application shell
└── main.jsx          — Entry point
```

**Assessment: GOOD.** The engine directory is well-organized with subdirectories for related modules. The UI directory is flat but each file maps to a game screen. The services directory is minimal but functional.

**Issue:** `engine/` has grown from 13 files to 44 files during this session. Some modules are tiny (relationships.js: 12 lines, finance.js: 17 lines) — could be consolidated. Other modules are standalone features with clear boundaries (career.js, world.js, events.js, dynasty.js).

### 1.2 Module Boundaries

**Engine:** Contains all game simulation logic. Zero UI imports. Zero React references. **✅ Perfect boundary.**

**UI:** Contains all React components. Imports from engine but never modifies engine state directly (uses `dispatch`/`up` bridges). **✅ Clean boundary.**

**Services:** Contains save/load abstraction. Isolated from both engine and UI concerns. **✅ Good boundary.**

**i18n:** Contains translation tables. Originally in engine, correctly extracted to dedicated module. **✅ Correct placement.**

### 1.3 Dependency Direction

```
rng.js → data.js → fighter.js → state.js → UI components
                                  ↓
                            reducer.js → UI components
                                  ↓
                            career/world/events/dynasty/narrative → state.js
```

**Direction is correct.** Data flows from utilities → data → generation → simulation → presentation. No circular dependencies. No upward imports.

### 1.4 Feature Organization

Features are organized as independent engine modules that plug into the tick cycle:

| Feature | Module | Wired Into |
|---------|--------|-----------|
| Career Identity | career.js | FightNight, state.js |
| World Simulation | world.js | state.js tick |
| Event State | events.js | state.js tick |
| Fight Narrative | narrative.js | FightNight |
| Dynasty | dynasty.js | state.js tick, dispatch.js |
| Training Philosophy | training-philosophy.js | FighterDetail |
| Archetype Expression | archetype-expression.js | fight/exchanges.js, FighterDetail |
| Shadow AI | shadow-ai.js | state.js tick |
| Narrative Presentation | narrative-presentation.js | state.js tick |
| Onboarding | onboarding.js | state.js tick |
| Polish | polish.js | App.jsx |

**Assessment: GOOD.** Each feature is a self-contained module with a single integration point. Features can be added or removed without affecting others.

---

## 2. ARCHITECTURE

### 2.1 Layer Responsibilities

| Layer | Responsibility | Adherence |
|-------|---------------|-----------|
| **data/** | Pure constants, no logic | ✅ Perfect |
| **rng.js** | PRNG, formatting, clamping | ✅ Good |
| **fighter.js** | Entity generation | ✅ Good |
| **fight.js** | Combat simulation | ✅ Good |
| **state.js** | Game loop orchestration | ⚠️ Still has ~860 lines |
| **reducer.js** | Action mutation | ⚠️ Has some business logic |
| **dispatch.js** | Inbox event routing | ✅ Clean |
| **tick/*.js** | Domain tick functions | ✅ Clean extraction |
| **ui/*.jsx** | Presentation only | ✅ Good |
| **App.jsx** | Shell, routing, state wiring | ⚠️ Has save migration, keyboard shortcuts, modals |

### 2.2 Business Logic Placement

**Where business logic lives:**
- Training calculation: `tick/training.js` ✅
- Fight simulation: `fight.js` ✅
- Contract management: `tick/contracts.js` ✅
- Retirement: `tick/contracts.js` ⚠️ Mixed with contract logic
- Chemistry events: `state.js` inline ⚠️ Not extracted
- Fight offers: `state.js` inline ⚠️ Not extracted

**The tick() function still contains inline logic for chemistry events and fight offers.** These should be extracted to follow the pattern established by training/rankings/contracts.

### 2.3 State Ownership

Single global state object `g` — clear ownership. Mutations happen in:
1. `tick()` and its submodules — weekly simulation
2. `reducer()` — player actions
3. `dispatch.js` — inbox event processing
4. `FightNight.jsx commitResult()` — fight outcomes

**Ownership is clear but distributed.** Each mutation point operates on `g` directly with in-place mutation. No middleware. No validation.

### 2.4 Module Coupling

**High coupling:**
- `state.js` imports from 12+ engine modules
- `reducer.js` imports from 6 modules
- `FightNight.jsx` imports from 5 engine modules

**Low coupling:**
- `rng.js` — zero imports
- `data/` modules — zero imports
- `i18n/` — zero imports

**Assessment: ACCEPTABLE.** The high-coupling modules are orchestrators by design. The dependency direction is correct.

### 2.5 Module Cohesion

**High cohesion:**
- `fight/config.js` — all combat constants in one place
- `fight/ground.js` — only ground position data
- `fight/matchup.js` — only matchup table
- `career.js` — all career identity logic
- `world.js` — all world simulation

**Low cohesion:**
- `state.js` — orchestrates training, fights, chemistry, contracts, rankings, rivals, world, events, identity
- `reducer.js` — handles 19 action types across all domains

**Assessment: ACCEPTABLE.** The low-cohesion modules are intentional orchestrators.

---

## 3. COMPONENTS

### 3.1 Component Size

| Component | Lines | Responsibility | Rating |
|-----------|-------|---------------|--------|
| FightNight.jsx | 503 | Fight presentation | ⚠️ Large but focused |
| Rankings.jsx | 683 | Division display | ⚠️ Too large for a display component |
| Scout.jsx | 639 | Scouting hub | ⚠️ Too large |
| RivalsScreen.jsx | 414 | Rival display | ⚠️ Large for display-only |
| FighterDetail.jsx | 235 | Fighter profile | ✅ Good |
| Dashboard.jsx | 226 | Command center | ✅ Good |
| Inbox.jsx | 311 | Message list | ⚠️ Slightly large |
| Finance.jsx | 389 | Financial display | ⚠️ Large but mostly layout |
| Facility.jsx | 92 | Camp management | ✅ Good |
| Sidebar.jsx | 79 | Navigation | ✅ Good |
| TopBar.jsx | 85 | Header | ✅ Good |
| theme.jsx | 274 | Design system | ✅ Good |

### 3.2 Reusability

**Reusable:** Panel, Eyebrow, Tag, Btn, Mono, Ovr, AttrTele, CompareBar, Meter, OctaRadar — all from theme.jsx. **Good.**

**Not reusable:** Most screen components are single-purpose. They accept `g`, `dispatch`, `up` as props and render one specific view. This is correct for a game UI.

### 3.3 Prop Complexity

**Simple props:** `Sidebar({ view, setView, onAdvance, inboxCount })` — 4 props. ✅
**Complex props:** `Scout({ g, dispatch, t, fmt$, scoutFilterArch, setScoutFilterArch, scoutFilterWC, setScoutFilterWC, scoutFighter, tier })` — 10 props. ⚠️

Several components receive `g`, `dispatch`, `t`, `fmt$` as props — these are effectively global dependencies passed through the component tree. This is props drilling but acceptable for a game of this size.

### 3.4 Component Composition

Components are composed as:
```
App → Sidebar + TopBar + [Tab Content] + [Modals]
Tab Content → Dashboard | Roster | Rankings | Scout | Inbox | Finance | Facility | Rivals | Achievements | Dynasty
Roster → FighterDetail (conditional)
Scout → NegotiateModal (conditional)
Inbox → InboxMessage (inline)
FightNight → (fullscreen overlay)
```

**Composition is correct.** Each tab is a top-level component. Modals are rendered conditionally in App.jsx.

---

## 4. STATE MANAGEMENT

### 4.1 Global State

Single `g` object — ~20 top-level keys. All game data lives here. Mutated in-place. Saved as JSON to localStorage.

### 4.2 Local State

React `useState` in components for UI-only state:
- `stage`, `rnd`, `timer` in FightNight
- `selDiv` in Rankings
- `detailFighter` in Roster
- `nego`, `confirmAction` in App

**Appropriate.** UI state stays in components. Game state stays in `g`.

### 4.3 Derived State

Heavy use of derived state computed inline:
- `avgSkill(f)` — called on every render in Roster
- `rankOf(g, f)` — called on every render for every fighter
- `monthlyBurn(g)`, `monthlyIn(g)` — called in Dashboard and Finance

**No memoization.** `useMemo` and `React.memo` are never used. Derived values are recomputed on every render. This is acceptable for the current data scale but would become a performance issue with larger rosters.

### 4.4 State Duplication

**Identified duplication:**
- Monthly financial calculations appear in Dashboard and Finance (now shared via `finance.js`)
- Division champion tracked in both `divisions[wc].champ` and `roster[].titles[]`
- Coach specialties duplicated across multiple data structures

**Assessment: MINIMAL.** The extract to `finance.js` fixed the main duplication. The champion duplication is intentional (division structure vs fighter data).

### 4.5 Update Flow

```
User Action → dispatch(action) → App.dispatch()
    ├── SIGN_CONTRACT_PRE? → setNego (modal)
    └── else → up(fn) → structuredClone(g) → fn(g) → setG(g) → React render
```

**Clear. Single entry point for state changes.** The `structuredClone` on every mutation is a performance concern but ensures React detects changes.

---

## 5. CODE QUALITY

### 5.1 Naming Consistency

**Consistent:**
- Functions: camelCase (`genFighter`, `simRound`, `calcMentorBonus`)
- Components: PascalCase (`FightNight`, `FighterDetail`)
- Constants: UPPER_SNAKE (`CAMP_TIERS`, `SUB_THRESHOLD`)
- Files: kebab-case or camelCase depending on content

**Inconsistent:**
- Some engine files use default exports, some use named exports
- Some files have JSDoc comments, most don't
- `fmt$` uses a dollar sign (unusual but intentional)

### 5.2 Function and File Length

| Metric | Value | Assessment |
|--------|-------|------------|
| Average function length | ~15-25 lines | ✅ Good |
| Longest function | `simRound` (~200 lines) | ⚠️ Large but focused |
| Average file length | ~150 lines (engine), ~250 lines (UI) | ✅ Good |
| Longest file | FightNight.jsx (503 lines) | ⚠️ Could be split |
| Largest module | state.js (860 lines) | ⚠️ Was 1,068, improved by 20% |

### 5.3 Magic Numbers

**Before refactor:** Hundreds of magic numbers in `fight.js` and `state.js`.

**After refactor:** `fight/config.js` contains 70+ named constants. `state.js` still has some magic numbers in chemistry events and fight offers.

**Assessment: GOOD.** The fight engine has been fully parameterized. The remaining magic numbers are in areas not yet extracted.

### 5.4 Duplicate Logic

**Fixed during this session:**
- `monthlyBurn`/`monthlyIn` — extracted to `finance.js`
- INBOX_EVENT handler — replaced with dispatcher
- TOGGLE_OPEN_GYM / TAKE_LOAN duplicate cases — removed

**Remaining:**
- `Detail` component defined identically in Inbox.jsx and Finance.jsx
- `SectionHeader` defined inline in Finance (dead code, module-scope version used)

**Assessment: MINIMAL.** The major duplications have been addressed.

### 5.5 Error Handling

**Present:** Save/load has try/catch. localStorage operations are wrapped.

**Missing:** No error boundaries beyond the top-level one in main.jsx. No validation of action payloads in reducer. No graceful degradation for missing data.

**Assessment: BELOW AVERAGE.** The game relies on JavaScript's native error behavior rather than defensive programming. This is common in solo-developed games but would be risky for a larger team.

### 5.6 Defensive Programming

- Optional chaining used broadly (`f.traits?.includes(...)`) ✅
- Null checks on `.find()` results ✅
- Default values for missing properties (`g.week || 0`) ✅
- NaN guards on cash validation ✅

**Assessment: ADEQUATE.** The most common crash vectors are protected.

---

## 6. PERFORMANCE RISKS

### 6.1 Unnecessary Renders

**Risk: HIGH.** No `React.memo`, `useMemo`, or `useCallback` anywhere. Every state change in App.jsx causes a full re-render of the entire component tree. The Dashboard, Roster, Rankings, and FighterDetail all recompute their derived data on every render.

**Impact:** Negligible at current scale (14 fighters max). Would become noticeable with 50+ fighters.

### 6.2 Expensive Calculations

- `rankOf(g, f)` iterates the division list (15 entries) per fighter — acceptable
- P4P calculation iterates all 120 AI fighters — acceptable
- `structuredClone(g)` on every mutation — the most expensive operation

**Impact:** The deep clone is the primary performance cost. At ~20KB state size, it's milliseconds. At ~200KB (very large save), it could become noticeable.

### 6.3 Serialization Costs

`JSON.stringify(g)` on every save (1-second throttle). Save size grows with history. Estimated 5-50KB. **Acceptable.**

### 6.4 Large Object Mutations

`g.inbox.unshift()` is O(n) — inbox size is typically < 20 items. **Acceptable.**

`g.log.unshift()` is O(n) — log capped at 200 entries. **Acceptable.**

---

## 7. MAINTAINABILITY

### 7.1 Adding New Features

**Easy to add:**
- New engine module (create file, import in state.js, call in tick)
- New UI tab (create component, add to App tabs list + Sidebar)
- New trait (add to data, implement effect in relevant engine module)
- New event type (add to state.js event generation, add to dispatch.js handler)

**Harder to add:**
- New combat mechanic (touches fight.js, config.js, FightNight.jsx)
- New fighter attribute (touches data, fighter generation, training, UI, combat)
- New game system that requires save migration

**Assessment: GOOD.** The modular engine architecture makes feature addition straightforward for most cases.

### 7.2 Debugging

**Easy to debug:**
- Seeded RNG makes fight outcomes reproducible
- Single state object can be inspected in console
- Fight logs are human-readable

**Harder to debug:**
- In-place mutation makes it hard to trace state changes
- No action logging or replay
- No type checking for action payloads

### 7.3 Testing

**Testable:** Engine modules are pure functions with clear inputs/outputs. `simRound`, `genFighter`, `reducer` are all testable in isolation.

**Not tested:** Zero test files exist.

**Assessment: UNTESTED.** The architecture supports testing but no tests have been written.

### 7.4 Refactoring

**Recent successful refactors:**
- data.js split into 9 modules
- i18n extracted from engine
- tick() decomposed into domain modules
- INBOX_EVENT refactored to dispatcher
- fight.js parameterized with config constants

**Assessment: GOOD.** The codebase has proven refactorable. Each refactor was completed without gameplay regression.

---

## 8. TECHNICAL DEBT

### 8.1 Legacy Patterns

| Pattern | Location | Risk |
|---------|----------|------|
| `C` backward-compat object | theme.jsx | Low — used in FightNight and App.jsx |
| `Card`, `H`, `Bar` compat exports | theme.jsx | Low — bridging old components |
| `cut()` no-op function | theme.jsx | Low — spread in JSX, does nothing |
| `FighterCard.jsx` | ui/ | Low — imported but never rendered |
| `mma-manager.jsx` (root) | /root/mma-manager/ | None — old prototype, not in build |

### 8.2 Dead Code

| Item | Status |
|------|--------|
| `FighterCard.jsx` import in App.jsx | ✅ Removed |
| `TRAINING`, `weeklyFee` unused imports in App.jsx | ✅ Removed |
| Duplicate `SectionHeader` in Finance.jsx | ⚠️ Still present |
| `cut()` no-op in theme.jsx | ⚠️ Still present (used for spread) |
| `Bar.skew` unused prop in theme.jsx | ⚠️ Still present |
| `cornerState` in FightNight | ⚠️ Declared but unused |

### 8.3 TODO/FIXME

**None found.** The codebase is clean of TODO markers.

### 8.4 Over-Engineered

- The 12-multiplier training formula could be simplified without losing depth
- The JSDoc typedefs in rng.js are extensive but unenforced
- The `ARCHETYPES` object maps every archetype to multipliers — but only a subset of multipliers are used in combat

### 8.5 Under-Engineered

- No TypeScript — JSDoc only, no compile-time type checking
- No form validation — reducer accepts any payload shape
- No API versioning for save files — schema changes are handled ad-hoc in migration
- No logging system — `g.log` is the only output channel
- No test infrastructure

---

## 9. OVERALL ASSESSMENT

### Strengths

- **Clean architecture** — Engine/UI separation is excellent
- **Modular feature design** — 15+ independent features, each in its own file
- **Correct dependency direction** — No circular imports, no upward dependencies
- **Refactorable** — Proven through multiple successful refactors this session
- **Config-driven** — Fight engine is fully parameterized
- **Self-documenting** — Module names and function names clearly describe purpose

### Weaknesses

- **No type safety** — JavaScript only, JSDoc hints but no enforcement
- **No tests** — Zero test coverage despite testable architecture
- **In-place mutation** — Makes debugging and undo/redo complex
- **No memoization** — Full re-renders on every state change
- **Some monoliths remain** — `state.js` (860 lines), `FightNight.jsx` (503 lines)
- **Minimal error handling** — Relies on JavaScript defaults

### Readiness for Long-Term Development

**Grade: B+**

The architecture is sound. The modular design supports feature addition. The dependency direction is correct. The codebase has survived significant refactoring without regression.

**For a solo developer or small team:** This codebase is in good shape. The patterns are consistent. The boundaries are clear. New features can be added without touching existing systems.

**For a larger team or open source:** The codebase needs TypeScript (for type safety), tests (for regression prevention), and CI/CD (for automation). The lack of these is the primary barrier to scaling the development team.

**For Early Access:** The codebase is more than adequate. The architecture will support the features needed for a successful launch. The technical debt is manageable and well-understood.
