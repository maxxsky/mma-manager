// Training philosophy tests — cycles, coach recs, automation, identity
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import {
  getTrainingCycle,
  getCoachRecommendation,
  getLastTraining,
  saveLastTraining,
  autoRestoreTraining,
  bulkAssign,
  getTrainingIdentity,
  getDevelopmentPhilosophy,
} from "@ironfist/engine/training-philosophy.js";

// ── Polyfill localStorage for Node test environment ──
const store = {};
beforeAll(() => {
  global.localStorage = {
    getItem: (key) => store[key] ?? null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
});
beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
});

// ── Helpers ──

function makeFighter(overrides = {}) {
  return {
    id: overrides.id ?? "f-1",
    name: overrides.name ?? "Test Fighter",
    age: overrides.age ?? 25,
    weightClass: overrides.weightClass ?? "Lightweight",
    attrs: overrides.attrs ?? { striking: 60, wrestling: 50, bjj: 40, footwork: 55, strength: 58, cardio: 52, chin: 55, fightIQ: 50 },
    ceilings: overrides.ceilings ?? { striking: 80, wrestling: 75, bjj: 70, footwork: 78, strength: 76, cardio: 74, chin: 70, fightIQ: 72 },
    training: overrides.training ?? { type: "conditioning", intensity: "Medium" },
    trainingHistory: overrides.trainingHistory ?? [],
    overtraining: overrides.overtraining ?? 0,
    injury: overrides.injury ?? null,
    booked: overrides.booked ?? null,
    record: overrides.record ?? { w: 5, l: 1, ko: 0, sub: 0, dec: 5 },
    morale: overrides.morale ?? 60,
    ...overrides,
  };
}

function makeCoach(overrides = {}) {
  return {
    id: overrides.id ?? "c-1",
    name: overrides.name ?? "Coach A",
    specialty: overrides.specialty ?? "Striking",
    personality: overrides.personality ?? "Motivator",
    skill: overrides.skill ?? 5,
    ...overrides,
  };
}

// ── Tests ──

describe("getTrainingCycle", () => {
  it("returns Injury Recovery phase when fighter is injured", () => {
    const f = makeFighter({ injury: { weeks: 3, label: "Sprained Ankle" } });
    const cycle = getTrainingCycle(f);
    expect(cycle.phase).toBe("recovery");
    expect(cycle.label).toContain("Injury");
  });

  it("returns Fight Camp phase when booked and weeksLeft <= 2", () => {
    const f = makeFighter({ booked: { weeksLeft: 1 } });
    const cycle = getTrainingCycle(f);
    expect(cycle.phase).toBe("fight_camp");
  });

  it("does NOT return Fight Camp when booked but weeksLeft > 2", () => {
    const f = makeFighter({ booked: { weeksLeft: 4 } });
    const cycle = getTrainingCycle(f);
    expect(cycle.phase).not.toBe("fight_camp");
  });

  it("returns Recovery Needed when overtraining >= 75", () => {
    const f = makeFighter({ overtraining: 80 });
    const cycle = getTrainingCycle(f);
    expect(cycle.phase).toBe("recovery");
    expect(cycle.label).toContain("Recovery");
  });

  it("returns Overtraining Warning when overtraining >= 50", () => {
    const f = makeFighter({ overtraining: 60 });
    const cycle = getTrainingCycle(f);
    expect(cycle.phase).toBe("warning");
    expect(cycle.label).toContain("Overtraining");
  });

  it("returns maintenance phase when ceiling progress >= 0.90", () => {
    // attrs all at 90, ceilings all at 100 → progress = 90/100 = 0.90
    const f = makeFighter({
      attrs: { striking: 90, wrestling: 90, bjj: 90, footwork: 90, strength: 90, cardio: 90, chin: 90, fightIQ: 90 },
      ceilings: { striking: 100, wrestling: 100, bjj: 100, footwork: 100, strength: 100, cardio: 100, chin: 100, fightIQ: 100 },
    });
    const cycle = getTrainingCycle(f);
    expect(cycle.phase).toBe("maintenance");
  });

  it("returns refinement phase when ceiling progress >= 0.65", () => {
    const f = makeFighter({
      attrs: { striking: 70, wrestling: 65, bjj: 60, footwork: 68, strength: 66, cardio: 64, chin: 62, fightIQ: 60 },
      ceilings: { striking: 85, wrestling: 80, bjj: 85, footwork: 82, strength: 80, cardio: 78, chin: 75, fightIQ: 78 },
    });
    // avg progress = (70/85 + 65/80 + 60/85 + 68/82 + 66/80 + 64/78 + 62/75 + 60/78) / 8
    // ≈ (0.82 + 0.81 + 0.71 + 0.83 + 0.83 + 0.82 + 0.83 + 0.77) / 8 ≈ 0.80 → refinement
    const cycle = getTrainingCycle(f);
    expect(cycle.phase).toBe("refinement");
  });

  it("returns Veteran Care for age >= 34", () => {
    const f = makeFighter({ age: 35, record: { w: 10, l: 4 },
      attrs: { striking: 40, wrestling: 40, bjj: 40, footwork: 40, strength: 40, cardio: 40, chin: 40, fightIQ: 40 },
      ceilings: { striking: 90, wrestling: 90, bjj: 90, footwork: 90, strength: 90, cardio: 90, chin: 90, fightIQ: 90 },
    }); // ceilingProgress = 40/90 = 0.44 < 0.65, so age check triggers
    const cycle = getTrainingCycle(f);
    expect(cycle.phase).toBe("veteran");
    expect(cycle.label).toContain("Veteran");
  });

  it("returns Development for early career fighters (<= 3 total fights)", () => {
    const f = makeFighter({ record: { w: 1, l: 1 }, age: 22,
      attrs: { striking: 40, wrestling: 40, bjj: 40, footwork: 40, strength: 40, cardio: 40, chin: 40, fightIQ: 40 },
      ceilings: { striking: 90, wrestling: 90, bjj: 90, footwork: 90, strength: 90, cardio: 90, chin: 90, fightIQ: 90 },
    });
    const cycle = getTrainingCycle(f);
    expect(cycle.phase).toBe("development");
  });

  it("returns Peak Training for fighters in prime with no special conditions", () => {
    const f = makeFighter({ age: 26, record: { w: 8, l: 2 },
      attrs: { striking: 40, wrestling: 40, bjj: 40, footwork: 40, strength: 40, cardio: 40, chin: 40, fightIQ: 40 },
      ceilings: { striking: 90, wrestling: 90, bjj: 90, footwork: 90, strength: 90, cardio: 90, chin: 90, fightIQ: 90 },
    });
    const cycle = getTrainingCycle(f);
    expect(cycle.phase).toBe("peak");
  });

  it("prioritizes injury over all other conditions", () => {
    // Even if overtraining high AND booked → injury still wins
    const f = makeFighter({
      injury: { weeks: 1 },
      overtraining: 90,
      booked: { weeksLeft: 1 },
    });
    expect(getTrainingCycle(f).label).toContain("Injury");
  });
});

describe("getCoachRecommendation", () => {
  it("returns striking program for Striking coach", () => {
    const coach = makeCoach({ specialty: "Striking" });
    const recs = getCoachRecommendation(coach, makeFighter());
    expect(recs.some((r) => r.program === "striking")).toBe(true);
  });

  it("returns grappling program for Wrestling coach", () => {
    const coach = makeCoach({ specialty: "Wrestling" });
    const recs = getCoachRecommendation(coach, makeFighter());
    expect(recs.some((r) => r.program === "grappling")).toBe(true);
  });

  it("returns grappling program for BJJ coach", () => {
    const coach = makeCoach({ specialty: "BJJ" });
    const recs = getCoachRecommendation(coach, makeFighter());
    expect(recs.some((r) => r.program === "grappling")).toBe(true);
  });

  it("returns conditioning program for S&C coach", () => {
    const coach = makeCoach({ specialty: "S&C" });
    const recs = getCoachRecommendation(coach, makeFighter());
    expect(recs.some((r) => r.program === "conditioning")).toBe(true);
  });

  it("returns sparring program for Head coach", () => {
    const coach = makeCoach({ specialty: "Head" });
    const recs = getCoachRecommendation(coach, makeFighter());
    expect(recs.some((r) => r.program === "sparring")).toBe(true);
  });

  it("returns additional sparring rec for Motivator with low morale", () => {
    const coach = makeCoach({ personality: "Motivator" });
    const fighter = makeFighter({ morale: 30 });
    const recs = getCoachRecommendation(coach, fighter);
    // Motivator with morale < 50 adds a sparring rec
    expect(recs.some((r) => r.reason.includes("fired up"))).toBe(true);
  });

  it("does NOT add Motivator sparring for high morale fighter", () => {
    const coach = makeCoach({ personality: "Motivator" });
    const fighter = makeFighter({ morale: 70 });
    const recs = getCoachRecommendation(coach, fighter);
    expect(recs.some((r) => r.reason.includes("fired up"))).toBe(false);
  });

  it("Technician recommends fixing the lowest attribute", () => {
    const coach = makeCoach({ personality: "Technician", specialty: "Head" });
    const fighter = makeFighter({ attrs: { striking: 30, wrestling: 60, bjj: 50, footwork: 55, strength: 58, cardio: 52, chin: 55, fightIQ: 50 } });
    const recs = getCoachRecommendation(coach, fighter);
    // lowest attr = striking (30) → fixMap says "striking"
    expect(recs.some((r) => r.program === "striking" && r.reason.includes("striking"))).toBe(true);
  });

  it("Disciplinarian recommends recovery when overtraining > 40", () => {
    const coach = makeCoach({ personality: "Disciplinarian", specialty: "Head" });
    const fighter = makeFighter({ overtraining: 50 });
    const recs = getCoachRecommendation(coach, fighter);
    expect(recs.some((r) => r.program === "recovery")).toBe(true);
  });

  it("returns multiple recommendations for specialist coach with matching personality", () => {
    const coach = makeCoach({ specialty: "Striking", personality: "Technician" });
    const fighter = makeFighter({ attrs: { striking: 30, wrestling: 60, bjj: 50, footwork: 55, strength: 58, cardio: 52, chin: 55, fightIQ: 50 } });
    const recs = getCoachRecommendation(coach, fighter);
    // At least 2: striking (specialty) + fix lowest (technician)
    expect(recs.length).toBeGreaterThanOrEqual(2);
  });
});

describe("getLastTraining / saveLastTraining", () => {
  it("returns null when no training was saved", () => {
    const f = makeFighter({ id: "no-save-test" });
    expect(getLastTraining(f)).toBeNull();
  });

  it("returns saved training data after saveLastTraining", () => {
    const f = makeFighter({ id: "round-trip-test" });
    saveLastTraining(f, "striking", "High");
    const restored = getLastTraining(f);
    expect(restored).not.toBeNull();
    expect(restored.program).toBe("striking");
    expect(restored.intensity).toBe("High");
  });

  it("round-trips multiple fighters independently", () => {
    const f1 = makeFighter({ id: "f-a" });
    const f2 = makeFighter({ id: "f-b" });
    saveLastTraining(f1, "sparring", "Medium");
    saveLastTraining(f2, "recovery", "Light");

    expect(getLastTraining(f1).program).toBe("sparring");
    expect(getLastTraining(f2).program).toBe("recovery");
  });

  it("overwrites previous training for same fighter", () => {
    const f = makeFighter({ id: "overwrite-test" });
    saveLastTraining(f, "conditioning", "Medium");
    saveLastTraining(f, "striking", "High");
    expect(getLastTraining(f).program).toBe("striking");
  });
});

describe("autoRestoreTraining", () => {
  it("returns last training when fighter has fightcamp but no booked fight", () => {
    const f = makeFighter({ id: "auto-restore", training: { type: "fightcamp", intensity: "High" }, booked: null });
    saveLastTraining(f, "conditioning", "Medium");
    const restored = autoRestoreTraining(f, {});
    expect(restored).not.toBeNull();
    expect(restored.program).toBe("conditioning");
    expect(restored.intensity).toBe("Medium");
  });

  it("returns null when no last training exists", () => {
    const f = makeFighter({ id: "no-history", training: { type: "fightcamp", intensity: "High" }, booked: null });
    expect(autoRestoreTraining(f, {})).toBeNull();
  });

  it("returns null when fighter still has booked fight", () => {
    const f = makeFighter({ id: "still-booked", training: { type: "fightcamp", intensity: "High" }, booked: { weeksLeft: 1 } });
    saveLastTraining(f, "conditioning", "Medium");
    // booked exists → condition `!fighter.booked` fails → returns null
    expect(autoRestoreTraining(f, {})).toBeNull();
  });

  it("returns null when current training is not fightcamp", () => {
    const f = makeFighter({ id: "not-fightcamp", training: { type: "conditioning", intensity: "Medium" }, booked: null });
    saveLastTraining(f, "sparring", "High");
    expect(autoRestoreTraining(f, {})).toBeNull();
  });
});

describe("bulkAssign", () => {
  it("assigns training to all fighters matching filter", () => {
    const g = {
      roster: [
        makeFighter({ id: "f1", training: { type: "sparring", intensity: "Medium" } }),
        makeFighter({ id: "f2", training: { type: "conditioning", intensity: "Low" } }),
        makeFighter({ id: "f3", training: { type: "striking", intensity: "High" } }),
      ],
    };
    const result = bulkAssign(g, "recovery", "Light", (f) => f.id !== "f2");
    expect(result.assigned).toBe(2);
    expect(g.roster[0].training).toEqual({ type: "recovery", intensity: "Light" });
    expect(g.roster[2].training).toEqual({ type: "recovery", intensity: "Light" });
    // f2 should be unchanged
    expect(g.roster[1].training.type).toBe("conditioning");
  });

  it("skips injured and booked fighters", () => {
    const g = {
      roster: [
        makeFighter({ id: "f1" }),
        makeFighter({ id: "f2", injury: { weeks: 2 }, training: { type: "sparring", intensity: "Medium" } }),
        makeFighter({ id: "f3", booked: { weeksLeft: 3 }, training: { type: "striking", intensity: "High" } }),
      ],
    };
    const result = bulkAssign(g, "recovery", "Low");
    expect(result.assigned).toBe(1);
    expect(g.roster[0].training.type).toBe("recovery");
    expect(g.roster[1].training.type).toBe("sparring"); // unchanged
    expect(g.roster[2].training.type).toBe("striking"); // unchanged
  });

  it("assigns all fighters when filter is undefined", () => {
    const g = {
      roster: [
        makeFighter({ id: "f1" }),
        makeFighter({ id: "f2" }),
      ],
    };
    const result = bulkAssign(g, "sparring", "Medium");
    expect(result.assigned).toBe(2);
  });

  it("saves last training before overwriting", () => {
    const fighter = makeFighter({ id: "save-before", training: { type: "striking", intensity: "High" } });
    const g = { roster: [fighter] };
    bulkAssign(g, "recovery", "Light");

    const last = getLastTraining(fighter);
    expect(last).not.toBeNull();
    expect(last.program).toBe("striking");
    expect(last.intensity).toBe("High");
  });
});

describe("getTrainingIdentity", () => {
  it("returns null for fighter with fewer than 4 training history entries", () => {
    const f = makeFighter({ trainingHistory: [{}, {}, {}] });
    expect(getTrainingIdentity(f)).toBeNull();
  });

  it("returns null for fighter with 4+ history but no matching criteria", () => {
    const f = makeFighter({
      training: { type: "recovery", intensity: "Low" },
      trainingHistory: [{}, {}, {}, {}, {}],
      record: { w: 2, l: 5, ko: 0, sub: 0, dec: 2 }, // low total fights
      attrs: { striking: 50, wrestling: 50, bjj: 50, footwork: 50, strength: 50, cardio: 50, chin: 50, fightIQ: 50 },
    });
    expect(getTrainingIdentity(f)).toBeNull();
  });

  it("returns Elite Striker when striking-focused with KO rate > 0.3", () => {
    const f = makeFighter({
      training: { type: "striking", intensity: "High" },
      trainingHistory: [{}, {}, {}, {}, {}, {}], // 6+ entries
      record: { w: 8, l: 2, ko: 4, sub: 0, dec: 4 }, // koRate = 4/10 = 0.4 > 0.3
    });
    const ids = getTrainingIdentity(f);
    expect(ids.some((i) => i.id === "elite_striker")).toBe(true);
  });

  it("returns Grappling Specialist when grappling-focused with sub rate > 0.25", () => {
    const f = makeFighter({
      training: { type: "grappling", intensity: "Medium" },
      trainingHistory: [{}, {}, {}, {}, {}, {}],
      record: { w: 6, l: 1, ko: 0, sub: 2, dec: 4 }, // subRate = 2/7 = 0.29 > 0.25
    });
    const ids = getTrainingIdentity(f);
    expect(ids.some((i) => i.id === "grappling_specialist")).toBe(true);
  });

  it("returns Complete Martial Artist at 15+ fights with avg attr >= 78", () => {
    const f = makeFighter({
      trainingHistory: [{}, {}, {}, {}, {}],
      record: { w: 12, l: 3, ko: 2, sub: 1, dec: 9 }, // 15 total
      attrs: { striking: 80, wrestling: 78, bjj: 76, footwork: 80, strength: 79, cardio: 78, chin: 77, fightIQ: 80 },
    });
    // avg = (80+78+76+80+79+78+77+80)/8 = 78.5 >= 78
    const ids = getTrainingIdentity(f);
    expect(ids.some((i) => i.id === "complete_martial_artist")).toBe(true);
  });

  it("returns Technical Veteran for age >= 34 with 12+ fights", () => {
    const f = makeFighter({
      age: 36,
      trainingHistory: [{}, {}, {}, {}, {}],
      record: { w: 8, l: 5, ko: 0, sub: 0, dec: 8 }, // 13 total
    });
    const ids = getTrainingIdentity(f);
    expect(ids.some((i) => i.id === "technical_veteran")).toBe(true);
  });

  it("returns Elite Athlete when avg attr >= 85", () => {
    const f = makeFighter({
      trainingHistory: [{}, {}, {}, {}, {}],
      attrs: { striking: 88, wrestling: 85, bjj: 86, footwork: 87, strength: 90, cardio: 89, chin: 84, fightIQ: 88 },
    });
    // avg = (88+85+86+87+90+89+84+88)/8 = 87.1 >= 85
    const ids = getTrainingIdentity(f);
    expect(ids.some((i) => i.id === "elite_athlete")).toBe(true);
  });
});

describe("getDevelopmentPhilosophy", () => {
  it("returns Build Foundation for young fighter with few fights", () => {
    const f = makeFighter({ age: 22, record: { w: 1, l: 1 } });
    const philosophies = getDevelopmentPhilosophy(f);
    expect(philosophies.some((p) => p.id === "develop_base")).toBe(true);
  });

  it("does NOT return Build Foundation for older fighter with few fights", () => {
    const f = makeFighter({ age: 28, record: { w: 1, l: 1 } });
    const philosophies = getDevelopmentPhilosophy(f);
    expect(philosophies.some((p) => p.id === "develop_base")).toBe(false);
  });

  it("returns Fix Weakness when weakest attr < 40", () => {
    const f = makeFighter({ attrs: { striking: 30, wrestling: 60, bjj: 50, footwork: 55, strength: 58, cardio: 52, chin: 55, fightIQ: 50 } });
    const philosophies = getDevelopmentPhilosophy(f);
    expect(philosophies.some((p) => p.id === "fix_weakness")).toBe(true);
    expect(philosophies.find((p) => p.id === "fix_weakness").label).toContain("striking");
  });

  it("does NOT return Fix Weakness when all attrs >= 40", () => {
    const f = makeFighter({ attrs: { striking: 45, wrestling: 50, bjj: 50, footwork: 55, strength: 58, cardio: 52, chin: 55, fightIQ: 50 } });
    const philosophies = getDevelopmentPhilosophy(f);
    expect(philosophies.some((p) => p.id === "fix_weakness")).toBe(false);
  });

  it("returns Opponent Prep when fighter has booked opponent", () => {
    const f = makeFighter({ booked: { opponent: { name: "Guy" } } });
    const philosophies = getDevelopmentPhilosophy(f);
    expect(philosophies.some((p) => p.id === "prepare_opponent")).toBe(true);
  });

  it("returns Veteran Maintenance for age >= 34", () => {
    const f = makeFighter({ age: 35 });
    const philosophies = getDevelopmentPhilosophy(f);
    expect(philosophies.some((p) => p.id === "veteran_maintain")).toBe(true);
  });

  it("returns Accelerate Growth when gap to ceiling > 15 and age <= 28", () => {
    // attrs avg 50, ceilings avg 75 → gap = 25 > 15
    const f = makeFighter({
      age: 25,
      attrs: { striking: 50, wrestling: 50, bjj: 50, footwork: 50, strength: 50, cardio: 50, chin: 50, fightIQ: 50 },
      ceilings: { striking: 75, wrestling: 75, bjj: 75, footwork: 75, strength: 75, cardio: 75, chin: 75, fightIQ: 75 },
    });
    const philosophies = getDevelopmentPhilosophy(f);
    expect(philosophies.some((p) => p.id === "accelerate_growth")).toBe(true);
  });

  it("does NOT return Accelerate Growth for fighter over 28", () => {
    const f = makeFighter({
      age: 30,
      attrs: { striking: 50, wrestling: 50, bjj: 50, footwork: 50, strength: 50, cardio: 50, chin: 50, fightIQ: 50 },
      ceilings: { striking: 90, wrestling: 90, bjj: 90, footwork: 90, strength: 90, cardio: 90, chin: 90, fightIQ: 90 },
    });
    const philosophies = getDevelopmentPhilosophy(f);
    expect(philosophies.some((p) => p.id === "accelerate_growth")).toBe(false);
  });
});
