// Camp prestige — the feedback loop that turns a camp's history into its future.
//
// The problem this solves: every progression axis in the game tops out inside
// four in-game years. Fighters realise ~85% of their potential by year three
// and then flatline, reputation caps, camp tier caps, and cash runs away with
// nothing worth buying. A twenty-year save has nothing left to pursue.
//
// The fix is not to raise those ceilings — that just moves the wall. It is to
// make the CAMP the thing that progresses, with fighters as its generations.
// The machinery for accumulating a history already exists in dynasty.js:
// champions produced, title defences, hall of fame inductions, peak legacy.
// None of it fed back into anything. It was a trophy cabinet, not a system.
//
// Prestige closes that loop. Everything the camp has ever achieved raises the
// quality of talent that walks through the door, which produces better
// fighters, which raises prestige further. A fighter's arc stays short —
// three years is the right shape — but the camp's arc now spans decades.

import { POTENTIAL_TIERS } from "./data/archetypes.js";
import { clamp } from "./rng.js";

// Prestige is deliberately slow. Reaching the cap should be the work of a long
// save, not something a good first decade delivers by accident.
export const PRESTIGE_MAX = 100;

// What a camp's history is worth, in prestige points.
//
// Calibrated against measured runs rather than intuition. A simulated camp
// reaches roughly 88,000 legacy by in-game year ten and 180,000 by year
// twenty, so a linear legacy term alone blew past the cap on its own. Legacy
// therefore uses a saturating curve: it establishes a floor early and then
// yields, leaving titles and hall-of-fame careers to carry the top end.
//
// Recalibrated a second time once championships actually became winnable. The
// first pass used hypothetical camp records because the title ladder was
// broken and no simulated camp had ever produced a champion; measured against
// real play, a strong camp hit the cap by in-game year ten, which collapses
// the long arc all over again.
//
// Rough targets now: a strong ten-year camp lands near 50 (Renowned), twenty
// years near 80, and the cap needs an exceptional multi-decade run.
export const PRESTIGE_WEIGHTS = {
  championProduced: 2,
  worldChampionProduced: 4.5,
  titleDefense: 0.45,
  hallOfFamer: 3,
  legacyCurve: 0.7,
  yearsOperatingPer5: 0.8,
};

/**
 * Total prestige earned by everything the camp has ever done.
 *
 * Reads only from the dynasty record, never from the current roster, so
 * selling or retiring fighters can never reduce it. A camp's history is
 * permanent; that permanence is what makes the long arc feel earned.
 */
export function getPrestige(g) {
  const d = g?._dynasty;
  if (!d) return 0;

  const W = PRESTIGE_WEIGHTS;
  const years = Math.max(0, ((g.week || 1) - (d.foundedWeek || 1)) / 48);

  const raw =
    (d.championsProduced || 0) * W.championProduced +
    (d.worldChampionsProduced || 0) * W.worldChampionProduced +
    (d.totalTitleDefenses || 0) * W.titleDefense +
    (d.hallOfFamers?.length || 0) * W.hallOfFamer +
    Math.sqrt(Math.max(0, d.peakLegacy || 0) / 1000) * W.legacyCurve +
    (years / 5) * W.yearsOperatingPer5;

  return clamp(Math.round(raw), 0, PRESTIGE_MAX);
}

/**
 * Human-readable standing. Used for UI copy and for narrative context.
 */
export function getPrestigeTier(prestige) {
  if (prestige >= 80) return { id: "legendary", label: "Legendary Gym", min: 80 };
  if (prestige >= 55) return { id: "renowned", label: "Renowned Gym", min: 55 };
  if (prestige >= 30) return { id: "respected", label: "Respected Gym", min: 30 };
  if (prestige >= 12) return { id: "known", label: "Known Locally", min: 12 };
  return { id: "unknown", label: "Unknown Gym", min: 0 };
}

/**
 * Potential-tier weights for a prospect arriving at a camp of this prestige.
 *
 * The base distribution is 70/22/7/1 — seven in ten prospects are "common"
 * and cap out about ten points above where they started. At full prestige the
 * common share falls to roughly a third while special and generational talent
 * become genuinely reachable rather than lottery tickets.
 *
 * Weights are shifted, never replaced. A legendary gym still signs journeymen;
 * it just stops being the only thing on offer. Keeping "common" the largest
 * single bucket until very high prestige preserves the meaning of a real find.
 */
export function prospectTierWeights(prestige) {
  const p = clamp(prestige, 0, PRESTIGE_MAX) / PRESTIGE_MAX;

  // Multipliers at full prestige, applied proportionally on the way up.
  const scale = {
    common: 1 - 0.55 * p,
    promising: 1 + 0.60 * p,
    special: 1 + 2.20 * p,
    generational: 1 + 5.00 * p,
  };

  return POTENTIAL_TIERS.map((t) => ({
    ...t,
    weight: Math.max(0.01, t.weight * (scale[t.id] ?? 1)),
  }));
}

/**
 * Where a camp's prestige came from, and what the next rung costs.
 *
 * A bare number is a statistic; a number with a visible source and a visible
 * next threshold is a goal. Legacy already failed this test once by
 * accumulating quietly where no player could see it, so prestige ships with
 * the means to explain itself.
 */
export function getPrestigeBreakdown(g) {
  const d = g?._dynasty;
  const W = PRESTIGE_WEIGHTS;
  const prestige = getPrestige(g);
  const tier = getPrestigeTier(prestige);

  const years = d ? Math.max(0, ((g.week || 1) - (d.foundedWeek || 1)) / 48) : 0;
  const sources = d
    ? [
        { id: "champions", count: d.championsProduced || 0, points: (d.championsProduced || 0) * W.championProduced },
        { id: "worldChampions", count: d.worldChampionsProduced || 0, points: (d.worldChampionsProduced || 0) * W.worldChampionProduced },
        { id: "defenses", count: d.totalTitleDefenses || 0, points: (d.totalTitleDefenses || 0) * W.titleDefense },
        { id: "hallOfFame", count: d.hallOfFamers?.length || 0, points: (d.hallOfFamers?.length || 0) * W.hallOfFamer },
        { id: "legacy", count: Math.round(d.peakLegacy || 0), points: Math.sqrt(Math.max(0, d.peakLegacy || 0) / 1000) * W.legacyCurve },
        { id: "years", count: Math.floor(years), points: (years / 5) * W.yearsOperatingPer5 },
      ].map((s) => ({ ...s, points: Math.round(s.points * 10) / 10 }))
    : [];

  const ladder = [0, 12, 30, 55, 80];
  const nextMin = ladder.find((m) => m > prestige) ?? null;

  return {
    prestige,
    tier,
    sources: sources.filter((s) => s.count > 0).sort((a, b) => b.points - a.points),
    nextTier: nextMin == null ? null : getPrestigeTier(nextMin),
    toNextTier: nextMin == null ? 0 : nextMin - prestige,
    specialChance: specialProspectChance(prestige),
    // What the next rung is worth, so the player can weigh the climb.
    specialChanceAtNextTier: nextMin == null ? null : specialProspectChance(nextMin),
  };
}

/**
 * Odds of drawing at least a "special" prospect, as a percentage.
 * Exposed so the UI can tell the player what their history has bought them,
 * rather than leaving the effect invisible the way legacy was.
 */
export function specialProspectChance(prestige) {
  const w = prospectTierWeights(prestige);
  const total = w.reduce((s, t) => s + t.weight, 0);
  const good = w
    .filter((t) => t.id === "special" || t.id === "generational")
    .reduce((s, t) => s + t.weight, 0);
  return Math.round((good / total) * 1000) / 10;
}
