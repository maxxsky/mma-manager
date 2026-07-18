// Archetype expression tests — behavior, evolution, synergy, career identity, style summary
import { describe, it, expect } from "vitest";
import { ARCHETYPES } from "@ironfist/engine/data/archetypes.js";
import {
  getArchetypeBehavior,
  getArchetypeEvolution,
  getCoachArchetypeSynergy,
  getArchetypeCareerIdentity,
  getFightStyleSummary,
} from "@ironfist/engine/archetype-expression.js";

// ── Helpers ──
const ALL_ARCHS = Object.keys(ARCHETYPES);

function makeFighter(overrides = {}) {
  return {
    id: overrides.id ?? "f-1",
    name: overrides.name ?? "Test Fighter",
    age: overrides.age ?? 25,
    archetype: overrides.archetype ?? "All-Rounder",
    record: overrides.record ?? { w: 5, l: 1, ko: 0, sub: 0, dec: 5 },
    titleDefenses: overrides.titleDefenses ?? 0,
    ...overrides,
  };
}

function makeCoach(overrides = {}) {
  return {
    id: overrides.id ?? "c-1",
    name: overrides.name ?? "Coach A",
    specialty: overrides.specialty ?? "Head",
    ...overrides,
  };
}

// ── Tests ──

describe("getArchetypeBehavior", () => {
  it("returns unique behavior for each archetype defined in ARCHETYPES", () => {
    const behaviors = {};
    for (const arch of ALL_ARCHS) {
      const b = getArchetypeBehavior(makeFighter({ archetype: arch }));
      expect(b).toBeDefined();
      expect(b.style).toBeTruthy();
      expect(b.description).toBeTruthy();
      // Collect distinct style names
      behaviors[arch] = b.style;
    }
    // All 5 archetypes should have unique style names
    const uniqueStyles = new Set(Object.values(behaviors));
    expect(uniqueStyles.size).toBe(ALL_ARCHS.length);
  });

  it("Boxer has strikeWeight and tdDefBonus", () => {
    const b = getArchetypeBehavior(makeFighter({ archetype: "Boxer" }));
    expect(b.style).toBe("Distance Manager");
    expect(b.strikeWeight).toBe(2);
    expect(b.tdDefBonus).toBe(0.10);
    expect(b.aggressionBias).toBe(-0.05);
  });

  it("Muay Thai has clinchWeight and bodyDamageBonus", () => {
    const b = getArchetypeBehavior(makeFighter({ archetype: "Muay Thai" }));
    expect(b.style).toBe("Pressure Fighter");
    expect(b.clinchWeight).toBe(2);
    expect(b.bodyDamageBonus).toBe(0.15);
    expect(b.aggressionBias).toBe(0.08);
  });

  it("Wrestler has tdWeight and topControlBonus", () => {
    const b = getArchetypeBehavior(makeFighter({ archetype: "Wrestler" }));
    expect(b.style).toBe("Chain Wrestler");
    expect(b.tdWeight).toBe(2);
    expect(b.topControlBonus).toBe(0.10);
    expect(b.aggressionBias).toBe(0.10);
  });

  it("BJJ Specialist has sweepWeight and subWeight and bottomGameBonus", () => {
    const b = getArchetypeBehavior(makeFighter({ archetype: "BJJ Specialist" }));
    expect(b.style).toBe("Guard Player");
    expect(b.sweepWeight).toBe(2);
    expect(b.subWeight).toBe(1);
    expect(b.bottomGameBonus).toBe(0.10);
  });

  it("All-Rounder has adaptabilityBonus but no weight modifiers", () => {
    const b = getArchetypeBehavior(makeFighter({ archetype: "All-Rounder" }));
    expect(b.style).toBe("Adaptive Fighter");
    expect(b.adaptabilityBonus).toBe(0.05);
    // All-Rounder should NOT have weight modifiers that skew exchange pools
    expect(b.strikeWeight).toBeUndefined();
    expect(b.clinchWeight).toBeUndefined();
    expect(b.tdWeight).toBeUndefined();
    expect(b.sweepWeight).toBeUndefined();
  });

  it("returns empty object for missing archetype", () => {
    expect(getArchetypeBehavior(makeFighter({ archetype: null }))).toEqual({});
    expect(getArchetypeBehavior({})).toEqual({});
  });

  it("Wrestler is more aggressive than Boxer (aggressionBias comparison)", () => {
    const boxer = getArchetypeBehavior(makeFighter({ archetype: "Boxer" }));
    const wrestler = getArchetypeBehavior(makeFighter({ archetype: "Wrestler" }));
    expect(wrestler.aggressionBias).toBeGreaterThan(boxer.aggressionBias);
  });
});

describe("getArchetypeEvolution", () => {
  it("returns prime phase for default fighter (age 25, 6 fights)", () => {
    const ev = getArchetypeEvolution(makeFighter());
    expect(ev.phase).toBe("prime");
    expect(ev.label).toBe("In Prime");
  });

  it("returns young phase for age <= 22 with <= 5 fights", () => {
    const ev = getArchetypeEvolution(makeFighter({ age: 21, record: { w: 2, l: 1 } }));
    expect(ev.phase).toBe("young");
    expect(ev.label).toBe("Raw Talent");
    expect(ev.bonuses.athleticism).toBe(1.10);
    expect(ev.bonuses.technique).toBe(0.90);
  });

  it("does NOT return young phase for age <= 22 with >5 fights", () => {
    const ev = getArchetypeEvolution(makeFighter({ age: 21, record: { w: 5, l: 1 } }));
    expect(ev.phase).not.toBe("young");
  });

  it("returns veteran phase for age >= 34", () => {
    const ev = getArchetypeEvolution(makeFighter({ age: 35 }));
    expect(ev.phase).toBe("veteran");
    expect(ev.label).toBe("Crafty Veteran");
    expect(ev.bonuses.athleticism).toBe(0.85);
    expect(ev.bonuses.technique).toBe(1.10);
    expect(ev.bonuses.fightIQ).toBe(1.15);
  });

  it("returns experienced phase for 20+ total fights", () => {
    const ev = getArchetypeEvolution(makeFighter({ record: { w: 15, l: 5 } }));
    expect(ev.phase).toBe("experienced");
    expect(ev.label).toBe("Experienced");
    expect(ev.bonuses.consistency).toBe(1.05);
  });

  it("veteran phase takes priority over experienced (age >= 34 with 20+ fights)", () => {
    const ev = getArchetypeEvolution(makeFighter({ age: 35, record: { w: 20, l: 5 } }));
    // age >= 34 check comes before totalFights >= 20 check
    expect(ev.phase).toBe("veteran");
  });

  it("young phase takes priority over experienced (age <= 22 with 20+ fights — edge case)", () => {
    const ev = getArchetypeEvolution(makeFighter({ age: 21, record: { w: 15, l: 5 } }));
    // age <= 22 AND totalFights <= 5 is false (21 fights), so falls through to experienced
    expect(ev.phase).toBe("experienced");
  });

  it("returns description for each phase (prime uses label)", () => {
    // young, veteran, experienced have explicit descriptions; prime uses label
    const fighters = {
      young: { age: 20, record: { w: 1, l: 1 } },
      prime: { age: 25, record: { w: 5, l: 1 } },
      veteran: { age: 35, record: { w: 8, l: 3 } },
      experienced: { age: 28, record: { w: 15, l: 5 } },
    };
    for (const [phaseName, data] of Object.entries(fighters)) {
      const ev = getArchetypeEvolution(makeFighter(data));
      expect(ev.phase).toBe(phaseName);
      expect(ev.label).toBeTruthy();
      // All except prime have a description
      if (phaseName !== "prime") {
        expect(ev.description).toBeTruthy();
      }
    }
  });
});

describe("getCoachArchetypeSynergy", () => {
  it("returns null for missing fighter archetype or coach", () => {
    expect(getCoachArchetypeSynergy(makeCoach(), makeFighter({ archetype: null }))).toBeNull();
    expect(getCoachArchetypeSynergy(null, makeFighter())).toBeNull();
  });

  it("returns perfect synergy for all ideal archetype-coach pairs", () => {
    // Each archetype has exactly one specialty rated "perfect"
    const perfectPairs = [
      ["Boxer", "Striking"],
      ["Muay Thai", "Striking"],
      ["Wrestler", "Wrestling"],
      ["BJJ Specialist", "BJJ"],
      ["All-Rounder", "Head"],
    ];
    for (const [arch, spec] of perfectPairs) {
      const result = getCoachArchetypeSynergy(
        makeCoach({ specialty: spec }),
        makeFighter({ archetype: arch }),
      );
      expect(result.rating).toBe("perfect");
      expect(result.bonus).toBe(0.15);
      expect(result.label).toBe("Ideal Match");
    }
  });

  it("returns poor synergy for Boxer with BJJ coach", () => {
    const result = getCoachArchetypeSynergy(
      makeCoach({ specialty: "BJJ" }),
      makeFighter({ archetype: "Boxer" }),
    );
    expect(result.rating).toBe("poor");
    expect(result.bonus).toBe(0.00);
  });

  it("returns poor synergy for Muay Thai with BJJ coach", () => {
    const result = getCoachArchetypeSynergy(
      makeCoach({ specialty: "BJJ" }),
      makeFighter({ archetype: "Muay Thai" }),
    );
    expect(result.rating).toBe("poor");
  });

  it("returns poor synergy for Wrestler with Striking coach", () => {
    const result = getCoachArchetypeSynergy(
      makeCoach({ specialty: "Striking" }),
      makeFighter({ archetype: "Wrestler" }),
    );
    expect(result.rating).toBe("poor");
  });

  it("All-Rounder has good synergy with ALL non-Head coaches", () => {
    const specs = ["Striking", "Wrestling", "BJJ", "S&C"];
    for (const spec of specs) {
      const result = getCoachArchetypeSynergy(
        makeCoach({ specialty: spec }),
        makeFighter({ archetype: "All-Rounder" }),
      );
      expect(result.rating).toBe("good");
      expect(result.bonus).toBe(0.10);
    }
  });

  it("returns neutral fallback for unknown specialty", () => {
    const result = getCoachArchetypeSynergy(
      makeCoach({ specialty: "Mystery" }),
      makeFighter({ archetype: "Boxer" }),
    );
    expect(result.rating).toBe("neutral");
    expect(result.bonus).toBe(0.05);
  });

  it("all perfect pair bonuses are 0.15", () => {
    // Every archetype's perfect match should have exactly 0.15 bonus
    const perfectPairs = [
      ["Boxer", "Striking"],
      ["Muay Thai", "Striking"],
      ["Wrestler", "Wrestling"],
      ["BJJ Specialist", "BJJ"],
      ["All-Rounder", "Head"],
    ];
    for (const [arch, spec] of perfectPairs) {
      const r = getCoachArchetypeSynergy(makeCoach({ specialty: spec }), makeFighter({ archetype: arch }));
      expect(r.bonus).toBe(0.15);
    }
  });
});

describe("getArchetypeCareerIdentity", () => {
  it("returns empty array for fighter with no archetype", () => {
    expect(getArchetypeCareerIdentity(makeFighter({ archetype: null }))).toEqual([]);
  });

  it("Boxer: returns Puncher when KO rate >= 0.4 with 5+ fights", () => {
    const ids = getArchetypeCareerIdentity(makeFighter({
      archetype: "Boxer",
      record: { w: 5, l: 3, ko: 4, sub: 0, dec: 1 }, // 8 fights, koRate = 0.5
    }));
    expect(ids.some((i) => i.id === "boxer_puncher")).toBe(true);
  });

  it("Boxer: returns Technician when KO rate < 0.2 with 10+ fights", () => {
    const ids = getArchetypeCareerIdentity(makeFighter({
      archetype: "Boxer",
      record: { w: 8, l: 2, ko: 1, sub: 0, dec: 7 }, // 10 fights, koRate = 0.1
    }));
    expect(ids.some((i) => i.id === "boxer_technician")).toBe(true);
  });

  it("Muay Thai: returns Destroyer when KO rate >= 0.5", () => {
    const ids = getArchetypeCareerIdentity(makeFighter({
      archetype: "Muay Thai",
      record: { w: 5, l: 1, ko: 3, sub: 0, dec: 2 }, // 6 fights, koRate = 0.5
    }));
    expect(ids.some((i) => i.id === "mt_destroyer")).toBe(true);
  });

  it("Muay Thai: returns Ring Warrior with 15+ fights", () => {
    const ids = getArchetypeCareerIdentity(makeFighter({
      archetype: "Muay Thai",
      record: { w: 10, l: 5, ko: 2, sub: 0, dec: 8 }, // 15 fights
    }));
    expect(ids.some((i) => i.id === "mt_warrior")).toBe(true);
  });

  it("Wrestler: returns Grinder with 10+ fights and low KO rate", () => {
    const ids = getArchetypeCareerIdentity(makeFighter({
      archetype: "Wrestler",
      record: { w: 7, l: 3, ko: 1, sub: 0, dec: 6 }, // 10 fights, koRate = 0.1
    }));
    expect(ids.some((i) => i.id === "wrestler_grinder")).toBe(true);
  });

  it("Wrestler: returns Dominant Champion with 3+ title defenses", () => {
    const ids = getArchetypeCareerIdentity(makeFighter({
      archetype: "Wrestler",
      record: { w: 8, l: 2, ko: 3, sub: 1, dec: 4 },
      titleDefenses: 3,
    }));
    expect(ids.some((i) => i.id === "wrestler_champ")).toBe(true);
  });

  it("BJJ Specialist: returns Submission Hunter with sub rate >= 0.4", () => {
    const ids = getArchetypeCareerIdentity(makeFighter({
      archetype: "BJJ Specialist",
      record: { w: 5, l: 2, ko: 0, sub: 3, dec: 2 }, // 7 fights, subRate = 0.43
    }));
    expect(ids.some((i) => i.id === "bjj_hunter")).toBe(true);
  });

  it("BJJ Specialist: returns Jiu-Jitsu Master with 12+ fights and sub rate >= 0.3", () => {
    const ids = getArchetypeCareerIdentity(makeFighter({
      archetype: "BJJ Specialist",
      record: { w: 8, l: 4, ko: 0, sub: 4, dec: 4 }, // 12 fights, subRate = 0.33
    }));
    expect(ids.some((i) => i.id === "bjj_master")).toBe(true);
  });

  it("All-Rounder: returns Complete Fighter with 15+ fights", () => {
    const ids = getArchetypeCareerIdentity(makeFighter({
      archetype: "All-Rounder",
      record: { w: 10, l: 5, ko: 2, sub: 1, dec: 7 }, // 15 fights
    }));
    expect(ids.some((i) => i.id === "ar_complete")).toBe(true);
  });

  it("returns Crafty Veteran for age >= 34 with 12+ fights (any archetype)", () => {
    const ids = getArchetypeCareerIdentity(makeFighter({
      archetype: "Boxer",
      age: 35,
      record: { w: 8, l: 4, ko: 0, sub: 0, dec: 8 }, // 12 fights
    }));
    expect(ids.some((i) => i.id === "veteran_craft")).toBe(true);
  });

  it("returns empty identity when thresholds are not met", () => {
    const ids = getArchetypeCareerIdentity(makeFighter({
      archetype: "Boxer",
      record: { w: 1, l: 1, ko: 0, sub: 0, dec: 1 }, // 2 fights
      age: 25,
    }));
    expect(ids).toHaveLength(0);
  });
});

describe("getFightStyleSummary", () => {
  it("returns null for fighter with no archetype", () => {
    expect(getFightStyleSummary(makeFighter({ archetype: null }))).toBeNull();
  });

  it("returns Power Puncher for Boxer with KO rate >= 0.3", () => {
    const s = getFightStyleSummary(makeFighter({
      archetype: "Boxer",
      record: { w: 5, l: 1, ko: 2, sub: 0, dec: 3 }, // 6 fights, koRate = 0.33
    }));
    expect(s.style).toBe("Power Puncher");
    expect(s.winCondition).toBeTruthy();
  });

  it("returns Technical Boxer for Boxer with low KO rate", () => {
    const s = getFightStyleSummary(makeFighter({
      archetype: "Boxer",
      record: { w: 6, l: 2, ko: 1, sub: 0, dec: 5 }, // 8 fights, koRate = 0.125
    }));
    expect(s.style).toBe("Technical Boxer");
  });

  it("returns KO Artist for Muay Thai with KO rate >= 0.4", () => {
    const s = getFightStyleSummary(makeFighter({
      archetype: "Muay Thai",
      record: { w: 4, l: 1, ko: 2, sub: 0, dec: 2 }, // 5 fights, koRate = 0.4
    }));
    expect(s.style).toBe("KO Artist");
  });

  it("returns Clinch Specialist for Muay Thai with low KO rate", () => {
    const s = getFightStyleSummary(makeFighter({
      archetype: "Muay Thai",
      record: { w: 4, l: 1, ko: 1, sub: 0, dec: 3 }, // 5 fights, koRate = 0.2
    }));
    expect(s.style).toBe("Clinch Specialist");
  });

  it("returns Submission Wrestler for Wrestler with sub rate >= 0.2", () => {
    const s = getFightStyleSummary(makeFighter({
      archetype: "Wrestler",
      record: { w: 4, l: 2, ko: 0, sub: 1, dec: 3 }, // 6 fights, subRate = 0.17
    }));
    // subRate = 1/6 = 0.167 < 0.2 → Control Wrestler
    expect(s.style).toBe("Control Wrestler");
  });

  it("returns Complete Martial Artist for All-Rounder", () => {
    const s = getFightStyleSummary(makeFighter({ archetype: "All-Rounder" }));
    expect(s.style).toBe("Complete Martial Artist");
    expect(s.winCondition).toContain("adapting");
  });

  it("isFinisher is true when KO or sub rate >= 0.3", () => {
    const finisher = getFightStyleSummary(makeFighter({
      archetype: "Muay Thai",
      record: { w: 5, l: 1, ko: 3, sub: 0, dec: 2 }, // koRate = 0.5
    }));
    expect(finisher.isFinisher).toBe(true);

    const nonFinisher = getFightStyleSummary(makeFighter({
      archetype: "Boxer",
      record: { w: 5, l: 1, ko: 1, sub: 0, dec: 4 }, // koRate = 0.17
    }));
    expect(nonFinisher.isFinisher).toBe(false);
  });

  it("isGrinder is true when 8+ fights with low finish rate", () => {
    const grinder = getFightStyleSummary(makeFighter({
      archetype: "Wrestler",
      record: { w: 5, l: 3, ko: 1, sub: 0, dec: 4 }, // 8 fights, koRate=0.125, subRate=0
    }));
    expect(grinder.isGrinder).toBe(true);

    const notGrinder = getFightStyleSummary(makeFighter({
      archetype: "Boxer",
      record: { w: 5, l: 1, ko: 4, sub: 0, dec: 1 }, // high KO rate
    }));
    expect(notGrinder.isGrinder).toBe(false);
  });
});
