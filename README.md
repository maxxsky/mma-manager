# 🥊 MMA Manager — Ironfist Edition

**A single-player MMA camp management simulation game.** Build your gym, recruit fighters, train champions, negotiate contracts, and compete through the ranks — from local shows to world title fights.

Built with a **pure JavaScript engine** (zero UI dependencies) layered under a **React + Vite** frontend — architecturally ready for multiplayer backend migration.

---

## ✨ Features

### 🏕️ Camp Management
- **Camp tiers** — Upgrade from Local Gym → Regional Camp → National Center → Elite Factory → World-Class Institute
- **Facilities** — Manage training mats, boxing ring, weight room, and medical room
- **Coaching staff** — Hire/fire coaches with specialties (Striking, Wrestling, BJJ, S&C, Head) and personalities (Motivator, Technician, Disciplinarian, Player's Coach)
- **Sponsors** — Accept royalty or placement deals from brands based on camp reputation
- **Chemistry & reputation** — Camp morale affects training efficiency; reputation unlocks tiers and opportunities

### 🧑‍🤝‍🧑 Fighter Management
- **Roster** — Full attribute grid (Striking, Wrestling, BJJ, Footwork, Strength, Cardio, Chin, Fight IQ) with heat-mapped OVR
- **Training** — 6 programs (Striking, Grappling, S&C, Sparring, Recovery, Fight Camp) × 3 intensities
- **Traits & ambitions** — Iron Chin, Glass Jaw, Crowd Favorite, Belt Chaser, Legacy, etc.
- **Contracts** — Manager cut, fight commitment, duration, agent tiers (Budget/Standard/Power)
- **Weight cutting** — Miss weight, catchweight, or cancel fights
- **Injuries** — 4-tier injury system with attribute decay during long recoveries
- **Aging & retirement** — Attribute ceilings, chin decay, retire-to-coach conversion

### 🔍 Scouting
- **4 scout tiers** — Local Amateur Circuit → Regional Tryouts → National Trip → Diamond in the Rough
- **Grade-based reports** — C/B/A/S grade accuracy based on camp reputation
- **Prospect management** — Track up to 5 prospects, negotiate contracts, filter by archetype & weight class

### 🥊 Fight System
- **Tick-based MMA engine** — Round-by-round simulation with position hierarchy (standing → clinch → ground positions)
- **Archetype matchups** — Boxer, Muay Thai, Wrestler, BJJ Specialist, All-Rounder with rock-paper-scissors dynamics
- **Game plans** — Take It Down, Keep It Standing, Finish It, Survive & Outpoint
- **Corner decisions** — Between-round strategy with countdown timer (Finish him / Work the body / Save your gas)
- **Fight Night experience** — Staredown attitude (Respectful/Professional/Trash Talk), weigh-in with Tale of the Tape, entrance, round-by-round commentary, knockdown, doctor stoppage, result with purse breakdown
- **Title fights** — Major, Premier, Minor, National, Regional title tiers with mandatory defenses
- **Double Champion** — Cross-division super fights

### 📊 Rankings & Rivals
- **Division rankings** — Top 15 per weight class with point decay and AI fighter rotation
- **P4P Top 10** — Cross-division pound-for-pound rankings
- **Rival camps** — 3 AI-managed rival gyms with fighter poaching mechanics

### 💰 Finance
- **Monthly P&L** — Income (sponsors, training fees, popularity) vs expenses (coach salaries, maintenance, training costs)
- **Cash reserve** — Runway projection and bankruptcy threshold gauge
- **Split visualizations** — Income and expense breakdown bars

### 🌐 Internationalization
- **Full EN ↔ ID** — 200+ translation keys covering attributes, UI labels, traits, game terms
- **Language toggle** — Switch between English and Bahasa Indonesia in real-time

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Runtime** | Browser (Vite dev server / static build) |
| **UI Framework** | React 18 |
| **Build Tool** | Vite 6 |
| **Game Engine** | Pure JavaScript (zero framework dependencies) |
| **State** | React `useState` + in-place mutation engine |
| **Styling** | Inline styles with design token system (Ironfist theme) |
| **Fonts** | Barlow + Barlow Condensed + JetBrains Mono (Google Fonts) |
| **Icons** | Custom SVG icon set |
| **Persistence** | `localStorage` (3 save slots) |
| **Deploy** | Static HTML/JS served via Python `http.server` on PM2 |

---

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/maxxsky/mma-manager.git
cd mma-manager/app

# Install dependencies
npm install

# Start development server
npm run dev

# Production build
npm run build
# Output: app/dist/ (static HTML + single JS bundle, ~350KB)
```

---

## 📁 Project Structure

```
mma-manager/
├── app/                          # React + Vite frontend
│   ├── index.html                # HTML entry point
│   ├── package.json
│   ├── vite.config.js
│   ├── dist/                     # Production build output
│   └── src/
│       ├── main.jsx              # React root + ErrorBoundary
│       ├── App.jsx               # App shell: routing, state, save/load, dispatch
│       ├── engine/               # Pure JS game engine (13 files, ~2,800 LOC)
│       │   ├── state.js          # Game loop (tick) + newGame initialization
│       │   ├── fight.js          # Round-by-round fight simulation
│       │   ├── fighter.js        # Fighter generation, scouting, contracts
│       │   ├── reducer.js        # Action-based state mutation (19 actions)
│       │   ├── data.js           # Game constants (traits, training, tiers, etc.)
│       │   ├── rng.js            # Seeded PRNG + utilities (fmt$, clamp, pick)
│       │   ├── i18n.js           # EN/ID translation tables
│       │   ├── economy.js        # Training bonus calculations
│       │   ├── rankings.js       # Division generation, ranking, titles
│       │   ├── rivals.js         # Rival camp generation
│       │   ├── relationships.js  # Fighter-to-fighter relationship tracking
│       │   ├── achievements.js   # Achievement unlock checks
│       │   └── finance.js        # Shared monthly financial calculations
│       └── ui/                   # React components (16 files, ~4,500 LOC)
│           ├── theme.jsx         # Design tokens, primitives, SVG icons
│           ├── Dashboard.jsx     # KPI strip, priorities, upcoming fights, feed
│           ├── Roster.jsx        # Fighter table with attribute grid
│           ├── FighterDetail.jsx # Full profile: AttrTele, OctaRadar, training
│           ├── FightNight.jsx    # Fullscreen staged fight experience
│           ├── FightCardFull.jsx # Tale of the Tape standalone view
│           ├── Rankings.jsx      # Division rankings + P4P
│           ├── Scout.jsx         # Scouting hub: filters, methods, prospects
│           ├── Finance.jsx       # Monthly P&L, cash reserve, split bars
│           ├── Facility.jsx      # Camp tier, coaches, facility upgrades
│           ├── Inbox.jsx         # Fight offers, sponsor offers, events
│           ├── RivalsScreen.jsx  # Rival camp overview + poaching
│           ├── NegotiateModal.jsx# Contract negotiation dialog
│           ├── Sidebar.jsx       # Navigation sidebar
│           ├── TopBar.jsx        # Header: date, KPI chips, save/language
│           └── LangContext.jsx   # i18n React context provider
├── tools/                        # Balance simulation scripts
├── docs/balance/                 # 23 balance simulation result files
├── GDD_v4.md                     # Game Design Document
├── GDD-fight-engine-reference.md
├── gdd-gap-list.md
└── backend-blueprint-v1.md       # Multiplayer backend architecture plan
```

---

## 🏗️ Architecture Overview

### Engine/UI Separation

The game engine (`app/src/engine/`) is **pure JavaScript** with zero React or UI imports. This architectural choice makes it:

- **Multiplayer-ready** — The same engine can run server-side on Node.js
- **Testable** — Fight simulation and game logic can be tested independently
- **Portable** — No framework lock-in

### State Management

The engine uses **in-place mutation** — all game state changes modify the state object directly. A `reducer` function (named for familiarity, not Redux-style purity) applies actions in-place. Undo/redo uses deep snapshots (capped at 20 entries).

The React layer (`App.jsx`) wraps this with `structuredClone` for state immutability, throttled `localStorage` persistence, and a `dispatch` bridge that intercepts UI-specific actions.

### Data Flow

```
User Click → UI Component → dispatch(action) → reducer(state, action) → mutated state
                                                                              ↓
User sees updated UI ← React re-render ← setG(structuredClone(state)) ←──────┘
```

### Save System

- 3 save slots stored in `localStorage`
- Auto-save on every state change (throttled)
- Migration layer handles old save formats (adds missing fields: `training`, `ceilings`, `sponsors`, etc.)
- Corrupted save detection with fallback reset

---

## 🚧 Development Status

**Phase:** Single-Player Complete — Polish & Bug Fix

| Area | Status |
|------|--------|
| Core game loop (tick) | ✅ Fully implemented |
| Fight engine | ✅ Tick-based MMA simulation |
| Camp management | ✅ Tiers, facilities, coaches |
| Fighter system | ✅ Training, traits, contracts, aging |
| Scouting | ✅ 4 tiers with grade-based reports |
| Rankings | ✅ Division top 15 + P4P |
| Rival camps | ✅ AI simulation + poaching |
| Finance | ✅ Monthly P&L + runway |
| Sponsors | ✅ Placement & royalty deals |
| i18n | ✅ 200+ keys EN/ID |
| UI redesign (Ironfist) | ✅ All screens migrated |
| Achievements display | ⬜ Tracked but not displayed |
| Coach market UI | ⬜ Coach hiring modal needed |
| Backend / Multiplayer | ⬜ Blueprint exists, not started |
| Tests | ⬜ No test suite yet |
| CI/CD | ⬜ Not configured |

---

## 🤝 Contributing

This is a solo project. Bug reports and feature suggestions are welcome via GitHub Issues.

Areas that would benefit from contributions:
- **Test suite** — The pure JS engine is highly testable (`simRound`, `tick`, `reducer`)
- **Coach market UI** — Modal for browsing and hiring coaches
- **Achievements panel** — Display unlocked achievements to the player
- **TypeScript migration** — Would catch shape mismatches (e.g., `coachResignChance` number vs object)

---

## ⚠️ Shared Engine Warning

`packages/engine` (`@ironfist/engine`) is a **shared dependency** between `app/` (solo play, client-side) and `packages/server/` (multiplayer backend). Any change to `packages/engine/` **must** be tested in both workspaces before merging. Run `npm test` from the repo root to execute both test suites at once — this is the minimum gate before considering engine work done.

---

## 📄 License

This project is currently unlicensed. All rights reserved by the author.
