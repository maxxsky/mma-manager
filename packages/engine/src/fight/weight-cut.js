import { WEIGHTS } from "../data/weights.js";
import { clamp } from "../rng.js";

// Shared by the weigh-in and both simulation entry points. Missing weight in
// old saves/fixtures means no cut; the division limit still has a safe fallback.
export function weightCutInfo(fighter, nutritionistSkill = 0) {
  const limit = WEIGHTS.find((w) => w.name === fighter.weightClass)?.limit ?? 155;
  const weight = fighter.natWeight;
  const cutPct = Number.isFinite(weight) && weight > 0 ? Math.max(0, (weight - limit) / weight) : 0;
  const skill = Number.isFinite(nutritionistSkill) ? clamp(nutritionistSkill, 0, 10) : 0;
  const penRaw = cutPct > 0.07 ? 10 : cutPct > 0.03 ? 5 : 0;
  const pen = Math.max(0, penRaw - skill * 0.4);
  const missBase = cutPct > 0.08 ? 0.20 : cutPct > 0.05 ? 0.08 : 0.02;
  return {
    limit, cutPct, pen, staminaCap: 100 - pen,
    label: cutPct > 0.07 ? "Big cut" : cutPct > 0.03 ? "Moderate cut" : "On weight",
    missWeightChance: missBase * (1 - Math.min(skill * 0.05, 0.45)),
  };
}
