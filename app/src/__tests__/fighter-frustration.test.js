// The fighter-frustration branch was unreachable by construction.
//
// The generator fires when a fighter has three ignored complaints on record,
// but nothing ever recorded one: onFightComplaintIgnored was exported and never
// called, and no complaint feature existed anywhere in the engine. The hook
// also set the fighter_frustrated flag itself, which the generator uses as its
// "already fired" guard — so even if it had been called, the first complaint
// would have blocked the event permanently.
//
// The trigger now hangs on an action the player already takes: ignoring a
// fighter who has asked to leave.
import { describe, it, expect } from "vitest";
import { newGame, reducer, setRNG, mulberry32 } from "@ironfist/engine/index.js";
import { getMemory, hasFlag } from "@ironfist/engine/events.js";
import { generateFighterEvents } from "@ironfist/engine/events/generators/fighter.js";

function ignoreOnce(g, fighter, id) {
  const msg = {
    id, type: "event", title: "x", body: "y",
    choices: [{ label: "Abaikan", chem: -5, complaint: fighter.id }],
  };
  g.inbox.unshift(msg);
  reducer(g, { type: "INBOX_EVENT", messageId: msg.id, choice: msg.choices[0], gambleRoll: 0.5 });
}

function setup(seed = 7) {
  setRNG(mulberry32(seed));
  const g = newGame();
  g.roster[0].morale = 15;
  return g;
}

const fire = (g) => generateFighterEvents(g, { roster: g.roster });
const subject = (g, id) => g.roster.find((f) => f.id === id);

describe("fighter frustration", () => {
  it("records a complaint each time the request is ignored", () => {
    const g = setup();
    const id = g.roster[0].id;
    expect(getMemory(subject(g, id), "complaint_ignored")).toBe(0);
    ignoreOnce(g, subject(g, id), 3001);
    expect(getMemory(subject(g, id), "complaint_ignored")).toBe(1);
    ignoreOnce(g, subject(g, id), 3002);
    expect(getMemory(subject(g, id), "complaint_ignored")).toBe(2);
  });

  it("does not fire below the threshold", () => {
    const g = setup();
    const id = g.roster[0].id;
    ignoreOnce(g, subject(g, id), 3011);
    ignoreOnce(g, subject(g, id), 3012);
    expect(fire(g)).toHaveLength(0);
  });

  it("fires once the third complaint lands", () => {
    const g = setup();
    const id = g.roster[0].id;
    for (let i = 0; i < 3; i++) ignoreOnce(g, subject(g, id), 3020 + i);
    const events = fire(g);
    expect(events).toHaveLength(1);
    expect(events[0].title).toContain("frustrasi");
  });

  it("fires only once, then stays quiet", () => {
    const g = setup();
    const id = g.roster[0].id;
    for (let i = 0; i < 4; i++) ignoreOnce(g, subject(g, id), 3030 + i);
    expect(fire(g)).toHaveLength(1);
    expect(hasFlag(subject(g, id), "fighter_frustrated")).toBe(true);
    expect(fire(g)).toHaveLength(0);
  });

  it("stays quiet if morale has recovered", () => {
    const g = setup();
    const id = g.roster[0].id;
    for (let i = 0; i < 3; i++) ignoreOnce(g, subject(g, id), 3040 + i);
    subject(g, id).morale = 80;
    expect(fire(g)).toHaveLength(0);
  });
});
