// Clinch resolution — clinch exchanges with Muay Thai bonuses
import { R, random } from "../rng.js";
import * as CFG from "./config.js";
import { effAttr } from "../fight.js";
import { muayThaiMult, muayThaiDmg } from "./trait-effects.js";
import { CLINCH_TEMPLATES } from "./commentary.js";

// side: { aggA, aggB, exposedA, exposedB } — corner output for each fighter,
// and how open each fighter is to the other's strikes.
export function resolveClinch(exType, A, B, stA, stB, side, matchup, comm, exMin, exSec) {
  const isThaiA = muayThaiMult(A) > 1;
  const isThaiB = muayThaiMult(B) > 1;
  const outA = effAttr(A, "striking", stA, {}) * side.aggA * muayThaiMult(A) * (1 + (matchup.aClinch || 0));
  const outB = effAttr(B, "striking", stB, {}) * side.aggB * muayThaiMult(B) * (1 + (matchup.bClinch || 0));
  // Pummelling and strength limit clean clinch hits, just as footwork limits
  // open striking. Raw striking used to land 20-40 hits in one exchange.
  const defA = (effAttr(A, "wrestling", stA) + effAttr(A, "strength", stA)) / 2;
  const defB = (effAttr(B, "wrestling", stB) + effAttr(B, "strength", stB)) / 2;
  const la = Math.round(outA / (defB + CFG.CLINCH_DEF_DIVISOR) * R(CFG.CLINCH_STRIKE_MIN, CFG.CLINCH_STRIKE_MAX) * (side.exposedB ?? 1));
  const lb = Math.round(outB / (defA + CFG.CLINCH_DEF_DIVISOR) * R(CFG.CLINCH_STRIKE_MIN, CFG.CLINCH_STRIKE_MAX) * (side.exposedA ?? 1));
  const dmgB = la * muayThaiDmg(A) * effAttr(A, "strength", stA) / CFG.STR_MULT;
  const dmgA = lb * muayThaiDmg(B) * effAttr(B, "strength", stB) / CFG.STR_MULT;

  if (la + lb > 0) {
    const descA = isThaiA ? "knees & elbows" : "dirty boxing";
    const descB = isThaiB ? "knees & elbows" : "dirty boxing";
    comm.bothS(exMin, exSec, CLINCH_TEMPLATES, A.name, descA, B.name, descB);
  }

  let momDelta = 0;
  if (la > lb + CFG.MOMENTUM_CLINCH_THRESHOLD) momDelta += CFG.MOMENTUM_CLINCH_BONUS;
  else if (lb > la + CFG.MOMENTUM_CLINCH_THRESHOLD) momDelta -= CFG.MOMENTUM_CLINCH_BONUS;

  // Clinch → takedown transition
  let newPosition = null;
  if (random() < 0.5) {
    if (random() < CFG.CLINCH_TD_CHANCE && B.attrs.wrestling > CFG.CLINCH_TD_WRESTLING) {
      newPosition = { type: "halfGuard", top: "B" };
      comm.tickOnly(exMin, exSec + 8, `${B.name} trips ${A.name} from the clinch — half guard!`);
      momDelta -= 5;
    } else if (random() < CFG.CLINCH_TD_CHANCE && A.attrs.wrestling > CFG.CLINCH_TD_WRESTLING) {
      newPosition = { type: "halfGuard", top: "A" };
      comm.tickOnly(exMin, exSec + 8, `${A.name} trips ${B.name} from the clinch — half guard!`);
      momDelta += 5;
    }
  } else {
    if (random() < CFG.CLINCH_TD_CHANCE && A.attrs.wrestling > CFG.CLINCH_TD_WRESTLING) {
      newPosition = { type: "halfGuard", top: "A" };
      comm.tickOnly(exMin, exSec + 8, `${A.name} trips ${B.name} from the clinch — half guard!`);
      momDelta += 5;
    } else if (random() < CFG.CLINCH_TD_CHANCE && B.attrs.wrestling > CFG.CLINCH_TD_WRESTLING) {
      newPosition = { type: "halfGuard", top: "B" };
      comm.tickOnly(exMin, exSec + 8, `${B.name} trips ${A.name} from the clinch — half guard!`);
      momDelta -= 5;
    }
  }

  return {
    dmgA, dmgB,
    bodyDmgA: dmgA * 0.5, bodyDmgB: dmgB * 0.5,
    legDmgA: 0, legDmgB: 0,
    landA: la, landB: lb,
    ptsA: Math.round(la * 1.2), ptsB: Math.round(lb * 1.2),
    momDelta,
    newPosition,
  };
}
