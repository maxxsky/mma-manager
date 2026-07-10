// Ground resolution — gnp, submission, sweep, position advance, scramble
import { R, RI, clamp, random } from "../rng.js";
import * as CFG from "./config.js";
import { effAttr } from "../fight.js";
import { canGuardSubmit } from "./trait-effects.js";
import { GROUND, GROUND_ORDER } from "./ground.js";
import { SCRAMBLE_UP_TEMPLATES, SCRAMBLE_STALL_TEMPLATES } from "./commentary.js";

export function resolveGround(exType, A, B, stA, stB, position, matchup, subProgress, bjjGuardProgress, SUB_THRESHOLD, comm, exMin, exSec) {
  const isTopA = position?.top === "A";
  const gType = position?.type || "guard";

  switch (exType) {
    case "gnp":
      return resolveGNP(A, B, isTopA, gType, matchup, position, comm, exMin, exSec);
    case "sub":
      return resolveSubmission(A, B, stA, stB, isTopA, gType, subProgress, SUB_THRESHOLD, matchup, bjjGuardProgress, comm, exMin, exSec);
    case "sweep":
      return resolveSweep(A, B, isTopA, position, matchup, comm, exMin, exSec);
    case "advance":
      return resolveAdvance(A, B, isTopA, gType, position, comm, exMin, exSec);
    case "scramble":
      return resolveScramble(comm, exMin, exSec);
  }
}

function resolveGNP(A, B, isTopA, gType, matchup, position, comm, exMin, exSec) {
  const g = GROUND[gType] || GROUND.guard;
  const gnpMult = g.topGNP + (matchup.aGNP || 0) + (matchup.bGNP || 0);
  const dmg = R(CFG.GNP_DMG_MIN, CFG.GNP_DMG_MAX) * gnpMult;
  const attacker = isTopA ? A : B;
  const result = {
    dmgA: isTopA ? 0 : dmg, dmgB: isTopA ? dmg : 0,
    bodyDmgA: isTopA ? 0 : dmg * 0.5, bodyDmgB: isTopA ? dmg * 0.5 : 0,
    legDmgA: 0, legDmgB: 0,
    landA: 0, landB: 0,
    ptsA: isTopA ? Math.round(dmg * 0.8) : 0, ptsB: isTopA ? 0 : Math.round(dmg * 0.8),
    momDelta: isTopA ? 4 : -4,
    newPosition: position,
    finish: null,
    subProgress: null,
    bjjGuardProgress: null,
  };
  comm.both(exMin, exSec, `${attacker.name} landing ground and pound from ${g.label}.`);
  if (random() < CFG.GNP_SCRAMBLE_CHANCE) {
    result.newPosition = { type: "standing", top: null };
    comm.tickOnly(exMin, exSec + 8, `Scramble! Both fighters back to their feet!`);
  }
  return result;
}

function resolveSubmission(A, B, stA, stB, isTopA, gType, _subProgress, SUB_THRESHOLD, matchup, _bjjGuardProgress, comm, exMin, exSec) {
  const attacker = isTopA ? A : B;
  const defender = isTopA ? B : A;
  const attackerSta = attacker === A ? stA : stB;
  const defenderSta = defender === A ? stA : stB;
  let subProgress = _subProgress;
  let bjjGuardProgress = _bjjGuardProgress;

  // Strikers can't sub easily
  if (attacker.archetype === "Boxer" || attacker.archetype === "Muay Thai") {
    if (effAttr(attacker, "bjj", attackerSta, {}) < CFG.STRIKER_SUB_BJJ_MIN || random() > CFG.STRIKER_SUB_CHANCE) {
      comm.tickOnly(exMin, exSec, `${attacker.name} lacks submission skills — position stalled.`);
      return { dmgA: 0, dmgB: 0, bodyDmgA: 0, bodyDmgB: 0, legDmgA: 0, legDmgB: 0, landA: 0, landB: 0, ptsA: 0, ptsB: 0, momDelta: 0, newPosition: null, finish: null, subProgress, bjjGuardProgress };
    }
  } else if (effAttr(attacker, "bjj", attackerSta, {}) < CFG.MIN_BJJ_FOR_SUB) {
    comm.tickOnly(exMin, exSec, `${attacker.name} lacks submission skills — position stalled.`);
    return { dmgA: 0, dmgB: 0, bodyDmgA: 0, bodyDmgB: 0, legDmgA: 0, legDmgB: 0, landA: 0, landB: 0, ptsA: 0, ptsB: 0, momDelta: 0, newPosition: null, finish: null, subProgress, bjjGuardProgress };
  }

  const posBonus = gType === "backMount" ? CFG.BACK_MOUNT_BONUS : gType === "mount" ? CFG.MOUNT_BONUS : gType === "sideControl" ? CFG.SIDE_CONTROL_BONUS : CFG.GUARD_BONUS;
  const subMod = (matchup.aSub || 0) + (matchup.bSub || 0);
  const adv = clamp(
    (effAttr(attacker, "bjj", attackerSta, {}) * 0.8 + effAttr(attacker, "strength", attackerSta, {}) * 0.2 + posBonus + subMod * CFG.SUB_MOD_SCALE)
    - (effAttr(defender, "bjj", defenderSta, {}) * 0.5 + effAttr(defender, "fightIQ", defenderSta, {}) * 0.25),
    CFG.SUB_ADV_MIN, CFG.SUB_ADV_MAX
  );
  subProgress += adv;

  let finish = null;
  if (subProgress >= SUB_THRESHOLD) {
    finish = { by: attacker === A ? "A" : "B", how: "Submission" };
    comm.both(exMin, exSec + 5, `SUBMISSION! ${attacker.name} sinks it in! IT'S OVER!`);
    comm.tickOnly(exMin, exSec + 10, `${defender.name} has no choice but to tap!`);
  } else {
    comm.tickOnly(exMin, exSec + 5, `${attacker.name} hunting for a submission — ${defender.name} defends. ${subProgress > 60 ? "It's getting tight!" : subProgress > 30 ? "Good attempt." : ""}`);
  }

  const result = {
    dmgA: 0, dmgB: 0, bodyDmgA: 0, bodyDmgB: 0, legDmgA: 0, legDmgB: 0,
    landA: 0, landB: 0,
    ptsA: !finish && attacker === A ? 5 : 0, ptsB: !finish && attacker === B ? 5 : 0,
    momDelta: !finish ? (attacker === A ? 2 : -2) : 0,
    newPosition: null, finish,
    subProgress, bjjGuardProgress,
  };

  if (!finish) {
    if (random() < CFG.SUB_DEFENSE_EASE_CHANCE) {
      result.subProgress = clamp(subProgress - RI(CFG.SUB_EASE_MIN, CFG.SUB_EASE_MAX), 0, SUB_THRESHOLD);
      comm.tickOnly(exMin, exSec + 10, `${defender.name} creates space — submission pressure eases.`);
    }
    // BJJ guard specialist
    if (canGuardSubmit(defender, attacker) && (gType === "guard" || gType === "halfGuard") && random() < CFG.BJJ_GUARD_CHANCE) {
      const bjjAdv = clamp(
        (effAttr(defender, "bjj", defenderSta, {}) * 0.6 + effAttr(defender, "fightIQ", defenderSta, {}) * 0.15 + 3)
        - (effAttr(attacker, "bjj", attackerSta, {}) * 0.3 + effAttr(attacker, "strength", attackerSta, {}) * 0.2),
        CFG.BJJ_GUARD_ADV_MIN, CFG.BJJ_GUARD_ADV_MAX
      );
      result.bjjGuardProgress = bjjGuardProgress + bjjAdv;
      if (result.bjjGuardProgress >= CFG.BJJ_GUARD_THRESHOLD) {
        result.finish = { by: defender === A ? "A" : "B", how: "Submission" };
        comm.both(exMin + 1, 0, `SUBMISSION! ${defender.name} locks it from the bottom! IT'S OVER!`);
      } else if (bjjAdv > 8) {
        comm.tickOnly(exMin, exSec + 8, `${defender.name} threatens a submission from guard!`);
      }
    }
  }

  return result;
}

function resolveSweep(A, B, isTopA, position, matchup, comm, exMin, exSec) {
  const sweeper = isTopA ? B : A;
  const sweepMod = (matchup.aSweep || 0) + (matchup.bSweep || 0);
  if (random() < CFG.SWEEP_BASE_CHANCE + sweepMod) {
    comm.both(exMin, exSec + 5, `${sweeper.name} sweeps! Position reversed!`);
    return {
      dmgA: 0, dmgB: 0, bodyDmgA: 0, bodyDmgB: 0, legDmgA: 0, legDmgB: 0,
      landA: 0, landB: 0, ptsA: 0, ptsB: 0,
      momDelta: isTopA ? -10 : 10,
      newPosition: { type: "guard", top: isTopA ? "B" : "A" },
      finish: null, subProgress: null, bjjGuardProgress: null,
    };
  } else {
    comm.tickOnly(exMin, exSec + 5, `${sweeper.name} tries to sweep — ${isTopA ? A.name : B.name} stays heavy.`);
    return {
      dmgA: 0, dmgB: 0, bodyDmgA: 0, bodyDmgB: 0, legDmgA: 0, legDmgB: 0,
      landA: 0, landB: 0, ptsA: 0, ptsB: 0, momDelta: 0,
      newPosition: null, finish: null, subProgress: null, bjjGuardProgress: null,
    };
  }
}

function resolveAdvance(A, B, isTopA, gType, position, comm, exMin, exSec) {
  const idx = GROUND_ORDER.indexOf(gType);
  const g = GROUND[gType] || GROUND.guard;
  if (idx >= 0 && idx < GROUND_ORDER.length - 1 && random() < g.advanceChance) {
    const next = GROUND_ORDER[idx + 1];
    comm.both(exMin, exSec + 5, `${position.top === "A" ? A.name : B.name} advances to ${GROUND[next].label}!`);
    return {
      dmgA: 0, dmgB: 0, bodyDmgA: 0, bodyDmgB: 0, legDmgA: 0, legDmgB: 0,
      landA: 0, landB: 0, ptsA: 0, ptsB: 0,
      momDelta: position.top === "A" ? 6 : -6,
      newPosition: { ...position, type: next },
      finish: null, subProgress: null, bjjGuardProgress: null,
    };
  } else {
    comm.tickOnly(exMin, exSec + 5, `${gType === "backMount" ? "Nowhere to go — " : ""}${position.top === "A" ? B.name : A.name} defends the position.`);
    return {
      dmgA: 0, dmgB: 0, bodyDmgA: 0, bodyDmgB: 0, legDmgA: 0, legDmgB: 0,
      landA: 0, landB: 0, ptsA: 0, ptsB: 0, momDelta: 0,
      newPosition: null, finish: null, subProgress: null, bjjGuardProgress: null,
    };
  }
}

function resolveScramble(comm, exMin, exSec) {
  if (random() < CFG.SCRAMBLE_UP_CHANCE) {
    comm.bothS(exMin, exSec, SCRAMBLE_UP_TEMPLATES);
    return {
      dmgA: 0, dmgB: 0, bodyDmgA: 0, bodyDmgB: 0, legDmgA: 0, legDmgB: 0,
      landA: 0, landB: 0, ptsA: 0, ptsB: 0,
      momDelta: Math.round(R(-2, 5)),
      newPosition: { type: "standing", top: null },
      finish: null, subProgress: null, bjjGuardProgress: null,
    };
  } else {
    comm.bothS(exMin, exSec, SCRAMBLE_STALL_TEMPLATES);
    return {
      dmgA: 0, dmgB: 0, bodyDmgA: 0, bodyDmgB: 0, legDmgA: 0, legDmgB: 0,
      landA: 0, landB: 0, ptsA: 0, ptsB: 0, momDelta: -2,
      newPosition: null, finish: null, subProgress: null, bjjGuardProgress: null,
    };
  }
}
