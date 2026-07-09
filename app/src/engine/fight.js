// ============================================================
//   FIGHT ENGINE — Orchestration Layer
//   Imports config, matchup, ground, exchanges, commentary
//   from split modules. Core simulation logic remains inline
//   to preserve exact behavior and avoid coupling issues.
// ============================================================

import { R, RI, clamp, random, pick } from "./rng.js";
import { ATTRS } from "./data.js";
import * as CFG from "./fight/config.js";
import { matchupMods } from "./fight/matchup.js";
import { GROUND, GROUND_ORDER } from "./fight/ground.js";
import { pickExchange } from "./fight/exchanges.js";
import { createCommentary, STRIKE_TEMPLATES, POWER_TEMPLATES, CLINCH_TEMPLATES, SCRAMBLE_UP_TEMPLATES, SCRAMBLE_STALL_TEMPLATES, traitCommentary } from "./fight/commentary.js";

// ── EFFECTIVE ATTRIBUTE ──
export function effAttr(f, k, sta, mods) {
  let v = f.attrs[k] * (CFG.STA_BASE_WEIGHT + CFG.STA_SCALE_WEIGHT * (sta / 100));
  if (k === "chin") {
    if (f.traits?.includes("Iron Chin")) v += 8;
    if (f.traits?.includes("Glass Jaw")) v -= 10;
  }
  // Trait: Showboat — flashy but defensively vulnerable
  if (k === "footwork" && f.traits?.includes("Showboat")) v *= 0.95;
  return v * (mods?.[k] || 1);
}

// ── AUTO GAME PLAN ──
export function autoGamePlan(fighter, opponent) {
  const f = fighter.attrs; const o = opponent.attrs;
  if (f.wrestling > o.wrestling + 15) return "Take It Down";
  if (f.striking > o.striking + 12) return "Keep It Standing";
  if (f.bjj > o.bjj + 12 && o.wrestling < 50) return "Finish It";
  if (f.cardio > o.cardio + 10) return "Survive & Outpoint";
  if (f.fightIQ > o.fightIQ + 10) return "Keep It Standing";
  return "Balanced";
}

// ── MAIN FIGHT ROUND ──
export function simRound(rnd, A, B, stA, stB, planA, cornerA, momentum = 0) {
  const comm = createCommentary();
  let dmgA = 0, dmgB = 0, bodyDmgA = 0, bodyDmgB = 0, legDmgA = 0, legDmgB = 0;
  let ptsA = 0, ptsB = 0, finish = null, knockdown = null;
  let landA = 0, landB = 0;
  let position = "standing";
  let mom = momentum || 0;
  const agg = cornerA === "go" ? CFG.CORNER_GO_MULT : cornerA === "save" ? CFG.CORNER_SAVE_MULT : 1;
  // Trait: Explosive — stronger early, weaker late
  const explosiveA = A.traits?.includes("Explosive");
  const explosiveMult = explosiveA ? (rnd === 1 ? 1.15 : rnd >= 3 ? 0.85 : 1) : 1;
  // Trait: Cautious — reduced finish rate
  const cautiousA = A.traits?.includes("Cautious");
  const cautiousMult = cautiousA ? 0.85 : 1;
  const matchup = matchupMods(A, B);

  let subProgress = 0;
  let bjjGuardProgress = 0;
  const SUB_THRESHOLD = (A.archetype === "BJJ Specialist" || B.archetype === "BJJ Specialist") ? CFG.SUB_THRESHOLD_BJJ : CFG.SUB_THRESHOLD_BASE;

  comm.both(0, 5, `Round ${rnd} — bell rings! ${A.name} vs ${B.name}!`);
  comm.tickOnly(0, 10, `${A.name} in the center of the cage.`);
  comm.tickOnly(0, 20, `${B.name} circling, looking for opening.`);

  const nEx = RI(CFG.EXCHANGES_PER_ROUND.min, CFG.EXCHANGES_PER_ROUND.max);
  for (let ex = 0; ex < nEx; ex++) {
    if (finish) break;
    const exMin = Math.floor(ex * 4.5 / nEx);
    const exSec = Math.floor((ex * 60 / nEx) % 60);
    
    const exType = pickExchange(position, A, B, planA);

    const momMult = clamp(1 + (mom > 0 ? mom * CFG.MOMENTUM_DIVISOR_POS : mom * CFG.MOMENTUM_DIVISOR_NEG), CFG.MOMENTUM_MULT_MIN, CFG.MOMENTUM_MULT_MAX);
    const phase = ex < CFG.EARLY_EXCHANGES ? CFG.PHASE_EARLY : ex >= nEx - 2 ? CFG.PHASE_LATE : CFG.PHASE_MID;

    // ── STRIKING ──
    if (exType === "strike" || exType === "power") {
      const pow = exType === "power" ? CFG.POWER_SHOT_MULT : 1;
      const strikeModA = (matchup.aStrike || 0);
      const defA = effAttr(B, "footwork", stB, {}) * clamp(1 - (legDmgA || 0) * CFG.LEG_DMG_DEF_MULT, CFG.DEF_MIN_CLAMP, 1);
      const defB = effAttr(A, "footwork", stA, {}) * clamp(1 - (legDmgB || 0) * CFG.LEG_DMG_DEF_MULT, CFG.DEF_MIN_CLAMP, 1);
      const outA = effAttr(A, "striking", stA, {}) * agg * phase * momMult * pow * (1 + strikeModA) * explosiveMult;
      // Trait: Warrior — bonus damage while losing
      const warriorBonus = A.traits?.includes("Warrior") && ptsA < ptsB ? 1.15 : 1;
      const outB = effAttr(B, "striking", stB, {}) * phase * pow * (1 + (matchup.bStrike || 0));
      const la = Math.round(R(CFG.STRIKE_LAND_MIN_A, CFG.STRIKE_LAND_MAX_A) * (outA / (defA + CFG.STRIKING_DEF_DIVISOR)));
      const lb = Math.round(R(CFG.STRIKE_LAND_MIN_B, CFG.STRIKE_LAND_MAX_B) * (outB / (defB + CFG.STRIKING_DEF_DIVISOR)));
      const hitB = la * (effAttr(A, "strength", stA) / CFG.STR_MULT) * R(CFG.HIT_VAR_MIN, CFG.HIT_VAR_MAX) * warriorBonus;
      const hitA = lb * (effAttr(B, "strength", stB) / CFG.STR_MULT) * R(CFG.HIT_VAR_MIN, CFG.HIT_VAR_MAX);
      dmgB += hitB; dmgA += hitA;
      bodyDmgB += hitB * (cornerA === "body" ? CFG.CORNER_BODY_MULT : 0.3);
      bodyDmgA += hitA * 0.3;
      legDmgB += hitB * (cornerA === "body" ? 0.5 : 0.15);
      legDmgA += hitA * 0.15;
      landA += la; landB += lb;
      ptsA += la + Math.round(hitB * 0.6);
      ptsB += lb + Math.round(hitA * 0.6);

      if (la + lb > 0) {
        comm.bothS(exMin, exSec, STRIKE_TEMPLATES, A.name, la, B.name, lb);
      }
      if (exType === "power" && la > lb + 3) {
        comm.tickS(exMin, exSec + 5, POWER_TEMPLATES, A.name, B.name);
      }
      mom += (la - lb) * CFG.MOMENTUM_STRIKE_MULT;

    // ── CLINCH ──
    } else if (exType === "clinch") {
      const isThaiA = A.archetype === "Muay Thai";
      const isThaiB = B.archetype === "Muay Thai";
      const clinchModA = (matchup.aClinch || 0);
      const dmgThaiA = isThaiA ? R(CFG.CLINCH_THAI_MIN, CFG.CLINCH_THAI_MAX) * (1 + clinchModA) : R(CFG.CLINCH_DMG_MIN, CFG.CLINCH_DMG_MAX);
      const dmgThaiB = isThaiB ? R(CFG.CLINCH_THAI_MIN, CFG.CLINCH_THAI_MAX) : R(CFG.CLINCH_DMG_MIN, CFG.CLINCH_DMG_MAX);
      const outA = effAttr(A, "striking", stA, {}) * agg * (isThaiA ? 1.4 : 1) * (1 + clinchModA);
      const outB = effAttr(B, "striking", stB, {}) * (isThaiB ? 1.4 : 1) * (1 + (matchup.bClinch || 0));
      const la = Math.round(outA * R(CFG.CLINCH_STRIKE_MIN, CFG.CLINCH_STRIKE_MAX));
      const lb = Math.round(outB * R(CFG.CLINCH_STRIKE_MIN, CFG.CLINCH_STRIKE_MAX));
      dmgB += la * (isThaiA ? 1.1 : 1); dmgA += lb * (isThaiB ? 1.1 : 1);
      bodyDmgB += la * 0.5; bodyDmgA += lb * 0.5;
      landA += la; landB += lb;
      ptsA += Math.round(la * 1.2); ptsB += Math.round(lb * 1.2);

      if (la + lb > 0) {
        const descA = isThaiA ? "knees & elbows" : "dirty boxing";
        const descB = isThaiB ? "knees & elbows" : "dirty boxing";
        comm.bothS(exMin, exSec, CLINCH_TEMPLATES, A.name, descA, B.name, descB);
      }
      if (la > lb + CFG.MOMENTUM_CLINCH_THRESHOLD) mom += CFG.MOMENTUM_CLINCH_BONUS;
      else if (lb > la + CFG.MOMENTUM_CLINCH_THRESHOLD) mom -= CFG.MOMENTUM_CLINCH_BONUS;

      if (random() < 0.5) {
        if (random() < CFG.CLINCH_TD_CHANCE && B.attrs.wrestling > CFG.CLINCH_TD_WRESTLING) {
          position = { type: "halfGuard", top: "B" };
          comm.tickOnly(exMin, exSec + 8, `${B.name} trips ${A.name} from the clinch — half guard!`);
          mom -= 5;
        } else if (random() < CFG.CLINCH_TD_CHANCE && A.attrs.wrestling > CFG.CLINCH_TD_WRESTLING) {
          position = { type: "halfGuard", top: "A" };
          comm.tickOnly(exMin, exSec + 8, `${A.name} trips ${B.name} from the clinch — half guard!`);
          mom += 5;
        }
      } else {
        if (random() < CFG.CLINCH_TD_CHANCE && A.attrs.wrestling > CFG.CLINCH_TD_WRESTLING) {
          position = { type: "halfGuard", top: "A" };
          comm.tickOnly(exMin, exSec + 8, `${A.name} trips ${B.name} from the clinch — half guard!`);
          mom += 5;
        } else if (random() < CFG.CLINCH_TD_CHANCE && B.attrs.wrestling > CFG.CLINCH_TD_WRESTLING) {
          position = { type: "halfGuard", top: "B" };
          comm.tickOnly(exMin, exSec + 8, `${B.name} trips ${A.name} from the clinch — half guard!`);
          mom -= 5;
        }
      }

    // ── TAKEDOWN BY A ──
    } else if (exType === "td") {
      const tdBonus = (matchup.aTD || 0) + (planA === "Take It Down" ? 0.18 : 0) + (cornerA === "tdd" ? -0.10 : 0);
      const tdDefBonus = (matchup.aTDDef || 0);
      const p = clamp(CFG.TD_BASE_CHANCE + (effAttr(A, "wrestling", stA, {}) - effAttr(B, "wrestling", stB, {})) / CFG.TD_SKILL_DIVISOR + tdBonus + tdDefBonus, CFG.TD_MIN_CHANCE, CFG.TD_MAX_CHANCE);
      if (random() < p) {
        ptsA += 12; dmgB += R(CFG.TD_DMG_MIN, CFG.TD_DMG_MAX);
        position = { type: "halfGuard", top: "A" };
        comm.both(exMin, exSec + 10, `${A.name} shoots — takedown! Lands in half guard.`);
        mom += 12;
      } else {
        ptsB += 4; mom -= 8;
        comm.both(exMin, exSec + 12, `${A.name} shoots — stuffed by ${B.name}!`);
        if (B.archetype === "BJJ Specialist" && random() < CFG.GUILLOTINE_CHANCE) {
          finish = { by: "B", how: "Submission" };
          comm.both(exMin + 1, 0, `GUILLOTINE! ${B.name} catches the neck on the way in! IT'S OVER!`);
        }
      }

    // ── TAKEDOWN BY B ──
    } else if (exType === "tdB") {
      const bTDBonus = (matchup.bTD || 0);
      const aTDDefBonus = (matchup.aTDDef || 0) + (cornerA === "tdd" ? 0.10 : 0);
      const pB = clamp(CFG.TD_BASE_CHANCE + (effAttr(B, "wrestling", stB, {}) - effAttr(A, "wrestling", stA, {})) / CFG.TD_SKILL_DIVISOR + bTDBonus - aTDDefBonus, CFG.TD_MIN_CHANCE, CFG.TD_MAX_CHANCE);
      if (random() < pB) {
        ptsB += 12; dmgA += R(CFG.TD_DMG_MIN, CFG.TD_DMG_MAX);
        position = { type: "halfGuard", top: "B" };
        comm.both(exMin, exSec + 10, `${B.name} shoots — takedown! Lands in half guard.`);
        mom -= 12;
      } else {
        ptsA += 4; mom += 8;
        comm.both(exMin, exSec + 12, `${B.name} shoots — stuffed by ${A.name}!`);
        if (A.archetype === "BJJ Specialist" && random() < CFG.GUILLOTINE_CHANCE) {
          finish = { by: "A", how: "Submission" };
          comm.both(exMin + 1, 0, `GUILLOTINE! ${A.name} catches the neck on the way in! IT'S OVER!`);
        }
      }

    // ── GROUND & POUND ──
    } else if (exType === "gnp") {
      const isTopA = position?.top === "A";
      const gType = position?.type || "guard";
      const g = GROUND[gType] || GROUND.guard;
      const gnpMult = g.topGNP + (matchup.aGNP || 0) + (matchup.bGNP || 0);
      const dmg = R(CFG.GNP_DMG_MIN, CFG.GNP_DMG_MAX) * gnpMult;
      const attacker = isTopA ? A : B;
      if (isTopA) { dmgB += dmg; ptsA += Math.round(dmg * 0.8); mom += 4; bodyDmgB += dmg * 0.5; }
      else         { dmgA += dmg; ptsB += Math.round(dmg * 0.8); mom -= 4; bodyDmgA += dmg * 0.5; }
      comm.both(exMin, exSec, `${attacker.name} landing ground and pound from ${g.label}.`);
      if (random() < CFG.GNP_SCRAMBLE_CHANCE) {
        position = "standing";
        comm.tickOnly(exMin, exSec + 8, `Scramble! Both fighters back to their feet!`);
      }

    // ── SUBMISSION ──
    } else if (exType === "sub") {
      const isTopA = position?.top === "A";
      const attacker = isTopA ? A : B;
      const defender = isTopA ? B : A;
      if (attacker.archetype === "Boxer" || attacker.archetype === "Muay Thai") {
        if (effAttr(attacker, "bjj", attacker === A ? stA : stB, {}) < CFG.STRIKER_SUB_BJJ_MIN || random() > CFG.STRIKER_SUB_CHANCE) {
          comm.tickOnly(exMin, exSec, `${attacker.name} lacks submission skills — position stalled.`);
          continue;
        }
      } else if (effAttr(attacker, "bjj", attacker === A ? stA : stB, {}) < CFG.MIN_BJJ_FOR_SUB) {
        comm.tickOnly(exMin, exSec, `${attacker.name} lacks submission skills — position stalled.`);
        continue;
      }
      const gType = position?.type || "guard";
      const attackerSta = attacker === A ? stA : stB;
      const defenderSta = defender === A ? stA : stB;
      const posBonus = gType === "backMount" ? CFG.BACK_MOUNT_BONUS : gType === "mount" ? CFG.MOUNT_BONUS : gType === "sideControl" ? CFG.SIDE_CONTROL_BONUS : CFG.GUARD_BONUS;
      const subMod = (matchup.aSub || 0) + (matchup.bSub || 0);
      const adv = clamp(
        (effAttr(attacker, "bjj", attackerSta, {}) * 0.8 + effAttr(attacker, "strength", attackerSta, {}) * 0.2 + posBonus + subMod * CFG.SUB_MOD_SCALE)
        - (effAttr(defender, "bjj", defenderSta, {}) * 0.5 + effAttr(defender, "fightIQ", defenderSta, {}) * 0.25),
        CFG.SUB_ADV_MIN, CFG.SUB_ADV_MAX
      );
      subProgress += adv;
      if (subProgress >= SUB_THRESHOLD) {
        finish = { by: attacker === A ? "A" : "B", how: "Submission" };
        comm.both(exMin, exSec + 5, `SUBMISSION! ${attacker.name} sinks it in! IT'S OVER!`);
        comm.tickOnly(exMin, exSec + 10, `${defender.name} has no choice but to tap!`);
      } else {
        comm.tickOnly(exMin, exSec + 5, `${attacker.name} hunting for a submission — ${defender.name} defends. ${
          subProgress > 60 ? "It's getting tight!" : subProgress > 30 ? "Good attempt." : ""
        }`);
        if (attacker === A) { ptsA += 5; mom += 2; } else { ptsB += 5; mom -= 2; }
        if (random() < CFG.SUB_DEFENSE_EASE_CHANCE) {
          subProgress = clamp(subProgress - RI(CFG.SUB_EASE_MIN, CFG.SUB_EASE_MAX), 0, SUB_THRESHOLD);
          comm.tickOnly(exMin, exSec + 10, `${defender.name} creates space — submission pressure eases.`);
        }
      }

      // BJJ guard specialist
      if (!finish && defender.archetype === "BJJ Specialist" && attacker.archetype !== "BJJ Specialist" && (gType === "guard" || gType === "halfGuard") && random() < CFG.BJJ_GUARD_CHANCE) {
        const bjjAdv = clamp(
          (effAttr(defender, "bjj", defenderSta, {}) * 0.6 + effAttr(defender, "fightIQ", defenderSta, {}) * 0.15 + 3)
          - (effAttr(attacker, "bjj", attackerSta, {}) * 0.3 + effAttr(attacker, "strength", attackerSta, {}) * 0.2),
          CFG.BJJ_GUARD_ADV_MIN, CFG.BJJ_GUARD_ADV_MAX
        );
        bjjGuardProgress += bjjAdv;
        if (bjjGuardProgress >= CFG.BJJ_GUARD_THRESHOLD) {
          finish = { by: defender === A ? "A" : "B", how: "Submission" };
          comm.both(exMin + 1, 0, `SUBMISSION! ${defender.name} locks it from the bottom! IT'S OVER!`);
        } else if (bjjAdv > 8) {
          comm.tickOnly(exMin, exSec + 8, `${defender.name} threatens a submission from guard!`);
        }
      }

    // ── SWEEP ──
    } else if (exType === "sweep") {
      const isTopA = position?.top === "A";
      const sweeper = isTopA ? B : A;
      const sweepMod = (matchup.aSweep || 0) + (matchup.bSweep || 0);
      if (random() < CFG.SWEEP_BASE_CHANCE + sweepMod) {
        position = { type: "guard", top: isTopA ? "B" : "A" };
        comm.both(exMin, exSec + 5, `${sweeper.name} sweeps! Position reversed!`);
        mom += isTopA ? -10 : 10;
      } else {
        comm.tickOnly(exMin, exSec + 5, `${sweeper.name} tries to sweep — ${isTopA ? A.name : B.name} stays heavy.`);
      }

    // ── POSITION ADVANCE ──
    } else if (exType === "advance") {
      const gType = position?.type || "guard";
      const idx = GROUND_ORDER.indexOf(gType);
      const g = GROUND[gType] || GROUND.guard;
      if (idx >= 0 && idx < GROUND_ORDER.length - 1 && random() < g.advanceChance) {
        const next = GROUND_ORDER[idx + 1];
        position = { ...position, type: next };
        comm.both(exMin, exSec + 5, `${position.top === "A" ? A.name : B.name} advances to ${GROUND[next].label}!`);
        mom += position.top === "A" ? 6 : -6;
      } else {
        comm.tickOnly(exMin, exSec + 5, `${gType === "backMount" ? "Nowhere to go — " : ""}${position.top === "A" ? B.name : A.name} defends the position.`);
      }

    // ── SCRAMBLE ──
    } else if (exType === "scramble") {
      if (random() < CFG.SCRAMBLE_UP_CHANCE) {
        position = "standing";
        comm.bothS(exMin, exSec, SCRAMBLE_UP_TEMPLATES);
        mom += R(-2, 5);
      } else {
        comm.bothS(exMin, exSec, SCRAMBLE_STALL_TEMPLATES);
        mom -= 2;
      }
    }

    // ── KNOCKDOWN CHECK ──
    const isOnGround = typeof position === "object";
    const aOnTop = isOnGround && position.top === "A";
    const bOnTop = isOnGround && position.top === "B";
    if (!finish && !knockdown && (dmgA > CFG.KD_DMG_THRESHOLD || dmgB > CFG.KD_DMG_THRESHOLD)) {
      const kdTarget = dmgA > dmgB ? A : B;
      const isTargetA = kdTarget === A;
      if ((isTargetA && aOnTop) || (!isTargetA && bOnTop)) {
        // Stunned but controlling — no KD
      } else {
        const chin = effAttr(kdTarget, "chin", isTargetA ? stA : stB);
        const attackerStr = effAttr(isTargetA ? B : A, "strength", isTargetA ? stB : stA) * (1 + (isTargetA ? (matchup.bStrike || 0) : 0));
        const kdChance = clamp(((isTargetA ? dmgA : dmgB) - 40) / chin * CFG.KD_CHIN_MULT + (attackerStr - 40) * CFG.KD_STR_MULT, 0, CFG.KD_CHANCE_MAX) * (planA === "Finish It" ? 1.5 : 1) * cautiousMult;
        if (random() < kdChance) {
          knockdown = { fighter: isTargetA ? "A" : "B", name: kdTarget.name, canRecover: true };
          comm.both(exMin + 1, 0, `${kdTarget.name} IS DOWN! He's hurt bad!`);
          comm.tickOnly(exMin + 1, 2, `The referee is watching closely...`);
          mom += isTargetA ? -25 : 25;
          if (random() < CFG.KD_FINISH_CHANCE) {
            knockdown.canRecover = false;
            finish = { by: isTargetA ? "B" : "A", how: "KO/TKO" };
            comm.both(exMin + 1, 5, `KO!! ${isTargetA ? B.name : A.name} with the walk-off!`);
          }
        }
      }
    }
  }

  // ── ROUND END ──
  if (!finish) {
    comm.tickOnly(4, 50, `Final seconds — ${A.name} looking for a home run.`);
    comm.both(5, 0, `Round ${rnd} ends. Judges score this round.`);
  }

  // ── TRAIT COMMENTARY ──
  const traitMsgs = traitCommentary(null, A, B, rnd, dmgA, dmgB, landA);
  traitMsgs.forEach((msg, i) => {
    if (msg.includes("iron chin")) comm.both(3, 10, msg);
    else if (msg.includes("glass jaw")) comm.both(3, 40, msg);
    else if (msg.includes("grinding")) comm.both(3, 20, msg);
    else if (msg.includes("showboating")) comm.both(2, 15, msg);
    else if (msg.includes("warrior")) comm.both(3, 0, msg);
    else if (msg.includes("explosive")) comm.both(0, 25, msg);
    else comm.both(0, 0, msg);
  });

  // ── DAMAGE EFFECTS ──
  const bodyMultA = 1 + (bodyDmgA || 0) * CFG.BODY_DMG_MULTIPLIER;
  const bodyMultB = 1 + (bodyDmgB || 0) * CFG.BODY_DMG_MULTIPLIER;
  const legModA = clamp(1 - (legDmgA || 0) * CFG.LEG_DMG_MULTIPLIER, CFG.LEG_MOD_MIN, 1);
  const legModB = clamp(1 - (legDmgB || 0) * CFG.LEG_DMG_MULTIPLIER, CFG.LEG_MOD_MIN, 1);

  const drainA = R(CFG.STA_DRAIN_MIN, CFG.STA_DRAIN_MAX) * agg * (planA === "Finish It" ? 1.3 : 1) * (planA === "Survive & Outpoint" ? 0.75 : 1) *
    (cornerA === "save" ? CFG.CORNER_SAVE_DRAIN : 1) * (55 / clamp(A.attrs.cardio * legModA, CFG.CARDIO_DIVISOR_MIN, CFG.CARDIO_DIVISOR_MAX)) * bodyMultA;
  const drainB = R(CFG.STA_DRAIN_MIN, CFG.STA_DRAIN_MAX) * (55 / clamp(B.attrs.cardio * legModB, CFG.CARDIO_DIVISOR_MIN, CFG.CARDIO_DIVISOR_MAX)) * bodyMultB;

  mom = clamp(Math.round(mom * CFG.MOMENTUM_DECAY), CFG.MOMENTUM_MIN, CFG.MOMENTUM_MAX);

  return {
    log: comm.summaryLog, tickLog: comm.tickLog,
    dmgA, dmgB, bodyDmgA, bodyDmgB, legDmgA, legDmgB,
    staA: clamp(stA - drainA, CFG.STA_MIN, CFG.STA_MAX),
    staB: clamp(stB - drainB, CFG.STA_MIN, CFG.STA_MAX),
    scoreA: ptsA, scoreB: ptsB,
    finish, knockdown, landA, landB,
    tdA: position && typeof position === "object" && position.top === "A" ? 1 : 0,
    tdB: position && typeof position === "object" && position.top === "B" ? 1 : 0,
    momentum: mom,
    duringRound: rnd,
    winner: finish ? finish.by : (ptsA >= ptsB ? "A" : "B"),
  };
}

// ── PREP FIGHTER ──
export function prepFighter(f) {
  const c = JSON.parse(JSON.stringify(f));
  const mo = f.morale == null ? 60 : f.morale;
  const m = mo >= CFG.MORALE_HIGH ? CFG.MORALE_BOOST : mo < CFG.MORALE_LOW ? CFG.MORALE_PENALTY : 1;
  const a = f.age >= CFG.AGE_OLD ? CFG.AGE_OLD_MULT : f.age >= CFG.AGE_VETERAN ? CFG.AGE_VETERAN_MULT : f.age >= CFG.AGE_PEAK_LOW ? CFG.AGE_PEAK_MULT : f.age <= CFG.AGE_YOUNG ? CFG.AGE_YOUNG_MULT : 1;
  ATTRS.forEach((k) => { if (k !== "chin") c.attrs[k] = clamp(c.attrs[k] * m * a, CFG.ATTR_MIN, CFG.ATTR_MAX); });
  const delta = f.weightClassDelta || 0;
  if (delta > 0) {
    c.attrs.strength = clamp(c.attrs.strength * clamp(1 - delta * 0.02, 0.85, 1), 5, 99);
    c.attrs.footwork = clamp(c.attrs.footwork * clamp(1 + delta * 0.015, 1, 1.1), 5, 99);
  } else if (delta < 0) {
    c.attrs.strength = clamp(c.attrs.strength * clamp(1 + Math.abs(delta) * 0.02, 1, 1.1), 5, 99);
    c.attrs.footwork = clamp(c.attrs.footwork * clamp(1 - Math.abs(delta) * 0.015, 0.85, 1), 5, 99);
  }
  return c;
}
