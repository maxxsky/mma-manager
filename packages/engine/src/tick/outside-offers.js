// Outside offers — another camp approaches an unhappy fighter.
//
// Replaces the rival-camp poaching event (rival camps removed, P1 #21). The
// old event needed a rival with rivalry > 15, which in practice only happened
// if the player provoked one; in the headless harnesses it never fired. This
// keeps the consequence of low morale and loyalty without simulating camps.
import { random, pick, fmt$, uid } from "../rng.js";

export const OUTSIDE_OFFER_INTERVAL = 8; // weeks between checks
export const OUTSIDE_OFFER_CHANCE = 0.25; // per check, when someone is unhappy
export const OUTSIDE_OFFER_MORALE_MAX = 70;
export const OUTSIDE_OFFER_LOYALTY_MAX = 60;
export const OUTSIDE_OFFER_BONUS_MULT = 1.25;

export function outsideOfferTargets(g) {
  const pending = new Set((g.inbox || []).map((m) => m.outsideOfferFighterId).filter(Boolean));
  return (g.roster || []).filter((f) =>
    !f.booked && !f.injury && f.morale < OUTSIDE_OFFER_MORALE_MAX && f.loyalty < OUTSIDE_OFFER_LOYALTY_MAX &&
    f.contract && f.contract.fightsLeft > 0 && !pending.has(f.id));
}

export function tickOutsideOffers(g) {
  if (!g?.roster?.length || !g.inbox || g.week % OUTSIDE_OFFER_INTERVAL !== 0) return;
  const available = outsideOfferTargets(g);
  if (available.length === 0 || random() >= OUTSIDE_OFFER_CHANCE) return;
  const target = pick(available);
  const offerBonus = Math.round((target.asking || 1000) * OUTSIDE_OFFER_BONUS_MULT);
  g.inbox.unshift({
    id: uid(), type: "event", outsideOfferFighterId: target.id,
    title: `🚨 Camp lain mendekati ${target.name}`,
    body: `Sebuah camp lain mengirim tawaran ke ${target.name}: signing bonus ${fmt$(offerBonus)}, cut lebih kecil. Morale-nya rendah — dia mempertimbangkan.`,
    choices: [
      { label: "Tingkatkan bonus + naikkan cut 2%", counter: { fighterId: target.id, cost: offerBonus } },
      { label: "Biarkan dia pergi", letGo: target.id },
      { label: "Bicara langsung (chemistry check)", talk: target.id },
    ],
  });
}
