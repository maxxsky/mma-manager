// Proactive roster release.
//
// A fighter could previously only leave by asking to, which required their
// morale to fall below 20. That froze the roster: camp prestige raises the
// calibre of incoming prospects, but a full roster of journeymen has no room
// for them, so roster average skill sat flat for a decade while intake quality
// rose 70%. Releasing carries a real cost so that churn does not become the
// dominant strategy.
import { describe, it, expect } from "vitest";
import { newGame, reducer, setRNG, mulberry32 } from "@ironfist/engine/index.js";

function camp(seed = 5) {
  setRNG(mulberry32(seed));
  const g = newGame();
  g.cash = 5_000_000;
  return g;
}

describe("RELEASE_FIGHTER", () => {
  it("removes the fighter from the roster", () => {
    const g = camp();
    const target = g.roster[0];
    const before = g.roster.length;
    reducer(g, { type: "RELEASE_FIGHTER", fighterId: target.id });
    expect(g.roster.length).toBe(before - 1);
    expect(g.roster.find((f) => f.id === target.id)).toBeUndefined();
  });

  it("charges severance", () => {
    const g = camp();
    const before = g.cash;
    reducer(g, { type: "RELEASE_FIGHTER", fighterId: g.roster[0].id });
    expect(g.cash).toBeLessThan(before);
  });

  it("costs chemistry and reputation", () => {
    const g = camp();
    g.rep = 60;
    const chem = g.chemistry;
    reducer(g, { type: "RELEASE_FIGHTER", fighterId: g.roster[0].id });
    expect(g.chemistry).toBeLessThan(chem);
    expect(g.rep).toBeLessThan(60);
  });

  it("hurts reputation more when the fighter was worth keeping", () => {
    const a = camp();
    a.rep = 80;
    a.roster[0].titles = ["Regional Champion"];
    reducer(a, { type: "RELEASE_FIGHTER", fighterId: a.roster[0].id });
    const titledDrop = 80 - a.rep;

    const b = camp();
    b.rep = 80;
    b.roster[0].titles = [];
    for (const k of Object.keys(b.roster[0].attrs)) b.roster[0].attrs[k] = 20;
    reducer(b, { type: "RELEASE_FIGHTER", fighterId: b.roster[0].id });
    const plainDrop = 80 - b.rep;

    expect(titledDrop).toBeGreaterThan(plainDrop);
  });

  it("refuses when the camp cannot pay severance", () => {
    const g = camp();
    g.cash = 10;
    const before = g.roster.length;
    reducer(g, { type: "RELEASE_FIGHTER", fighterId: g.roster[0].id });
    expect(g.roster.length).toBe(before);
    expect(g.cash).toBe(10);
  });

  it("ignores an unknown fighter", () => {
    const g = camp();
    const before = g.roster.length;
    const cash = g.cash;
    reducer(g, { type: "RELEASE_FIGHTER", fighterId: 999999 });
    expect(g.roster.length).toBe(before);
    expect(g.cash).toBe(cash);
  });

  it("vacates a divisional belt the fighter was holding", () => {
    const g = camp();
    const champ = g.roster[0];
    const div = g.divisions[champ.weightClass];
    div.champ = { fighterId: champ.id, name: champ.name, player: true };
    champ.titles = ["Major World Champion"];
    reducer(g, { type: "RELEASE_FIGHTER", fighterId: champ.id });
    expect(g.divisions[champ.weightClass].champ?.fighterId).not.toBe(champ.id);
  });
});
