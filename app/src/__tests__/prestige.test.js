// Camp prestige — the loop that lets a save keep progressing past year four.
//
// Every other progression axis caps early: fighters realise ~85% of their
// potential by year three, reputation and camp tier max out sooner. Prestige
// is the axis that does not cap early, and it works by making the camp's
// accumulated history raise the calibre of talent that comes through the door.
import { describe, it, expect } from "vitest";
import {
  getPrestige,
  getPrestigeTier,
  prospectTierWeights,
  specialProspectChance,
  PRESTIGE_MAX,
} from "@ironfist/engine/prestige.js";
import { newGame, setRNG, mulberry32 } from "@ironfist/engine/index.js";
import { genTalentEntry } from "@ironfist/engine/talentPool.js";

function campWith(dynasty, week = 1) {
  return { week, _dynasty: { foundedWeek: 1, ...dynasty } };
}

const shareOf = (weights, id) => {
  const total = weights.reduce((s, t) => s + t.weight, 0);
  return weights.find((t) => t.id === id).weight / total;
};

describe("getPrestige", () => {
  it("is zero for a camp with no history", () => {
    expect(getPrestige({ week: 1 })).toBe(0);
    expect(getPrestige(campWith({}))).toBe(0);
  });

  it("rewards champions, defences and hall of famers", () => {
    const bare = getPrestige(campWith({}));
    const champs = getPrestige(campWith({ championsProduced: 3 }));
    const hof = getPrestige(campWith({ hallOfFamers: [{}, {}] }));
    const defs = getPrestige(campWith({ totalTitleDefenses: 10 }));
    expect(champs).toBeGreaterThan(bare);
    expect(hof).toBeGreaterThan(bare);
    expect(defs).toBeGreaterThan(bare);
  });

  it("never exceeds the cap even for an absurd history", () => {
    const p = getPrestige(
      campWith(
        {
          championsProduced: 999,
          worldChampionsProduced: 999,
          totalTitleDefenses: 999,
          hallOfFamers: new Array(99).fill({}),
          peakLegacy: 9_999_999,
        },
        99999,
      ),
    );
    expect(p).toBe(PRESTIGE_MAX);
  });

  it("cannot be reduced by losing the current roster", () => {
    const g = campWith({ championsProduced: 4, hallOfFamers: [{}] }, 480);
    const before = getPrestige(g);
    g.roster = [];
    expect(getPrestige(g)).toBe(before);
  });

  it("is never negative", () => {
    expect(getPrestige(campWith({ peakLegacy: -5000 }))).toBeGreaterThanOrEqual(0);
  });
});

describe("prospectTierWeights", () => {
  it("matches the base distribution at zero prestige", () => {
    const w = prospectTierWeights(0);
    expect(shareOf(w, "common")).toBeCloseTo(0.70, 2);
    expect(shareOf(w, "generational")).toBeCloseTo(0.01, 2);
  });

  it("shifts share away from common as prestige rises", () => {
    const low = shareOf(prospectTierWeights(0), "common");
    const mid = shareOf(prospectTierWeights(50), "common");
    const high = shareOf(prospectTierWeights(PRESTIGE_MAX), "common");
    expect(mid).toBeLessThan(low);
    expect(high).toBeLessThan(mid);
  });

  it("keeps common the largest single bucket until very high prestige", () => {
    const w = prospectTierWeights(55);
    expect(shareOf(w, "common")).toBeGreaterThan(shareOf(w, "promising"));
  });

  it("never eliminates any tier", () => {
    for (const p of [0, 25, 50, 75, 100]) {
      for (const t of prospectTierWeights(p)) {
        expect(t.weight).toBeGreaterThan(0);
      }
    }
  });

  it("improves the odds of a special find without making it routine", () => {
    expect(specialProspectChance(0)).toBeCloseTo(8, 0);
    const top = specialProspectChance(PRESTIGE_MAX);
    expect(top).toBeGreaterThan(25);
    expect(top).toBeLessThan(50);
  });
});

describe("getPrestigeTier", () => {
  it("moves up through the labels", () => {
    expect(getPrestigeTier(0).id).toBe("unknown");
    expect(getPrestigeTier(20).id).toBe("known");
    expect(getPrestigeTier(40).id).toBe("respected");
    expect(getPrestigeTier(60).id).toBe("renowned");
    expect(getPrestigeTier(90).id).toBe("legendary");
  });
});

describe("talent pool wiring", () => {
  it("produces better prospects for a decorated camp than a new one", () => {
    const decorated = campWith(
      {
        championsProduced: 6,
        worldChampionsProduced: 3,
        totalTitleDefenses: 20,
        hallOfFamers: [{}, {}, {}],
        peakLegacy: 40000,
      },
      960,
    );
    expect(getPrestige(decorated)).toBeGreaterThan(60);

    const headroom = (f) =>
      Object.keys(f.ceilings).reduce((s, k) => s + (f.ceilings[k] - f.attrs[k]), 0);

    // Same seed for both, so any difference comes from the weight table.
    const N = 250;
    let plain = 0, fancy = 0;
    setRNG(mulberry32(2024));
    for (let i = 0; i < N; i++) plain += headroom(genTalentEntry(null));
    setRNG(mulberry32(2024));
    for (let i = 0; i < N; i++) fancy += headroom(genTalentEntry(decorated));

    expect(fancy).toBeGreaterThan(plain);
  });

  it("falls back to the default distribution with no game state", () => {
    setRNG(mulberry32(5));
    const f = genTalentEntry();
    expect(f.potentialTier).toBeTruthy();
    expect(f.ceilings).toBeTruthy();
  });

  it("leaves a fresh camp's prospects unchanged", () => {
    setRNG(mulberry32(77));
    const a = genTalentEntry(newGame());
    setRNG(mulberry32(77));
    const b = genTalentEntry(null);
    expect(a.potentialTier).toBe(b.potentialTier);
  });
});
