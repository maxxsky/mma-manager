# 📦 MMA Manager — Content Depth Audit

> **Date:** 2026-07-10  
> **Scope:** All game content — archetypes, traits, ambitions, coaches, sponsors, events, tiers, training  
> **Method:** Cataloged from data files, engine code, and UI components

---

## 1. FIGHTER ARCHETYPES — 5

| Archetype | Strengths | Weaknesses | Playstyle |
|-----------|-----------|------------|-----------|
| **Boxer** | Striking 1.22, Footwork 1.18 | Wrestling 1.05, BJJ 0.80 | Stand-up striker, keeps distance |
| **Muay Thai** | Clinch 1.15, Striking 1.08 | BJJ 0.80, Cardio 0.90 | Clinch specialist, knees & elbows |
| **Wrestler** | Wrestling 1.18, Strength 1.00 | Striking 0.75, Footwork 0.80 | Takedown → top control |
| **BJJ Specialist** | BJJ 1.15, FightIQ 1.05 | Striking 0.70, Footwork 0.80 | Submission hunter from any position |
| **All-Rounder** | FightIQ 1.10, all stats 1.00 | No extreme strengths | Adaptable, no hard counters |

**Variety: Moderate.** 5 archetypes cover the MMA spectrum (striker, clinch, wrestler, grappler, hybrid). The 19-entry matchup table provides rock-paper-scissors dynamics.

**Overlap:** Boxer and Muay Thai both favor striking but differ in clinch. Wrestler and BJJ Specialist both favor grappling but differ in finish method.

**Underrepresented:** No pure "Cardio Machine" archetype. No "Power Puncher" (high strength, low technique). No "Counter Striker."

**Systems consuming:** Fight engine (`fight.js` — `effAttr`, `matchupMods`, `pickExchange`), fighter generation, scouting, rankings.

---

## 2. TRAITS — 12

### Combat (4)
| Trait | Effect |
|-------|--------|
| Iron Chin | +8 chin |
| Glass Jaw | -10 chin |
| Warrior | +15% damage when losing on scorecards |
| Explosive | +15% output R1, -15% R3+ |

### Development (4)
| Trait | Effect |
|-------|--------|
| Natural Talent | +15% training speed |
| Grinder | Flat training ceiling (never slows) |
| Iron Will | -4 morale on loss (instead of -14) |
| Cautious | -15% injury risk, -15% finish probability |

### Personality (4)
| Trait | Effect |
|-------|--------|
| Diva | Chemistry -1/month, early renegotiation |
| Team Player | Chemistry +1/month |
| Crowd Favorite | 2× popularity gain |
| Showboat | +5 popularity per finish, -5% defense |

**Variety: Good.** 12 traits across 3 domains with 3 conflict pairs create meaningful diversity. Each fighter gets 2 traits → 66 possible combinations (minus 3 forbidden pairs = ~54 valid).

**Overlap:** Minimal by design — conflict pairs prevent stacking. Grinder (trait) and Grinder (ambition) share a name but are different mechanics. Warrior and Iron Will both relate to adversity but from different angles (combat vs morale).

**Underrepresented:** No "Injury Resistant" trait (beyond Cautious' injury reduction). No "Fast Learner" beyond Natural Talent. No "Late Bloomer" (reverse age curve).

**Systems consuming:** Fight engine, training, chemistry, contract, popularity, injury.

---

## 3. AMBITIONS — 6

| Ambition | Effect |
|----------|--------|
| **Belt Chaser** | +Morale when ranked, -Morale when unranked with 4+ wins |
| **Paycheck** | +Morale after every fight |
| **Legacy** | +Morale when beating ranked opponents, 45-70% weight class change chance |
| **Family Man** | Max 3 fights/year (morale penalty beyond), 50% move-down chance on lose streak |
| **Grinder** | -25% overtraining accumulation |
| **Star Power** | +50% popularity gain, -2 morale/week when popularity <30 |

**Variety: Good.** 6 ambitions with distinct incentives. Belt Chaser and Legacy push toward titles. Paycheck and Family Man create schedule management. Grinder enables harder training. Star Power rewards marketability.

**Overlap:** None. Each ambition fills a distinct motivational niche.

**Underrepresented:** No "Undefeated" ambition (obsessed with 0 in loss column). No "Finisher" ambition (prioritizes KO/Sub over decision). No "Mentor" ambition (wants to train others).

**Systems consuming:** Morale, popularity, weight class changes, training, contract.

---

## 4. COACH PERSONALITIES — 4

| Personality | Effect |
|-------------|--------|
| **Motivator** | +20% morale recovery after loss |
| **Technician** | +10% technical training (striking/bjj/footwork/fightIQ) |
| **Disciplinarian** | -25% overtraining, -15% injury risk |
| **Player's Coach** | +2 chemistry/month, +15% popularity gain |

**Variety: Moderate.** 4 personalities cover morale, training quality, discipline, and chemistry. Each coach has one personality.

**Overlap:** None. Distinct niches.

**Underrepresented:** No "Strategist" (fight plan bonus). No "Scout" (better prospect reports). No "Conditioning Expert" (cardio-specific).

**Systems consuming:** Training bonuses, chemistry, morale, popularity, injury.

---

## 5. COACH SPECIALTIES — 5

| Specialty | Affected Training |
|-----------|------------------|
| Striking | Striking, Footwork |
| Wrestling | Wrestling |
| BJJ | BJJ |
| S&C | Strength, Cardio |
| Head | All (generalist) |

**Variety: Adequate.** Maps to the 8 attributes through 5 specialties. Head coach is a generalist.

**Overlap:** S&C covers 2 attributes. Head covers all but less efficiently.

**Systems consuming:** Training (`coachBonus()` — +3% per skill level for matching specialty).

---

## 6. EVENT TYPES — ~21

### Camp Events (5)
Sparring conflict, coach raise, jealousy, viral, team bonding — 30% weekly chance

### Contract Events (5)
Duration expiry, fight commitment, renegotiation, release request, retirement — conditional

### Fight-Related (3)
Career milestones, rivalries, giant killer — per-fight

### Sponsor (1)
Monthly offers — 8% per brand

### World Events (4)
AI title defenses, prospect breakthroughs, win streaks, retirements — monthly/yearly

### Tier Events (10)
2 per camp tier — equipment, media, collaborations, walk-ins, investors

### Weight Class (2)
Move up, move down — conditional

**Variety: Good.** ~21 distinct event types across 7 categories. Enough to avoid obvious repetition in a single playthrough.

**Redundant:** Camp chemistry events recycle the same 5 types indefinitely. After 50+ weeks, all variants have been seen.

**Systems consuming:** Inbox, chemistry, morale, cash, contract, roster, reputation.

---

## 7. SPONSOR BRANDS — 6

| Brand | Type | Base Rate | Rep Req | Mechanic |
|-------|------|-----------|---------|----------|
| FightFist Gear | Apparel | $200 | 10 | +50% per win |
| Bloodline Wear | Apparel | $150 | 20 | +100% per win |
| Titan Nutrition | Supplement | $300 | 15 | +30% per popularity |
| PureFuel Labs | Supplement | $250 | 25 | +50% per popularity |
| HypeTracker Pro | Tech | $400 | 30 | +20% both |
| ArenaVision | Tech | $350 | 40 | +100% when main card |

**Variety: Low.** 6 brands across 3 types (Apparel, Supplement, Tech). The pool is exhausted quickly. After 6 sponsors, everything repeats.

**Redundant:** FightFist vs Bloodline — same mechanic, different numbers. Titan vs PureFuel — same.

**Underrepresented:** No "Equipment" sponsor (facility discount). No "Local" sponsors (small but early). No "International" mega-sponsors.

**Systems consuming:** Monthly income, sponsorship slots (max 3).

---

## 8. CAMP TIERS — 5

| Tier | Rep | Cost | Roster | Coaches | Train Bonus |
|------|-----|------|--------|---------|-------------|
| Local Gym | 0 | $0 | 4 | 1 | 0% |
| Regional Camp | 15 | $25K | 6 | 2 | 5% |
| National Center | 35 | $60K | 8 | 3 | 10% |
| Elite Factory | 55 | $120K | 10 | 4 | 15% |
| World-Class | 75 | $250K | 14 | 5 | 22% |

**Variety: Adequate.** 5 tiers with clear progression. Each doubles capabilities from the previous.

**Systems consuming:** Roster cap, coach cap, facility max levels, training bonus, fight offer quality, sponsor availability, World event pool.

---

## 9. FACILITIES — 4

| Facility | Effect |
|----------|--------|
| Training Mats | +6% striking/wrestling training per level |
| Boxing Ring | +6% footwork/striking per level |
| Weight Room | +6% strength/cardio per level |
| Medical Room | -5% injury cost, -5% injury risk per level |

**Variety: Adequate.** 4 facilities cover all training attributes + medical.

**Systems consuming:** Training bonuses, injury system, cash (upgrade costs).

---

## 10. TRAINING PROGRAMS — 6

| Program | Cost | Gains |
|---------|------|-------|
| Striking | $500 | Striking, Footwork |
| Grappling | $500 | Wrestling, BJJ |
| S&C | $300 | Strength, Cardio |
| Sparring | $800 | FightIQ, Striking, Wrestling |
| Recovery | $100 | None (heals OT, boosts morale) |
| Fight Camp | $1000 | FightIQ, Cardio, Striking, Wrestling |

**Intensity:** Light (0.6×), Medium (1.0×), Hard (1.4×)

**Variety: Good.** 6 programs × 3 intensities = 18 training configurations. Sufficient depth for meaningful specialization.

**Systems consuming:** Attribute growth, overtraining, injury risk, cash.

---

## 11. GAME PLANS — 4

| Plan | Effect |
|------|--------|
| Take It Down | +18% takedown chance |
| Keep It Standing | +Striking focus, sprawl |
| Finish It | 1.3× stamina drain, 1.5× KD chance |
| Survive & Outpoint | 0.75× stamina drain, +defense |

**Variety: Adequate.** 4 plans map to archetypes. Wrestler → Take It Down. Boxer → Keep It Standing. BJJ → Finish It. All-Rounder → flexible.

**Systems consuming:** Fight engine (`simRound`).

---

## 12. FIGHT ATTITUDES — 3

| Attitude | Effect |
|----------|--------|
| Respectful | +5% footwork, +2 popularity |
| Professional | Neutral, +2 rep on win |
| Trash Talk | +8% striking (opponent +5%), +5 popularity, lose penalty |

**Variety: Low.** Only 3 options. Professional is the safe default. Trash Talk has meaningful risk/reward. Respectful is slightly better than Professional.

**Systems consuming:** Fight engine (prep modifiers), popularity, reputation.

---

## 13. CONTENT SUMMARY

| Category | Count | Variety | Redundancy | Systems |
|----------|-------|---------|------------|---------|
| Archetypes | 5 | Moderate | Low | Fight, generation |
| Traits | 12 | Good | Low (conflict pairs) | Fight, training, chemistry, contract, popularity, injury |
| Ambitions | 6 | Good | Minimal | Morale, popularity, weight class, training |
| Coach Personalities | 4 | Moderate | Minimal | Training, morale, chemistry, injury |
| Coach Specialties | 5 | Adequate | Low | Training |
| Event Types | ~21 | Good | Camp events repeat | Inbox, chemistry, morale, cash, contract |
| Sponsor Brands | 6 | Low | High (pairs identical) | Income |
| Camp Tiers | 5 | Adequate | Minimal | Everything |
| Facilities | 4 | Adequate | Low | Training, injury |
| Training Programs | 6 | Good | Low | Attributes |
| Game Plans | 4 | Adequate | Low | Fight engine |
| Fight Attitudes | 3 | Low | Minimal | Fight, popularity |
| Regions | 8 | Good | Low | Fighter generation |
| Weight Classes | 8 | Adequate | Low | Rankings, fights |
| Coach Names | 10 | Adequate | Low | Coach generation |

---

## 14. VARIETY BY GAME PHASE

### Early Game (Weeks 1-50)

**Available content:**
- 2-4 fighters (starter roster)
- 1-2 coaches
- Tier 0-1 events (equipment, local media)
- Local/Regional fight offers
- Budget/Regional scout methods
- 1-2 sponsor slots
- 4-6 roster capacity

**Variety: Good.** Everything is new. First encounters with each event type. Discovery phase.

### Mid Game (Weeks 50-150)

**Available content:**
- 6-10 fighters
- 3-4 coaches
- Tier 2-3 events (brand deals, prospect walk-ins)
- National/Major fight offers
- National/Diamond scout methods
- 3 sponsor slots filled
- 8-10 roster capacity

**Variety: Moderate.** Camp chemistry events start repeating. Sponsor pool exhausted. Training patterns established. Still discovering higher-tier content.

### Late Game (Weeks 150+)

**Available content:**
- 10-14 fighters
- 4-5 coaches
- Tier 4 events (national media, investors)
- Premier/Major title defenses
- Diamond scout only (best ROI)
- 3 sponsors maxed
- 14 roster capacity

**Variety: Low.** All content discovered. Camp events are the same 5 types on loop. Sponsors fully cycled. Training is optimization, not discovery. Only new content comes from fighter generation (random name/archetype/trait combos).

---

## 15. REPLAYABILITY

### What Creates Variety Between Runs

| Source | Impact |
|--------|--------|
| Random fighter generation (archetype, traits, ambitions, ceilings) | High — different roster composition each run |
| Trait combinations (54 valid pairs) | Moderate — changes how each fighter develops |
| Coach market randomness (specialty, skill, personality) | Moderate — different training priorities |
| Fight outcomes (RNG-driven simulation) | Moderate — different career arcs |
| Event RNG (which events fire when) | Low — same pool, different timing |
| World simulation (AI title changes) | Low — cosmetic only |

### What Stays the Same

| Element | Why It's Static |
|---------|----------------|
| Camp tier progression | Same 5 tiers, same requirements |
| Sponsor pool | 6 brands, same mechanics |
| Training programs | Same 6 options, same costs |
| Event types | Same 21 events |
| Game plans | Same 4 options |
| Facility upgrades | Same 4 facilities |

**Replayability Score: B**

The content is sufficient for **2-3 distinct playthroughs** where the player explores different fighter archetypes, trait combinations, and camp strategies. Beyond that, the static content pool (sponsors, events, tiers, facilities) provides diminishing novelty. The procedural fighter generation is the primary source of variety — but it operates within a fixed content framework.

The game's replayability comes from **system depth** (how fighters develop differently based on traits/ambitions) rather than **content breadth** (how many different things exist). This is appropriate for a simulation game, but limits the number of truly distinct campaigns.
