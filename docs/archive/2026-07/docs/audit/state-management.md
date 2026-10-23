# 🗄️ MMA Manager — State Management Audit

> **Date:** 2026-07-10  
> **Scope:** Game state architecture — structure, lifecycle, coupling, synchronization  
> **Method:** Traced `newGame()`, `tick()`, `reducer.js`, `App.jsx`, save/load, all engine modules

---

## 1. STATE STRUCTURE

Single JavaScript object `g` — 20 top-level keys, single source of truth.

| Key | Type | Initial | Mutated By | Persisted |
|-----|------|---------|------------|-----------|
| `week` | number | 1 | tick() | ✅ |
| `cash` | number | 35000 | tick(), reducer, FightNight | ✅ |
| `rep` | number | 8 | tick(), reducer, FightNight | ✅ |
| `chemistry` | number | 60 | tick(), reducer, events | ✅ |
| `roster` | Fighter[] | 2 fighters | tick(), reducer, FightNight | ✅ |
| `coaches` | Coach[] | 1 coach | reducer, events | ✅ |
| `coachMarket` | Coach[] | 3 coaches | tick() monthly | ✅ |
| `facilities` | object | 4 facilities | reducer | ✅ |
| `campTier` | number | 0 | reducer | ✅ |
| `divisions` | object | 8×15 fighters | tick(), reducer, world | ✅ |
| `inbox` | Event[] | [] | tick(), reducer, world, events | ✅ |
| `log` | string[] | 1 entry | tick(), reducer | ✅ (capped 200) |
| `prospects` | Prospect[] | [] | reducer | ✅ |
| `legacy` | number | 0 | FightNight | ✅ |
| `over` | string|null | null | tick() bankruptcy | ✅ |
| `rivals` | RivalCamp[] | 3 camps | tick() | ✅ |
| `promoterRel` | object | 5 tiers | reducer | ✅ |
| `relationships` | object | {} | tick() decay | ✅ |
| `sponsors` | Sponsor[] | [] | reducer, tick(), identity | ✅ |

---

## 2. STATE OWNERSHIP

### tick() — The God Function (1,068 LOC)

Mutates 33 state paths across these subsystems:
- Training + aging + injury (~100 lines)
- Chemistry events (~30 lines)
- Fight offers + title fights (~200 lines)
- Monthly settlement (~80 lines)
- AI ranking jitter + rotation (~30 lines)
- Contract + retirement events (~120 lines)
- Weight class changes (~50 lines)
- Rival simulation + poaching (~50 lines)
- World tick + event system + identity tracking (10 lines each)

### reducer.js — 19 Action Types (369 LOC)

Handles: SET_TRAINING, HIRE/FIRE_COACH, UPGRADE_FACILITY/TIER, SET/TERMINATE_SPONSOR, CLASS_CHANGE, DISMISS_PROSPECT, SCOUT, ACCEPT/COUNTER/REJECT_FIGHT, COUNTER/TALK_POACH, INBOX_REMOVE, SIGN_CONTRACT, INBOX_EVENT (20 sub-branches)

### UI Components

- `FightNight.jsx` `commitResult()` — record, morale, popularity, rep, legacy, title
- `NegotiateModal.jsx` — cash, contract
- `FighterDetail.jsx` — training
- `RivalsScreen.jsx` — rival fighters

---

## 3. STATE LIFECYCLE

**Create:** `newGame()` → synchronous generation of all entities  
**Update:** `tick(g)` mutates in-place → `structuredClone()` in App.jsx → React re-render  
**Save:** `JSON.stringify(g)` → `localStorage.setItem()` (1s throttle)  
**Load:** `JSON.parse(raw)` → migration layer (12+ fighter fields, 8 top-level fields) → `setG(s)`  

---

## 4. DERIVED VS PERSISTED

**Persisted:** All 20 top-level keys + nested objects

**Derived (recomputed each render):**
- Fighter OVR (`avgSkill`)
- Fighter rank (`rankOf`)
- Camp tier object (`CAMP_TIERS[g.campTier]`)
- Coach identity titles
- Fighter nicknames
- Story tags
- Monthly finances
- Camp state flags

---

## 5. COUPLING

**Tightly coupled:** tick()↔g.roster (200+ lines), reducer↔g (10+ paths per action), FightNight↔g.roster

**Loosely coupled:** Engine modules↔UI (zero imports), world.js↔g.inbox (push-only), career.js↔FightNight (pure functions)

---

## 6. SYNCHRONIZATION RISKS

- **State drift:** React batching could delay updates — mitigated by structuredClone
- **Data loss:** 1-second save debounce = up to 1s of mutations lost on crash
- **Migration gaps:** New fields from career/events/identity modules self-heal via lazy init
- **Division champion drift:** Champion tracked in both `divisions[wc].champ` AND `roster[].titles[]`

---

## 7. OVERALL: Grade B

**Strengths:** Single state object simple to serialize and debug. Engine/UI separation perfect. Migration layer explicit. Lazy initialization self-healing.

**Weaknesses:** `tick()` monolith (1,068 lines, untestable in isolation). `INBOX_EVENT` 20-branch chain (fragile). No type safety (JSDoc only). In-place mutation makes undo/redo expensive. No partial save or backup.

The architecture is appropriate for solo development and single-player. Multiplayer would require significant rework of the mutation pattern and action validation.
