// Striking resolution — strike and power exchanges
import { R, clamp } from "../rng.js";
import * as CFG from "./config.js";
import { effAttr } from "../fight.js";
import { warriorBonus } from "./trait-effects.js";

export function resolveStriking(exType, A, B, stA, stB, cornerA, agg, phase, momMult, pow, matchup, explosiveMult, ptsA, ptsB, legDmgA, legDmgB, comm, exMin, exSec) {
  const strikeModA = (matchup.aStrike || 0);
  const defA = effAttr(B, "footwork", stB, {}) * clamp(1 - (legDmgA || 0) * CFG.LEG_DMG_DEF_MULT, CFG.DEF_MIN_CLAMP, 1);
  const defB = effAttr(A, "footwork", stA, {}) * clamp(1 - (legDmgB || 0) * CFG.LEG_DMG_DEF_MULT, CFG.DEF_MIN_CLAMP, 1);
  const outA = effAttr(A, "striking", stA, {}) * agg * phase * momMult * pow * (1 + strikeModA) * explosiveMult;
  const outB = effAttr(B, "striking", stB, {}) * phase * pow * (1 + (matchup.bStrike || 0));
  const la = Math.round(R(CFG.STRIKE_LAND_MIN_A, CFG.STRIKE_LAND_MAX_A) * (outA / (defA + CFG.STRIKING_DEF_DIVISOR)));
  const lb = Math.round(R(CFG.STRIKE_LAND_MIN_B, CFG.STRIKE_LAND_MAX_B) * (outB / (defB + CFG.STRIKING_DEF_DIVISOR)));
  const warriorBonusVal = warriorBonus(A, ptsA, ptsB);
  const hitB = la * (effAttr(A, "strength", stA) / CFG.STR_MULT) * R(CFG.HIT_VAR_MIN, CFG.HIT_VAR_MAX) * warriorBonusVal;
  const hitA = lb * (effAttr(B, "strength", stB) / CFG.STR_MULT) * R(CFG.HIT_VAR_MIN, CFG.HIT_VAR_MAX);

  return {
    dmgA: hitA, dmgB: hitB,
    bodyDmgA: hitA * 0.3,
    bodyDmgB: hitB * (cornerA === "body" ? CFG.CORNER_BODY_MULT : 0.3),
    legDmgA: hitA * 0.15,
    legDmgB: hitB * (cornerA === "body" ? 0.5 : 0.15),
    landA: la, landB: lb,
    ptsA: la + Math.round(hitB * 0.6),
    ptsB: lb + Math.round(hitA * 0.6),
    momDelta: (la - lb) * CFG.MOMENTUM_STRIKE_MULT,
  };
}
