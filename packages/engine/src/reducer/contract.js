// Contract domain — negotiate, sign new fighters, extend existing contracts
import { clamp, fmt$ } from "../rng.js";
import { genBio } from "../fighter.js";
import { MORALE_BOOST_SIGN_EXTEND } from "./constants.js";
import { checkAchievements } from "../achievements.js";
import { sanitizeOffer, rollNegotiation } from "../contracts/negotiation.js";
import { CAMP_TIERS } from "../data.js";

const contractFrom = (g, deal, renegoFlagged) => ({
  managerCut: deal.cut, fightsLeft: deal.fights,
  fightsTotal: deal.fights, durationMo: deal.duration,
  signedWeek: g.week, renegoFlagged, equity: deal.equity || 0,
});

// Applies agreed terms. Returns false when the fighter or prospect is gone.
function applySigning(g, mode, { prospectId, fighterId }, deal) {
  if (mode === "sign") {
    const prospect = g.prospects.find((x) => x.id === prospectId);
    if (!prospect) return false;
    const f = prospect.fighter;
    g.cash -= deal.signBonus;
    f.joinedWeek = g.week;
    if (prospect.grade === "S") f.ambitionRevealed = true;
    f.contract = contractFrom(g, deal, false);
    g.roster.push(f);
    g.prospects = g.prospects.filter((x) => x.id !== prospectId);
    if (!f.bio) f.bio = genBio(f);
    g.log.unshift("✍️ " + f.name + " teken kontrak: cut " + Math.round(deal.cut * 100) + "%, " + deal.fights + " fight.");
    if (prospect.grade === "S") checkAchievements(g, { signedSProspect: true });
    return true;
  }
  const f = g.roster.find((x) => x.id === fighterId);
  if (!f) return false;
  g.cash -= deal.signBonus;
  f.contract = contractFrom(g, deal, true);
  f.morale = clamp(f.morale + MORALE_BOOST_SIGN_EXTEND, 0, 100);
  g.log.unshift("📝 " + f.name + " perpanjang kontrak: cut " + Math.round(deal.cut * 100) + "%, " + deal.fights + " fight.");
  return true;
}

const subjectOf = (g, mode, { prospectId, fighterId }) =>
  mode === "sign" ? g.prospects.find((x) => x.id === prospectId)?.fighter : g.roster.find((x) => x.id === fighterId);

export function reduceContract(g, action) {
  switch (action.type) {
    // Direct signing with given terms. Kept for tests and internal callers; the
    // negotiation screen goes through NEGOTIATE_CONTRACT so the engine decides.
    case "SIGN_CONTRACT":
      applySigning(g, action.mode, action, action.deal);
      return;

    case "NEGOTIATE_CONTRACT": {
      const mode = action.mode === "extend" ? "extend" : "sign";
      const ids = { prospectId: action.prospectId, fighterId: action.fighterId };
      const f = subjectOf(g, mode, ids);
      if (!f) return;
      const offer = sanitizeOffer(f, mode, action.offer);
      if (mode === "sign" && g.roster.length >= (CAMP_TIERS[g.campTier || 0]?.rosterCap ?? 8)) {
        g.negotiation = { status: "rosterFull", mode, ...ids };
        return;
      }
      if (g.cash < offer.signBonus) {
        g.negotiation = { status: "noCash", mode, ...ids };
        return;
      }
      const roll = rollNegotiation(f, mode, offer);
      if (roll.signed) {
        applySigning(g, mode, ids, offer);
        g.negotiation = { status: "signed", mode, ...ids, name: f.name, deal: offer };
      } else {
        g.negotiation = { status: "counter", mode, ...ids, name: f.name, counter: roll.counter };
        g.log.unshift(`🤝 Agen ${f.name} mengajukan counter: cut ${Math.round(roll.counter.cut * 100)}%, bonus ${fmt$(roll.counter.signBonus)}.`);
      }
      return;
    }

    case "ACCEPT_COUNTER_OFFER": {
      const n = g.negotiation;
      if (n?.status !== "counter") return;
      if (n.mode === "sign" && g.roster.length >= (CAMP_TIERS[g.campTier || 0]?.rosterCap ?? 8)) {
        g.negotiation = { ...n, status: "rosterFull" };
        return;
      }
      if (g.cash < n.counter.signBonus) {
        g.negotiation = { ...n, status: "noCash" };
        return;
      }
      if (applySigning(g, n.mode, n, n.counter)) {
        g.negotiation = { status: "signed", mode: n.mode, prospectId: n.prospectId, fighterId: n.fighterId, name: n.name, deal: n.counter };
      } else {
        delete g.negotiation;
      }
      return;
    }

    case "CLEAR_NEGOTIATION":
      delete g.negotiation;
      return;
  }
}
