// ============================================================
//   SHADOW AI CAMP SIMULATION — Lightweight abstract management
//   No weekly training. No finances. No detailed contracts.
//   Quarterly update cycle with abstract organizational values.
// ============================================================

import { clamp, R, RI, pick, random, uid } from "./rng.js";
import { genFighter } from "./fighter.js";
import { genCoach } from "./fighter.js";

// ── CAMP STATE INITIALIZATION ──

export function initShadowCamp(camp) {
  if (camp._shadow) return;
  camp._shadow = {
    // Abstract resources
    budget: RI(30000, 120000),
    coachingQuality: clamp(Math.round(camp.coaches?.[0]?.skill || RI(2, 5)), 1, 10),
    developmentQuality: RI(30, 70),
    recruitmentQuality: RI(20, 60),
    organizationalMomentum: RI(-20, 30),
    // History
    totalFightersDeveloped: camp.fighters?.length || 0,
    championsProduced: 0,
    generationsCompleted: 0,
    peakReputation: camp.rep || 0,
    // Cycle tracking
    lastUpdateWeek: 0,
    philosophy: assignPhilosophy(camp),
    lifecycle: "expansion", // expansion, growth, championship, decline, rebuild
    rosterQuality: calculateRosterQuality(camp),
  };
}

function assignPhilosophy(camp) {
  const trait = camp.trait || "Balanced Development";
  const philosophies = {
    "Striking Factory": { id: "striking", recruitBias: "striking", devFocus: ["striking", "footwork"], turnoverRate: 0.15 },
    "Wrestling Hub": { id: "wrestling", recruitBias: "wrestling", devFocus: ["wrestling", "bjj"], turnoverRate: 0.12 },
    "BJJ Academy": { id: "bjj", recruitBias: "bjj", devFocus: ["bjj", "wrestling"], turnoverRate: 0.12 },
    "Prospect Mill": { id: "prospect", recruitBias: "young", devFocus: ["all"], turnoverRate: 0.25 },
    "Elite Stable": { id: "elite", recruitBias: "elite", devFocus: ["all"], turnoverRate: 0.08 },
    "Balanced Development": { id: "balanced", recruitBias: "balanced", devFocus: ["all"], turnoverRate: 0.15 },
  };
  return philosophies[trait] || philosophies["Balanced Development"];
}

function calculateRosterQuality(camp) {
  if (!camp.fighters || camp.fighters.length === 0) return 30;
  const avgLevel = camp.fighters.reduce((s, f) => s + (f.level || 0.5), 0) / camp.fighters.length;
  return clamp(Math.round(avgLevel * 60), 10, 95);
}

// ── QUARTERLY MANAGEMENT CYCLE ──

export function shadowCampTick(camp, week) {
  if (!camp._shadow) initShadowCamp(camp);
  if (week - camp._shadow.lastUpdateWeek < 12) return; // quarterly
  camp._shadow.lastUpdateWeek = week;

  const s = camp._shadow;

  // 1. Update lifecycle phase
  updateLifecycle(camp);

  // 2. Fighter development
  developFighters(camp);

  // 3. Prospect acquisition (if below target size)
  acquireProspects(camp, week);

  // 4. Coach development
  developCoaches(camp);

  // 5. Reputation changes
  updateReputation(camp);

  // 6. Roster turnover (retire old, promote young)
  manageRoster(camp, week);

  // 7. Update organizational momentum
  updateMomentum(camp);

  // 8. Track history
  updateHistory(camp);
}

// ── LIFECYCLE ──

function updateLifecycle(camp) {
  const s = camp._shadow;
  const quality = calculateRosterQuality(camp);
  const rep = camp.rep || 30;

  if (quality >= 80 && rep >= 60) {
    s.lifecycle = random() < 0.8 ? "championship" : "growth";
  } else if (quality < 30 && rep < 20 && s.lifecycle === "championship") {
    s.lifecycle = "decline";
  } else if (quality < 20) {
    s.lifecycle = random() < 0.6 ? "rebuild" : "decline";
  } else if (quality >= 50 && rep >= 30 && (s.lifecycle === "decline" || s.lifecycle === "rebuild")) {
    s.lifecycle = "growth";
  } else if (quality >= 35 && rep >= 15 && s.lifecycle === "expansion") {
    s.lifecycle = "growth";
  } else if (s.lifecycle === "rebuild" && quality >= 40) {
    s.lifecycle = "growth";
  }
}

// ── FIGHTER DEVELOPMENT ──

function developFighters(camp) {
  const s = camp._shadow;
  camp.fighters?.forEach(f => {
    if (f.age > 36) return; // too old to develop
    // Lightweight: small level increase based on dev quality and age
    const ageMult = f.age <= 24 ? 1.3 : f.age <= 28 ? 1.15 : f.age <= 32 ? 1.0 : f.age <= 35 ? 0.7 : 0.4;
    const growth = R(0.002, 0.008) * (s.developmentQuality / 50) * ageMult * (s.lifecycle === "championship" ? 1.2 : 1);
    f.level = clamp(f.level + growth, 0.3, 1.5);

    // Aging
    if (f.age >= 34) f.level = clamp(f.level - R(0.003, 0.01), 0.3, f.level);
  });
}

// ── PROSPECT ACQUISITION ──

function acquireProspects(camp, week) {
  const s = camp._shadow;
  const targetSize = s.philosophy?.id === "elite" ? 4 : RI(5, 8);
  if ((camp.fighters?.length || 0) >= targetSize) return;
  if (s.budget < 5000) return;

  const quality = s.recruitmentQuality / 100;
  const level = s.philosophy?.id === "elite" ? R(0.65, 1.1) : R(0.3, 0.7);
  const newFighter = genFighter(level);
  newFighter.joinedWeek = week;
  newFighter.age = RI(19, 26);
  newFighter.level = level;

  camp.fighters.push(newFighter);
  s.budget -= RI(2000, 8000);
  s.totalFightersDeveloped++;
}

// ── COACH DEVELOPMENT ──

function developCoaches(camp) {
  const s = camp._shadow;
  camp.coaches?.forEach(c => {
    if (c.skill < 10 && random() < 0.3) {
      c.skill = clamp(c.skill + R(0.2, 0.5), 1, 10);
    }
    // Coach aging/retirement
    if (!c._age) c._age = RI(30, 50);
    c._age++;
    if (c._age > 60 && random() < 0.2) {
      // Replace retired coach
      const newCoach = genCoach();
      Object.assign(c, newCoach);
      c._age = RI(30, 40);
    }
  });
  s.coachingQuality = clamp(Math.round(
    (camp.coaches?.reduce((s, c) => s + (c.skill || 3), 0) || 3) / (camp.coaches?.length || 1)
  ), 1, 10);
}

// ── REPUTATION ──

function updateReputation(camp) {
  const s = camp._shadow;
  // Base drift toward equilibrium based on roster quality
  const quality = calculateRosterQuality(camp);
  const target = quality * 0.7 + s.organizationalMomentum * 0.3;
  camp.rep = clamp(camp.rep + (target - camp.rep) * 0.05, 2, 100);
  s.peakReputation = Math.max(s.peakReputation, camp.rep);
}

// ── ROSTER MANAGEMENT ──

function manageRoster(camp, week) {
  const s = camp._shadow;
  const turnoverRate = s.philosophy?.turnoverRate || 0.15;

  // Retire old fighters
  camp.fighters = camp.fighters?.filter(f => {
    if (f.age >= 38 && random() < 0.3 * turnoverRate * 3) {
      // Check Hall of Fame potential
      const wins = f.record?.w || 0;
      if (wins >= 8 && s.championsProduced >= 1) {
        s.championsProduced++;
      }
      s.generationsCompleted++;
      return false;
    }
    if (f.age >= 40) {
      s.generationsCompleted++;
      return false;
    }
    return true;
  });

  // Release worst performers if over target
  const targetSize = s.philosophy?.id === "elite" ? 4 : RI(5, 8);
  while ((camp.fighters?.length || 0) > targetSize + 2) {
    const worst = camp.fighters.reduce((a, b) => (a.level || 0) < (b.level || 0) ? a : b);
    camp.fighters = camp.fighters.filter(f => f !== worst);
  }
}

// ── MOMENTUM ──

function updateMomentum(camp) {
  const s = camp._shadow;
  const quality = calculateRosterQuality(camp);
  const momentumChange = (quality - 40) * 0.3 + R(-5, 5);
  s.organizationalMomentum = clamp(s.organizationalMomentum + momentumChange, -50, 50);
}

// ── HISTORY ──

function updateHistory(camp) {
  const s = camp._shadow;
  const quality = calculateRosterQuality(camp);
  const rep = camp.rep || 30;

  // Track championship eras
  if (quality >= 80 && rep >= 60 && !s._eraFlagged) {
    s._eraFlagged = true;
    if (!camp._campHistory) camp._campHistory = [];
    camp._campHistory.push({ type: "championship_era", week: 0, detail: `${camp.name} enters a championship era.` });
  }
  if (quality < 30 && s._eraFlagged) {
    s._eraFlagged = false;
  }
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
    shadowCampTick(camp, g.week);
  });
}
