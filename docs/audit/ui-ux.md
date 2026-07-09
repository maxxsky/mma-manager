# 🖥️ MMA Manager — UI/UX Audit

> **Date:** 2026-07-10  
> **Scope:** Complete player interface — navigation, dashboard, camp management, fighter detail, fight flow, information design  
> **Method:** Evaluated every screen from a first-time and experienced player perspective

---

## 1. NAVIGATION

### 1.1 Main Navigation (Sidebar)

**Structure:** 8 primary nav items + 2 secondary (Achievements, Dynasty) in a vertical sidebar.

```
IRONFIST
Fight Management
─────────────────
🏠 Dashboard
👥 Roster
📊 Rankings
🔍 Scout
📨 Inbox
💰 Finance
🏗️ Facility
⚔️ Rivals
🏆 Achievements
🏛️ Dynasty
─────────────────
▶ Advance Week
```

**Strengths:**
- Active item has amber accent bar + filled background — immediate visual feedback
- Inbox shows unread count badge (ember red) — attention-grabbing
- "Advance Week" is the most prominent button (ember gradient with glow)
- Brand identity ("IRONFIST") is strong and recognizable

**Weaknesses:**
- 10 nav items is a lot for a new player. 8 primary + 2 secondary = cognitive overload
- No grouping or section headers to organize the items
- "Facility" and "Rivals" are the least-used tabs but have equal visual weight
- No indication of which tabs are "system" tabs vs "content" tabs
- "Advance Week" is labeled as a button but is the most important action in the game — it could be more central

### 1.2 Top Bar

**Structure:** Title + breadcrumb | Date (Y·M·W) | KPI chips (Bank, Rep, Chem, Legacy) | Save slot + Language + New Game

**Strengths:**
- KPI chips provide persistent awareness of key metrics
- Date format (Y2·M10·W4) is clear and informative
- Sticky header remains visible during scroll
- Version number shown below title

**Weaknesses:**
- Save slot selector is tiny and easy to miss
- "+New" button (new game) is dangerously placed near frequently-used controls
- No obvious visual connection between the TopBar metrics and their corresponding tabs (Bank → Finance, Rep → Fight, Chem → Camp events)
- Title area is underutilized — could show contextual information

### 1.3 Information Architecture

```
Dashboard (home)
├── Roster → FighterDetail
│   ├── Attributes + OctaRadar
│   ├── Training panel
│   ├── Profile (traits, morale, popularity)
│   ├── Contract
│   └── Fight History
├── Rankings
│   ├── Division selector (chips)
│   ├── Champion banner
│   ├── Ranked table
│   ├── Outside Top 15
│   ├── Unranked
│   └── P4P Top 10
├── Scout
│   ├── Scouting Network (grade display)
│   ├── Archetype filter
│   ├── Weight class filter
│   ├── Scout methods (4 cards)
│   └── Prospects list
├── Inbox
│   ├── Fight offers
│   ├── Sponsor offers
│   └── Events
├── Finance
│   ├── P&L summary
│   ├── Cash reserve gauge
│   └── Income/Expense splits
├── Facility
│   ├── Coaching staff
│   └── Camp tier + Facilities
├── Rivals
└── FightNight (overlay)
```

**Depth:** Maximum 2 clicks from Dashboard to any actionable screen (Dashboard → Roster → FighterDetail). **Good.**

### 1.4 Navigation vs Natural Workflow

**Player's natural weekly workflow:**
1. Check Inbox (fight offers, events) → 2. Manage training → 3. Advance week → Repeat

**Current navigation supports this:** Inbox is mid-sidebar, Roster is second item, Advance Week is always visible.

**But the sidebar order doesn't match frequency of use:**
- Most used: Inbox, Roster, Advance Week
- Least used: Facility, Rivals, Rankings
- Sidebar order: Dashboard, Roster, Rankings, Scout, Inbox, Finance, Facility, Rivals

Rankings (3rd) is accessed far less frequently than Inbox (5th). Scout (4th) is used in bursts but is ahead of Inbox. This is a minor friction point once the player learns the muscle memory.

### 1.5 Screen Discoverability

**What's immediately visible:** All 10 nav items. No hidden screens.

**What's NOT immediately obvious:**
- FighterDetail exists (must click a fighter in Roster)
- FightNight exists (must accept a fight, then click the fight card)
- NegotiateModal exists (must click Negotiate on a prospect)
- Training panel exists (must scroll down in FighterDetail)
- Dynasty tab (🏛️) is at the bottom of sidebar — easy to miss

---

## 2. DASHBOARD

### 2.1 Information Hierarchy

**First 5 seconds — what the player notices:**
1. **KPI strip** — 4 large cards: Next Fight, Pending Offers, Net/Month, Roster. The largest visual element. ✅
2. **Priorities list** — numbered, color-coded action items. Draws attention. ✅
3. **Upcoming Fights** — table with fighter names, opponents, purses. ✅
4. **Camp Feed** — chronological log at the bottom. Scannable but low priority.

**Hierarchy is correct.** The most important information (what to do now, what's coming up) is at the top.

### 2.2 Primary Actions

Each KPI card is clickable — navigates to the relevant tab:
- Next Fight → Fight Card
- Pending Offers → Inbox
- Net/Month → Finance
- Roster → Roster

**This is excellent.** The KPI cards serve double duty as status indicators AND navigation shortcuts.

Priority items are also clickable — each navigates to the relevant tab (roster, inbox, finance).

### 2.3 Cognitive Load

**KPI strip:** 4 cards × 3 data points (label, value, detail) = 12 pieces of information. **Manageable.**

**Priorities:** Up to 12 items. Each has: number, color dot, text, chevron. **Can be overwhelming when full.**

**Upcoming Fights:** Table with 7 columns × N rows. **Dense but scannable** — the Mono avatars and color coding help.

**Camp Feed:** Chronological text log. **Low cognitive load** — designed for scanning.

### 2.4 Alerts and Progress Visibility

**Alerts:**
- Inbox badge (red number) — ✅ effective
- Priority items (color-coded urgency) — ✅ effective
- Overtraining/injury status in priorities — ✅ effective

**Missing alerts:**
- No "fight offer expiring" visual indicator beyond the priorities list
- No "contract expiring" warning on Dashboard
- No "coach raise pending" indicator
- No "fighter approaching retirement" indicator

---

## 3. CAMP MANAGEMENT

### 3.1 Fighter Management (Roster)

**Layout:** Dense table — Fighter name + Mono, OVR, 8 attributes, Status, Condition bars.

**Clicks to train:** Roster → click fighter → scroll to Training panel → click program → click intensity. **5 clicks per action.**

**Workflow efficiency: LOW.** Training 10 fighters requires: 2 clicks to open each, 2 clicks to set training, 1 click to go back = 50 clicks minimum per week. Plus scrolling.

**Repetitive interactions:** HIGH. Same clicks every week for every fighter. No bulk training in the Roster view. No "repeat last" button.

### 3.2 Coach Management (Facility)

**Layout:** 2-column grid — Coaches (left) + Camp Tier/Facilities (right).

**Coach display:** Name + Mono, specialty tag, personality, skill number, salary. **Clean and informative.** Hire Coach button is prominent.

**Missing:** No coach comparison view. No coach performance history. No coach synergy indicator with fighters.

### 3.3 Finance

**Layout:** P&L summary card → Cash reserve gauge → Income/Expense split bars.

**Strengths:**
- Cash reserve gauge with bankruptcy marker is clear
- Runway calculation ("Bankrupt at ~week X") is useful
- Split bars with percentages are scannable

**Weaknesses:**
- No historical cash flow chart
- No projection (what will my balance be in 4 weeks?)
- No fight purse forecasting

### 3.4 Inbox

**Layout:** Sorted list — title defenses first, then expiring offers, then regular offers, then events.

**Strengths:**
- Message cards are visually distinct (offer vs event vs sponsor)
- Action buttons are prominent (Accept/Counter/Reject)
- Expiration countdown is visible

**Weaknesses:**
- No filtering (all types mixed together)
- No search
- No "mark all as read" or bulk dismiss
- Sponsor messages and event messages have identical visual weight

### 3.5 Scouting

**Layout:** Network panel → Filters → Scout methods (4 cards) → Prospects list.

**Strengths:**
- Grade display is prominent
- Filter chips are interactive and clear
- Scout method cards show cost and quality range
- Prospect cards are detailed (Mono, attributes, grade, potential, note)

**Weaknesses:**
- No comparison view between prospects
- No "quick scout" from Dashboard
- 12-week expiry is not prominently displayed on prospects
- No visual indication of which prospects are about to expire

---

## 4. FIGHTER DETAIL

### 4.1 Information Grouping

**Layout:** Full-width identity header → 2-column body → Full-width fight history.

| Section | Position | Purpose |
|---------|----------|---------|
| Identity | Top, full-width | Name, archetype, weight, age, record, OVR |
| Attributes + OctaRadar | Left column | Technical stats, radar visualization |
| Profile | Right column | Traits, ambition, morale, popularity, contract |
| Training | Full-width | Program selection + intensity |
| Story Tags | Profile section | Dynamic career labels |
| Fight History | Full-width bottom | Table of past fights |

**Grouping is logical.** Technical (left), personal/social (right), actions (full-width).

### 4.2 Stat Presentation

**AttrTele bars:** Show current value, ceiling tick, and colored bar. **Excellent** — the most information-dense and readable stat display in the game.

**OctaRadar:** SVG octagon radar chart. **Visually striking** but conveys less precise information than AttrTele.

**Meters:** Morale, Overtraining, Popularity as horizontal bars. **Clear and standard.**

### 4.3 Career Information

**Story tags:** Displayed as colored tags (Champion, Rising Star, Gatekeeper, etc.). **Immediately readable.**

**Fight history table:** Result (W/L), Opponent, Method, Round, Tier, Week. **Functional but dense.** No highlight for title fights or notable wins.

**Missing:**
- Career statistics summary (total fights, win%, KO%, sub%)
- Record against specific opponents
- Performance trend (last 5 fights)
- Attribute progression chart

### 4.4 Training Panel

**Layout:** Program buttons (6) in a row → Intensity buttons (3) below.

**Strengths:**
- Active program is highlighted (ember)
- Booked fighters show Fight Camp locked
- Costs are displayed on buttons

**Weaknesses:**
- No training history visualization
- No attribute projection ("At current rate, you'll reach ceiling in X weeks")
- No training cycle indicator (the Training Philosophy system provides this, but it's text, not visual)

---

## 5. FIGHT FLOW

### 5.1 Fight Offer → Acceptance

**Flow:** Inbox → see offer → Accept/Counter/Reject → Dashboard (booked appears in Upcoming Fights).

**Clicks:** 1 click to accept. **Efficient.**

**Emotional flow:** Anticipation during the weeks leading up to the fight (countdown in Upcoming Fights). **Good pacing.**

### 5.2 FightNight

**Stages:** Staredown → Weigh-in → Entrance → Rounds → Corner → Knockdown/Doctor/Result → Dashboard.

**Pacing:**
- Staredown: Self-paced (no timer) — good for decision-making
- Weigh-in: Self-paced — thorough preparation
- Entrance: 2.5-second auto-advance — brief but effective
- Rounds: Self-paced (summary) or tick-by-tick (1.2s auto-advance)
- Corner: **60-second timer** — creates urgency ✅
- Result: Self-paced — closure

**Transitions:** Instant (no fade, no animation). **Abrupt.** Going from dramatic result screen directly back to static Dashboard feels jarring.

### 5.3 Post-Fight

**Result screen:** Victory/Defeat → Fight Story → Star Rating → Signature Moments → Purse Breakdown → Back to Camp.

**Strengths:**
- Fight Story provides narrative closure
- Star rating gives immediate quality assessment
- Signature moments highlight what made this fight special

**Weaknesses:**
- No "what changed" summary (rep gained, popularity gained, rank movement)
- No career context ("This is your 5th straight win")
- No world context ("You are now #3 in the rankings")
- "Back to camp" transition is instant — no decompression moment

---

## 6. INFORMATION DESIGN

### 6.1 Typography Hierarchy

| Level | Font | Size | Weight | Usage |
|-------|------|------|--------|-------|
| H1 | Barlow Condensed | 34px | 700 | Fighter names |
| H2 | Barlow Condensed | 22-24px | 700 | Section titles (TopBar) |
| H3 | Barlow Condensed | 16-19px | 700 | Card titles |
| Body | Barlow | 11-13px | 400-600 | Content text |
| Mono | JetBrains Mono | 10-15px | 700 | Numbers, stats |
| Labels | Barlow | 9-10px | 600-700 | Uppercase labels |

**Hierarchy is clear.** Display font for identity, body font for content, mono for data. **Good.**

### 6.2 Icons

**System:** Custom SVG icon set (12 icons).
- Dashboard, Roster, Rankings, Scout, Inbox, Finance, Facility, Rivals
- Bolt, Calendar, Chevron Right, Settings

**Usage:** Sidebar nav, TopBar calendar, KPI actions, compare bars.

**Quality:** Clean, consistent stroke style. **Good for a custom set.**

**Missing:** No icon differentiation for different event types in Inbox. No status icons (injury, morale warning, contract warning).

### 6.3 Colors

**Functional color coding:**
- Ember (orange) — primary action, active state, urgency
- Steel (blue) — secondary, information, neutral
- Gold (yellow) — champion, achievement, premium
- Green — positive (income, wins, health)
- Red — negative (expenses, losses, danger)
- Warning (amber) — caution, moderate concern

**The color system is consistent and functional.** ✅ However, there is **no colorblind-safe mode.**

### 6.4 Labels and Tooltips

**Labels:** All UI text is inline — no hover tooltips. Attribute abbreviations (STR, WRE, BJJ, FTW, PWR, CAR, CHN, IQ) require learning.

**Tooltips:** None exist. Hovering over any element reveals no additional information.

### 6.5 Tables

**Implementation:** All tables are CSS Grid, not HTML `<table>`. No column sorting. No column resizing. No row selection (beyond click-to-navigate).

**Readability:** Good for the dense Roster table. The alternating row colors and hover states help.

### 6.6 Progress Indicators

- Overtraining/Morale: Horizontal bars (0-100%)
- Cash reserve: Gauge bar
- Reputation: Number only (no gauge)
- Popularity: Number only (no gauge)
- Legacy: Number only
- Title defenses: Number only

**Progress visibility is inconsistent.** Some metrics have visual gauges, others are just numbers.

### 6.7 Empty/Loading/Error States

**Empty states:** ✅ Most screens handle empty states (Dashboard "All clear", Inbox "No messages", Scout "No scouts deployed").

**Loading state:** "LOADING CAMP…" text only. No spinner, no progress bar. **Minimal.**

**Error states:** Console-only. No user-facing error recovery UI. Corrupted saves reset silently.

---

## 7. CONSISTENCY

### 7.1 Component Consistency

**Panels:** Consistent `Panel` component with subtle border and padding. ✅

**Buttons:** Consistent `Btn` component with color, ghost, sm, wide variants. ✅

**Tags:** Consistent `Tag` component with color and solid variants. ✅

**Mono avatars:** Consistent `Mono` component for fighter identity. ✅

**Inconsistencies:**
- Some buttons use `Btn`, some use raw `<button>` with inline styles (Scout filter chips, corner buttons)
- Some sections use `Eyebrow`, some use raw `<div>` for section headers
- Training panel buttons are raw `<button>` elements, not `Btn` components

### 7.2 Interaction Patterns

**Click to navigate:** KPI cards, Roster rows, Priority items, Inbox items. ✅ Consistent.

**Click to action:** Accept/Counter/Reject buttons, Training program buttons, Corner buttons. ✅ Consistent.

**Inconsistency:** The "Hire Coach" button in Facility has **no onClick handler.** It's a dead button.

---

## 8. ACCESSIBILITY

### 8.1 Readability

**Font sizes:** Body text at 11-13px is readable on desktop. No mobile optimization (desktop-only game).

**Line height:** 1.4-1.5 — adequate.

**Contrast:** Dark theme (#0e1116 background, #eef2f7 text). High contrast for primary text. Low contrast for tertiary text (#64717f on #0e1116) — **may be difficult for visually impaired users.**

### 8.2 Font Scaling

**None.** All font sizes are fixed in pixels. No browser zoom adaptation. **No accessibility settings for text size.**

### 8.3 Color Contrast

The dark theme has good contrast for primary content. But the heat-mapped attribute colors (red through green) are the **only visual indicator** of stat quality — no secondary indicator for colorblind users.

### 8.4 Keyboard Navigation

**Supported:** Space = advance week, Ctrl+Z = undo, Ctrl+Y = redo.

**Not supported:** Tab navigation through sidebar. Arrow key navigation in roster. Enter to confirm. Escape to close modals.

**The game is mouse-primary with minimal keyboard support.**

### 8.5 Information Density

**Roster table:** 8 columns × 14 rows = 112 data points. **Very dense.** No way to hide columns. No compact/expanded view toggle.

**FighterDetail:** ~40 data points across 5 sections. **Manageable** with the 2-column layout.

**Rankings:** 15 rows × 5 columns × 8 divisions. **Overwhelming** for new players.

---

## 9. OVERALL UX ASSESSMENT

### 9.1 Friction Points

| Friction | Severity | Frequency |
|----------|----------|-----------|
| Training assignment (5 clicks per fighter) | High | Every week × N fighters |
| No bulk training | High | Every week |
| No training history view | Medium | Occasional |
| Rankings overload (120 fighters) | Medium | Weekly (checking rank) |
| Dead "Hire Coach" button | High | Every time visited |
| No tooltips anywhere | Medium | Constant (new players) |
| No column sorting in tables | Low | Occasional |
| FightNight → Dashboard abrupt transition | Low | Every fight |

### 9.2 Screens Requiring Unnecessary Effort

1. **Training assignment** — 5 clicks to change one fighter's training. No bulk mode.
2. **Rankings browsing** — must click through 8 divisions individually. No "my fighters" filter.
3. **Scout comparison** — must scroll between prospect cards. No side-by-side view.
4. **Inbox management** — must process messages one at a time. No bulk accept/dismiss.

### 9.3 Places Where Players May Become Confused

1. **Chemistry number** — displayed prominently but never explained
2. **Reputation** — gates everything but the mechanic is invisible
3. **Attribute abbreviations** — STR, WRE, BJJ, FTW, PWR, CAR, CHN, IQ require learning
4. **Scout grades** — C/B/A/S without explanation of what they mean for report accuracy
5. **FightNight corner timer** — no explanation that the timer auto-advances if it reaches 0

### 9.4 Does the UI Support Long-Term Play?

**Partially.** The UI is functional for short sessions (1-2 hours). The dashboard provides quick status. The KPI cards enable fast navigation.

**But repetitive tasks accumulate over hundreds of hours.** Training assignment, inbox processing, and roster checking are the same 5-10 clicks every week. After 500+ weeks, the player has performed these actions thousands of times with no automation or shortcut support.

### Grade: B-

The UI is **clean, consistent, and functional.** The Ironfist design system provides a professional visual language. The information architecture supports the core gameplay loop. But the lack of bulk operations, the absence of tooltips, the inaccessible color system, and the repetitive interaction patterns prevent it from being excellent.

**The UI works. It just makes you work harder than necessary.**
