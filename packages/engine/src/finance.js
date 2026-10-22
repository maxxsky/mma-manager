// Shared monthly financial calculations — used by App, Dashboard, Finance
import { TRAINING } from "./data.js";
import { computeMonthlyIncome, computeMonthlyExpense, FACILITY_MAINT_RATE, facilityCost } from "./economy.js";
import { BANKRUPT_THRESHOLD } from "./reducer/constants.js";

export function monthlyBurn(g) {
  return computeMonthlyExpense(g).total;
}

export function monthlyIn(g) {
  return computeMonthlyIncome(g).total;
}

// ── Emergency asset sale (P2 #33, EK4) ──
// Used to be a flat +$25,000 with nothing sold. Now facility levels are sold,
// highest first, at half of what the level cost to build, until cash is back
// above the bankruptcy line (plus a small buffer) or every facility is at 1.
export const EMERGENCY_SALE_RATE = 0.5;
export const EMERGENCY_SALE_BUFFER = 10000;

export function planEmergencySale(g, target = BANKRUPT_THRESHOLD + EMERGENCY_SALE_BUFFER) {
  const levels = { ...(g.facilities || {}) };
  const sales = [];
  let cash = g.cash;
  while (cash < target) {
    const [fac, lvl] = Object.entries(levels).sort((a, b) => b[1] - a[1])[0] || [];
    if (!fac || lvl <= 1) break;
    const refund = Math.round(facilityCost(lvl - 1, g.campTier) * EMERGENCY_SALE_RATE);
    sales.push({ fac, fromLevel: lvl, refund });
    levels[fac] = lvl - 1;
    cash += refund;
  }
  return { sales, total: sales.reduce((s, x) => s + x.refund, 0) };
}

export function applyEmergencySale(g) {
  const { sales, total } = planEmergencySale(g);
  sales.forEach(({ fac }) => { g.facilities[fac] -= 1; });
  g.cash += total;
  return { sales, total };
}
