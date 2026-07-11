# Page Standard — (Current State Discovery)

> **Domain:** Page structure, props, local state, composition, data flow
> **Source:** MMA Manager codebase (`ui/*.jsx`)
> **Discovery Date:** July 2026
> **Version:** 1.0

---

## 1 — Purpose

This document defines how pages are structured in the MMA Manager codebase. A "page" is a full-screen view that the player navigates to via the sidebar — Dashboard, Roster, Inbox, Finance, etc. Pages are the primary consumer of game state and the primary dispatcher of player actions.

This document answers: what props does a page receive? how does it send actions back? when does it use local state? when does it split into child components? when is a new page created vs. a section added to an existing page?

---

## 2 — Golden Rules

| # | Rule | Reasoning |
|---|------|-----------|
| 1 | **Page orchestrates, Components render** | Pages control layout and data flow. Components handle presentation details. |
| 2 | **Page never owns game state** | `g` is read-only. All mutations go through `dispatch` or `up`. |
| 3 | **Business logic belongs to Engine** | Pages call engine functions for derived data but never implement business rules. |
| 4 | **Prefer composition over large pages** | A page over 400 lines should be split. Sections become components. |
| 5 | **Pass only required props** | Every prop is explicitly used. No `{...g}` spreads. No `{...rest}` passthrough. |
| 6 | **Reuse before creating** | Before building a new page section, check if an existing component can display the data. |
| 7 | **Local state is for UI only** | Tab selection, dropdown open/close, selected item. Never game state. |
| 8 | **Dispatch is for engine changes** | `up()` is for complex mutations. `advance()` is for week tick. `setG` is save/load only. |

---

## 3 — Discovery Summary

### Pages Analyzed (15)

| # | Page | Lines | Props Received | Action Method | Local State |
|---|------|-------|----------------|---------------|-------------|
| 1 | `Dashboard` | 256 | `g, setTab, setActiveFight, dispatch, t, fmt$` | `dispatch` | None |
| 2 | `Roster` | 92 | `g, setTab, up, dispatch` | `dispatch`, `up` | Detail fighter |
| 3 | `Rankings` | 683 | `g, t` | None | Selected division |
| 4 | `Scout` | 639 | `g, dispatch, t, fmt$, filters..., scoutFighter` | `scoutFighter` (wraps `dispatch`) | None |
| 5 | `Inbox` | 311 | `g, dispatch, setTab` | `dispatch` | None |
| 6 | `Finance` | 361 | `g` | None | None |
| 7 | `Facility` | 92 | `g, dispatch, coachCap, rosterCap` | `dispatch` | None |
| 8 | `RivalsScreen` | 416 | `g, up` | `up` | None |
| 9 | `Achievements` | 38 | `g` | None | None |
| 10 | `Dynasty` | 116 | `g` | None | None |
| 11 | `FighterDetail` | 303 | `f, g, onBack, up, dispatch` | `dispatch`, `up` | None |
| 12 | `FightNight` | 186 | `fighter, done` | `done(fx)` callback | Stage, round, fight state |
| 13 | `NegotiateModal` | 214 | `fighter, mode, cash, onClose, onCommit` | `onCommit` callback | None |
| 14 | `TopBar` | 94 | `title, cash, rep, chem, ...` | `dispatch`, `onNewGame` | None |
| 15 | `Sidebar` | 81 | `view, setView, onAdvance, inboxCount` | `onAdvance` callback | None |

### Prop Categories (dominant pattern)

| Category | Props | Pages Using |
|----------|-------|-------------|
| **Game state** | `g` | All pages (universal) |
| **Action dispatch** | `dispatch` | 8 pages |
| **Complex mutation** | `up` | 3 pages (Roster, FighterDetail, RivalsScreen) |
| **Navigation** | `setTab` | 3 pages (Dashboard, Inbox, Roster) |
| **Injected handlers** | `scoutFighter`, `onCommit`, `done` | 3 pages |
| **Pass-through data** | `coachCap`, `rosterCap`, `t`, `fmt$` | 5 pages |
| **Callbacks** | `onBack`, `onClose`, `onProceed` | 3 pages |

### Page Categories

| Category | Pages | Description |
|----------|-------|-------------|
| **Read-only** | Finance, Achievements, Dynasty | Only `g`. No dispatch, no up. Pure display. |
| **Action page** | Dashboard, Inbox, Facility, Scout `g` + `dispatch` | Player actions dispatched to engine. |
| **Complex mutation** | RivalsScreen | `g` + `up` for custom mutations. |
| **Mixed navigation** | Roster, FighterDetail | `g` + `dispatch` + `up` + `setTab` for complex interactions. |

---

## 4 — Current Page Architecture

### 4.1 Data Flow Diagram

```
App.jsx
  │
  │  owns: g, setG, dispatch, up, advance, tab, filters, modals
  │
  ├──► Dashboard    ←── g, dispatch, setTab, setActiveFight
  ├──► Roster       ←── g, dispatch, up, setTab
  ├──► Finance      ←── g  (read-only)
  ├──► Inbox        ←── g, dispatch, setTab
  ├──► Rankings     ←── g, t  (read-only)
  ├──► Scout        ←── g, dispatch, injected scoutFighter, filters
  ├──► Facility     ←── g, dispatch, injected coachCap/rosterCap
  ├──► RivalsScreen ←── g, up
  ├──► Achievements ←── g  (read-only)
  └──► Dynasty      ←── g  (read-only)
```

### 4.2 Action Flow Diagram

```
Page reads g ──► computes derived values (filter, sort, format)
     │
     ▼
Player clicks button
     │
     ▼
Page calls dispatch / up / callback
     │
     ▼
Engine processes (reducer → mutate clone → return)
     │
     ▼
React re-renders — page reads new g
     │
     ▼
Updated display
```

### 4.3 Composition Diagram

```
Page
  ├──► Theme (Panel, Btn, Eyebrow, Tag, Mono, ...)
  ├──► Components (FightCard, WeeklySummary, WinConditionBanner, ...)
  ├──► Engine utilities (avgSkill, rankOf, fmt$, ...)
  └──► i18n (t)
```

### 4.4 Page Size Distribution

| Size | Pages | Assessment |
|------|-------|------------|
| < 100 lines | Achievements (38), Roster (92), Facility (92), TopBar (94) | Clean, focused |
| 100-300 | Dynasty (116), Sidebar (81), FightNight (186), NegotiateModal (214) | Moderate |
| 300-500 | FighterDetail (303), Inbox (311), Finance (361), RivalsScreen (416) | At threshold |
| > 500 | Rankings (683), Scout (639) | Exceeds recommendation — consider splitting |

---

## 5 — Page Responsibilities

### 5.1 What a Page Owns

| Responsibility | Example |
|---------------|---------|
| Screen-level layout | Grid structure, section positioning, scroll behavior |
| Data aggregation | Reads `g`, filters relevant data for display |
| Derived value computation | `const bookedSorted = g.roster.filter(f => f.booked).sort(...)` |
| Player action dispatch | `dispatch({ type: "ACCEPT_FIGHT", ... })` |
| UI state management | `const [selectedDiv, setSelectedDiv] = useState(...)` |
| Empty state handling | `if (!g.inbox || g.inbox.length === 0) return <EmptyState />` |
| Error state handling | Graceful fallback when data is missing |

### 5.2 What a Page Does NOT Own

| Not Owned | Where It Belongs |
|-----------|-----------------|
| Game state (`g`) | App.jsx (owns `g`) |
| Business logic | Engine (reducer, tick, engine functions) |
| Persistence | Services / Hooks |
| Visual primitives | Theme (Panel, Btn, Tag) |
| Sidebar navigation | Sidebar component |
| Top bar | TopBar component |
| Reusable display | Components directory |

### 5.3 Page Prop Categories (Standard)

| Prop Type | Passed From App.jsx | Used For |
|-----------|--------------------|----------|
| `g` | Always (universal) | Reading game state |
| `dispatch` | Only if page triggers actions | Sending player actions |
| `up` | Only if complex mutation needed | Direct mutation |
| `setTab` | Only if page navigates | Programmatic navigation |
| Injected data | As needed (e.g., `coachCap`, `scoutFighter`) | Derived info from App |
| Callbacks | As needed (e.g., `onBack`) | Child component communication |

---

## 6 — Standard Page Structure

### 6.1 Template

```jsx
// PageName — [one-line description of purpose]
import { useState } from "react";
import { fmt$ } from "../engine/rng.js";
import { avgSkill } from "../engine/fighter.js";
import { T, Panel, Eyebrow, Tag, Btn, Mono, heat } from "./theme.jsx";
import { t } from "../i18n/index.js";
import ChildComponent from "../components/ChildComponent.jsx";

export default function PageName({ g, dispatch /* + as needed */ }) {
  // 1. Guard — empty state
  if (!g.roster || g.roster.length === 0) {
    return (
      <Panel style={{ textAlign: "center", padding: 40 }}>
        <Eyebrow>Empty State Title</Eyebrow>
        <div style={{ color: T.txt3, fontSize: 13 }}>
          Guidance text for what the player should do next.
        </div>
      </Panel>
    );
  }

  // 2. Local state (UI only)
  const [selectedItem, setSelectedItem] = useState(null);

  // 3. Derived values
  const filtered = g.roster.filter(f => f.training);

  // 4. Render
  return (
    <div>
      <Eyebrow>Page Title</Eyebrow>
      <Panel>
        {filtered.map(item => (
          <ChildComponent key={item.id} item={item} />
        ))}
      </Panel>
    </div>
  );
}
```

### 6.2 Section Order

Every page follows this section order:

```
1. Imports
2. Component declaration + destructured props
3. Guard clause (empty state, null check)
4. Local state (useState)
5. Derived values (filters, sorts, formats)
6. Return — JSX
7. Export default
```

### 6.3 When to Create a Page

| Condition | Action |
|-----------|--------|
| New sidebar tab required | New page file in `ui/`, add to `App.jsx` import + tab render |
| New feature with dedicated screen | New page file in `ui/` |
| Feature reuses existing screen layout | Section in existing page, or component |
| Feature is a detail view of existing data | Component called from within existing page (e.g., Roster → FighterDetail) |

### 6.4 When to Split into Components

| Indicator | Action |
|-----------|--------|
| Page > 400 lines | Split sections into components |
| Repeated JSX block (3+ times) | Extract to component |
| Section has its own state | Extract to component with internal state |
| Section could be reused elsewhere | Extract to `components/` directory |
| Section is a modal or overlay | Extract to component with `onXxx` callbacks |

---

## 7 — Data Flow

### 7.1 Read Flow

```
App.jsx (g, dispatch, up)
  │
  ├──► g ──► Page reads g.roster, g.inbox, g.cash, ...
  │            │
  │            ├──► computed in render (filters, sorted slices)
  │            │
  │            └──► passed as props to child components
  │                   │
  │                   ▼
  │              Theme primitives (Panel, Btn, Tag)
  │                   │
  │                   ▼
  │              Player sees formatted data
  │
  ├──► dispatch ──► Page calls dispatch({ type, ... })
  │
  ├──► up ──► Page calls up((n) => { ... })
  │
  └──► setTab ──► Page navigates: onClick={() => setTab("inbox")}
```

### 7.2 Write Flow

```
Player clicks "Accept Fight" in Inbox
  │
  ▼
Inbox.jsx:  dispatch({ type: "ACCEPT_FIGHT", fighterId, offerId })
  │
  ▼
dispatch() in useGameState:
  up((n) => reducer(n, action))
  │
  ▼
reducer clones → mutates → returns
  │
  ▼
setG(newState) → re-render
  │
  ▼
Inbox.jsx reads updated g — offer removed, fighter booked
```

### 7.3 Prop Drilling Boundaries

Props are passed down from App → Page → Component. The chain is at most 3 levels deep.

```
App.jsx
  └──► g, dispatch ──► Page
                          └──► data { fighter } ──► Component
                                                      (no further prop drilling)
```

If a component needs `dispatch`, the page passes it explicitly. Components that don't mutate state receive data and callbacks only.

---

## 8 — Local State Rules

### 8.1 When to Use Local State in a Page

| Scenario | Example | Page |
|----------|---------|------|
| Selected item in a list | `const [detailFighter, setDetailFighter] = useState(null)` | Roster |
| Dropdown/tab within a page | `const [selDiv, setSelDiv] = useState(defaultDiv)` | Rankings |
| Filter/input value | `const [filterText, setFilterText] = useState("")` | Scout |
| Open/closed toggle | `const [isExpanded, setIsExpanded] = useState(false)` | (any) |

### 8.2 When NOT to Use Local State

```jsx
// ❌ NEVER — game state in local state
const [fighters, setFighters] = useState(g.roster);

// ❌ NEVER — derived values in local state
const [sortedList, setSortedList] = useState([]);
useEffect(() => setSortedList(g.roster.sort(...)), [g.roster]);

// ❌ NEVER — engine results cached in local state
const [rank, setRank] = useState(null);
useEffect(() => setRank(rankOf(g, f)), [g.week]);
```

### 8.3 Local State Lifecycle

- Local state is initialized when the page mounts.
- It is reset when the page unmounts (navigating away and back).
- It is NOT reset when `g` changes — this is intentional. A page remembers the selected division even after a tick updates rankings.

---

## 9 — Composition Rules

### 9.1 Page Composition Patterns

| Pattern | Description | Example |
|---------|-------------|---------|
| **Theme primitives only** | Simple page using Panel, Btn, Eyebrow, Tag | Achievements (38 lines) |
| **Theme + in-file component** | Page defines helper component in same file | RivalsScreen (RivalCard) |
| **Theme + imported component** | Page imports reusable components | Dashboard imports FightCard, WeeklySummary |
| **Theme + sub-components** | Page imports multiple specialized components | FightNight imports 9 fight sub-components |
| **Nested page** | Page conditionally renders another page | Roster renders FighterDetail |

### 9.2 In-File vs Separate File

**In-file component** (when: used only once, tightly coupled to page):

```jsx
// RivalsScreen.jsx — RivalCard is only used here
function RivalCard({ rc, g, up }) {
  // ...
}
export default function RivalsScreen({ g, up }) { ... }
```

**Separate file** (when: reusable, has its own state, or the file exceeds 400 lines):

```jsx
// Inbox.jsx uses separate ConfirmModal
import ConfirmModal from "./ConfirmModal.jsx";
```

### 9.3 Sub-Component Props Pattern

When a page passes data to a component:

```jsx
// ✅ CORRECT — pass specific data
<FighterCard fighter={f} g={g} onProceed={handleProceed} />

// ❌ AVOID — passing entire g when not needed
<ComponentWithAll g={g} />

// ❌ AVOID — spreading props
<Component {...data} />
```

---

## 10 — Decision Tree

```
"Aku ingin menambah fitur yang perlu halaman baru."
         │
         ▼
Apakah ini screen yang benar-benar baru?
(berbeda data, berbeda konteks, beda tab)
         │
    Yes ───────► Buat page baru di `ui/`:
                  • export default function X({ g, dispatch })
                  • Tambah import + render di App.jsx
                  • Tambah sidebar entry (jika perlu)
         │
    No  │
         ▼
Apakah hanya bagian/card dari screen existing?
(ringkasan, filter, section)
         │
    Yes ───────► Buat section di page existing:
                  • Atau extract ke component jika > 100 baris
         │
    No  │
         ▼
Apakah detail view dari data existing?
(fighter detail, fight history)
         │
    Yes ───────► Buat component di page same file,
                  atau page terpisah jika perlu navigasi
         │
    No  │
         ▼
Apakah modal/dialog/overlay?
(confirmation, form, negotiation)
         │
    Yes ───────► Buat component dengan `onXxx` callbacks.
                  Jangan jadi page — jadi modal.
         │
    No  │
         ▼
Apakah reusable display element?
(tag, card, badge, stat line)
         │
    Yes ───────► Tambah ke THEME (theme.jsx)
         │
    No  │
         ▼
Apakah business rule?
(calculation, formula, simulation)
         │
    Yes ───────► Masuk ke ENGINE
                  (bukan UI sama sekali)
```

---

## 11 — Anti-Patterns

### ❌ Page > 500 lines without splits

```jsx
// Rankings.jsx — 683 lines
// Scout.jsx — 639 lines
```

**Current state:** Both pages exceed the recommended threshold. Rankings has sub-sections (division selector, champion card, fighter table) that could be extracted. Scout has filter bar, fighter list, scout actions that could be separate components.

**Standard:** Pages over 400 lines should be split into components. Each section of a page (filter, list, card, detail) is a candidate.

### ❌ Business logic in page when it belongs in engine

```jsx
// Anti-pattern — business logic in page
const isChamp = (f) => f.titles && f.titles.some(t => t.includes("Champion"));
```

**Current state:** Minimally present. Some pages have small inline helpers. These are acceptable because they format data for display, not implement game rules.

**Standard:** Display formatting helpers (is the fighter a champion? is an offer urgent?) are acceptable in pages. Game rules (how much does the camp cost? can this fighter change weight class?) belong in engine.

### ❌ In-file component that has grown too large

```jsx
// RivalsScreen.jsx — RivalCard spans hundreds of lines
function RivalCard({ rc, g, up }) { ... }  // 300+ lines in same file
```

**Standard:** If an in-file component exceeds 100 lines or uses its own local state, extract it to `components/`.

### ❌ Page dispatches but also receives `up`

```jsx
// Roster.jsx — receives both dispatch AND up
export default function Roster({ g, setTab, up, dispatch }) { ... }
```

**Current state:** Only 3 pages need both. This is acceptable because Roster handles both standard actions (dispatch) and training mutations (up).

**Standard:** Prefer `dispatch` over `up`. Only reach for `up` when the mutation genuinely doesn't fit the reducer pattern.

### ❌ Page with no empty state

A page that assumes data exists and crashes when it doesn't:

```jsx
// ❌ Anti-pattern — no guard
export default function Roster({ g }) {
  return <div>{g.roster.map(...)}</div>  // crashes if g.roster is undefined
}
```

**Standard:** Every page must handle the zero-case: no inbox messages, no fighters, no rivals, no achievements.

---

## 12 — AI Decision Heuristics

1. **Find the closest page first.** Before creating a new page, search for an existing page that could host the feature. A section added to Dashboard is cheaper than a new tab.
2. **Follow the most common prop pattern.** If 80% of pages receive `{ g, dispatch }`, any new page should follow the same pattern unless there's a reason not to.
3. **Don't make a page an engine substitute.** Pages read from the engine. They do not implement engine logic. If you're writing business logic in a page, stop and move it to the engine.
4. **Reuse existing components before creating new ones.** The codebase has Panel, Eyebrow, Tag, Btn, Mono, OVR, Meter, AttrTele, CompareBar, Icon, and heat(). Check these before building custom UI.
5. **Guard before anything else.** Every page handles the empty state. Add the guard clause immediately after the function signature.
6. **Split at 400 lines.** If a page is approaching 400 lines, plan extraction. Each independent section (filter bar, list, card) becomes a separate component.
7. **Three prop limit for child components.** A component with 7+ props may need a more focused interface.

---

## 13 — Validation Checklist

For any new or modified page:

- [ ] **Structure follows standard** — imports → guard → local state → derived values → render
- [ ] **No business logic** — calculations and rules belong in engine
- [ ] **Props are minimal** — page only receives what it needs
- [ ] **Components are reused** — no duplicate rendering patterns
- [ ] **Data flow is one direction** — `g` flows down, actions flow up
- [ ] **Empty state handled** — page doesn't crash on missing data
- [ ] **Local state is UI-only** — no game state in `useState`
- [ ] **No direct mutation** — all changes go through `dispatch`, `up`, or `advance`
- [ ] **Splits at 400 lines** — if page exceeds threshold, plan extraction
- [ ] **Follows Hermes patterns** — consistent with existing page structure

---

## 14 — Migration Notes

### 14.1 Large Pages Above 400 Lines

**Current state:** Rankings.jsx (683 lines) and Scout.jsx (639 lines) exceed the recommended threshold.

**Recommended actions:**
- Rankings: extract division selector, champion card, and ranking table into separate components.
- Scout: extract filter bar, scout card list, and scout actions into separate components.

**Priority:** Low. Both pages function correctly. Extraction would improve maintainability but is not urgent.

### 14.2 In-File Components That Should Be Separate

**Current state:** RivalsScreen.jsx defines `RivalCard` in the same file (~300 lines).

**Recommended action:** Extract `RivalCard` to `components/RivalCard.jsx`.

**Priority:** Low. The component is tightly coupled to RivalsScreen. Extract only if `RivalCard` needs to be reused or if it grows further.

### 14.3 Page Prop Interface Inconsistency

**Current state:** Some pages receive `t` and `fmt$` as props, others import them directly:

```jsx
// Dashboard receives t and fmt$ as props
export default function Dashboard({ g, setTab, setActiveFight, dispatch, t, fmt$ }) { ... }

// Achievements does NOT receive t
export default function Achievements({ g }) { ... }
```

**Standard:** Import `t` from `../i18n/index.js` and `fmt$` from `../engine/rng.js` directly. No need to pass them as props. This is the dominant pattern (10 of 15 pages import directly).

---

## 15 — Related Documents

| Document | What It Covers |
|----------|---------------|
| `01_COMPONENT_PATTERN.md` | Component structure — how pages compose |
| `02_STATE_STANDARD.md` | State ownership — `g`, `dispatch`, `up`, `advance` |
| `03_ENGINE_BOUNDARY_STANDARD.md` | Layer boundaries — what pages can and cannot import |
| `knowledge/08_UI.md` | UI philosophy — presentation layer principles |
| `App.jsx` | Page orchestration — routing, props distribution |
| `ui/theme.jsx` | Design primitives — what pages compose with |
