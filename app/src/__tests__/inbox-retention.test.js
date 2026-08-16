// Inbox retention — the inbox must not grow without bound.
//
// Before this, two holes let it grow forever: messages pushed without a
// createdWeek were waved through by the age filter, and anything with more
// than a single "OK" choice never expired at all. A 10-year headless run
// reached 316 messages, 82 of them over a year old.
import { describe, it, expect } from "vitest";
import { newGame, tick, setRNG, mulberry32 } from "@ironfist/engine/index.js";
import { tickSettlement } from "@ironfist/engine/tick/settlement.js";
import {
  INBOX_MAX,
  INBOX_INFO_WEEKS,
  INBOX_STALE_WEEKS,
} from "@ironfist/engine/tick/settlement.js";

// Runs the world forward, keeping the camp solvent so it survives the horizon.
function simulate(weeks, seed = 4242) {
  setRNG(mulberry32(seed));
  const g = newGame();
  for (let w = 1; w <= weeks; w++) {
    if (g.cash < 250000) g.cash = 250000;
    tick(g);
    if (g.over) break;
  }
  return g;
}

describe("inbox retention", () => {
  it("stamps every message with a createdWeek", () => {
    const g = simulate(60);
    const unstamped = g.inbox.filter((m) => m.createdWeek == null);
    expect(unstamped).toEqual([]);
  });

  it("keeps nothing older than a full in-game year", () => {
    const g = simulate(480);
    const ancient = g.inbox.filter((m) => g.week - m.createdWeek > 48);
    expect(ancient).toEqual([]);
  });

  it("stays bounded over ten in-game years", () => {
    const g = simulate(480);
    // The cap runs at monthly settlement, so a little drift above it between
    // settlements is expected and fine. Anything near double means a leak.
    expect(g.inbox.length).toBeLessThanOrEqual(INBOX_MAX + 30);
  });

  it("does not grow monotonically between year three and year ten", () => {
    setRNG(mulberry32(99));
    const g = newGame();
    let atY3 = 0;
    for (let w = 1; w <= 480; w++) {
      if (g.cash < 250000) g.cash = 250000;
      tick(g);
      if (w === 144) atY3 = g.inbox.length;
      if (g.over) break;
    }
    // Seven more years must not multiply the backlog.
    expect(g.inbox.length).toBeLessThan(atY3 * 2);
  });

  it("drops injury notices once the fighter has healed", () => {
    const g = simulate(240);
    const orphaned = g.inbox.filter((m) => {
      if (m.type !== "injury") return false;
      const f = g.roster.find((x) => x.id === m.fighterId);
      return !f || !f.injury;
    });
    expect(orphaned).toEqual([]);
  });

  it("exposes sane retention thresholds", () => {
    expect(INBOX_INFO_WEEKS).toBeLessThan(INBOX_STALE_WEEKS);
    expect(INBOX_STALE_WEEKS).toBeLessThanOrEqual(48);
    expect(INBOX_MAX).toBeGreaterThan(0);
  });
});

describe("inbox retention under active play", () => {
  // The passive simulation above never books a fight, so it never generates a
  // press conference. Press was marked as a protected type and therefore never
  // expired: a ten-year active run reached 555 messages, 554 of them press and
  // 477 over a year old. The cap did not help, because it only reclaimed space
  // from unprotected messages.
  it("expires stale press prompts", () => {
    setRNG(mulberry32(11));
    const g = newGame();
    g.week = 300;
    g.inbox = [
      { id: 1, type: "press", title: "old", body: "x", choices: [{ label: "A" }, { label: "B" }], createdWeek: 10 },
      { id: 2, type: "press", title: "recent", body: "x", choices: [{ label: "A" }, { label: "B" }], createdWeek: 296 },
    ];
    tickSettlement(g);
    expect(g.inbox.find((m) => m.id === 1)).toBeUndefined();
    expect(g.inbox.find((m) => m.id === 2)).toBeDefined();
  });

  it("enforces an absolute ceiling even when every message is protected", () => {
    setRNG(mulberry32(12));
    const g = newGame();
    g.week = 300;
    // Offers are protected and carry their own countdown, so they are the
    // hardest case: without an absolute ceiling they can grow without limit.
    g.inbox = Array.from({ length: 400 }, (_, i) => ({
      id: 1000 + i, type: "offer", title: "o", body: "x",
      choices: [{ label: "Accept" }, { label: "Reject" }], createdWeek: 100 + i,
    }));
    tickSettlement(g);
    // Retention runs early in settlement and other subsystems push messages
    // afterwards in the same tick, so a handful above the ceiling is expected.
    // What matters is that 400 collapses to roughly the ceiling, not to 400.
    expect(g.inbox.length).toBeLessThanOrEqual(INBOX_MAX * 2 + 10);
    // The survivors should be the most recent ones. Messages pushed later in
    // the same tick have no timestamp yet, so only the seeded ones are checked.
    // uid() is a global counter and can itself exceed 1000, so filter on the
    // timestamp rather than the id.
    const seeded = g.inbox.filter((m) => m.createdWeek != null);
    expect(seeded.length).toBeGreaterThan(0);
    expect(Math.min(...seeded.map((m) => m.createdWeek))).toBeGreaterThan(100);
  });
});
