// ============================================================
//   FIGHT NARRATIVE — Stories from simulation data
//   No random selection. Everything driven by actual fight events.
// ============================================================

// ── FIGHT NARRATIVE ──

export function generateFightNarrative(fighter, opponent, roundLogs, result) {
  const story = { keyMoments: [], narrative: "", rating: 0, turningPoint: null };

  if (!roundLogs || roundLogs.length === 0) return story;

  // Analyze momentum per round
  let momentumA = 0, momentumB = 0;
  let totalLandA = 0, totalLandB = 0;
  let totalTD_A = 0, totalTD_B = 0;
  let knockdowns = 0, subs = 0;
  const roundDominance = [];

  roundLogs.forEach((log, i) => {
    const landA = log.landA || 0, landB = log.landB || 0;
    totalLandA += landA; totalLandB += landB;
    if (log.tdA) totalTD_A++;
    if (log.tdB) totalTD_B++;
    if (log.knockdown) knockdowns++;
    if (log.finish?.how === "Submission") subs++;

    const diff = landA - landB;
    roundDominance.push({ round: i + 1, diff, winner: diff > 5 ? "A" : diff < -5 ? "B" : "draw" });

    if (diff > 10) momentumA++;
    else if (diff < -10) momentumB++;
  });

  // Score-based dominance
  const totalScoreA = roundLogs.reduce((s, l) => s + (l.scoreA || 0), 0);
  const totalScoreB = roundLogs.reduce((s, l) => s + (l.scoreB || 0), 0);

  // Detect key moments
  const earlyRounds = roundDominance.slice(0, 2);
  const lateRounds = roundDominance.slice(-2);
  const earlyDom = earlyRounds.every(r => r.winner === "A") ? "A" : earlyRounds.every(r => r.winner === "B") ? "B" : null;

  // Momentum shifts
  let momentumShift = null;
  for (let i = 1; i < roundDominance.length; i++) {
    if (roundDominance[i-1].winner !== roundDominance[i].winner && 
        roundDominance[i-1].winner !== "draw" && roundDominance[i].winner !== "draw") {
      momentumShift = { fromRound: i, toRound: i + 1, from: roundDominance[i-1].winner, to: roundDominance[i].winner };
      story.turningPoint = momentumShift;
      break;
    }
  }

  // Build narrative
  const won = result.won;
  const how = result.how;
  const isTitle = fighter?.booked?.title;
  const rnd = result.r;

  // Story type detection
  if (knockdowns >= 2) story.keyMoments.push({ type: "multiple_knockdowns", icon: "💥", text: `${knockdowns} knockdowns in the fight` });
  if (subs >= 2) story.keyMoments.push({ type: "submission_clinic", icon: "🦾", text: "Submission clinic" });
  if (how === "KO/TKO" && rnd === 1) story.keyMoments.push({ type: "flash_ko", icon: "⚡", text: "Flash KO in round 1" });
  if (how === "KO/TKO" && rnd >= 3 && momentumShift) story.keyMoments.push({ type: "comeback_ko", icon: "🔄", text: "Comeback KO!" });
  if (how === "Decision" && Math.abs(totalScoreA - totalScoreB) < 10) story.keyMoments.push({ type: "close_decision", icon: "⚖️", text: " razor-close decision" });
  if (earlyDom === (won ? "A" : "B")) story.keyMoments.push({ type: "early_domination", icon: "🔥", text: "Dominated from the opening bell" });
  if (momentumShift && momentumShift.to === (won ? "A" : "B")) story.keyMoments.push({ type: "momentum_shift", icon: "🔄", text: `Momentum shifted in round ${momentumShift.toRound}` });

  // Rating: 1-5 stars
  let rating = 3; // base
  if (knockdowns >= 2) rating++;
  if (momentumShift) rating++;
  if (how !== "Decision") rating++;
  if (Math.abs(totalScoreA - totalScoreB) < 10) rating++;
  if (rnd >= 4) rating++;
  if (isTitle) rating++;
  story.rating = Math.min(rating, 5);

  // Generate narrative text
  const oppName = opponent?.name || fighter?.booked?.opponent?.name || "Unknown";
  const parts = [];

  if (earlyDom === "A") parts.push(`${fighter.name} came out strong, controlling the early rounds.`);
  else if (earlyDom === "B") parts.push(`${oppName} started fast, putting ${fighter.name} on the back foot early.`);
  else parts.push(`The fight opened evenly, with both fighters finding their range.`);

  if (momentumShift) {
    const shifter = momentumShift.to === "A" ? fighter.name : oppName;
    parts.push(`The momentum shifted in round ${momentumShift.toRound} when ${shifter} took control.`);
  }

  if (how === "KO/TKO") {
    parts.push(knockdowns >= 2 ? `After ${knockdowns} knockdowns, the referee had seen enough.` : `A devastating finish in round ${rnd}.`);
  } else if (how === "Submission") {
    parts.push(`The tap came in round ${rnd} after relentless ground pressure.`);
  } else if (how === "Doctor Stoppage") {
    parts.push(`The doctor waved it off in round ${rnd} — a brutal, bloody affair.`);
  } else {
    parts.push(`After ${rnd} rounds, the judges rendered their verdict.`);
  }

  if (isTitle) {
    parts.push(won ? `${fighter.name} remains the champion.` : `The title changes hands.`);
  }

  story.narrative = parts.join(" ");

  return story;
}

// ── SIGNATURE MOMENTS ──

export function detectSignatureMoments(fighter, roundLogs, result) {
  const moments = [];
  if (!roundLogs || roundLogs.length === 0) return moments;

  const totalLand = roundLogs.reduce((s, l) => s + (l.landA || 0) + (l.landB || 0), 0);
  const knockCount = roundLogs.filter(l => l.knockdown).length;
  const subAttempts = roundLogs.reduce((s, l) => s + (l.log || []).filter(line => line.includes("submission")).length, 0);
  const rnd = result.r;
  const how = result.how;
  const won = result.won;

  // Fight of the Night: close, high-action, 4+ rounds
  if (rnd >= 3 && totalLand > 40 && Math.abs(
    roundLogs.reduce((s,l) => s + (l.scoreA||0), 0) - 
    roundLogs.reduce((s,l) => s + (l.scoreB||0), 0)
  ) < 15) {
    moments.push({ id: "fotn", label: "⭐ Fight of the Night", icon: "🏆" });
  }

  // War: 2+ knockdowns, high damage
  if (knockCount >= 2 && totalLand > 50) {
    moments.push({ id: "war", label: "⚔️ War", icon: "💀" });
  }

  // Flash KO: KO in round 1
  if (how === "KO/TKO" && rnd === 1) {
    moments.push({ id: "flash_ko", label: "⚡ Flash KO", icon: "💥" });
  }

  // Comeback KO: KO in round 3+ after losing early rounds
  if (how === "KO/TKO" && rnd >= 3) {
    const earlyScore = roundLogs.slice(0, 2).reduce((s,l) => s + (l.scoreB||0) - (l.scoreA||0), 0);
    if (won && earlyScore > 5) moments.push({ id: "comeback_ko", label: "🔄 Comeback KO", icon: "🌟" });
  }

  // Submission Clinic: 3+ submission attempts
  if (subAttempts >= 3) {
    moments.push({ id: "sub_clinic", label: "🦾 Submission Clinic", icon: "🔒" });
  }

  // Five-Round Battle
  if (rnd >= 5 && how === "Decision") {
    moments.push({ id: "five_rounds", label: "⏱️ Five-Round Battle", icon: "⚔️" });
  }

  // One-Sided Beatdown: 3x score differential
  const scoreA = roundLogs.reduce((s,l) => s + (l.scoreA||0), 0);
  const scoreB = roundLogs.reduce((s,l) => s + (l.scoreB||0), 0);
  if (scoreA > scoreB * 3 || scoreB > scoreA * 3) {
    moments.push({ id: "beatdown", label: "👊 One-Sided Beatdown", icon: "💪" });
  }

  // Huge Upset: beating a much higher-ranked opponent
  if (fighter?.booked?.oppRank != null && fighter.booked.oppRank <= 3 && won) {
    moments.push({ id: "upset", label: "🌊 Huge Upset", icon: "⚡" });
  }

  // Last-Minute Finish: finish in final round
  if (how !== "Decision" && rnd >= 4) {
    moments.push({ id: "last_minute", label: "⏰ Last-Minute Finish", icon: "🔥" });
  }

  return moments;
}

// ── DYNAMIC COMMENTARY CONTEXT ──

export function getFightContext(fighter, opponent, g) {
  const context = [];

  // Championship fight
  if (fighter?.booked?.title) {
    context.push({ type: "title", text: `${fighter.name} puts the ${fighter.weightClass} title on the line.` });
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
  if (fighter?.booked?.oppRank != null && fighter.booked.oppRank <= 3) {
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
