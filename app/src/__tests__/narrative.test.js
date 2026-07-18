// Fight narrative tests — story generation, signature moments, context, record creation
// No RNG used — all functions are pure data transformations
import { describe, it, expect } from "vitest";
import {
  generateFightNarrative,
  detectSignatureMoments,
  getFightContext,
  createFightRecord,
} from "@ironfist/engine/narrative.js";

// ── Round log helpers ──

function makeRound(overrides = {}) {
  return {
    landA: overrides.landA ?? 10,
    landB: overrides.landB ?? 8,
    scoreA: overrides.scoreA ?? 10,
    scoreB: overrides.scoreB ?? 9,
    knockdown: overrides.knockdown ?? false,
    tdA: overrides.tdA ?? 0,
    tdB: overrides.tdB ?? 0,
    finish: overrides.finish ?? null,
    log: overrides.log ?? [],
    ...overrides,
  };
}

function makeResult(overrides = {}) {
  return {
    won: overrides.won ?? true,
    how: overrides.how ?? "Decision",
    r: overrides.r ?? 3,
    ...overrides,
  };
}

function makeFighter(overrides = {}) {
  return {
    id: overrides.id ?? "f-1",
    name: overrides.name ?? "Test Fighter",
    weightClass: overrides.weightClass ?? "Lightweight",
    record: overrides.record ?? { w: 5, l: 1, ko: 0, sub: 0, dec: 5 },
    streakW: overrides.streakW ?? 2,
    streakL: overrides.streakL ?? 0,
    titles: overrides.titles ?? [],
    booked: overrides.booked ?? null,
    rivalries: overrides.rivalries ?? {},
    lastFightWeek: overrides.lastFightWeek ?? 50,
    ...overrides,
  };
}

function makeOpponent(overrides = {}) {
  return {
    id: overrides.id ?? "f-2",
    name: overrides.name ?? "Opponent",
    weightClass: overrides.weightClass ?? "Lightweight",
    record: overrides.record ?? { w: 4, l: 2, ko: 0, sub: 0, dec: 4 },
    ...overrides,
  };
}

// ── Tests ──

describe("generateFightNarrative", () => {
  it("returns empty story for null roundLogs", () => {
    const story = generateFightNarrative(makeFighter(), makeOpponent(), null, makeResult());
    expect(story.narrative).toBe("");
    expect(story.keyMoments).toEqual([]);
    expect(story.rating).toBe(0);
  });

  it("returns empty story for empty roundLogs array", () => {
    const story = generateFightNarrative(makeFighter(), makeOpponent(), [], makeResult());
    expect(story.narrative).toBe("");
    expect(story.keyMoments).toEqual([]);
    expect(story.rating).toBe(0);
  });

  it("detects multiple knockdowns key moment", () => {
    const roundLogs = [
      makeRound({ knockdown: true }),
      makeRound({ knockdown: true }),
      makeRound({ landA: 5, landB: 3 }),
    ];
    const story = generateFightNarrative(makeFighter(), makeOpponent(), roundLogs, makeResult({ won: true }));
    expect(story.keyMoments.some((m) => m.type === "multiple_knockdowns")).toBe(true);
  });

  it("detects flash KO (KO/TKO in round 1)", () => {
    const roundLogs = [makeRound({ finish: { how: "KO/TKO" } })];
    const story = generateFightNarrative(
      makeFighter(), makeOpponent(), roundLogs,
      makeResult({ won: true, how: "KO/TKO", r: 1 }),
    );
    expect(story.keyMoments.some((m) => m.type === "flash_ko")).toBe(true);
  });

  it("detects close decision when score margin < 10", () => {
    const roundLogs = [
      makeRound({ scoreA: 10, scoreB: 9 }),
      makeRound({ scoreA: 9, scoreB: 10 }),
      makeRound({ scoreA: 10, scoreB: 9 }),
    ];
    // totalScoreA = 29, totalScoreB = 28, diff = 1 < 10
    const story = generateFightNarrative(makeFighter(), makeOpponent(), roundLogs, makeResult({ won: true }));
    expect(story.keyMoments.some((m) => m.type === "close_decision")).toBe(true);
  });

  it("detects momentum shift when round winner changes", () => {
    // Fighter A dominates round 1, Fighter B dominates round 2 → shift from A to B
    // But Fighter A ultimately wins → momentum_shift key moment only if shift toward winner
    // So we test turningPoint directly, not the key moment (which requires shift toward winner)
    const roundLogs = [
      makeRound({ landA: 20, landB: 2, scoreA: 10, scoreB: 8 }),
      makeRound({ landA: 3, landB: 18, scoreA: 8, scoreB: 10 }),
      makeRound({ landA: 15, landB: 5, scoreA: 10, scoreB: 9 }),
    ];
    const story = generateFightNarrative(makeFighter(), makeOpponent(), roundLogs, makeResult({ won: true }));
    expect(story.turningPoint).not.toBeNull();
    expect(story.turningPoint.toRound).toBe(2);
    // momentum_shift key moment not present because shift was toward opponent, not winner
  });

  it("adds momentum_shift key moment when shift goes toward winner", () => {
    // Fighter B dominates round 1 (opponent ahead), Fighter A dominates round 2 → shift from B to A
    // Fighter A wins → shift toward winner → key moment fires
    const roundLogs = [
      makeRound({ landA: 3, landB: 18, scoreA: 8, scoreB: 10 }),
      makeRound({ landA: 20, landB: 2, scoreA: 10, scoreB: 8 }),
      makeRound({ landA: 15, landB: 5, scoreA: 10, scoreB: 9 }),
    ];
    const story = generateFightNarrative(makeFighter(), makeOpponent(), roundLogs, makeResult({ won: true }));
    expect(story.keyMoments.some((m) => m.type === "momentum_shift")).toBe(true);
  });

  it("calculates rating between 1 and 5", () => {
    const roundLogs = [
      makeRound({ knockdown: true, finish: { how: "KO/TKO" } }),
      makeRound({ knockdown: true }),
    ];
    const story = generateFightNarrative(
      makeFighter(), makeOpponent(), roundLogs,
      makeResult({ won: true, how: "KO/TKO", r: 1 }),
    );
    expect(story.rating).toBeGreaterThanOrEqual(1);
    expect(story.rating).toBeLessThanOrEqual(5);
  });

  it("includes title fight in narrative text when booked fight is a title fight", () => {
    const fighter = makeFighter({ booked: { title: true, opponent: { name: "Challenger" } } });
    const roundLogs = [makeRound({}), makeRound({}), makeRound({})];
    const story = generateFightNarrative(fighter, makeOpponent(), roundLogs, makeResult({ won: true }));
    expect(story.narrative).toContain("remains the champion");
  });

  it("generates early domination narrative when Fighter A dominates first 2 rounds", () => {
    const roundLogs = [
      makeRound({ landA: 20, landB: 2, scoreA: 10, scoreB: 8 }),
      makeRound({ landA: 18, landB: 3, scoreA: 10, scoreB: 8 }),
      makeRound({ landA: 8, landB: 7, scoreA: 9, scoreB: 10 }),
    ];
    const story = generateFightNarrative(makeFighter({ name: "Dominator" }), makeOpponent(), roundLogs, makeResult({ won: true }));
    expect(story.narrative).toContain("came out strong");
  });
});

describe("detectSignatureMoments", () => {
  it("returns empty array for null roundLogs", () => {
    const moments = detectSignatureMoments(makeFighter(), null, makeResult());
    expect(moments).toEqual([]);
  });

  it("returns empty array for empty roundLogs", () => {
    const moments = detectSignatureMoments(makeFighter(), [], makeResult());
    expect(moments).toEqual([]);
  });

  it("detects Fight of the Night: 3+ rounds, high action, close score", () => {
    const roundLogs = [
      makeRound({ landA: 15, landB: 14, scoreA: 10, scoreB: 9 }),
      makeRound({ landA: 12, landB: 13, scoreA: 9, scoreB: 10 }),
      makeRound({ landA: 14, landB: 12, scoreA: 10, scoreB: 9 }),
      makeRound({ landA: 11, landB: 10, scoreA: 9, scoreB: 10 }),
    ];
    // total landA+landB = 101 > 40, total score diff = |38-38|=0 < 15, rnd=4 >= 3
    const moments = detectSignatureMoments(makeFighter(), roundLogs, makeResult({ r: 4 }));
    expect(moments.some((m) => m.id === "fotn")).toBe(true);
  });

  it("detects War: 2+ knockdowns + high damage", () => {
    const roundLogs = [
      makeRound({ landA: 20, landB: 15, knockdown: true }),
      makeRound({ landA: 18, landB: 10, knockdown: true }),
      makeRound({ landA: 5, landB: 3 }),
    ];
    // totalLand = 71 > 50, knockCount = 2
    const moments = detectSignatureMoments(makeFighter(), roundLogs, makeResult());
    expect(moments.some((m) => m.id === "war")).toBe(true);
  });

  it("detects Flash KO: KO/TKO in round 1", () => {
    const roundLogs = [makeRound({ finish: { how: "KO/TKO" } })];
    const moments = detectSignatureMoments(makeFighter(), roundLogs, makeResult({ how: "KO/TKO", r: 1 }));
    expect(moments.some((m) => m.id === "flash_ko")).toBe(true);
  });

  it("detects Comeback KO: KO in round 3+ after losing early rounds", () => {
    const roundLogs = [
      makeRound({ scoreA: 8, scoreB: 10 }),  // lost round 1
      makeRound({ scoreA: 8, scoreB: 10 }),  // lost round 2 (earlyScore = (10-8)+(10-8) = 4... wait)
      makeRound({ scoreA: 10, scoreB: 8 }),  // won round 3
    ];
    // earlyScore = (scoreB-scoreA) for first 2 = (10-8)+(10-8) = 4... that's not > 5
    // Let me recalculate: earlyScore = (10-8) + (10-8) = 2 + 2 = 4. Need > 5.
    // I need bigger score differences in first 2 rounds
    const roundLogs2 = [
      makeRound({ scoreA: 8, scoreB: 10 }),  // lost round 1 clearly
      makeRound({ scoreA: 7, scoreB: 10 }),  // lost round 2 clearly (earlyScore = (10-8)+(10-7) = 5... NOT > 5)
    ];
    // Hmm, "earlyScore > 5" means strictly greater than 5.
    // (10-8)+(10-7) = 5 — not > 5
    // Need (10-8)+(10-6) = 6 > 5, so round 2 scoreA = 6
    const roundLogs3 = [
      makeRound({ scoreA: 8, scoreB: 10 }),
      makeRound({ scoreA: 6, scoreB: 10 }), // (10-8)+(10-6) = 6 > 5
    ];
    // For rnd >= 3, need a 3rd round with KO
    // Add the KO round
    roundLogs3.push(makeRound({ scoreA: 10, scoreB: 7, finish: { how: "KO/TKO" } }));
    
    const moments = detectSignatureMoments(
      makeFighter({ name: "Comeback King" }),
      roundLogs3,
      makeResult({ won: true, how: "KO/TKO", r: 3 }),
    );
    expect(moments.some((m) => m.id === "comeback_ko")).toBe(true);
  });

  it("detects Submission Clinic: 3+ sub attempts", () => {
    const roundLogs = [
      makeRound({ log: ["submission attempt", "submission attempt"] }),
      makeRound({ log: ["submission attempt"] }),
    ];
    // subAttempts = 3
    const moments = detectSignatureMoments(makeFighter(), roundLogs, makeResult());
    expect(moments.some((m) => m.id === "sub_clinic")).toBe(true);
  });

  it("detects One-Sided Beatdown: 3x score differential", () => {
    const roundLogs = [
      makeRound({ scoreA: 30, scoreB: 9, landA: 25, landB: 5 }),
      makeRound({ scoreA: 30, scoreB: 9, landA: 25, landB: 5 }),
    ];
    // scoreA = 60, scoreB = 18, 60 > 18*3 = 54
    const moments = detectSignatureMoments(makeFighter(), roundLogs, makeResult());
    expect(moments.some((m) => m.id === "beatdown")).toBe(true);
  });

  it("detects Huge Upset: beating #3 contender", () => {
    const roundLogs = [makeRound({})];
    const fighter = makeFighter({ name: "Underdog", booked: { oppRank: 2 } });
    const moments = detectSignatureMoments(fighter, roundLogs, makeResult({ won: true }));
    expect(moments.some((m) => m.id === "upset")).toBe(true);
  });

  it("does NOT detect upset when losing or opponent not top-3", () => {
    const roundLogs = [makeRound({})];
    // Lost the fight
    const moments1 = detectSignatureMoments(makeFighter({ booked: { oppRank: 2 } }), roundLogs, makeResult({ won: false }));
    expect(moments1.some((m) => m.id === "upset")).toBe(false);

    // Opponent rank is 10
    const moments2 = detectSignatureMoments(makeFighter({ booked: { oppRank: 10 } }), roundLogs, makeResult({ won: true }));
    expect(moments2.some((m) => m.id === "upset")).toBe(false);
  });

  it("does NOT detect Fight of the Night when score diff is too large", () => {
    const roundLogs = [
      makeRound({ landA: 20, landB: 2, scoreA: 10, scoreB: 8 }),
      makeRound({ landA: 18, landB: 3, scoreA: 10, scoreB: 7 }),
    ];
    // total score diff = (10-8)+(10-7) = 5... that's < 15
    // But total land = 43 < 40 threshold, so let me increase
    const roundLogs2 = [
      makeRound({ landA: 25, landB: 2, scoreA: 30, scoreB: 8 }),
      makeRound({ landA: 20, landB: 3, scoreA: 28, scoreB: 7 }),
    ];
    // totalLand = 50 > 40, but score diff = (30-8)+(28-7) = 43 > 15
    const moments = detectSignatureMoments(makeFighter(), roundLogs2, makeResult({ r: 3 }));
    expect(moments.some((m) => m.id === "fotn")).toBe(false);
  });
});

describe("getFightContext", () => {
  it("returns title context when fighter has title booked", () => {
    const fighter = makeFighter({ booked: { title: true, opponent: { name: "X" } } });
    const ctx = getFightContext(fighter, makeOpponent(), {});
    expect(ctx.some((c) => c.type === "title")).toBe(true);
    expect(ctx.find((c) => c.type === "title").text).toContain("Lightweight");
  });

  it("returns defense context when booked as mandatory defense", () => {
    const fighter = makeFighter({ booked: { defense: true, opponent: { name: "X" } } });
    const ctx = getFightContext(fighter, makeOpponent(), {});
    expect(ctx.some((c) => c.type === "defense")).toBe(true);
  });

  it("returns rivalry context when fighter has fought opponent 2+ times", () => {
    const fighter = makeFighter({
      rivalries: { "Opponent": { count: 2, wins: 1, losses: 1 } },
    });
    const ctx = getFightContext(fighter, makeOpponent({ name: "Opponent" }), {});
    expect(ctx.some((c) => c.type === "rivalry")).toBe(true);
  });

  it("returns streak context for 3+ win streak", () => {
    const fighter = makeFighter({ streakW: 5, booked: { opponent: { name: "X" } } });
    const ctx = getFightContext(fighter, makeOpponent(), {});
    expect(ctx.some((c) => c.type === "streak")).toBe(true);
    expect(ctx.find((c) => c.type === "streak").text).toContain("5-fight win streak");
  });

  it("returns losing context for 2+ loss streak", () => {
    const fighter = makeFighter({ streakL: 2, booked: { opponent: { name: "X" } } });
    const ctx = getFightContext(fighter, makeOpponent(), {});
    expect(ctx.some((c) => c.type === "losing")).toBe(true);
  });

  it("does NOT return both winning and losing streak simultaneously", () => {
    const fighter = makeFighter({ streakW: 3, streakL: 0, booked: { opponent: { name: "X" } } });
    const ctx = getFightContext(fighter, makeOpponent(), {});
    expect(ctx.some((c) => c.type === "streak")).toBe(true);
    expect(ctx.some((c) => c.type === "losing")).toBe(false);
  });

  it("returns upset context when opponent rank <= 3", () => {
    const fighter = makeFighter({ booked: { oppRank: 3, opponent: { name: "X" } } });
    const ctx = getFightContext(fighter, makeOpponent(), {});
    expect(ctx.some((c) => c.type === "upset")).toBe(true);
  });

  it("returns main_event context when booked as main event", () => {
    const fighter = makeFighter({ booked: { isMainEvent: true, opponent: { name: "X" } } });
    const ctx = getFightContext(fighter, makeOpponent(), {});
    expect(ctx.some((c) => c.type === "main_event")).toBe(true);
  });

  it("returns empty context for vanilla fight with no special conditions", () => {
    const fighter = makeFighter({ booked: { opponent: { name: "X" } } });
    const ctx = getFightContext(fighter, makeOpponent(), {});
    expect(ctx.length).toBe(0);
  });
});

describe("createFightRecord", () => {
  it("stores win/loss result correctly", () => {
    const record = createFightRecord(
      makeFighter({ name: "Winner" }),
      makeOpponent({ name: "Loser" }),
      [],
      makeResult({ won: true, how: "KO/TKO", r: 2 }),
      { narrative: "Great fight!", rating: 4, keyMoments: [{ type: "flash_ko" }] },
      [{ id: "flash_ko" }, { id: "fotn" }],
    );
    expect(record.result).toBe("W");
    expect(record.fighter).toBe("Winner");
    expect(record.opponent).toBe("Loser");
    expect(record.method).toBe("KO/TKO");
    expect(record.round).toBe(2);
    expect(record.narrative).toBe("Great fight!");
    expect(record.rating).toBe(4);
    expect(record.signatureMoments).toContain("flash_ko");
    expect(record.signatureMoments).toContain("fotn");
  });

  it("records loss", () => {
    const record = createFightRecord(
      makeFighter({ name: "Loser" }),
      makeOpponent({ name: "Winner" }),
      [],
      makeResult({ won: false, how: "Decision", r: 5 }),
      { narrative: "", rating: 3, keyMoments: [] },
      [],
    );
    expect(record.result).toBe("L");
    expect(record.method).toBe("Decision");
    expect(record.round).toBe(5);
  });

  it("falls back to booked opponent name when opponent arg is null", () => {
    const fighter = makeFighter({ booked: { opponent: { name: "Booked Opp" } } });
    const record = createFightRecord(fighter, null, [], makeResult(), { narrative: "", rating: 3, keyMoments: [] }, []);
    expect(record.opponent).toBe("Booked Opp");
  });

  it("handles missing narrative gracefully", () => {
    const record = createFightRecord(makeFighter(), makeOpponent(), [], makeResult(), null, null);
    expect(record.narrative).toBe("");
    expect(record.rating).toBe(3);
    expect(record.signatureMoments).toEqual([]);
    expect(record.keyMoments).toEqual([]);
  });
});
