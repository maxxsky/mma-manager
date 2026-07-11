// AI fighter factory — consistent creation for world simulation
import { R, RI, clamp, pick, uid } from "../rng.js";
import { SKILL_MIN, SKILL_MAX, POINTS_MIN, POINTS_MAX } from "./config.js";

const AI_FIRST = ["Marcus", "Carlos", "Dmitri", "Kaito", "Jamal", "Rafael", "Andre", "Sergei", "Takeshi", "Miguel", "Chris", "Ryan", "Diego", "Yuki", "Viktor"];
const AI_LAST = ["Silva", "Johnson", "Volkov", "Tanaka", "Carter", "Lima", "Santos", "Ivanov", "Sato", "Reyes", "Miller", "Garcia", "Kozlov", "Mori", "Petrov"];
const ARCHETYPES = ["Boxer", "Wrestler", "BJJ Specialist", "Muay Thai", "All-Rounder"];

export function generateAIName() {
  return `${pick(AI_FIRST)} ${pick(AI_LAST)}`;
}

/** Create a rookie AI fighter for division population */
export function createAIFighter(overrides = {}) {
  const age = overrides.age != null ? overrides.age : RI(18, 32);
  const baseLevel = overrides.level != null ? overrides.level : R(0.25, 0.85);
  // Younger fighters tend to have lower current level but higher potential
  const ageAdjust = age <= 22 ? -0.05 : age >= 30 ? 0.05 : 0;
  return {
    id: uid(),
    name: overrides.name || generateAIName(),
    archetype: overrides.archetype || pick(ARCHETYPES),
    points: overrides.points != null ? overrides.points : Math.round(R(3, 35)),
    level: clamp(baseLevel + ageAdjust, SKILL_MIN, SKILL_MAX),
    record: overrides.record || { w: RI(0, 8), l: RI(0, 6), ko: 0, sub: 0, dec: 0 },
    age,
  };
}

/** Create a veteran AI fighter (former champ, higher stats) */
export function createVeteranFighter(overrides = {}) {
  return {
    id: uid(),
    name: overrides.name || generateAIName(),
    archetype: overrides.archetype || pick(ARCHETYPES),
    points: overrides.points != null ? overrides.points : RI(10, 40),
    level: overrides.level != null ? clamp(overrides.level, SKILL_MIN, SKILL_MAX) : R(0.6, 1.0),
    record: overrides.record || { w: RI(8, 18), l: RI(1, 5), ko: 0, sub: 0, dec: 0 },
    age: overrides.age != null ? overrides.age : RI(30, 37),
  };
}
