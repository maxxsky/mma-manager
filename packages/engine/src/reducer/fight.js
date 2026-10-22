// Fight domain — accept, counter, reject fight offers
import { clamp, random, uid } from "../rng.js";
import {
  PROMOTER_REL_GAIN_ACCEPT, PROMOTER_REL_LOSS_COUNTER, PROMOTER_REL_LOSS_REJECT,
} from "./constants.js";
import { vacateTitle, stripTitle, rankOf } from "../rankings.js";
import { GAME_PLANS } from "../data.js";

// Offer fields a booking carries. They are read from the inbox offer, never
// from the caller: the UI used to rebuild the booking by hand and dropped
// promotionId and isMainEvent, so promotion fight counts, exclusivity
// contracts and main-event narration never ran.
const OFFER_FIELDS = [
  "opponent", "show", "winBonus", "tier", "title", "titleTier", "defense", "oppRank", "contenderId",
  "promotionId", "promotionName", "isMainEvent", "isTitleEliminator", "isGrudgeMatch", "vacantTitle", "unificationFor",
];

const offerMessage = (g, action) =>
  g.inbox.find((x) => x.id === action.messageId && x.type === "offer" && x.opponent && !x.promotionContractOffer) || null;

function bookFromOffer(g, f, m, overrides = {}) {
  const terms = {};
  OFFER_FIELDS.forEach((k) => { if (m[k] !== undefined) terms[k] = m[k]; });
  f.booked = { ...terms, weeksLeft: m.weeks, ...overrides, playerRank: rankOf(g, f), seed: Math.floor(random() * 2**31) };
}

function rejectOffer(g, m) {
  g.inbox = g.inbox.filter((x) => x.id !== m.id);
  if (g.promoterRel) g.promoterRel[m.tier] = clamp((g.promoterRel[m.tier] || 30) - PROMOTER_REL_LOSS_REJECT, 0, 100);
  if (m.defense) stripTitle(g, m.fighterId, m.titleTier || "Major");
}

/** Chance (percent) the promoter accepts a counter, from the tier relation. */
export const counterChance = (g, tier) => clamp((g.promoterRel?.[tier] ?? 30) + 20, 10, 90);
/** Purse multiplier a successful counter gets. */
export const counterBoost = (rel) => 1.15 + rel / 200;

export function reduceFight(g, action) {
  switch (action.type) {
    case "ACCEPT_FIGHT": {
      const m = offerMessage(g, action);
      const nf = m && g.roster.find((x) => x.id === m.fighterId);
      if (nf && !nf.booked) {
        bookFromOffer(g, nf, m);
        g.inbox = g.inbox.filter((x) => x.id !== m.id);
        if (g.promoterRel) g.promoterRel[m.tier] = clamp((g.promoterRel[m.tier] || 30) + PROMOTER_REL_GAIN_ACCEPT, 0, 100);
        g.log.unshift("📝 " + nf.name + " menerima fight " + m.tier + " vs " + (m.opponent ? m.opponent.name : "?") + ". Relasi " + m.tier + " +" + PROMOTER_REL_GAIN_ACCEPT + ".");
        // Press conference — pick your stance.
        //
        // Only fights the media would actually turn up for. This used to fire
        // on every accepted offer, which at an eighteen-fighter roster meant a
        // standing queue of fifty-one unanswered press prompts — measured on a
        // ten-year save, they were 51 of the 53 items awaiting a decision.
        // Every one is a genuine multi-choice call with consequences, so the
        // player cannot safely skim them; the volume simply buried the feature.
        // Rationing it makes each one an event rather than paperwork.
        const pressWorthy =
          !!m.title ||
          m.tier === "Major" || m.tier === "Premier" ||
          (nf.rivalId != null && m.opponent?.id === nf.rivalId) ||
          (nf.record?.w || 0) + (nf.record?.l || 0) === 0 ||
          (rankOf(g, nf) ?? 99) <= 10;

        if (pressWorthy) g.inbox.unshift({
          id: uid(),
          type: "press",
          fighterId: nf.id,
          opponentName: m.opponent?.name || "?",
          title: "📺 Press Conference: " + nf.name + " vs " + (m.opponent?.name || "?"),
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
      // The engine rolls the promoter's answer (it used to be rolled in Inbox.jsx
      // with the boosted purse computed there).
      const m = offerMessage(g, action);
      const nf2 = m && g.roster.find((x) => x.id === m.fighterId);
      if (!nf2 || nf2.booked) break;
      const rel = g.promoterRel?.[m.tier] ?? 30;
      if (random() * 100 < counterChance(g, m.tier)) {
        const boost = counterBoost(rel);
        bookFromOffer(g, nf2, m, { show: Math.round(m.show * boost), winBonus: Math.round(m.winBonus * boost) });
        g.inbox = g.inbox.filter((x) => x.id !== m.id);
        if (g.promoterRel) g.promoterRel[m.tier] = clamp(rel - PROMOTER_REL_LOSS_COUNTER, 0, 100);
        g.log.unshift("💬 " + nf2.name + " counter offer diterima. Relasi " + m.tier + " -" + PROMOTER_REL_LOSS_COUNTER + ".");
      } else {
        rejectOffer(g, m);
        g.log.unshift("🚫 Promotor " + m.tier + " menolak counter — tawaran untuk " + nf2.name + " batal.");
      }
      break;
    }
    case "REJECT_FIGHT": {
      const m = offerMessage(g, action);
      if (m) rejectOffer(g, m);
      break;
    }
    case "VACATE_TITLE": {
      const f = g.roster.find((x) => x.id === action.fighterId);
      if (f) vacateTitle(g, f, action.titleTier || "Major");
      break;
    }
    case "SET_GAME_PLAN": {
      const gpf = g.roster.find((x) => x.id === action.fighterId);
      if (gpf && gpf.booked && GAME_PLANS[action.plan]) {
        gpf.booked.gamePlan = action.plan;
        g.log.unshift("📋 Game plan " + gpf.name + ": " + action.plan + ".");
      }
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
