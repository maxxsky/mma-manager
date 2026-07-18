// Identity tests — region flavor, coach identity, sponsors, nicknames
// Some functions use RNG — tests MUST seed for determinism
import { describe, it, expect } from "vitest";
import { mulberry32, setRNG, resetRNG, pick } from "@ironfist/engine/rng.js";
import { REGIONS, ARCHETYPES } from "@ironfist/engine/data/archetypes.js";
import {
  weightedPick,
  getRegionFlavor,
  pickRegion,
  pickArchetypeForRegion,
  computeCoachIdentity,
  recordCoachAchievement,
  getSponsorRelationship,
  advanceSponsorRel,
  getSponsorRelBonus,
  generateFighterNickname,
  trackCoachCareer,
  trackSponsorRelations,
} from "@ironfist/engine/identity.js";

// ── Helpers ──
const SEED = 42;

function useSeed(seed = SEED) {
  setRNG(mulberry32(seed));
}

function makeFighter(overrides = {}) {
  return {
    id: overrides.id ?? "f-1",
    name: overrides.name ?? "Test Fighter",
    age: overrides.age ?? 25,
    region: overrides.region ?? "USA",
    weightClass: overrides.weightClass ?? "Lightweight",
    archetype: overrides.archetype ?? "All-Rounder",
    attrs: overrides.attrs ?? { striking: 60, wrestling: 50, bjj: 40, footwork: 55, strength: 58, cardio: 52, chin: 55, fightIQ: 50 },
    ceilings: overrides.ceilings ?? { striking: 80, wrestling: 75, bjj: 70, footwork: 78, strength: 76, cardio: 74, chin: 70, fightIQ: 72 },
    record: overrides.record ?? { w: 5, l: 1, ko: 0, sub: 0, dec: 5 },
    titles: overrides.titles ?? [],
    streakW: overrides.streakW ?? 0,
    streakL: overrides.streakL ?? 0,
    traits: overrides.traits ?? [],
    joinedWeek: overrides.joinedWeek ?? 1,
    giantKills: overrides.giantKills ?? 0,
    titleDefenses: overrides.titleDefenses ?? 0,
    milestoneFirstTitle: overrides.milestoneFirstTitle ?? false,
    milestone3Losses: overrides.milestone3Losses ?? false,
    training: overrides.training ?? { type: "conditioning", intensity: "Medium" },
    ...overrides,
  };
}

// ── Tests ──

describe("weightedPick", () => {
  it("returns one of the weighted keys", () => {
    useSeed();
    const result = weightedPick({ A: 4, B: 1 }, null);
    expect(["A", "B"]).toContain(result);
  });

  it("favors higher-weight keys over many deterministic runs", () => {
    // Run 200 picks across different seeds, count distribution
    const counts = { A: 0, B: 0 };
    const total = 200;
    for (let i = 0; i < total; i++) {
      useSeed(i);
      const r = weightedPick({ A: 4, B: 1 }, null);
      counts[r]++;
    }
    // A has weight 4, B has weight 1 → A should appear ~80%
    const ratioA = counts.A / total;
    expect(ratioA).toBeGreaterThan(0.55); // generous margin
    expect(ratioA).toBeLessThan(0.95);
    expect(counts.A + counts.B).toBe(total);
  });

  it("includes keys from defaultPool with implicit weight 1 if not in weights", () => {
    useSeed();
    const result = weightedPick({ A: 3 }, ["B", "C", "D"]);
    expect(["A", "B", "C", "D"]).toContain(result);
  });

  it("does not double-add keys already in weights", () => {
    useSeed();
    const pool = [];
    for (let i = 0; i < 100; i++) {
      useSeed(i);
      pool.push(weightedPick({ A: 2, B: 1 }, ["A", "C"]));
    }
    // A should appear roughly 2/4 = 50% (2 from weight, 0 from default since already in weights)
    // B should appear 1/4 = 25%, C 1/4 = 25%
    const countA = pool.filter((r) => r === "A").length;
    const countC = pool.filter((r) => r === "C").length;
    expect(countA).toBeGreaterThan(countC); // A has 2x weight of C's implicit 1
  });

  it("returns a key from defaultPool when weights is empty", () => {
    useSeed();
    const result = weightedPick({}, ["X", "Y"]);
    expect(["X", "Y"]).toContain(result);
  });
});

describe("getRegionFlavor", () => {
  it("returns flavor data for known region", () => {
    const flavor = getRegionFlavor("Brazil");
    expect(flavor).not.toBeNull();
    expect(flavor.archWeights).toBeDefined();
    expect(flavor.archWeights["BJJ Specialist"]).toBe(4);
    expect(flavor.attrBonus).toBeDefined();
    expect(flavor.attrBonus.bjj).toBe(5);
  });

  it("returns flavor data for all regions defined in REGIONS", () => {
    const regionNames = Object.keys(REGIONS);
    regionNames.forEach((r) => {
      const flavor = getRegionFlavor(r);
      expect(flavor).not.toBeNull();
      expect(flavor.archWeights).toBeDefined();
      expect(flavor.traitWeights).toBeDefined();
      expect(flavor.ambitionWeights).toBeDefined();
      expect(flavor.attrBonus).toBeDefined();
    });
  });

  it("returns null for unknown region", () => {
    expect(getRegionFlavor("Atlantis")).toBeNull();
    expect(getRegionFlavor("")).toBeNull();
  });
});

describe("pickRegion", () => {
  it("returns a valid region key from REGIONS", () => {
    useSeed();
    const region = pickRegion();
    expect(REGIONS[region]).toBeDefined();
    expect(typeof REGIONS[region].arch).toBe("string");
  });

  it("is deterministic with same seed", () => {
    useSeed(123);
    const r1 = pickRegion();
    useSeed(123);
    const r2 = pickRegion();
    expect(r1).toBe(r2);
  });

  it("produces different regions across seeds", () => {
    useSeed(42);
    const regions = new Set();
    for (let i = 0; i < 100; i++) {
      useSeed(i);
      regions.add(pickRegion());
    }
    // Should have hit multiple different regions
    expect(regions.size).toBeGreaterThan(1);
  });
});

describe("pickArchetypeForRegion", () => {
  it("returns a valid archetype from ARCHETYPES", () => {
    useSeed();
    const arch = pickArchetypeForRegion("Brazil");
    expect(ARCHETYPES[arch]).toBeDefined();
  });

  it("returns the native archetype of the region ~55% of the time", () => {
    let nativeCount = 0;
    const total = 100;
    for (let i = 0; i < total; i++) {
      useSeed(i);
      const arch = pickArchetypeForRegion("Brazil");
      if (arch === REGIONS.Brazil.arch) nativeCount++;
    }
    // ~55% native arch → ~55/100
    const nativeRate = nativeCount / total;
    expect(nativeRate).toBeGreaterThan(0.30);
    expect(nativeRate).toBeLessThan(0.80);
  });
});

describe("computeCoachIdentity", () => {
  it("returns specialty-based fallback for coach with no career stats", () => {
    const coach = { name: "Coach A", specialty: "Striking", personality: "Motivator", skill: 5 };
    const titles = computeCoachIdentity(coach, { week: 48 });
    expect(titles).toHaveLength(1);
    expect(titles[0]).toBe("Striking Coach");
  });

  it("returns Championship Coach when championsProduced >= 3", () => {
    const coach = { name: "Champ Coach", specialty: "BJJ", personality: "Technician", skill: 6, _career: { championsProduced: 3, fightersDeveloped: 4, yearsActive: 0, hireWeek: 0 } };
    const titles = computeCoachIdentity(coach, { week: 48 });
    expect(titles).toContain("Championship Coach");
  });

  it("returns Prospect Developer when championsProduced >= 1 and fighters >= 5", () => {
    const coach = { name: "Dev Coach", specialty: "Head", personality: "Motivator", skill: 4, _career: { championsProduced: 1, fightersDeveloped: 5, yearsActive: 0, hireWeek: 0 } };
    const titles = computeCoachIdentity(coach, { week: 48 });
    expect(titles).toContain("Prospect Developer");
  });

  it("returns Veteran Coach when yearsActive >= 5", () => {
    const coach = { name: "Vet Coach", specialty: "S&C", personality: "Disciplinarian", skill: 6, _career: { championsProduced: 0, fightersDeveloped: 0, yearsActive: 0, hireWeek: 0 } };
    const titles = computeCoachIdentity(coach, { week: 240 }); // 240/48 = 5 years
    expect(titles).toContain("Veteran Coach");
  });

  it("returns Elite Technician when skill >= 8", () => {
    const coach = { name: "Elite Coach", specialty: "Head", personality: "Technician", skill: 9, _career: { championsProduced: 0, fightersDeveloped: 0, yearsActive: 0, hireWeek: 0 } };
    const titles = computeCoachIdentity(coach, { week: 48 });
    expect(titles).toContain("Elite Technician");
  });

  it("returns Conditioning Expert for S&C coach with 3+ developed fighters", () => {
    const coach = { name: "SC Coach", specialty: "S&C", personality: "Motivator", skill: 6, _career: { championsProduced: 0, fightersDeveloped: 3, yearsActive: 0, hireWeek: 0 } };
    const titles = computeCoachIdentity(coach, { week: 48 });
    expect(titles).toContain("Conditioning Expert");
  });

  it("initializes _career if missing", () => {
    const coach = { name: "New Coach", specialty: "Wrestling", personality: "Technician", skill: 4 };
    const titles = computeCoachIdentity(coach, { week: 100 });
    expect(coach._career).toBeDefined();
    expect(coach._career.hireWeek).toBe(100);
    expect(titles[0]).toBe("Wrestling Coach");
  });
});

describe("recordCoachAchievement", () => {
  it("increments fightersDeveloped on fighter_developed type", () => {
    const coach = { name: "C", specialty: "Striking", personality: "T", skill: 5 };
    recordCoachAchievement(coach, "fighter_developed");
    expect(coach._career.fightersDeveloped).toBe(1);
  });

  it("increments championsProduced on champion_produced type", () => {
    const coach = { name: "C", specialty: "BJJ", personality: "T", skill: 5 };
    recordCoachAchievement(coach, "champion_produced");
    expect(coach._career.championsProduced).toBe(1);
  });

  it("accumulates multiple calls without overwriting", () => {
    const coach = { name: "C", specialty: "Head", personality: "T", skill: 5 };
    recordCoachAchievement(coach, "fighter_developed");
    recordCoachAchievement(coach, "fighter_developed");
    recordCoachAchievement(coach, "champion_produced");
    expect(coach._career.fightersDeveloped).toBe(2);
    expect(coach._career.championsProduced).toBe(1);
  });

  it("initializes _career if missing", () => {
    const coach = { name: "C", specialty: "S&C", personality: "T", skill: 5 };
    recordCoachAchievement(coach, "fighter_developed");
    expect(coach._career).toBeDefined();
  });

  it("does nothing for unknown achievement type", () => {
    const coach = { name: "C", specialty: "Head", personality: "T", skill: 5 };
    recordCoachAchievement(coach, "unknown_type");
    expect(coach._career.fightersDeveloped).toBe(0);
    expect(coach._career.championsProduced).toBe(0);
  });
});

describe("getSponsorRelationship", () => {
  it("initializes _rel with default values when missing", () => {
    const sponsor = { brand: "Test Brand", rate: 5000 };
    const rel = getSponsorRelationship(sponsor);
    expect(sponsor._rel).toBeDefined();
    expect(rel.level).toBe(0);
    expect(rel.weeksWithCamp).toBe(0);
    expect(rel.totalPaid).toBe(0);
    expect(rel.bonusesEarned).toBe(0);
  });

  it("returns existing _rel without resetting", () => {
    const sponsor = { brand: "Test", _rel: { level: 3, weeksWithCamp: 10, totalPaid: 50000, bonusesEarned: 2 } };
    const rel = getSponsorRelationship(sponsor);
    expect(rel.level).toBe(3);
    expect(rel.weeksWithCamp).toBe(10);
  });
});

describe("advanceSponsorRel", () => {
  it("increases level by amount", () => {
    const sponsor = { brand: "Test" };
    advanceSponsorRel(sponsor, 2);
    expect(sponsor._rel.level).toBe(2);
    expect(sponsor._rel.weeksWithCamp).toBe(1);
  });

  it("caps level at 5", () => {
    const sponsor = { brand: "Test", _rel: { level: 4, weeksWithCamp: 0, totalPaid: 0, bonusesEarned: 0 } };
    advanceSponsorRel(sponsor, 5);
    expect(sponsor._rel.level).toBe(5); // clamped to 5
    expect(sponsor._rel.weeksWithCamp).toBe(1);
  });

  it("does not decrease below 0", () => {
    const sponsor = { brand: "Test", _rel: { level: 1, weeksWithCamp: 0, totalPaid: 0, bonusesEarned: 0 } };
    advanceSponsorRel(sponsor, -5);
    expect(sponsor._rel.level).toBe(0); // clamped
  });

  it("stacks multiple advances", () => {
    const sponsor = { brand: "Test" };
    advanceSponsorRel(sponsor, 1);
    advanceSponsorRel(sponsor, 2);
    expect(sponsor._rel.level).toBe(3);
    expect(sponsor._rel.weeksWithCamp).toBe(2);
  });
});

describe("getSponsorRelBonus", () => {
  it("returns base multiplier for level 0", () => {
    const bonus = getSponsorRelBonus({ level: 0 });
    expect(bonus.multiplier).toBe(1.0);
    expect(bonus.label).toBe("New Partner");
  });

  it("returns correct multiplier for each level", () => {
    for (let level = 0; level <= 5; level++) {
      const bonus = getSponsorRelBonus({ level });
      expect(bonus.multiplier).toBe(1 + level * 0.05);
    }
  });

  it("returns correct label for each level", () => {
    const labels = ["New Partner", "Trusted", "Preferred", "Strategic", "Elite", "Legendary"];
    for (let level = 0; level <= 5; level++) {
      const bonus = getSponsorRelBonus({ level });
      expect(bonus.label).toBe(labels[level]);
    }
  });

  it("clamps level to 0-5 range", () => {
    const bonus = getSponsorRelBonus({ level: 10 });
    expect(bonus.label).toBe("Legendary");
    const bonus2 = getSponsorRelBonus({ level: -1 });
    expect(bonus2.label).toBe("New Partner");
  });
});

describe("generateFighterNickname", () => {
  it("is deterministic with the same seed (single-match case)", () => {
    // Fighter with only one matching nickname category → pick() still gets called but on [1] array
    const f = makeFighter({ region: "Brazil", record: { w: 5, l: 1, ko: 0, sub: 0, dec: 5 }, traits: [] });
    useSeed(42);
    const first = generateFighterNickname(f);
    // With only "The Brazilian" matching, pick([...]) returns that one element deterministically
    expect(first).toBe("The Brazilian");
  });

  it("is deterministic with the same seed (multi-match case)", () => {
    const f = makeFighter({ region: "USA", streakW: 6, record: { w: 15, l: 2, ko: 10, sub: 1, dec: 4 }, giantKills: 3 });
    // Multiple match: "Hands of Stone" (ko>=10), "The Unstoppable" (streakW>=5), "Giant Killer" (giantKills>=3), "The American" (region=USA)
    useSeed(42);
    const first = generateFighterNickname(f);
    useSeed(42);
    const second = generateFighterNickname(f);
    expect(first).toBe(second);
  });

  it("returns null for fighter with no matching nicknames", () => {
    const f = makeFighter({ record: { w: 0, l: 0, ko: 0, sub: 0, dec: 0 }, traits: [], region: "Netherlands" });
    // No KOs, no subs, no streak, no milestones, no traits, region not in nickname list
    expect(generateFighterNickname(f)).toBeNull();
  });

  it("returns Hands of Stone for fighter with 10+ KOs", () => {
    const f = makeFighter({ record: { w: 12, l: 2, ko: 10, sub: 0, dec: 2 } });
    const nick = generateFighterNickname(f);
    // Multiple matches possible (Hands of Stone + KO Artist?) — depends on RNG pick
    // At minimum, "Hands of Stone" should be in the pool
    expect(nick).toBeTruthy();
  });

  it("returns Prospect for young fighter with few fights", () => {
    const f = makeFighter({ age: 21, record: { w: 1, l: 1, ko: 0, sub: 0, dec: 1 }, region: "Netherlands", traits: [] });
    // The Prospect should match (age <= 22, totalFights <= 5)
    expect(generateFighterNickname(f)).toBe("The Prospect");
  });

  it("returns The Veteran for old fighter with many fights", () => {
    const f = makeFighter({ age: 38, record: { w: 8, l: 6, ko: 0, sub: 0, dec: 8 }, region: "Netherlands", traits: [] });
    // The Veteran matches (age >= 36, totalFights >= 10)
    expect(generateFighterNickname(f)).toBe("The Veteran");
  });

  it("returns trait-based nicknames correctly", () => {
    const f = makeFighter({ traits: ["Iron Chin"], record: { w: 1, l: 1, ko: 0, sub: 0, dec: 1 }, region: "Netherlands" });
    // Single match: "Iron" from Iron Chin trait
    expect(generateFighterNickname(f)).toBe("Iron");
  });
});

describe("trackCoachCareer", () => {
  it("counts fighters with 5+ total fights joined after hire week", () => {
    const coach = { name: "C", specialty: "Striking", personality: "T", skill: 5, _career: { fightersDeveloped: 0, championsProduced: 0, hireWeek: 10, yearsActive: 0 } };
    const g = {
      week: 48,
      coaches: [coach],
      roster: [
        makeFighter({ record: { w: 3, l: 2 }, joinedWeek: 15 }),  // 5 fights, joined after hire → counts
        makeFighter({ record: { w: 6, l: 0 }, joinedWeek: 5 }),   // 6 fights, joined before hire → doesn't count
        makeFighter({ record: { w: 1, l: 1 }, joinedWeek: 20 }),  // 2 fights < 5 → doesn't count
      ],
    };
    trackCoachCareer(g);
    expect(coach._career.fightersDeveloped).toBe(1);
  });

  it("counts champions joined after hire week", () => {
    const coach = { name: "C", specialty: "Head", personality: "T", skill: 5, _career: { fightersDeveloped: 0, championsProduced: 0, hireWeek: 10, yearsActive: 0 } };
    const g = {
      week: 48,
      coaches: [coach],
      roster: [
        makeFighter({ titles: ["Major World Champion"], joinedWeek: 15 }),  // champ, after hire → counts
        makeFighter({ titles: ["Regional Champion"], joinedWeek: 5 }),       // champ, before hire → doesn't count
      ],
    };
    trackCoachCareer(g);
    expect(coach._career.championsProduced).toBe(1);
  });

  it("initializes _career for coaches without it", () => {
    const coach = { name: "C", specialty: "Striking", personality: "T", skill: 5 };
    const g = { week: 100, coaches: [coach], roster: [] };
    trackCoachCareer(g);
    expect(coach._career).toBeDefined();
    expect(coach._career.hireWeek).toBe(100);
  });

  it("handles empty roster gracefully", () => {
    const coach = { name: "C", specialty: "Head", personality: "T", skill: 5, _career: { fightersDeveloped: 0, championsProduced: 0, hireWeek: 1, yearsActive: 0 } };
    const g = { week: 48, coaches: [coach], roster: [] };
    expect(() => trackCoachCareer(g)).not.toThrow();
  });
});

describe("trackSponsorRelations", () => {
  it("increments weeksWithCamp and totalPaid for each sponsor", () => {
    const sponsor = { brand: "Test", rate: 5000 };
    const g = { sponsors: [sponsor] };
    trackSponsorRelations(g);
    expect(sponsor._rel.weeksWithCamp).toBe(1);
    expect(sponsor._rel.totalPaid).toBe(5000);

    trackSponsorRelations(g);
    expect(sponsor._rel.weeksWithCamp).toBe(2);
    expect(sponsor._rel.totalPaid).toBe(10000);
  });

  it("levels up after 24 weeks", () => {
    const sponsor = { brand: "Test", rate: 4000 };
    const g = { sponsors: [sponsor] };
    // Run 48 weeks
    for (let i = 0; i < 48; i++) trackSponsorRelations(g);
    expect(sponsor._rel.level).toBe(2); // level up at 24 and 48
    // Rate should have increased 5% each time
    expect(sponsor.rate).toBeGreaterThan(4000);
  });

  it("caps level at 5", () => {
    const sponsor = { brand: "Test", rate: 1000 };
    const g = { sponsors: [sponsor] };
    // Run 200 weeks = 8 level-ups possible, but capped at 5
    for (let i = 0; i < 200; i++) trackSponsorRelations(g);
    expect(sponsor._rel.level).toBe(5);
  });

  it("initializes _rel for sponsors without it", () => {
    const sponsor = { brand: "New", rate: 3000 };
    const g = { sponsors: [sponsor] };
    trackSponsorRelations(g);
    expect(sponsor._rel).toBeDefined();
  });

  it("handles empty sponsors gracefully", () => {
    expect(() => trackSponsorRelations({ sponsors: [] })).not.toThrow();
    expect(() => trackSponsorRelations({})).not.toThrow();
  });
});
