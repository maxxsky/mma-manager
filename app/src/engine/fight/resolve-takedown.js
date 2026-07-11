// Takedown resolution — td (A shoots) and tdB (B shoots)
import { R, clamp, random } from "../rng.js";
import * as CFG from "./config.js";
import { effAttr } from "../fight.js";
import { canGuillotine, cautiousMult } from "./trait-effects.js";

export function resolveTakedown(exType, A, B, stA, stB, planA, cornerA, matchup, comm, exMin, exSec) {
  if (exType === "td") {
    return resolveTakedownByA(A, B, stA, stB, planA, cornerA, matchup, comm, exMin, exSec);
  } else {
    return resolveTakedownByB(A, B, stA, stB, cornerA, matchup, comm, exMin, exSec);
  }
}

function resolveTakedownByA(A, B, stA, stB, planA, cornerA, matchup, comm, exMin, exSec) {
  const tdBonus = (matchup.aTD || 0) + (planA === "Take It Down" ? 0.18 : 0) + (cornerA === "tdd" ? -0.10 : 0);
  const tdDefBonus = -(matchup.bTDDef || 0);
  const p = clamp(CFG.TD_BASE_CHANCE + (effAttr(A, "wrestling", stA, {}) - effAttr(B, "wrestling", stB, {})) / CFG.TD_SKILL_DIVISOR + tdBonus + tdDefBonus, CFG.TD_MIN_CHANCE, CFG.TD_MAX_CHANCE);

  if (random() < p) {
    comm.both(exMin, exSec + 10, `${A.name} shoots — takedown! Lands in half guard.`);
    const result = {
      dmgA: 0, dmgB: R(CFG.TD_DMG_MIN, CFG.TD_DMG_MAX),
      bodyDmgA: 0, bodyDmgB: 0, legDmgA: 0, legDmgB: 0,
      landA: 0, landB: 0,
      ptsA: 12, ptsB: 0,
      momDelta: 12,
      newPosition: { type: "halfGuard", top: "A" },
      finish: null,
    };
    return result;
  } else {
    comm.both(exMin, exSec + 12, `${A.name} shoots — stuffed by ${B.name}!`);
    const result = {
      dmgA: 0, dmgB: 0, bodyDmgA: 0, bodyDmgB: 0, legDmgA: 0, legDmgB: 0,
      landA: 0, landB: 0,
      ptsA: 0, ptsB: 4,
      momDelta: -8,
      newPosition: null,
      finish: null,
    };
    if (canGuillotine(B) && random() < CFG.GUILLOTINE_CHANCE) {
      result.finish = { by: "B", how: "Submission" };
      comm.both(exMin + 1, 0, `GUILLOTINE! ${B.name} catches the neck on the way in! IT'S OVER!`);
    }
    return result;
  }
}

function resolveTakedownByB(A, B, stA, stB, cornerA, matchup, comm, exMin, exSec) {
  const bTDBonus = (matchup.bTD || 0);
  const aTDDefBonus = (matchup.aTDDef || 0) + (cornerA === "tdd" ? 0.10 : 0);
  const pB = clamp(CFG.TD_BASE_CHANCE + (effAttr(B, "wrestling", stB, {}) - effAttr(A, "wrestling", stA, {})) / CFG.TD_SKILL_DIVISOR + bTDBonus - aTDDefBonus, CFG.TD_MIN_CHANCE, CFG.TD_MAX_CHANCE);

  if (random() < pB) {
    comm.both(exMin, exSec + 10, `${B.name} shoots — takedown! Lands in half guard.`);
    return {
      dmgA: R(CFG.TD_DMG_MIN, CFG.TD_DMG_MAX), dmgB: 0,
      bodyDmgA: 0, bodyDmgB: 0, legDmgA: 0, legDmgB: 0,
      landA: 0, landB: 0,
      ptsA: 0, ptsB: 12,
      momDelta: -12,
      newPosition: { type: "halfGuard", top: "B" },
      finish: null,
    };
  } else {
    comm.both(exMin, exSec + 12, `${B.name} shoots — stuffed by ${A.name}!`);
    const result = {
      dmgA: 0, dmgB: 0, bodyDmgA: 0, bodyDmgB: 0, legDmgA: 0, legDmgB: 0,
      landA: 0, landB: 0,
      ptsA: 4, ptsB: 0,
      momDelta: 8,
      newPosition: null,
      finish: null,
    };
    if (canGuillotine(A) && random() < CFG.GUILLOTINE_CHANCE) {
      result.finish = { by: "A", how: "Submission" };
      comm.both(exMin + 1, 0, `GUILLOTINE! ${A.name} catches the neck on the way in! IT'S OVER!`);
    }
    return result;
  }
}
