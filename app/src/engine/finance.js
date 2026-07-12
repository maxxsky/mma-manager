// Shared monthly financial calculations — used by App, Dashboard, Finance
import { TRAINING } from "./data.js";
import { computeMonthlyIncome, FACILITY_MAINT_RATE } from "./economy.js";

export function monthlyBurn(g) {
  return g.coaches.reduce((s, c) => s + ((!c.freeUntil || g.week > c.freeUntil) ? c.salary : 0), 0)
    + Math.round(Object.values(g.facilities).reduce((s, l) => s + l * 30000, 0) * FACILITY_MAINT_RATE)
    + g.roster.reduce((s, f) => s + (f.injury ? 0 : TRAINING[f.booked ? "fightcamp" : f.training.type].cost * 4), 0);
}

export function monthlyIn(g) {
  return computeMonthlyIncome(g).total;
}
