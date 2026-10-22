import { scoreRound } from "./scoring.js";

export function fightTotals(rounds = []) {
  return rounds.filter(Boolean).reduce((totals, round) => {
    for (const key of Object.keys(totals)) totals[key] += round[key] || 0;
    return totals;
  }, { landA: 0, landB: 0, tdA: 0, tdB: 0 });
}

// Both participants can earn the $50k bonus in a competitive, high-action
// fight. This is fighter income, subject to the normal camp share.
export function fightNightBonus(rounds = [], result = {}) {
  if (rounds.length < 3 || !Number.isInteger(result.r) || result.r < 3 || result.draw || !result.how) return 0;
  if (!rounds.every(r => r && Number.isFinite(r.scoreA) && Number.isFinite(r.scoreB))) return 0;
  const totals = fightTotals(rounds);
  const cards = rounds.map(scoreRound);
  const margin = cards.reduce((sum, r) => sum + r.a - r.b, 0);
  const competitive = cards.some(r => r.winner === "A") && cards.some(r => r.winner === "B");
  return competitive && Math.abs(margin) <= 2 && totals.landA + totals.landB > 40 &&
    Math.min(totals.landA, totals.landB) >= 15 ? 50000 : 0;
}
