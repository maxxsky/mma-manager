# Reducer Standard — (Current State Discovery)

> **Domain:** Action dispatch, reducer architecture, domain ownership, state mutation
> **Source:** MMA Manager codebase (`engine/reducer.js`, `engine/reducer/*`)
> **Discovery Date:** July 2026
> **Version:** 1.0

---

## 1 — Purpose

This document defines how reducers work in the MMA Manager codebase. A reducer is a pure state mutation function that receives the current game state and an action, and applies domain-specific changes. Unlike Redux — which returns a new state object — MMA Manager's reducers mutate the state in place after it has been cloned by `up()`.

This document answers: what is a reducer? how are they split? how do they interact with `dispatch()` and `up()`? what does each domain own? when does a new reducer file get created? how are actions named and structured?

---

## 2 — Golden Rules

| # | Rule | Reasoning |
|---|------|-----------|
| 1 | **Reducers mutate cloned state** | After `up()` deep-clones `g`, reducers mutate the clone. This is intentional (ADR-002). No new state objects are returned. |
| 2 | **One action, one responsibility** | Each action type changes exactly one thing. An action that both signs a contract and fires a coach combines two responsibilities. |
| 3 | **Domain reducers own their domain** | `reduceCamp` only touches camp state. `reduceFighter` only touches fighter state. Cross-domain changes are avoided. |
| 4 | **Reducers never know about UI** | Reducers receive `(g, action)`. No component references, no DOM, no React state. |
| 5 | **Reducers never render** | Reducers mutate state. They do not display state, format state, or log to console (beyond game logging via `g.log.unshift`). |
| 6 | **Business rules stay inside the reducer** | Validation (can the player afford this? is the fighter eligible?) happens inside the reducer. The UI does not duplicate it. |

---

## 3 — Discovery Summary

### Files Analyzed

| # | File | Lines | Action Types | Pattern |
|---|------|-------|-------------|---------|
| 1 | `engine/reducer.js` | 75 | Orchestrator | Calls all domain reducers + undo/redo + action log |
| 2 | `engine/reducer/camp.js` | 64 | 5 | `switch(action.type)` |
| 3 | `engine/reducer/fighter.js` | 70 | 6 | `switch(action.type)` |
| 4 | `engine/reducer/coach.js` | 31 | 2 | `switch(action.type)` |
| 5 | `engine/reducer/contract.js` | 41 | 1 (2 variants) | Early `if` return |
| 6 | `engine/reducer/fight.js` | 51 | 3 | `switch(action.type)` |
| 7 | `engine/reducer/ui.js` | 35 | 3 | `switch(action.type)` |
| 8 | `engine/reducer/constants.js` | 43 | — | Shared constants module |
| 9 | `hooks/useGameState.js` | 81 | — | Dispatch wrapper, intercepts `SIGN_CONTRACT_PRE` |

### Action Inventory

| Domain | Action Types | Total |
|--------|-------------|-------|
| **Camp** | `UPGRADE_FACILITY`, `UPGRADE_TIER`, `SET_SPONSOR`, `TERMINATE_SPONSOR`, `TEAM_BONDING` | 5 |
| **Fighter** | `SET_TRAINING`, `CLASS_CHANGE_ACCEPT`, `CLASS_CHANGE_REJECT`, `COUNTER_POACH`, `TALK_POACH`, `DISMISS_PROSPECT` | 6 |
| **Coach** | `HIRE_COACH`, `FIRE_COACH` | 2 |
| **Contract** | `SIGN_CONTRACT` (sign variant + extend variant) | 1 |
| **Fight** | `ACCEPT_FIGHT`, `COUNTER_FIGHT`, `REJECT_FIGHT` | 3 |
| **UI** | `SCOUT`, `INBOX_REMOVE`, `INBOX_EVENT` | 3 |
| **Meta** | `UNDO`, `REDO`, `INIT` | 3 |
| **Intercepted** | `SIGN_CONTRACT_PRE` (caught by `dispatch`, never reaches reducer) | 1 |

**Total:** 20 action types across 6 domains + 3 meta + 1 intercepted.

### Architecture Snapshot

```
UI component calls dispatch({ type: ... })
        │
        ▼
dispatch() in useGameState.js
  ├── SIGN_CONTRACT_PRE? → intercept, show modal, return
  └── otherwise → up((n) => reducer(n, action))
                       │
                       ▼
reducer(n, action) in engine/reducer.js
  ├── 1. Strip undo/redo stacks (already done in up())
  ├── 2. Snapshot for undo
  ├── 3. Log action
  ├── 4. Handle UNDO/REDO
  └── 5. Call ALL domain reducers
        ├── reduceCamp(n, action)
        ├── reduceFighter(n, action)
        ├── reduceCoach(n, action)
        ├── reduceContract(n, action)
        ├── reduceFight(n, action)
        └── reduceUI(n, action)
        │
        ▼
  return n (mutated in place)
```

---

## 4 — Current Reducer Architecture

### 4.1 Why Broadcast Pattern (Not Switch)

The main reducer does NOT route actions to a single domain reducer via switch. It calls ALL domain reducers every time:

```jsx
// engine/reducer.js
export function reducer(g, action) {
  // ... undo/redo/logging ...
  reduceCamp(g, action);
  reduceFighter(g, action);
  reduceCoach(g, action);
  reduceContract(g, action);
  reduceFight(g, action);
  reduceUI(g, action);
  return g;
}
```

Each domain reducer checks the action type internally:

```jsx
// All domain reducers either:
// A) Switch
export function reduceCamp(g, action) {
  switch (action.type) {
    case "UPGRADE_FACILITY": { ... break; }
    case "UPGRADE_TIER": { ... break; }
    // ... 
  }
}

// B) Early return (1 of 6 uses this pattern)
export function reduceContract(g, action) {
  if (action.type !== "SIGN_CONTRACT") return;
  // ...
}
```

**Why this pattern?** From the codebase history (ADR-003), the original reducer had a 20-branch switch statement that grew unmanageable. Extracting into domain reducers eliminated merge conflicts, reduced file size, and made each domain independently testable. The broadcast pattern means adding a new action type requires only adding a case to the correct domain reducer — no need to wire it into a switch in the main reducer.

### 4.2 Reducer Flow Diagram

```
dispatch({ type: "ACCEPT_FIGHT", fighterId, offerId, ... })
        │
        ▼
useGameState.dispatch()
        │
        ├── Is it SIGN_CONTRACT_PRE? ──► show nego modal, return
        │
        └── up((n) => reducer(n, action))
                │
                ▼
        up() clones g ──► n
                │
                ▼
        reducer(n, action)
                │
                ├── !isMetaAction? ──► snapshot for undo
                ├── !isMetaAction? ──► log action to actionLog
                ├── is UNDO? ──► restore previous snapshot
                ├── is REDO? ──► restore next snapshot
                │
                └── call ALL domain reducers with (n, action)
                    │
                    ├── reduceCamp   ──► checks: type === "UPGRADE_FACILITY"? no → return
                    ├── reduceFighter ──► checks: type === "SET_TRAINING"? no → return
                    ├── reduceCoach   ──► checks: type === "HIRE_COACH"? no → return
                    ├── reduceContract ──► checks: type !== "SIGN_CONTRACT"? yes → return
                    ├── reduceFight   ──► checks: type === "ACCEPT_FIGHT"? yes → mutate n
                    └── reduceUI     ──► checks: type === "SCOUT"? no → return
                │
                ▼
        return n  (mutated — fighter booked, inbox updated)
                │
                ▼
        up() returns n → setG(n) → React re-renders
```

### 4.3 Undo/Redo Mechanism

Undo/redo lives in the main reducer, not the domain reducers:

```jsx
// Before every non-meta action:
g._undoStack.push({ snapshot: snapshot(g) });
if (g._undoStack.length > MAX_UNDO_STACK) g._undoStack.shift();
g._redoStack = []; // new action clears redo

// On UNDO:
const prev = g._undoStack.pop().snapshot;  // restore snapshot
Object.assign(g, prev);                     // replace entire state
g.log.unshift("⏪ Undo — kembali ke state sebelumnya.");
return g;                                    // early return — no domain reducers called

// On REDO:
const next = g._redoStack.pop().snapshot;
Object.assign(g, next);
g.log.unshift("⏩ Redo — maju ke state berikutnya.");
return g;
```

**Key insight:** Undo/redo restores the ENTIRE state. It does not undo individual field changes. This is a "big hammer" approach — simple, reliable, and consistent with the single-state-object architecture.

---

## 5 — Reducer Responsibilities

### 5.1 Main Reducer (`engine/reducer.js`)

| Responsibility | Detail |
|---------------|--------|
| Undo stack management | Snapshot before every non-meta action. Push/pop on UNDO/REDO. |
| Action logging | Record every non-meta action with type, payload, week, timestamp. |
| Domain delegation | Call all 6 domain reducers. |
| Meta action handling | UNDO, REDO, INIT are processed before domain reducers. |

### 5.2 Domain Reducers

| Domain | File | Owns Mutations For | Example Actions |
|--------|------|-------------------|-----------------|
| Camp | `camp.js` | Facilities, camp tier, sponsors, team bonding | `UPGRADE_FACILITY`, `TEAM_BONDING` |
| Fighter | `fighter.js` | Training, class change, poaching, prospect | `SET_TRAINING`, `CLASS_CHANGE_ACCEPT` |
| Coach | `coach.js` | Hire coach, fire coach | `HIRE_COACH`, `FIRE_COACH` |
| Contract | `contract.js` | Sign prospect, extend contract | `SIGN_CONTRACT` |
| Fight | `fight.js` | Accept, counter, reject fight offers | `ACCEPT_FIGHT`, `REJECT_FIGHT` |
| UI | `ui.js` | Scout, inbox events | `SCOUT`, `INBOX_REMOVE` |

### 5.3 Shared Constants (`reducer/constants.js`)

All magic numbers used across domain reducers are centralized here:

```jsx
export const MAX_UNDO_STACK = 20;
export const MAX_ACTION_LOG = 500;
export const CHEM_PENALTY_FIRE_COACH = 5;
export const MAX_PROSPECTS = 5;
// ... etc
```

### 5.4 What Reducers Never Do

- **Never call React** — no imports from `react`, no hooks, no `useState`.
- **Never read DOM** — no `document`, `window`, `localStorage`.
- **Never dispatch another action** — reducers mutate state; they don't trigger new actions.
- **Never return a new object** — the clone is created by `up()`. Reducers mutate the clone and return it.
- **Never call engine simulation functions** — reducers apply player actions. `tick()` is separate.

---

## 6 — Action Design

### 6.1 Action Shape

All actions are plain objects with a `type` field and relevant data fields:

```jsx
// Standard action shape
dispatch({ type: "ACTION_NAME", ...data });
```

**No `payload` wrapper.** The data fields are at the top level of the action object. This is consistent across all 20 action types.

### 6.2 Action Naming Convention

| Pattern | Examples |
|---------|---------|
| `VERB_NOUN` | `HIRE_COACH`, `FIRE_COACH`, `SIGN_CONTRACT` |
| `VERB_NOUN_VALUE` | `UPGRADE_FACILITY`, `SET_TRAINING`, `SET_SPONSOR` |
| `ACTION_NOUN_QUALIFIER` | `ACCEPT_FIGHT`, `REJECT_FIGHT`, `COUNTER_FIGHT` |
| `PREFIX_MUTATION` | `INBOX_REMOVE`, `INBOX_EVENT` |

Consistent across all 6 domains: UPPER_SNAKE_CASE, domain-prefixed where multiple actions share a target.

### 6.3 Action Payload By Domain

| Action | Payload Fields |
|--------|---------------|
| `UPGRADE_FACILITY` | `{ facility, facilityLabel? }` |
| `SET_TRAINING` | `{ fighterId, program, intensity? }` |
| `HIRE_COACH` | `{ coachId, coachName?, coachSpec?, coachSalary? }` |
| `SIGN_CONTRACT` | `{ mode, prospectId?, fighterId?, deal }` |
| `ACCEPT_FIGHT` | `{ fighterId, opponent, weeks, show, winBonus, tier, ... }` |
| `SCOUT` | `{ cost, fighter, report, grade, method }` |

### 6.4 When to Create a New Action

| Condition | Action |
|-----------|--------|
| Player can do something new | New action type |
| Existing action needs variation | Add optional field to existing action |
| Action modifies a different domain | New action in the corresponding domain reducer |
| Action is a variation of an existing one (same domain, same target) | New action type with meaningful name difference |

### 6.5 When to Reuse an Existing Action

| Condition | Approach |
|-----------|----------|
| Same operation, different target | Add a field to the existing action (e.g., `mode: "extend"` in `SIGN_CONTRACT`) |
| Same operation, same target, different value | Existing action handles it (e.g., `UPGRADE_FACILITY` works for all facility types) |

---

## 7 — Reducer Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                       COMPLETE REDUCER FLOW                      │
│                                                                  │
│  Player Action                                                  │
│       │                                                         │
│       ▼                                                         │
│  dispatch({ type: "ACCEPT_FIGHT", ... })                       │
│       │                                                         │
│       ▼                                                         │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ dispatch() in useGameState.js                              │  │
│  │                                                             │  │
│  │  1. Check: SIGN_CONTRACT_PRE? → modal, return              │  │
│  │  2. Call: up((n) => reducer(n, action))                    │  │
│  └───────────┬───────────────────────────────────────────────┘  │
│              │                                                  │
│              ▼                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ up(fn) in useGameState.js                                  │  │
│  │                                                             │  │
│  │  1. Strip _undoStack and _redoStack from clone             │  │
│  │  2. JSON.parse(JSON.stringify(clean)) → deep clone n       │  │
│  │  3. Call fn(n) — this is where reducer runs                 │  │
│  │  4. Schedule auto-save (1s debounce)                       │  │
│  │  5. Return n → setG(n) → React re-render                  │  │
│  └───────────┬───────────────────────────────────────────────┘  │
│              │                                                  │
│              ▼                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ reducer(n, action) in engine/reducer.js                   │  │
│  │                                                             │  │
│  │  1. Skip meta actions from action log                       │  │
│  │  2. Snapshot for undo (push g._undoStack)                  │  │
│  │  3. Log action (push g.actionLog)                           │  │
│  │  4. Handle UNDO: restore snapshot → return                  │  │
│  │  5. Handle REDO: restore snapshot → return                  │  │
│  │  6. Call ALL domain reducers:                               │  │
│  │     ├── reduceCamp(n, action)  → switch → mutate n         │  │
│  │     ├── reduceFighter(n, action) → switch → mutate n       │  │
│  │     ├── reduceCoach(n, action) → switch → mutate n         │  │
│  │     ├── reduceContract(n, action) → if → mutate n          │  │
│  │     ├── reduceFight(n, action) → switch → mutate n         │  │
│  │     └── reduceUI(n, action) → switch → mutate n            │  │
│  │  7. return n                                                │  │
│  └───────────┬───────────────────────────────────────────────┘  │
│              │                                                  │
│              ▼                                                  │
│  up() receives mutated n → setG(n)                              │
│       │                                                         │
│       ▼                                                         │
│  React re-renders all components reading from g                 │
│       │                                                         │
│       ▼                                                         │
│  Player sees updated state                                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 8 — Domain Reducer Pattern

### 8.1 Standard Domain Reducer Template

```jsx
// DomainName — what this reducer handles
import { clamp, fmt$ } from "../rng.js";
import { SOME_CONSTANT } from "../data.js";
import { SOME_MAGIC_VALUE } from "./constants.js";

export function reduceDomain(g, action) {
  switch (action.type) {
    case "ACTION_ONE": {
      // guard: find target
      const target = g.collection.find(x => x.id === action.id);
      if (!target) break;

      // guard: validate
      if (g.cash < action.cost) break;

      // mutate
      g.cash -= action.cost;
      target.someValue = action.newValue;

      // log
      g.log.unshift("📝 Action description.");
      break;
    }

    case "ACTION_TWO": {
      // ... similar structure
      break;
    }
  }
}
```

### 8.2 Pattern Comparison by Domain

| Aspect | Domain Reducers |
|--------|----------------|
| **Gate** | `switch(action.type)` in 5 of 6 reducers. `if (type !== ...) return` in 1 of 6. |
| **Validation** | Inside the case block — check cash, check limits, check eligibility. |
| **Find target** | `g.collection.find(x => x.id === action.id)` — common first step. |
| **Mutation** | Direct assignment on the clone. No spread operators, no new objects. |
| **Logging** | `g.log.unshift("📝 " + description)` — every action produces a log entry. |
| **Return** | None — the function mutates `g` in place and returns `undefined`. |

### 8.3 The `reduceContract` Pattern (Outlier)

`reduceContract` is the only domain reducer that uses early return instead of switch:

```jsx
export function reduceContract(g, action) {
  if (action.type !== "SIGN_CONTRACT") return;
  // ... handle sign and extend variants
}
```

**Why it exists:** Only 1 action type with 2 variants (sign vs extend). A switch statement would have one case, which is visually awkward. The early return makes the intent clear.

**Standard:** Both patterns are acceptable. Use `switch` for 2+ action types in a domain. Use early `if` return for 1 action type.

---

## 9 — Decision Tree

```
"Aku ingin menambah action baru."
         │
         ▼
Apakah ini benar-benar perlu action baru?
(bisakah pakai action existing dengan field tambahan?)
         │
    Yes ───────► Tambah field ke action existing.
                  Ubah reducer case existing untuk handle field baru.
         │
    No  │
         ▼
Apakah domain reducernya sudah ada?
(yang menangani bagian game ini)
         │
    Yes ───────► Tambah case ke domain reducer yang sesuai.
         │
    No  │
         ▼
Apakah ini domain baru?
(bagian game yang belum pernah ada reducernya)
         │
    Yes ───────► Buat file reducer baru di engine/reducer/.
                  1. export function reduceNewDomain(g, action) { ... }
                  2. Import ke engine/reducer.js
                  3. Tambah ke daftar panggilan di reducer()
                  4. Buat constants file jika perlu
         │
    No  │
         ▼
Apakah ini meta action?
(undo, redo, init, game lifecycle)
         │
    Yes ───────► Tambah ke main reducer (engine/reducer.js)
                  langsung — bukan domain reducer.
         │
    No  │
         ▼
Apakah ini intercept action?
(action yang perlu di-catch sebelum reducer)
         │
    Yes ───────► Tambah intercept di useGameState.dispatch().
                  Action tidak boleh masuk ke reducer.
```

---

## 10 — Anti-Patterns

### ❌ Single giant reducer

```jsx
// ANTI-PATTERN — replaced by domain reducers
function reducer(g, action) {
  switch(action.type) {
    case "UPGRADE_FACILITY": { ... }   // 20+ cases
    case "HIRE_COACH": { ... }          // in one file
    case "ACCEPT_FIGHT": { ... }
    // ... 17 more cases
  }
}
```

**Current state:** Extracted into 6 domain reducers in 6 files. This is the correct pattern.

### ❌ UI logic in reducer

```jsx
// ANTI-PATTERN — not found in codebase
case "SHOW_MODAL": {
  g.showModal = true;
}
```

**Current state:** Modals are managed by local React state in App.jsx or useGameState. Reducers do not control UI visibility.

### ❌ Cross-domain mutation

```jsx
// AVOID — mutating unrelated state in a reducer
case "ACCEPT_FIGHT": {
  // fight-related mutation (correct)
  g.roster.find(...).booked = {...};

  // coach-related mutation — should be in reduceCoach
  g.coaches.push(newCoach);

  // camp-related mutation — should be in reduceCamp
  g.campTier++;
}
```

**Current state:** The broadcast pattern means a single action COULD technically touch multiple domains, but the intent is that each domain reducer handles its own domain. Actions should be designed to only trigger changes in one domain.

### ❌ Reducer creating side effects outside state

```jsx
// ANTI-PATTERN — not found in codebase
case "SCOUT": {
  g.cash -= action.cost;
  saveGame(slot, g);       // side effect — belongs in up()
  localStorage.setItem(...); // side effect — belongs in service
}
```

**Current state:** Side effects are handled by `up()` (auto-save) and Services. Reducers stay pure.

### ❌ Action too generic

```jsx
// ANTI-PATTERN — not found in codebase
dispatch({ type: "UPDATE", target: "fighter", field: "training", value: "striking" });
```

**Current state:** Actions are specific: `SET_TRAINING`, `HIRE_COACH`, `ACCEPT_FIGHT`. A generic `UPDATE` action would make it hard to find which reducer handles what.

### ❌ Dispatch calling reducer with stale state

```jsx
// ANTI-PATTERN — bypassing the clone mechanism
import { reducer } from "../engine/reducer.js";
reducer(g, { type: "ACCEPT_FIGHT", ... });  // mutates g directly!
```

**Current state:** 1 instance in `FighterDetail.jsx` (documented in migration notes).

---

## 11 — AI Decision Heuristics

1. **Find the closest domain reducer.** Before creating a new reducer, search existing domains. If the action modifies a fighter's training, it belongs in `reduceFighter`.

2. **Do not create a new reducer for a single action.** If the action naturally fits an existing domain, add a case there. New reducer files are justified when the domain has 3+ distinct actions.

3. **Use specific action names.** `SET_TRAINING` is better than `UPDATE`. The name should tell the reader what changed.

4. **Honor domain boundaries.** An action to hire a coach should not also upgrade facilities. Split into two actions if two domains are involved.

5. **Do not mix two features in one action.** If the action "signs a contract and offers an existing fighter a new one," that's two actions: `SIGN_CONTRACT` (prospect) and a separate extension action.

6. **Validation lives in the reducer.** The UI can add convenience guards (disable the button if cash < cost), but the hard validation happens inside the reducer. Never trust the UI to validate correctly.

7. **Log every action.** Every reducer case should produce a log entry. If the player can't see the effect in the UI, they should see it in the log. Use `g.log.unshift("📝 message")`.

---

## 12 — Validation Checklist

For any new or modified reducer:

- [ ] **Domain is correct** — action belongs to an existing or new domain reducer
- [ ] **Action naming is consistent** — UPPER_SNAKE_CASE, domain-prefixed
- [ ] **No UI logic** — reducer doesn't reference React, DOM, or UI state
- [ ] **No side effects** — reducer doesn't call saveGame, localStorage, or engine simulation
- [ ] **No direct state mutation bypass** — all changes go through `dispatch` → `up` → `reducer`
- [ ] **Validation is present** — reducer checks cash, limits, and eligibility
- [ ] **Log entry produced** — every action writes to `g.log`
- [ ] **Constants extracted** — magic numbers live in `reducer/constants.js`
- [ ] **No cross-domain mutation** — reducer only touches state in its domain
- [ ] **Switch pattern for 2+ actions** — use `switch(action.type)`. Early return for single-action reducers.

---

## 13 — Migration Notes

### 13.1 Inconsistency: reduceContract Uses Early Return Instead of Switch

**Current state:** `reduceContract` uses `if (action.type !== "SIGN_CONTRACT") return;` while all other domain reducers use `switch(action.type)`.

**Standard:** Both patterns are functionally equivalent. The early return pattern is acceptable for single-action reducers. No migration needed.

### 13.2 Violation: FighterDetail.jsx Calls reducer Directly

**Location:** `ui/FighterDetail.jsx` imports `{ reducer }` from `engine/reducer.js` and calls it directly.

**Issue:** Direct reducer call bypasses `dispatch` → `up` → clone pipeline. Changes are not undoable and do not trigger auto-save.

**Recommended fix:** Wrap the reducer call in a new dispatch action, or use `up((n) => reducer(n, action))` at minimum.

### 13.3 Inconsistency: Action Log Captures Full Payload

**Current state:** The action log records the full action object including potentially large payloads (fighter objects, scout reports):

```jsx
g.actionLog.push({ ...action, week: g.week, ts: Date.now() });
```

**Issue:** Action payloads containing full fighter objects can make the action log grow to multiple MB in long play sessions.

**Recommended fix:** Consider logging only `{ type, week, ts }` + minimal identifiers (fighterId, coachId) and removing full payloads. Not a breaking change — the log is for debugging, not for game state.

---

## 14 — Related Documents

| Document | What It Covers |
|----------|---------------|
| `02_STATE_STANDARD.md` | State ownership — how `dispatch`, `up`, and `advance` work |
| `03_ENGINE_BOUNDARY_STANDARD.md` | Layer boundaries — why reducers don't import React |
| `knowledge/08_UI.md` | UI philosophy — why UI doesn't duplicate validation |
| `hooks/useGameState.js` | Dispatch implementation — clone, reducer call, auto-save |
| `engine/reducer/constants.js` | Shared magic numbers across domain reducers |
| `02_ARCHITECTURE.md` | ADR-003 (Registry over Switch) — why domain reducers exist |
