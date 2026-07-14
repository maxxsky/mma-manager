// ============================================================
//   FIGHT ENGINE — Lightweight Orchestration Layer
//   Delegates exchange resolution to domain modules:
//     resolve-striking.js — strike + power
//     resolve-clinch.js   — clinch
//     resolve-takedown.js — td / tdB
//     resolve-ground.js   — gnp, sub, sweep, advance, scramble
//
//   Position model: always { type, top } — never raw strings.
//   { type: "standing", top: null } for standing,
//   { type: "halfGuard", top: "A"|"B" } for ground.
// ============================================================

import { R, RI, clamp, random, mulberry32, setRNG } from "./rng.js";
import { ATTRS } from "./data.js";
import * as CFG from "./fight/config.js";
import { matchupMods } from "./fight/matchup.js";
import { pickExchange } from "./fight/exchanges.js";
import { createCommentary, STRIKE_TEMPLATES, POWER_TEMPLATES, traitCommentary, archetypeCommentary } from "./fight/commentary.js";
import { explosiveMult, cautiousMult, chinModifier, footworkModifier } from "./fight/trait-effects.js";
import { resolveStriking } from "./fight/resolve-striking.js";
import { resolveClinch } from "./fight/resolve-clinch.js";
import { resolveTakedown } from "./fight/resolve-takedown.js";
import { resolveGround } from "./fight/resolve-ground.js";

// ── DAMAGE SAFETY CLAMP ──
// Resolver returns secara struktural harusnya selalu >= 0, tapi ini safety net
// buat edge case ekstrim (matchup/momentum outlier) — cegah nilai negatif/NaN
// merembet ke health/state fighter.
function clampDamage(result) {
  const safe = (v) => (Number.isFinite(v) && v > 0 ? v : 0);
  result.dmgA = safe(result.dmgA);
  result.dmgB = safe(result.dmgB);
  result.bodyDmgA = safe(result.bodyDmgA);
  result.bodyDmgB = safe(result.bodyDmgB);
  result.legDmgA = safe(result.legDmgA);
  result.legDmgB = safe(result.legDmgB);
  return result;
}

// ── POSITION CONSTANTS ──
const STANDING = { type: "standing", top: null };

// ── EFFECTIVE ATTRIBUTE ──
export function effAttr(f, k, sta, mods) {
  let v = f.attrs[k] * (CFG.STA_BASE_WEIGHT + CFG.STA_SCALE_WEIGHT * (sta / 100));
  if (k === "chin") v = chinModifier(f, v);
  if (k === "footwork") v = footworkModifier(f, v);
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
export function simRound(rnd, A, B, stA, stB, planA, cornerA, momentum = 0, cutA = 0, cutB = 0) {
  const comm = createCommentary();
  let dmgA = 0, dmgB = 0, bodyDmgA = 0, bodyDmgB = 0, legDmgA = 0, legDmgB = 0;
  let ptsA = 0, ptsB = 0, finish = null, knockdown = null;
  let landA = 0, landB = 0;
  let position = STANDING;
  let mom = momentum || 0;
  const agg = cornerA === "go" || cornerA === "target_cut" ? CFG.CORNER_GO_MULT
    : cornerA === "save" || cornerA === "stop_bleed" ? CFG.CORNER_SAVE_MULT
    : cornerA === "empty_tank" ? CFG.CORNER_EMPTY_TANK_MULT
    : cornerA === "clinch" ? 1.0
    : 1;
  const expMult = explosiveMult(A, rnd);
  const cautMult = cautiousMult(A);
  const matchup = matchupMods(A, B);

  let subProgress = 0;
  let bjjGuardProgress = 0;
  const SUB_THRESHOLD = (A.archetype === "BJJ Specialist" || B.archetype === "BJJ Specialist") ? CFG.SUB_THRESHOLD_BJJ : CFG.SUB_THRESHOLD_BASE;

  comm.both(0, 5, `Round ${rnd} — bell rings! ${A.name} vs ${B.name}!`);
  comm.tickOnly(0, 10, `${A.name} in the center of the cage.`);
  comm.tickOnly(0, 20, `${B.name} circling, looking for opening.`);

  // In-fight feedback: game plan effect
  if (planA === "Finish It") comm.tickOnly(0, 25, `Coach: "${A.name}, finish this! Aggression up, but watch your gas tank."`);
  else if (planA === "Survive & Outpoint") comm.tickOnly(0, 25, `Coach: "Stay smart, ${A.name}. Conserve energy and outpoint him."`);
  else if (planA === "Take It Down") comm.tickOnly(0, 25, `Coach: "Take him down, ${A.name}. Wrestle-heavy game plan."`);

  // In-fight feedback: corner strategy  
  if (cornerA === "go") comm.tickOnly(0, 30, `Corner urges ${A.name} to push the pace — aggression boosted.`);
  else if (cornerA === "save") comm.tickOnly(0, 30, `Corner tells ${A.name} to save energy — defense up, output down.`);
  else if (cornerA === "body") comm.tickOnly(0, 30, `Corner: "Work the body, ${A.name}! It'll pay off late."`);
  else if (cornerA === "target_cut") comm.tickOnly(0, 30, `Corner: "Target that cut, ${A.name}! Make it worse!"`);
  else if (cornerA === "stop_bleed") comm.tickOnly(0, 30, `Corner tells ${A.name} to protect the cut — defense first.`);
  else if (cornerA === "clinch") comm.tickOnly(0, 30, `Corner: "Clinch and recover, ${A.name}! Take a round off to breathe."`);
  else if (cornerA === "empty_tank") comm.tickOnly(0, 30, `Corner: "Empty the tank, ${A.name}! Leave it all in there!"`);

  const nEx = RI(CFG.EXCHANGES_PER_ROUND.min, CFG.EXCHANGES_PER_ROUND.max);
  for (let ex = 0; ex < nEx; ex++) {
    if (finish) break;
    // Satu nilai waktu kontinu (bukan 2 skala terpisah yang gak nyambung),
    // biar progresi antar-exchange rata & gak collision. 270 detik (4.5 menit)
    // sengaja disisain buffer sebelum bel wasit di menit ke-5.
    const totalExSec = Math.floor((ex * CFG.ROUND_COMMENTARY_SECONDS) / nEx);
    const exMin = Math.floor(totalExSec / 60);
    const exSec = totalExSec % 60;

    const exType = pickExchange(position, A, B, planA);
    let exDmgA = 0, exDmgB = 0; // damage dari exchange INI SAJA (bukan kumulatif round)

    const momMult = clamp(1 + (mom > 0 ? mom * CFG.MOMENTUM_DIVISOR_POS : mom * CFG.MOMENTUM_DIVISOR_NEG), CFG.MOMENTUM_MULT_MIN, CFG.MOMENTUM_MULT_MAX);
    const phase = ex < CFG.EARLY_EXCHANGES ? CFG.PHASE_EARLY : ex >= nEx - 2 ? CFG.PHASE_LATE : CFG.PHASE_MID;

    // ── STRIKING ──
    if (exType === "strike" || exType === "power") {
      const archMsgs = archetypeCommentary(A, B, exType, matchup);
      archMsgs.forEach(m => comm.tickOnly(exMin, exSec + 12, m));
      const pow = exType === "power" ? CFG.POWER_SHOT_MULT : 1;
      const result = clampDamage(resolveStriking(exType, A, B, stA, stB, cornerA, agg, phase, momMult, pow, matchup, expMult, ptsA, ptsB, legDmgA, legDmgB, comm, exMin, exSec));
      exDmgA = result.dmgA; exDmgB = result.dmgB;
      dmgA += result.dmgA; dmgB += result.dmgB;
      bodyDmgA += result.bodyDmgA; bodyDmgB += result.bodyDmgB;
      legDmgA += result.legDmgA; legDmgB += result.legDmgB;
      landA += result.landA; landB += result.landB;
      ptsA += result.ptsA; ptsB += result.ptsB;
      mom += result.momDelta;

      if (result.landA + result.landB > 0) {
        comm.bothS(exMin, exSec, STRIKE_TEMPLATES, A.name, result.landA, B.name, result.landB);
      }
      if (exType === "power" && result.landA > result.landB + 3) {
        comm.tickS(exMin, exSec + 5, POWER_TEMPLATES, A.name, B.name);
      }
      // Archetype clash feedback
      if (matchup.aStrike > 0.15) comm.tickOnly(exMin, exSec + 8, `${A.name}'s ${A.archetype} striking advantage showing.`);
      else if (matchup.bStrike > 0.15) comm.tickOnly(exMin, exSec + 8, `${B.name}'s ${B.archetype} striking giving him the edge.`);

    // ── CLINCH ──
    } else if (exType === "clinch") {
      const archMsgs2 = archetypeCommentary(A, B, exType, matchup);
      archMsgs2.forEach(m => comm.tickOnly(exMin, exSec + 12, m));
      const result = clampDamage(resolveClinch(exType, A, B, stA, stB, agg, matchup, comm, exMin, exSec));
      exDmgA = result.dmgA; exDmgB = result.dmgB;
      dmgA += result.dmgA; dmgB += result.dmgB;
      bodyDmgA += result.bodyDmgA; bodyDmgB += result.bodyDmgB;
      legDmgA += result.legDmgA; legDmgB += result.legDmgB;
      landA += result.landA; landB += result.landB;
      ptsA += result.ptsA; ptsB += result.ptsB;
      mom += result.momDelta;
      if (result.newPosition) position = result.newPosition;
      // Archetype clash: clinch
      if (matchup.aClinch > 0.15 && result.landA > result.landB) comm.tickOnly(exMin, exSec + 8, `${A.name} dominating the clinch — ${A.archetype} advantage.`);
      else if (matchup.bClinch > 0.15 && result.landB > result.landA) comm.tickOnly(exMin, exSec + 8, `${B.name} controlling the clinch — ${B.archetype} edge.`);

    // ── TAKEDOWN ──
    } else if (exType === "td" || exType === "tdB") {
      const archMsgs3 = archetypeCommentary(A, B, exType, matchup);
      archMsgs3.forEach(m => comm.tickOnly(exMin, exSec + 12, m));
      const result = clampDamage(resolveTakedown(exType, A, B, stA, stB, planA, cornerA, matchup, comm, exMin, exSec));
      exDmgA = result.dmgA; exDmgB = result.dmgB;
      dmgA += result.dmgA; dmgB += result.dmgB;
      bodyDmgA += result.bodyDmgA; bodyDmgB += result.bodyDmgB;
      legDmgA += result.legDmgA; legDmgB += result.legDmgB;
      landA += result.landA; landB += result.landB;
      ptsA += result.ptsA; ptsB += result.ptsB;
      mom += result.momDelta;
      if (result.newPosition) position = result.newPosition;
      if (result.finish) { finish = result.finish; break; }

    // ── GROUND ──
    } else {
      const archMsgs4 = archetypeCommentary(A, B, exType, matchup);
      archMsgs4.forEach(m => comm.tickOnly(exMin, exSec + 12, m));
      const result = clampDamage(resolveGround(exType, A, B, stA, stB, position, matchup, subProgress, bjjGuardProgress, SUB_THRESHOLD, comm, exMin, exSec));
      exDmgA = result.dmgA; exDmgB = result.dmgB;
      dmgA += result.dmgA; dmgB += result.dmgB;
      bodyDmgA += result.bodyDmgA; bodyDmgB += result.bodyDmgB;
      legDmgA += result.legDmgA; legDmgB += result.legDmgB;
      landA += result.landA; landB += result.landB;
      ptsA += result.ptsA; ptsB += result.ptsB;
      mom += result.momDelta;
      if (result.newPosition) position = result.newPosition;
      if (result.finish) { finish = result.finish; break; }
      if (result.subProgress != null) subProgress = result.subProgress;
      if (result.bjjGuardProgress != null) bjjGuardProgress = result.bjjGuardProgress;
    }

    // ── KNOCKDOWN CHECK ──
    const isOnGround = position.type !== "standing";
    const aOnTop = isOnGround && position.top === "A";
    const bOnTop = isOnGround && position.top === "B";
    if (!finish && !knockdown && (exDmgA > CFG.KD_EXCHANGE_THRESHOLD || exDmgB > CFG.KD_EXCHANGE_THRESHOLD)) {
      const kdTarget = exDmgA > exDmgB ? A : B;
      const isTargetA = kdTarget === A;
      if ((isTargetA && aOnTop) || (!isTargetA && bOnTop)) {
        // Stunned but controlling — no KD
      } else {
        const chin = effAttr(kdTarget, "chin", isTargetA ? stA : stB);
        const attackerStr = effAttr(isTargetA ? B : A, "strength", isTargetA ? stB : stA) * (1 + (isTargetA ? (matchup.bStrike || 0) : 0));
        const exDmg = isTargetA ? exDmgA : exDmgB;
        const cumDmg = isTargetA ? dmgA : dmgB;
        const kdChance = clamp((exDmg - CFG.KD_EXCHANGE_THRESHOLD) / chin * CFG.KD_CHIN_MULT + (attackerStr - 40) * CFG.KD_STR_MULT + cumDmg * CFG.KD_FATIGUE_MULT, 0, CFG.KD_CHANCE_MAX) * (planA === "Finish It" ? 1.5 : 1) * (cornerA === "empty_tank" ? 1.5 : 1) * cautMult;
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
        } else if (kdTarget.traits?.includes("Iron Chin")) {
          comm.tickOnly(exMin + 1, 0, `${kdTarget.name}'s iron chin holds up — he eats the shot and keeps coming!`);
        } else if (kdTarget.traits?.includes("Warrior") && kdChance > 0.3) {
          comm.tickOnly(exMin + 1, 0, `${kdTarget.name} is hurt but refuses to go down — pure warrior heart!`);
        }
      }
    }

    // ── CUT CHECK — striking exchanges only ──
    if (!finish && (exType === "strike" || exType === "power")) {
      const cutChanceB = cornerA === "target_cut" ? CFG.CUT_CHANCE_PER_HIT * CFG.CUT_TARGET_MULT : CFG.CUT_CHANCE_PER_HIT;
      const cutChanceA = cornerA === "stop_bleed" ? CFG.CUT_CHANCE_PER_HIT * CFG.CUT_PROTECT_MULT : CFG.CUT_CHANCE_PER_HIT;
      if (exDmgB > CFG.CUT_EXCHANGE_THRESHOLD && random() < cutChanceB) cutB += CFG.CUT_SEVERITY_PER_HIT;
      if (exDmgA > CFG.CUT_EXCHANGE_THRESHOLD && random() < cutChanceA) cutA += CFG.CUT_SEVERITY_PER_HIT;
    }
  }

  // ── ROUND END ──
  if (!finish) {
    comm.tickOnly(4, 50, `Final seconds — ${A.name} looking for a home run.`);
    comm.both(5, 0, `Round ${rnd} ends. Judges score this round.`);
  }

  // ── TRAIT COMMENTARY ──
  const traitMsgs = traitCommentary(null, A, B, rnd, dmgA, dmgB, landA);
  traitMsgs.forEach((msg) => {
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
    (cornerA === "save" || cornerA === "stop_bleed" ? CFG.CORNER_SAVE_DRAIN : cornerA === "clinch" ? CFG.CORNER_CLINCH_DRAIN : 1) * (55 / clamp(A.attrs.cardio * legModA, CFG.CARDIO_DIVISOR_MIN, CFG.CARDIO_DIVISOR_MAX)) * bodyMultA;
  const drainB = R(CFG.STA_DRAIN_MIN, CFG.STA_DRAIN_MAX) * (55 / clamp(B.attrs.cardio * legModB, CFG.CARDIO_DIVISOR_MIN, CFG.CARDIO_DIVISOR_MAX)) * bodyMultB;

  // Clinch penalty: sacrifice round points for stamina recovery
  if (cornerA === "clinch") ptsA = Math.max(0, ptsA - 2);

  mom = clamp(Math.round(mom * CFG.MOMENTUM_DECAY), CFG.MOMENTUM_MIN, CFG.MOMENTUM_MAX);

  return {
    log: comm.summaryLog, tickLog: comm.tickLog,
    dmgA, dmgB, bodyDmgA, bodyDmgB, legDmgA, legDmgB,
    staA: clamp(stA - drainA, CFG.STA_MIN, CFG.STA_MAX),
    staB: clamp(stB - drainB, CFG.STA_MIN, CFG.STA_MAX),
    scoreA: ptsA, scoreB: ptsB,
    finish, knockdown, landA, landB,
    tdA: position.type !== "standing" && position.top === "A" ? 1 : 0,
    tdB: position.type !== "standing" && position.top === "B" ? 1 : 0,
    momentum: mom,
    cutA, cutB,
    duringRound: rnd,
    winner: finish ? finish.by : (ptsA >= ptsB ? "A" : "B"),
  };
}

// ── HEADLESS FULL FIGHT ──

// Pure simulation — no React, no UI. Replaces FightNight.jsx loop for
// non-interactive contexts (AI vs AI, bulk sim, replay).
// Set global RNG ke seed yang dikasih, jalanin semua ronde, return hasil.
// cornerPolicy(roundResult, roundNumber, state) → "go"|"save"|"body"
export function runFight(A, B, plan, cornerPolicy, seed, totalRounds) {
  setRNG(mulberry32(seed));

  let staA = 100, staB = 100, mom = 0;
  let cutA = 0, cutB = 0;
  let totalDmgA = 0, totalDmgB = 0;
  const roundLogs = [];
  let winner = null, how = null, finalRound = totalRounds;

  for (let r = 1; r <= totalRounds; r++) {
    const corner = r === 1 ? "go" : cornerPolicy(null, r, { staA, staB, momentum: mom, totalDmgA, totalDmgB, cutA, cutB });
    const res = simRound(r, A, B, staA, staB, plan, corner, mom, cutA, cutB);

    staA = res.staA; staB = res.staB;
    mom = res.momentum;
    cutA = res.cutA; cutB = res.cutB;
    totalDmgA += res.dmgA;
    totalDmgB += res.dmgB;

    roundLogs.push(res);

    if (res.finish) {
      winner = res.winner;
      how = res.finish.how;
      finalRound = r;
      break;
    }

    // Doctor stoppage — real cut value from simRound
    if (r < totalRounds && cutB >= 6 && random() < 0.3) {
      winner = "A";
      how = "Doctor Stoppage";
      finalRound = r;
      break;
    }
  }

  if (!winner) {
    const last = roundLogs[roundLogs.length - 1];
    winner = last.winner;
    how = "Decision";
  }

  return { winner, how, round: finalRound, totalDmgA, totalDmgB, roundLogs };
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
