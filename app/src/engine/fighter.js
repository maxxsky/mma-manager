import { R, RI, clamp, pick, random, uid } from "./rng.js";
import {
  ATTRS, WEIGHTS, ARCHETYPES, REGIONS, TRAITS, TRAIT_KEYS, TRAIT_CONFLICTS,
  AMBITIONS, AMBITION_KEYS, AGENT_TYPES, COACH_SPECS, COACH_NAMES, COACH_PERSONALITIES,
} from "./data.js";

// ---------- generators ----------
export function genAttrs(level) {
  const o = {};
  ATTRS.forEach((k) => (o[k] = clamp(Math.round(level * 60 + R(-12, 12)), 15, 95)));
  return o;
}

export function genFighter(level, regionName) {
  const region = regionName || pick(Object.keys(REGIONS));
  const rd = REGIONS[region];
  const archetype = random() < 0.55 ? rd.arch : pick(Object.keys(ARCHETYPES));
  const attrs = genAttrs(level);
  Object.entries(ARCHETYPES[archetype]).forEach(([k, m]) => {
    attrs[k] = clamp(Math.round(attrs[k] * m), 15, 95);
  });
  const ceilings = {};
  ATTRS.forEach((k) => (ceilings[k] = clamp(attrs[k] + RI(8, 30), attrs[k], 99)));
  const wc = pick(WEIGHTS);
  const traits = [];
  while (traits.length < 2) {
    const t = pick(TRAIT_KEYS);
    if (!traits.includes(t)) {
      // Check conflicts: skip trait that conflicts with an already-assigned trait
      const conflicts = TRAIT_CONFLICTS[t];
      if (!conflicts || !traits.some((existing) => conflicts.includes(existing))) {
        traits.push(t);
      }
    }
  }
  return {
    id: uid(),
    name: pick(rd.first) + " " + pick(rd.last),
    age: RI(18, 31), region, archetype,
    weightClass: wc.name, natWeight: Math.round(wc.limit * R(1.0, 1.09)),
    attrs, ceilings, traits,
    morale: RI(55, 80), popularity: RI(0, 25), overtraining: 0,
    injury: null,
    training: { type: "conditioning", intensity: "Medium" },
    booked: null,
    record: { w: 0, l: 0, ko: 0, sub: 0, dec: 0 },
    titles: [],
    ambition: pick(AMBITION_KEYS), ambitionRevealed: false,
    rankPoints: 0, joinedWeek: 0, lastFightWeek: 0, fightsThisYear: 0,
    streakL: 0, convincedOnce: false,
    agent: "none", contract: null,
    asking: Math.round(level * 8000 + R(500, 3000)),
    weightClassDelta: 0,
    externalPartner: null,
    // Reach in cm — scaled by weight class (heavier ≈ taller ≈ longer reach)
    reach: wc.limit >= 205 ? RI(190, 210) : wc.limit >= 170 ? RI(180, 198) : wc.limit >= 145 ? RI(170, 190) : RI(160, 180),
  };
}

export function assignAgent(f) {
  f.agent = agentFor(f);
  return f;
}

export function avgSkill(f) {
  return ATTRS.reduce((s, k) => s + f.attrs[k], 0) / ATTRS.length;
}

export function tierOf(f) {
  const a = avgSkill(f);
  return a < 45 ? "Prospect" : a < 60 ? "Pro" : a < 75 ? "Main Card" : "Elite";
}

export function weeklyFee(f) {
  return { Prospect: 200, Pro: 500, "Main Card": 800, Elite: 1200 }[tierOf(f)];
}

export function agentFor(f) {
  if (!f) return "none";
  const q = avgSkill(f) + (f.popularity || 0) * 0.5;
  if (q > 78) return "Power";
  if (q > 62) return "Standard";
  if (q > 48) return "Budget";
  return "none";
}

export function defaultContract() {
  return {
    managerCut: 0.18, fightsLeft: 4, fightsTotal: 4,
    durationMo: 24, signedWeek: 0, renegoFlagged: false,
  };
}

export function genCoach() {
  const skill = RI(2, 9);
  return {
    id: uid(), name: "Coach " + pick(COACH_NAMES),
    spec: pick(COACH_SPECS), skill, salary: skill * RI(1600, 2400),
    personality: pick(Object.keys(COACH_PERSONALITIES)),
  };
}

export function gradeOf(v) {
  return v >= 85 ? "A+" : v >= 75 ? "A" : v >= 65 ? "B+" : v >= 55 ? "B" : v >= 45 ? "C+" : v >= 35 ? "C" : "D";
}

export function scoutGrade(rep) {
  return rep >= 60 ? "S" : rep >= 40 ? "A" : rep >= 20 ? "B" : "C";
}

export function makeReport(f, grade) {
  const err = { C: 18, B: 10, A: 5, S: 0 }[grade];
  const est = {};
  ATTRS.forEach((k) => {
    if (grade === "C" && (k === "chin" || k === "fightIQ")) est[k] = "?";
    else est[k] = gradeOf(clamp(f.attrs[k] + RI(-err, err), 10, 99));
  });
  const potAvg = ATTRS.reduce((s, k) => s + f.ceilings[k], 0) / ATTRS.length;
  const pot = grade === "C" ? "?" : "⭐".repeat(clamp(Math.round(potAvg / 20), 1, 5));
  const traits = grade === "S" ? f.traits : grade === "A" ? [f.traits[0]] : [];
  return { est, pot, traits, ambition: grade === "S" ? f.ambition : null };
}
