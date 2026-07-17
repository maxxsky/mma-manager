// Fight prep hook — fighter preparation, weight cut, attitude modifiers, staff bonuses
import { useMemo } from "react";
import { clamp, random } from "../engine/rng.js";
import { WEIGHTS } from "../engine/data.js";
import { prepFighter } from "../engine/fight.js";

export function useFightPrep(fighter, opp, attitude, staff) {
  const cutmanSkill = staff?.cutman?.skill || 0;
  const nutriSkill = staff?.nutritionist?.skill || 0;

  const { A, B, attMod } = useMemo(() => {
    const boostedChin = cutmanSkill ? clamp(fighter.attrs.chin + cutmanSkill * 0.4, 5, 99) : fighter.attrs.chin;
    const fa = prepFighter({ ...fighter, attrs: { ...fighter.attrs, chin: boostedChin } });
    const fo = prepFighter({ ...opp, attrs: { ...(opp.attrs || {}) } });
    const mod = { a: {}, b: {} };
    if (attitude === "Trash talk") { mod.a.striking = 1.08; mod.b.striking = 1.05; }
    else if (attitude === "Respectful") { mod.a.footwork = 1.05; }
    Object.entries(mod.a).forEach(([k, v]) => fa.attrs[k] = clamp(fa.attrs[k] * v, 5, 99));
    Object.entries(mod.b).forEach(([k, v]) => fo.attrs[k] = clamp(fo.attrs[k] * v, 5, 99));
    return { A: fa, B: fo, attMod: mod };
  }, [fighter, opp, attitude, cutmanSkill]);

  const wc = WEIGHTS.find((w) => w.name === fighter.weightClass);
  const limit = wc ? wc.limit : 155;
  const hasWeight = fighter.natWeight != null && !isNaN(fighter.natWeight);
  const cutPct = hasWeight ? (fighter.natWeight - limit) / fighter.natWeight : 0;
  const penRaw = cutPct > 0.07 ? 10 : cutPct > 0.03 ? 5 : 0;
  const cutInfo = {
    label: cutPct > 0.07 ? "Big cut" : cutPct > 0.03 ? "Moderate cut" : "On weight",
    pen: nutriSkill ? Math.max(0, penRaw - nutriSkill * 0.4) : penRaw,
  };
  const missWeightBase = cutPct > 0.08 ? 0.20 : cutPct > 0.05 ? 0.08 : 0.02;
  const missWeightChance = nutriSkill ? missWeightBase * (1 - Math.min(nutriSkill * 0.05, 0.45)) : missWeightBase;
  const missedWeight = useMemo(() => random() < missWeightChance, [fighter.id]);

  return { A, B, attMod, cutInfo, cutPct, missedWeight, limit };
}
