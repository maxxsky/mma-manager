// Clinch resolution — clinch exchanges with Muay Thai bonuses
import { R, clamp, random } from "../rng.js";
import * as CFG from "./config.js";
import { effAttr } from "../fight.js";
import { muayThaiMult, muayThaiDmg } from "./trait-effects.js";
import { CLINCH_TEMPLATES } from "./commentary.js";

export function resolveClinch(exType, A, B, stA, stB, agg, matchup, comm, exMin, exSec) {
  const isThaiA = muayThaiMult(A) > 1;
  const isThaiB = muayThaiMult(B) > 1;
  const clinchModA = (matchup.aClinch || 0);
  const outA = effAttr(A, "striking", stA, {}) * agg * muayThaiMult(A) * (1 + clinchModA);
  const outB = effAttr(B, "striking", stB, {}) * muayThaiMult(B) * (1 + (matchup.bClinch || 0));
  const la = Math.round(outA * R(CFG.CLINCH_STRIKE_MIN, CFG.CLINCH_STRIKE_MAX));
  const lb = Math.round(outB * R(CFG.CLINCH_STRIKE_MIN, CFG.CLINCH_STRIKE_MAX));
  const dmgB = la * muayThaiDmg(A);
  const dmgA = lb * muayThaiDmg(B);

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
    bodyDmgA: lb * 0.5, bodyDmgB: la * 0.5,
    legDmgA: 0, legDmgB: 0,
    landA: la, landB: lb,
    ptsA: Math.round(la * 1.2), ptsB: Math.round(lb * 1.2),
    momDelta,
    newPosition,
  };
}
