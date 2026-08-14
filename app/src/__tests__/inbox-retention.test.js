// Inbox retention — the inbox must not grow without bound.
//
// Before this, two holes let it grow forever: messages pushed without a
// createdWeek were waved through by the age filter, and anything with more
// than a single "OK" choice never expired at all. A 10-year headless run
// reached 316 messages, 82 of them over a year old.
import { describe, it, expect } from "vitest";
import { newGame, tick, setRNG, mulberry32 } from "@ironfist/engine/index.js";
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
