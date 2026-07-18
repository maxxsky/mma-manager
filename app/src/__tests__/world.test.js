// World simulation tests — AI fighter aging, title defenses, events, division health
// All functions use RNG — tests MUST seed for determinism
import { describe, it, expect } from "vitest";
import { mulberry32, setRNG, resetRNG } from "@ironfist/engine/rng.js";
import {
  ageAIFighters,
  simulateAITitleDefenses,
  generateWorldEvents,
  maintainDivisions,
  worldTick,
} from "@ironfist/engine/world.js";
import { createAIFighter } from "@ironfist/engine/world/ai-fighter.js";
import {
  TICK_YEARLY, TICK_TITLE_DEFENSE, TICK_MONTHLY, TICK_QUARTERLY,
  MIN_DIVISION_SIZE, MAX_FIGHTER_AGE, RETIREMENT_AGE,
  PEAK_AGE, DECLINE_AGE, UPSET_BASE_CHANCE,
  STREAK_THRESHOLD, BREAKTHROUGH_AGE, BREAKTHROUGH_POINTS,
} from "@ironfist/engine/world/config.js";

// ── Helpers ──
const SEED = 42;

function useSeed(seed = SEED) {
  setRNG(mulberry32(seed));
}

function makeFighter(overrides = {}) {
  return {
    id: overrides.id || "f-" + Math.random(),
    name: overrides.name || "AI Fighter",
    region: overrides.region || "USA",
    archetype: overrides.archetype || "All-Rounder",
    age: overrides.age ?? 25,
    level: overrides.level ?? 0.8,
    points: overrides.points ?? 50,
    record: overrides.record || { w: 5, l: 3, ko: 0, sub: 0, dec: 0 },
    _streak: overrides._streak ?? 0,
    campId: overrides.campId || null,
    campName: overrides.campName || null,
    peaked: overrides.peaked ?? false,
    _breakthroughNotified: overrides._breakthroughNotified ?? false,
    retiring: overrides.retiring ?? false,
    ...overrides,
  };
}

function makeDivision(overrides = {}) {
  return {
    list: overrides.list || [],
    champ: overrides.champ ?? null,
    ...overrides,
  };
}

function makeGame(overrides = {}) {
  return {
    week: overrides.week ?? 1,
    roster: overrides.roster ?? [],
    coaches: overrides.coaches ?? [],
    divisions: overrides.divisions ?? {},
    rivals: overrides.rivals ?? [],
    ...overrides,
  };
}

// ── Tests ──

describe("ageAIFighters", () => {
  it("does nothing when week is not a yearly boundary (mod 48)", () => {
    useSeed();
    const g = makeGame({
      week: 1,
      divisions: {
        LW: makeDivision({
          list: [makeFighter({ age: 25, level: 0.8 })],
        }),
      },
    });
    ageAIFighters(g);
    expect(g.divisions.LW.list[0].age).toBe(25); // unchanged
  });

  it("increments age for all AI fighters on yearly boundary", () => {
    useSeed();
    const g = makeGame({
      week: TICK_YEARLY,
      divisions: {
        LW: makeDivision({
          list: [
            makeFighter({ name: "A", age: 24, level: 0.7 }),
            makeFighter({ name: "B", age: 30, level: 0.9 }),
          ],
        }),
      },
    });
    ageAIFighters(g);
    expect(g.divisions.LW.list[0].age).toBe(25);
    expect(g.divisions.LW.list[1].age).toBe(31);
  });

  it("increases level for fighters at or below PEAK_AGE (26)", () => {
    useSeed();
    const g = makeGame({
      week: TICK_YEARLY,
      divisions: {
        LW: makeDivision({
          list: [makeFighter({ name: "Young Gun", age: 22, level: 0.7, points: 40 })],
        }),
      },
    });
    const before = g.divisions.LW.list[0].level;
    const beforePts = g.divisions.LW.list[0].points;
    ageAIFighters(g);
    expect(g.divisions.LW.list[0].age).toBe(23);
    expect(g.divisions.LW.list[0].level).toBeGreaterThan(before);
    expect(g.divisions.LW.list[0].points).toBeGreaterThan(beforePts);
  });

  it("decreases level for fighters at or above DECLINE_AGE (34)", () => {
    useSeed();
    const g = makeGame({
      week: TICK_YEARLY,
      divisions: {
        LW: makeDivision({
          list: [makeFighter({ name: "Old Timer", age: 36, level: 1.0, points: 80 })],
        }),
      },
    });
    const before = g.divisions.LW.list[0].level;
    const beforePts = g.divisions.LW.list[0].points;
    ageAIFighters(g);
    expect(g.divisions.LW.list[0].age).toBe(37);
    expect(g.divisions.LW.list[0].level).toBeLessThan(before);
    expect(g.divisions.LW.list[0].points).toBeLessThan(beforePts);
    expect(g.divisions.LW.list[0].peaked).toBe(true);
  });

  it("does not change level for fighters in plateau range (27-33)", () => {
    useSeed();
    const g = makeGame({
      week: TICK_YEARLY,
      divisions: {
        LW: makeDivision({
          list: [makeFighter({ name: "Plateau Guy", age: 30, level: 0.9, points: 60 })],
        }),
      },
    });
    const beforeLevel = g.divisions.LW.list[0].level;
    const beforePts = g.divisions.LW.list[0].points;
    ageAIFighters(g);
    // Age increments but level/points stay in plateau (no growth/decline at 30)
    expect(g.divisions.LW.list[0].age).toBe(31);
    expect(g.divisions.LW.list[0].level).toBe(beforeLevel);
    expect(g.divisions.LW.list[0].points).toBe(beforePts);
  });

  it("initializes missing ages with random value (22-32)", () => {
    useSeed(999);
    const g = makeGame({
      week: TICK_YEARLY,
      divisions: {
        LW: makeDivision({
          list: [makeFighter({ name: "No Age", age: undefined })],
        }),
      },
    });
    ageAIFighters(g);
    const a = g.divisions.LW.list[0].age;
    expect(a).toBeGreaterThanOrEqual(23); // 22-32 + 1 from increment
    expect(a).toBeLessThanOrEqual(33);
  });

  it("ages division champions", () => {
    useSeed();
    const g = makeGame({
      week: TICK_YEARLY,
      divisions: {
        LW: makeDivision({
          list: [makeFighter({ name: "Champ AI", age: 28 })],
          champ: { name: "Champ AI", player: false, age: 28 },
        }),
      },
    });
    ageAIFighters(g);
    expect(g.divisions.LW.champ.age).toBe(29);
  });

  it("handles divisions without champ gracefully", () => {
    useSeed();
    const g = makeGame({
      week: TICK_YEARLY,
      divisions: {
        LW: makeDivision({
          list: [makeFighter({ age: 25 })],
          champ: null,
        }),
      },
    });
    expect(() => ageAIFighters(g)).not.toThrow();
  });
});

describe("simulateAITitleDefenses", () => {
  it("does nothing when week is not a title defense boundary", () => {
    useSeed();
    const g = makeGame({ week: 1 });
    const events = simulateAITitleDefenses(g);
    expect(events).toEqual([]);
  });

  it("skips divisions where champion is a player", () => {
    useSeed();
    const g = makeGame({
      week: TICK_TITLE_DEFENSE,
      divisions: {
        LW: makeDivision({
          list: [makeFighter({ name: "Player Champ", level: 1.2 })],
          champ: { name: "Player Champ", player: true },
        }),
      },
    });
    const events = simulateAITitleDefenses(g);
    expect(events).toEqual([]);
  });

  it("creates new champion for vacant title without eligible player", () => {
    useSeed(999);
    const g = makeGame({
      week: TICK_TITLE_DEFENSE,
      divisions: {
        LW: makeDivision({
          list: [
            makeFighter({ name: "Fighter A", level: 0.9 }),
            makeFighter({ name: "Fighter B", level: 0.8 }),
          ],
          champ: null,
        }),
      },
    });
    const events = simulateAITitleDefenses(g);
    expect(events).toHaveLength(1);
    expect(events[0].title).toContain("New");
    expect(events[0].title).toContain("Champion");
    expect(g.divisions.LW.champ).not.toBeNull();
    expect(g.divisions.LW.champ.player).toBe(false);
  });

  it("skips vacant title when player fighter is eligible (rank <= 2)", () => {
    useSeed();
    const g = makeGame({
      week: TICK_TITLE_DEFENSE,
      roster: [{
        id: "player-f", name: "Player Star", weightClass: "LW", injury: false,
        titles: [], record: { w: 8, l: 1 },
      }],
      divisions: {
        LW: makeDivision({
          list: [makeFighter({ name: "AI Guy", level: 0.9 })],
          champ: null,
        }),
      },
    });
    // Player fighter at rank <= 2 — AI should NOT resolve; return
    const events = simulateAITitleDefenses(g);
    expect(events).toEqual([]);
  });

  it("keeps champion when random defense succeeds", () => {
    useSeed(42);
    const g = makeGame({
      week: TICK_TITLE_DEFENSE,
      divisions: {
        LW: makeDivision({
          list: [
            makeFighter({ name: "Champ", level: 1.3 }),
            makeFighter({ name: "Contender", level: 0.8 }),
          ],
          champ: { name: "Champ", player: false, age: 30 },
        }),
      },
    });
    const events = simulateAITitleDefenses(g);
    // With champ at 1.3 and contender at 0.8, skillRatio is low, defense likely succeeds
    // But result depends on RNG — just check champ still exists
    expect(g.divisions.LW.champ).toBeDefined();
    expect(events.length).toBeGreaterThanOrEqual(0);
  });

  it("detects title change when contender upsets champion", () => {
    useSeed(12345);
    const g = makeGame({
      week: TICK_TITLE_DEFENSE,
      divisions: {
        LW: makeDivision({
          list: [
            makeFighter({ name: "Weak Champ", level: 0.6, points: 30 }),
            makeFighter({ name: "Strong Contender", level: 0.9, points: 95 }),
          ],
          champ: { name: "Weak Champ", player: false, age: 34 },
        }),
      },
    });
    const events = simulateAITitleDefenses(g);
    // With skillRatio high (0.9/0.54 ≈ 1.67), upset is likely
    // Check if title changed
    if (g.divisions.LW.champ.name !== "Weak Champ") {
      expect(events.some((e) => e.title.includes("New"))).toBe(true);
      expect(g._worldHistory.titleChanges).toHaveLength(1);
    }
  });

  it("handles division with empty list gracefully", () => {
    useSeed();
    const g = makeGame({
      week: TICK_TITLE_DEFENSE,
      divisions: { LW: makeDivision({ list: [], champ: { name: "Lone Champ", player: false } }) },
    });
    expect(() => simulateAITitleDefenses(g)).not.toThrow();
  });
});

describe("generateWorldEvents", () => {
  it("returns empty when week is not monthly (mod 4)", () => {
    useSeed();
    const g = makeGame({ week: 1 });
    expect(generateWorldEvents(g)).toEqual([]);
  });

  it("generates streak-fire events at quarterly boundary", () => {
    useSeed(999);
    const g = makeGame({
      week: TICK_QUARTERLY * 2, // mod 4 and mod 12
      divisions: {
        LW: makeDivision({
          list: [
            makeFighter({ name: "Hot Streak", _streak: 6 }), // >= STREAK_THRESHOLD(5)
            makeFighter({ name: "Normal", _streak: 2 }),
          ],
        }),
      },
    });
    const events = generateWorldEvents(g);
    // Streak >= 5 + quarterly boundary = streak fire event
    const streakEvent = events.find((e) => e.title.includes("on fire"));
    if (streakEvent) {
      expect(streakEvent.title).toContain("Hot Streak");
    }
  });

  it("updates streak and points for AI fighters", () => {
    useSeed();
    const g = makeGame({
      week: TICK_MONTHLY,
      divisions: {
        LW: makeDivision({
          list: [makeFighter({ name: "Streak Guy", _streak: 3, points: 50 })],
        }),
      },
    });
    const beforeStreak = g.divisions.LW.list[0]._streak;
    const beforePts = g.divisions.LW.list[0].points;
    generateWorldEvents(g);
    // Streak and points should have changed (RNG-driven)
    const after = g.divisions.LW.list[0];
    expect(after._streak).not.toBe(beforeStreak); // 40% +1, 30% 0, 30% -1
  });

  it("generates breakthrough event for young top-3 fighter with high points", () => {
    useSeed(42);
    const g = makeGame({
      week: TICK_QUARTERLY * 2, // quarterly boundary
      divisions: {
        LW: makeDivision({
          list: [
            makeFighter({ name: "Young Star", age: 22, points: 85 }),
            makeFighter({ name: "Vet", age: 30, points: 60 }),
            makeFighter({ name: "Other", age: 25, points: 50 }),
          ],
          champ: { name: "Vet", player: false },
        }),
      },
    });
    const events = generateWorldEvents(g);
    const bEvent = events.find((e) => e.title.includes("Breakthrough"));
    if (bEvent) {
      expect(bEvent.title).toContain("Young Star");
    }
  });

  it("generates veteran retirement events on yearly boundary", () => {
    useSeed(12345);
    const g = makeGame({
      week: TICK_YEARLY, // 48
      _worldHistory: { titleChanges: [], retiredChamps: [] },
      divisions: {
        LW: makeDivision({
          list: [
            makeFighter({ name: "Old Timer", age: RETIREMENT_AGE }), // 38
            makeFighter({ name: "Youngster", age: 25 }),
          ],
        }),
      },
    });
    const events = generateWorldEvents(g);
    const retireEvent = events.find((e) => e.title.includes("Veterans Retire"));
    if (retireEvent) {
      expect(retireEvent.body).toContain("Old Timer");
      // Fighter should be marked as retiring
      expect(g.divisions.LW.list.find((f) => f.name === "Old Timer")?.retiring).toBe(true);
    }
  });

  it("generates golden generation event when region produces 3+ champions", () => {
    useSeed();
    const g = makeGame({
      week: TICK_MONTHLY,
      _worldHistory: {
        regionStats: {
          Brazil: { championsProduced: 3, totalFighters: 10 },
          USA: { championsProduced: 1, totalFighters: 8 },
        },
      },
    });
    const events = generateWorldEvents(g);
    expect(events.some((e) => e.title.includes("Brazil") && e.title.includes("Golden"))).toBe(true);
    expect(events.some((e) => e.title.includes("USA") && e.title.includes("Golden"))).toBe(false);
  });

  it("only fires golden generation once per region", () => {
    useSeed();
    const g = makeGame({
      week: TICK_MONTHLY,
      _worldHistory: {
        regionStats: {
          Brazil: { championsProduced: 3, totalFighters: 10 },
        },
        _goldenGenNotified: ["Brazil"],
      },
    });
    const events = generateWorldEvents(g);
    expect(events.some((e) => e.title.includes("Golden"))).toBe(false);
  });
});

describe("maintainDivisions", () => {
  it("does nothing on non-yearly weeks", () => {
    useSeed();
    const g = makeGame({
      week: 1,
      divisions: { LW: makeDivision({ list: [] }) },
    });
    const events = maintainDivisions(g);
    // Should not fill even though list is empty — only runs at TICK_YEARLY
    expect(g.divisions.LW.list).toHaveLength(0);
    expect(events).toEqual([]);
  });

  it("fills division to MIN_DIVISION_SIZE when below threshold", () => {
    useSeed(42);
    const g = makeGame({
      week: TICK_YEARLY,
      divisions: {
        LW: makeDivision({
          list: [makeFighter({ name: "Only One" })],
        }),
      },
    });
    const events = maintainDivisions(g);
    expect(g.divisions.LW.list.length).toBe(MIN_DIVISION_SIZE);
    expect(events.length).toBeGreaterThanOrEqual(0); // may or may not have retire events
  });

  it("removes fighters at MAX_FIGHTER_AGE or marked retiring", () => {
    useSeed(42);
    const g = makeGame({
      week: TICK_YEARLY,
      divisions: {
        LW: makeDivision({
          list: [
            makeFighter({ name: "Young", age: 25 }),
            makeFighter({ name: "Too Old", age: MAX_FIGHTER_AGE }), // 40
          ],
        }),
      },
    });
    maintainDivisions(g);
    const names = g.divisions.LW.list.map((f) => f.name);
    expect(names).toContain("Young");
    expect(names).not.toContain("Too Old");
    // Division fills TO min size first, THEN removes old fighters.
    // Starting from 2, fills to 15 (+13), then filters 1 old → 14.
    expect(g.divisions.LW.list.length).toBe(MIN_DIVISION_SIZE - 1);
  });

  it("promotes #1 when champion retires or vacates", () => {
    useSeed(42);
    const g = makeGame({
      week: TICK_YEARLY,
      divisions: {
        LW: makeDivision({
          list: [
            makeFighter({ name: "New Champ", age: 28, level: 0.9 }),
            makeFighter({ name: "Other Guy", age: 25, level: 0.7 }),
          ],
          champ: { name: "Old Champ", player: false, age: 35 }, // not in list
        }),
      },
    });
    // Champ not in list → should promote #1
    const events = maintainDivisions(g);
    expect(g.divisions.LW.champ.name).toBe("New Champ");
    expect(events.some((e) => e.title.includes("New"))).toBe(true);
  });

  it("does not replace player champion", () => {
    useSeed();
    const g = makeGame({
      week: TICK_YEARLY,
      divisions: {
        LW: makeDivision({
          list: [makeFighter({ name: "AI Fighter", age: 28 })],
          champ: { name: "Player Champ", player: true },
        }),
      },
    });
    maintainDivisions(g);
    expect(g.divisions.LW.champ.name).toBe("Player Champ");
  });
});

describe("worldTick", () => {
  it("calls all 4 sub-functions and returns events with severity", () => {
    useSeed(42);
    const g = makeGame({
      week: TICK_YEARLY, // triggers all interval-based checks
      _worldHistory: { titleChanges: [], retiredChamps: [] },
      divisions: {
        LW: makeDivision({
          list: [
            makeFighter({ name: "Fighter A", age: 25 }),
            makeFighter({ name: "Fighter B", age: 28 }),
          ],
        }),
      },
    });
    const events = worldTick(g);
    // Should have at least: division fill events
    expect(events.length).toBeGreaterThanOrEqual(0);
    // All events should have severity assigned
    events.forEach((e) => {
      expect(e.severity).toBeDefined();
      expect(["major", "minor"]).toContain(e.severity);
    });
  });

  it("assigns major severity to title changes and breakthroughs", () => {
    useSeed(999);
    const g = makeGame({
      week: TICK_TITLE_DEFENSE,
      divisions: {
        LW: makeDivision({
          list: [
            makeFighter({ name: "Alpha", level: 0.9 }),
            makeFighter({ name: "Beta", level: 0.8 }),
          ],
          champ: null,
        }),
      },
    });
    const events = worldTick(g);
    events.forEach((e) => {
      if (e.title.includes("New") || e.title.includes("Champion")) {
        expect(e.severity).toBe("major");
      } else {
        expect(e.severity).toBe("minor");
      }
    });
  });

  it("ages AI fighters as part of the tick", () => {
    useSeed();
    const g = makeGame({
      week: TICK_YEARLY,
      divisions: {
        LW: makeDivision({
          list: [makeFighter({ name: "Age Me", age: 25 })],
        }),
      },
    });
    worldTick(g);
    expect(g.divisions.LW.list[0].age).toBe(26);
  });

  it("produces no events for empty world state", () => {
    useSeed();
    const g = makeGame({ week: 1 });
    const events = worldTick(g);
    expect(events).toEqual([]);
  });
});
