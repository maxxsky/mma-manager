# 🎮 MMA Manager — Player Experience Audit

> **Date:** 2026-07-10  
> **Scope:** First 10 hours of gameplay from a fresh start  
> **Method:** Simulated new player experience through each screen, decision point, and system

---

## 1. FIRST 30 MINUTES

### 1.1 What the Player Sees

The game loads to the **Dashboard**. The player sees:

- **TopBar**: "Dashboard", Y1·M1·W1, Bank $35.0K, Rep 8, Chem 60, Legacy ★0.0K
- **Sidebar**: IRONFIST branding, 8 nav items (Dashboard, Roster, Rankings, Scout, Inbox, Finance, Facility, Rivals), Advance Week button
- **KPI Strip**: 4 cards — "Next fight" (—), "Pending offers" (0), "Net / month" (+$0), "Roster" (2)
- **Priorities**: Empty — "All clear"
- **Upcoming Fights**: Empty
- **Camp Feed**: "Camp dibuka. Budget awal $35,000."

**Confusion points:**
- "What do I do first?" — No guidance, no tutorial, no highlighted action
- "What does Chemistry mean?" — Number displayed with no explanation
- "Why is Net / month $0?" — Financial system is opaque
- "How do I get a fight?" — No inbox offers visible

### 1.2 First Actions

The player will likely click around the sidebar navigation:

**Roster tab:** Shows 2 fighters with full attribute grids (8 columns), OVR, Status, Condition bars. **Information overload.** 8 attributes × 2 fighters = 16 numbers, plus morale/overtraining bars, archetype colors, record. No explanation of what any attribute does.

**Scout tab:** Shows scouting network with grade, 4 scout methods ($50-$10,000), archetype/weight class filters. "What is this for? Do I need it now?"

**Rankings tab:** Shows 8 weight class divisions with full ranking tables. "There are 15 ranked fighters in every division? I have 2 fighters. This is overwhelming."

**Finance tab:** Shows monthly cash flow breakdown — income, expenses, cash reserve, runway, loan section. "I have no income. What am I supposed to do?"

### 1.3 The First Click That Matters

The player eventually clicks **"Advance Week"** in the sidebar. The week advances. They see:

- Camp feed updates
- Maybe a fight offer appears in Inbox
- Training costs deducted from cash

**This is the core loop discovery moment.** But it took 5-15 minutes of wandering to find it.

---

## 2. FIRST HOUR

### 2.1 The First Fight

Around week 3-6, a fight offer arrives in the Inbox. The player sees:

- **Fight Offer card**: Fighter name VS opponent name, tier, purse, accept/counter/reject buttons
- No explanation of tiers, purses, or consequences

**The player accepts.** FightNight launches:

- **Staredown**: 3 attitude choices (Respectful/Professional/Trash Talk) with stats shown. Player picks one without understanding the combat impact.
- **Weigh-in**: Tale of the Tape with CompareBar showing all 8 attributes side-by-side. **Visual overload.** Player skims and clicks through.
- **Game Plan**: 4 options with descriptions. Player picks one that sounds cool.
- **Ring the Bell**: Fight begins.
- **Round commentary**: Text scrolls describing the fight. Player reads along.
- **Corner**: Timer counting down, 3 strategy choices. Player panics and clicks one.
- **Result**: Win or loss.

**Exciting moment:** The fight itself. The round-by-round commentary and corner timer create tension. Even without understanding the mechanics, the drama is engaging.

**Confusing moment:** After the fight, the player returns to Dashboard. "What changed? Did my fighter improve? What do I do now?"

### 2.2 Discovery of Training

After the first fight, the player explores fighter detail:

- Clicks a fighter name in Roster
- Sees the full FighterDetail: identity header, AttrTele bars with ceiling ticks, OctaRadar, training panel, profile, contract, fight history
- **Training panel**: 6 program buttons + 3 intensity buttons. "What should I pick?"

**The player picks something at random.** They don't understand the trade-offs between programs, or that Fight Camp is auto-assigned when booked.

### 2.3 First Financial Stress

By week 8-10, cash has dropped to ~$25-28K from training costs and coach salary. The player notices the cash number going down.

**"Am I going bankrupt? What happens if I run out of money?"**

This creates genuine tension — but the bankruptcy threshold is -$50,000, which the player doesn't know. They may panic unnecessarily.

### 2.4 First Injury

Around week 10-15, a fighter gets injured. The player sees:

- Roster status changes to "Injured"
- Medical costs start deducting
- Fighter can't train or fight

**"How long will this last? Can I speed up recovery? Is this fighter ruined?"**

No explanation of injury tiers, recovery times, or long-term consequences.

---

## 3. EARLY GAME PROGRESSION (Hours 2-5)

### 3.1 The Reputation Gate

The player discovers they need reputation to:
- Upgrade camp tier (rep 15 for Regional)
- Get better fight offers
- Unlock sponsors
- Access higher scout tiers

**"How do I get reputation?"** — Fight wins. Each Regional win gives +2 rep. Need ~4 wins to reach rep 15. At 1 fight per 6-8 weeks, that's ~24-32 weeks of gameplay.

### 3.2 First Scout

Around week 15-20, the player has enough cash ($5-15K saved) to try scouting:

- Sends a Regional scout ($500)
- Gets a prospect with a grade C or B report
- Sees attribute estimates (letters, not numbers), potential stars, traits, ambition
- **"Is this fighter good? The report says 'C' for striking but I don't know what that means."**

The player may sign the prospect or let them expire. If they sign, they now have 3 fighters and need to manage training for all of them.

### 3.3 First Title Shot

Around week 40-60, a fighter may get a title eliminator or title fight offer:

- The offer appears in Inbox with a special gold border
- "🏆 NATIONAL TITLE FIGHT" or similar
- Larger purse than normal fights

**Exciting moment.** The player accepts and experiences the highest-stakes fight yet. Winning feels meaningful. Losing feels like a major setback.

### 3.4 Feature Unlock Timeline

| Week | Feature | How Discovered |
|------|---------|---------------|
| 1 | Dashboard, Roster, Rankings | Immediate |
| 1 | Training (FighterDetail) | Exploring Roster |
| 3-6 | First fight offer | Inbox notification |
| 3-6 | FightNight | Accepting fight |
| 8-10 | Financial pressure | Noticing cash decline |
| 10-15 | First injury | Training incident |
| 15-20 | Scouting | Exploring Scout tab |
| 15-20 | Contract negotiation | Signing prospect |
| 20-30 | Chemistry events | Inbox (sparring conflict, coach raise, etc.) |
| 30-40 | Sponsor offers | Inbox (rep 10+) |
| 30-40 | Facility upgrades | Facility tab (when cash available) |
| 40-50 | Camp tier upgrade | Facility tab (rep 15+) |
| 40-60 | First title fight | Inbox offer |
| 60-80 | Retirement threat | Age 36+ yearly check |
| 80+ | Rival camps | Rivals tab |
| 100+ | World events, AI title changes | Inbox notifications |

---

## 4. LEARNING CURVE

### 4.1 What's Intuitive

| System | Why It's Easy |
|--------|--------------|
| **FightNight** | Linear flow (staredown → weigh-in → fight → result) |
| **Accepting fights** | Clear accept/counter/reject buttons |
| **Training program selection** | Buttons with clear labels (Striking, Grappling, S&C) |
| **Advance Week** | Big prominent button |
| **Roster view** | Table format is familiar |

### 4.2 What's Confusing

| System | Why It's Hard |
|--------|--------------|
| **Chemistry** | Number on TopBar, no explanation of what it affects |
| **Reputation** | Number on TopBar, gates everything but never explained |
| **Training multipliers** | 11 stacked multipliers — impossible to intuit |
| **Attribute ceilings** | AttrTele shows ceiling ticks but doesn't explain them |
| **Overtraining** | Condition bar in Roster, no explanation of consequences |
| **Popularity** | No clear explanation of what it does or how to raise it |
| **Promoter relationships** | Hidden system that affects counter offers |
| **Scout grades** | Letter grades without explanation of accuracy loss |
| **Weight class system** | 8 divisions with 15 fighters each — overwhelming |
| **Contract terms** | Cut %, fights, duration — all meaningful but opaque |

### 4.3 Cognitive Load by Screen

| Screen | Data Points | Interactivity | Load |
|--------|------------|--------------|------|
| Dashboard | ~25 | Medium (click KPIs, priorities) | Medium |
| Roster | ~80 (attributes × fighters) | High (click fighter, training) | **High** |
| FighterDetail | ~50 | Very High (training, contract) | **Very High** |
| Rankings | ~200 (8 divisions × 15 × stats) | Medium (tab selection) | **Overwhelming** |
| Scout | ~30 | High (filters, methods, prospects) | High |
| Finance | ~40 | Low (view only) | Medium |
| FightNight | ~15 per stage | Very High (timed decisions) | Medium (staged) |
| Inbox | ~10 per message | High (accept/counter/reject) | Medium |

---

## 5. PLAYER MOTIVATION LOOP

### 5.1 The Core Loop

```
Advance Week → Check Inbox → Accept Fight → FightNight → Win/Lose
     ↑                                                         ↓
     └──── Train Fighters ← Check Results ← Update Record ←────┘
```

### 5.2 What Drives the Player Forward

| Driver | Strength | Duration |
|--------|----------|----------|
| **Curiosity** ("What's in the next tab?") | High | First 30 min |
| **Progression** ("Can I win the next fight?") | Very High | First 5 hours |
| **Mastery** ("Can I optimize training?") | Medium | Hours 5-20 |
| **Collection** ("Can I build the perfect roster?") | Medium | Hours 10-30 |
| **Narrative** ("What happens to my fighters?") | Low | Throughout |
| **Achievement** ("Can I win a title?") | High | First title win |
| **Sandbox** ("What if I try X?") | Low | Late game |

### 5.3 First Meaningful Achievement

**Winning the first fight** happens around week 4-8. The player sees:
- Fighter record changes to 1-0
- Popularity increases
- Cash increases from the purse
- Camp feed shows the win

**This is the hook.** The dopamine hit of winning a fight, combined with seeing the fighter's stats improve through training, creates the core motivation.

### 5.4 First Major Setback

**Losing a title fight** or **having a fighter get a career-threatening injury** are the first major setbacks. These happen around week 30-60.

The player feels genuine loss — they invested weeks of training and saw the fighter develop, only to lose. **This is the game's most powerful emotional moment.**

---

## 6. LONG-TERM ENGAGEMENT LOOP

### 6.1 What Keeps Players Playing

| Loop | Description | Retention Power |
|------|-------------|----------------|
| **Fighter development** | Watching attributes grow week by week | High (weeks 1-50) |
| **Title chase** | Regional → National → Minor → Major → Premier | High (weeks 20-100) |
| **Camp building** | Upgrading tiers, hiring coaches, expanding facilities | Medium (weeks 30-80) |
| **New prospects** | Scouting and developing the next generation | Medium (weeks 50-150) |
| **Legacy building** | Accumulating legacy points, win streaks, title defenses | Low (emerges late) |
| **World simulation** | AI title changes, division dynamics | Low (background) |

### 6.2 When Players May Quit

| Moment | Why | Week Range |
|--------|-----|------------|
| **First 5 minutes** | "What do I do?" — no guidance | Week 1 |
| **After first loss** | "This game is unfair" — fighter development isn't visible yet | Week 5-10 |
| **Financial stress** | "I'm going bankrupt" — misunderstanding the threshold | Week 8-12 |
| **After first title win** | "Now what?" — no next clear goal | Week 60-100 |
| **Repetition fatigue** | Same events, same sponsors, same fights | Week 100+ |
| **Late-game boredom** | Infinite cash, no challenge | Week 150+ |

---

## 7. CONFUSING VS EXCITING VS SLOW MOMENTS

### Confusing Moments 😕

1. **First load** — no guidance, 8 tabs, no highlighted action
2. **Roster attribute grid** — 8 columns of numbers without context
3. **Rankings page** — 120 fighters across 8 divisions
4. **Training multipliers** — hidden system players never fully understand
5. **Chemistry explanation** — number on screen, effects invisible
6. **Injury consequences** — no forecast of recovery time or long-term impact
7. **Scout report letters** — C/B/A/S without stat translation

### Exciting Moments 🎉

1. **First fight** — FightNight is genuinely engaging
2. **First win** — Record updates, popularity rises, cash arrives
3. **First KO** — Dramatic finish with "It's over!" screen
4. **First title fight** — Higher stakes, bigger purse, special presentation
5. **First title win** — "👑 MAJOR WORLD CHAMPION" message
6. **Close fight** — Split decision, comeback KO — the combat drama works
7. **Prospect signing** — Finding a S-grade prospect feels like discovering treasure

### Slow Moments 🐌

1. **Weeks 1-3** — Waiting for first fight offer
2. **Injury recovery** — 8-20 weeks of no training, no fights
3. **Between title fights** — 24+ weeks for mandatory defense
4. **Late-game routine** — Training → Fight → Repeat with no novelty
5. **Scout waiting** — 12 weeks of prospect watching with no action
6. **Cash accumulation** — After week 100, money loses meaning

---

## 8. TUTORIAL REQUIREMENTS

The game has **zero tutorial**. A new player must discover everything through exploration.

**What a tutorial would need to cover (minimum):**

| Topic | Priority | Why |
|-------|----------|-----|
| Advance Week button | Critical | Core game loop is invisible otherwise |
| Training assignment | Critical | Fighters don't improve without it |
| Accepting fights | Critical | Main source of income and progression |
| Scout → Sign → Train pipeline | High | Replacement fighters come from here |
| Chemistry effects | Medium | Affects training but player can ignore |
| Reputation gates | Medium | Player will wonder why they can't upgrade |
| Overtraining management | Medium | Player may accidentally injure fighters |
| Facility benefits | Low | Can be discovered through exploration |
| Contract negotiation | Low | First contract is far in the future |

---

## 9. OVERALL EXPERIENCE GRADE

| Phase | Grade | Notes |
|-------|-------|-------|
| First 30 min | **D** | No guidance, overwhelming, player may quit |
| First hour | **C+** | First fight redeems the confusion somewhat |
| Hours 2-5 | **B** | Core loop clicks, progression feels meaningful |
| Hours 5-10 | **B+** | Systems interconnect, strategy emerges |
| Hours 10-30 | **B+** | Title chase is engaging, camp building is satisfying |
| Hours 30-100 | **C+** | Repetition sets in, late-game balance breaks |
| Hours 100+ | **C-** | Novelty exhausted, cash infinite, AI trivial |

**The game's biggest weakness is the first 30 minutes.** A player who doesn't click the right tabs or advance the week may never discover the core loop. **The game's biggest strength is the first 10 hours after that** — the progression arc from unknown fighter to champion is genuinely compelling.

The experience is **carried by FightNight** — the combat drama, round-by-round tension, and corner decisions create emotional investment that papers over the opaque systems underneath.
