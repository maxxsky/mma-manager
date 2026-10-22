// Striking resolution — strike and power exchanges
import { R, clamp } from "../rng.js";
import * as CFG from "./config.js";
import { effAttr } from "../fight.js";
import { warriorBonus } from "./trait-effects.js";

// side: { cornerA, cornerB, aggA, aggB, exposedA, exposedB, momMultA, momMultB, expMultA, expMultB }
// — corner, momentum and Explosive effects for each fighter, applied the same
// way to both. aggX is X's output; exposedX scales the strikes landed on X.
export function resolveStriking(exType, A, B, stA, stB, side, phase, pow, matchup, ptsA, ptsB, legDmgA, legDmgB, comm, exMin, exSec) {
  const { cornerA, cornerB, aggA, aggB, momMultA, momMultB } = side;
  const expMultA = side.expMultA ?? 1, expMultB = side.expMultB ?? 1;
  const exposedA = side.exposedA ?? 1, exposedB = side.exposedB ?? 1;
  const defA = effAttr(B, "footwork", stB, {}) * clamp(1 - (legDmgA || 0) * CFG.LEG_DMG_DEF_MULT, CFG.DEF_MIN_CLAMP, 1);
  const defB = effAttr(A, "footwork", stA, {}) * clamp(1 - (legDmgB || 0) * CFG.LEG_DMG_DEF_MULT, CFG.DEF_MIN_CLAMP, 1);
  const outA = effAttr(A, "striking", stA, {}) * aggA * phase * momMultA * pow * (1 + (matchup.aStrike || 0)) * expMultA;
  const outB = effAttr(B, "striking", stB, {}) * aggB * phase * momMultB * pow * (1 + (matchup.bStrike || 0)) * expMultB;
  const la = Math.round(R(CFG.STRIKE_LAND_MIN, CFG.STRIKE_LAND_MAX) * (outA / (defA + CFG.STRIKING_DEF_DIVISOR)) * exposedB);
  const lb = Math.round(R(CFG.STRIKE_LAND_MIN, CFG.STRIKE_LAND_MAX) * (outB / (defB + CFG.STRIKING_DEF_DIVISOR)) * exposedA);
  const hitB = la * (effAttr(A, "strength", stA) / CFG.STR_MULT) * R(CFG.HIT_VAR_MIN, CFG.HIT_VAR_MAX) * warriorBonus(A, ptsA, ptsB);
  const hitA = lb * (effAttr(B, "strength", stB) / CFG.STR_MULT) * R(CFG.HIT_VAR_MIN, CFG.HIT_VAR_MAX) * warriorBonus(B, ptsB, ptsA);

  return {
    dmgA: hitA, dmgB: hitB,
    bodyDmgA: hitA * (cornerB === "body" ? CFG.CORNER_BODY_SHARE : 0.3),
    bodyDmgB: hitB * (cornerA === "body" ? CFG.CORNER_BODY_SHARE : 0.3),
    legDmgA: hitA * (cornerB === "body" ? CFG.CORNER_BODY_LEG_SHARE : 0.15),
    legDmgB: hitB * (cornerA === "body" ? CFG.CORNER_BODY_LEG_SHARE : 0.15),
    landA: la, landB: lb,
    ptsA: la + Math.round(hitB * 0.6),
    ptsB: lb + Math.round(hitA * 0.6),
    momDelta: (la - lb) * CFG.MOMENTUM_STRIKE_MULT,
  };
}
