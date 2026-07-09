// ============================================================
//   TRAINING PHILOSOPHY — Cycles, identity, automation, coach advice
//   No new programs. No new mechanics. Smarter use of existing systems.
// ============================================================

// ── TRAINING CYCLES ──

export function getTrainingCycle(f) {
  const ot = f.overtraining || 0;
  const booked = f.booked;
  const injury = f.injury;
  const attrs = f.attrs || {};
  const ceilings = f.ceilings || {};

  if (injury) return { phase: "recovery", label: "Injury Recovery", icon: "🚑", desc: "Recovering from injury. Cannot train." };
  if (booked && booked.weeksLeft <= 2) return { phase: "fight_camp", label: "Fight Camp", icon: "🔥", desc: "Preparing for fight. Fight Camp is mandatory." };
  if (ot >= 75) return { phase: "recovery", label: "Recovery Needed", icon: "💤", desc: "Overtraining critical. Switch to Recovery immediately." };
  if (ot >= 50) return { phase: "warning", label: "Overtraining Warning", icon: "⚠️", desc: "Overtraining building up. Consider Recovery soon." };

  // Calculate how close to ceiling the fighter is
  const ceilingProgress = Object.keys(attrs).reduce((s, k) => s + (attrs[k] / (ceilings[k] || 99)), 0) / 8;
  if (ceilingProgress >= 0.90) return { phase: "maintenance", label: "Maintenance", icon: "🛡️", desc: "Near peak. Gains are slow. Focus on maintaining." };
  if (ceilingProgress >= 0.65) return { phase: "refinement", label: "Refinement", icon: "🎯", desc: "Approaching ceiling. Target specific weak attributes." };
  if (f.age >= 34) return { phase: "veteran", label: "Veteran Care", icon: "🧓", desc: "Age is a factor. Prioritize safety and longevity." };
  if ((f.record?.w || 0) + (f.record?.l || 0) <= 3) return { phase: "development", label: "Development", icon: "🌱", desc: "Early career. Build a strong foundation." };

  return { phase: "peak", label: "Peak Training", icon: "⚡", desc: "In prime condition. Push for maximum gains." };
}

// ── COACH TRAINING PHILOSOPHY ──

export function getCoachRecommendation(coach, fighter) {
  const recs = [];

  if (coach.specialty === "Striking") {
    recs.push({ program: "striking", reason: `${coach.name}: "Focus on striking. Build that stand-up game."` });
  }
  if (coach.specialty === "Wrestling") {
    recs.push({ program: "grappling", reason: `${coach.name}: "Wrestling wins fights. Take them down."` });
  }
  if (coach.specialty === "BJJ") {
    recs.push({ program: "grappling", reason: `${coach.name}: "Jiu-jitsu is the great equalizer."` });
  }
  if (coach.specialty === "S&C") {
    recs.push({ program: "conditioning", reason: `${coach.name}: "Strength and cardio. Everything else follows."` });
  }
  if (coach.specialty === "Head") {
    recs.push({ program: "sparring", reason: `${coach.name}: "All-around training. Be ready for anything."` });
  }

  // Coach personality flavor
  if (coach.personality === "Motivator" && fighter.morale < 50) {
    recs.push({ program: "sparring", reason: `${coach.name}: "Let's get you fired up! Hard sparring builds confidence."` });
  }
  if (coach.personality === "Disciplinarian" && fighter.overtraining > 40) {
    recs.push({ program: "recovery", reason: `${coach.name}: "Discipline means knowing when to rest. Recovery. Now."` });
  }
  if (coach.personality === "Technician" && fighter.attrs) {
    const lowest = Object.entries(fighter.attrs).sort((a, b) => a[1] - b[1])[0];
    const fixMap = { striking: "striking", wrestling: "grappling", bjj: "grappling", footwork: "striking", strength: "conditioning", cardio: "conditioning" };
    const prog = fixMap[lowest[0]] || "sparring";
    recs.push({ program: prog, reason: `${coach.name}: "Your ${lowest[0]} needs work. Let's drill it."` });
  }

  return recs;
}

// ── SMART AUTOMATION ──

export function getLastTraining(fighter) {
  try {
    const stored = localStorage.getItem(`mma-training-last-${fighter.id}`);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return null;
}

export function saveLastTraining(fighter, program, intensity) {
  try {
    localStorage.setItem(`mma-training-last-${fighter.id}`, JSON.stringify({ program, intensity }));
  } catch { /* ignore */ }
}

export function autoRestoreTraining(fighter, g) {
  // After Fight Camp ends (booked cleared), restore previous training
  if (!fighter.booked && fighter.training?.type === "fightcamp") {
    const last = getLastTraining(fighter);
    if (last) {
      return last;
    }
  }
  return null;
}

export function bulkAssign(g, program, intensity, filter) {
  const count = { assigned: 0 };
  g.roster?.forEach(f => {
    if (filter && !filter(f)) return;
    if (f.injury || f.booked) return;
    saveLastTraining(f, f.training?.type, f.training?.intensity);
    f.training = { type: program, intensity: intensity || f.training?.intensity || "Medium" };
    count.assigned++;
  });
  return count;
}

// ── TRAINING-BASED FIGHTER IDENTITY ──

export function getTrainingIdentity(f) {
  const history = f.trainingHistory || [];
  if (history.length < 4) return null;

  const counts = {};
  history.forEach(h => {
    // Infer training type from attribute changes
    // Simplified: use the current training type as approximation
  });

  const totalFights = (f.record?.w || 0) + (f.record?.l || 0);
  const koRate = totalFights > 0 ? (f.record?.ko || 0) / totalFights : 0;
  const subRate = totalFights > 0 ? (f.record?.sub || 0) / totalFights : 0;
  const avgAttr = f.attrs ? Object.values(f.attrs).reduce((s, v) => s + v, 0) / 8 : 0;

  const identities = [];

  // From training patterns + fight results
  if (f.training?.type === "striking" && history.length >= 6 && koRate > 0.3) {
    identities.push({ id: "elite_striker", label: "Elite Striker", icon: "🥊" });
  }
  if (f.training?.type === "grappling" && history.length >= 6 && subRate > 0.25) {
    identities.push({ id: "grappling_specialist", label: "Grappling Specialist", icon: "🤼" });
  }
  if (f.training?.type === "conditioning" && history.length >= 8 && (f.attrs?.cardio || 0) >= 80) {
    identities.push({ id: "conditioning_machine", label: "Conditioning Machine", icon: "🏃" });
  }
  if (totalFights >= 15 && avgAttr >= 78) {
    identities.push({ id: "complete_martial_artist", label: "Complete Martial Artist", icon: "⚔️" });
  }
  if (f.age >= 34 && totalFights >= 12) {
    identities.push({ id: "technical_veteran", label: "Technical Veteran", icon: "🧠" });
  }
  if (avgAttr >= 85) {
    identities.push({ id: "elite_athlete", label: "Elite Athlete", icon: "💪" });
  }

  return identities.length > 0 ? identities : null;
}

// ── DEVELOPMENT PHILOSOPHY ──

export function getDevelopmentPhilosophy(fighter) {
  const attrs = fighter.attrs || {};
  const ceilings = fighter.ceilings || {};
  const age = fighter.age || 25;
  const totalFights = (fighter.record?.w || 0) + (fighter.record?.l || 0);

  // Find weakest and strongest attributes
  const sorted = Object.entries(attrs).sort((a, b) => a[1] - b[1]);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];

  const philosophies = [];

  if (totalFights <= 3 && age <= 24) {
    philosophies.push({ id: "develop_base", label: "Build Foundation", rec: "sparring", desc: "Young fighter. Build well-rounded skills." });
  }

  if (weakest[1] < 40) {
    philosophies.push({ id: "fix_weakness", label: `Fix ${weakest[0]}`, rec: weakest[0] === "striking" || weakest[0] === "footwork" ? "striking" : weakest[0] === "wrestling" || weakest[0] === "bjj" ? "grappling" : "conditioning", desc: `${weakest[0]} is a glaring weakness. Prioritize fixing it.` });
  }

  if (fighter.booked?.opponent) {
    philosophies.push({ id: "prepare_opponent", label: "Opponent Prep", rec: "sparring", desc: "Preparing for upcoming fight. Balanced training recommended." });
  }

  if (age >= 34) {
    philosophies.push({ id: "veteran_maintain", label: "Veteran Maintenance", rec: "recovery", desc: "Age 34+. Prioritize longevity over gains." });
  }

  // Gap to ceiling analysis
  const gapToCeiling = Object.keys(attrs).reduce((s, k) => s + ((ceilings[k] || 99) - attrs[k]), 0) / 8;
  if (gapToCeiling > 15 && age <= 28) {
    philosophies.push({ id: "accelerate_growth", label: "Accelerate Growth", rec: "sparring", desc: `Significant room to grow (${Math.round(gapToCeiling)} pts avg). Push hard.` });
  }

  return philosophies;
}
