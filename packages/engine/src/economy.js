import { clamp } from "./rng.js";
import { CAMP_TIERS, MEMBER_FEE, SPONSOR_BRANDS, TRAINING } from "./data.js";
import { getPublicOpinion } from "./publicOpinion.js";

export function coachBonus(g, gains) {
  let b = 1;
  g.coaches.forEach((c) => {
    const map = {
      Striking: ["striking", "footwork"],
      Wrestling: ["wrestling"],
      BJJ: ["bjj"],
      "S&C": ["strength", "cardio"],
      Head: ["fightIQ"],
    };
    if (gains.some((k) => (map[c.spec] || []).includes(k))) b += c.skill * 0.025;
    if (c.personality === "Technician" && gains.some((k) => ["striking", "bjj", "footwork", "fightIQ"].includes(k)))
      b += 0.10;
  });
  return b;
}

export function facBonus(g, gains) {
  let b = 1;
  const tier = CAMP_TIERS[g.campTier || 0];
  if (gains.includes("wrestling") || gains.includes("bjj")) b += Math.min(g.facilities.mats - 1, 3) * 0.06 + Math.max(0, g.facilities.mats - 4) * 0.03;
  if (gains.includes("striking")) b += Math.min(g.facilities.ring - 1, 3) * 0.06 + Math.max(0, g.facilities.ring - 4) * 0.03;
  if (gains.includes("strength") || gains.includes("cardio")) b += Math.min(g.facilities.weights - 1, 3) * 0.06 + Math.max(0, g.facilities.weights - 4) * 0.03;
  b += tier.trainBonus;
  return b;
}

// Shared facility maintenance rate — single source of truth
export const FACILITY_MAINT_RATE = 0.012;

/**
 * Compute monthly income exactly as tickSettlement pays it.
 * Used by both settlement.js (execution) and finance.js (preview)
 * to guarantee they can never diverge.
 */
export function computeMonthlyIncome(g) {
  // Sponsor income — mirrors tickSettlement exactly
  let sponsorAmt = Math.round(Math.min(g.rep, 30) * 500);
  if (g.sponsors && g.sponsors.length > 0) {
    sponsorAmt = 0;
    const hasChampion = g.roster?.some((f) => f.titles?.includes("Major World Champion"));
    g.sponsors.forEach((sp) => {
      const brand = SPONSOR_BRANDS.find((b) => b.name === sp.brand);
      if (!brand) return;
      let rate = sp.rate || brand.baseRate;
      if (hasChampion) rate = Math.round(rate * 1.5);
      if (sp.terms === "royalty") {
        const wins = g.roster.filter((f) => f.lastFightWeek && g.week - f.lastFightWeek <= 4 && f.record.w > 0).length;
        if (brand.boostFame) rate = Math.round(rate * (1 + (g.roster.reduce((s, f) => s + (f.popularity || 0), 0) / g.roster.length / 100) * (brand.boostFame - 1)));
        if (brand.boostFight) rate = Math.round(rate * (1 + wins * (brand.boostFight - 1)));
      }
      sponsorAmt += rate;
    });
  }
  const fSponsor = g.roster.reduce((s, f) => s + f.popularity * 150, 0);
  const championBonus = g.roster.reduce((s, f) => s + (f.titles?.includes("Major World Champion") ? 5000 : 0), 0);
  const merchRevenue = Math.round(g.roster.reduce((s, f) => {
    const opinion = getPublicOpinion(f);
    const merchMult = opinion.sentiment === "positive" ? 1.2 : opinion.sentiment === "negative" ? 0.8 : 1.0;
    return s + f.popularity * 80 * merchMult;
  }, 0));
  const { revenue: membershipRevenue } = computeMembership(g);
  return { sponsorAmt, fSponsor, championBonus, merchRevenue, membershipRevenue,
    total: sponsorAmt + fSponsor + championBonus + merchRevenue + membershipRevenue };
}

/**
 * Compute membership demand, capacity, and revenue.
 * Demand grows with rep, capacity grows with facilities.
 */
export function computeMembership(g) {
  const campTier = g.campTier || 0;
  const hasChampion = g.roster?.some((f) => f.titles?.includes("Major World Champion"));
  // Check if any roster fighter has an active era (dominant champion)
  let eraMultiplier = 1;
  if (hasChampion) {
    eraMultiplier = 1.3;
    if (g.divisions) {
      Object.values(g.divisions).forEach(div => {
        if (div.era && g.roster?.some(f => f.name === div.era.championName)) {
          eraMultiplier = 1.5;
        }
      });
    }
  }
  const demand = Math.round(130 * (1 + (g.rep || 0) / 45) * eraMultiplier);
  const mats = g.facilities?.mats || 1;
  const otherFacLevels = (g.facilities?.ring || 0) + (g.facilities?.weights || 0) + (g.facilities?.medical || 0);
  const capacity = Math.round(mats * 90 * (1 + otherFacLevels * 0.06));
  const members = Math.min(demand, capacity);
  const fee = MEMBER_FEE[campTier] || 110;
  const outreachMult = g.investments?.communityOutreach ? 1.10 : 1;
  const revenue = Math.round(members * fee * outreachMult);
  return { demand, capacity, members, revenue };
}

/**
 * Compute monthly operating expenses.
 * Shared between settlement.js and finance.js (same pattern as computeMonthlyIncome).
 */
export function computeMonthlyExpense(g) {
  const coachSal = g.coaches.reduce((s, c) => s + ((!c.freeUntil || g.week > c.freeUntil) ? c.salary : 0), 0);
  const staffSal = Object.values(g.staff || {}).reduce((s, m) => s + (m?.salary || 0), 0);
  const facVal = Object.values(g.facilities || {}).reduce((s, l) => s + l * 30000, 0);
  const maint = Math.round(facVal * FACILITY_MAINT_RATE);
  let training = 0;
  g.roster.forEach(f => {
    if (f.injury) return;
    const type = f.booked ? "fightcamp" : (f.training?.type || "conditioning");
    const t = TRAINING[type];
    training += (t ? t.cost : 80) * 4;
  });
  const { members } = computeMembership(g);
  const opCost = members * 30;
  const fighterSupport = (g.roster?.length || 0) * 600;
  return { coachSal, staffSal, maint, training, opCost, fighterSupport, members,
    total: coachSal + staffSal + maint + training + opCost + fighterSupport };
}

// Shared facility upgrade cost — used by both UI and reducer
export function facilityCost(lvl, campTier) {
  return lvl * (15000 + (campTier || 0) * 10000);
}
