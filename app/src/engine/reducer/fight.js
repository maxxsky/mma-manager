// Fight domain — accept, counter, reject fight offers
import { clamp } from "../rng.js";
import {
  PROMOTER_REL_GAIN_ACCEPT, PROMOTER_REL_LOSS_COUNTER, PROMOTER_REL_LOSS_REJECT,
} from "./constants.js";

export function reduceFight(g, action) {
  switch (action.type) {
    case "ACCEPT_FIGHT": {
      const nf = g.roster.find((x) => x.id === action.fighterId);
      if (nf && !nf.booked) {
        nf.booked = {
          opponent: action.opponent, weeksLeft: action.weeks,
          show: action.show, winBonus: action.winBonus,
          tier: action.tier, title: action.title,
          titleTier: action.titleTier, defense: action.defense,
          oppRank: action.oppRank, contenderId: action.contenderId,
          seed: (Math.random() * 2**31) | 0,
        };
        g.inbox = g.inbox.filter((x) => x.id !== action.messageId);
        if (g.promoterRel) g.promoterRel[action.tier] = clamp((g.promoterRel[action.tier] || 30) + PROMOTER_REL_GAIN_ACCEPT, 0, 100);
        g.log.unshift("📝 " + nf.name + " menerima fight " + action.tier + " vs " + (action.opponent ? action.opponent.name : "?") + ". Relasi " + action.tier + " +" + PROMOTER_REL_GAIN_ACCEPT + ".");
      }
      break;
    }
    case "COUNTER_FIGHT": {
      const nf2 = g.roster.find((x) => x.id === action.fighterId);
      if (nf2 && !nf2.booked) {
        nf2.booked = {
          opponent: action.opponent, weeksLeft: action.weeks,
          show: action.boosted, winBonus: action.boostedWin,
          tier: action.tier, title: action.title,
          titleTier: action.titleTier, defense: action.defense,
          oppRank: action.oppRank, contenderId: action.contenderId,
          seed: (Math.random() * 2**31) | 0,
        };
        g.inbox = g.inbox.filter((x) => x.id !== action.messageId);
        if (g.promoterRel) g.promoterRel[action.tier] = clamp(action.rel - PROMOTER_REL_LOSS_COUNTER, 0, 100);
        g.log.unshift("💬 " + nf2.name + " counter offer diterima. Relasi " + action.tier + " -" + PROMOTER_REL_LOSS_COUNTER + ".");
      }
      break;
    }
    case "REJECT_FIGHT": {
      g.inbox = g.inbox.filter((x) => x.id !== action.messageId);
      if (g.promoterRel) g.promoterRel[action.tier] = clamp((g.promoterRel[action.tier] || 30) - PROMOTER_REL_LOSS_REJECT, 0, 100);
      if (action.stripTitle) {
        const f3 = g.roster.find((x) => x.id === action.fighterId);
        if (f3) { f3.titles = f3.titles.filter((t) => !t.includes("Champion")); }
      }
      break;
    }
  }
}
