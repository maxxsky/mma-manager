// Contract domain — sign new fighters, extend existing contracts
import { clamp } from "../rng.js";
import { genBio } from "../fighter.js";
import { MORALE_BOOST_SIGN_EXTEND } from "./constants.js";

export function reduceContract(g, action) {
  if (action.type !== "SIGN_CONTRACT") return;

  if (action.mode === "sign") {
    const prospect = g.prospects.find((x) => x.id === action.prospectId);
    if (!prospect) return;
    const f = prospect.fighter;
    g.cash -= action.deal.signBonus;
    f.joinedWeek = g.week;
    if (prospect.grade === "S") f.ambitionRevealed = true;
    f.contract = {
      managerCut: action.deal.cut, fightsLeft: action.deal.fights,
      fightsTotal: action.deal.fights, durationMo: action.deal.duration,
      signedWeek: g.week, renegoFlagged: false,
      exclusive: action.deal.exclusive, rematch: action.deal.rematch,
      medical: action.deal.medical, equity: action.deal.equity,
    };
    g.roster.push(f);
    g.prospects = g.prospects.filter((x) => x.id !== action.prospectId);
    if (!f.bio) f.bio = genBio(f);
    g.log.unshift("✍️ " + f.name + " teken kontrak: cut " + Math.round(action.deal.cut * 100) + "%, " + action.deal.fights + " fight.");
  } else {
    const f = g.roster.find((x) => x.id === action.fighterId);
    if (!f) return;
    g.cash -= action.deal.signBonus;
    f.contract = {
      managerCut: action.deal.cut, fightsLeft: action.deal.fights,
      fightsTotal: action.deal.fights, durationMo: action.deal.duration,
      signedWeek: g.week, renegoFlagged: true,
      exclusive: action.deal.exclusive, rematch: action.deal.rematch,
      medical: action.deal.medical, equity: action.deal.equity,
    };
    f.morale = clamp(f.morale + MORALE_BOOST_SIGN_EXTEND, 0, 100);
    g.log.unshift("📝 " + f.name + " perpanjang kontrak: cut " + Math.round(action.deal.cut * 100) + "%, " + action.deal.fights + " fight.");
  }
}
