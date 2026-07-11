// Fighter domain — training, class changes, poaching, prospect dismissal
import { clamp, R, random, fmt$ } from "../rng.js";
import { WEIGHTS } from "../data.js";
import { vacateTitle } from "../rankings.js";
import {
  MORALE_BOOST_COUNTER_POACH, MORALE_BOOST_TALK,
  CHEM_PENALTY_TALK_POACH, CHEM_MIN_TALK_POACH,
  MANAGER_CUT_INCREMENT, MANAGER_CUT_MAX,
} from "./constants.js";

export function reduceFighter(g, action) {
  switch (action.type) {
    case "SET_TRAINING": {
      const f = g.roster.find((x) => x.id === action.fighterId);
      if (f) { f.training.type = action.program; f.training.intensity = action.intensity || "Medium"; }
      break;
    }
    case "CLASS_CHANGE_ACCEPT": {
      const f2 = g.roster.find((x) => x.id === action.fighterId);
      if (f2) {
        const oldClass = f2.weightClass;
        const delta = action.targetIdx - WEIGHTS.findIndex((w) => w.name === oldClass);
        f2.weightClassDelta = (f2.weightClassDelta || 0) + delta;
        f2.weightClass = action.targetClass;
        f2.natWeight = Math.round(WEIGHTS[action.targetIdx].limit * R(1.0, 1.09));
        vacateTitle(g, f2);
        f2.rankPoints = Math.max(0, f2.rankPoints - 20);
        f2.morale = clamp(f2.morale + action.moraleEffect, 0, 100);
        f2.lastClassChange = g.week;
        // Career history
        if (!f2.careerHistory) f2.careerHistory = [];
        f2.careerHistory.push({ week: g.week, type: "class", text: `⚖️ ${oldClass} → ${action.targetClass}` });
        g.log.unshift(`⚖️ ${f2.name} pindah dari ${oldClass} ke ${action.targetClass} (permintaan sendiri).`);
      }
      break;
    }
    case "CLASS_CHANGE_REJECT": {
      const f2 = g.roster.find((x) => x.id === action.fighterId);
      if (f2) {
        f2.morale = clamp(f2.morale + action.moralePenalty, 0, 100);
        f2.lastClassChange = g.week;
        g.log.unshift(`🙅 ${f2.name} minta pindah kelas — permintaan ditolak (morale ${action.moralePenalty > 0 ? "+" : ""}${action.moralePenalty}).`);
      }
      break;
    }
    case "COUNTER_POACH": {
      const f4 = g.roster.find((x) => x.id === action.fighterId);
      if (f4 && g.cash >= action.cost) {
        g.cash -= action.cost;
        f4.morale = clamp(f4.morale + MORALE_BOOST_COUNTER_POACH, 0, 100);
        if (f4.contract) f4.contract.managerCut = clamp((f4.contract.managerCut || 0.18) + MANAGER_CUT_INCREMENT, 0, MANAGER_CUT_MAX);
        g.log.unshift("💰 " + f4.name + " dipertahankan — bonus match. Cash -" + action.cost + ".");
      }
      break;
    }
    case "TALK_POACH": {
      const f5 = g.roster.find((x) => x.id === action.fighterId);
      if (f5 && g.chemistry >= CHEM_MIN_TALK_POACH) {
        f5.morale = clamp(f5.morale + MORALE_BOOST_TALK, 0, 100);
        g.chemistry = clamp(g.chemistry - CHEM_PENALTY_TALK_POACH, 0, 100);
        g.log.unshift("🤝 " + f5.name + " diyakinkan bertahan. Chemistry -" + CHEM_PENALTY_TALK_POACH + ".");
      }
      break;
    }
    case "DISMISS_PROSPECT": {
      g.prospects = g.prospects.filter((x) => x.id !== action.prospectId);
      break;
    }
    case "POACH_FIGHTER": {
      const riv = g.rivals?.find((x) => x.id === action.rivalId);
      if (!riv) break;
      const tf = riv.fighters?.find((x) => x.id === action.targetId);
      if (!tf) break;
      if (random() * 100 < action.successChance) {
        tf.contract = { managerCut: 0.15, fightsLeft: 3, fightsTotal: 3, durationMo: 18, signedWeek: g.week, renegoFlagged: false };
        tf.morale = clamp(tf.morale + 15, 0, 100);
        g.roster.push(tf);
        riv.fighters = riv.fighters.filter((x) => x.id !== action.targetId);
        g.cash -= action.cost;
        riv.rivalry = clamp(riv.rivalry + 20, 0, 100);
        g.log.unshift(`🦅 POACH SUKSES: ${tf.name} (${tf.archetype}) dari ${riv.name}!`);
      } else {
        g.cash -= action.failCost;
        riv.rivalry = clamp(riv.rivalry + 5, 0, 100);
        g.log.unshift(`❌ Poach ${tf.name} GAGAL (${fmt$(action.failCost)}) — ${riv.name} sadar.`);
      }
      break;
    }
  }
}
