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
import { getArchetypeBehavior } from "./archetype-expression.js";
import * as CFG from "./fight/config.js";
import { matchupMods } from "./fight/matchup.js";
import { pickExchange } from "./fight/exchanges.js";
import { createCommentary, STRIKE_TEMPLATES, POWER_TEMPLATES, traitCommentary, archetypeCommentary } from "./fight/commentary.js";
import { explosiveMult, cautiousMult, chinModifier, footworkModifier } from "./fight/trait-effects.js";
import { resolveStriking } from "./fight/resolve-striking.js";
import { resolveClinch } from "./fight/resolve-clinch.js";
import { resolveTakedown } from "./fight/resolve-takedown.js";
import { resolveGround } from "./fight/resolve-ground.js";
import { scoreDecision } from "./fight/scoring.js";
import { weightCutInfo } from "./fight/weight-cut.js";

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
  return v * (mods?.[k] || 1) * (1 + (getArchetypeBehavior(f).adaptabilityBonus || 0));
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

// ── AI CORNER ──
// Corner instruction for a fighter the player does not control. Uses the same
// options the player gets, picked from the fight state. No randomness, so it
// does not shift the fight's RNG sequence.
//   rnd: the round about to start. momOwn: momentum from this fighter's side
//   (positive = this fighter has it).
export function aiCorner({ rnd, totalRounds = 3, staOwn = 100, staOpp = 100, cutOwn = 0, cutOpp = 0, momOwn = 0, plan } = {}) {
  if (cutOwn >= 4) return "stop_bleed";
  if (cutOpp >= 4) return "target_cut";
  if (staOwn < 35) return "save";
  if (rnd === totalRounds && rnd > 1 && momOwn < 0) return "empty_tank";
  if (plan === "Finish It") return "go";
  if (plan === "Survive & Outpoint") return "save";
  if (staOwn > staOpp + 15) return "go";
  return "neutral";
}

// ── SIDE MODIFIERS ──
// Every plan and corner effect is applied through these, for both sides.

// Effects of a corner instruction (see CORNER_EFFECTS in fight/config.js).
// Unknown or missing instructions count as "neutral".
export function cornerEffects(corner) {
  return CFG.CORNER_EFFECTS[corner] || CFG.CORNER_EFFECTS.neutral;
}

// Momentum is stored from A's side. Pass -mom to get B's multiplier.
function momentumMult(m) {
  return clamp(1 + (m > 0 ? m * CFG.MOMENTUM_DIVISOR_POS : m * CFG.MOMENTUM_DIVISOR_NEG), CFG.MOMENTUM_MULT_MIN, CFG.MOMENTUM_MULT_MAX);
}

// Going for the finish makes knockdowns likelier in both directions:
// a fighter who opens up also leaves openings.
function finishRisk(plan) {
  return plan === "Finish It" ? 1.5 : 1;
}

// Cardio factor for stamina loss: low cardio and damaged legs lose more.
function cardioFactor(f, legMod) {
  return 55 / clamp(f.attrs.cardio * legMod, CFG.CARDIO_DIVISOR_MIN, CFG.CARDIO_DIVISOR_MAX);
}

function staminaDrain(f, plan, corner, legMod, bodyMult) {
  return R(CFG.STA_DRAIN_MIN, CFG.STA_DRAIN_MAX) * cornerEffects(corner).drain
    * (plan === "Finish It" ? 1.3 : 1) * (plan === "Survive & Outpoint" ? 0.75 : 1)
    * cardioFactor(f, legMod) * bodyMult;
}

// ── MAIN FIGHT ROUND ──
// planA/cornerA: side A's choices (the player in Fight Night).
// opts.planB/opts.cornerB: side B's choices. When left out, B gets
// autoGamePlan and aiCorner, so the opponent never fights without a plan.
// opts.totalRounds: used by aiCorner to spot the final round (default 3).
// opts.nutritionistSkillA/B: optional staff mitigation of each side's cut.
export function simRound(rnd, A, B, stA, stB, planA, cornerA, momentum = 0, cutA = 0, cutB = 0, opts = {}) {
  const capA = weightCutInfo(A, opts.nutritionistSkillA).staminaCap;
  const capB = weightCutInfo(B, opts.nutritionistSkillB).staminaCap;
  // Clamp before resolving any exchanges: the cut affects output from the
  // first bell. Never subtract the penalty again on subsequent rounds.
  stA = clamp(stA, CFG.STA_MIN, capA);
  stB = clamp(stB, CFG.STA_MIN, capB);
  const comm = createCommentary();
  let dmgA = 0, dmgB = 0, bodyDmgA = 0, bodyDmgB = 0, legDmgA = 0, legDmgB = 0;
  let ptsA = 0, ptsB = 0, finish = null, knockdown = null;
  let landA = 0, landB = 0;
  // Strikes landed standing (striking and clinch), for "Work the body".
  let standLandA = 0, standLandB = 0;
  let position = STANDING;
  let mom = momentum || 0;
  const planB = opts.planB ?? autoGamePlan(B, A);
  const cornerB = opts.cornerB ?? aiCorner({
    rnd, totalRounds: opts.totalRounds ?? 3,
    staOwn: stB, staOpp: stA, cutOwn: cutB, cutOpp: cutA, momOwn: -mom, plan: planB,
  });
  const effA = cornerEffects(cornerA);
  const effB = cornerEffects(cornerB);
  const expMultA = explosiveMult(A, rnd);
  const expMultB = explosiveMult(B, rnd);
  const matchup = matchupMods(A, B);

  let subProgress = 0;
  let bjjGuardProgress = 0;
  const SUB_THRESHOLD = CFG.SUB_THRESHOLD_BASE;

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

  // Opponent's corner, so the player can read what the other side is doing
  if (cornerB === "go") comm.tickOnly(0, 35, `${B.name}'s corner wants more pressure.`);
  else if (cornerB === "save") comm.tickOnly(0, 35, `${B.name}'s corner tells him to slow down and conserve.`);
  else if (cornerB === "body") comm.tickOnly(0, 35, `${B.name}'s corner: "Go to the body!"`);
  else if (cornerB === "target_cut") comm.tickOnly(0, 35, `${B.name}'s corner points at ${A.name}'s cut.`);
  else if (cornerB === "stop_bleed") comm.tickOnly(0, 35, `${B.name}'s corner works on the cut — he'll fight safer.`);
  else if (cornerB === "clinch") comm.tickOnly(0, 35, `${B.name}'s corner: "Tie him up and breathe."`);
  else if (cornerB === "empty_tank") comm.tickOnly(0, 35, `${B.name}'s corner: "Everything you've got, this round!"`);

  const nEx = RI(CFG.EXCHANGES_PER_ROUND.min, CFG.EXCHANGES_PER_ROUND.max);
  for (let ex = 0; ex < nEx; ex++) {
    if (finish) break;
    // Satu nilai waktu kontinu (bukan 2 skala terpisah yang gak nyambung),
    // biar progresi antar-exchange rata & gak collision. 270 detik (4.5 menit)
    // sengaja disisain buffer sebelum bel wasit di menit ke-5.
    const totalExSec = Math.floor((ex * CFG.ROUND_COMMENTARY_SECONDS) / nEx);
    const exMin = Math.floor(totalExSec / 60);
    const exSec = totalExSec % 60;

    const exType = pickExchange(position, A, B, planA, planB);
    let exDmgA = 0, exDmgB = 0; // damage dari exchange INI SAJA (bukan kumulatif round)

    const side = { cornerA, cornerB, aggA: effA.out, aggB: effB.out, exposedA: effA.exposed, exposedB: effB.exposed, momMultA: momentumMult(mom), momMultB: momentumMult(-mom), expMultA, expMultB };
    const phase = ex < CFG.EARLY_EXCHANGES ? CFG.PHASE_EARLY : ex >= nEx - 2 ? CFG.PHASE_LATE : CFG.PHASE_MID;

    // ── STRIKING ──
    if (exType === "strike" || exType === "power") {
      const archMsgs = archetypeCommentary(A, B, exType, matchup);
      archMsgs.forEach(m => comm.tickOnly(exMin, exSec + 12, m));
      const pow = exType === "power" ? CFG.POWER_SHOT_MULT : 1;
      const result = clampDamage(resolveStriking(exType, A, B, stA, stB, side, phase, pow, matchup, ptsA, ptsB, legDmgA, legDmgB, comm, exMin, exSec));
      exDmgA = result.dmgA; exDmgB = result.dmgB;
      dmgA += result.dmgA; dmgB += result.dmgB;
      bodyDmgA += result.bodyDmgA; bodyDmgB += result.bodyDmgB;
      legDmgA += result.legDmgA; legDmgB += result.legDmgB;
      landA += result.landA; landB += result.landB;
      standLandA += result.landA; standLandB += result.landB;
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
      const result = clampDamage(resolveClinch(exType, A, B, stA, stB, side, matchup, comm, exMin, exSec));
      exDmgA = result.dmgA; exDmgB = result.dmgB;
      dmgA += result.dmgA; dmgB += result.dmgB;
      bodyDmgA += result.bodyDmgA; bodyDmgB += result.bodyDmgB;
      legDmgA += result.legDmgA; legDmgB += result.legDmgB;
      landA += result.landA; landB += result.landB;
      standLandA += result.landA; standLandB += result.landB;
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
      const result = clampDamage(resolveTakedown(exType, A, B, stA, stB, { planA, planB, cornerA, cornerB }, matchup, comm, exMin, exSec));
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
    // Equal damage means neither fighter is clearly hurt. Clinch damage is a
    // whole number, so ties are common; picking B on a tie gave A an edge.
    if (!finish && !knockdown && exDmgA !== exDmgB && (exDmgA > CFG.KD_EXCHANGE_THRESHOLD || exDmgB > CFG.KD_EXCHANGE_THRESHOLD)) {
      const kdTarget = exDmgA > exDmgB ? A : B;
      const isTargetA = kdTarget === A;
      if ((isTargetA && aOnTop) || (!isTargetA && bOnTop)) {
        // Stunned but controlling — no KD
      } else {
        const chin = effAttr(kdTarget, "chin", isTargetA ? stA : stB);
        const attacker = isTargetA ? B : A;
        const attackerStr = effAttr(attacker, "strength", isTargetA ? stB : stA) * (1 + ((isTargetA ? matchup.bStrike : matchup.aStrike) || 0));
        const exDmg = isTargetA ? exDmgA : exDmgB;
        const cumDmg = isTargetA ? dmgA : dmgB;
        const kdChance = clamp((exDmg - CFG.KD_EXCHANGE_THRESHOLD) / chin * CFG.KD_CHIN_MULT + (attackerStr - 40) * CFG.KD_STR_MULT + cumDmg * CFG.KD_FATIGUE_MULT, 0, CFG.KD_CHANCE_MAX) * finishRisk(planA) * finishRisk(planB)
          // The attacker's corner sets how hard he goes for the knockdown
          // (body work rarely drops anyone).
          * (isTargetA ? effB : effA).kd
          // Cautious lowers the fighter's own finishing power, not the risk of being finished.
          * cautiousMult(attacker);
        if (random() < kdChance) {
          knockdown = { fighter: isTargetA ? "A" : "B", name: kdTarget.name };
          comm.both(exMin + 1, 0, `${kdTarget.name} IS DOWN! He's hurt bad!`);
          comm.tickOnly(exMin + 1, 2, `The referee is watching closely...`);
          mom += isTargetA ? -25 : 25;
          if (random() < CFG.KD_FINISH_CHANCE) {
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
      const cutChance = (attackerCorner, defenderCorner) => CFG.CUT_CHANCE_PER_HIT
        * (attackerCorner === "target_cut" ? CFG.CUT_TARGET_MULT : 1)
        * (defenderCorner === "stop_bleed" ? CFG.CUT_PROTECT_MULT : 1);
      const cutChanceB = cutChance(cornerA, cornerB);
      const cutChanceA = cutChance(cornerB, cornerA);
      if (exDmgB > CFG.CUT_EXCHANGE_THRESHOLD && random() < cutChanceB) cutB += CFG.CUT_SEVERITY_PER_HIT;
      if (exDmgA > CFG.CUT_EXCHANGE_THRESHOLD && random() < cutChanceA) cutA += CFG.CUT_SEVERITY_PER_HIT;
    }
  }

  // "Work the body": every strike that lands takes extra stamina from the
  // opponent. Stamina carries over, so this pays off in later rounds.
  // Computed here (no RNG) so the commentary line comes before the bell.
  const legModA = clamp(1 - (legDmgA || 0) * CFG.LEG_DMG_MULTIPLIER, CFG.LEG_MOD_MIN, 1);
  const legModB = clamp(1 - (legDmgB || 0) * CFG.LEG_DMG_MULTIPLIER, CFG.LEG_MOD_MIN, 1);
  const bodyDrainA = cornerB === "body" ? standLandB * CFG.CORNER_BODY_STA_PER_LAND * cardioFactor(A, legModA) : 0;
  const bodyDrainB = cornerA === "body" ? standLandA * CFG.CORNER_BODY_STA_PER_LAND * cardioFactor(B, legModB) : 0;
  if (!finish && bodyDrainB >= 3) comm.both(4, 45, `${B.name} is breathing hard — the body work is adding up.`);
  if (!finish && bodyDrainA >= 3) comm.both(4, 45, `${A.name} is breathing hard — the body work is adding up.`);

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

  const drainA = staminaDrain(A, planA, cornerA, legModA, bodyMultA) + bodyDrainA;
  const drainB = staminaDrain(B, planB, cornerB, legModB, bodyMultB) + bodyDrainB;

  // Clinch penalty: sacrifice round points for stamina recovery
  if (cornerA === "clinch") ptsA = Math.max(0, ptsA - CFG.CORNER_CLINCH_POINT_COST);
  if (cornerB === "clinch") ptsB = Math.max(0, ptsB - CFG.CORNER_CLINCH_POINT_COST);

  // Round half away from zero so decay treats both sides the same
  // (Math.round alone rounds -2.5 to -2 but 2.5 to 3).
  const decayed = mom * CFG.MOMENTUM_DECAY;
  mom = clamp(Math.sign(decayed) * Math.round(Math.abs(decayed)), CFG.MOMENTUM_MIN, CFG.MOMENTUM_MAX);

  return {
    log: comm.summaryLog, tickLog: comm.tickLog,
    dmgA, dmgB, bodyDmgA, bodyDmgB, legDmgA, legDmgB,
    staA: clamp(stA - drainA, CFG.STA_MIN, capA),
    staB: clamp(stB - drainB, CFG.STA_MIN, capB),
    scoreA: ptsA, scoreB: ptsB,
    finish, knockdown, landA, landB,
    tdA: position.type !== "standing" && position.top === "A" ? 1 : 0,
    tdB: position.type !== "standing" && position.top === "B" ? 1 : 0,
    momentum: mom,
    cutA, cutB,
    planB, cornerB,
    duringRound: rnd,
    winner: finish ? finish.by : (ptsA >= ptsB ? "A" : "B"),
  };
}

// ── HEADLESS FULL FIGHT ──

// Pure simulation — no React, no UI. Replaces FightNight.jsx loop for
// non-interactive contexts (AI vs AI, bulk sim, replay).
// Set global RNG ke seed yang dikasih, jalanin semua ronde, return hasil.
// cornerPolicy(roundResult, roundNumber, state) → a corner key ("neutral",
// "go", "save", "body", ...). Called for every round, round 1 included.
// opts.planB: B's game plan (default autoGamePlan(B, A)).
// opts.cornerPolicyB: same shape as cornerPolicy, state seen from A's side
// (default aiCorner from B's point of view).
export function runFight(A, B, plan, cornerPolicy, seed, totalRounds, opts = {}) {
  setRNG(mulberry32(seed));
  const planB = opts.planB ?? autoGamePlan(B, A);
  const cornerPolicyB = opts.cornerPolicyB ?? ((_res, r, st) => aiCorner({
    rnd: r, totalRounds, staOwn: st.staB, staOpp: st.staA,
    cutOwn: st.cutB, cutOpp: st.cutA, momOwn: -st.momentum, plan: planB,
  }));

  let staA = weightCutInfo(A, opts.nutritionistSkillA).staminaCap;
  let staB = weightCutInfo(B, opts.nutritionistSkillB).staminaCap;
  let mom = 0;
  let cutA = 0, cutB = 0;
  let totalDmgA = 0, totalDmgB = 0;
  const roundLogs = [];
  let winner = null, how = null, finalRound = totalRounds;

  for (let r = 1; r <= totalRounds; r++) {
    const st = { staA, staB, momentum: mom, totalDmgA, totalDmgB, cutA, cutB };
    const corner = cornerPolicy(null, r, st);
    const cornerB = cornerPolicyB(null, r, st);
    const res = simRound(r, A, B, staA, staB, plan, corner, mom, cutA, cutB, {
      planB, cornerB, totalRounds,
      nutritionistSkillA: opts.nutritionistSkillA, nutritionistSkillB: opts.nutritionistSkillB,
    });

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

    // Doctor stoppage — check both fighters' cuts
    if (r < totalRounds && (cutA >= 6 || cutB >= 6) && random() < 0.3) {
      if (cutA >= 6) {
        // Player's own cut is the problem → player loses
        winner = "B";
      } else {
        // Opponent's cut is the problem → player wins
        winner = "A";
      }
      how = "Doctor Stoppage";
      finalRound = r;
      break;
    }
  }

  let scorecard = null;
  if (!winner) {
    scorecard = scoreDecision(roundLogs);
    winner = scorecard.winner;
    how = "Decision";
  }

  return { winner, how, round: finalRound, totalDmgA, totalDmgB, roundLogs, scorecard };
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
