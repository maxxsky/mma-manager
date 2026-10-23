import { computeMonthlyIncome, computeMonthlyExpense, facilityCost } from '../packages/engine/src/economy.js';
import { CAMP_TIERS } from '../packages/engine/src/data/camp.js';

// Realised fight receipts are volatile: budget only 75% of the trailing year.
export function monthlyFightBudget(g, receipts) {
  return receipts.filter(r => g.week - r.week <= 48).reduce((sum,r) => sum + r.cash, 0) / 12 * 0.75;
}
export function affordableOperation(g, receipts, cost = 0) {
  const expense = computeMonthlyExpense(g).total;
  return computeMonthlyIncome(g).total + monthlyFightBudget(g, receipts) >= expense &&
    g.cash - cost >= Math.max(60000, expense * 6);
}
export function canRecruit(g, fighter, receipts) {
  return affordableOperation({ ...g, roster: [...g.roster, fighter] }, receipts);
}
export function planSpending(g, receipts, dispatch) {
  if (!affordableOperation(g, receipts) && g.cash < computeMonthlyExpense(g).total * 6 && g.coaches.length > 0) {
    const coach = [...g.coaches].sort((a,b) => b.salary-a.salary)[0];
    if (g.cash >= coach.salary) dispatch({ type: 'FIRE_COACH', coachId: coach.id, coachName: coach.name, severance: coach.salary });
    return;
  }
  for (const fac of Object.keys(g.facilities || {})) {
    const lvl = g.facilities[fac];
    const cost = facilityCost(lvl, g.campTier);
    const after = { ...g, facilities: { ...g.facilities, [fac]: lvl + 1 } };
    if (affordableOperation(after, receipts, cost)) dispatch({ type: 'UPGRADE_FACILITY', facility: fac });
  }
  const coach = g.coachMarket?.find(c => !g.coaches.some(h => h.spec === c.spec));
  if (coach && affordableOperation({ ...g, coaches: [...g.coaches, coach] }, receipts)) dispatch({ type: 'HIRE_COACH', coachId: coach.id });
  const next = CAMP_TIERS[(g.campTier || 0) + 1];
  if (next && affordableOperation({ ...g, campTier: g.campTier + 1 }, receipts, next.cost + (next.upkeep || 0) * 12)) dispatch({ type: 'UPGRADE_TIER' });
}
