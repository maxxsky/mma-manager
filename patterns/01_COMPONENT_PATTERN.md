# Component Pattern — (Current State Discovery)

> **Domain:** UI component structure, props, state management, composition
> **Source:** MMA Manager codebase (`app/src/`)
> **Discovery Date:** July 2026
> **Version:** 1.0

---

## 1 — Purpose

This document captures how components are actually written in the MMA Manager codebase — the real patterns extracted from 30+ component files, not generic React best practices. It answers: when an AI needs to create or modify a component, what should it follow?

This is a **discovery document**. The patterns here reflect the majority implementation. Where inconsistencies exist, both the current state and the recommended standard are documented.

---

## 2 — Discovery Summary

### Scope

- **32 JSX files** screened
- **12 components** analyzed in depth (see reference list below)
- **5 page screens** (Dashboard, Roster, FighterDetail, Inbox, Finance)
- **7 reusable components** (FightCard, WeeklySummary, ConfirmModal, GameOverBanner, WinConditionBanner, Sidebar, TopBar)
- **1 design system file** (theme.jsx — primitives + icons)
- **2 fight components** (FightNight + sub-components in fight/)

### Reference Components

These 12 files form the evidence base for every pattern claim below:

| # | File | Type | Lines | Role |
|---|------|------|-------|------|
| 1 | `ui/theme.jsx` | Primitives | 276 | Design system (Panel, Btn, Tag, Mono, etc.) |
| 2 | `ui/Dashboard.jsx` | Page | 256 | Camp overview with KPIs |
| 3 | `ui/Roster.jsx` | Page | 92 | Fighter table with state |
| 4 | `ui/FighterDetail.jsx` | Detail | 303 | Full fighter profile |
| 5 | `ui/Sidebar.jsx` | Nav | 81 | Tab navigation |
| 6 | `components/FightCard.jsx` | Overlay | 112 | Pre-fight tale of the tape |
| 7 | `components/WeeklySummary.jsx` | Overlay | 38 | Post-week summary |
| 8 | `components/ConfirmModal.jsx` | Modal | 18 | Confirmation dialog |
| 9 | `components/GameOverBanner.jsx` | Display | 13 | Game over screen |
| 10 | `components/WinConditionBanner.jsx` | Display | 38 | Legacy tier badge |
| 11 | `App.jsx` | Shell | 179 | Application orchestrator |
| 12 | `ui/ConfirmModal.jsx` | Modal | 18 | Reusable modal |

---

## 3 — Current Pattern

### 3.1 Export Style

**Dominant pattern (100% of components):** Named function with default export.

```jsx
export default function ComponentName({ props }) { ... }
```

**Consistent across all 12 reference components.** No arrow-function exports, no anonymous default exports.

**Current state:** unanimous.

### 3.2 Props Definition

**Dominant pattern:** Props destructured in the function signature.

```jsx
export default function Dashboard({ g, setTab, dispatch }) { ... }
export default function ConfirmModal({ title, body, onConfirm, onCancel }) { ... }
export default function FightCard({ fighter, g, onProceed }) { ... }
export default function WeeklySummary({ summary, onClose, t }) { ... }
```

**Current state:** unanimous across all components. No `props.xxx` access patterns found.

### 3.3 Import Pattern

**Dominant pattern:**

- Design tokens + primitives imported from `../ui/theme.jsx` (or `./theme.jsx`)
- Engine utilities imported from `../engine/xxx.js`
- i18n imported from `../i18n/index.js`
- React imported explicitly in some files, omitted in others

```jsx
import React from "react";                                    // optional in 2026
import { T, Panel, Eyebrow, Tag, Btn } from "./theme.jsx";   // always theme
import { t } from "../i18n/index.js";                         // translations
import { fmt$ } from "../engine/rng.js";                      // engine utilities
```

**Current state:** ~50% of components import `React` explicitly. Both patterns coexist. The project's Vite config handles the auto-import, so `React` import is technically optional but harmless when present.

### 3.4 Guard Clause Pattern

**Dominant pattern:** Early return null for missing required data.

```jsx
if (!f || !m) return null;                           // FightCard
if (!summary) return null;                           // WeeklySummary
if (!legacy || legacy <= 0) return null;             // WinConditionBanner
```

**Current state:** consistent. All display components guard their required props.

### 3.5 State Pattern

**Page components use `useState` for UI-only state:**

```jsx
const [detailFighter, setDetailFighter] = useState(null);   // Roster
const [tab, setTabRaw] = useState(getLastTab());             // App.jsx
```

**Game state is never stored in component state.** Game state comes from the `g` prop, passed down from App.jsx. Components read `g` directly:

```jsx
const bookedSorted = g.roster.filter(f => f.booked);          // Dashboard
const pendingOffers = g.inbox.filter(m => m.type === "offer"); // Dashboard
const r = rankOf(g, f);                                        // Roster
```

**Current state:** consistent. Components use `useState` only for local UI concerns (selected fighter, tab index, open/closed). They never copy game state into local state.

### 3.6 Styling Pattern

**100% inline styles.** No CSS modules, no styled-components, no CSS-in-JS libraries.

```jsx
<div style={{
  fontFamily: T.disp, fontWeight: 700, fontSize: 13,
  color: T.txt2, padding: "6px 14px", borderRadius: T.r,
  background: T.surface, border: `1px solid ${T.line}`,
}}>
```

**Theme tokens from `T` object:**

| Token | Usage |
|-------|-------|
| `T.surface`, `T.raised`, `T.bg` | Background colors |
| `T.txt`, `T.txt2`, `T.txt3` | Text colors |
| `T.ember`, `T.steel`, `T.gold`, `T.pos`, `T.neg`, `T.warn` | Semantic colors |
| `T.disp`, `T.body`, `T.mono` | Font families |
| `T.r`, `T.r2` | Border radius |

**Style override pattern:** Components accept optional `style` prop and spread it last:

```jsx
const Panel = ({ children, style, pad = 16 }) => (
  <div style={{ ..., ...style }}>{children}</div>
);
```

**Current state:** consistent. Inline styles are the universal convention.

### 3.7 Callback / Event Pattern

**Callback naming:** `on` + action (uppercase following letter):

| Component | Callback Prop | Purpose |
|-----------|--------------|---------|
| `FightCard` | `onProceed` | Enter the cage |
| `WeeklySummary` | `onClose` | Dismiss summary |
| `ConfirmModal` | `onConfirm`, `onCancel` | Yes / No |
| `GameOverBanner` | `onRestart` | New game |
| `Sidebar` | `setView` | Navigate tab |

**Dispatch calls:** Components receive `dispatch` as a prop and call it directly:

```jsx
// Dashboard dispatches actions
{/* not shown in Dashboard, but available as prop */}

// Sidebar navigates
onClick={() => setView(k)}
```

**Current state:** consistent naming convention. `onXxx` for callbacks, `dispatch` for action dispatching.

### 3.9 Composition Pattern

**Component hierarchy:**

```
theme.jsx (primitives)
    │
    ▼
components/ (reusable pieces) ──► ui/ (page screens)
                                      │
                                      ▼
                                  App.jsx (orchestrator)
```

**Composition style:** Wrapper components (Panel, Btn, Eyebrow) use `children` and spread `style`.

```jsx
<Panel style={{ ... }}>
  <Eyebrow>Section Title</Eyebrow>
  <Btn onClick={...}>Action</Btn>
</Panel>
```

**No render props, no higher-order components, no compound components found.** The project uses direct prop-passing and composition through `children`.

---

## 4 — Standard Pattern

Based on the discovery above, these are the **single recommended pattern** for every new component.

### 4.1 Export: Standard

```jsx
export default function ComponentName({ requiredProps, optionalProps, callbacks }) {
  // guards
  if (!requiredProp) return null;

  // composition
  return (
    <Primitive style={{ ... }}>
      ...content...
    </Primitive>
  );
}
```

### 4.2 Imports: Standard

```jsx
// Theme primitives (always)
import { T, Panel, Btn, Eyebrow, Tag } from "./theme.jsx";

// Custom hooks use relative path
import { fmt$ } from "../engine/rng.js";

// i18n
import { t } from "../i18n/index.js";
```

**Rule:** Order consistently: theme → engine → i18n → child components.

### 4.3 Props: Standard

| Prop Category | Naming | Example |
|--------------|--------|---------|
| Game state | `g` | `function Dashboard({ g, ... })` |
| Action dispatcher | `dispatch` | `function Roster({ dispatch, ... })` |
| Derivation callback | `up` | `function FighterDetail({ up, ... })` |
| Navigation | `setXxx` | `function Sidebar({ setView, ... })` |
| Callbacks | `onXxx` | `onConfirm`, `onClose`, `onProceed` |
| Data | descriptive | `fighter`, `summary`, `message` |

### 4.4 Guard: Standard

```jsx
if (!requiredData) return null;
```

Place at the top of the component, before any state or computation.

### 4.5 Styling: Standard

- Use inline style objects exclusively.
- Reference tokens from `T` (design tokens).
- Accept an optional `style` prop for overrides.
- Use `...style` spread last in the style object.

### 4.6 Data Access: Standard

- Read game state from `g` prop.
- Compute derived values directly in the component body (these are cheap — attributes are pre-computed by engine).
- Display formatting only (rounding, currency symbols, date formatting). No business logic.
- Dispatch actions via `dispatch` prop — never mutate `g` directly.

### 4.7 Local State: Standard

- Use `useState` only for UI concerns: selected item, open/closed, tab index.
- Never copy game state into local state.
- Use `useEffect` only for side effects that must happen outside render (e.g., fight queue detection in App.jsx).

---

## 5 — Component Responsibilities

| Layer | Location | Responsibility |
|-------|----------|---------------|
| **Primitives** | `ui/theme.jsx` | Design system: Panel, Btn, Tag, Eyebrow, Mono, OVR, Meter, AttrTele, CompareBar, Icon. No game state access. |
| **Reusable** | `components/*.jsx` | Self-contained display units. Accept data and callbacks as props. No `dispatch` or `g` unless they need to trigger actions. |
| **Pages** | `ui/*.jsx` | Full-screen views. Read `g`, call `dispatch`, manage UI state. Compose primitives and reusable components. |
| **Shell** | `App.jsx` | Orchestration. Owns state (setG), hooks (useGameState, useSaveLoad), routing (tab state). Passes `g`, `dispatch`, `up` down to pages. |

---

## 6 — Data Flow

```
App.jsx
  │  owns: g, setG, dispatch, up, advance, tab state
  │
  ├──► Sidebar       ← props: view, setView, onAdvance, inboxCount
  ├──► TopBar        ← props: week, cash, rep
  ├──► Dashboard     ← props: g, setTab, dispatch
  ├──► Roster        ← props: g, setTab, up, dispatch
  │     └──► FighterDetail  ← props: f, g, up, dispatch  (or onBack variant)
  ├──► Inbox         ← props: g, dispatch
  ├──► Finance       ← props: g
  ├──►...other pages
  ├──► FightCard     ← props: fighter, g, onProceed
  ├──► WeeklySummary ← props: summary, onClose, t
  └──► ConfirmModal  ← props: title, body, onConfirm, onCancel, danger
```

**Key constraint:** `g` flows down via props. `dispatch`, `up`, and `advance` are the only way data flows up.

---

## 7 — State Management Rules

| What | Where | Example |
|------|-------|---------|
| Game state | `g` prop from App.jsx | `g.roster`, `g.cash`, `g.inbox` |
| UI state | `useState` in component | `const [detailFighter, setDetailFighter]` |
| Derived data | computed in render | `const isChamp = f.titles?.some(t => t.includes("Champion"))` |
| Side effects | `useEffect` in App.jsx or hooks | auto-save timer, fight queue detection |
| Transient UI | variable or ref | scroll position, hover state |

**Never:** store `g` slices in `useState`, duplicate validation logic, or compute game business rules inline.

---

## 8 — Composition Rules

- **Primitives nest inside Panel.** Complex layouts are built by composing primitives inside wrapper components.
- **Spacing is inline.** Margins are set via `style` objects, not CSS classes.
- **Children are explicit.** Components that wrap content use `{children}`.
- **No render props.** Pass data directly.
- **No HOCs.** Every component is a plain function.
- **No compound components.** Primitives are independent exports, not nested under a parent namespace.

---

## 9 — Props Rules

| Rule | Reasoning |
|------|-----------|
| Destructure at function signature | Enables `default export function` pattern |
| One prop per concern | Game state, callbacks, and display data are separate |
| `dispatch` (not `onAction`) for game actions | Consistent with reducer pattern across the project |
| `onXxx` for UI callbacks | Distinguishes UI events from game actions |
| `setXxx` for navigation | Consistent with `useState` setter convention |
| No `...rest` unless absolutely necessary | Makes the prop interface explicit |

---

## 10 — Naming Rules

| Entity | Pattern | Example |
|--------|---------|---------|
| Component | PascalCase, noun | `FighterCard`, `WeeklySummary` |
| File | PascalCase, matches component | `FighterCard.jsx` |
| Page components | PascalCase, matches tab | `Dashboard.jsx`, `Roster.jsx` |
| Primitives | PascalCase, generic | `Panel`, `Btn`, `Tag`, `Mono` |
| Callback props | camelCase, `on` prefix | `onConfirm`, `onProceed` |
| Data props | camelCase, descriptive | `fighter`, `summary`, `message` |
| Style override | `style` (always lowercase) | `style={{ ... }}` |

---

## 11 — File Organization

```
ui/
├── App.jsx              # Shell — owns state
├── theme.jsx            # Primitives — design system
├── Sidebar.jsx          # Navigation
├── TopBar.jsx           # Header bar
├── Dashboard.jsx        # Page — camp overview
├── Roster.jsx           # Page — fighter list
├── FighterDetail.jsx    # Page — single fighter
├── Inbox.jsx            # Page — messages
├── Finance.jsx          # Page — economy
├── Scout.jsx            # Page — scouting
├── Rankings.jsx         # Page — division rankings
├── RivalsScreen.jsx     # Page — rival camps
├── Facility.jsx         # Page — camp facilities
├── Achievements.jsx     # Page — achievement list
├── Dynasty.jsx          # Page — legacy stats
├── FightNight.jsx       # Page — staged fight
├── NegotiateModal.jsx   # Modal — contract negotiation
├── ConfirmModal.jsx     # Modal — are you sure?
└── ui-utils.js          # Utility (tab persistence)

components/
├── FightCard.jsx        # Pre-fight tale of the tape
├── WeeklySummary.jsx    # Post-week overlay
├── GameOverBanner.jsx   # End-game banner
├── WinConditionBanner.jsx # Legacy tier badge
└── fight/               # FightNight sub-components
    ├── Staredown.jsx
    ├── WeighIn.jsx
    ├── Entrance.jsx
    ├── RoundView.jsx
    ├── Corner.jsx
    ├── DoctorCheck.jsx
    ├── Knockdown.jsx
    ├── Scoreboard.jsx
    └── ResultScreen.jsx
```

---

## 12 — Anti-Patterns

These are patterns explicitly observed as mistakes or avoided across the codebase.

### ❌ Copying game state into local state

```jsx
// ANTI-PATTERN
const [fighter, setFighter] = useState(g.roster[0]);
```

Components read `g` directly. Local state should only hold UI concerns.

### ❌ Multiple components in one file

Every component in the codebase has its own file. No exceptions. This is the standard.

### ❌ Importing engine internals from UI

```jsx
// ANTI-PATTERN
import { resolveStriking } from "../engine/fight/resolve-striking.js";
```

All imports from engine go through the engine's public API (`rng.js`, `fighter.js`, `data.js`, `rankings.js`).

### ❌ Direct mutation

```jsx
// ANTI-PATTERN
g.cash += 5000;
```

All mutations go through `dispatch()` or `up()`. Direct mutation bypasses the state management system.

### ❌ Conditional hook calls

```jsx
// ANTI-PATTERN
if (someCondition) {
  const [x, setX] = useState(0);
}
```

Hooks are called at the top of the component, unconditionally. This is enforced by React's rules.

---

## 13 — AI Decision Heuristics

When creating or modifying components:

1. **Create a new file for every component.** No exceptions.
2. **Start with the guard clause.** `if (!requiredData) return null` before anything else.
3. **Read from `g`, never copy into state.**
4. **Dispatch actions, never mutate.**
5. **Use inline styles with theme tokens.** No CSS modules, no styled-components.
6. **Name callbacks `onXxx`.** If the action dispatches to the engine, use `dispatch`.
7. **Primitives live in theme.jsx.** If a new visual element is reusable across screens, add it to theme.jsx.
8. **Page components go in `ui/`.** Reusable pieces go in `components/`.
9. **No PropTypes, no TypeScript.** The project doesn't use either. Keep props destructured and name them clearly.
10. **Whether to import `React`:** optional. The project supports auto-import. Don't remove existing `import React` statements, but don't add them either if not needed.

---

## 14 — Validation Checklist

For any new or modified component:

- [ ] Named function: `export default function Xxx({ ... })`
- [ ] Guard clause for required data
- [ ] Props destructured in function signature
- [ ] No game state in `useState`
- [ ] Inline styles with `T` tokens
- [ ] Callbacks named `onXxx` (UI) or `dispatch` (engine)
- [ ] `style` override supported via spread
- [ ] No duplicate business logic
- [ ] No direct mutation of `g`
- [ ] File name matches component name (PascalCase)
- [ ] File in correct location (`ui/` for pages, `components/` for reusable)

---

## 15 — Migration Notes

### 15.1 Known Inconsistency: React Import

**Current state:** ~50% of components import React, ~50% don't.

**Standard:** Both are valid. The project's build handles both. When creating new files, omit `import React` unless you need hooks like `useState` or `useEffect`. When modifying existing files, leave the import as-is.

### 15.2 Known Inconsistency: Navigation Pattern

**Current state:** `FighterDetail.jsx` uses `onBack` prop for navigation. `Roster.jsx` uses inline `useState` and conditionally shows `FighterDetail` — this is effectively a route toggle, not a separate navigation pattern.

**Standard:** Both patterns exist. The `onBack` prop pattern is preferred for components that can be embedded in multiple contexts. The `useState` + conditional render pattern is acceptable for simple parent-child navigation within a single page.

### 15.3 Known Inconsistency: Section Comments

**Current state:** Some files have detailed block comments, some have none.

**Standard:** Add a brief comment at the top of each component describing its role:

```jsx
// FighterCard — pre-fight Tale of the Tape display
```

---

## 16 — Related Documents

| Document | What It Covers |
|----------|---------------|
| `knowledge/08_UI.md` | UI philosophy, design principles, UX heuristics |
| `knowledge/05_ECONOMY.md` | Economy — the state UI displays |
| `knowledge/03_FIGHTER.md` | Fighter — the primary entity displayed in UI |
| `knowledge/01_combat.md` | Combat — displayed in FightNight UI |
| `ui/theme.jsx` | Design system — all primitive component implementations |
| `02_ARCHITECTURE.md` | Layer rules — UI is Presentation layer |
