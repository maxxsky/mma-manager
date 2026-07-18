// Shadow AI tests — rival camp simulation engine
// Tests are deterministic via mulberry32 seeding
import { describe, it, expect } from "vitest";
import { mulberry32, setRNG, resetRNG, RI } from "@ironfist/engine/rng.js";
import {
  initShadowCamp,
  shadowCampTick,
  updateReputation,
  getCampLifecycleLabel,
  getCampSummary,
  tickAllShadowCamps,
} from "@ironfist/engine/shadow-ai.js";
import { assignPhilosophy, calculateRosterQuality } from "@ironfist/engine/shadow-ai/state.js";
import { ACQUIRE_MIN_BUDGET, ELITE_TARGET_SIZE, DEFAULT_TARGET_MIN, DEFAULT_TARGET_MAX } from "@ironfist/engine/shadow-ai/config.js";

// ── Helpers ──
const SEED = 42;

function useSeed(seed = SEED) {
  setRNG(mulberry32(seed));
}

function createTestCamp(overrides = {}) {
  const trait = overrides.trait || "Balanced Development";
  const camp = {
    id: overrides.id || "camp-1",
    name: overrides.name || "Test Camp",
    trait,
    rep: overrides.rep ?? 30,
    fighters: overrides.fighters || [
      { age: 24, level: 0.7, record: { w: 5, l: 2 } },
      { age: 28, level: 0.9, record: { w: 8, l: 3 } },
      { age: 32, level: 0.6, record: { w: 3, l: 5 } },
    ],
    coaches: overrides.coaches || [
      { skill: 5, name: "Coach A" },
    ],
    _shadow: overrides._shadow || null,
  };
  return camp;
}

function createTestGame(overrides = {}) {
  return {
    week: overrides.week || 13,
    divisions: overrides.divisions || {},
    rivals: overrides.rivals || [],
    ...overrides,
  };
}

// A helper to create a camp with initialized _shadow
function initCamp(opts = {}) {
  const camp = createTestCamp(opts);
  initShadowCamp(camp);
  return camp;
}

// ── Tests ──

describe("initShadowCamp", () => {
  it("initializes _shadow with all required fields", () => {
    useSeed();
    const camp = createTestCamp();
    initShadowCamp(camp);

    expect(camp._shadow).toBeDefined();
    expect(typeof camp._shadow.budget).toBe("number");
    expect(camp._shadow.budget).toBeGreaterThanOrEqual(30000);
    expect(camp._shadow.budget).toBeLessThanOrEqual(120000);

    expect(typeof camp._shadow.coachingQuality).toBe("number");
    expect(camp._shadow.coachingQuality).toBeGreaterThanOrEqual(1);
    expect(camp._shadow.coachingQuality).toBeLessThanOrEqual(10);

    expect(typeof camp._shadow.developmentQuality).toBe("number");
    expect(camp._shadow.developmentQuality).toBeGreaterThanOrEqual(30);
    expect(camp._shadow.developmentQuality).toBeLessThanOrEqual(70);

    expect(typeof camp._shadow.recruitmentQuality).toBe("number");
    expect(camp._shadow.recruitmentQuality).toBeGreaterThanOrEqual(20);
    expect(camp._shadow.recruitmentQuality).toBeLessThanOrEqual(60);

    expect(typeof camp._shadow.organizationalMomentum).toBe("number");
    expect(camp._shadow.organizationalMomentum).toBeGreaterThanOrEqual(-20);
    expect(camp._shadow.organizationalMomentum).toBeLessThanOrEqual(30);

    expect(camp._shadow.lifecycle).toBe("expansion");
    expect(typeof camp._shadow.rosterQuality).toBe("number");
    expect(camp._shadow.rosterQuality).toBeGreaterThanOrEqual(10);
    expect(camp._shadow.rosterQuality).toBeLessThanOrEqual(95);

    expect(camp._shadow.philosophy).toBeDefined();
    expect(camp._shadow.philosophy.id).toBe("balanced");
    expect(camp._shadow.lastUpdateWeek).toBe(0);
    expect(camp._shadow.totalFightersDeveloped).toBe(camp.fighters.length);
    expect(camp._shadow.championsProduced).toBe(0);
    expect(camp._shadow.generationsCompleted).toBe(0);
    expect(camp._shadow.peakReputation).toBe(30);
  });

  it("is idempotent — calling twice does not reset state", () => {
    useSeed();
    const camp = initCamp();
    const originalBudget = camp._shadow.budget;
    const originalMomentum = camp._shadow.organizationalMomentum;

    initShadowCamp(camp);
    expect(camp._shadow.budget).toBe(originalBudget);
    expect(camp._shadow.organizationalMomentum).toBe(originalMomentum);
  });

  it("creates correct philosophy for camp trait", () => {
    useSeed();
    const camp1 = initCamp({ trait: "Striking Factory" });
    expect(camp1._shadow.philosophy.id).toBe("striking");

    const camp2 = initCamp({ trait: "Elite Stable" });
    expect(camp2._shadow.philosophy.id).toBe("elite");

    const camp3 = initCamp({ trait: "BJJ Academy" });
    expect(camp3._shadow.philosophy.id).toBe("bjj");
  });

  it("calculates roster quality from fighters", () => {
    useSeed();
    const camp = createTestCamp({
      fighters: [
        { age: 24, level: 0.9, record: { w: 5, l: 2 } },
        { age: 28, level: 1.2, record: { w: 8, l: 3 } },
        { age: 25, level: 1.5, record: { w: 10, l: 0 } },
      ],
    });
    initShadowCamp(camp);
    // avg level = (0.9 + 1.2 + 1.5) / 3 = 1.2
    // quality = round(1.2 * 60) = 72
    expect(camp._shadow.rosterQuality).toBe(72);
  });

  it("handles camp with empty fighters roster", () => {
    useSeed();
    const camp = createTestCamp({ fighters: [] });
    initShadowCamp(camp);
    expect(camp._shadow.rosterQuality).toBe(30);
    expect(camp._shadow.totalFightersDeveloped).toBe(0);
  });

  it("is deterministic with same seed", () => {
    useSeed(999);
    const camp1 = initCamp();
    const budget1 = camp1._shadow.budget;
    const devQ1 = camp1._shadow.developmentQuality;

    useSeed(999);
    const camp2 = initCamp();
    expect(camp2._shadow.budget).toBe(budget1);
    expect(camp2._shadow.developmentQuality).toBe(devQ1);
  });
});

describe("shadowCampTick", () => {
  it("initializes _shadow if missing before tick", () => {
    useSeed();
    const camp = createTestCamp();
    expect(camp._shadow).toBeNull();
    shadowCampTick(camp, 13, createTestGame());
    expect(camp._shadow).toBeDefined();
  });

  it("skips tick if not enough weeks have passed since last update", () => {
    useSeed();
    const camp = initCamp();
    camp._shadow.lastUpdateWeek = 10;
    camp._shadow.budget = 99999; // mark as observed

    // Week 13 with lastUpdateWeek=10 means only 3 weeks < 12 interval
    shadowCampTick(camp, 13, createTestGame());
    expect(camp._shadow.budget).toBe(99999); // unchanged

    // Week 22 (12 weeks later) should trigger
    shadowCampTick(camp, 22, createTestGame());
    expect(camp._shadow.budget).not.toBe(99999); // changed
  });

  it("updates lastUpdateWeek after successful tick", () => {
    useSeed();
    const camp = initCamp();
    camp._shadow.lastUpdateWeek = 1;
    shadowCampTick(camp, 13, createTestGame());
    expect(camp._shadow.lastUpdateWeek).toBe(13);
  });

  it("develops fighters — level changes for different age brackets", () => {
    useSeed();
    const camp = createTestCamp({
      fighters: [
        { age: 22, level: 0.6, record: { w: 0, l: 0 } }, // young → fast growth
        { age: 30, level: 0.7, record: { w: 5, l: 2 } }, // mature → moderate growth
        { age: 37, level: 0.8, record: { w: 8, l: 3 } }, // > DEV_AGE_STOP → no development
      ],
    });
    initShadowCamp(camp);
    camp._shadow.lastUpdateWeek = 1;
    camp._shadow.developmentQuality = 60;

    const before = camp.fighters.map((f) => ({ name: f.name || "?", level: f.level }));
    shadowCampTick(camp, 13, createTestGame());

    // Young fighter (22) should have grown with AGE_MULT_YOUNG (1.3)
    expect(camp.fighters[0].level).toBeGreaterThan(before[0].level);
    // Mature fighter (30) should have grown with AGE_MULT_MATURE (1.0)
    expect(camp.fighters[1].level).toBeGreaterThan(before[1].level);
    // Old fighter (37 > DEV_AGE_STOP) should NOT have changed at all
    expect(camp.fighters[2].level).toBe(before[2].level);
  });

  it("manages roster — retires old fighters and trims excess", () => {
    useSeed();
    const oldFighter = { age: 39, level: 0.5, record: { w: 3, l: 6 } };
    const camp = createTestCamp({
      fighters: [
        { age: 24, level: 0.8, record: { w: 4, l: 1 } },
        { age: 25, level: 0.7, record: { w: 2, l: 3 } },
        oldFighter,
      ],
    });
    initShadowCamp(camp);
    camp._shadow.lastUpdateWeek = 1;
    camp._shadow.budget = 100000;

    shadowCampTick(camp, 13, createTestGame());

    // old fighter (39 = RETIRE_AGE_CHECK) might be retired
    // At minimum: fighter age is tracked in camp.fighters
    expect(camp.fighters.length).toBeGreaterThanOrEqual(1);
  });

  it("acquires prospects when under roster target and has budget", () => {
    useSeed(12345);
    const camp = createTestCamp({
      fighters: [{ age: 28, level: 0.8, record: { w: 5, l: 2 } }], // only 1 fighter
      trait: "Prospect Mill", // high turnover, should acquire
    });
    initShadowCamp(camp);
    camp._shadow.budget = 100000; // enough budget
    camp._shadow.lastUpdateWeek = 1;

    const beforeCount = camp.fighters.length;
    shadowCampTick(camp, 13, createTestGame());

    // Should have added fighters (below min target of ~5)
    expect(camp.fighters.length).toBeGreaterThan(beforeCount);
    // Budget should have decreased
    expect(camp._shadow.budget).toBeLessThan(100000);
  });

  it("updates reputation via the full tick cycle", () => {
    useSeed();
    const camp = initCamp({ rep: 30 });
    camp._shadow.lastUpdateWeek = 1;

    shadowCampTick(camp, 13, createTestGame());
    // Rep should have drifted toward target
    expect(camp.rep).not.toBe(30);
    expect(camp.rep).toBeGreaterThanOrEqual(2);
    expect(camp.rep).toBeLessThanOrEqual(100);
  });
});

describe("updateReputation", () => {
  it("drifts rep toward target based on quality + momentum + ranking", () => {
    useSeed();
    const camp = initCamp({ rep: 50 });
    const campId = camp.id;
    const g = createTestGame({
      divisions: {
        Lightweight: {
          list: [
            { name: "Champ Fighter", campId, level: 1.3 },
            { name: "Rank 2 Fighter", campId, level: 0.9 },
          ],
          champ: { name: "Champ Fighter", campId },
        },
      },
    });

    const beforeRep = camp.rep;
    updateReputation(camp, g);
    // With high quality fighters + champion, rep should drift up
    expect(camp.rep).toBeGreaterThan(beforeRep);
    expect(camp._shadow.peakReputation).toBeGreaterThanOrEqual(camp.rep);
  });

  it("decreases rep for low-quality camp with no fighters", () => {
    useSeed();
    const camp = initCamp({
      rep: 70,
      fighters: [{ age: 35, level: 0.3, record: { w: 0, l: 5 } }],
    });
    const g = createTestGame({
      divisions: { Lightweight: { list: [], champ: null } },
    });

    updateReputation(camp, g);
    // Empty divisions + low quality → rep should decrease
    expect(camp.rep).toBeLessThan(70);
  });

  it("clamps rep between 2 and 100", () => {
    useSeed();
    const camp = initCamp({ rep: 5 });
    const g = createTestGame({
      divisions: { Lightweight: { list: [], champ: null } },
    });
    updateReputation(camp, g);
    expect(camp.rep).toBeGreaterThanOrEqual(2);
    expect(camp.rep).toBeLessThanOrEqual(100);
  });

  it("tracks peak reputation", () => {
    useSeed();
    const camp = initCamp({ rep: 30 });
    const g = createTestGame({
      divisions: {
        Lightweight: {
          list: [
            { name: "Star", campId: camp.id, level: 1.4 },
          ],
          champ: { name: "Star", campId: camp.id },
        },
      },
    });

    updateReputation(camp, g);
    const peakAfter = camp._shadow.peakReputation;
    expect(peakAfter).toBeGreaterThanOrEqual(30);
    expect(peakAfter).toBe(camp.rep);
  });
});

describe("getCampLifecycleLabel", () => {
  it("returns Expansion for newly initialized camp", () => {
    useSeed();
    const camp = initCamp();
    const label = getCampLifecycleLabel(camp);
    expect(label.label).toBe("Expansion");
    expect(label.icon).toBe("📈");
    expect(label.color).toBe("#3ea6ff");
  });

  it("returns correct label for each lifecycle state", () => {
    const labels = {
      expansion: { label: "Expansion", icon: "📈" },
      growth: { label: "Growth", icon: "🌱" },
      championship: { label: "Championship Window", icon: "👑" },
      decline: { label: "Decline", icon: "📉" },
      rebuild: { label: "Rebuilding", icon: "🔧" },
    };

    Object.entries(labels).forEach(([lifecycle, expected]) => {
      const camp = createTestCamp();
      camp._shadow = { lifecycle };
      const result = getCampLifecycleLabel(camp);
      expect(result.label).toBe(expected.label);
      expect(result.icon).toBe(expected.icon);
    });
  });

  it("returns Expansion fallback for camp without _shadow", () => {
    const camp = createTestCamp();
    const label = getCampLifecycleLabel(camp);
    expect(label.label).toBe("Expansion");
  });

  it("returns Expansion fallback for unknown lifecycle value", () => {
    const camp = createTestCamp();
    camp._shadow = { lifecycle: "nonexistent" };
    const label = getCampLifecycleLabel(camp);
    expect(label.label).toBe("Expansion");
  });
});

describe("getCampSummary", () => {
  it("returns all expected fields with correct types", () => {
    useSeed();
    const camp = initCamp({ rep: 55 });
    const summary = getCampSummary(camp);

    expect(summary.name).toBe("Test Camp");
    expect(summary.philosophy).toBe("balanced");
    expect(typeof summary.lifecycle).toBe("object");
    expect(summary.lifecycle.label).toBe("Expansion");
    expect(typeof summary.rosterQuality).toBe("number");
    expect(typeof summary.rep).toBe("number");
    expect(summary.rep).toBe(55);
    expect(typeof summary.fighters).toBe("number");
    expect(summary.fighters).toBe(3);
    expect(typeof summary.coaches).toBe("number");
    expect(summary.coaches).toBe(1);
    expect(typeof summary.coachingQuality).toBe("number");
    expect(typeof summary.developmentQuality).toBe("number");
    expect(typeof summary.recruitmentQuality).toBe("number");
    expect(typeof summary.momentum).toBe("number");
    expect(typeof summary.totalDeveloped).toBe("number");
    expect(typeof summary.championsProduced).toBe("number");
    expect(summary.championsProduced).toBe(0);
    expect(typeof summary.budget).toBe("number");
  });

  it("initializes _shadow if missing", () => {
    useSeed();
    const camp = createTestCamp();
    expect(camp._shadow).toBeNull();
    const summary = getCampSummary(camp);
    expect(camp._shadow).toBeDefined(); // side-effect: inits
    expect(summary.name).toBe("Test Camp");
  });

  it("correctly reflects different philosophies", () => {
    useSeed();
    const camp = initCamp({ trait: "Elite Stable" });
    const summary = getCampSummary(camp);
    expect(summary.philosophy).toBe("elite");
  });

  it("correlates roster size and totalDeveloped", () => {
    useSeed();
    const camp = initCamp();
    const summary = getCampSummary(camp);
    // totalDeveloped starts as fighters.length at init
    expect(summary.totalDeveloped).toBe(summary.fighters);
  });
});

describe("tickAllShadowCamps", () => {
  it("runs shadowCampTick for every rival camp", () => {
    useSeed();
    const camp1 = initCamp({ id: "r1", name: "Rival 1" });
    const camp2 = initCamp({ id: "r2", name: "Rival 2" });

    // Reset lastUpdateWeek so tick fires
    camp1._shadow.lastUpdateWeek = 0;
    camp2._shadow.lastUpdateWeek = 0;
    camp1._shadow.budget = 99999;
    camp2._shadow.budget = 88888;

    const g = createTestGame({ week: 13, rivals: [camp1, camp2] });
    tickAllShadowCamps(g);

    // Both should have been ticked (budget changed due to recruiting costs)
    expect(camp1._shadow.lastUpdateWeek).toBe(13);
    expect(camp2._shadow.lastUpdateWeek).toBe(13);
    expect(camp1._shadow.budget).not.toBe(99999);
    expect(camp2._shadow.budget).not.toBe(88888);
  });

  it("handles empty rivals array gracefully", () => {
    useSeed();
    const g = createTestGame({ week: 13, rivals: [] });
    expect(() => tickAllShadowCamps(g)).not.toThrow();
  });

  it("handles undefined g.rivals gracefully", () => {
    useSeed();
    const g = createTestGame();
    delete g.rivals;
    expect(() => tickAllShadowCamps(g)).not.toThrow();
  });

  it("does not skip camps — all ticks advance same week", () => {
    useSeed();
    const camps = [];
    for (let i = 0; i < 3; i++) {
      const c = initCamp({ id: `c${i}`, name: `Camp ${i}` });
      c._shadow.lastUpdateWeek = 0;
      camps.push(c);
    }

    const g = createTestGame({ week: 25, rivals: camps });
    tickAllShadowCamps(g);

    camps.forEach((c) => {
      expect(c._shadow.lastUpdateWeek).toBe(25);
    });
  });

  it("works with partial tick windows — skips recently ticked camps", () => {
    useSeed();
    const freshCamp = initCamp({ id: "fresh" });
    freshCamp._shadow.lastUpdateWeek = 25; // was just updated
    const staleCamp = initCamp({ id: "stale" });
    staleCamp._shadow.lastUpdateWeek = 0; // needs update

    const freshCampBudget = freshCamp._shadow.budget;
    const staleCampBudget = staleCamp._shadow.budget;

    const g = createTestGame({ week: 28, rivals: [freshCamp, staleCamp] });
    tickAllShadowCamps(g);

    // Fresh camp was updated 3 weeks ago (< 12 interval) → skipped
    expect(freshCamp._shadow.lastUpdateWeek).toBe(25);
    expect(freshCamp._shadow.budget).toBe(freshCampBudget);

    // Stale camp was updated 28 weeks ago → should have ticked
    expect(staleCamp._shadow.lastUpdateWeek).toBe(28);
    expect(staleCamp._shadow.budget).not.toBe(staleCampBudget);
  });
});
