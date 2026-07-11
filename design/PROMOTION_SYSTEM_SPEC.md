# Promotion System Specification

> **Codebase HEAD at time of writing:** b88fdd0
> **Method:** Audit existing tier/promoterRel foundation first, extend — not replace.

---

## 1 — Objective

Turn the currently abstract, unnamed "tier" ladder into a roster of distinct promotions
with identity, personality, and title ownership — while keeping everything the current
system already does (relationship score, decay, spillover, matchmaking-by-tier) intact.

---

## 2 — Current State (verified against code)

### 2.1 What Exists

| Piece | Location | Behavior |
|---|---|---|
| Tier ladder | `data/rivals.js` — `PROMO_TIERS` | `["Local", "Regional", "National", "Major", "Premier"]` — 5 fixed tiers, no names beyond the tier label itself |
| Relationship score | `g.promoterRel[tier]` | 0-100 per tier, starts at 30 (`initPromoterRel()`) |
| Gain | `reducer/fight.js` | Accept offer: +5. Counter: -3. Reject: -8. |
| Decay | `tick/settlement.js` | -1 to -2 per 4-week settlement cycle if no fight logged at that tier in 12+ weeks, floor 5 |
| Spillover | `tick/settlement.js` | rel ≥70 at tier N → +0.5 to tier N+1 (impressing the small show opens the bigger one) |
| Matchmaking influence | `tick/fight-offers.js` | `rel` read at offer-generation time; `rel >= 85` / `rel >= 70` unlock better corner text and purse bonuses |
| Display | `ui/Inbox.jsx` | Color-coded rel number shown next to each offer (red <30, green ≥60) |
| Title tier (separate concept) | `tick/fight-offers.js` — `titleTier` | `Premier / Major / Minor / National / Regional` — used for belt prestige text, **not the same variable as `tier`**, no data linkage between the two currently |

### 2.2 What's Missing (confirmed absent, not just undocumented)

- **No promotion identity.** `PROMO_TIERS` is a flat string array. There is no name, logo-flavor, founding year, or personality anywhere — grepped clean.
- **No AI promoter behavior.** Offer generation at a given tier behaves identically regardless of which "promotion" is nominally hosting it — there's no equivalent of the Coach Personality or Sponsor Brand pattern (both of which already give named entities distinct behavior elsewhere in this codebase).
- **No championship ownership.** `g.divisions[wc].champ` has no link to any promotion. A title fight's `titleTier` is cosmetic text only.
- **No contracts.** Every fight is a one-off offer. No multi-fight exclusivity, no promotion loyalty mechanic.

### 2.3 Closest Existing Patterns to Reuse

Two systems in this codebase already solve "named entity with personality" — reuse their shape rather than inventing a third pattern:

- `SPONSOR_BRANDS` (`data/sponsors.js`) — named brands with distinct rate/boost behavior.
- Coach personalities (`Motivator/Technician/Disciplinarian/Player's Coach`) — named personality with a small numeric modifier, no new subsystem.

---

## 3 — Target Design

### 3.1 Design Goals

- Every tier gets 2-3 named promotions instead of one anonymous label. Player builds a relationship with *Apex Fighting Series*, not "Regional."
- Promotions have one personality trait each (reuse the small-modifier pattern above) — no new combat math, no new attribute system.
- Titles remember which promotion crowned them (flavor + lineage, not a new gate).
- Everything current (`promoterRel`, decay, spillover, matchmaking) keeps working exactly as-is — promotions sit **on top of** the existing tier, they don't replace it.

### 3.2 Non-Goals (explicitly out of scope for this spec)

- Player owning/running a promotion themselves — that's a different, much larger epic.
- Promotion-vs-promotion rivalry/wars narrative — belongs to Rivalry System (#02), not this one.
- Multiple simultaneous promotions per fight (co-promotion) — real MMA has this, adds complexity for little player-facing value here.
- PPV / merchandise economy tied to promotions — belongs to Advanced Economy (#09). This spec only touches purse *tier*, not new revenue types.

---

## 4 — Promotion Database

### 4.1 Data Shape

```
g.promotions = {
  [tier]: [
    { id, name, personality, founded, prestige }
  ]
}
```

- 2 promotions per tier, all 5 tiers (10 total) — including `Premier`: two competing top-level organizations, so the player has to choose which one to chase rather than there being one obvious ceiling.
- `prestige` — cosmetic number, flavor text only in v1 (e.g., "Est. 2014, 340 events held"). Not read by any formula. Do not wire it into matchmaking math — that's what `promoterRel` already does.
- **Names — fixed authored list, not procedural** (decided). Suggested set below; Brahma can swap any before implementation, these are placeholders to make the spec concrete rather than final copy:

| Tier | Promotion 1 | Promotion 2 |
|---|---|---|
| Local | Ironclad Fight Nights | Steel City Combat |
| Regional | Frontier MMA | Bastion Fighting Alliance |
| National | Vanguard Championship | Continental Combat League |
| Major | Titan Fighting Series | Apex Combat League |
| Premier | Zenith Championship | Crown MMA |

### 4.2 Personality (reuse Coach-Personality pattern exactly)

| Personality | Effect | Rationale |
|---|---|---|
| Talent Focused | +15% chance to offer a fight involving a top-15 contender | Favors marquee matchups |
| Grassroots | +20% chance to offer a fight involving an unranked/new fighter | Builds prospects |
| High Roller | Purses +20%, but relationship decay -50% faster if inactive | Big money, high expectation |
| Old School | Mandatory-defense-style offers 30% more often | Wants champions to stay active |

One personality per promotion, assigned at world-gen (`newGame()`), fixed for the campaign — same pattern as coach personality, not re-rolled.

### 4.3 Migration

Existing saves have `g.promoterRel[tier]` but no `g.promotions`. On load:
- Generate `g.promotions` fresh (same as a new game would).
- **Do not touch `g.promoterRel`** — it stays keyed by tier string exactly as today. A promotion's effective relationship = its parent tier's `promoterRel` value. (This is the cheapest, lowest-risk option — avoids re-keying every existing offer/log/display that currently reads `g.promoterRel[tier]`.)

---

## 5 — Matchmaking Changes

- `tick/fight-offers.js` — when generating an offer at a given tier, first pick **which promotion** within that tier is hosting it (weighted by personality match against the fighter's situation — e.g., unranked fighter more likely pulled toward a Grassroots promotion).
- Offer object gains one new field: `promotionId` / `promotionName`. Every other field (`tier`, `show`, `winBonus`, `titleTier`, etc.) is computed exactly as today — **the promotion pick is presentation + a small weighting nudge, not a new economy.**
- `ui/Inbox.jsx` — show the promotion name on the offer card (e.g., "Apex Fighting Series — Regional") instead of just the tier label.

---

## 6 — Championship Ownership

- `g.divisions[wc].champ` gains one field: `promotionId` (or null for AI-generated pre-game champions, backfilled on first title change).
- Set at the moment a title is won (`commitResult.js`) — read the winning offer's `promotionId`, so this is a byproduct of matchmaking, not a separate system.
- Display only: `Rankings.jsx` champion banner shows "Undisputed {weightClass} Champion — Apex Fighting Series" instead of just the weight class name. No mechanical gate — a title won at Local tier is still tracked the same way a Premier one is; prestige difference is already communicated by `titleTier` text, not duplicated here.

---

## 7 — Contracts (in scope for Sprint 1, per Brahma's decision — not deferred)

This is a genuinely separate concept from the existing `f.contract` (that one is fighter-to-camp: manager cut, fights owed to *your* camp). This is fighter-to-promotion: an exclusivity deal with one specific organization. Naming it `f.promotionContract` keeps the two from colliding in code or in save data.

### 7.1 Data Shape

```
f.promotionContract = {
  promotionId, fightsLeft, fightsTotal,
  signedWeek, purseBonus,
}
```

### 7.2 How It's Offered

- When a fighter has fought for the same promotion 2+ times without an exclusivity deal, and `promoterRel` at that tier is ≥60, that promotion has a chance (reuse the existing sponsor-renewal-offer pattern from `tick/settlement.js` — same "offer appears in inbox at the right moment" shape) to offer an exclusive multi-fight deal: 3-5 fights, purse bonus +15-25% per fight, in exchange for exclusivity.
- Player accepts/declines like any inbox choice. Accepting sets `f.promotionContract`.

### 7.3 What Exclusivity Actually Restricts

- While `f.promotionContract.fightsLeft > 0`, `tick/fight-offers.js` generates offers **only from that `promotionId`** for this fighter — every other promotion (including other ones at the same tier, and the tier-jump path) is skipped for this fighter until the contract is fulfilled.
- Each completed fight under the contract decrements `fightsLeft`. At 0, the fighter returns to normal open-market matchmaking (any promotion, any tier per usual eligibility rules).
- Mandatory title defenses (existing mechanic, Sprint 1 Championship) are **not blocked** by an exclusivity contract if the champion's own promotion is the one issuing it — but a mandatory defense offer from a *different* promotion should not be generated at all while exclusive (there's nothing to override; it just never gets generated, no new guard code needed beyond the promotionId filter in 7.3's first bullet).
- Breaking a contract early: **not included in v1.** If Brahma wants an "buyout" mechanic later, that's a natural Sprint 2 addition once the base contract exists — flagging here rather than building it speculatively now.

### 7.4 UI

- `ui/Inbox.jsx` — exclusivity offers render distinctly (similar to how title offers already get a distinct tag) — e.g., a tag reading "EXCLUSIVE DEAL — {fightsLeft} fights."
- `ui/FighterDetail.jsx` — if a fighter has an active `promotionContract`, show it near where `f.contract` (camp contract) is already displayed — "Exclusive to {promotionName} — {fightsLeft}/{fightsTotal} fights remaining."

---

## 8 — Open Questions (resolved / still open)

| # | Question | Status |
|---|---|---|
| Q1 | Premier: 1 or 2 promotions? | ✅ Resolved — 2 |
| Q2 | Personality — 4 types proposed, matching Coach Personality's count. More/fewer? | Still open — defaulting to 4 unless told otherwise |
| Q3 | Promotion names — authored list or procedural? | ✅ Resolved — fixed authored list (section 4.1) |
| Q4 | Contracts — Sprint 2 or in scope now? | ✅ Resolved — in scope now (section 7) |

---

## 9 — Implementation Roadmap

### Promotion Sprint 1 — Foundation (sections 4-6)

| # | Task | Files |
|---|------|-------|
| 1 | Promotion database + personality data (10 entries per section 4.1) | `engine/data/promotions.js` (new) |
| 2 | World-gen: assign promotions per tier | `engine/builders.js` |
| 3 | Save migration | `hooks/useSaveLoad.js` |
| 4 | Matchmaking: pick promotion per offer, personality-weighted | `engine/tick/fight-offers.js` |
| 5 | Championship ownership field | `engine/fights/commitResult.js` |
| 6 | UI: promotion name on offers | `ui/Inbox.jsx` |
| 7 | UI: promotion name on champion banner | `ui/Rankings.jsx` |

### Promotion Sprint 2 — Contracts (section 7, depends on Sprint 1)

| # | Task | Files |
|---|------|-------|
| 8 | Exclusivity offer generation | `engine/tick/settlement.js` (reuse renewal-offer pattern) |
| 9 | `f.promotionContract` accept handler | `engine/reducer/` (new case, domain TBD by Santiago) |
| 10 | Matchmaking filter while under contract | `engine/tick/fight-offers.js` |
| 11 | Save migration for `promotionContract` field | `hooks/useSaveLoad.js` |
| 12 | UI: exclusivity tag + FighterDetail display | `ui/Inbox.jsx`, `ui/FighterDetail.jsx` |

Sprint 2 depends on Sprint 1 (needs real `promotionId`s to attach a contract to) — run them in this order, not in parallel.

### Post-Sprint (future, not this spec)

- Contract buyout / early termination
- Promotion-level narrative events ("Apex Fighting Series signs a TV deal — purses up 10% this year")
- Player reputation *with a specific promotion*, not just the tier (would deprecate the tier-level `promoterRel` migration shortcut in section 4.3)
