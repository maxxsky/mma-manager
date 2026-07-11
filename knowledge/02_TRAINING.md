# Knowledge: Training

> **Domain:** Fighter development, attribute growth, overtraining, injury, coaching
> **Audience:** AI agents implementing or modifying training features
> **Version:** 1.0

---

## 1 — Purpose

Training is the engine of fighter progression. Between fights, fighters train to improve their attributes, recover from injuries, and prepare for upcoming bouts. The training system transforms the player's resource allocation decisions (which coach to hire, which program to assign, which facility to build) into measurable fighter growth over time.

Training is not a minigame. The player does not control individual drills or exercises. Instead, the player makes macro decisions (training program, intensity, coach assignment) and the engine handles growth calculation. The player sees results in attribute changes and internalizes the trade-offs — push hard for faster growth but risk injury, or train conservatively and stay healthy but improve slowly.

---

## 2 — Training Philosophy

### Purpose in the game

Training provides the primary link between resource management and combat performance. The player invests cash (coaches, facilities) and attention (program selection, intensity decisions) to improve fighters. The payoff comes in combat — a well-trained fighter outperforms a neglected one.

### Risk/reward is the core loop

Every training decision is a trade-off. High intensity yields faster growth but increases overtraining and injury risk. Fight camp prepares for a specific opponent but is more expensive. The system must make these trade-offs visible and meaningful to the player.

### Progression should feel earned

A fighter gaining 5 points in striking over 20 weeks feels like work paying off. A fighter gaining 5 points in 2 weeks feels like a system bug. Progression is calibrated to reward consistency — a fighter who trains regularly for months should noticeably outpace one who trains sporadically.

### Not a spreadsheet optimization

The system should not reward min-maxing to the point where players feel compelled to run calculations. Broad strategies should work. The best strategy should be situationally dependent, not mathematically solvable to a single optimal approach.

---

## 3 — Design Goals

- **All training programs remain viable** — striking, wrestling, BJJ, conditioning, and recovery should each have legitimate use cases.
- **Intensity levels have clear trade-offs** — Light (safe, slow growth), Medium (balanced), Hard (fast growth, high risk).
- **Coaches meaningfully impact progression** — hiring a World-Class coach should feel different from hiring a Local coach.
- **Facilities reward investment** — upgrading mats, ring, weights, and medical creates a tangible return.
- **Overtraining is a real threat** — pushing fighters too hard reliably produces consequences (injury, morale loss, attribute decay).
- **Recovery is a legitimate program, not a penalty** — fighters need downtime, and the system should make this feel strategic rather than wasteful.

---

## 4 — Non Goals

- **Not a micro-management simulator** — the player does not schedule individual training sessions or select specific exercises.
- **Not a combat system** — training determines what a fighter CAN do; combat determines what they ACTUALLY do.
- **Not an economy system** — training costs money, but the economic implications are owned by Economy/Settlement.
- **Not a narrative system** — training can trigger events (injury, morale shift), but the storytelling is owned by Events/Narrative.
- **Not responsible for coach personality** — coach flavor, relationships, and rivalry are owned by Identity/World.

---

## 5 — Responsibilities

### Training owns

- Fighter attribute growth (per-week gains based on program, intensity, coaches, facilities)
- Overtraining accumulation and decay
- Injury generation (random + overtraining-induced)
- Injury recovery and attribute decay during injury
- Morale drift (natural regression toward baseline)
- Sparring quality (roster composition affects training effectiveness)
- Training history (tracking what each fighter has trained for narrative context)
- Coach assignment constraints (how many fighters a coach can effectively train)

### Training does NOT own

- Coach hiring/firing — owned by Management (reducer/coach.js)
- Facility construction/upgrade — owned by Management (reducer/camp.js)
- Fight camp game plan — owned by Combat (fight preparation)
- Post-fight recovery — fighters auto-heal after fights, but this is Combat's concern
- Coach skill growth — owned by Settlement (monthly coach progression)
- Training-related events (coach conflict, breakthrough) — owned by Events

---

## 6 — Mental Model

### The Training Pipeline

```
Player Decision           Engine Process               Visible Result
─────────────────         ──────────────               ───────────────
Set program               Calculate base gains
Set intensity       →     Apply coach bonus       →    Attribute changes
Hire coaches              Apply facility bonus         Overtraining meter
Build facilities          Check injury risk            Injury status
                          Apply attention constraint   Morale changes
```

### Thinking in Trade-offs

AI should think about training as a system of interconnected trade-offs, not isolated calculations:

- **Growth vs Safety**: Hard training grows faster but risks injury. Light training is safe but slow.
- **Specialization vs Versatility**: Focusing on one attribute (striking) creates specialists but leaves gaps (wrestling defense). Training broadly creates well-rounded fighters but takes longer to reach elite levels.
- **Investment vs Return**: Coaches and facilities cost money. The return is better fighters who win more fights and generate more revenue.
- **Short-term vs Long-term**: Fight camp prepares for the next fight but may cause overtraining that hurts future performance.
- **Individual vs Team**: Attention constraint means spreading coaches too thin hurts everyone. Concentrating on stars creates champions but neglects prospects.

---

## 7 — Training Lifecycle

```
                        ┌─────────────────────┐
                        │   WEEKLY TICK        │
                        │   (Space / advance)  │
                        └──────────┬──────────┘
                                   │
                    ┌──────────────▼──────────────┐
                    │      PER FIGHTER LOOP        │
                    │                              │
                    │  ┌──────────────────────┐    │
                    │  │ Injured?             │    │
                    │  │  YES → Recover       │    │
                    │  │  NO  → Continue      │    │
                    │  └──────────────────────┘    │
                    │                              │
                    │  ┌──────────────────────┐    │
                    │  │ Booked (fight camp)? │    │
                    │  │  YES → Camp program  │    │
                    │  │  NO  → Normal program │    │
                    │  └──────────────────────┘    │
                    │                              │
                    │  ┌──────────────────────┐    │
                    │  │ Apply:               │    │
                    │  │  • Program gains     │    │
                    │  │  • Intensity factor  │    │
                    │  │  • Coach bonus       │    │
                    │  │  • Facility bonus    │    │
                    │  │  • Sparring quality  │    │
                    │  │  • Attention factor  │    │
                    │  └──────────────────────┘    │
                    │                              │
                    │  ┌──────────────────────┐    │
                    │  │ Overtraining check:  │    │
                    │  │  Accumulate / Decay  │    │
                    │  │  Injury risk roll    │    │
                    │  └──────────────────────┘    │
                    │                              │
                    │  ┌──────────────────────┐    │
                    │  │ Morale drift          │    │
                    │  │ Chemistry bonus       │    │
                    │  └──────────────────────┘    │
                    └──────────────────────────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │   RESULT             │
                        │   Attributes ±       │
                        │   Overtraining ±     │
                        │   Injury (maybe)     │
                        │   Morale ±           │
                        └─────────────────────┘
```

---

## 8 — Business Rules

### Training Program Selection

A fighter's training program determines which attributes grow. The program is selected by the player from a fixed set: striking focus, wrestling focus, BJJ focus, conditioning, and recovery. Fighters with a booked fight automatically switch to fight camp mode in the final weeks before the bout.

### Intensity Levels

Intensity is a multiplier on growth rate and risk. Light intensity is safe but produces minimal gains. Medium is the baseline. Hard intensity accelerates growth but accelerates overtraining and increases injury probability. The system makes no judgment about which intensity is "correct" — it simply applies the consequences.

### Overtraining

Overtraining accumulates when a fighter trains at Medium or Hard intensity. It decays during recovery or Light training. When overtraining exceeds a threshold, the fighter is at risk of injury. The risk scales with overtraining level — a fighter at 80% overtraining faces significantly higher risk than one at 40%.

### Injury

Injuries can occur randomly or as a consequence of overtraining. An injured fighter cannot train, cannot fight, and may lose attributes during extended recovery. Medical facilities reduce recovery time and cost. The severity (tier) of an injury determines recovery duration and attribute decay.

### Coach Bonus

Each coach has a skill level (Local, Regional, National, World-Class) that provides a multiplier to training effectiveness. Coach specialty (Striking Coach, Wrestling Coach) provides additional bonus to specific attributes. A fighter benefits from the best available coach who is not already at capacity.

### Facility Bonus

Facility levels (mats, ring, weights, medical) provide passive bonuses. Mats help grappling training. Ring helps striking training. Weights help strength training. Medical helps injury recovery time and cost. These bonuses stack multiplicatively or additively with coach bonuses — the design intent is that a well-equipped camp trains fighters noticeably faster.

### Attention Constraint

Coaches have limited capacity. If there are more active fighters than available coaches, training effectiveness is reduced. This creates a soft roster cap — the player can have many fighters, but training quality degrades without enough coaches.

### Chemistry Factor

Camp chemistry affects training. High chemistry (fighters get along, few conflicts) provides a training bonus. Low chemistry (internal tension, personality clashes) provides a penalty. This connects training outcomes to the camp management layer.

### Sparring Quality

Fighters benefit from training alongside other fighters. The quality of sparring partners depends on the roster composition — having a diverse roster with different archetypes provides better sparring across all styles.

---

## 9 — Progression Philosophy

### The shape of progression

Progression should follow a curve, not a line:

- **Early career (Young fighter, low stats)**: Relatively fast growth. A raw prospect can improve dramatically in their first year.
- **Mid career (Peak age, moderate stats)**: Steady, reliable growth. Improvement requires consistent work.
- **Late career (Veteran, high stats)**: Slow growth, diminishing returns. The last few points from 85 to 90 are much harder than the first few from 20 to 25.
- **Post-prime (Aging, declining)**: Growth stops, attributes begin to naturally decay. No amount of training can reverse the effects of age.

This progression shape means:

- Investing in young prospects pays off over time → incentive for scouting and development.
- Elite fighters are rare and valuable → incentive to protect and manage them carefully.
- Aging creates narrative — the old champion losing a step, the veteran making one last run.

### Ceilings and Potential

Every fighter has a natural ceiling — a maximum potential for each attribute determined at generation. Training can take a fighter TO that ceiling but never PAST it. This creates fighter identity — some fighters will never be elite strikers regardless of training, which forces strategic decisions about which fighters to develop in which directions.

### Diminishing returns near ceiling

As a fighter approaches their ceiling in an attribute, growth slows. The last few points require significantly more training investment. This encourages diversification — once a fighter reaches 90 striking, further gains are slow, so it may be more efficient to train other attributes.

### Rate calibration

The current calibration aims for approximately 2-4 attribute points per month for a fighter training at Medium intensity with decent coaches and facilities. This means a fighter can meaningfully improve over a 2-3 year career arc without becoming overpowered too quickly. This calibration is a guideline, not a hard rule — it should feel right, not be mathematically perfect.

---

## 10 — AI Decision Heuristics

When modifying or extending the training system, follow these heuristics.

### Use existing modifiers before adding new ones

Before adding a new training bonus source, check if an existing modifier (coach, facility, chemistry, sparring) can cover the need. Every new modifier source adds complexity to the weekly tick, increases balancing surface area, and requires the player to learn a new system.

### Growth should never be negative without cause

A fighter on a normal training program with no injuries should always improve, even if slowly. Negative growth should only occur from: injury, overtraining consequences, aging decline, or intentional player decisions (recovery week). The default state is forward progress.

### Overtraining should be visible

Players should see overtraining coming before it hits. The UI should show an overtraining meter, warn when it approaches dangerous levels, and make the relationship between intensity choices and overtraining accumulation clear. A fighter who suddenly gets injured from 0% to 100% overtraining feels unfair. A fighter who creeps from 60% to 80% to injury feels like a consequence of player choices.

### Recovery should feel strategic

Recovery weeks should not feel like "wasted time." They should feel like a deliberate investment — trading a week of growth now for higher growth later (because an injured fighter gains nothing). The messaging should frame recovery as smart training management, not a penalty.

### Avoid trap choices

A training program that is always worse than another across all dimensions is a trap choice. Every program should have a legitimate scenario where it is the best pick. If striking training is worse than BJJ training under all circumstances, it needs to be buffed or BJJ needs to be nerfed — but the goal is to make the choice situational, not solved.

### Consider the full loop

Training does not exist in isolation. Changes to training affect:

- **Combat** — stronger fighters win more fights, shift balance
- **Economy** — faster growth means fighters peak sooner, reducing coach/facility investment needs
- **World** — player fighters outpace AI fighters faster, shifting competitive balance
- **Narrative** — faster growth shortens career arcs, reducing story potential

---

## 11 — Extension Strategy

### Adding a new training program

When adding a new program (e.g., "Mental Toughness" or "Explosiveness"):

1. Define what attributes the program affects and at what ratio.
2. Determine cost relative to existing programs — should it be more expensive than conditioning but cheaper than fight camp?
3. Consider intensity interactions — does it behave differently at Light/Medium/Hard?
4. Ensure it has a clear use case that existing programs don't cover.
5. Update the training selection UI to accommodate the new option.

### Adding a new coach type

When adding a new coaching specialty:

1. Define which attributes or programs the specialty boosts.
2. Determine the magnitude — should it be comparable to existing specialties or fill a specific niche?
3. Consider how it interacts with coach skill level — a World-Class version should be meaningfully better than Local.
4. Ensure the coach generation system can produce this type.

### Adding a new facility

When adding a new facility type:

1. Define the bonus — flat value? percentage? threshold unlock?
2. Determine upgrade tiers and costs — should follow existing facility scaling.
3. Identify which training aspects it affects — be specific about scope.
4. Consider interaction — does it stack with other facilities? with coach bonuses?

### Adding a new progression mechanic

When adding a mechanic that affects how fighters grow:

1. Identify the gap — what problem does this mechanic solve that existing systems (programs, coaches, facilities, sparring) don't?
2. Minimize new state — can this mechanic work with existing fighter properties, or does it require new data?
3. Consider save compatibility — new fighter properties require migration for existing saves.
4. Test the full loop — does this mechanic interact correctly with overtraining, injury, coaching, and combat?

### Adding training-related events

Training can generate events that surface outcomes to the player:

1. Breakthrough events — a fighter suddenly improves in an attribute beyond normal gains.
2. Coach conflict — personality clashes that affect training quality.
3. Training camp narratives — stories about a fighter's preparation for a big fight.

These are owned by the Events system, not Training, but Training provides the data (overtraining levels, attribute progression, coach assignments) that event generators read.

---

## 12 — Invariants

These must never be violated. If a change breaks one, the change is wrong.

- **Attributes never exceed their ceiling** — `attrs[k] ≤ ceilings[k]` always. Training can approach but never surpass natural potential.
- **Attributes never go below 5** — the minimum attribute value is clamped.
- **Overtraining never exceeds 100** — clamped at the upper bound.
- **Overtraining never goes below 0** — clamped at the lower bound.
- **Morale never goes below 0 or above 100** — clamped.
- **Injured fighters never train** — the injury check happens first, and injured fighters skip the training loop entirely.
- **Injured fighters never fight** — fight offers are not generated for injured fighters, and booked fights are cancelled if injury occurs.
- **Recovery program always reduces overtraining** — never increases it. Recovery is a safe choice by design.
- **Every active fighter receives exactly one training tick per week** — no fighter gets double growth, no fighter gets skipped without a reason (injury, suspension).
- **Training cost is always deducted** — regardless of outcome, the program cost is paid. The player pays for the attempt, not the result.
- **Fight camp program is only active when a fighter is booked** — if a fighter is not booked, they cannot use fight camp.
- **Growth rate is never zero for a healthy fighter on a non-recovery program** — even minimal growth must occur. Zero growth breaks the player's sense of progression.

---

## 13 — Common Mistakes

### Forgetting the injury check gate

The most common training bug is allowing an injured fighter to train. The injury check must always run first, before any training logic. An injured fighter who accidentally trains gains attributes while supposedly injured, and an injured fighter who accidentally gets a fight offer creates an impossible scenario.

### Overtraining creep

If overtraining accumulates faster than intended, fighters spend most of their time injured or recovering. This feels punitive. The system should produce a natural rhythm: train → overtraining rises → switch to recovery → overtraining falls → train again. If players are forced into constant recovery, the accumulation rate is too high.

### Coach bonus double-counting

When multiple coach types or facility levels stack, ensure bonuses are combined correctly. A common bug is applying a coach bonus twice (once as coach bonus, once as facility bonus) or applying facility tiers multiplicatively when they should be additive.

### Zero-roster edge case

The training system should handle an empty roster gracefully. If the player has zero fighters (new game start during onboarding, or all fighters fired), the training tick should simply return with no effect — not crash, not log errors, not produce NaN values.

### Attention constraint at zero

If `activeFighters` is zero (all fighters injured), the attention constraint calculation should return 1.0 (no penalty), not divide by zero. This is a common edge case in the coach-to-fighter ratio calculation.

### Morale drift direction

Morale naturally drifts toward a baseline value (around 60). The drift direction should be: low morale drifts up, high morale drifts down. A common bug is reversing this — morale below baseline drifting further down, creating a death spiral for already-unhappy fighters.

### Sparring with yourself

A fighter should never spar with themselves. The sparring partner selection must exclude the fighter's own ID. If the roster has only one fighter, sparring quality should default to 1.0 (no bonus, no penalty), not error out.

---

## 14 — Related Documents

| Document | What It Covers |
|----------|---------------|
| `PROJECT_CONSTITUTION.md` | Priority order, DoD, modification rules |
| `01_PROJECT_OVERVIEW.md` | High-level systems map, data flow |
| `02_ARCHITECTURE.md` | Layer rules, communication, ADRs |
| `knowledge/01_combat.md` | Combat domain — consumes training output |
| `knowledge/03_world.md` (planned) | World simulation, AI fighter progression |
| `knowledge/04_economy.md` (planned) | Economy domain — funds training costs |
| `engine/tick/training.js` | Training tick implementation |
| `engine/data/training.js` | Training program and intensity definitions |
| `engine/economy.js` | Coach and facility bonus calculations |
| `engine/career.js` | Mentor bonus calculation for sparring |
