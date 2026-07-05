import { R, RI, pick, uid } from "./rng.js";
import { RIVAL_NAMES, RIVAL_TRAITS } from "./data.js";
import { genFighter, assignAgent, genCoach } from "./fighter.js";

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
    fighters, coaches: [genCoach(), genCoach()].slice(0, traitKey === "Elite Stable" ? 2 : 1),
    chemistry: RI(40, 75), cash: RI(30000, 100000),
    rivalry: 0,
    lastScoutWeek: 0,
  };
}
