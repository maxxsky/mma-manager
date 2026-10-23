# Knowledge: Fighter

> **Domain:** Fighter identity, lifecycle, progression, relationships
> **Audience:** AI agents implementing or modifying fighter-related features
> **Version:** 1.0

---

## 1 — Purpose

Fighter is the central entity of MMA Manager. Every system orbits around fighters: Training improves them, Combat tests them, World produces opponents for them, Economy funds them, Events tell stories about them. A fighter is not a data structure — a fighter is a career, a personality, and a story waiting to unfold.

This document teaches AI how to think about Fighter as the game's core entity. It does not document fields, functions, or APIs. It documents identity, lifecycle, relationships, and the design philosophy that governs every decision about fighters.

---

## 2 — Fighter Philosophy

### Fighter is the player's product and attachment point

Fighters are what the player builds. Unlike coaches (who are tools) or facilities (which are infrastructure), fighters carry emotional weight. The player watches them grow, struggles through their losses, celebrates their championships, and mourns their decline. Every feature that touches fighters must respect this attachment.

### Every fighter is a story

A randomly generated fighter with 50 striking and 40 wrestling is forgettable. A fighter who was scouted as a raw prospect, trained for two years, survived a career-threatening injury, and won the title in a 5-round war is memorable. The systems around Fighter must provide the raw material for these stories — not script them, but create the conditions where they emerge naturally.

### Fighters are not interchangeable

Two fighters with identical stats but different archetypes, traits, and histories should feel different. The game should reward players who know their fighters as individuals — who remember that their BJJ specialist struggles against wrestlers, or that their aging striker needs careful matchmaking to protect his chin.

### Player agency over fighter destiny

The player should feel responsible for fighter outcomes. A fighter who succeeds should feel like a product of the player's good decisions. A fighter who flames out should feel like a consequence of poor management, not random bad luck. The system should enable agency, not override it.

---

## 3 — Design Goals

- **Every fighter is unique** — archetype, traits, ceilings, and generated history combine to create distinct individuals.
- **Early decisions echo through a career** — scouting a prospect, choosing their first training program, matching them against the right opponents — these shape the fighter's entire trajectory.
- **Progression is visible and satisfying** — the player should see their fighters improve over time, not just through numbers but through results.
- **Decline is bittersweet, not punitive** — aging fighters should fade gracefully, creating narrative moments (the veteran's last title shot) rather than frustration.
- **Fighter identity is expressed in combat** — a Wrestler should fight like a Wrestler, not just have a "wrestling" stat that's 10 points higher.
- **Fighters have relationships with each other** — teammates, rivals, mentors — that affect training, chemistry, and narrative.

---

## 4 — Non Goals

- **Not a detailed personality simulator** — fighters have traits and morale, but not complex emotional states or dialogue trees.
- **Not a character creator** — the player discovers and develops fighters; they do not design them from scratch.
- **Not a fighter database** — AI-generated fighters are the norm; hand-crafted fighters are possible but not the primary pipeline.
- **Not responsible for combat resolution** — Fighter provides the attributes that Combat reads, but does not decide how fights play out.
- **Not responsible for economic calculations** — Fighter has a contract value and generates revenue, but Economy decides the formulas.

---

## 5 — Responsibilities

### Fighter owns

- Identity (name, archetype, age, traits, personality indicators)
- Combat attributes (striking, wrestling, BJJ, strength, cardio, chin, footwork, fight IQ)
- Potential ceiling (maximum possible value per attribute)
- Career record (wins, losses, knockouts, submissions, decisions)
- Status flags (injured, booked, suspended, retiring)
- Titles and championship history
- Morale and popularity
- Training state (current program, intensity, overtraining level)
- Contract status (fights remaining, purse, expiry)
- Career timeline (debut, title wins, milestone moments)
- Relationships with other fighters (teammate bond, rivalry intensity)
- Weight class and weight class change history

### Fighter does NOT own

- Training growth calculation — owned by Training
- Fight simulation — owned by Combat
- Matchmaking decisions — owned by World / Fight Offers
- Contract generation — owned by Management
- Coach assignment — owned by Management
- Narrative generation — owned by Narrative / Events (reads fighter data)
- Economic impact — owned by Economy (reads fighter popularity and contract)

Fighter is the **subject** of these systems. They operate ON fighters, not WITHIN fighters.

---

## 6 — Mental Model

### Fighter as the Hub

```
                            ┌──────────────┐
                            │   TRAINING   │
                            │  (improves)  │
                            └──────┬───────┘
                                   │
                                   ▼
              ┌────────────────────────────────────┐
              │                                    │
   ┌──────────┴──────────┐              ┌──────────┴──────────┐
   │       ECONOMY       │──────────────│        WORLD        │
   │  (funds, generates  │    FIGHTER   │  (produces opponents │
   │   revenue)          │              │   and competitors)   │
   └─────────────────────┘              └─────────────────────┘
              │                                    │
              └──────────────┬─────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │    COMBAT      │
                    │   (tests)      │
                    └────────┬───────┘
                             │
                             ▼
                    ┌────────────────┐
                    │    EVENTS /    │
                    │   NARRATIVE    │
                    │ (tells stories) │
                    └────────────────┘
```

### Identity Dimensions

A fighter is defined by four overlapping dimensions, each contributing to how they feel in the game:

| Dimension | What It Determines | Examples |
|-----------|-------------------|----------|
| **Physical** | Combat capability and style | Striking 85, Wrestling 40, Chin 70 → a dangerous striker with a questionable chin |
| **Stylistic** | How they fight, matchups | Boxer, Wrestler, BJJ Specialist, Muay Thai, All-Rounder |
| **Personal** | Personality, morale, relationships | Iron Chin, Diva, Team Player, Warrior Spirit |
| **Historical** | What they've accomplished | 15-3 record, former champion, rivalry with Fighter X |

These dimensions interact. A physical striker with the "Warrior" trait fights differently from a physical striker with the "Cautious" trait. A fighter with a 15-3 record carries different weight into a fight than one with a 3-15 record.

### Thinking in Careers

AI should think about fighters in terms of their career arc, not their current state. A fighter is never just a snapshot of attributes — they are a trajectory.

```
Prospect ──► Contender ──► Champion ──► Veteran ──► Retired
   │              │            │            │            │
   ▼              ▼            ▼            ▼            ▼
Fast growth    Steady        Peak         Decline      Legacy
High ceiling   growth        performance  Attribute    Hall of Fame
Raw potential  Ranking       Title        decay        Historical
               climb         defenses     Mentoring    record
```

---

## 7 — Fighter Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                        FIGHTER LIFECYCLE                         │
│                                                                  │
│  GENERATION                                                      │
│  • Random or scouted                                             │
│  • Archetype, age, ceilings, traits assigned                     │
│  • Starting attributes rolled (below ceilings)                   │
│  • Personality indicators set                                    │
│                         │                                        │
│                         ▼                                        │
│  PROSPECT PHASE                                                 │
│  • Fast growth, high potential                                   │
│  • Training focuses on developing key attributes                 │
│  • Matchmaking protects the prospect (easier fights)             │
│  • Scout reports evaluate potential                              │
│                         │                                        │
│                         ▼                                        │
│  CONTENDER PHASE                                                 │
│  • Steady growth, attributes approaching ceilings                │
│  • Fights against ranked opponents                               │
│  • Ranking climb begins                                          │
│  • Reputation grows with wins                                    │
│                         │                                        │
│                         ▼                                        │
│  CHAMPION PHASE                                                  │
│  • Near or at ceiling — growth slows to minimal                  │
│  • Title fights, defenses, legacy accumulation                   │
│  • Higher stakes — losses cost the belt                          │
│  • Popularity peaks                                              │
│                         │                                        │
│                         ▼                                        │
│  VETERAN PHASE                                                   │
│  • Attribute decline begins (chin, cardio, strength first)       │
│  • Recovery takes longer, injury risk increases                  │
│  • Training shifts to maintenance rather than growth             │
│  • Mentoring younger fighters becomes valuable                   │
│                         │                                        │
│                         ▼                                        │
│  RETIREMENT                                                      │
│  • Fighter leaves the active roster                              │
│  • Legacy calculated from career achievements                    │
│  • Hall of Fame eligibility evaluated                            │
│  • May appear as coach or commentator (future feature)           │
└──────────────────────────────────────────────────────────────────┘
```

### Phase transitions are gradual

A fighter does not suddenly switch from "Contender" to "Champion" — the phases overlap. A champion who loses the belt is still in Champion phase but without the title. A veteran may still compete at a high level but with accelerating decline. The phases describe trajectory, not strict states.

---

## 8 — Business Rules

### Fighter Generation

Fighters enter the game through two primary channels: generation and scouting.

- **Generated fighters** populate divisions, rival camps, and the prospect pool. The World system creates them to maintain division health and provide opponents.
- **Scouted fighters** are discovered by the player through the Scout tab. They are hand-picked from a filtered pool, giving the player agency over which fighters enter their roster.

Both channels use the same generation logic. A generated fighter and a scouted fighter of the same tier should be indistinguishable in quality — the difference is that the player CHOSE to pursue the scouted one.

### Attributes and Ceilings

Every fighter has two sets of attribute values:

- **Current attributes** — what the fighter can do right now. These grow through Training.
- **Ceiling attributes** — the maximum the fighter can ever reach. These are set at generation and never change (except through very rare trait effects).

The gap between current and ceiling is the fighter's remaining potential. A prospect with 30 striking and 90 ceiling has massive room to grow. A veteran with 88 striking and 90 ceiling has almost maxed out.

### Archetype

Archetype is the fighter's fighting style. It determines:

- **Attribute emphasis at generation** — Boxers start with higher striking, Wrestlers with higher wrestling.
- **Combat behavior** — archetype affects exchange selection, matchup advantages, and commentary.
- **Training efficiency** — fighters gain attributes aligned with their archetype faster than opposing attributes.

Archetype is fixed at generation and does not change. A Boxer does not become a Wrestler. This creates stable fighter identity — you know what kind of fighter you're developing.

### Traits

Traits are modifiers that make a fighter distinct beyond their attributes. They can affect:

- Combat effectiveness (Iron Chin, Heavy Hands, Cardio Machine)
- Training behavior (Fast Learner, Gym Rat — slower overtraining accumulation)
- Morale and personality (Diva, Team Player, Warrior Spirit)
- Career events (Injury Prone, Comeback Kid)

Traits should feel impactful. A fighter with Iron Chin should noticeably survive strikes that would knock down a fighter without it. Weak or invisible traits are a waste of design space.

### Age and the Passage of Time

Age is the invisible force that shapes every career. It affects:

- **Growth rate** — young fighters improve faster
- **Peak window** — fighters reach their prime around late 20s to early 30s
- **Decline onset** — physical attributes begin to fade after the peak
- **Recovery speed** — older fighters heal slower from injuries
- **Retirement likelihood** — fighters past a certain age have increasing probability of retiring

Age is not just a number — it should feel like a real constraint that forces the player to plan ahead. A 35-year-old champion with declining chin is a ticking clock.

### Record and Streaks

A fighter's record is more than a tally. It generates:

- **Rankings** — win/loss ratio and quality of opponents determines ranking position
- **Reputation** — the camp's reputation is partially derived from fighter records
- **Momentum** — win streaks boost morale and popularity; loss streaks drain them
- **Matchmaking** — matchmakers (World/Fight Offers) use records to find appropriate opponents
- **Narrative** — undefeated streaks, comeback stories, and milestone wins generate events

### Weight Class

A fighter's weight class determines their division, opponents, and title eligibility. Weight class changes can occur:

- **Voluntary** — the player chooses to move a fighter up or down
- **Automatic** — the system may suggest or trigger a move based on performance or age
- **Champion moves** — a dominant champion may move up to chase a second belt

Weight class changes are significant decisions with lasting consequences — a fighter who moves up faces larger opponents; one who moves down faces a difficult weight cut.

### Popularity and Marketability

Popularity determines a fighter's drawing power. It affects:

- Fight purse offers
- Sponsor interest
- Main event vs prelim placement
- Fan reactions and commentary emphasis

Popularity grows with exciting wins (KOs, submissions), title fights, and win streaks. It decays with losses, inactivity, and boring decisions. A fighter can be dominant but unpopular (wrestling-heavy decision machine) or exciting but inconsistent (all-action brawler with mixed record).

### Morale

Morale is the fighter's mental state. It affects:

- Training effectiveness — low morale reduces gains
- Fight performance — morale translates to attribute multipliers in combat
- Behavior — very low morale may trigger events (contract disputes, retirement thoughts)

Morale drifts toward a neutral baseline over time. Positive events (wins, title shots, praise) temporarily boost it. Negative events (losses, injuries, being passed over) temporarily lower it. The player manages morale indirectly — through matchmaking, contract terms, and training decisions.

---

## 9 — Identity & Progression Philosophy

### Fighter identity is emergent

The goal is not for every fighter to feel hand-crafted. The goal is for the combination of archetype, traits, career events, and the player's own history with the fighter to create a sense of identity that feels organic. A fighter who was scouted as a raw BJJ prospect, developed slowly, won a title in a dramatic submission, and then defended it three times has a clear identity — even though every part of that identity emerged from systems.

### Archetype should feel real

A Wrestler should fight like a wrestler — takedowns, ground control, grinding pace. A Boxer should fight like a boxer — volume striking, footwork, head movement. If all archetypes play similarly in combat, the distinction is meaningless. The differences should be visible in commentary, in exchange selection, and in outcome patterns.

### Traits should change how you manage a fighter

A fighter with "Injury Prone" requires different management than one with "Iron Chin." The player should adjust training intensity, matchmaking, and recovery schedules around traits. If traits exist but don't affect player decisions, they are cosmetic rather than functional.

### Progression should feel like a journey

The player should remember key moments: "That was the fight where he won the belt" or "That was when he came back from the knee injury." These moments are generated by the interplay of the fighter's attributes, the opponent they faced, and the random variance in combat. The systems should create conditions where these moments are possible, not guaranteed.

### Decline should be visible and meaningful

When a fighter starts to decline, the player should see it coming. The attribute screen shows red numbers. The commentary mentions "he's lost a step." The fight results shift from decisive wins to close decisions. This creates dramatic tension — does the player squeeze one more title run out of their aging star, or transition them to a mentor role?

### Retirement is a conclusion, not a failure

Retirement should feel like completing a story. The Hall of Fame entry, the legacy score, the career highlights — these give the player a sense of closure and accomplishment. A fighter who retires at 38 after a long career should feel like a success, not like the player "lost" a roster spot.

---

## 10 — AI Decision Heuristics

When modifying or extending the fighter system, follow these heuristics.

### Fighters are not spreadsheets

Avoid adding attributes or metrics that the player has to track without clear payoff. Every number on the fighter screen should answer a question the player is actually asking: "How good is his chin?" — yes. "What is his calculated performance index?" — no.

### New attributes must earn their place

Adding a new combat attribute (e.g., "clinch work" or "elusiveness") creates ripple effects: generation logic must assign it, training must grow it, combat must read it, UI must display it, saves must migrate for it. Every new attribute should be justified by a clear gameplay need that existing attributes cannot serve.

### Traits are the preferred extension point

If you need to add fighter differentiation, reach for traits before attributes. A trait is lighter weight — it adds a modifier without adding a full attribute pipeline. A fighter with the "Knee Specialist" trait gets a clinch bonus without requiring every fighter to have a knees attribute.

### Identity should constrain, not just enable

A Boxer who can also wrestle at an elite level stops being a Boxer — they're an All-Rounder. Archetype should create real constraints. A Wrestler should never out-strike a Boxer of equal skill, and a Boxer should never out-grapple a BJJ specialist of equal skill. The archetype determines the ceiling for off-style attributes.

### Consider save compatibility

Any change to fighter data structure requires migration for existing saves. A player with a 50-hour save should not lose their fighters because a new attribute was added. Always design backward compatibility — new attributes default to a reasonable value for existing fighters.

### Age and time must remain meaningful

If training can offset aging decline, then age becomes cosmetic. The system should ensure that a 38-year-old fighter is genuinely worse than they were at 30, regardless of training investment. The decline should be inevitable — the player's choice is how to manage it, not whether to prevent it.

### Archetype balance is a full-system concern

If Wrestlers are underperforming, the fix may be in combat balance, not in fighter generation. Before adjusting Wrestler starting attributes, check: are Wrestlers losing because their attributes are too low, or because the combat system favors strikers? Fix the root cause, not the symptom.

---

## 11 — Extension Strategy

### Adding a new archetype

1. Define the archetype's identity — what makes it distinct from existing archetypes?
2. Assign attribute emphasis at generation — which attributes start higher?
3. Define matchup relationships — what is it strong against? weak against?
4. Implement combat behavior — exchange selection, commentary, trait interactions.
5. Ensure it doesn't overlap with an existing archetype — if it's 80% similar to Boxer, it should be a Boxer variant (via traits), not a new archetype.

### Adding a new attribute

1. Justify the need — what gameplay question does this attribute answer?
2. Add to generation logic — all fighters get a value and ceiling.
3. Add to training system — which programs grow it? at what rate?
4. Add to combat system — which exchange types read it? how does it affect outcomes?
5. Add to UI — fighter card, detail view, scouting report.
6. Plan save migration — existing fighters get a default value.

### Adding a new trait

1. Define the effect — what does this trait change about the fighter?
2. Determine visibility — should the player know about this trait? is it hidden until discovered?
3. Implement the modifier — where in the combat/training/economy pipeline does it apply?
4. Add acquisition logic — is it assigned at generation? earned through events? both?
5. Add commentary — traits should produce visible moments in combat and training.

### Adding a new phase to the fighter lifecycle

1. Define the phase — what distinguishes it from adjacent phases?
2. Determine triggers — what causes a fighter to enter and exit this phase?
3. Define mechanical effects — how does this phase change training, combat, or events?
4. Add narrative hooks — what stories does this phase enable?

### Adding fighter relationships

1. Define the relationship type — teammate bond, rivalry, mentorship, grudge.
2. Determine impact — where does this relationship affect gameplay? training quality? morale? combat? event generation?
3. Add generation/evolution logic — how do relationships form and change over time?
4. Surface to player — the player should see and care about fighter relationships.

---

## 12 — Invariants

These must never be violated. If a change breaks one, the change is wrong.

- **Every fighter has an archetype** — never null, never undefined. A fighter without an identity is a system bug.
- **Every fighter has age** — age must be a positive integer. Age affects growth, decline, and retirement.
- **Attributes never exceed ceilings** — `current ≤ ceiling` always. Training approaches but never surpasses natural potential.
- **Attributes never go below 5** — the minimum value for any attribute is clamped.
- **Ceilings are immutable after generation** — a fighter's potential does not change during their career (except through explicit, rare trait effects).
- **Every fighter belongs to exactly one weight class at a time** — a fighter cannot be in two divisions simultaneously.
- **Record is internally consistent** — `wins = ko + sub + dec`. Total losses ≥ losses by finish.
- **A fighter cannot fight themselves** — a fighter's opponent must be a different fighter.
- **A fighter cannot be both injured and booked to fight** — if injured, any booked fight must be cancelled or postponed.
- **Archetype does not change** — a Boxer remains a Boxer for their entire career.
- **Retired fighters are removed from active systems** — they do not train, fight, receive offers, or appear in rankings. They exist only in historical records.
- **Name is unique within the player's roster** — no two active fighters share the same name.

---

## 13 — Common Mistakes

### Treating fighters as interchangeable

Applying the same training program to all fighters regardless of archetype, age, or potential. A 22-year-old prospect with 90 ceiling should be trained differently from a 34-year-old veteran with declining attributes. The system should reward differentiated management, not one-size-fits-all optimization.

### Forgetting that fighters age

Adding new systems that don't account for fighter age. A training bonus that applies equally at age 20 and age 38 erases the meaning of age. Every new mechanic should consider: does this affect young and old fighters differently? If not, should it?

### Attribute inflation

Gradually raising the average attribute values through new bonuses (better coaches, better facilities, new training programs) without corresponding ceiling adjustments. Over time, all fighters trend toward 99 in everything, erasing differentiation. Every bonus source should be offset or should target specific attributes rather than global growth.

### Archetype homogenization

Allowing fighters to become equally proficient in all attributes erases archetype identity. A Boxer should never become an elite wrestler. The system should maintain archetype distinctiveness throughout a fighter's career, not just at generation.

### Ignoring save migration

Adding a new fighter property without providing a migration path for existing saves. A player loading a 100-hour save should not see errors or missing data. Every new fighter field needs a default value and a migration strategy.

### Overloading the fighter entity

Putting logic that belongs to other systems directly on the fighter. Training growth should be in the Training system, not a method on Fighter. Combat behavior should be in the Combat system. The fighter entity should carry data, not logic.

### Making retirement feel random

If fighters retire at arbitrary times without warning, it feels unfair. Retirement should be predictable — the player should see it coming (declining attributes, increasing injury frequency, age) and have time to plan. A sudden random retirement of a 30-year-old champion breaks immersion.

---

## 14 — Related Documents

| Document | What It Covers |
|----------|---------------|
| `PROJECT_CONSTITUTION.md` | Priority order, DoD, modification rules |
| `01_PROJECT_OVERVIEW.md` | High-level systems map, data flow |
| `02_ARCHITECTURE.md` | Layer rules, communication, ADRs |
| `knowledge/01_combat.md` | Combat domain — consumes fighter attributes |
| `knowledge/02_TRAINING.md` | Training domain — grows fighter attributes |
| `knowledge/04_economy.md` (planned) | Economy domain — funds fighter contracts |
| `knowledge/05_world.md` (planned) | World domain — generates AI fighters |
| `engine/fighter.js` | Fighter generation and scouting logic |
| `engine/data/archetypes.js` | Archetype definitions |
| `engine/data/traits.js` | Trait definitions |
| `engine/data/attributes.js` | Attribute definitions and labels |
| `engine/career.js` | Career milestone and legacy tracking |
| `engine/rankings.js` | Division and P4P rankings |
