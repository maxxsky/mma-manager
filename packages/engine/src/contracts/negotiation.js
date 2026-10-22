// Contract negotiation — acceptance odds, weak-offer check and agent counter.
// Moved out of NegotiateModal.jsx (P2 #27, EK3) so the reducer, not the UI,
// rolls the dice and decides the terms that get signed.
//
// managerCut is the camp's share of the fighter's purse, so the fighter (and
// the agent) want it LOW. The agent's cutFloor is the cut they accept without
// a penalty; asking for more lowers the odds, and a counter pushes the cut
// down toward the floor. The old counter raised the cut, against the client.
//
// Levers kept: sign bonus, cut, fights, duration, equity — each changes
// something in the game (cash, purse share, contract length/expiry, sponsor
// share). Exclusivity, rematch and medical-cost clauses were removed: nothing
// in the game read them, so they only lowered the odds.
import { RI, clamp, random } from "../rng.js";
import { AGENT_TYPES } from "../data.js";

export const NEGO_CUT_OPTIONS = [15, 16, 18, 20, 22, 25];   // percent
export const NEGO_FIGHT_OPTIONS = [2, 4, 6, 8];
export const NEGO_DURATION_OPTIONS = [12, 18, 24, 36];      // months
export const NEGO_EQUITY_OPTIONS = [0, 5, 10, 15, 20];      // percent
export const NEGO_EXTEND_BONUS_OPTIONS = [0, 2000, 5000, 10000, 20000];

export const agentOf = (f) => AGENT_TYPES[f?.agent || "none"] || AGENT_TYPES.none;
export const baseAskingOf = (f) => f?.asking || 3000;

export function bonusOptions(f, mode) {
  const a = baseAskingOf(f);
  return mode === "extend" ? NEGO_EXTEND_BONUS_OPTIONS : [Math.round(a * 0.6), a, Math.round(a * 1.4), Math.round(a * 2)];
}

export function defaultOffer(f, mode) {
  const ag = agentOf(f);
  return {
    signBonus: mode === "extend" ? 0 : baseAskingOf(f),
    cut: mode === "extend" && f?.contract ? Math.round(f.contract.managerCut * 100) / 100 : ag.cutFloor,
    fights: 4, duration: 24, equity: 0,
  };
}

/** Only the option values the screen offers are accepted; anything else is snapped to the nearest. */
export function sanitizeOffer(f, mode, offer = {}) {
  const near = (opts, v) => opts.reduce((b, o) => (Math.abs(o - v) < Math.abs(b - v) ? o : b), opts[0]);
  const num = (v, d) => (typeof v === "number" && isFinite(v) ? v : d);
  const d = defaultOffer(f, mode);
  return {
    signBonus: near(bonusOptions(f, mode), num(offer.signBonus, d.signBonus)),
    cut: near(NEGO_CUT_OPTIONS, Math.round(num(offer.cut, d.cut) * 100)) / 100,
    fights: near(NEGO_FIGHT_OPTIONS, num(offer.fights, d.fights)),
    duration: near(NEGO_DURATION_OPTIONS, num(offer.duration, d.duration)),
    equity: near(NEGO_EQUITY_OPTIONS, num(offer.equity, d.equity)),
  };
}

/** Acceptance chance in percent, 3–97. Same formula the screen showed before, minus the dead clauses. */
export function acceptChance(f, mode, offer) {
  const ag = agentOf(f);
  const base = baseAskingOf(f);
  const cutPenalty = Math.max(0, offer.cut - ag.cutFloor) * 100 * (2 + ag.hardness * 3);
  const bonusBoost = mode === "sign" ? (offer.signBonus / base - 1) * 22 : offer.signBonus / 1000 * 1.2;
  const fightsBoost = (offer.fights >= 6 ? 6 : offer.fights >= 4 ? 2 : -4) * (1 - ag.hardness * 0.3);
  const hardnessDrag = ag.hardness * 10;
  const equityMod = (offer.equity || 0) * 1.5;
  return clamp(Math.round(70 + bonusBoost + fightsBoost - cutPenalty - hardnessDrag + equityMod), 3, 97);
}

/** An offer the agent sees as short: camp cut above their floor, or (new signings) a bonus under 85% of asking. */
export function isWeakOffer(f, mode, offer) {
  const ag = agentOf(f);
  return offer.cut > ag.cutFloor + 1e-9 || (mode === "sign" && offer.signBonus < baseAskingOf(f) * 0.85);
}

/** Agent counter: lower camp cut (toward the floor, never above the offer), more money, shorter commitment. */
export function counterOffer(f, mode, offer) {
  const ag = agentOf(f);
  const base = baseAskingOf(f);
  const offerPct = Math.round(offer.cut * 100);
  const floorPct = Math.round(ag.cutFloor * 100);
  const cutPct = clamp(offerPct - RI(1, 3), Math.min(floorPct, offerPct), offerPct);
  return {
    signBonus: Math.max(base, offer.signBonus + RI(0, Math.round(base * 0.2))),
    cut: cutPct / 100,
    fights: ag.hardness > 0.5 ? 3 : RI(2, 4),
    duration: RI(12, 18),
    equity: offer.equity || 0,
  };
}

/** Roll the negotiation. Returns { signed: true } or { signed: false, counter }. */
export function rollNegotiation(f, mode, offer) {
  if (random() * 100 < acceptChance(f, mode, offer)) return { signed: true };
  if (!isWeakOffer(f, mode, offer) && random() < 0.5) return { signed: true }; // fair offer: second chance
  return { signed: false, counter: counterOffer(f, mode, offer) };
}
