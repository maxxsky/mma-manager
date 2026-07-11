// ============================================================
//   CAREER IDENTITY — History, Milestones, Story Tags, Mentors
//   Non-invasive simulation extension. Zero combat/economy impact.
// ============================================================

import { clamp } from "./rng.js";
import { queueDelayedEvent } from "./events.js";

// ── CAREER HISTORY ──

export function recordMilestone(f, week, type, detail) {
  if (!f.careerHistory) f.careerHistory = [];
  f.careerHistory.push({ week, type, detail });
}

// Track fight outcomes and detect milestones
export function processFightResult(f, g, result) {
  const week = g.week;
  const events = [];

  // First fight (debut)
  if (!f.firstFightWeek) {
    f.firstFightWeek = week;
  }

  // Win/loss tracking
  if (result.won) {
    f.streakW = (f.streakW || 0) + 1;
    f.streakL = 0;
  } else {
    f.streakL = (f.streakL || 0) + 1;
    f.streakW = 0;
  }

  if (result.won) {
    // First win
    if (f.record.w === 1) {
      recordMilestone(f, week, "first_win", "First career victory");
      events.push({ type: "milestone", title: `🏆 First Win`, body: `${f.name} mencatat kemenangan pertama dalam karirnya.` });
    }

    // First finish
    if ((result.how === "KO/TKO" || result.how === "Submission" || result.how === "Doctor Stoppage") && !f.hasFirstFinish) {
      f.hasFirstFinish = true;
      recordMilestone(f, week, "first_finish", `First ${result.how}`);
      events.push({ type: "milestone", title: `💥 First Finish`, body: `${f.name} mencatat finish pertama via ${result.how}.` });
    }

    // Win streaks
    const streakW = f.streakW || 1;
    if (streakW === 5 && !f.milestone5Wins) {
      f.milestone5Wins = true;
      recordMilestone(f, week, "streak_5", "5-fight win streak");
      events.push({ type: "milestone", title: `🔥 Hot Streak`, body: `${f.name} telah memenangkan 5 pertarungan berturut-turut!` });

      queueDelayedEvent(g, {
        title: "📰 Media Buzz",
        body: `Media lokal mulai meliput win streak ${f.name}.`,
        choices: [
          { label: "Terima wawancara (rep +3)", rep: 3 },
          { label: "Fokus latihan", chem: 1 },
        ],
      }, 2);

      queueDelayedEvent(g, {
        title: "🥊 Tawaran Big Fight",
        body: `Promotor besar tawarkan slot main event buat ${f.name} karena momentum ini.`,
        choices: [
          { label: "Terima tantangan (rep +5, chemistry -2)", rep: 5, chem: -2 },
          { label: "Main aman dulu", chem: 2 },
        ],
      }, 4);
    }
    if (streakW === 10 && !f.milestone10Wins) {
      f.milestone10Wins = true;
      recordMilestone(f, week, "streak_10", "10-fight win streak");
      events.push({ type: "milestone", title: `⚡ Dominant`, body: `${f.name} tak terkalahkan dalam 10 pertarungan terakhir!` });

      queueDelayedEvent(g, {
        title: "🌟 Status Ikon",
        body: `${f.name} mulai dikenal luas — rekor 10-win streak jadi buah bibir komunitas MMA.`,
        choices: [
          { label: "Manfaatkan momentum (rep +8)", rep: 8 },
          { label: "Tetap rendah hati (chemistry +4)", chem: 4 },
        ],
      }, 3);

      queueDelayedEvent(g, {
        title: "💰 Tawaran Investor",
        body: `Investor tertarik suntik modal besar ke camp karena reputasi ${f.name}.`,
        choices: [
          { label: "Terima modal ($40,000)", cash: 40000 },
          { label: "Tolak — jaga independensi (chemistry +3)", chem: 3 },
        ],
      }, 6);
    }
  }

  // Losing streaks
  const streakL = f.streakL || 0;
  if (streakL === 3 && !f.milestone3Losses) {
    f.milestone3Losses = true;
    recordMilestone(f, week, "streak_l3", "3-fight losing streak");
    events.push({ type: "milestone", title: `📉 Skid`, body: `${f.name} telah kalah 3 kali berturut-turut. Karir di persimpangan.` });
  }

  // Career fight count
  const totalFights = f.record.w + f.record.l;
  if (totalFights === 10 && !f.milestone10Fights) {
    f.milestone10Fights = true;
    recordMilestone(f, week, "fights_10", "10 career fights");
    events.push({ type: "milestone", title: `🔟 Veteran`, body: `${f.name} mencapai 10 pertarungan karir.` });
  }
  if (totalFights === 20 && !f.milestone20Fights) {
    f.milestone20Fights = true;
    recordMilestone(f, week, "fights_20", "20 career fights");
    events.push({ type: "milestone", title: `💎 Iron Man`, body: `${f.name} mencapai 20 pertarungan — langka di dunia MMA.` });
  }

  return events;
}

// Track ranking milestones
export function processRankChange(f, g, oldRank, newRank) {
  const events = [];

  // Entered top 10
  if (oldRank == null || oldRank > 10) {
    if (newRank != null && newRank <= 10 && !f.milestoneTop10) {
      f.milestoneTop10 = true;
      recordMilestone(f, g.week, "top10", `Ranked #${newRank}`);
      events.push({ type: "milestone", title: `📈 Top 10`, body: `${f.name} masuk peringkat #${newRank} — kini di jajaran elit divisi.` });
    }
  }

  // Entered top 5
  if (newRank != null && newRank <= 5 && !f.milestoneTop5) {
    f.milestoneTop5 = true;
    recordMilestone(f, g.week, "top5", `Ranked #${newRank}`);
    events.push({ type: "milestone", title: `⭐ Top 5`, body: `${f.name} naik ke peringkat #${newRank} — title shot dalam jangkauan.` });
  }

  return events;
}

// Track title milestones
export function processTitleChange(f, g, action) {
  const events = [];

  // First title win
  if (action === "won" && !f.milestoneFirstTitle) {
    f.milestoneFirstTitle = true;
    recordMilestone(f, g.week, "first_title", "First championship");
    events.push({ type: "milestone", title: `👑 Champion`, body: `${f.name} merebut gelar juara pertamanya!` });
  }

  // Title defenses
  if (action === "defense") {
    f.titleDefenses = (f.titleDefenses || 0) + 1;
    const def = f.titleDefenses;
    if (def === 3) {
      recordMilestone(f, g.week, "defense_3", "3 title defenses");
      events.push({ type: "milestone", title: `🛡️ Dominant Champ`, body: `${f.name} sukses mempertahankan gelar untuk ke-3 kalinya.` });
    }
    if (def === 5) {
      recordMilestone(f, g.week, "defense_5", "5 title defenses");
      events.push({ type: "milestone", title: `👑👑 Reigning King`, body: `${f.name} — 5 kali pertahanan gelar. Sebuah era dominasi.` });
    }
  }

  return events;
}

// ── STORY TAGS ──

export function getStoryTags(f) {
  const tags = [];
  const totalFights = (f.record?.w || 0) + (f.record?.l || 0);
  const winPct = totalFights > 0 ? f.record.w / totalFights : 0;

  // Prospect
  if (totalFights <= 5 && winPct >= 0.6) {
    tags.push({ tag: "Prospect", color: "#3ea6ff", desc: "Fighter muda dengan potensi menjanjikan." });
  }

  // Rising Star
  if (f.streakW >= 3 && totalFights >= 3 && (f.age || 30) <= 28) {
    tags.push({ tag: "Rising Star", color: "#f5b942", desc: "On the rise — dangerous momentum." });
  }

  // Champion
  if (f.titles?.some((t) => t.includes("Champion"))) {
    tags.push({ tag: "Champion", color: "#ffd15c", desc: "Current title holder." });
  }

  // Former Champion
  if (f.milestoneFirstTitle && !f.titles?.some((t) => t.includes("Champion"))) {
    tags.push({ tag: "Former Champion", color: "#8a6f2e", desc: "Pernah merasakan puncak — masih berbahaya." });
  }

  // Veteran
  if (totalFights >= 15) {
    tags.push({ tag: "Veteran", color: "#64717f", desc: `${totalFights} pertarungan — berpengalaman.` });
  }

  // Giant Killer
  if (f.giantKills >= 3 && !f.titles?.some((t) => t.includes("Champion"))) {
    tags.push({ tag: "Giant Killer", color: "#ef4d5a", desc: "Spesialis menjatuhkan petarung ranked." });
  }

  // Gatekeeper
  if (totalFights >= 12 && winPct >= 0.4 && winPct <= 0.6 && (f.age || 30) >= 30) {
    tags.push({ tag: "Gatekeeper", color: "#9aa7b8", desc: "Ujian sesungguhnya bagi para prospek." });
  }

  // Comeback Fighter
  if (f.milestone3Losses && f.streakW >= 2) {
    tags.push({ tag: "Comeback Fighter", color: "#35c98a", desc: "Bangkit dari keterpurukan." });
  }

  // Journeyman
  if (totalFights >= 10 && winPct < 0.4) {
    tags.push({ tag: "Journeyman", color: "#64717f", desc: "Fighter pekerja keras yang terus berjuang." });
  }

  // Legend
  if (f.milestoneFirstTitle && (f.titleDefenses || 0) >= 3 && totalFights >= 15) {
    tags.push({ tag: "Legend", color: "#ffd15c", desc: "Warisan yang tak terbantahkan." });
  }

  return tags;
}

// ── MENTOR SYSTEM ──

export function calcMentorBonus(g, trainee) {
  if (!g.roster || g.roster.length < 2) return 1.0;

  let bonus = 0;
  g.roster.forEach((mentor) => {
    if (mentor.id === trainee.id) return;
    // Mentor criteria: age 30+ or 15+ fights, not injured, not booked for fight this week
    const totalFights = (mentor.record?.w || 0) + (mentor.record?.l || 0);
    const isVeteran = (mentor.age >= 30 || totalFights >= 15);
    const isAvailable = !mentor.injury && (!mentor.booked || mentor.booked.weeksLeft > 2);
    // Trainee should be younger/less experienced
    const traineeFights = (trainee.record?.w || 0) + (trainee.record?.l || 0);
    const isMentoring = trainee.age < mentor.age || traineeFights < totalFights;

    if (isVeteran && isAvailable && isMentoring) {
      // Small bonus: 1% per mentor, max 3% total
      bonus += 0.01;
    }
  });

  return clamp(1 + Math.min(bonus, 0.03), 1, 1.03);
}

// ── RIVALRY EVOLUTION ──

export function processRivalry(fighter, opponent, g) {
  const events = [];
  if (!fighter.rivalries) fighter.rivalries = {};

  const key = opponent.name;
  const existing = fighter.rivalries[key] || { count: 0, wins: 0, losses: 0 };

  existing.count++;
  fighter.rivalries[key] = existing;

  // 2nd fight = developing rivalry
  if (existing.count === 2) {
    events.push({
      type: "rivalry",
      title: `⚔️ Rematch: ${fighter.name} vs ${opponent.name}`,
      body: `Pertemuan kedua. Skor sementara: ${fighter.name} ${existing.wins}-${existing.losses} ${opponent.name}.`,
    });
  }

  // 3rd fight = trilogy
  if (existing.count === 3) {
    events.push({
      type: "rivalry",
      title: `🔥 Trilogy: ${fighter.name} vs ${opponent.name}`,
      body: `Pertarungan ketiga. Rivalitas ini akan dikenang — skor ${existing.wins}-${existing.losses}.`,
    });
  }

  return events;
}

// Call this after fight result to update rivalry W/L
export function updateRivalryResult(winner, loser, g) {
  if (!winner.rivalries) winner.rivalries = {};
  if (!loser.rivalries) loser.rivalries = {};

  const wKey = loser.name;
  const lKey = winner.name;

  if (winner.rivalries[wKey]) winner.rivalries[wKey].wins++;
  else winner.rivalries[wKey] = { count: 1, wins: 1, losses: 0 };

  if (loser.rivalries[lKey]) loser.rivalries[lKey].losses++;
  else loser.rivalries[lKey] = { count: 1, wins: 0, losses: 1 };
}
