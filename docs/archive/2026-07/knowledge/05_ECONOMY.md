# Knowledge: Economy

> **Domain:** Cash flow, revenue, expenses, contracts, sponsors, financial progression
> **Audience:** AI agents implementing or modifying economy features
> **Version:** 1.0

---

## 1 — Purpose

Economy is the resource management layer of MMA Manager. Every decision the player makes — hiring a coach, upgrading a facility, signing a fighter, accepting a fight — has a financial dimension. Economy tracks the flow of money through the camp, ensuring that income and expenses are visible, predictable, and consequential.

Economy is not an accounting system. It is a game system designed to create meaningful financial trade-offs. The player should feel the weight of every dollar spent and the relief of every dollar earned. Money enables progression but does not guarantee it — a rich camp with poor management should still fail.

---

## 2 — Economy Philosophy

### Money is a strategic resource, not a score

Cash exists to be spent. Hoarding money is a valid short-term strategy (saving for a big upgrade or a top-tier coach), but money that sits idle is money not working for the camp. The system should encourage investment over accumulation — the best use of cash is always putting it back into fighters, coaches, or facilities.

### Every dollar has a cause

No money should appear or disappear without the player being able to trace why. Revenue comes from identifiable sources (fight purses, sponsors, events). Expenses go to identifiable costs (salaries, maintenance, training). Hidden fees, unexplained windfalls, or silent deductions break the player's ability to plan financially.

### Financial pressure creates meaningful decisions

A camp with unlimited money has no interesting economic decisions. The player should regularly face choices: hire the expensive coach or upgrade the facility? Sign the expensive free agent or develop the cheap prospect? Accept the risky high-purse fight or the safe low-purse fight? These trade-offs are where the game's depth lives.

### Rich camps still need good management

A wealthy camp should not be immune to financial consequences. Poor decisions (overpaying declining fighters, neglecting sponsors, letting facilities decay) should drain even a large treasury over time. Financial success should be maintained, not achieved once and forgotten.

---

## 3 — Design Goals

- **Cash flow is visible** — the player always knows their income, expenses, and net position.
- **Revenue is tied to performance** — winning fights, building popularity, and maintaining reputation generates more money.
- **Expenses scale with ambition** — a bigger camp with elite fighters and world-class coaches costs proportionally more to run.
- **Sponsors provide strategic variety** — different sponsors offer different trade-offs (steady income vs performance bonuses).
- **Financial planning is rewarded** — players who manage their cash flow well can afford better investments and weather downturns.
- **Bankruptcy is possible but avoidable** — running out of money is a real threat but the player always has options (cut costs, accept any fight, seek sponsors).
- **No exponential snowballing** — income should grow with the camp, not outpace it. The gap between a local camp and a world-class camp should narrow, not widen indefinitely.

---

## 4 — Design Principles

These principles govern every economic design decision:

| Principle | Meaning |
|-----------|---------|
| **Single Source of Truth** | The camp's cash balance is the only number that matters. Derived metrics (projected income, burn rate) are informative but not authoritative. |
| **Deterministic** | Given the same inputs, financial calculations produce the same outputs. No random windfalls, no hidden RNG in settlement. |
| **Predictable** | The player should be able to forecast their financial position. Income and expenses are known in advance — the uncertainty is in fight outcomes and sponsor decisions. |
| **Observable** | Every financial change is surfaced to the player. The weekly summary shows what happened. The finance tab shows detailed breakdowns. Nothing happens silently. |
| **Incremental** | Financial changes happen in steps, not jumps. A sponsor doesn't double their payout overnight. A facility upgrade increases costs predictably. |
| **No Hidden Money** | No invisible income sources. No undocumented expense lines. The player's cash balance always equals: previous balance + visible income − visible expenses. |
| **Every Currency Movement Has A Cause** | If cash changed, something happened. The cause must be identifiable, explainable, and traceable back to a game system. |

---

## 5 — Non Goals

- **Not a stock market** — the player does not invest in abstract financial instruments.
- **Not a tycoon game** — economy supports the MMA management fantasy, not replaces it.
- **Not an accounting simulation** — precision matters for balance, but the player interface is simplified.
- **Not responsible for fight purses** — Economy processes purses but does not set them. Matchmaking and contracts determine purse values.
- **Not responsible for coach skill** — Economy pays coaches but does not determine their effectiveness.
- **Not a profit-maximization puzzle** — the optimal economic strategy should be "invest in your camp," not "exploit a loophole for infinite money."

---

## 6 — Responsibilities

### Economy owns

- Camp cash balance (the single source of truth for financial state)
- Revenue calculation (all income sources aggregated)
- Expense calculation (all cost sources aggregated)
- Monthly settlement (income minus expenses, applied to balance)
- Sponsor management (income, terms, expiry, renewal)
- Facility maintenance costs
- Coach and fighter salary processing
- Financial reporting (weekly summary, monthly breakdown)
- Bankruptcy detection and consequences

### Economy does NOT own

- Fighter contract negotiation — owned by Contract/Management
- Fight purse determination — owned by Matchmaking/Fight Offers
- Coach hiring/firing decisions — owned by Management
- Facility construction/upgrade decisions — owned by Management
- Sponsor offer generation — owned by Events/Inbox
- Sponsor brand definitions — owned by Game Data
- Training costs — owned by Training (Economy processes the cost, Training determines the amount)

---

## 7 — Mental Model

### The Money Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                        MONEY PIPELINE                           │
│                                                                 │
│  INCOME SOURCES                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐       │
│  │  Fight   │ │ Sponsor  │ │  Event   │ │ Merchandise  │       │
│  │ Purses   │ │ Payments │ │ Bonuses  │ │  (popularity)│       │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬───────┘       │
│       │             │            │               │               │
│       └─────────────┼────────────┼───────────────┘               │
│                     │            │                               │
│                     ▼            ▼                               │
│              ┌──────────────────────┐                            │
│              │    CAMP TREASURY     │                            │
│              │    (cash balance)    │                            │
│              └──────────┬───────────┘                            │
│                         │                                       │
│       ┌─────────────────┼─────────────────┐                     │
│       │                 │                 │                      │
│       ▼                 ▼                 ▼                      │
│  ┌──────────┐    ┌──────────┐     ┌──────────────┐              │
│  │  Coach   │    │ Fighter  │     │   Facility   │              │
│  │ Salaries │    │ Salaries │     │ Maintenance  │              │
│  └──────────┘    └──────────┘     └──────────────┘              │
│                                                                 │
│  EXPENSE CATEGORIES                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Thinking in Flows, Not Balances

AI should think about economy in terms of **flows** (income streams, expense streams) rather than **balances** (the number in the treasury). The balance is the result of flows. When adding a new economic feature, ask:

- What flow does this create? (income or expense?)
- What determines the flow's magnitude?
- How does the flow change over time?
- Is the flow visible to the player?

A feature that silently adds $500/month to income is invisible and undermines economic tension. A feature that adds $500/month with a clear source (new sponsor, better merchandise) and a clear cost (reputation requirement, contract obligation) creates meaningful gameplay.

---

## 8 — System Relationships

### Reads (Economy observes)

| System | What Economy Reads | Purpose |
|--------|-------------------|---------|
| **Fighter** | Popularity, contract value, fight results, record | Calculate fight revenue, merchandise income, salary obligations |
| **Coach** | Skill level, salary, contract status | Calculate payroll obligations |
| **Facility** | Level of each facility type | Calculate maintenance costs |
| **Sponsor** | Active sponsors, rates, terms | Calculate sponsor income, track expiry |
| **Camp** | Reputation, tier, chemistry | Determine baseline income and cost modifiers |
| **World** | Week counter | Detect monthly settlement timing |

### Updates (Economy modifies)

| System | What Economy Changes | When |
|--------|---------------------|------|
| **Camp Treasury** | Cash balance | Every settlement (monthly) |
| **Sponsor** | Weeks remaining on contract | Every settlement |
| **Log** | Financial summary entries | Every settlement |
| **Events** | Financial event data | When thresholds are crossed |

### Triggers (Economy initiates)

| Trigger | What Happens | When |
|---------|-------------|------|
| **Monthly Settlement** | All income collected, all expenses paid, balance updated | Every 4 weeks |
| **Sponsor Expiry** | Expired sponsor removed, notification sent | When weeks remaining reaches 0 |
| **Bankruptcy Warning** | Alert sent to player | When cash falls below safety threshold |
| **Bankruptcy** | Game over or severe consequences | When cash ≤ 0 and no assets to liquidate |

---

## 9 — Economy Lifecycle

The monthly settlement cycle is the heartbeat of the economy. Here is the conceptual flow:

```
┌──────────────────────────────────────────────────────────────────┐
│                    MONTHLY SETTLEMENT CYCLE                       │
│                    (every 4 weeks)                                │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 1: CALCULATE REVENUE                               │    │
│  │                                                          │    │
│  │  Base Sponsor Income                                     │    │
│  │  • Default sponsor pays baseline rate                    │    │
│  │  • Based on camp reputation                              │    │
│  │         │                                                │    │
│  │         ▼                                                │    │
│  │  Multi-Sponsor Income                                    │    │
│  │  • Each active sponsor contributes                       │    │
│  │  • Royalty sponsors: bonus from wins + popularity        │    │
│  │  • Fixed sponsors: flat monthly rate                     │    │
│  │         │                                                │    │
│  │         ▼                                                │    │
│  │  Fighter Popularity Revenue                              │    │
│  │  • Each fighter generates income based on popularity     │    │
│  │  • Popular fighters = merchandise, appearances, media    │    │
│  │         │                                                │    │
│  │         ▼                                                │    │
│  │  Fight Purses (fights in the last month)                 │    │
│  │  • Win bonuses, performance bonuses                      │    │
│  │  • Title fight bonuses                                   │    │
│  │                                                          │    │
│  │  TOTAL REVENUE = sum of all income sources               │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 2: CALCULATE EXPENSES                              │    │
│  │                                                          │    │
│  │  Coach Salaries                                          │    │
│  │  • Each active coach costs their salary                  │    │
│  │  • Injured/free coaches may not cost (if not working)    │    │
│  │         │                                                │    │
│  │         ▼                                                │    │
│  │  Fighter Salaries                                        │    │
│  │  • Each fighter with a contract costs their salary       │    │
│  │  • Based on contract terms                               │    │
│  │         │                                                │    │
│  │         ▼                                                │    │
│  │  Facility Maintenance                                    │    │
│  │  • Each facility level has a maintenance cost            │    │
│  │  • Higher levels = higher maintenance                   │    │
│  │  • Based on total facility value                         │    │
│  │         │                                                │    │
│  │         ▼                                                │    │
│  │  Training Costs                                          │    │
│  │  • Each fighter's training program has a weekly cost     │    │
│  │  • Accumulated over the month                            │    │
│  │                                                          │    │
│  │  TOTAL EXPENSES = sum of all cost sources                │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 3: SETTLEMENT                                      │    │
│  │                                                          │    │
│  │  Net Income = Total Revenue − Total Expenses             │    │
│  │         │                                                │    │
│  │         ▼                                                │    │
│  │  Cash Balance += Net Income                              │    │
│  │         │                                                │    │
│  │         ▼                                                │    │
│  │  Sponsor Contract Countdown                              │    │
│  │  • Reduce weeks remaining on each sponsor                │    │
│  │  • Remove expired sponsors                               │    │
│  │  • Notify player of expiring sponsors                    │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ PHASE 4: REPORTING                                       │    │
│  │                                                          │    │
│  │  Generate Financial Summary                              │    │
│  │  • Income breakdown (sponsors, fighters, purses)         │    │
│  │  • Expense breakdown (salaries, facilities, training)    │    │
│  │  • Net position (profit/loss)                            │    │
│  │  • Cash reserve warning if balance is low                │    │
│  │         │                                                │    │
│  │         ▼                                                │    │
│  │  Deliver to Log / UI                                     │    │
│  │  • Summary in weekly log                                 │    │
│  │  • Detailed view in Finance tab                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  SETTLEMENT COMPLETE — PLAYER SEES UPDATED FINANCIAL STATE        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10 — Business Rules

### Revenue Generation

Revenue comes from multiple sources, each scaling with different aspects of the camp:

| Source | Scales With | Nature |
|--------|------------|--------|
| **Base Sponsor** | Camp reputation | Reliable baseline — grows slowly with camp success |
| **Multi-Sponsors** | Sponsor brand, contract terms | Variable — strategic choice of sponsor type |
| **Fighter Popularity** | Individual fighter popularity | Fighter-specific — stars generate more |
| **Fight Purses** | Fight tier, opponent quality, title status | Performance-based — winning pays more |
| **Event Bonuses** | Special events, tournament wins | Occasional — exciting but unpredictable |

### Salary Payment

Salaries are the primary recurring expense:

- **Coach salaries** are fixed per coach based on their skill level. World-Class coaches cost significantly more than Local coaches.
- **Fighter salaries** are determined by their contract. Better fighters command higher salaries.
- Salaries are paid even if the coach/fighter is inactive (unless specific clauses apply — injured fighters may have reduced pay).
- Late or missed payments are not simulated — the camp always pays what it owes as long as it has cash.

### Contract Renewal

Fighter contracts have a limited number of fights. When a contract expires:

- The fighter becomes a free agent (leaves the camp unless re-signed).
- Re-signing costs are based on the fighter's current market value (record, popularity, titles).
- The player can choose to let a fighter walk rather than pay an inflated renewal.
- Contract negotiations are a separate system (owned by Contract), but Economy processes the financial outcome.

### Sponsor Income

Sponsors provide recurring income with strategic variety:

- **Fixed sponsors** pay a flat monthly rate. Reliable but lower upside.
- **Royalty sponsors** pay based on performance (wins, popularity). Higher potential but variable.
- **Tiered sponsors** pay different rates based on camp tier. Upgrade as the camp grows.
- Sponsors have contract durations. When a sponsor expires, the player must find a replacement or accept lower income.
- Maximum active sponsors is limited (typically 3). The player chooses which sponsors to keep.

### Facility Maintenance

Facilities cost money to maintain:

- Each facility level has a maintenance cost proportional to its construction cost.
- Maintenance is paid monthly regardless of usage.
- Neglecting facilities (not upgrading) has no penalty beyond missed bonus — but upgrading increases maintenance.
- The trade-off: better facilities → better training → more wins → more money → can afford better facilities.

### Training Costs

Training is not free:

- Each fighter's training program has a weekly cost.
- Fight camp (pre-fight intensive training) costs more than regular training.
- Recovery programs cost less but provide no growth.
- Training costs are deducted immediately (weekly) rather than at settlement (monthly).

### Cash Reserve and Bankruptcy

The camp must maintain positive cash flow over time:

- **Safety threshold**: a warning is issued when cash falls below a minimum reserve.
- **Negative cash flow**: if monthly expenses exceed income, the camp burns through reserves.
- **Bankruptcy**: when cash reaches zero and no assets can be liquidated, the game enters a crisis state. The player may be forced to cut costs, accept any fight, or face game over.
- **Recovery**: bankruptcy is not instant game over — the player gets warnings and opportunities to recover. But prolonged negative cash flow is unsustainable.

### Financial Scaling

The economy scales with camp progression:

- **Local camp** (Tier 1): low income, low expenses, tight margins. Every dollar matters.
- **Regional camp** (Tier 2-3): moderate income, moderate expenses. Some financial breathing room.
- **World-Class camp** (Tier 4): high income, high expenses. Large numbers but similar proportional pressure.
- The gap between income and expenses should narrow as the camp grows — a world-class camp should still feel financial pressure, just at a higher absolute scale.

---

## 11 — Economy Philosophy & Balance

### Money enables progression, does not guarantee it

Having money allows the player to hire better coaches, build better facilities, and sign better fighters. But money alone does not win fights. A rich camp with poor training decisions and bad matchmaking will lose to a poorer camp with smarter management.

### Every investment has opportunity cost

Spending $50,000 on a facility upgrade means $50,000 not available for a coach or a fighter contract. The player must prioritize. The system should make these trade-offs clear — not by telling the player what to do, but by making each option compelling for different reasons.

### Financial pressure creates interesting decisions

If the player always has enough money, financial decisions become trivial. The system should maintain enough pressure that the player regularly asks: "Can I afford this?" The pressure should come from competing demands (want all three: better coach, facility upgrade, and new fighter — can only afford two) rather than from arbitrary scarcity.

### Avoid inflation

If a facility upgrade costs $10,000 today, it should not cost $100,000 six months from now unless the camp's income has also increased proportionally. Inflation (rising costs without rising income) feels unfair. Deflation (rising income without rising costs) removes financial tension. The goal is stable purchasing power over time.

### Avoid exponential snowballing

The rich-get-richer problem: a successful camp generates more money, which buys better resources, which generates even more success, which generates even more money. Some snowballing is natural (success should be rewarded), but unlimited snowballing makes the game trivial after a certain point. Counter-forces include: rising costs at higher tiers, diminishing returns on investment, and competitive pressure from AI camps.

### Financial transparency builds trust

The player should never wonder "where did my money go?" Every settlement should provide a clear breakdown. If the player's balance dropped by $20,000, they should be able to trace exactly why — coach salaries, facility maintenance, training costs, etc. Hidden or unexplained costs erode trust in the entire economic system.

---

## 12 — AI Decision Heuristics

When modifying or extending the economy system, follow these heuristics.

### Don't create new money sources if existing systems suffice

Before adding a new revenue stream (merchandise, ticket sales, media deals), check if existing sources (sponsors, fight purses, fighter popularity) can be adjusted to achieve the same economic effect. Every new income source adds complexity to settlement and requires the player to learn a new system.

### Avoid passive income without trade-off

Income that requires no player decision and no player risk is passive. Passive income reduces financial pressure and makes economic decisions less meaningful. Every income source should be tied to something the player actively manages (sponsor relationships, fighter popularity, fight performance).

### Every economic bonus must have a cost

If a new feature provides a financial benefit (cost reduction, income boost), it should also introduce a cost (higher risk, higher maintenance, opportunity trade-off). A +$500/month bonus with no downside is inflation by another name.

### Use modifiers before new currency types

If the economy needs more variety, consider adding a modifier to existing income (e.g., "Sponsor income +10% for camps with 3+ champions") before creating an entirely new currency or income category. Modifiers are easier to balance, easier to surface to the player, and don't require new UI.

### Maintain long-term balance

When tuning economic values, simulate the effect over 100+ weeks, not just the immediate impact. A $100/week change seems small but compounds to $5,200/year — enough to significantly shift the player's financial position. Test at multiple camp tiers to ensure the change doesn't break early-game scarcity or late-game abundance.

### Prevent exploits, not optimization

The goal is not to prevent the player from finding efficient strategies — that's the fun of management games. The goal is to prevent degenerate strategies that produce infinite money, cost nothing, or bypass core gameplay loops. An exploit is a strategy that makes all other strategies irrelevant; optimization is a strategy that's slightly better than alternatives.

### Financial events should have narrative weight

A sponsor dropping the camp after a scandal, a fighter demanding a raise after a title win, a facility needing emergency repairs — these are narrative moments, not just ledger entries. When possible, economic changes should come with a story that the player can engage with.

---

## 13 — Extension Strategy

### Adding a sponsor

1. Define the sponsor's identity — brand, tier, personality.
2. Determine the payment model — fixed rate? royalty? performance bonus?
3. Set the contract duration — how long does the sponsorship last?
4. Define acquisition — how does the player get this sponsor? event? negotiation? automatic?
5. Balance the rate against existing sponsors — new sponsors should be sidegrades, not upgrades.

### Adding a revenue source

1. Justify the source — what gameplay does this revenue add that existing sources don't?
2. Determine the scaling factor — what stat or achievement determines the revenue amount?
3. Add to settlement — ensure it appears in the financial breakdown.
4. Surface to the player — the player should know this revenue exists and how to increase it.
5. Check balance at multiple tiers — does this source overwhelm others at high levels?

### Adding an expense

1. Identify the cost driver — what triggers this expense? (new mechanic, existing system)
2. Determine the magnitude — is it fixed or variable? one-time or recurring?
3. Add visibility — the player should see this expense coming, not be surprised by it.
4. Provide counter-play — can the player reduce or avoid this expense through decisions?
5. Ensure the expense creates interesting trade-offs, not just punishment.

### Adding a currency modifier

1. Define the modifier — what does it boost or reduce? by how much?
2. Determine the trigger — when does the modifier apply? permanently? conditionally?
3. Add UI visibility — the player should see that the modifier is active.
4. Balance the magnitude — small modifiers (5-10%) are safer than large ones (50%+).
5. Consider stacking — does this modifier combine with others? additive or multiplicative?

### Adding a financial mechanic

1. Define the mechanic's purpose — what gap does it fill?
2. Determine the timescale — when does it trigger? (weekly, monthly, yearly)
3. Identify affected systems — what reads this mechanic's output?
4. Add decision points — where does the player interact with this mechanic?
5. Test edge cases — what happens at zero cash? maximum cash? negative cash?

### Adding organization income

1. Define the organization — league, tournament, media deal.
2. Determine the payment structure — lump sum? recurring? performance-based?
3. Set eligibility — who qualifies for this income? all camps? only specific tiers?
4. Add competitive element — does this income create interesting dynamics between camps?
5. Ensure the income scales appropriately — should not trivialize other income sources.

---

## 14 — Invariants

These must never be violated. If a change breaks one, the change is wrong.

- **Cash balance is the single source of truth** — all financial calculations derive from and modify this one number. No secondary ledgers, no hidden accounts.
- **Income − Expenses = Net Change** — the settlement must balance. Unexplained discrepancies are bugs.
- **Every income source has an identifiable origin** — no money appears from nowhere. Every dollar added to the balance can be traced to a system (sponsor, fight purse, fighter popularity).
- **Every expense has an identifiable destination** — no money disappears without reason. Every dollar subtracted from the balance can be traced to a cost (salary, maintenance, training).
- **Cash never goes negative without triggering consequences** — reaching zero or below must produce a warning, event, or game state change. Silent bankruptcy is a bug.
- **Settlement runs exactly once per month** — no double-counting, no skipped months. The week counter modulo 4 is the gate.
- **Sponsor income is deterministic for a given camp state** — no random variation in sponsor payouts. Royalty calculations are formula-based, not RNG-based.
- **Coach and fighter salaries are known before settlement** — the player can see upcoming salary obligations and plan accordingly.
- **Facility maintenance is proportional to facility investment** — higher level facilities cost proportionally more to maintain. The ratio should be consistent across tiers.

---

## 15 — Common Mistakes

### Silent money changes

Adding a cost or income that isn't reported to the player. The balance changes but the log shows nothing. The player is left wondering where their money went. Every financial change must produce a visible entry.

### Double-counting settlement

Running settlement logic in multiple places (e.g., both in the monthly handler and in a separate system that also triggers monthly). The player gets charged twice. Settlement should have exactly one entry point.

### Sponsors as free money

Adding sponsors that provide income without any player decision, trade-off, or interaction. The sponsor just exists and pays. This is passive income that reduces financial pressure without adding gameplay.

### Costs that don't scale

A fixed $500 expense that feels meaningful at Tier 1 but is irrelevant at Tier 4. Costs should scale with the camp — either directly (percentage-based) or indirectly (the player naturally incurs more of them at higher tiers).

### Income that outscales costs

As the camp grows, income grows faster than expenses, leading to unlimited cash accumulation. The ratio of income to expenses should remain roughly stable across tiers — a Tier 4 camp should have more absolute cash but similar proportional pressure.

### Forgetting bankruptcy handling

Adding a new expense without considering what happens when the camp can't pay it. If a negative balance is possible, the system must handle it — warnings, grace periods, forced cost-cutting, or game over.

### Economic changes without long-term testing

Tuning a value based on how it feels at week 10 without simulating its effect at week 100. Small economic changes compound dramatically over time. A 5% income boost might feel fine for 20 weeks but create a cash surplus of hundreds of thousands after 100 weeks.

---

## 16 — Related Documents

| Document | What It Covers |
|----------|---------------|
| `PROJECT_CONSTITUTION.md` | Priority order, DoD, modification rules |
| `01_PROJECT_OVERVIEW.md` | High-level systems map, data flow |
| `02_ARCHITECTURE.md` | Layer rules, communication, ADRs |
| `knowledge/01_combat.md` | Combat domain — generates fight purses |
| `knowledge/02_TRAINING.md` | Training domain — generates training costs |
| `knowledge/03_FIGHTER.md` | Fighter identity — fighter popularity and contract value |
| `knowledge/04_WORLD.md` | World simulation — triggers monthly settlement |
| `engine/economy.js` | Economy calculations and settlement logic |
| `engine/tick/settlement.js` | Monthly settlement orchestration |
| `engine/finance.js` | Financial utility calculations |
| `engine/data/sponsors.js` | Sponsor brand definitions |
| `engine/reducer/camp.js` | Camp upgrades and financial decisions |
| `engine/reducer/contract.js` | Fighter contract management |
