// ============================================================
//   JUDGES' SCORING — 10-point must system
//   Each round is scored 10-9 (or 10-8, or 10-10 when the round
//   points are exactly even). The decision goes to the higher total
//   across all rounds, so a fighter who wins more rounds wins the
//   decision. Neither side is favoured on a tie.
// ============================================================

import { random } from "../rng.js";
import { SCORE_10_8_POINT_RATIO } from "./config.js";

// Score one round from a simRound result.
// Returns { a, b, winner } where winner is "A", "B" or "draw".
export function scoreRound(round) {
  const ptsA = round.scoreA || 0;
  const ptsB = round.scoreB || 0;
  if (ptsA === ptsB) return { a: 10, b: 10, winner: "draw" };

  const winner = ptsA > ptsB ? "A" : "B";
  const hi = Math.max(ptsA, ptsB);
  const lo = Math.min(ptsA, ptsB);
  const loserDropped = !!round.knockdown && round.knockdown.fighter !== winner;
  const dominant = loserDropped && hi >= SCORE_10_8_POINT_RATIO * Math.max(lo, 1);
  const loserScore = dominant ? 8 : 9;

  return winner === "A"
    ? { a: 10, b: loserScore, winner }
    : { a: loserScore, b: 10, winner };
}

// Score a fight that went the distance.
// roundLogs: simRound results in order. Returns
// { winner, rounds, totalA, totalB, tiebreak }, where tiebreak is null when the
// totals decided it, otherwise "points", "damage" or "coin".
export function scoreDecision(roundLogs) {
  const rounds = roundLogs.map(scoreRound);
  const totalA = rounds.reduce((s, r) => s + r.a, 0);
  const totalB = rounds.reduce((s, r) => s + r.b, 0);

  if (totalA !== totalB) {
    return { winner: totalA > totalB ? "A" : "B", rounds, totalA, totalB, tiebreak: null };
  }

  // Even scorecards. The game has no draw result, so break the tie with
  // what happened in the fight, never with which side is the player.
  const ptsA = roundLogs.reduce((s, r) => s + (r.scoreA || 0), 0);
  const ptsB = roundLogs.reduce((s, r) => s + (r.scoreB || 0), 0);
  if (ptsA !== ptsB) {
    return { winner: ptsA > ptsB ? "A" : "B", rounds, totalA, totalB, tiebreak: "points" };
  }

  // dmgA is damage taken by A, so A dealt dmgB.
  const dealtA = roundLogs.reduce((s, r) => s + (r.dmgB || 0), 0);
  const dealtB = roundLogs.reduce((s, r) => s + (r.dmgA || 0), 0);
  if (dealtA !== dealtB) {
    return { winner: dealtA > dealtB ? "A" : "B", rounds, totalA, totalB, tiebreak: "damage" };
  }

  return { winner: random() < 0.5 ? "A" : "B", rounds, totalA, totalB, tiebreak: "coin" };
}
