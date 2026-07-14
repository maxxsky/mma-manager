// Trait effects — centralized modifier functions for fighter traits.
// All trait checks previously scattered throughout fight.js are consolidated here.

// ── Attribute modifier traits (used in effAttr) ──

/** Chin bonus/penalty from Iron Chin / Glass Jaw */
export function chinModifier(f, base) {
  let v = base;
  if (f.traits?.includes("Iron Chin")) v += 8;
  if (f.traits?.includes("Glass Jaw")) v -= 10;
  return v;
}

/** Footwork penalty from Showboat */
export function footworkModifier(f, base) {
  if (f.traits?.includes("Showboat")) return base * 0.95;
  return base;
}

// ── Phase-level traits (used in simRound exchange loop) ──

/** Explosive: stronger early, weaker late */
export function explosiveMult(f, rnd) {
  if (!f.traits?.includes("Explosive")) return 1;
  if (rnd === 1) return 1.15;
  if (rnd >= 3) return 0.85;
  return 1;
}

/** Cautious: reduced finish rate */
export function cautiousMult(f) {
  return f.traits?.includes("Cautious") ? 0.85 : 1;
}

// ── Exchange-specific traits ──

/** Warrior: bonus damage while losing on points */
export function warriorBonus(f, ownPts, oppPts) {
  return f.traits?.includes("Warrior") && ownPts < oppPts ? 1.15 : 1;
}

/** Muay Thai: clinch damage bonus (1.4x) */
export function muayThaiMult(f) {
  return f.archetype === "Muay Thai" ? 1.30 : 1;
}

/** Muay Thai: clinch damage scaling */
export function muayThaiDmg(f) {
  return f.archetype === "Muay Thai" ? 1.1 : 1;
}

// ── Ground / submission traits ──

/** BJJ Specialist: can submit from takedown defense */
export function canGuillotine(f) {
  return f.archetype === "BJJ Specialist";
}

/** BJJ Specialist: can submit from bottom guard */
export function canGuardSubmit(defender, attacker) {
  return defender.archetype === "BJJ Specialist" && attacker.archetype !== "BJJ Specialist";
}
