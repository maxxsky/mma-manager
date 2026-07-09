// Shared monthly financial calculations — used by App, Dashboard, Finance
import { weeklyFee } from "./fighter.js";
import { TRAINING } from "./data.js";

export function monthlyBurn(g) {
  return g.coaches.reduce((s, c) => s + ((!c.freeUntil || g.week > c.freeUntil) ? c.salary : 0), 0)
    + Math.round(Object.values(g.facilities).reduce((s, l) => s + l * 30000, 0) * 0.05)
    + g.roster.reduce((s, f) => s + (f.injury ? 0 : TRAINING[f.booked ? "fightcamp" : f.training.type].cost * 4), 0);
}

export function monthlyIn(g) {
  return g.roster.reduce((s, f) => s + weeklyFee(f) * 4, 0) + g.rep * 500 + g.roster.reduce((s, f) => s + f.popularity * 150, 0);
}
