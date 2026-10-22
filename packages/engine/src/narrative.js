// ============================================================
//   FIGHT NARRATIVE — Stories from simulation data
//   No random selection. Everything driven by actual fight events.
// ============================================================

import { fightNightBonus, fightTotals } from "./fight/report.js";
import { scoreRound } from "./fight/scoring.js";
import { TITLE_NAMES, titleTier } from "./championships.js";

// Use the same round scoring as the judges. Strike count alone cannot identify
// who controlled a round, because takedowns and submission threats also score.
function fightEvidence(roundLogs, result) {
  const rounds = (roundLogs || []).filter(Boolean);
  const cards = rounds.map(scoreRound);
  const winners = rounds.map((r, i) => r.finish?.by || cards[i].winner);
  const winner = result.won ? "A" : "B";
  const beforeFinish = result.how === "Decision" ? cards : cards.slice(0, -1);
  const precedingMargin = beforeFinish.reduce((sum, r) => sum + r.a - r.b, 0);
  const comeback = result.how === "KO/TKO" && rounds.length >= 2 &&
    (winner === "A" ? precedingMargin < 0 : precedingMargin > 0);
  const early = winners.slice(0, 2);
  const earlyLeader = early.length && early.every(w => w === "A") ? "A"
    : early.length && early.every(w => w === "B") ? "B" : null;
  let turningPoint = null;
  for (let i = 1; i < winners.length; i++) {
    if (winners[i - 1] !== "draw" && winners[i] !== "draw" && winners[i - 1] !== winners[i]) {
      turningPoint = { fromRound: i, toRound: i + 1, from: winners[i - 1], to: winners[i] };
      break;
    }
  }
  const pointsA = rounds.reduce((sum, r) => sum + (r.scoreA || 0), 0);
  const pointsB = rounds.reduce((sum, r) => sum + (r.scoreB || 0), 0);
  const margin = cards.reduce((sum, r) => sum + r.a - r.b, 0);
  const hasScores = rounds.every(r => Number.isFinite(r.scoreA) && Number.isFinite(r.scoreB));
  const close = hasScores && result.how === "Decision" && Math.abs(margin) <= 1;
  const beatdown = winners.every(w => w === winner) &&
    (winner === "A" ? pointsA > Math.max(pointsB, 1) * 3 : pointsB > Math.max(pointsA, 1) * 3);
  return { rounds, winner, earlyLeader, turningPoint, comeback, close, beatdown,
    totals: fightTotals(rounds),
    knockdowns: rounds.filter(r => r.knockdown).length,
    subA: rounds.reduce((sum, r) => sum + (r.subAttemptsA || 0), 0),
    subB: rounds.reduce((sum, r) => sum + (r.subAttemptsB || 0), 0),
  };
}

export function isTitleDefense(fighter) {
  const tier = titleTier(fighter?.booked);
  return !!fighter?.booked?.defense || !!(tier && fighter?.titles?.includes(TITLE_NAMES[tier]));
}

// ── FIGHT NARRATIVE ──
export function generateFightNarrative(fighter, opponent, roundLogs, result) {
  const story = { keyMoments: [], narrative: "", rating: 0, turningPoint: null };
  const evidence = fightEvidence(roundLogs, result);
  if (!evidence.rounds.length) return story;
  const { rounds, earlyLeader, turningPoint, comeback, close, knockdowns, winner, subA, subB } = evidence;
  story.turningPoint = turningPoint;
  const oppName = opponent?.name || fighter?.booked?.opponent?.name || "Unknown";
  const winnerName = result.won ? fighter.name : oppName;
  const parts = [];
  if (earlyLeader) {
    const leaderName = earlyLeader === "A" ? fighter.name : oppName;
    const early = fightTotals(rounds.slice(0, 2));
    const outlanded = earlyLeader === "A" ? early.landA < early.landB : early.landB < early.landA;
    parts.push(`${leaderName} ${rounds.length === 1 ? "took the opening round" : "took the early rounds"}${outlanded ? " despite landing fewer strikes" : ""}.`);
  } else parts.push("Neither fighter swept the opening rounds.");
  if (turningPoint) {
    const shifter = turningPoint.to === "A" ? fighter.name : oppName;
    parts.push(`The momentum shifted in round ${turningPoint.toRound} when ${shifter} took the round.`);
  }
  if (result.how === "KO/TKO") parts.push(`${winnerName} secured the knockout in round ${result.r}.`);
  else if (result.how === "Submission") parts.push(`${winnerName} secured the submission in round ${result.r}.`);
  else if (result.how === "Doctor Stoppage") parts.push(`The doctor stopped the fight in round ${result.r}; ${winnerName} won by doctor stoppage.`);
  else parts.push(`After ${rounds.length} rounds, ${winnerName} won the judges' decision.`);
  if (fighter?.booked?.title) {
    const defense = isTitleDefense(fighter);
    parts.push(result.won
      ? defense ? `${fighter.name} remains the champion.` : `${fighter.name} claims the championship.`
      : defense ? `${fighter.name} loses the championship.` : `${fighter.name} fails to claim the championship.`);
  }
  if (knockdowns >= 2) story.keyMoments.push({ type: "multiple_knockdowns", icon: "💥", text: `${knockdowns} knockdowns in the fight` });
  if (Math.max(subA, subB) >= 3) story.keyMoments.push({ type: "submission_clinic", icon: "🦾", text: "Submission clinic" });
  if (result.how === "KO/TKO" && result.r === 1) story.keyMoments.push({ type: "flash_ko", icon: "⚡", text: "Flash KO in round 1" });
  if (comeback) story.keyMoments.push({ type: "comeback_ko", icon: "🔄", text: "Comeback KO!" });
  if (close) story.keyMoments.push({ type: "close_decision", icon: "⚖️", text: "Razor-close decision" });
  if (earlyLeader === winner) story.keyMoments.push({ type: "early_domination", icon: "🔥", text: rounds.length === 1 ? "Won the opening round" : "Won the opening rounds" });
  if (turningPoint?.to === winner) story.keyMoments.push({ type: "momentum_shift", icon: "🔄", text: `Momentum shifted in round ${turningPoint.toRound}` });
  story.rating = Math.min(5, 3 + Number(knockdowns >= 2) + Number(!!turningPoint) + Number(result.how !== "Decision") + Number(close) + Number(result.r >= 4) + Number(!!fighter?.booked?.title));
  story.narrative = parts.join(" ");
  return story;
}

// ── SIGNATURE MOMENTS ──
export function detectSignatureMoments(fighter, roundLogs, result) {
  const moments = [];
  const e = fightEvidence(roundLogs, result);
  if (!e.rounds.length) return moments;
  if (fightNightBonus(e.rounds, result) > 0) moments.push({ id: "fotn", label: "⭐ Fight of the Night", icon: "🏆" });
  if (e.knockdowns >= 2 && e.totals.landA + e.totals.landB > 50) moments.push({ id: "war", label: "⚔️ War", icon: "💀" });
  if (result.how === "KO/TKO" && result.r === 1) moments.push({ id: "flash_ko", label: "⚡ Flash KO", icon: "💥" });
  if (e.comeback) moments.push({ id: "comeback_ko", label: "🔄 Comeback KO", icon: "🌟" });
  if (Math.max(e.subA, e.subB) >= 3) moments.push({ id: "sub_clinic", label: "🦾 Submission Clinic", icon: "🔒" });
  if (e.rounds.length >= 5 && result.how === "Decision") moments.push({ id: "five_rounds", label: "⏱️ Five-Round Battle", icon: "⚔️" });
  if (e.beatdown) moments.push({ id: "beatdown", label: "👊 One-Sided Beatdown", icon: "💪" });
  const booking = fighter?.booked;
  const opponentRank = booking?.oppRank;
  const playerRank = booking?.playerRank;
  const underdog = booking && "playerRank" in booking && (playerRank === null || playerRank >= (opponentRank || 0) + 5);
  if (result.won && opponentRank != null && opponentRank >= 0 && opponentRank <= 3 && underdog) moments.push({ id: "upset", label: "🌊 Huge Upset", icon: "⚡" });
  const scheduledRounds = result.totalRounds || (booking?.title ? 5 : 3);
  if (["KO/TKO", "Submission", "Doctor Stoppage"].includes(result.how) && result.r === scheduledRounds) moments.push({ id: "last_minute", label: "⏰ Final-Round Finish", icon: "🔥" });
  return moments;
}

// ── DYNAMIC COMMENTARY CONTEXT ──

export function getFightContext(fighter, opponent, g) {
  const context = [];

  // Championship fight
  if (fighter?.booked?.title) {
    context.push({ type: "title", text: isTitleDefense(fighter) ? `${fighter.name} puts the ${fighter.weightClass} title on the line.` : `${fighter.name} challenges for the ${fighter.weightClass} championship.` });
  }

  // Defense
  if (fighter?.booked?.defense) {
    context.push({ type: "defense", text: `This is a mandatory title defense. A loss means the belt changes hands.` });
  }

  // Rivalry
  const oppName = opponent?.name || fighter?.booked?.opponent?.name;
  if (oppName && fighter?.rivalries?.[oppName]) {
    const r = fighter.rivalries[oppName];
    if (r.count >= 2) {
      context.push({ type: "rivalry", text: `This is their ${r.count === 2 ? "second" : "third"} meeting. Rivalry score: ${r.wins}-${r.losses}.` });
    }
  }

  // Winning streak
  if ((fighter?.streakW || 0) >= 3) {
    context.push({ type: "streak", text: `${fighter.name} rides a ${fighter.streakW}-fight win streak into this bout.` });
  }

  // Losing streak
  if ((fighter?.streakL || 0) >= 2) {
    context.push({ type: "losing", text: `${fighter.name} looks to snap a ${fighter.streakL}-fight skid.` });
  }

  // Upset potential
  if (fighter?.booked?.oppRank != null && fighter.booked.oppRank > 0 && fighter.booked.oppRank <= 3) {
    context.push({ type: "upset", text: `A win over the #${fighter.booked.oppRank} contender would be a career-defining moment.` });
  }

  // Main event
  if (fighter?.booked?.isMainEvent) {
    context.push({ type: "main_event", text: `The main event of the evening. All eyes on the cage.` });
  }

  return context;
}

// ── PERSISTENT FIGHT IDENTITY ──

export function createFightRecord(fighter, opponent, roundLogs, result, narrative, moments) {
  return {
    week: fighter?.lastFightWeek || 0,
    fighter: fighter?.name || "Unknown",
    opponent: opponent?.name || fighter?.booked?.opponent?.name || "Unknown",
    result: result.won ? "W" : "L",
    method: result.how,
    round: result.r,
    narrative: narrative?.narrative || "",
    rating: narrative?.rating || 3,
    signatureMoments: moments?.map(m => m.id) || [],
    keyMoments: narrative?.keyMoments || [],
  };
}
