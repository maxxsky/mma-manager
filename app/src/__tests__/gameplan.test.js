// Game plan persistence — a booked fighter's chosen game plan must survive
// into game state, and the Dashboard nag must clear once it is set.
import { describe, it, expect } from "vitest";
import { reducer } from "@ironfist/engine/reducer.js";
import { GAME_PLANS } from "@ironfist/engine/data.js";

function makeState() {
  return {
    week: 10,
    cash: 50000,
    roster: [
      {
        id: 1,
        name: "Test Fighter",
        booked: { opponent: { name: "Opp" }, weeksLeft: 4, tier: "Local" },
      },
      { id: 2, name: "Unbooked Fighter", booked: null },
    ],
    inbox: [],
    log: [],
    actionLog: [],
  };
}

// Mirrors the Dashboard priority filter exactly.
function gamePlanNags(g) {
  return g.roster.filter((f) => f.booked && !f.booked.gamePlan);
}

describe("SET_GAME_PLAN", () => {
  it("persists the chosen plan onto the fighter's booking", () => {
    const g = makeState();
    reducer(g, { type: "SET_GAME_PLAN", fighterId: 1, plan: "Take It Down" });
    expect(g.roster[0].booked.gamePlan).toBe("Take It Down");
  });

  it("clears the dashboard nag once a plan is set", () => {
    const g = makeState();
    expect(gamePlanNags(g)).toHaveLength(1);
    reducer(g, { type: "SET_GAME_PLAN", fighterId: 1, plan: "Finish It" });
    expect(gamePlanNags(g)).toHaveLength(0);
  });

  it("ignores an unknown plan name", () => {
    const g = makeState();
    reducer(g, { type: "SET_GAME_PLAN", fighterId: 1, plan: "Nonsense Plan" });
    expect(g.roster[0].booked.gamePlan).toBeUndefined();
    expect(gamePlanNags(g)).toHaveLength(1);
  });

  it("ignores a fighter with no booking", () => {
    const g = makeState();
    reducer(g, { type: "SET_GAME_PLAN", fighterId: 2, plan: "Finish It" });
    expect(g.roster[1].booked).toBeNull();
  });

  it("allows changing the plan while the booking is live", () => {
    const g = makeState();
    reducer(g, { type: "SET_GAME_PLAN", fighterId: 1, plan: "Take It Down" });
    reducer(g, { type: "SET_GAME_PLAN", fighterId: 1, plan: "Keep It Standing" });
    expect(g.roster[0].booked.gamePlan).toBe("Keep It Standing");
  });

  it("accepts every plan defined in GAME_PLANS", () => {
    for (const key of Object.keys(GAME_PLANS)) {
      const g = makeState();
      reducer(g, { type: "SET_GAME_PLAN", fighterId: 1, plan: key });
      expect(g.roster[0].booked.gamePlan).toBe(key);
    }
  });
});
