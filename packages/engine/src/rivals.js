import { R, RI, clamp, pick, uid } from "./rng.js";
import { RIVAL_NAMES, RIVAL_TRAITS, CAMP_TIERS } from "./data.js";
import { genFighter, assignAgent, genCoach, avgSkill } from "./fighter.js";

// Poach price and odds from the target's current OVR, not the asking fee
// rolled at generation. Shared by the Rivals screen and POACH_FIGHTER so the
// reducer never trusts numbers sent by the UI.
export function poachTerms(g, rival, target) {
  const ovr = avgSkill(target);
  const rivalry = rival.rivalry || 0;
  const cost = Math.round(300 * Math.pow(Math.max(0, ovr - 30), 1.5) * (1 + rivalry / 100));
  const failCost = Math.round(cost * 0.2);
  const repEdge = clamp(((g.rep || 0) - (rival.rep || 0)) * 0.15, -10, 10);
  const successChance = Math.round(clamp(60 - rivalry * 0.4 - (ovr - 50) * 2 + repEdge, 5, 85));
  const rosterCap = CAMP_TIERS[g.campTier || 0]?.rosterCap ?? 8;
  const blocked = target.injury || target.booked ? "unavailable"
    : g.roster.length >= rosterCap ? "rosterFull"
    : g.cash < cost ? "cash"
    : null;
  return { ovr, cost, failCost, successChance, rosterCap, blocked };
}

export function genRivalCamp(idx) {
  const name = RIVAL_NAMES[idx % RIVAL_NAMES.length]
    + (idx > RIVAL_NAMES.length ? ` ${Math.floor(idx / RIVAL_NAMES.length)}` : "");
  const traitKey = pick(Object.keys(RIVAL_TRAITS));
  const trait = RIVAL_TRAITS[traitKey];
  const rep = RI(5, 35);
  const size = traitKey === "Elite Stable" ? RI(2, 3) : RI(4, 6);
  const fighters = [];
  for (let i = 0; i < size; i++) {
    const lvl = traitKey === "Elite Stable" ? R(0.75, 1.2) : R(0.35, 0.85);
    const f = assignAgent(genFighter(lvl));
    f.lastFightWeek = RI(0, 6);
    fighters.push(f);
  }
  return {
    id: uid(), name, trait: traitKey, traitData: trait, rep,
    philosophy: { id: traitKey === "Elite Stable" ? "elite" : "balanced" },
    fighters, coaches: [genCoach(), genCoach()].slice(0, traitKey === "Elite Stable" ? 2 : 1),
    chemistry: RI(40, 75), cash: RI(30000, 100000),
    rivalry: 0,
    lastScoutWeek: 0,
  };
}
