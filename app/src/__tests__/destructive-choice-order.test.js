// Any prompt that can permanently remove a fighter must list that option last.
//
// Five separate prompts carry a release option. Four already put it at the
// bottom; the low-morale retention prompt led with it, which makes losing a
// fighter the reflex answer. A scripted run gave away a generational prospect
// this way after one bad injury.
import { describe, it, expect } from "vitest";
import { newGame, setRNG, mulberry32 } from "@ironfist/engine/index.js";
import { tickSettlement } from "@ironfist/engine/tick/settlement.js";

describe("destructive choices are never the default", () => {
  it("puts release last on the low-morale retention prompt", () => {
    setRNG(mulberry32(31));
    const g = newGame();
    g.week = 100;
    const f = g.roster[0];
    f.morale = 5;
    g.inbox = [];
    tickSettlement(g);

    const prompt = g.inbox.find((m) => m.choices?.some((c) => c.release === f.id));
    expect(prompt).toBeDefined();
    const idx = prompt.choices.findIndex((c) => c.release);
    expect(idx).toBe(prompt.choices.length - 1);
  });

  it("offers a way to keep the fighter alongside the release", () => {
    setRNG(mulberry32(31));
    const g = newGame();
    g.week = 100;
    const f = g.roster[0];
    f.morale = 5;
    g.inbox = [];
    tickSettlement(g);

    // Identify the retention prompt specifically — contract-expiry prompts also
    // carry a release option but offer renewal rather than a morale fix.
    const prompt = g.inbox.find((m) => m.choices?.some((c) => c.release === f.id) && m.choices.length === 3);
    expect(prompt).toBeDefined();
    expect(prompt.choices.some((c) => c.moraleTo)).toBe(true);
  });

  it("puts release last on contract-expiry prompts too", () => {
    setRNG(mulberry32(33));
    const g = newGame();
    g.week = 400;
    const f = g.roster[0];
    f.contract = { ...f.contract, durationMo: 1, signedWeek: 1, fightsLeft: 2 };
    g.inbox = [];
    tickSettlement(g);

    for (const m of g.inbox) {
      if (!m.choices?.some((c) => c.release)) continue;
      const idx = m.choices.findIndex((c) => c.release);
      expect(idx).toBe(m.choices.length - 1);
    }
  });
});
