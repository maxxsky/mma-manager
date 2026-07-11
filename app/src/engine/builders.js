// Builders — newGame() component factories
import { genFighter, assignAgent, genCoach } from "./fighter.js";
import { genDivisions, initPromoterRel } from "./rankings.js";
import { genRivalCamp } from "./rivals.js";

export function createEconomy() {
  return {
    cash: 35000,
    rep: 8,
    chemistry: 60,
    sponsors: [],
    relationships: {},
  };
}

export function createCamp() {
  return {
    facilities: { mats: 1, ring: 1, weights: 1, medical: 1 },
    campTier: 0,
    inbox: [],
    log: ["Camp dibuka. Budget awal $35,000. Bertahan dan menangkan fight."],
  };
}

export function createRoster() {
  const raw = [
    assignAgent(genFighter(0.55, "Indonesia")),
    assignAgent(genFighter(0.5)),
  ];
  return raw.map((f) => ({
    ...f,
    contract: {
      managerCut: 0.18, fightsLeft: 4, fightsTotal: 4,
      durationMo: 24, signedWeek: 0, renegoFlagged: false,
    },
  }));
}

export function createCoaches() {
  const freeCoach = genCoach(8); // rep awal = 8 (dari createCamp)
  freeCoach.salary = Math.max(500, freeCoach.salary);
  freeCoach.freeUntil = 4;
  return {
    coaches: [{ ...freeCoach, name: "Coach Basic", skill: 3, spec: "Head" }],
    coachMarket: [genCoach(8), genCoach(8), genCoach(8)],
  };
}

export function createWorld() {
  return {
    divisions: genDivisions(),
    prospects: [],
    rivals: [genRivalCamp(0), genRivalCamp(1), genRivalCamp(2)],
    promoterRel: initPromoterRel(),
  };
}
