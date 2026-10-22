// Fight injury chance — outcome, damage taken, medical facility, traits.
// Pure: no RNG, so the UI and tests can read the same number commitResult uses.
import { clamp } from "../rng.js";
import {
  FIGHT_INJURY_CHANCE, FIGHT_INJURY_DMG_REF, FIGHT_INJURY_DMG_MULT_MIN, FIGHT_INJURY_DMG_MULT_MAX,
} from "../data.js";

// Engine finish names → injury table keys.
export function fightInjuryHowKey(how) {
  return how === "Doctor Stoppage" ? "Doctor" : how === "KO/TKO" ? "KO" : how;
}

// Same medical discount training injuries use: level 1 = no reduction, -5% per level above.
export function medicalInjuryMult(g) {
  return 1 - ((g.facilities?.medical || 1) - 1) * 0.05;
}

export function fightInjuryChance(g, f, result) {
  const key = (result.won ? "winner_" : "loser_") + fightInjuryHowKey(result.how);
  const base = FIGHT_INJURY_CHANCE[key];
  if (base == null) return { key, chance: 0 };
  const dmg = result.totalDmgA;
  const dmgMult = typeof dmg === "number" && isFinite(dmg)
    ? clamp(0.5 + 0.5 * dmg / FIGHT_INJURY_DMG_REF[key], FIGHT_INJURY_DMG_MULT_MIN, FIGHT_INJURY_DMG_MULT_MAX)
    : 1; // results without damage (legacy, doctor stoppage from the UI) use the base rate
  let traitMult = 1;
  if (f.traits?.includes("Cautious")) traitMult *= 0.85;
  if (f.traits?.includes("Injury Prone")) traitMult *= 2.0;
  return { key, chance: clamp(base * dmgMult * medicalInjuryMult(g) * traitMult, 0, 0.95), dmgMult };
}
