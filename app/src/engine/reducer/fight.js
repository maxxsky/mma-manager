// Fight domain — accept, counter, reject fight offers
import { clamp, random, uid } from "../rng.js";
import {
  PROMOTER_REL_GAIN_ACCEPT, PROMOTER_REL_LOSS_COUNTER, PROMOTER_REL_LOSS_REJECT,
} from "./constants.js";
import { vacateTitle } from "../rankings.js";

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
          seed: Math.floor(random() * 2**31),
        };
        g.inbox = g.inbox.filter((x) => x.id !== action.messageId);
        if (g.promoterRel) g.promoterRel[action.tier] = clamp((g.promoterRel[action.tier] || 30) + PROMOTER_REL_GAIN_ACCEPT, 0, 100);
        g.log.unshift("📝 " + nf.name + " menerima fight " + action.tier + " vs " + (action.opponent ? action.opponent.name : "?") + ". Relasi " + action.tier + " +" + PROMOTER_REL_GAIN_ACCEPT + ".");
        // Press conference — pick your stance
        g.inbox.unshift({
          id: uid(),
          type: "press",
          fighterId: nf.id,
          opponentName: action.opponent?.name || "?",
          title: "📺 Press Conference: " + nf.name + " vs " + (action.opponent?.name || "?"),
          body: "The media is asking about your mindset going into this fight. How do you want to handle the press conference?",
          choices: [
            { label: "💪 Confident — 'I'm going to dominate'", choice: "confident" },
            { label: "🙏 Humble — 'Respect my opponent, do my best'", choice: "humble" },
            { label: "🔥 Trash Talk — 'He's nothing. Easy work.'", choice: "trashTalk" },
          ],
        });
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
          seed: Math.floor(random() * 2**31),
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
    case "VACATE_TITLE": {
      const f = g.roster.find((x) => x.id === action.fighterId);
      if (f) vacateTitle(g, f);
      break;
    }
    case "SET_PRESS_CHOICE": {
      const pf = g.roster.find((x) => x.id === action.fighterId);
      if (pf && pf.booked) {
        pf.booked.pressChoice = action.choice;
        g.inbox = g.inbox.filter((x) => x.id !== action.messageId);
        if (action.choice === "confident") {
          pf.popularity = clamp((pf.popularity || 0) + 2, 0, 100);
          g.log.unshift("📺 " + pf.name + " tampil percaya diri di press conference. Popularity +2.");
        } else if (action.choice === "humble") {
          pf.morale = clamp((pf.morale || 0) + 3, 0, 100);
          g.log.unshift("📺 " + pf.name + " bersikap rendah hati di press conference. Morale +3.");
        } else if (action.choice === "trashTalk") {
          g.log.unshift("📺 " + pf.name + " melontarkan trash talk lawan! Ditunggu hasilnya.");
        }
      }
      break;
    }
  }
}
