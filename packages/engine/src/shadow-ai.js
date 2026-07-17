// ============================================================
//   SHADOW AI CAMP SIMULATION — Lightweight abstract management
//   No weekly training. No finances. No detailed contracts.
//   Quarterly update cycle with abstract organizational values.
//   Uses shadow-ai/ modules for config, state factory, history.
// ============================================================

import { R, RI, clamp, random } from "./rng.js";
import { genFighter, genCoach } from "./fighter.js";
import { createShadowState, assignPhilosophy, calculateRosterQuality } from "./shadow-ai/state.js";
import { recordCampHistory } from "./shadow-ai/history.js";
import {
  SHADOW_TICK_INTERVAL,
  DEV_AGE_YOUNG, DEV_AGE_PRIME, DEV_AGE_MATURE, DEV_AGE_VETERAN, DEV_AGE_STOP,
  AGE_MULT_YOUNG, AGE_MULT_PRIME, AGE_MULT_MATURE, AGE_MULT_VETERAN, AGE_MULT_DECLINE,
  LEVEL_MIN, LEVEL_MAX,
  DEV_QUALITY_DIVISOR, DEV_GROWTH_MIN, DEV_GROWTH_MAX, DEV_DECLINE_MIN, DEV_DECLINE_MAX, DEV_CHAMPIONSHIP_BONUS,
  COACH_SKILL_MAX, COACH_GROWTH_CHANCE, COACH_GROWTH_MIN, COACH_GROWTH_MAX, COACH_RETIRE_AGE, COACH_RETIRE_CHANCE,
  LC_CHAMPIONSHIP_QUALITY, LC_CHAMPIONSHIP_REP, LC_DECLINE_QUALITY, LC_DECLINE_REP,
  LC_REBUILD_QUALITY, LC_GROWTH_QUALITY, LC_GROWTH_REP, LC_EXPANSION_QUALITY, LC_EXPANSION_REP, LC_REBUILD_RECOVERY,
  ELITE_TARGET_SIZE, DEFAULT_TARGET_MIN, DEFAULT_TARGET_MAX, ROSTER_OVERFLOW_PAD, ACQUIRE_MIN_BUDGET,
  RECRUIT_QUALITY_DIVISOR, ELITE_LEVEL_MIN, ELITE_LEVEL_MAX, ROOKIE_LEVEL_MIN, ROOKIE_LEVEL_MAX,
  RECRUIT_AGE_MIN, RECRUIT_AGE_MAX, RECRUIT_COST_MIN, RECRUIT_COST_MAX,
  REP_QUALITY_WEIGHT, REP_MOMENTUM_WEIGHT, REP_RANKING_WEIGHT, REP_DRIFT_RATE,
  MOMENTUM_QUALITY_OFFSET, MOMENTUM_QUALITY_MULT, MOMENTUM_JITTER_MIN, MOMENTUM_JITTER_MAX, MOMENTUM_MIN, MOMENTUM_MAX,
  HOF_MIN_WINS,
  RETIRE_AGE_CHECK, RETIRE_AGE_FORCE,
} from "./shadow-ai/config.js";

// ── CAMP STATE INITIALIZATION ──

export function initShadowCamp(camp) {
  if (camp._shadow) return;
  camp._shadow = createShadowState(camp);
}

// ── QUARTERLY MANAGEMENT CYCLE ──

export function shadowCampTick(camp, week, g) {
  if (!camp._shadow) initShadowCamp(camp);
  if (week - camp._shadow.lastUpdateWeek < SHADOW_TICK_INTERVAL) return;
  camp._shadow.lastUpdateWeek = week;

  const s = camp._shadow;

  updateLifecycle(camp);
  developFighters(camp);
  acquireProspects(camp, week);
  developCoaches(camp);
  updateReputation(camp, g);
  manageRoster(camp, week);
  updateMomentum(camp);
  updateHistory(camp);
}

// ── LIFECYCLE ──

function updateLifecycle(camp) {
  const s = camp._shadow;
  const quality = calculateRosterQuality(camp);
  const rep = camp.rep || 30;

  if (quality >= LC_CHAMPIONSHIP_QUALITY && rep >= LC_CHAMPIONSHIP_REP) {
    s.lifecycle = random() < 0.8 ? "championship" : "growth";
  } else if (quality < LC_DECLINE_QUALITY && rep < LC_DECLINE_REP && s.lifecycle === "championship") {
    s.lifecycle = "decline";
  } else if (quality < LC_REBUILD_QUALITY) {
    s.lifecycle = random() < 0.6 ? "rebuild" : "decline";
  } else if (quality >= LC_GROWTH_QUALITY && rep >= LC_GROWTH_REP && (s.lifecycle === "decline" || s.lifecycle === "rebuild")) {
    s.lifecycle = "growth";
  } else if (quality >= LC_EXPANSION_QUALITY && rep >= LC_EXPANSION_REP && s.lifecycle === "expansion") {
    s.lifecycle = "growth";
  } else if (s.lifecycle === "rebuild" && quality >= LC_REBUILD_RECOVERY) {
    s.lifecycle = "growth";
  }
}

// ── FIGHTER DEVELOPMENT ──

function developFighters(camp) {
  const s = camp._shadow;
  camp.fighters?.forEach(f => {
    if (f.age > DEV_AGE_STOP) return;
    const ageMult = f.age <= DEV_AGE_YOUNG ? AGE_MULT_YOUNG
      : f.age <= DEV_AGE_PRIME ? AGE_MULT_PRIME
      : f.age <= DEV_AGE_MATURE ? AGE_MULT_MATURE
      : f.age <= DEV_AGE_VETERAN ? AGE_MULT_VETERAN
      : AGE_MULT_DECLINE;
    const growth = R(DEV_GROWTH_MIN, DEV_GROWTH_MAX) * (s.developmentQuality / DEV_QUALITY_DIVISOR) * ageMult * (s.lifecycle === "championship" ? DEV_CHAMPIONSHIP_BONUS : 1);
    f.level = clamp(f.level + growth, LEVEL_MIN, LEVEL_MAX);

    if (f.age >= DEV_AGE_VETERAN) f.level = clamp(f.level - R(DEV_DECLINE_MIN, DEV_DECLINE_MAX), LEVEL_MIN, f.level);
  });
}

// ── PROSPECT ACQUISITION ──

function acquireProspects(camp, week) {
  const s = camp._shadow;
  const targetSize = s.philosophy?.id === "elite" ? ELITE_TARGET_SIZE : RI(DEFAULT_TARGET_MIN, DEFAULT_TARGET_MAX);
  if ((camp.fighters?.length || 0) >= targetSize) return;
  if (s.budget < ACQUIRE_MIN_BUDGET) return;

  const level = s.philosophy?.id === "elite" ? R(ELITE_LEVEL_MIN, ELITE_LEVEL_MAX) : R(ROOKIE_LEVEL_MIN, ROOKIE_LEVEL_MAX);
  const newFighter = genFighter(level);
  newFighter.joinedWeek = week;
  newFighter.age = RI(RECRUIT_AGE_MIN, RECRUIT_AGE_MAX);
  newFighter.level = level;

  camp.fighters.push(newFighter);
  s.budget -= RI(RECRUIT_COST_MIN, RECRUIT_COST_MAX);
  s.totalFightersDeveloped++;
}

// ── COACH DEVELOPMENT ──

function developCoaches(camp) {
  const s = camp._shadow;
  camp.coaches?.forEach(c => {
    if (c.skill < COACH_SKILL_MAX && random() < COACH_GROWTH_CHANCE) {
      c.skill = clamp(c.skill + R(COACH_GROWTH_MIN, COACH_GROWTH_MAX), 1, COACH_SKILL_MAX);
    }
    if (!c._age) c._age = RI(30, 50);
    c._age++;
    if (c._age > COACH_RETIRE_AGE && random() < COACH_RETIRE_CHANCE) {
      const newCoach = genCoach();
      Object.assign(c, newCoach);
      c._age = RI(30, 40);
    }
  });
  s.coachingQuality = clamp(Math.round(
    (camp.coaches?.reduce((sum, c) => sum + (c.skill || 3), 0) || 3) / (camp.coaches?.length || 1)
  ), 1, COACH_SKILL_MAX);
}

/**
 * Calculate ranking performance for a camp: average rank-based score
 * of all fighters in g.divisions with this camp's campId.
 * Returns 0-100 (100 = champion or rank 1, 0 = rank 15 or no fighters).
 */
function calculateRankingPerformance(camp, g) {
  if (!g?.divisions) return 0;

  let totalScore = 0;
  let count = 0;

  Object.entries(g.divisions).forEach(([wc, div]) => {
    div.list.forEach((fighter, idx) => {
      if (fighter.campId === camp.id) {
        const rank = idx + 1; // 1-15
        // Linear: rank 1 ≈ 100, rank 15 ≈ 0
        let score = Math.max(0, 100 - (rank - 1) * (100 / 14));
        // Champion bonus: treat as rank 0 (above scale)
        if (div.champ?.campId === camp.id && div.champ.name === fighter.name) {
          score = 100;
        }
        totalScore += score;
        count++;
      }
    });
  });

  return count > 0 ? Math.round(totalScore / count) : 0;
}

// ── REPUTATION ──

export function updateReputation(camp, g) {
  const s = camp._shadow;
  const quality = calculateRosterQuality(camp);
  const rankingPerformance = calculateRankingPerformance(camp, g);
  const target = quality * REP_QUALITY_WEIGHT
    + s.organizationalMomentum * REP_MOMENTUM_WEIGHT
    + rankingPerformance * REP_RANKING_WEIGHT;
  camp.rep = clamp(camp.rep + (target - camp.rep) * REP_DRIFT_RATE, 2, 100);
  s.peakReputation = Math.max(s.peakReputation, camp.rep);
}

// ── ROSTER MANAGEMENT ──

function manageRoster(camp, week) {
  const s = camp._shadow;
  const turnoverRate = s.philosophy?.turnoverRate || 0.15;

  // Retire old fighters
  camp.fighters = camp.fighters?.filter(f => {
    if (f.age >= RETIRE_AGE_CHECK && random() < 0.3 * turnoverRate * 3) {
      const wins = f.record?.w || 0;
      if (wins >= HOF_MIN_WINS && s.championsProduced >= 1) {
        s.championsProduced++;
      }
      s.generationsCompleted++;
      return false;
    }
    if (f.age >= RETIRE_AGE_FORCE) {
      s.generationsCompleted++;
      return false;
    }
    return true;
  });

  // Release worst performers if over target
  const targetSize = s.philosophy?.id === "elite" ? ELITE_TARGET_SIZE : RI(DEFAULT_TARGET_MIN, DEFAULT_TARGET_MAX);
  while ((camp.fighters?.length || 0) > targetSize + ROSTER_OVERFLOW_PAD) {
    const worst = camp.fighters.reduce((a, b) => (a.level || 0) < (b.level || 0) ? a : b);
    camp.fighters = camp.fighters.filter(f => f !== worst);
  }
}

// ── MOMENTUM ──

function updateMomentum(camp) {
  const s = camp._shadow;
  const quality = calculateRosterQuality(camp);
  const momentumChange = (quality - MOMENTUM_QUALITY_OFFSET) * MOMENTUM_QUALITY_MULT + R(MOMENTUM_JITTER_MIN, MOMENTUM_JITTER_MAX);
  s.organizationalMomentum = clamp(s.organizationalMomentum + momentumChange, MOMENTUM_MIN, MOMENTUM_MAX);
}

// ── HISTORY ──

function updateHistory(camp) {
  const quality = calculateRosterQuality(camp);
  const rep = camp.rep || 30;
  recordCampHistory(camp, quality, rep);
}

// ── PUBLIC API ──

export function getCampLifecycleLabel(camp) {
  const labels = {
    expansion: { label: "Expansion", icon: "📈", color: "#3ea6ff" },
    growth: { label: "Growth", icon: "🌱", color: "#35c98a" },
    championship: { label: "Championship Window", icon: "👑", color: "#ffd15c" },
    decline: { label: "Decline", icon: "📉", color: "#f5b942" },
    rebuild: { label: "Rebuilding", icon: "🔧", color: "#ef4d5a" },
  };
  return labels[camp._shadow?.lifecycle] || labels.expansion;
}

export function getCampSummary(camp) {
  if (!camp._shadow) initShadowCamp(camp);
  const s = camp._shadow;
  return {
    name: camp.name,
    philosophy: s.philosophy?.id || "balanced",
    lifecycle: getCampLifecycleLabel(camp),
    rosterQuality: calculateRosterQuality(camp),
    rep: camp.rep || 0,
    fighters: camp.fighters?.length || 0,
    coaches: camp.coaches?.length || 0,
    coachingQuality: s.coachingQuality,
    developmentQuality: s.developmentQuality,
    recruitmentQuality: s.recruitmentQuality,
    momentum: s.organizationalMomentum,
    totalDeveloped: s.totalFightersDeveloped,
    championsProduced: s.championsProduced,
    budget: s.budget,
  };
}

// ── INTEGRATION: tick all rival camps ──

export function tickAllShadowCamps(g) {
  g.rivals?.forEach(camp => {
    shadowCampTick(camp, g.week, g);
  });
}
