# Championship Sprint 1 — Discovery Report

> **Tujuan:** Memastikan implementasi reuse sistem existing semaksimal mungkin.
> **Method:** Step 0 — trace lengkap champion flow, mapping per file, gap analysis.
> **Codebase HEAD:** 1738b35

---

## 1 — Champion Flow Saat Ini

### 1.1 Bagaimana Fighter Menjadi Champion

```
1. Player fighter receives inbox offer with title: true (dari tickFightOffers)
2. Player accepts → dispatch({ type: "ACCEPT_FIGHT", ... })
   → reducer/fight.js sets fighter.booked with title: true
3. Week advances → fighter.booked.weeksLeft hits 0
4. FightNight detects due fight → staged fight experience
5. Fighter wins → commitFightResult() in fights/commitResult.js
6. commitResult.js checks fighter.booked?.title:
   → f.titles.push("Major World Champion")
   → g.divisions[wc].champ = { name, player: true, fighterId }
   → g.legacy += 2000
   → processTitleChange(f, g, "won") → milestone, career events
   → queueDelayedEvent: celebration (week+2) + sponsor (week+4)
```

**Files involved:**
- `engine/tick/fight-offers.js` — generates title fight offer
- `engine/reducer/fight.js` — ACCEPT_FIGHT case, sets `booked.title`
- `ui/Inbox.jsx` — player clicks accept
- `ui/FightNight.jsx` — staged fight experience
- `engine/fights/commitResult.js` — processes win, sets champ + titles
- `engine/career.js` — `processTitleChange()`, `recordMilestone()`
- `engine/events.js` — `queueDelayedEvent()` for event chains

### 1.2 Bagaimana Title Disimpan

| Data | Location | Structure |
|------|----------|-----------|
| Fighter's titles | `f.titles: string[]` | `["Major World Champion"]` |
| Division champion | `g.divisions[wc].champ` | `{ name, player, fighterId }` |
| Title defenses (career) | `f.titleDefenses: number` | Counter, incremental |
| World history | `g._worldHistory.titleChanges` | Array of title change records |
| Hall of Fame impact | `dynasty.js` | +30 score for title win |

### 1.3 Bagaimana Title Hilang

| Scenario | Mechanism | File | Function |
|----------|-----------|------|----------|
| Decline mandatory defense | `stripTitle(g, fighterId)` | `tick/fight-offers.js:244` | Inbox expiry check |
| Reject fight with strip flag | `f.titles.filter(...)` | `reducer/fight.js:46` | REJECT_FIGHT case |
| Weight class change | `vacateTitle(g, f)` | `reducer/fighter.js:26` → `rankings.js:35` | CLASS_CHANGE_ACCEPT |
| AI loses title | `d.champ = { name: contender, ... }` | `world.js:67` | simulateAITitleDefenses |
| AI champion retirement | Champion aged out + replaced | `world.js:197-201` | maintainDivisions |

### 1.4 Bagaimana Mandatory Defense Dibuat

```js
// tick/fight-offers.js:14-33
if (isChamp && g.week - f.lastFightWeek >= 24 && !alreadyOffered) {
  // Generate opponent from div.list[0] (#1 contender)
  // Push inbox offer with defense: true, expires: 3 weeks
  // Log: "Mandatory defense untuk {f.name} tiba"
}
```

Jika expired (3 minggu):

```js
// tick/fight-offers.js:244
if (m.expires <= 0 && m.defense) stripTitle(g, m.fighterId);
```

### 1.5 Bagaimana AI Title Defense Berjalan

```js
// world.js:49-98 — simulateAITitleDefenses()
// Runs every TICK_TITLE_DEFENSE weeks
//     AI champion vs #1 contender
//     Skill ratio determines upset chance
//     If contender wins → d.champ updated, recorded in world history
//     Former champ demoted in div.list
```

---

## 2 — File Mapping

| File | Key Functions | Changes Required? | Reason |
|------|--------------|:-----------------:|--------|
| `engine/reducer/fight.js` | ACCEPT_FIGHT, REJECT_FIGHT | **YES** | Add VACATE_TITLE action |
| `engine/rankings.js` | vacateTitle, stripTitle, rankOf | **YES** | Extend vacateTitle for voluntary vacation + rankOf includes champ check |
| `engine/tick/fight-offers.js` | tickFightOffers | **YES** | Add eligibility check (rank, streak), escalation at 28w, auto-strip at 32w |
| `engine/fights/commitResult.js` | commitFightResult | **YES** | Add champ tracking fields (wonWeek, lastDefenseWeek) |
| `engine/career.js` | processTitleChange | **YES** | Update reign-level defense tracking |
| `engine/world.js` | simulateAITitleDefenses, maintainDivisions | **NO** | AI already handles title changes correctly |
| `engine/world/config.js` | TICK_TITLE_DEFENSE | **NO** | Interval constant, already correct |
| `engine/reducer/fighter.js` | CLASS_CHANGE_ACCEPT | **NO** | Already calls vacateTitle — correct |
| `engine/tick/settlement.js` | tickSettlement | **YES** | Add champion monthly bonus |
| `engine/events.js` | processEventSystem | **YES** | Add defense success event (immediate) |
| `engine/events/config.js` | — | **YES** | Add defense event constants + reign milestone thresholds |
| `engine/hooks/useSaveLoad.js` | migration block | **YES** | Add champ field defaults for existing saves |
| `ui/Rankings.jsx` | Rankings component | **YES** | Enhanced champion card, vacant display |
| `ui/FighterDetail.jsx` | FighterDetail | **YES** | Show title record, reign history, vacate button |
| `ui/Inbox.jsx` | Inbox | **YES** | Enhanced title offer display (mandatory vs optional) |

**Total files to modify: 12**
**(4 engine + 1 reducer + 1 hook + 2 events + 3 UI)**

---

## 3 — Gap Mapping

### 3.1 Title Eligibility

**Sudah ada:**
- `rankOf()` returns ranking position (used in multiple places)
- `f.streakW` tracks win streak
- Fight offers already check `!f.injury && !f.booked`
- Matchmaking already exists in `tick/fight-offers.js`

**Kurang:**
- **No minimum rank check** before generating title offer — any fighter can receive a title shot
- **No win streak check** — a fighter on a losing streak can get a title shot
- Currently title offers only check `isChamp` (for mandatory defense) or random matchmaking (for normal offers)

**File yang perlu diubah:**
- `engine/tick/fight-offers.js` — add eligibility check before generating title offers
  - Check: `rankOf(g, f) <= 5` (top 5)
  - Check: `f.streakW >= 2 || f.streakW == null` (streak — new fighters get pass)
  - Only applies to `offer.title === true` offers

### 3.2 Vacant Title

**Sudah ada:**
- `vacateTitle(g, f)` in `rankings.js:35` — strips title, promotes #1 contender
- `stripTitle(g, fighterId)` in `rankings.js:44` — vacate + morale penalty
- Weight class change already calls `vacateTitle`
- `REJECT_FIGHT` with `stripTitle: true` strips title

**Kurang:**
- **No voluntary vacation** — player cannot vacate title without declining a mandatory defense
- **No vacant-to-active matchmaking** — when title is vacated, #1 vs #2 should be scheduled
- `vacateTitle()` currently auto-promotes #1 contender instead of scheduling a fight (undesirable — champion should be determined by fight, not default)

**File yang perlu diubah:**
- `engine/reducer/fight.js` — add `VACATE_TITLE` action case
- `engine/rankings.js` — modify `vacateTitle()`: set champ to null instead of auto-promoting
- `engine/tick/fight-offers.js` — add vacant title matchmaking: schedule #1 vs #2

### 3.3 Champion Tracking

**Sudah ada:**
- `g.divisions[wc].champ = { name, player, fighterId }`
- `f.titles[]` for fighter-level tracking
- `f.titleDefenses` (career total)
- `milestoneFirstTitle` flag

**Kurang:**
- **No reign tracking** — `wonWeek`, `lastDefenseWeek`, `reignDefenses` not tracked on champ object
- **No reign history** — `f.reignHistory[]` doesn't exist
- Current champ object is stateless — no way to know "how long has this champion reigned?"

**File yang perlu diubah:**
- `engine/fights/commitResult.js` — on title win, set `champ.wonWeek = g.week`, `champ.titleDefenses = 0`
- `engine/fights/commitResult.js` — on title defense, increment `champ.titleDefenses`, set `champ.lastDefenseWeek = g.week`
- `engine/career.js` — on title change, push to `f.reignHistory[]`

### 3.4 Mandatory Defense

**Sudah ada:**
- 24-week interval check
- Auto-generation of defense offer vs #1 contender
- 3-week expiry with auto-strip
- Escalation warning and auto-strip logic needs enhancement

**Kurang:**
- **No escalation warning** at 28 weeks (mandatory defense unaccepted for 4+ weeks)
- **No auto-strip at 32 weeks** (strip currently only happens when 3-week inbox expires — if player keeps the offer unread, the timer doesn't advance)
- Current expiry is inbox-based (3 weeks real time), not week-based

**File yang perlu diubah:**
- `engine/tick/fight-offers.js`:
  - Add 28-week escalation warning (inbox event: "Defense overdue — strip in 4 weeks")
  - Add 32-week auto-strip (`if (g.week - lastDefenseWeek >= 32) stripTitle(...)`)
  - Change defense timer trigger from `g.week - lastFightWeek` to `g.week - lastDefenseWeek` (more accurate for champions who fight non-title bouts)

### 3.5 Defense Counter

**Sudah ada:**
- `f.titleDefenses` — career total, incremented in `processTitleChange`
- `processTitleChange(f, g, "defense")` called from `commitResult.js`

**Kurang:**
- **No reign-level defense counter** — `f.titleDefenses` is career total across all reigns
- Multiple reign tracking — a fighter who loses and regains a title should have separate reign counts

**File yang perlu diubah:**
- `engine/career.js` — `processTitleChange`: also increment `champ.titleDefenses` on defense
- `engine/fights/commitResult.js` — on title win, set `champ.titleDefenses = 0`

---

## 4 — Minimal Change Plan

### File 1: `engine/rankings.js` — 2 changes

**Change 1a:** Modify `vacateTitle()` — set champ to null instead of auto-promoting #1.
```
Current: div.champ = { name: newChamp.name, player: false, fighterId: null }
Changed: div.champ = null
```
**Why:** Auto-promotion means no title fight. Vacant titles should be decided by fight, not default. The spec says #1 vs #2 should fight for the belt.

**Change 1b:** No change to `stripTitle()` or `rankOf()` — both work correctly.

**Why other files don't need changes:** `vacateTitle` is called from 3 places: `reducer/fighter.js` (weight change), `reducer/fight.js` (REJECT_FIGHT), and `rankings.js:47` (stripTitle). All callers will now get `null` champ instead of auto-promoted champ. The matchmaking logic in `tick/fight-offers.js` detects null champ and schedules vacant title fights.

### File 2: `engine/reducer/fight.js` — 1 change

**Change 2:** Add new `VACATE_TITLE` case (approximately 8 lines):
```js
case "VACATE_TITLE": {
  const f = g.roster.find(x => x.id === action.fighterId);
  if (f) vacateTitle(g, f);
  break;
}
```
**Why:** Required for player-initiated vacation. No new file needed — using existing `vacateTitle()` function.

**Why other files don't need changes:** The action follows the same pattern as all existing reducer actions. UI will dispatch it, reducer handles it.

### File 3: `engine/tick/fight-offers.js` — 3 changes

**Change 3a:** In the mandatory defense block, change trigger from `lastFightWeek` to `lastDefenseWeek`. Add fallback:
```js
const lastDef = div.champ?.lastDefenseWeek || f.lastFightWeek || 0;
```
**Why:** Champions who fight non-title bouts should not reset their defense timer. `lastDefenseWeek` is specific to title defenses.

**Change 3b:** Add eligibility check before generating ANY title offer:
```js
// Before generating title: true offer
const rank = rankOf(g, f);
if (rank && rank > 5) continue; // only top 5 get title shots
```
**Why:** Prevents unranked fighters from receiving title offers. Reuses existing `rankOf()`.

**Change 3c:** Add defense escalation and auto-strip after mandatory defense check:
```js
// After mandatory defense check, add:
if (isChamp && g.week - lastDef >= 28 && !g.inbox.some(...escalation warning...)) {
  // Send escalation warning: "Defense overdue — strip in 4 weeks"
}
if (isChamp && g.week - lastDef >= 32) {
  stripTitle(g, f.id); // auto-strip
}
```
**Why:** The 3-week inbox expiry is fast (3 real weeks). Week-based escalation (28-32 weeks) is more reliable and gives player more runway.

**Change 3d:** Add vacant title matchmaking at the end of tickFightOffers:
```js
// After per-fighter loop, check for vacant divisions
Object.entries(g.divisions).forEach(([wc, div]) => {
  if (div.champ) return; // skip if champion exists
  // Schedule #1 vs #2 for vacant title
});
```
**Why:** When champion vacates/retires, title must be filled. Reuses existing division ranking data.

### File 4: `engine/fights/commitResult.js` — 2 changes

**Change 4a:** On title win (line 29), extend champ object:
```js
// Current:
g.divisions[f.weightClass].champ = { name: f.name, player: true, fighterId: f.id };
// Changed:
g.divisions[f.weightClass].champ = {
  name: f.name, player: true, fighterId: f.id,
  wonWeek: g.week, lastDefenseWeek: g.week, titleDefenses: 0
};
```
**Why:** Enables reign tracking without adding new infrastructure.

**Change 4b:** On title defense, increment `champ.titleDefenses` and update `lastDefenseWeek`:
```js
// In the block where titleAction === "defense":
const champ = g.divisions[f.weightClass]?.champ;
if (champ) {
  champ.titleDefenses = (champ.titleDefenses || 0) + 1;
  champ.lastDefenseWeek = g.week;
}
```

### File 5: `engine/career.js` — 1 change

**Change 5:** In `processTitleChange()`, add reign history push when title is won:
```js
if (action === "won") {
  if (!f.reignHistory) f.reignHistory = [];
  f.reignHistory.push({ wonWeek: g.week, weightClass: f.weightClass });
}
```
**Why:** Enables reign history display in UI without complex queries.

### File 6: `engine/tick/settlement.js` — 1 change

**Change 6:** Add champion bonus calculation after existing settlement logic:
```js
// Champion monthly bonus
g.roster.forEach((f) => {
  if (f.titles?.some(t => t.includes("Champion"))) {
    g.cash += 5000;
  }
});
```
**Why:** Gives champion financial benefit. Reuses existing `titles[]` array — no new data needed.

### File 7: `engine/events.js` — 1 change

**Change 7:** Wire `processTitleChange()` return events into inbox delivery for defense milestones (already works for "won" — extend to "defense").

### File 8: `hooks/useSaveLoad.js` — 1 change

**Change 8:** Add migration defaults for champ tracking fields:
```js
Object.values(g.divisions || {}).forEach((div) => {
  if (div.champ) {
    div.champ.wonWeek = div.champ.wonWeek || g.week;
    div.champ.lastDefenseWeek = div.champ.lastDefenseWeek || div.champ.wonWeek;
    div.champ.titleDefenses = div.champ.titleDefenses || 0;
  }
});
```

### Files NOT Changed (Rationale)

| File | Why Not Touched |
|------|----------------|
| `engine/world.js` | AI title defense logic works correctly. Only champ data structure changes — AI reads/writes `d.champ` which is compatible with extended fields. |
| `engine/world/config.js` | `TICK_TITLE_DEFENSE` interval is correct. |
| `engine/reducer/fighter.js` | Already calls `vacateTitle()` on class change — compatible with new null-champ behavior. |
| `engine/reducer/constants.js` | No new constants needed — all thresholds (24w, 28w, 32w) can be inline or added later. |

---

## 5 — Dependency Order

### Implementation Sequence

```
Phase 1: Champion Tracking (Foundation)
  1a. commitResult.js — extend champ object with reign fields
  1b. career.js — add reignHistory tracking
  1c. useSaveLoad.js — migration defaults
  └── Nothing else depends on champ tracking — start here.

Phase 2: Mandatory Defense (Timer)
  2a. tick/fight-offers.js — change trigger to lastDefenseWeek
  2b. tick/fight-offers.js — add escalation (28w) + auto-strip (32w)
  └── Depends on Phase 1 for lastDefenseWeek field.

Phase 3: Title Eligibility (Gate)
  3a. tick/fight-offers.js — add rank + streak eligibility check
  └── Standalone — no dependency on Phase 1 or 2. Can be done in parallel.

Phase 4: Vacant Title (Flow)
  4a. rankings.js — modify vacateTitle to set null champ
  4b. tick/fight-offers.js — add vacant title matchmaking
  4c. reducer/fight.js — add VACATE_TITLE action
  └── 4a and 4b must be done together (changing write + read behavior).
      4c is standalone — can be done after 4a.

Phase 5: Economy + Events (Polish)
  5a. settlement.js — champion bonus
  5b. events.js — defense success event
  └── Standalone — no dependency on other phases.

Phase 6: UI (Presentation)
  6a. Rankings.jsx — enhanced champion card, vacant display
  6b. FighterDetail.jsx — title record, reign history, vacate button
  6c. Inbox.jsx — enhanced title offer display
  └── Depends on all data phases (1-4) for new fields.
```

### Optimal Order for Sprint 1

```
Week 1: Phase 1 (Tracking) + Phase 2 (Defense Timer)
  └── Foundation + timer. All backend data structures ready.

Week 2: Phase 3 (Eligibility) + Phase 4 (Vacant)
  └── Gates + flow. Core mechanics complete.

Week 3: Phase 5 (Economy/Events) + Phase 6 (UI)
  └── Polish + presentation.
```

### Testing Order

Each phase independently testable:

| Phase | How to Verify |
|-------|---------------|
| 1 | `.champ.wonWeek` set correctly on title win; `reignHistory` appended |
| 2 | Defense timer uses `lastDefenseWeek`; warning at 28w; strip at 32w |
| 3 | Fighter ranked #6+ never receives title: true offer |
| 4 | Vacating title sets `div.champ = null`; vacant title fight generated next week |
| 5 | Champion camp receives +$5k/month; defense success event appears |
| 6 | Visual verification — champ card, reign table, vacate button |

---

## File Change Summary

| File | Type | Changes | Complexity |
|------|------|---------|:----------:|
| `engine/tick/fight-offers.js` | Engine | 4 changes (eligibility, timer, escalation, vacant) | High |
| `engine/fights/commitResult.js` | Engine | 2 changes (champ fields, defense tracking) | Low |
| `engine/career.js` | Engine | 1 change (reignHistory) | Low |
| `engine/rankings.js` | Engine | 1 change (vacateTitle null) | Low |
| `engine/reducer/fight.js` | Reducer | 1 new action (VACATE_TITLE) | Low |
| `engine/tick/settlement.js` | Engine | 1 change (champion bonus) | Low |
| `engine/events.js` | Engine | 1 change (defense event) | Low |
| `hooks/useSaveLoad.js` | Hook | 1 change (migration) | Low |
| `ui/Rankings.jsx` | UI | Enhanced champ display | Medium |
| `ui/FighterDetail.jsx` | UI | Title record, reign history, vacate button | Medium |
| `ui/Inbox.jsx` | UI | Enhanced title offer display | Low |
| | | **Total: 11 files** | |
