# PROJECT CONSTITUTION — MMA Manager

> **Version:** 1.0  
> **Status:** Ratified  
> **Applies to:** All AI agents (Hermes, DeepSeek, Claude, or any model) editing this codebase.

---

## 1 — Project Vision

MMA Manager is a single-player camp management simulation game. The player runs a mixed martial arts gym, manages fighters, and competes in a living world.

### What this game is

- A **state-driven simulation** where the engine generates emergent stories.
- A **management game** where the player's decisions shape outcomes.
- A **lightweight web app** with pure JS engine + React UI.

### What this game is not

- Not a multiplayer game.
- Not a AAA graphics title.
- Not a mobile app.
- Not a casino/gacha game.
- Not a framework experiment (no Redux, no TypeScript, no OOP).

---

## 2 — Core Design Principles

### 2.1 Emergence over scripted content
Every narrative should arise from the simulation, not from authored scripts. If a system cannot produce interesting results from the data, fix the data model — not the narrative layer.

### 2.2 Simulation depth over presentation polish
A rich engine with a simple UI beats a shallow engine with a glossy UI. Invest in making the world feel alive; the UI just needs to get out of the way.

### 2.3 Strategic depth over complexity
The player should make meaningful decisions — not manage spreadsheets. Every number on screen should correspond to a lever the player can pull.

### 2.4 Player learns by doing
Do not explain everything through tutorials. Let the player discover systems through gameplay consequences. A failed experiment teaches more than a tooltip.

### 2.5 Long-term saves are sacred
The game must be stable across 100+ week playthroughs. Data corruption, progression-blocking bugs, or broken save migration are unacceptable.

---

## 3 — Architecture Principles

### 3.1 Engine/View separation
The JS engine (`src/engine/`) must have zero React imports. It must be testable from Node.js without a browser. The React UI (`src/ui/`, `src/components/`) consumes the engine but never modifies it.

### 3.2 Orchestration over monolithic functions
Every major system (state.js, reducer.js, fight.js, world.js) must be an orchestration layer that delegates to domain modules. Target: orchestrator files under 250 lines.

### 3.3 Registry over switch/if-else chains
When a system grows beyond 5 branches, extract into a registry pattern. Domain reducers > giant switch statement. Handler registries > 20-branch if/else.

### 3.4 Config over magic values
Never hardcode thresholds, probabilities, or constants in business logic. Extract to a `config.js` file within each domain module. Name constants clearly: `MAX_UNDO_STACK = 20` not `let x = 20`.

### 3.5 Deterministic simulation where possible
Use a seedable RNG for any system that generates gameplay-relevant outcomes. This enables regression testing and reproducible debugging.

---

## 4 — Coding Principles

### 4.1 Clean code over clever code
Readable > fancy. A junior developer reading your code should understand it in one pass. Optimize for the next person who has to fix a bug at 2 AM.

### 4.2 Minimal change
Solve problems with the smallest possible change. Do not refactor unrelated code while delivering a feature. If a change touches more than 3 files, ask yourself if it can be split.

### 4.3 No dead imports
Every import must be used. If a function is defined but never called, remove it. If a component is never rendered, delete it. Dead code is a liability, not an asset.

### 4.4 Test the happy path, guard the edge cases
Always validate input from user actions. Always handle the case where a nested object property is undefined. Never trust that data from localStorage is valid.

### 4.5 One source of truth
The same data must not be computed in two places. Extract shared logic into modules. If the same calculation appears twice, it will diverge during maintenance.

### 4.6 Self-documenting code over comments
Name variables and functions so that the code explains itself. Use comments only to explain why a non-obvious decision was made — never to explain what the code does.

---

## 5 — AI Working Principles

### 5.1 Read before you write
Before modifying any file, read the entire file. Understand its structure, its imports, and its callers. Do not assume you know what a file contains based on its name.

### 5.2 Verify before you claim
After making changes, verify with tools — not with reasoning. Run the build. Check the console output. Test with Playwright. Do not say "it should work" unless you have evidence.

### 5.3 One task at a time
Do not batch multiple independent changes in a single pass. Complete one task, verify it, commit it, then proceed to the next.

### 5.4 Report truth, not intent
If a build fails, report what the error says — not what you expected. If a test fails, show the assertion error. Hiding bad news behind optimistic language creates technical debt.

### 5.5 Respect the architecture
Do not introduce new frameworks, design patterns, or abstractions without a documented decision. No Event Bus, ECS, Dependency Injection, Immer, Redux, Saga, or Service Locator unless explicitly authorized in this constitution.

### 5.6 Preserve what exists
When fixing a bug, prefer the minimal defensive fix over a rewrite. If existing code handles an edge case poorly, add a guard — do not restructure the surrounding logic.

---

## 6 — Modification Rules

### 6.1 Blockers — must be fixed
- Security vulnerabilities (eval, innerHTML with user input)
- Save corruption or data loss
- Runtime crashes (TypeError, ReferenceError, uncaught exceptions)
- Game-breaking bugs (cannot advance week, cannot fight)

### 6.2 Warnings — should be fixed
- Console errors in production
- Regression in already-working features
- Dead code or dead imports
- Unused state variables

### 6.3 Suggestions — may be deferred
- UI polish and styling improvements
- Performance optimizations for large saves
- Additional test coverage
- Documentation

### 6.4 Unauthorized — never do without explicit approval
- Full architectural rewrites
- Migrating to a new framework
- Adding new dependencies
- Changing the save/load format
- Refactoring working code for "cleanliness" alone

---

## 7 — Definition of Done

A task is done only when ALL of these are satisfied:

1. **The change works** — the feature behaves as expected in the browser.
2. **No regression** — previously working features still work.
3. **No new errors** — the console has no new errors or warnings.
4. **Build passes** — `vite build` completes without errors.
5. **Edge cases considered** — what happens when data is missing, empty, or corrupted?
6. **Pushed** — the change is committed and pushed to the repository.
7. **Verified** — the deployed version works on the VPS (not just local dev server).

---

## 8 — Priority Order

When principles conflict, follow this priority order:

1. **Preserve save data and player progression.**
2. **Prevent regressions in existing features.**
3. **Preserve public APIs and established interfaces.**
4. **Respect the existing project architecture.**
5. **Make the smallest possible change.**
6. **Improve code quality only when it does not violate any rule above.**

Never sacrifice a higher priority to satisfy a lower one.

---

## 9 — Scope Boundaries

AI may:

- Add new files when appropriate.
- Add helper functions.
- Add defensive guards.
- Improve readability within the task scope.

AI must NOT:

- Rename public APIs.
- Rewrite unrelated modules.
- Move project structure.
- Change architecture.
- Modify files outside the requested scope unless required to fix a regression caused by its own changes.

If additional changes become necessary, explain why before proceeding.

---

## 10 — Escalation Rules

Stop and report instead of guessing when:

- Requirements are ambiguous.
- Two project rules conflict.
- Required information is missing.
- Multiple valid implementations exist with different trade-offs.
- A requested change would violate this constitution.

Prefer asking for clarification over making assumptions.

---

## 11 — Existing Pattern First

Before introducing a new implementation pattern:

1. Search for similar implementations.
2. Follow existing conventions whenever possible.
3. Introduce a new pattern only if existing ones cannot reasonably solve the problem.

Consistency is preferred over novelty.

---

## 12 — Never Assume

Do not invent missing information.

If behavior, architecture, or business rules are unclear:

- Report what is known.
- State what is uncertain.
- Continue only when there is sufficient evidence.

Evidence is preferred over inference.

---

## 13 — Respect Existing Gameplay

When modifying gameplay systems:

- Preserve existing game balance unless the task explicitly requests balance changes.
- Avoid changing player-facing behavior as a side effect of technical work.
- Separate bug fixes from gameplay balancing whenever possible.

---

*This constitution is a living document. Amendments require a documented rationale and approval.*
