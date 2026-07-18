// Dynasty & Legacy tests — camp history, records, Hall of Fame, identity
import { describe, it, expect } from "vitest";
import {
  getCampDynasty,
  updateDynasty,
  updateRegionStats,
  getCampIdentity,
  getWorldRecords,
  checkHallOfFame,
  getGenerationalLinks,
} from "@ironfist/engine/dynasty.js";

// ── Helpers ──

function makeGame(overrides = {}) {
  return {
    week: 100,
    roster: [],
    coaches: [],
    divisions: {},
    rep: 30,
    legacy: 0,
    campTier: 0,
    ...overrides,
  };
}

function makeFighter(overrides = {}) {
  return {
    id: overrides.id || "f-1",
    name: overrides.name || "Test Fighter",
    age: overrides.age ?? 25,
    weightClass: overrides.weightClass || "Lightweight",
    region: overrides.region || "USA",
    archetype: overrides.archetype || "All-Rounder",
    record: overrides.record || { w: 0, l: 0, ko: 0, sub: 0, dec: 0 },
    titles: overrides.titles || [],
    titleDefenses: overrides.titleDefenses ?? 0,
    streakW: overrides.streakW ?? 0,
    streakL: overrides.streakL ?? 0,
    milestoneFirstTitle: overrides.milestoneFirstTitle ?? false,
    milestone10Wins: overrides.milestone10Wins ?? false,
    milestone3Losses: overrides.milestone3Losses ?? false,
    giantKills: overrides.giantKills ?? 0,
    joinedWeek: overrides.joinedWeek ?? 1,
    lastFightWeek: overrides.lastFightWeek ?? 1,
  };
}

// ── Tests ──

describe("getCampDynasty", () => {
  it("initializes _dynasty with default values when missing", () => {
    const g = makeGame();
    const d = getCampDynasty(g);

    expect(g._dynasty).toBeDefined();
    expect(d.foundedWeek).toBe(100);
    expect(d.totalFightersEver).toBe(0);
    expect(d.championsProduced).toBe(0);
    expect(d.worldChampionsProduced).toBe(0);
    expect(d.totalTitleDefenses).toBe(0);
    expect(d.totalWins).toBe(0);
    expect(d.totalLosses).toBe(0);
    expect(d.totalKOs).toBe(0);
    expect(d.totalSubs).toBe(0);
    expect(d.hallOfFamers).toEqual([]);
    expect(d.milestones).toEqual([]);
    expect(d.peakRep).toBe(30);
    expect(d.peakLegacy).toBe(0);
  });

  it("includes live state from roster and camp", () => {
    const g = makeGame({
      week: 200,
      roster: [
        makeFighter({ titles: ["Major World Champion"] }),
        makeFighter({ titles: ["Regional Champion"] }),
        makeFighter({ titles: [] }),
      ],
      campTier: 3,
      rep: 75,
      legacy: 12000,
    });
    updateDynasty(g); // populates _dynasty
    const d = getCampDynasty(g);

    expect(d.totalFighters).toBe(3);
    expect(d.activeChampions).toBe(2);
    expect(d.currentTier).toBe(3);
    expect(d.currentRep).toBe(75);
    expect(d.currentLegacy).toBe(12000);
    expect(d.currentWeek).toBe(200);
  });

  it("returns 0 active champions for roster without titles", () => {
    const g = makeGame({ roster: [makeFighter({ titles: [] }), makeFighter({ titles: [] })] });
    updateDynasty(g);
    expect(getCampDynasty(g).activeChampions).toBe(0);
  });
});

describe("updateDynasty", () => {
  it("tracks cumulative wins, losses, KOs, subs across ticks", () => {
    const g = makeGame({
      roster: [
        makeFighter({ record: { w: 10, l: 2, ko: 5, sub: 1, dec: 4 } }),
        makeFighter({ record: { w: 5, l: 3, ko: 2, sub: 0, dec: 3 } }),
      ],
    });
    updateDynasty(g);
    expect(g._dynasty.totalWins).toBe(15);
    expect(g._dynasty.totalLosses).toBe(5);
    expect(g._dynasty.totalKOs).toBe(7);
    expect(g._dynasty.totalSubs).toBe(1);
  });

  it("tracks champions produced — Major World Champion counts as world champ", () => {
    const g = makeGame({
      roster: [
        makeFighter({ titles: ["Major World Champion"] }),
        makeFighter({ titles: ["Regional Champion"] }),
      ],
    });
    updateDynasty(g);
    expect(g._dynasty.championsProduced).toBe(2);
    expect(g._dynasty.worldChampionsProduced).toBe(1);
  });

  it("tracks title defenses from all fighters", () => {
    const g = makeGame({
      roster: [
        makeFighter({ titleDefenses: 5 }),
        makeFighter({ titleDefenses: 2 }),
      ],
    });
    updateDynasty(g);
    expect(g._dynasty.totalTitleDefenses).toBe(7);
  });

  it("updates peak rep and legacy", () => {
    const g = makeGame({ rep: 60, legacy: 8000 });
    updateDynasty(g);
    expect(g._dynasty.peakRep).toBe(60);
    expect(g._dynasty.peakLegacy).toBe(8000);

    g.rep = 80;
    g.legacy = 15000;
    updateDynasty(g);
    expect(g._dynasty.peakRep).toBe(80);
    expect(g._dynasty.peakLegacy).toBe(15000);
  });

  it("does not decrease cumulative counters when roster shrinks", () => {
    const g = makeGame({
      roster: [
        makeFighter({ record: { w: 10, l: 2, ko: 5, sub: 1, dec: 4 } }),
        makeFighter({ record: { w: 8, l: 1, ko: 3, sub: 2, dec: 3 } }),
      ],
    });
    updateDynasty(g);
    expect(g._dynasty.totalWins).toBe(18);

    // Roster shrinks (old fighter leaves)
    g.roster = [makeFighter({ record: { w: 10, l: 2, ko: 5, sub: 1, dec: 4 } })];
    updateDynasty(g);
    // totalWins should NOT decrease — it tracks peak
    expect(g._dynasty.totalWins).toBe(18);
  });
});

describe("updateRegionStats", () => {
  it("initializes all region keys with zeros for empty state", () => {
    const g = makeGame();
    updateRegionStats(g);

    const rs = g._worldHistory.regionStats;
    expect(rs).toBeDefined();
    ["Brazil", "Russia", "USA", "Netherlands", "Japan", "Nigeria", "UK", "Indonesia"].forEach((r) => {
      expect(rs[r]).toBeDefined();
      expect(rs[r].championsProduced).toBe(0);
      expect(rs[r].totalFighters).toBe(0);
    });
  });

  it("counts AI fighters from division lists by region", () => {
    const g = makeGame({
      divisions: {
        Lightweight: {
          list: [
            { name: "Fighter A", region: "Brazil" },
            { name: "Fighter B", region: "Brazil" },
            { name: "Fighter C", region: "USA" },
          ],
          champ: null,
        },
        Welterweight: {
          list: [
            { name: "Fighter D", region: "Japan" },
          ],
          champ: null,
        },
      },
    });
    updateRegionStats(g);
    const rs = g._worldHistory.regionStats;
    expect(rs.Brazil.totalFighters).toBe(2);
    expect(rs.USA.totalFighters).toBe(1);
    expect(rs.Japan.totalFighters).toBe(1);
    expect(rs.Russia.totalFighters).toBe(0);
  });

  it("counts player roster fighters by region", () => {
    const g = makeGame({
      roster: [
        makeFighter({ region: "Nigeria" }),
        makeFighter({ region: "Nigeria" }),
        makeFighter({ region: "UK" }),
      ],
      divisions: {},
    });
    updateRegionStats(g);
    const rs = g._worldHistory.regionStats;
    expect(rs.Nigeria.totalFighters).toBe(2);
    expect(rs.UK.totalFighters).toBe(1);
  });

  it("counts champions by region from AI divisions", () => {
    const g = makeGame({
      divisions: {
        Lightweight: {
          list: [{ name: "Champ Alpha", region: "Brazil" }],
          champ: { name: "Champ Alpha" },
        },
        Welterweight: {
          list: [{ name: "Champ Beta", region: "Japan" }],
          champ: { name: "Champ Beta" },
        },
      },
    });
    updateRegionStats(g);
    const rs = g._worldHistory.regionStats;
    expect(rs.Brazil.championsProduced).toBe(1);
    expect(rs.Japan.championsProduced).toBe(1);
  });

  it("counts champions by region from player roster fallback", () => {
    const g = makeGame({
      roster: [makeFighter({ name: "Player Champ", region: "Indonesia", weightClass: "Lightweight" })],
      divisions: {
        Lightweight: {
          list: [],
          champ: { name: "Player Champ" },
        },
      },
    });
    updateRegionStats(g);
    const rs = g._worldHistory.regionStats;
    expect(rs.Indonesia.championsProduced).toBe(1);
  });
});

describe("getCampIdentity", () => {
  it("returns empty array for fresh camp with no stats", () => {
    const g = makeGame();
    const ids = getCampIdentity(g);
    expect(ids).toEqual([]);
  });

  it("returns Prospect Factory when many fighters but few champs", () => {
    const g = makeGame({ roster: Array(10).fill(null).map((_, i) => makeFighter({ id: `f-${i}` })) });
    updateDynasty(g); // totalFightersEver = 10, championsProduced = 0
    const ids = getCampIdentity(g);
    expect(ids.some((i) => i.id === "prospect_factory")).toBe(true);
  });

  it("returns Championship Camp when 3+ champions", () => {
    const g = makeGame({
      roster: [
        makeFighter({ titles: ["Major World Champion"] }),
        makeFighter({ titles: ["Regional Champion"] }),
        makeFighter({ titles: ["National Champion"] }),
      ],
    });
    updateDynasty(g);
    const ids = getCampIdentity(g);
    expect(ids.some((i) => i.id === "championship_camp")).toBe(true);
  });

  it("returns Knockout Factory when 20+ fights and KO rate > 50%", () => {
    const g = makeGame({
      roster: [makeFighter({ record: { w: 15, l: 5, ko: 12, sub: 0, dec: 3 } })],
    });
    updateDynasty(g);
    // 20 total fights, koRate = 12/20 = 0.6 > 0.5
    const ids = getCampIdentity(g);
    expect(ids.some((i) => i.id === "ko_factory")).toBe(true);
  });

  it("does NOT return Knockout Factory when KO rate is low", () => {
    const g = makeGame({
      roster: [makeFighter({ record: { w: 10, l: 10, ko: 1, sub: 0, dec: 19 } })],
    });
    updateDynasty(g);
    const ids = getCampIdentity(g);
    expect(ids.some((i) => i.id === "ko_factory")).toBe(false);
  });

  it("returns Legendary Camp when legacy >= 50000", () => {
    const g = makeGame({ legacy: 50000 });
    updateDynasty(g);
    const ids = getCampIdentity(g);
    expect(ids.some((i) => i.id === "legendary")).toBe(true);
  });

  it("returns Dynasty when camp is 500+ weeks old", () => {
    const g = makeGame({ week: 600 });
    // Simulate camp founded at week 50 by directly patching _dynasty
    getCampDynasty(g); // inits with foundedWeek = 600
    g._dynasty.foundedWeek = 50; // camp was founded at week 50
    const ids = getCampIdentity(g);
    expect(ids.some((i) => i.id === "dynasty")).toBe(true);
  });
});

describe("getWorldRecords", () => {
  it("returns default records for empty state", () => {
    const g = makeGame();
    const records = getWorldRecords(g);
    expect(records).toHaveLength(6);
    records.forEach((r) => {
      expect(r.label).toBeTruthy();
      expect(r.holder).toBe("—");
    });
  });

  it("tracks most title defenses from roster", () => {
    const g = makeGame({
      week: 150,
      roster: [
        makeFighter({ name: "Title King", titleDefenses: 7 }),
        makeFighter({ name: "Also Good", titleDefenses: 3 }),
      ],
    });
    const records = getWorldRecords(g);
    const defRec = records.find((r) => r.label === "Most Title Defenses");
    expect(defRec.value).toBe("7");
    expect(defRec.holder).toBe("Title King");
  });

  it("tracks most wins, KOs, subs from roster", () => {
    const g = makeGame({
      roster: [
        makeFighter({ name: "Veteran", record: { w: 25, l: 5, ko: 12, sub: 0, dec: 13 } }),
      ],
    });
    const records = getWorldRecords(g);
    expect(records.find((r) => r.label === "Most Wins").value).toBe("25");
    expect(records.find((r) => r.label === "Most KOs").value).toBe("12");
    expect(records.find((r) => r.label === "Most Submissions").value).toBe("0");
  });

  it("tracks youngest and oldest champion", () => {
    const g = makeGame({
      week: 200,
      roster: [
        makeFighter({ name: "Young Gun", age: 22, titles: ["Champion"], milestoneFirstTitle: true }),
        makeFighter({ name: "Old Warhorse", age: 38, titles: ["Champion"] }),
      ],
    });
    const records = getWorldRecords(g);
    const young = records.find((r) => r.label === "Youngest Champion");
    const old = records.find((r) => r.label === "Oldest Champion");
    expect(young.value).toBe("22y");
    expect(young.holder).toBe("Young Gun");
    expect(old.value).toBe("38y");
    expect(old.holder).toBe("Old Warhorse");
  });

  it("skips youngestChamp for fighters without milestoneFirstTitle", () => {
    const g = makeGame({
      roster: [
        makeFighter({ name: "Young But No Title", age: 20, titles: [], milestoneFirstTitle: false }),
      ],
    });
    const records = getWorldRecords(g);
    expect(records.find((r) => r.label === "Youngest Champion").holder).toBe("—");
  });

  it("persists best records across multiple calls", () => {
    const g = makeGame({ week: 100 });
    // First call with a good fighter
    g.roster = [makeFighter({ name: "Best", record: { w: 20, l: 0, ko: 10, sub: 0, dec: 10 } })];
    getWorldRecords(g);

    // Second call with a weaker fighter — records should not decrease
    g.roster = [makeFighter({ name: "Worse", record: { w: 5, l: 3, ko: 0, sub: 0, dec: 5 } })];
    const records = getWorldRecords(g);
    expect(records.find((r) => r.label === "Most Wins").value).toBe("20");
    expect(records.find((r) => r.label === "Most KOs").value).toBe("10");
  });
});

describe("checkHallOfFame", () => {
  it("inducts fighter with high win count and champion status", () => {
    const g = makeGame({ week: 200 });
    const f = makeFighter({
      record: { w: 15, l: 3, ko: 8, sub: 2, dec: 5 },
      titles: ["Major World Champion"],
      titleDefenses: 3,
      milestoneFirstTitle: true,
    });
    // score: 15*2 + 30(champ) + 20(Major) + 3*5(def) + 10(firstTitle) = 30+30+20+15+10 = 105 >= 50
    const result = checkHallOfFame(f, g);

    expect(result).not.toBeNull();
    expect(result.name).toBe("Test Fighter");
    expect(result.record).toBe("15-3");
    expect(result.titles).toContain("Major World Champion");
    expect(result.defenses).toBe(3);
    expect(result.highlights).toContain("World Champion");
    expect(result.highlights).toContain("3x Title Defenses");
  });

  it("does NOT induct fighter below score threshold", () => {
    const g = makeGame();
    const f = makeFighter({
      record: { w: 3, l: 5, ko: 1, sub: 0, dec: 2 },
      titles: [],
      titleDefenses: 0,
    });
    // score: 3*2 = 6 < 50
    const result = checkHallOfFame(f, g);
    expect(result).toBeNull();
  });

  it("inducts fighter with KO artist bonus when ko >= 10", () => {
    const g = makeGame();
    const f = makeFighter({
      record: { w: 12, l: 2, ko: 10, sub: 0, dec: 2 },
      titles: ["Champion"],
      titleDefenses: 2,
    });
    // score: 12*2 + 30(champ) + 2*5(def) + 10(ko>=10) = 24+30+10+10 = 74 >= 50
    const result = checkHallOfFame(f, g);
    expect(result).not.toBeNull();
    expect(result.highlights).toContain("Knockout Artist");
  });

  it("inducts fighter with submission specialist bonus when sub >= 8", () => {
    const g = makeGame();
    const f = makeFighter({
      name: "Sub King",
      record: { w: 10, l: 2, ko: 0, sub: 8, dec: 2 },
      titles: ["Champion"],
    });
    // score: 10*2 + 30(champ) + 10(sub>=8) = 20+30+10 = 60 >= 50
    const result = checkHallOfFame(f, g);
    expect(result).not.toBeNull();
    expect(result.highlights).toContain("Submission Specialist");
  });

  it("does NOT induct the same fighter twice", () => {
    const g = makeGame();
    const f = makeFighter({
      record: { w: 15, l: 3, ko: 8, sub: 2, dec: 5 },
      titles: ["Major World Champion"],
      titleDefenses: 3,
      milestoneFirstTitle: true,
    });
    const first = checkHallOfFame(f, g);
    expect(first).not.toBeNull();
    expect(g._hallOfFame).toHaveLength(1);

    const second = checkHallOfFame(f, g);
    expect(second).toBeNull();
    expect(g._hallOfFame).toHaveLength(1); // no duplicate
  });

  it("adds entry to g._hallOfFame and updates g._dynasty.hallOfFamers", () => {
    const g = makeGame();
    updateDynasty(g); // init _dynasty
    const f = makeFighter({
      name: "HoF Entry",
      record: { w: 20, l: 5, ko: 12, sub: 3, dec: 5 },
      titles: ["Major World Champion"],
      titleDefenses: 5,
      milestoneFirstTitle: true,
      milestone10Wins: true,
    });
    checkHallOfFame(f, g);

    expect(g._hallOfFame).toHaveLength(1);
    expect(g._hallOfFame[0].name).toBe("HoF Entry");
    expect(g._dynasty.hallOfFamers).toContain("HoF Entry");
  });

  it("uses milestone10Wins bonus correctly", () => {
    const g = makeGame();
    const f = makeFighter({
      record: { w: 10, l: 0, ko: 0, sub: 0, dec: 10 },
      titles: ["Champion"],
      milestone10Wins: true,
    });
    // score: 10*2 + 30(champ) + 15(milestone10Wins) = 20+30+15 = 65 >= 50
    const result = checkHallOfFame(f, g);
    expect(result).not.toBeNull();
  });

  it("uses giantKills and comeback bonuses", () => {
    const g = makeGame();
    const f = makeFighter({
      record: { w: 8, l: 4, ko: 2, sub: 1, dec: 5 },
      titles: ["Champion"],
      giantKills: 3,
      streakW: 2,
      milestone3Losses: true,
    });
    // score: 8*2 + 30(champ) + 15(giantKills=3) + 5(comeback) = 16+30+15+5 = 66 >= 50
    const result = checkHallOfFame(f, g);
    expect(result).not.toBeNull();
  });

  it("returns null for fighter with zero titles and few wins (worst case)", () => {
    const g = makeGame();
    const f = makeFighter({
      record: { w: 0, l: 10, ko: 0, sub: 0, dec: 0 },
      titles: [],
    });
    // score: 0*2 = 0 < 50
    expect(checkHallOfFame(f, g)).toBeNull();
  });
});

describe("getGenerationalLinks", () => {
  it("returns empty array when no _dynasty exists", () => {
    const g = makeGame();
    delete g._dynasty;
    expect(getGenerationalLinks(g)).toEqual([]);
  });

  it("returns empty array when no hall of fame or coaches match", () => {
    const g = makeGame();
    updateDynasty(g); // init _dynasty
    g.coaches = [{ name: "Coach Smith", skill: 5 }];
    expect(getGenerationalLinks(g)).toEqual([]);
  });

  it("detects fighter-to-coach link when HoF name matches coach surname", () => {
    const g = makeGame();
    updateDynasty(g);
    g._hallOfFame = [{ name: "Anderson Silva", id: "h-1" }];
    g.coaches = [{ name: "Coach Silva", skill: 6 }];
    const links = getGenerationalLinks(g);
    expect(links.some((l) => l.type === "fighter_to_coach")).toBe(true);
    expect(links[0].text).toContain("Anderson Silva");
  });

  it("detects coach_legacy when coach produced 2+ champions", () => {
    const g = makeGame();
    updateDynasty(g);
    g.coaches = [{ name: "Coach Legend", _career: { championsProduced: 3 } }];
    const links = getGenerationalLinks(g);
    expect(links.some((l) => l.type === "coach_legacy")).toBe(true);
    expect(links[0].text).toContain("3 champions");
  });

  it("does NOT create coach_legacy link when coach produced < 2 champions", () => {
    const g = makeGame();
    updateDynasty(g);
    g.coaches = [{ name: "Coach Newbie", _career: { championsProduced: 1 } }];
    const links = getGenerationalLinks(g);
    expect(links.some((l) => l.type === "coach_legacy")).toBe(false);
  });
});
