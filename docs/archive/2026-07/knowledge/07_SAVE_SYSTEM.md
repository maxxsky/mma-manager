# Knowledge: Save System

> **Domain:** State persistence, data integrity, versioning, migration, save/load lifecycle
> **Audience:** AI agents implementing or modifying save system features
> **Version:** 1.0

---

## 1 — Purpose

The Save System is the guardian of player progress. Every fighter developed, every title won, every dollar earned — all of it exists only as long as the save system preserves it. If the save system fails, the player's investment of hours, weeks, or months is lost. This is the highest-stakes system in the entire game.

The save system does not simulate. It does not generate. It captures and restores — taking a snapshot of the entire game state at a moment in time and guaranteeing that the snapshot can be reconstructed exactly, even weeks or versions later. Its job is simple in concept and unforgiving in execution: never lose data, never corrupt state, never break a player's save.

---

## 2 — Save System Philosophy

### The save is sacred

Player progress represents real human time. A corrupted save is not a bug — it is a breach of trust. Every design decision in the save system must prioritize data integrity above all other concerns. Performance, file size, and implementation simplicity are secondary. The save must survive.

### Save is a snapshot, not a simulation

A save file is a frozen moment. It does not continue evolving while stored. It does not need to be "updated" between plays beyond version migration. Loading a save should reproduce the exact state that existed when the save was created — no more, no less. The world resumes from that point as if no time had passed.

### Trust is earned through reliability

Players trust the save system when it works perfectly every time. One corrupted save destroys that trust permanently — the player will never again feel confident that their progress is safe. The save system must be so reliable that players never think about it. Silence is success.

### Migration is a promise

When the game evolves (new attributes, new systems, changed data formats), old saves must continue to work. Migration is the bridge between versions — a guarantee that the player's investment survives updates. Breaking old saves is only acceptable as a last resort, and only with explicit player communication.

---

## 3 — Design Goals

- **Zero data loss** — saves are never corrupted, overwritten with partial data, or lost due to system failure.
- **Deterministic restore** — loading the same save always produces identical game state.
- **Backward compatible** — saves from older versions load correctly after migration.
- **Atomic operations** — a save operation either completes fully or has no effect. No partial saves.
- **Transparent to the player** — auto-save happens silently in the background. The player only thinks about saving when they want to create a checkpoint.
- **Fast enough to be invisible** — save and load operations complete quickly enough that the player does not perceive waiting.
- **Versioned and migratable** — every save carries a version identifier. Migration paths exist between versions.

---

## 4 — Design Principles

| Principle | Meaning |
|-----------|---------|
| **Save is a Snapshot, Not a Simulation** | A save captures state at one moment. It does not contain logic, timers, or ongoing processes. |
| **Single Source of Truth** | The loaded state is the only authoritative game state. There are no secondary caches or derived stores that can diverge. |
| **Deterministic Restore** | Loading a save N times produces the same state N times. No randomness in deserialization. |
| **Backward Compatible** | Old saves load on new game versions. Migration adapts old formats to new expectations. |
| **Versioned Data** | Every save identifies its format version. The load system knows exactly which migration path to apply. |
| **Atomic Save** | A save writes to a temporary location first, then atomically replaces the previous save. A crash during save leaves the old save intact. |
| **Never Corrupt Existing Save** | If a save operation fails, the previous valid save remains untouched. The system never overwrites good data with bad data. |
| **Fail Safe Before Fail Fast** | When encountering unexpected state during load, default to safe values and log the error. Do not crash. The player should always be able to load their save, even if some data is degraded. |

---

## 5 — Non Goals

- **Not a cloud sync system** — saves are local. Synchronization across devices is not a concern at this layer.
- **Not a backup manager** — the save system maintains the current save. Multiple backup slots are a UI concern, not a persistence concern.
- **Not a cheat prevention system** — save files are not encrypted or obfuscated. Players who want to edit saves can do so.
- **Not a performance optimization system** — save/load speed matters, but integrity matters more. The system will not sacrifice correctness for speed.
- **Not responsible for UI state** — active tab, scroll position, and modal state are not persisted. Only game state is saved.
- **Not a logging system** — the save system does not maintain an audit trail of changes. That is the responsibility of the timeline and action log.

---

## 6 — Responsibilities

### Save System owns

- Serialization of the complete game state into a storable format
- Deserialization of stored state back into a valid game state object
- Version tracking — every save knows which game version created it
- Migration — transforming old-format saves to the current format
- Auto-save scheduling — triggering saves at appropriate intervals
- Manual save — allowing the player to create named checkpoints
- Save slot management — multiple save files, each independent
- Corruption detection — identifying when a save file is damaged
- Recovery — loading the most recent valid save when corruption is detected
- Atomic write — ensuring a save operation cannot produce a partial file

### Save System does NOT own

- What data constitutes the game state — that is owned by all other systems
- When auto-save triggers — that is owned by the tick orchestrator (triggers after weekly tick)
- The save/load UI — owned by Presentation layer
- Save file storage location — owned by platform/infrastructure
- Export/import functionality — owned by a separate feature if needed
- Undo/redo within a session — owned by the reducer and state management

---

## 7 — Mental Model

### The Save as a Frozen World

```
┌─────────────────────────────────────────────────────────────────┐
│                     RUNTIME WORLD                                │
│                                                                 │
│  Week 247                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Fighter A│ │ Fighter B│ │ Coach  1 │ │ Economy  │  ...      │
│  │ str: 85  │ │ str: 62  │ │ skill: 4 │ │ cash:50K │           │
│  │ age: 29  │ │ age: 33  │ │ salary:8K│ │ sponsors│           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│                                                                 │
│  Player presses "Save" or auto-save triggers                    │
│                         │                                       │
│                         ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   SERIALIZATION                          │    │
│  │  Convert live objects → storable representation         │    │
│  │  Attach version number                                  │    │
│  │  Attach metadata (timestamp, week, camp name)           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│              ┌──────────────────────┐                           │
│              │     SAVE FILE        │                           │
│              │                      │                           │
│              │  version: 3          │                           │
│              │  week: 247           │                           │
│              │  timestamp: ...      │                           │
│              │  state: { ... }      │                           │
│              │                      │                           │
│              │  This is a frozen    │                           │
│              │  moment. It does not │                           │
│              │  change until the    │                           │
│              │  player loads it.    │                           │
│              └──────────────────────┘                           │
│                                                                 │
│  Time passes... (days, weeks, game updates)                     │
│                                                                 │
│  Player loads save                                              │
│                         │                                       │
│                         ▼                                       │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   DESERIALIZATION                        │    │
│  │  Read version → apply migrations if needed              │    │
│  │  Convert storable format → live objects                 │    │
│  │  Validate state integrity                               │    │
│  └─────────────────────────────────────────────────────────┘    │
│                         │                                       │
│                         ▼                                       │
│                     RUNTIME WORLD                                │
│                   (identical to Week 247)                        │
│                                                                 │
│  Simulation resumes from exactly where it left off              │
└─────────────────────────────────────────────────────────────────┘
```

### Two States, One Truth

AI should understand that there are two representations of game state:

- **Runtime state**: the live object in memory that the game operates on. Mutable, reactive, contains transient data (UI state, animation flags, cached calculations).
- **Saved state**: the serialized representation on disk. Immutable once written. Contains only persistent game data — no transient values, no derived calculations, no runtime-only flags.

The save system bridges these two worlds. It knows what to include (persistent state) and what to exclude (transient state). Including transient state in saves causes bugs on load — the game "remembers" things it shouldn't. Excluding persistent state causes data loss — the game "forgets" things it should remember.

---

## 8 — System Relationships

### Reads (Save System collects from)

| System | What Save Collects | Why It Must Be Saved |
|--------|-------------------|---------------------|
| **Fighter** | All fighter data (attributes, record, contracts, morale, training state, titles, history) | Core progression — the player's primary investment |
| **Coach** | All coach data (skill, salary, specialty, contract) | Resource investment — coaches represent significant cost |
| **Camp** | Tier, facilities, reputation, chemistry, legacy | Camp progression — the player's organizational achievement |
| **Economy** | Cash balance, active sponsors, sponsor terms, investors | Financial state — determines what the player can afford |
| **World** | Week counter, divisions, AI fighters, rankings, world history | World state — maintains the living ecosystem |
| **Events** | Timeline, event flags, pending event chains | Narrative continuity — events should not reset or repeat on load |
| **Rivals** | Rival camp state, rivalry intensity, history | Competitive landscape — rivals persist across sessions |
| **Achievements** | Unlocked achievements, progress toward locked ones | Player accomplishment — achievements are permanent |
| **Settings** | Player preferences (language, UI options) | Player comfort — settings should persist |

### Writes (Save System produces)

| Artifact | Content | Purpose |
|----------|---------|---------|
| **Save File** | Complete serialized game state | Primary persistence — this is the player's progress |
| **Metadata** | Timestamp, version, week, camp name | Save identification — helps player distinguish saves |
| **Version Tag** | Format version number | Migration routing — the load system knows which migrations to apply |
| **Checkpoint** | Copy of save at milestone moments | Recovery — if the main save is corrupted, fall back to checkpoint |

### Triggers (What causes a save)

| Trigger | Frequency | Purpose |
|---------|-----------|---------|
| **Auto-Save** | After every weekly tick (debounced ~1 second) | Continuous protection — player never loses more than one week |
| **Manual Save** | Player-initiated, any time | Checkpoint creation — player wants to try something risky |
| **Major Milestone** | Title win, retirement, achievement unlock | Snapshot important moments — player may want to revisit |
| **Exit Game** | Player closes the game | Final save — ensure no progress is lost on exit |

---

## 9 — Cross-System Impact

The save system touches every other system. Understanding these interactions is critical.

### Save Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         SAVE FLOW                                │
│                                                                 │
│  Trigger: Auto-save timer fires (after tick)                    │
│                │                                                │
│                ▼                                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ COLLECT                                               │    │
│  │                                                          │    │
│  │  Game State Object (g)                                   │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │    │
│  │  │Fighters │ │ Coaches │ │ Economy │ │  World  │ ...    │    │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘        │    │
│  │                                                          │    │
│  │  EXCLUDE transient data:                                 │    │
│  │  • _undoStack, _redoStack (session-only)                 │    │
│  │  • UI state (active tab, scroll)                         │    │
│  │  • Animation state                                       │    │
│  │  • Derived/cached values                                 │    │
│  └──────────────────────────────────────────────────────────┘    │
│                │                                                │
│                ▼                                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ VALIDATE                                              │    │
│  │                                                          │    │
│  │  Sanity checks before writing:                           │    │
│  │  • All required systems present?                         │    │
│  │  • Core data structures intact?                          │    │
│  │  • No NaN or undefined in critical fields?               │    │
│  │  • State is internally consistent?                       │    │
│  └──────────────────────────────────────────────────────────┘    │
│                │                                                │
│                ▼                                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ SERIALIZE                                            │    │
│  │                                                          │    │
│  │  Convert runtime objects → storable format               │    │
│  │  Attach version number                                   │    │
│  │  Attach metadata block                                   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                │                                                │
│                ▼                                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ ATOMIC WRITE                                         │    │
│  │                                                          │    │
│  │  1. Write to temporary file (.tmp)                       │    │
│  │  2. Verify temporary file is valid                       │    │
│  │  3. Rename temporary → real file (atomic on most OS)    │    │
│  │  4. If crash at step 3: old file intact                  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  SAVE COMPLETE — Player progress protected                       │
└─────────────────────────────────────────────────────────────────┘
```

### Load Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOAD FLOW                                │
│                                                                 │
│  Trigger: Player selects a save to load                         │
│                │                                                │
│                ▼                                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ READ & PARSE                                          │    │
│  │  • Read save file from disk                              │    │
│  │  • Parse format (JSON)                                   │    │
│  │  • Extract version number                                │    │
│  │  • On parse failure → file is corrupted, try backup      │    │
│  └──────────────────────────────────────────────────────────┘    │
│                │                                                │
│                ▼                                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ VERSION CHECK                                         │    │
│  │                                                          │    │
│  │  savedVersion == currentVersion?                          │    │
│  │       │                                                   │    │
│  │    Yes ───► Skip migration                                │    │
│  │       │                                                   │    │
│  │    No  ───► Apply migration chain                         │    │
│  │            savedVersion → v1 → v2 → ... → currentVersion  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                │                                                │
│                ▼                                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ DESERIALIZE                                          │    │
│  │  • Convert storable format → runtime objects             │    │
│  │  • Reconstruct object references and arrays               │    │
│  │  • Set default values for fields added in newer versions  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                │                                                │
│                ▼                                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ VALIDATE & RESTORE                                   │    │
│  │  • Verify all required systems present                   │    │
│  │  • Run integrity checks on critical data                  │    │
│  │  • Initialize transient state (_undoStack, etc.)          │    │
│  │  • On validation failure → load with safe defaults        │    │
│  └──────────────────────────────────────────────────────────┘    │
│                │                                                │
│                ▼                                                │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ RESUME SIMULATION                                     │    │
│  │  • Set g = loaded state                                  │    │
│  │  • UI renders from loaded state                           │    │
│  │  • Player continues from exactly where they left off      │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  LOAD COMPLETE — World resumes                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Migration Impact Chain

When a new system adds fields to fighters:

```
New field added: fighter.fatigue
                │
                ▼
  Save version bumped: 3 → 4
                │
                ▼
  Migration v3→v4 created:
  • For each fighter in save, add fatigue: 0
                │
                ▼
  Old saves (v3) load correctly:
  • v3 → migration adds fatigue → v4 state
                │
                ▼
  New saves are v4:
  • Include fatigue in serialization
                │
                ▼
  No player progress is lost
```

---

## 10 — Save Lifecycle

```
┌──────────────────────────────────────────────────────────────────┐
│                      SAVE LIFECYCLE                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 1. COLLECT                                              │    │
│  │    • Gather all persistent state from game object        │    │
│  │    • Filter out transient data                           │    │
│  │    • Prepare metadata (version, timestamp, week)         │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 2. VALIDATE                                             │    │
│  │    • Verify state integrity before writing               │    │
│  │    • Catch corruption early — don't persist bad state    │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 3. SERIALIZE                                            │    │
│  │    • Convert to storable format                          │    │
│  │    • No circular references, no functions, no DOM nodes  │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 4. WRITE (atomic)                                       │    │
│  │    • Write to temp file                                  │    │
│  │    • Verify temp file is readable                        │    │
│  │    • Atomically replace old save                         │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 5. VERIFY                                               │    │
│  │    • Confirm the written file can be read back           │    │
│  │    • If verification fails → restore old save, log error │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ SAVE COMPLETE                                            │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ... time passes ...                                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 6. LOAD                                                 │    │
│  │    • Read save file                                      │    │
│  │    • Detect version                                      │    │
│  │    • Apply migrations if needed                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 7. DESERIALIZE                                          │    │
│  │    • Parse stored format                                 │    │
│  │    • Reconstruct runtime objects                         │    │
│  │    • Apply defaults for missing fields                   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 8. RESTORE                                              │    │
│  │    • Set game state = loaded state                       │    │
│  │    • Initialize transient runtime data                   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 9. VALIDATE                                             │    │
│  │    • Run post-load integrity checks                      │    │
│  │    • On failure → load with safe defaults, log warning   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                         │                                        │
│                         ▼                                        │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ 10. RESUME                                              │    │
│  │     • Simulation continues from loaded state             │    │
│  │     • Auto-save timer begins                             │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  CYCLE COMPLETE — Save is ready for the next save operation      │
└──────────────────────────────────────────────────────────────────┘
```

---

## 11 — Business Rules

### Save Frequency

- **Auto-save** triggers after every weekly tick, debounced to prevent excessive writes (typically ~1 second delay).
- **Manual save** is available to the player at any time the game is not in a modal or combat.
- **Milestone saves** occur at significant moments (title wins, retirements, achievements).
- Saves do not occur during combat, modals, or loading screens.

### Auto-Save

- Auto-save is the primary protection against progress loss.
- The player should never lose more than one week of progress.
- Auto-save is silent — no notification, no interruption.
- Auto-save does not create a new save slot. It overwrites the current slot.

### Manual Save

- Manual save allows the player to create named checkpoints.
- The player may maintain multiple manual save slots.
- Manual saves are never overwritten by auto-save.
- Manual saves are useful before risky decisions (accepting a dangerous fight, making a large investment).

### Version Migration

- Every save file carries a version number indicating the game version that created it.
- When loading an older save, the system applies a chain of migrations: v2 → v3 → v4 → current.
- Each migration is a self-contained transformation from one version to the next.
- Migrations are additive — they add missing fields, restructure data, or fix known issues. They never remove data.
- If a migration fails, the system falls back to loading with safe defaults and logs the error.

### Corrupted Save Handling

- Corruption is detected during load (parse failure, missing critical data).
- On corruption detection: attempt to load the most recent backup or auto-save.
- If no backup exists: attempt to load with safe defaults — degraded state is better than no state.
- The player is notified: "Your save file appears to be damaged. The game has loaded with default values where possible."
- The corrupted save is preserved for debugging — it is not overwritten.

### Checkpoint System

- The game may maintain an automatic checkpoint separate from the main save.
- The checkpoint is created at major milestones and before potentially risky operations.
- If the main save is corrupted, the checkpoint provides a recovery option.
- Checkpoints are managed automatically — the player does not interact with them directly.

### Partial Failure

- If part of the state fails to serialize or deserialize, the system isolates the failure.
- The affected system is initialized with safe defaults.
- Other systems load normally.
- The player is notified of the degraded load with specific information about what was affected.
- The game continues — a degraded load is always better than a failed load.

### Compatibility

- Adding a new field to game state requires a migration for old saves.
- Removing a field does not require migration (new code simply ignores the field).
- Renaming a field requires migration (remap old name → new name).
- Changing a field's type or meaning requires careful migration with explicit transformation logic.
- Breaking changes (fundamentally incompatible formats) require a major version bump and explicit communication to players.

### Restore Order

Systems must be restored in dependency order:

1. **Infrastructure** — week counter, version, camp identity
2. **Camp** — tier, facilities, reputation, chemistry
3. **Economy** — cash, sponsors, contracts (fighters depend on contract state)
4. **Fighters and Coaches** — the core entities (depend on camp and economy)
5. **World** — divisions, AI fighters, rankings (depend on fighters)
6. **Events and Narrative** — timeline, flags (depend on all above)
7. **Achievements and Dynasty** — computed from all above

Restoring in the wrong order can create broken references — a fighter loaded before their contract exists, or a ranking referencing a fighter not yet restored.

---

## 12 — Save Philosophy & Data Integrity

### Never lose player progress

This is the prime directive. Every other concern — performance, file size, code elegance — is secondary. A save system that occasionally corrupts 0.1% of saves has failed, because for those 0.1% of players, the game has broken its fundamental promise.

### Restore must be identical to save point

If the player saves at Week 100 with a specific roster, cash balance, and world state, loading that save at any future time must reproduce that exact state. Not approximately — exactly. Deterministic restore is non-negotiable.

### Migration must be safe

When the game adds new features, old saves must load correctly after migration. The player should not lose progress because the developer added a new attribute or system. Migration is a promise made to every player who has ever saved their game.

### State must not change after load

Loading a save and immediately saving again should produce an identical file. The act of loading must not trigger simulation ticks, event generation, or any state mutation. Load is a read operation, not a write operation.

### Save must be trustworthy

The player should never hesitate to save. They should never wonder "will this corrupt my file?" or "will I lose progress?" Trust is the save system's most important output — and it is earned through flawless execution across thousands of save/load cycles.

### Degraded is better than dead

If a save is partially corrupted, load what can be loaded. A game with one fighter missing is better than a game that refuses to load. The player can decide whether to continue or restart — the system should not make that decision for them.

---

## 13 — AI Decision Heuristics

When modifying or extending the save system, follow these heuristics.

### Don't save what can be recalculated

Derived values (total fighters, average stats, projected income) should be recomputed on load, not saved. Saving derived values creates synchronization risks — if the derivation formula changes, saved values become stale. Save the source data; derive on load.

### Save state, not cache

Cached values (sorted lists, indexed lookups, precomputed rankings) belong in runtime memory, not in save files. They will be rebuilt on load. Including them in saves bloats file size and creates stale data bugs.

### Add migration before changing save format

Never change the save format without creating the corresponding migration. A new field added to fighters without a migration means old saves will load with undefined values, potentially crashing the game. Migration first, format change second.

### Don't remove old fields without a compatibility strategy

Removing a field that old saves still contain will not cause load failures (the field is simply ignored), but consider: does any system reference this field? Will removing it break any logic that expects it to exist? If yes, keep the field or add a migration that transforms it.

### Prioritize data integrity over file size

A save file that is 500KB but 100% reliable is better than a 50KB save that sometimes corrupts. Compression and optimization are nice to have; correctness is mandatory.

### Test migration with real old saves

Don't just test migration with artificially constructed old-format data. Test with actual saves from previous versions. Real player data contains edge cases that synthetic test data never captures.

### Save operations must be idempotent

Saving the same state twice should produce two identical save files (same content, possibly different timestamps). If the second save differs from the first without any game state changes in between, something is serializing transient data.

### Log save/load failures aggressively

If a save operation fails or a load requires fallback behavior, log it with as much detail as possible. Silent failures become undiscovered data loss. Loud failures enable debugging and player communication.

---

## 14 — Extension Strategy

### Adding a save field

1. Add the field to the runtime game state.
2. Bump the save version number.
3. Create a migration that adds the field with a safe default to all entities that need it.
4. Update serialization to include the new field.
5. Test: old saves (without the field) load correctly after migration.
6. Test: new saves (with the field) save and load correctly.

### Adding metadata

1. Define the metadata — what information about the save is useful? (playtime, difficulty, version)
2. Add to the metadata block in the save format.
3. Update the save/load UI to display new metadata.
4. Ensure old saves (without the metadata) load with sensible defaults for display.
5. Metadata does not require migration — it is informational, not structural.

### Adding a checkpoint

1. Define the trigger — when should the checkpoint be created? (milestone, before risky action)
2. Implement checkpoint creation — a separate save file with a distinct naming convention.
3. Add checkpoint loading to the load system — offer checkpoint as recovery option.
4. Manage checkpoint lifecycle — when are old checkpoints cleaned up?
5. Ensure checkpoints do not interfere with normal save/load operations.

### Adding a new system to the save

1. Ensure the new system's state is fully represented in the game state object.
2. Add the system's state to serialization — what gets saved?
3. Add the system's state to deserialization — what gets restored?
4. Bump save version and create migration — old saves initialize the new system with defaults.
5. Add the system to the restore order — where in the dependency chain does it belong?
6. Test: old saves load with the new system in default state.

### Adding a migration

1. Define the transformation — what does version N+1 look like compared to version N?
2. Write the migration function: `migrate_vN_to_vN1(saveData) → newSaveData`.
3. Register the migration in the migration chain.
4. Test with real old-format saves.
5. Ensure the migration is reversible for debugging (optional but valuable).
6. Test that migrating and then saving produces a correct vN1 save.

### Adding a version

1. Determine what changed — new fields? restructured data? removed fields?
2. Bump the version number in the game constants.
3. Create migration(s) from the previous version(s).
4. Update serialization to write the new version.
5. Update deserialization to read the new version and apply migrations.
6. Test the full cycle: old version → migration → load → save → load.

---

## 15 — Invariants

These must never be violated. If a change breaks one, the change is wrong.

- **Loading a save always produces a playable game state** — never a crash, never a blank screen, never an unresponsive state. Degraded is acceptable; dead is not.
- **Saving never corrupts the previous save** — the atomic write pattern ensures the old file survives any failure during save.
- **Save version is always included in the save file** — loading code can always determine which migration path to follow.
- **Migration never deletes player data** — it adds, transforms, or defaults. Never removes.
- **Save and immediate load produces identical game state** — no state leakage, no simulation ticks on load, no random generation during deserialization.
- **Transient data is never included in saves** — undo stacks, UI state, animation flags, and cached values are excluded.
- **Auto-save runs after every completed tick** — the player never loses more than one week of progress on crash.
- **Corrupted saves are preserved, not overwritten** — the damaged file is kept for debugging. Recovery uses a backup or safe defaults.
- **Save operations are non-blocking where possible** — the game does not freeze during auto-save.
- **Load order respects system dependencies** — fighters are not loaded before the economy they depend on.

---

## 16 — Common Mistakes

### Saving transient state

Including undo stacks, UI state, or cached calculations in the save file. These values are meaningful only within the current session. Loading them from a save produces bugs — the game "remembers" a UI state from weeks ago, or an undo stack that references objects no longer in memory.

### Forgetting to exclude transient state before serialization

The game state object (`g`) contains both persistent and transient data. If the save system serializes the entire object without filtering, transient data leaks into the save. The solution: explicitly clone and strip transient fields before serialization.

### Migration that doesn't handle edge cases

A migration that assumes every fighter has a `record` property — and crashes when encountering a fighter generated before records were tracked. Every migration must handle the possibility that the data it expects may be missing or in an unexpected format.

### Changing save format without bumping version

Adding a new field to the save format but forgetting to bump the version number. The load system doesn't know to run the migration. Old saves load with undefined values. New saves have extra fields that old load code ignores — creating hidden inconsistency.

### Loading triggers simulation

The act of loading a save calls functions that advance the game state — a tick function fires, an event generates, a timer starts. The player sees Week 101 instead of Week 100 and doesn't understand why. Load must be a pure read operation.

### Silent save failures

A save operation fails (disk full, permission error, serialization exception) and the game continues without notifying the player. The player plays for hours and discovers on next load that none of it was saved. Save failures must be loud and immediate.

### Assuming save files are small

Adding large data structures to the save without considering file size. Saves grow over time as the player accumulates fighters, history, and events. A save format that works at Week 10 may be bloated at Week 500. Test with long-running saves.

### Restoring systems in wrong order

Loading rankings before fighters are loaded — the rankings reference fighter IDs that don't exist yet. Loading events before the world state is loaded — events reference divisions that haven't been created. Dependency order matters.

---

## 17 — Related Documents

| Document | What It Covers |
|----------|---------------|
| `PROJECT_CONSTITUTION.md` | Priority order, DoD — "Save data > regressions" |
| `01_PROJECT_OVERVIEW.md` | High-level systems map, data flow, state object structure |
| `02_ARCHITECTURE.md` | Layer rules, state management, ADRs |
| `knowledge/01_combat.md` | Combat — state that must be saved and restored |
| `knowledge/02_TRAINING.md` | Training — state that must be saved and restored |
| `knowledge/03_FIGHTER.md` | Fighter — the most critical entity to persist |
| `knowledge/04_WORLD.md` | World — divisions, AI fighters, history to persist |
| `knowledge/05_ECONOMY.md` | Economy — cash, sponsors, contracts to persist |
| `knowledge/06_EVENTS.md` | Events — timeline, flags, chains to persist |
| `hooks/useSaveLoad.js` | Save/load hook implementation |
| `services/saveService.js` | Save persistence service |
| `hooks/useGameState.js` | State management — auto-save trigger |
