// Dynasty counters must be cumulative across the life of the camp.
//
// They used to be high-water marks taken over the current roster, which is the
// opposite of a dynasty record: producing five champions across twenty years
// registered as "1" unless two belts were held simultaneously, and a retiring
// champion subtracted their wins, KOs and title defences from the totals.
// Prestige is derived from these numbers, so undercounting here quietly caps
// the entire long game.
import { describe, it, expect } from "vitest";
import { updateDynasty } from "@ironfist/engine/dynasty.js";
import { getPrestige } from "@ironfist/engine/prestige.js";

function camp() {
  return { week: 1, rep: 0, legacy: 0, roster: [] };
}

function fighter(id, over = {}) {
  return {
    id,
    titles: [],
    record: { w: 0, l: 0, ko: 0, sub: 0 },
    titleDefenses: 0,
    ...over,
  };
}

describe("dynasty counters", () => {
  it("counts each champion once, not the peak held at one time", () => {
    const g = camp();
    g.roster = [fighter(1, { titles: ["Flyweight Champion"] })];
    updateDynasty(g);
    expect(g._dynasty.championsProduced).toBe(1);

    // Same fighter, seen again — must not double count.
    updateDynasty(g);
    expect(g._dynasty.championsProduced).toBe(1);

    // First champion leaves, a second one arrives. Never two at once.
    g.roster = [fighter(2, { titles: ["Bantamweight Champion"] })];
    updateDynasty(g);
    expect(g._dynasty.championsProduced).toBe(2);
  });

  it("keeps a retired fighter's record in the camp totals", () => {
    const g = camp();
    const f = fighter(1, { record: { w: 10, l: 2, ko: 4, sub: 1 }, titleDefenses: 3 });
    g.roster = [f];
    updateDynasty(g);
    // Arrived with that record — none of it belongs to this camp yet.
    expect(g._dynasty.totalWins).toBe(0);

    f.record.w = 15;
    f.record.ko = 7;
    f.titleDefenses = 5;
    updateDynasty(g);
    expect(g._dynasty.totalWins).toBe(5);
    expect(g._dynasty.totalTitleDefenses).toBe(2);

    g.roster = [];
    updateDynasty(g);
    expect(g._dynasty.totalWins).toBe(5);
    expect(g._dynasty.totalKOs).toBe(3);
    expect(g._dynasty.totalTitleDefenses).toBe(2);
  });

  it("adds a new generation's record on top of the old one", () => {
    const g = camp();
    const a = fighter(1);
    g.roster = [a];
    updateDynasty(g);
    a.record.w = 10;
    a.titleDefenses = 3;
    updateDynasty(g);

    const b = fighter(2);
    g.roster = [b];
    updateDynasty(g);
    b.record.w = 6;
    b.titleDefenses = 2;
    updateDynasty(g);

    expect(g._dynasty.totalWins).toBe(16);
    expect(g._dynasty.totalTitleDefenses).toBe(5);
  });

  it("tracks an active fighter's progress without double counting", () => {
    const g = camp();
    const f = fighter(1);
    g.roster = [f];
    updateDynasty(g);

    f.record.w = 3;
    f.record.ko = 1;
    updateDynasty(g);
    expect(g._dynasty.totalWins).toBe(3);

    f.record.w = 7;
    f.record.ko = 3;
    updateDynasty(g);
    expect(g._dynasty.totalWins).toBe(7);
    expect(g._dynasty.totalKOs).toBe(3);
  });

  it("separates world champions from ordinary ones", () => {
    const g = camp();
    g.roster = [
      fighter(1, { titles: ["Flyweight Champion"] }),
      fighter(2, { titles: ["Major World Champion"] }),
    ];
    updateDynasty(g);
    expect(g._dynasty.championsProduced).toBe(2);
    expect(g._dynasty.worldChampionsProduced).toBe(1);
  });

  it("never lets camp history fall", () => {
    const g = camp();
    const a = fighter(1, { titles: ["Flyweight Champion"] });
    const b = fighter(2, { titles: ["Major World Champion"] });
    g.roster = [a, b];
    g.week = 480;
    updateDynasty(g);
    a.record.w = 20; a.titleDefenses = 5;
    b.record.w = 15; b.titleDefenses = 4;
    updateDynasty(g);
    const before = getPrestige(g);
    expect(before).toBeGreaterThan(0);

    // Everyone retires at once.
    g.roster = [];
    g.week = 481;
    updateDynasty(g);
    expect(getPrestige(g)).toBeGreaterThanOrEqual(before);
  });
});
