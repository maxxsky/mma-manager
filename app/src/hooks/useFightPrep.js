// Fight prep hook — fighter preparation, weight cut, attitude modifiers, staff bonuses
import { useMemo } from "react";
import { clamp, random, mulberry32 } from "@ironfist/engine/rng.js";
import { prepFighter } from "@ironfist/engine/fight.js";
import { weightCutInfo } from "@ironfist/engine/fight/weight-cut.js";

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

  const cutInfo = weightCutInfo(fighter, nutriSkill);
  const oppCutInfo = weightCutInfo(opp);
  const { cutPct, limit, missWeightChance } = cutInfo;
  const seed = fighter.booked?.seed;
  // A separate seeded roll survives remounts without consuming fight RNG.
  const missedWeight = useMemo(() => {
    const roll = Number.isFinite(seed) ? mulberry32(seed ^ 0x57454947)() : random();
    return roll < missWeightChance;
  }, [fighter.id, seed, missWeightChance]);

  return { A, B, attMod, cutInfo, oppCutInfo, cutPct, missedWeight, limit };
}
