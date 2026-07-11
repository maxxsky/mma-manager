# Championship System Specification

> **Purpose:** Merancang sistem Championship yang konsisten dengan Knowledge Library dan implementasi game saat ini.
> **Status:** Design Draft — siap dijadikan dasar Sprint 1.
> **Acuan:** knowledge/01_combat.md, knowledge/03_FIGHTER.md, knowledge/04_WORLD.md, knowledge/05_ECONOMY.md, knowledge/06_EVENTS.md
> **Codebase HEAD:** 1738b35

---

## 1 — Objective

Memperkenalkan sistem Championship yang memiliki **berat naratif, persyaratan peringkat yang ketat, pertahanan wajib, dan konsekuensi ekonomi** — bukan sekadar string "Major World Champion" di fighter profile. Sistem harus reuse seluruh mekanik existing (rankings, matchmaking, fight offers, events) dan menambahkan lapisan aturan yang membuat title picture terasa realistis.

**Design Principles:**
- Title harus diraih, bukan diberikan — persyaratan peringkat minimum.
- Champion harus dipertahankan — pertahanan wajib dengan tenggat.
- Title kosong harus diisi — mekanik vacant title dengan tournament/scheduled fight.
- Champion punya hak istimewa — benefit ekonomi, naratif, dan gameplay.
- Semua aturan berlaku sama untuk player dan AI fighter — different decisions, same physics.
- Reuse seluruh sistem yang sudah ada — jangan buat ulang ranking, matchmaking, atau fight offer.
- Minimal save migration — tambah field baru, jangan ubah yang existing.

---

## 2 — Current State

### 2.1 What Exists

| Feature | Current Implementation | File(s) |
|---------|----------------------|---------|
| Title string | `f.titles: string[]` — push "Major World Champion" on win | commitResult.js:28 |
| Division champion | `g.divisions[wc].champ = { name, fighterId, player }` | commitResult.js:29 |
| Title defenses | `f.titleDefenses` counter incremented on title win with pre-existing title | career.js:159 |
| Mandatory defense offer | Auto-generated every 24 weeks if no defense already offered | tick/fight-offers.js:14-24 |
| AI title defenses | Simplified simulation every `TICK_TITLE_DEFENSE` weeks | world.js:48-98 |
| Title in matchmaking | `offer.title` flag on fight offers | tick/fight-offers.js |
| Rankings filter | Champion excluded from `div.list` before ranking display | ui/Rankings.jsx:34,52 |
| Title loss | Strip title on reject with strip flag; AI title changes via world sim | reducer/fight.js:46-48 |
| Title win event chain | Celebration + Sponsor events queued on first title win | commitResult.js:43-76 |
| World history tracking | `_worldHistory.titleChanges` array | world/history.js |
| Hall of Fame | Title win contributes +30 score to HoF evaluation | dynasty.js:193-194 |

### 2.2 What's Missing

| Gap | Impact | Priority |
|-----|--------|----------|
| **No title tiers** — only "Major World Champion" exists. No interim, no silver/bronze lineage. | Low — cosmetic for now |
| **No minimum ranking requirement** — any fighter with a title fight offer can become champion regardless of rank. | High — can produce unqualified champions |
| **No voluntary title vacation** — player cannot vacate a title to move weight class. | Medium — restricts strategic play |
| **No title unification** — fighter holding championships in two weight classes is tracked via `titles[]` but no special matchmaking. | Low — edge case |
| **No structured title lineage** — history exists but no formal "reign" tracking (defense count, days as champion). | Medium — narrative depth |
| **No champion-specific UI** — no title defense tracker, no championship record card. | Medium — player experience |
| **No financial benefit for being champion** — no champion bonus or PPV share. | High — missing economic depth |

### 2.3 Current User Flow

```
1. Fighter ranked #1-#5 gets title fight offer (g.inbox)
2. Player accepts → fighter gets `booked.title = true`
3. Fight simulation runs (FightNight)
4. If fighter wins → "Major World Champion" added to f.titles
   → g.divisions[wc].champ updated
   → g.legacy += 2000
   → Celebration event queued (week+2)
   → Sponsor interest event queued (week+4)
   → processTitleChange() records milestone
5. Every 24 weeks → mandatory defense offer (if still champion)
6. If fighter rejects defense → can strip title
7. AI champions auto-defend every TICK_TITLE_DEFENSE weeks
8. Ranking display excludes champion from div.list
```

---

## 3 — Target Design

### 3.1 Design Goals

- **Titles feel earned** — minimum ranking requirement before title shot eligibility.
- **Reigns have weight** — defense count tracked and displayed; long reigns rewarded.
- **Vacant titles get filled** — clear matchmaking path when champion leaves division.
- **Champions have benefits** — financial bonus, narrative events, reputation boost.
- **Player can vacate** — strategic choice to chase second belt or avoid mandatory defense.
- **AI champions follow same rules** — simplified but same structural constraints.

### 3.2 Non-Goals (Explicitly Not Included)

- Multiple title tiers (interim, silver, bronze) — deferred to future sprint.
- Weight class unification tournaments — deferred.
- Retirement era / championship committee — complex, not needed.
- Belt design / visual identity — cosmetic, not mechanical.

---

## 4 — Core Gameplay Loop

```
┌──────────────────────────────────────────────────────────────────┐
│                   CHAMPIONSHIP CORE LOOP                         │
│                                                                  │
│  NORMAL STATE (no champion, or champion is AI)                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Rankings updated monthly                                 │    │
│  │  Top contender generated from div.list                    │    │
│  │  Title fight offered to #1 contender                      │    │
│  │  Winner becomes champion                                  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  CHAMPION STATE                                                 │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Champion holds title (player or AI)                     │    │
│  │  Mandatory defense timer: 24 weeks                       │    │
│  │  Top contender auto-generated if no challenger            │    │
│  │  Champion can accept/decline/counter offers               │    │
│  │  Vacant: if champion leaves division or retires           │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  TITLE FIGHT                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  Simulated via existing Combat system                    │    │
│  │  Winner: gains title                                     │    │
│  │  Loser: drops in rankings (defended≠won)                 │    │
│  │  Record: title defense incremented                      │    │
│  │  Events: celebration + sponsor chains                    │    │
│  │  Economy: champion bonus applied                         │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│                    RETURN TO CHAMPION STATE                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5 — Championship Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                    TITLE LIFECYCLE                                │
│                                                                  │
│  VACANT ──► Title fight scheduled (top 2 contenders)            │
│     │           │                                                │
│     │           ▼                                                │
│     │       ACTIVE (champion holds belt)                        │
│     │           │                                                │
│     │     ┌─────┼──────────────┐                                 │
│     │     │     │              │                                 │
│     │     ▼     ▼              ▼                                 │
│     │  Defense  Vacation    Champion loses/retires               │
│     │     │     │              │                                 │
│     │     │     ▼              ▼                                 │
│     │     │  VACANT ────► Title fight scheduled                  │
│     │     │     │                                                │
│     │     ▼     │                                                │
│     │  Continues│                                                │
│     │  as champ │                                                │
│     └───────────┘                                                │
│                                                                  │
│  PHASES:                                                         │
│  1. Vacant — no champion, top contenders fight for title         │
│  2. Active — champion holds, timer counts down                   │
│  3. Defense — mandatory offer generated                          │
│  4. Vacant (again) — champion leaves, repeat                     │
└──────────────────────────────────────────────────────────────────┘
```

### Phase Transitions

| Transition | Trigger | Action |
|-----------|---------|--------|
| Vacant → Active | Title fight winner declared | Champion set, timer starts |
| Active → Defense | 24 weeks since last defense | Mandatory offer generated |
| Defense → Active | Defense fight accepted/scheduled | Timer resets on fight date |
| Active → Vacant | Champion vacates, retires, or loses title | Strip title, schedule vacant fight |
| Active → Vacant (AI) | AI champion retires via world retirement | Clear champ, schedule vacant fight |

---

## 6 — Title Eligibility Rules

### 6.1 Contender Requirements

A fighter must meet ALL of these to be eligible for a title shot:

| Rule | Threshold | Rationale |
|------|-----------|-----------|
| Min ranking | Top 5 in division (#1-#5) | Prevents unranked fighters from title shots |
| Min win streak | 2 consecutive wins (or title eliminator win) | Ensures momentum |
| Not injured | `!f.injury` | Can't fight while injured |
| Not already booked | `!f.booked` | Can't book two fights |
| Active recently | Fought in last 24 weeks (or returning from injury) | Prevents inactive fighters jumping queue |

### 6.2 Exceptions

- **Title eliminator match**: #2 vs #3 — winner is guaranteed next title shot (bypasses streak requirement). Already partially supported via `offer.isTitleEliminator` flag.
- **Rematch clause**: Former champion who lost the title gets immediate rematch if within 4 weeks and streak ≤ 1 loss.
- **Champion moving up**: If champion vacates to move weight class, they get priority contender status in new division.

### 6.3 Implementation

Reuse existing `rankOf()` from `engine/rankings.js`. Filter roster by weight class, sort by rankPoints, check win streak via `f.streakW`. The matchmaking logic in `tick/fight-offers.js` already generates title fight offers — add eligibility check before offer generation.

---

## 7 — Ranking Interaction

### 7.1 Current State (unchanged)

- Rankings are maintained per division in `g.divisions[wc].list`
- Champion is excluded from `div.list` (shown separately via `div.champ`)
- Rank points earned via wins, adjusted by win streak and opponent quality
- Rankings recalculated monthly in `tickRankings(g)` + after significant results

### 7.2 Changes

| Change | Detail |
|--------|--------|
| **Minimum rank check** | Before generating title offer, verify contender is #1-#5 |
| **Title eliminator** | #2 vs #3 generates special offer with `isTitleEliminator: true` |
| **Champion in rankings** | Champion stays in P4P rankings but removed from division rankings |
| **Win streak bonus** | Title win adds +20 rank points (ensures dominant champion stays relevant) |
| **Loss penalty for champion** | Title loss reduces rank points by 50% (drop in rankings) |

### 7.3 Ranking Points for Title Fights

| Outcome | Rank Points Change |
|---------|-------------------|
| Champion wins (defense) | +10 |
| Champion wins (finish) | +15 |
| Challenger wins (title win) | +30 |
| Champion loses | Current rankPoints × 0.5 (halved) |
| Challenger loses (title fight) | -5 (less penalty than normal loss) |

---

## 8 — Matchmaking Rules

### 8.1 Title Fight Offer Generation

Reuse and extend existing `tickFightOffers()` in `engine/tick/fight-offers.js`:

```
Every week (inside tickFightOffers):
  For each weight class division:
    If no champion (vacant):
      → Schedule title fight between #1 and #2 contenders
      → Generate special "Vacant Title" offer for player fighter if eligible
      → AI vs AI vacant title fights resolved via world sim
    
    If champion exists:
      → Check mandatory defense timer (24 weeks since last defense)
      → If expired: generate mandatory defense offer for champion vs #1 contender
      → If not expired and week % 8 === 0: generate optional title fight offer
        (champion can accept or decline without penalty)
      
    If titlist eliminator condition met (#2 and #3 both available):
      → Generate title eliminator offer
      → Winner guaranteed next title shot
```

### 8.2 Champion's Choice

When a champion receives a title fight offer:

| Option | Mechanics | Penalty |
|--------|-----------|---------|
| Accept | Normal fight booking | None |
| Counter | Negotiate better terms (higher purse) | Small rep loss with promoter |
| Decline (mandatory) | Strip title, division becomes vacant | Title lost |
| Decline (optional) | Offer removed, no penalty | None |
| Vacate | Voluntarily surrender title anytime | Title lost, rep -5 |

### 8.3 AI Matchmaking

AI champions use simplified logic (follow existing `simulateAITitleDefenses` pattern):
- If mandatory defense due → auto-defend vs #1 contender with `random() < skillRatio` win chance
- Never decline mandatory defense (AI never vacates)
- Title changes recorded in `_worldHistory.titleChanges`

---

## 9 — Belt Ownership

### 9.1 Champion Data Structure

Extend from current simple champ object to include reign tracking:

```
Current:
  g.divisions[wc].champ = { name, fighterId, player }

Extended:
  g.divisions[wc].champ = {
    name, fighterId, player,       // existing
    titleDefenses: number,          // defenses during THIS reign
    wonWeek: number,                // week when title was won
    lastDefenseWeek: number,        // week of most recent defense
    reignLegacy: number,            // accumulated legacy during reign
  }
```

### 9.2 Fighter Data Changes

Add to fighter object (new fields, default to 0/null for migration):

```
reignHistory: [{               // history of all title reigns
  weightClass, wonWeek, lostWeek, defenses, legacy
}]
```

### 9.3 Migration Strategy

All new fields are additive with defaults:
- `champ.titleDefenses = champ.titleDefenses || 0`
- `champ.wonWeek = champ.wonWeek || g.week`
- `champ.lastDefenseWeek = champ.lastDefenseWeek || champ.wonWeek`
- `f.reignHistory = f.reignHistory || []`

No existing data needs to change. UseSaveLoad migration handles missing fields.

---

## 10 — Vacant Title Rules

### 10.1 When Title Becomes Vacant

| Scenario | Detection | Action |
|----------|-----------|--------|
| Champion retires | Event choice or AI retirement | Strip title, log event |
| Champion vacates voluntarily | Player action (new reducer case) | Strip title, log event, rep -5 |
| Champion changes weight class | CLASS_CHANGE_ACCEPT reducer | Strip title, log event |
| Champion stripped for declined mandatory defense | REJECT_FIGHT with stripTitle: true | Already implemented |
| AI champion retires via world sim | world.js retirement check | Strip title via existing logic |

### 10.2 Filling Vacant Title

When title becomes vacant:

1. Highest-ranked available fighter (#1) is offered title fight
2. If they decline or are unavailable → offer to #2, then #3, etc.
3. If no top 5 fighter available → schedule between two highest available regardless of rank
4. Vacant title fight is a normal fight with `offer.title = true` and `offer.vacant = true`
5. Winner becomes champion with 0 title defenses

### 10.3 Display

Vacant title shown in Rankings UI as:

```
👑 [Weight Class] — VACANT
Next title fight: #1 Contender vs #2 Contender
```

---

## 11 — Title Defense Rules

### 11.1 Mandatory Defense Schedule

| Interval | Action |
|----------|--------|
| 0-23 weeks since last defense | Normal state — champion can accept optional fights |
| 24 weeks | Mandatory defense offer generated (existing logic, no change) |
| 28 weeks | If mandatory defense still unaccepted, escalation warning sent |
| 32 weeks | Title stripped — champion auto-vacates |

**Current state:** Mandatory defense at 24 weeks exists but no escalation or auto-strip. Add escalation at 28 weeks and auto-vacate at 32 weeks.

### 11.2 Defense Counting

- Title defense = any title fight where fighter enters as champion AND wins
- Winning the title DOES NOT count as a defense (it's a title win)
- Successful defense increments both `f.titleDefenses` (career total) and `champ.titleDefenses` (reign total)
- Career total used for Hall of Fame eligibility
- Reign total shown in champion display

### 11.3 Multi-Division Champion

A fighter holding titles in two weight classes:
- Both titles tracked in `f.titles[]`
- Must defend each title independently (two separate defense timers)
- If defending one title → only that timer resets
- Player can vacate one title while keeping the other

---

## 12 — Champion Benefits

### 12.1 Financial

| Benefit | Value | Implementation |
|---------|-------|----------------|
| Monthly champion bonus | +$5,000/month while holding title | Add to settlement calculation: `if (isChamp) cash += 5000` |
| Title fight purse bonus | 2× normal show money for title fights | Already partially implemented — `offer.title` triggers higher purses |
| Sponsorship modifier | ×1.5 sponsor income while champion | Multiplier on sponsor rate calculation |

### 12.2 Reputation

| Benefit | Value |
|---------|-------|
| Reputation bonus | +2 rep per successful defense |
| Popularity floor | Cannot drop below 25 popularity while champion |
| Legacy contribution | +2,000 legacy on title win (existing) + 500 per defense |

### 12.3 Narrative

- Title win triggers event chain (celebration + sponsor — already implemented)
- Title defense triggers "🛡️ Successful Defense" event
- Vacant title triggers "👑 Title Vacated" event (new)
- Long reign milestones: 5 defenses → "Dominant Reign" event; 10 defenses → "Legendary Reign" event

---

## 13 — Champion AI Behavior

AI champions follow the same rules with simplified decision-making:

| Decision | AI Behavior |
|----------|-------------|
| Accept mandatory defense | Always (same as current) |
| Vacate voluntarily | Never |
| Change weight class | Via existing `tickWeightChange` — strips title |
| Retirement | Via existing `tickYearly` retirement check — strips title |
| Fight frequency | Defend every 24 weeks + occasional non-title fight |
| Opponent selection | Always vs highest-ranked available contender |

**No changes needed** to AI behavior. Current `simulateAITitleDefenses` in world.js already handles AI title matches. Add vacant title resolution for AI divisions.

---

## 14 — Event Integration

### 14.1 New Events

| Event | Trigger | Delay | Choices |
|-------|---------|-------|---------|
| 🏆 Title Win | Fighter wins title | Immediate | Already implemented (celebration chain) |
| 🛡️ Successful Defense | Champion wins title defense | Immediate | New — celebration + legacy |
| 👑 Title Vacated | Champion vacates/loses/retires | Immediate | New — notification |
| 🔄 Title Picture Update | Vacant title fight scheduled | Immediate | New — "Top 2 contenders will fight for title" |
| ⚠️ Defense Escalation | 28 weeks without defense | Week+28 | New — warning before auto-strip |
| 👑 Dominant Reign | 5 title defenses | Week of 5th defense | New — legacy boost event |
| 🏛️ Legendary Reign | 10 title defenses | Week of 10th defense | New — major narrative event |

### 14.2 Integration Points

All new events use existing `enhanceEvents()` pipeline and `queueDelayedEvent()` for delayed events. No new event infrastructure needed.

---

## 15 — Economy Integration

### 15.1 Champion Settlement Modifier

In `tick/settlement.js`, add champion bonus calculation:

```js
// Champion bonus — per fighter holding a title
g.roster.forEach((f) => {
  if (f.titles?.some(t => t.includes("Champion"))) {
    g.cash += 5000; // monthly champion stipend
  }
});
```

### 15.2 Sponsor Income Modifier

Champion status increases sponsor attractiveness. Add multiplier in sponsor rate calculation (existing `tick/settlement.js` sponsor logic):

- Champion camp: sponsor offers 1.5× base rate
- Implement as: `if (hasChampion) rate = Math.round(rate * 1.5)`

### 15.3 Title Fight Purse

Already partially implemented. Title fights should offer 2× show money compared to non-title fights at same tier. Add multiplier in `tick/fight-offers.js` where offer purses are calculated.

---

## 16 — Save Data Changes

### 16.1 New Fields

```
g.divisions[wc].champ (extended):
  .titleDefenses: number (default 0)
  .wonWeek: number (default g.week at time of win)
  .lastDefenseWeek: number (default wonWeek)
  .reignLegacy: number (default 0)

fighter (extended):
  .reignHistory: ReignEntry[] (default [])
  .titleDefenses: number (already exists, used for career total)
```

### 16.2 Migration

Add to `useSaveLoad.js` migration block:

```js
// Championship migration
Object.values(g.divisions || {}).forEach((div) => {
  if (div.champ) {
    div.champ.titleDefenses = div.champ.titleDefenses || 0;
    div.champ.wonWeek = div.champ.wonWeek || g.week;
    div.champ.lastDefenseWeek = div.champ.lastDefenseWeek || div.champ.wonWeek;
  }
});
g.roster?.forEach((f) => {
  f.reignHistory = f.reignHistory || [];
});
```

---

## 17 — UI Changes

### 17.1 Rankings Tab

| Change | Detail |
|--------|--------|
| Champion card | Enhanced champion display with defense count, reign length |
| Vacant title | Show "VACANT" badge + next title fight info |
| Title eliminator badge | Highlight #2 vs #3 matchup |
| Defense count column | Add column in ranking table when viewing champion's division |

### 17.2 Fighter Detail

| Change | Detail |
|--------|--------|
| Title record | "Champion (X defenses)" instead of just "Champion" |
| Reign history | List of past title reigns with dates |
| Vacate button | Button to vacate title (if champion) — with confirmation |

### 17.3 Inbox

- Enhanced title offer display with "Mandatory Defense" vs "Optional Title Fight" distinction
- Escalation warning styling for 28-week overdue defenses
- Title vacant notification with "View Title Picture" action

---

## 18 — Risks

| Risk | Likelihood | Impact | Mitigation |
|------|:----------:|:------:|------------|
| Save migration breaks existing champion data | Low | High | All new fields have defaults; test with existing saves before deploy |
| Player accidentally vacates title | Medium | Medium | Confirmation modal on vacate action (existing ConfirmModal component) |
| Defensive timer desync — clock vs actual fights | Low | Medium | Timer resets on fight booking, not fight outcome (conservative) |
| AI champion unable to find opponent | Low | Medium | Fallback: if no top 5 available, fill from any available fighter in division |
| Increased matchmaking complexity creates performance issue | Low | Low | Matchmaking runs weekly; < 10ms per division |
| Multi-division champion creates complex UI state | Low | Low | Show both titles; each with independent timer |

---

## 19 — Open Questions

| # | Question | Decision Needed From |
|---|----------|---------------------|
| Q1 | Should champion bonus be flat ($5k) or percentage-based (% of camp income)? | Brahma |
| Q2 | Should voluntary vacation have a cooldown (e.g., can't reclaim same title for 24 weeks)? | Brahma |
| Q3 | Auto-strip at 32 weeks or allow indefinite extension if both parties agree? | Brahma |
| Q4 | Should title eliminator guarantee next shot regardless of other contenders? | Brahma |
| Q5 | How should multi-division champion handle simultaneous mandatory defenses? | Brahma |
| Q6 | P4P ranking needed? Currently rankings are division-only. | Brahma |

---

## 20 — Implementation Roadmap

### Sprint 1a — Core Mechanics (estimated: 3-4 days)

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 1 | Extend `g.divisions[wc].champ` with reign tracking fields | engine/reducer/fight.js, engine/fights/commitResult.js | — |
| 2 | Add minimum ranking check to title offer generation | engine/tick/fight-offers.js | #1 |
| 3 | Add title eliminator matchmaking (#2 vs #3) | engine/tick/fight-offers.js | — |
| 4 | Implement voluntary vacation reducer action | engine/reducer/fight.js | — |
| 5 | Add defense escalation (28w warning) + auto-strip (32w) | engine/tick/fight-offers.js | #1 |
| 6 | Champion financial bonus (settlement modifier) | engine/tick/settlement.js | — |
| 7 | Champion sponsor income multiplier | engine/tick/settlement.js | — |

### Sprint 1b — Events, UI, AI (estimated: 3-4 days)

| # | Task | Files | Depends On |
|---|------|-------|------------|
| 8 | New events: defense success, title vacated, escalation, reign milestones | engine/events/generators/, events/config.js | Sprint 1a |
| 9 | Enhanced champion card in Rankings UI | ui/Rankings.jsx | Sprint 1a |
| 10 | Title record + reign history in FighterDetail | ui/FighterDetail.jsx | Sprint 1a |
| 11 | Vacate title button in FighterDetail | ui/FighterDetail.jsx | #4 |
| 12 | Enhanced inbox display for title offers | ui/Inbox.jsx | — |
| 13 | Save migration for new championship fields | hooks/useSaveLoad.js | Sprint 1a |
| 14 | AI vacant title resolution | engine/world.js | — |
| 15 | Vacant title matchmaking for player fighters | engine/tick/fight-offers.js | — |

### Post-Sprint (future)

- P4P Rankings
- Multi-division champion UI
- Title lineage viewer (past champions list)
- Retirement era tracking
