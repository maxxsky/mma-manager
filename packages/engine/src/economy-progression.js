// Ordinary purses follow the fighter's competitive standing, not camp fame alone.
export function regularOfferTier(rep, fighter, rank) {
  const wins = fighter.record?.w || 0;
  if (rep >= 80 && wins >= 8 && rank != null && rank <= 5) return "Premier";
  if (rep >= 60 && wins >= 6 && rank != null && rank <= 15) return "Major";
  if (rep >= 40 && wins >= 4) return "National";
  if (rep >= 20 && wins >= 2) return "Regional";
  return "Local";
}

export const PURSE_RANGES = { Local: [800, 3000], Regional: [3000, 12000], National: [10000, 35000], Major: [20000, 70000], Premier: [50000, 120000] };
export const REPUTATION_CEILINGS = { Local: 35, Regional: 60, National: 80, Major: 95, Premier: 100 };
export const REPUTATION_WIN_GAINS = { Local: 7, Regional: 6, National: 5, Major: 4, Premier: 3 };
export const SUPPORT_PER_TIER = 1000;
export const POPULARITY_INCOME_KNEE = 30;

// Fame still pays, with diminishing marginal returns after a local following.
export function popularityIncome(popularity, baseRate, lateRate) {
  const pop = Math.max(0, popularity || 0);
  return Math.min(pop, POPULARITY_INCOME_KNEE) * baseRate + Math.max(0, pop - POPULARITY_INCOME_KNEE) * lateRate;
}

export function reputationAfterWin(rep, tier = "Local", professional = false) {
  const ceiling = REPUTATION_CEILINGS[tier] ?? REPUTATION_CEILINGS.Local;
  // Winning at a lower tier never removes earned reputation.
  return Math.max(rep, Math.min(ceiling, rep + (REPUTATION_WIN_GAINS[tier] ?? 7) + (professional ? 2 : 0)));
}
