// Shadow AI state — initialization, philosophy, roster quality
import { RI, clamp } from "../rng.js";
import {
  COACH_SKILL_MAX,
} from "./config.js";

/** Create the _shadow state object with logical grouping */
export function createShadowState(camp) {
  return {
    // ── Resources ──
    budget: RI(30000, 120000),
    coachingQuality: clamp(Math.round(camp.coaches?.[0]?.skill || RI(2, 5)), 1, COACH_SKILL_MAX),
    developmentQuality: RI(30, 70),
    recruitmentQuality: RI(20, 60),

    // ── Progression ──
    organizationalMomentum: RI(-20, 30),
    lifecycle: "expansion", // expansion, growth, championship, decline, rebuild
    rosterQuality: calculateRosterQuality(camp),
    philosophy: assignPhilosophy(camp),
    lastUpdateWeek: 0,

    // ── History ──
    totalFightersDeveloped: camp.fighters?.length || 0,
    championsProduced: 0,
    generationsCompleted: 0,
    peakReputation: camp.rep || 0,
  };
}

/** Map camp trait to development philosophy */
export function assignPhilosophy(camp) {
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

/** Calculate abstract roster quality score (10–95) */
export function calculateRosterQuality(camp) {
  if (!camp.fighters || camp.fighters.length === 0) return 30;
  const avgLevel = camp.fighters.reduce((s, f) => s + (f.level || 0.5), 0) / camp.fighters.length;
  return clamp(Math.round(avgLevel * 60), 10, 95);
}
