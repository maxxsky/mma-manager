import { R, RI, clamp, random, pick } from "./rng.js";
import { ATTRS } from "./data.js";

export function effAttr(f, k, sta, mods) {
  let v = f.attrs[k] * (0.45 + 0.55 * (sta / 100));
  if (k === "chin") {
    if (f.traits?.includes("Iron Chin")) v += 8;
    if (f.traits?.includes("Glass Jaw")) v -= 10;
  }
  return v * (mods?.[k] || 1);
}

// ── Ground position hierarchy ──
// Guard → Half Guard → Side Control → Mount → Back Mount
const GROUND = {
  guard:       { topGNP: 0.6, bottomSub: 0.4, sweepChance: 0.30, advanceChance: 0.25, label: "closed guard" },
  halfGuard:   { topGNP: 0.7, bottomSub: 0.3, sweepChance: 0.20, advanceChance: 0.30, label: "half guard" },
  sideControl: { topGNP: 0.85, bottomSub: 0.1, sweepChance: 0.10, advanceChance: 0.25, label: "side control" },
  mount:       { topGNP: 0.95, bottomSub: 0.05, sweepChance: 0.05, advanceChance: 0.15, label: "full mount" },
  backMount:   { topGNP: 0.3,  bottomSub: 0.0, sweepChance: 0.05, advanceChance: 0.0,  label: "back mount" },
};

const GROUND_ORDER = ["guard", "halfGuard", "sideControl", "mount", "backMount"];

// ── Exchange types ──
const EXCHANGES = {
  strike:  { pos: ["standing"],                label: "Striking exchange" },
  power:   { pos: ["standing"],                label: "Power shot" },
  clinch:  { pos: ["standing"],                label: "Clinch" },
  td:      { pos: ["standing"],                label: "Takedown" },
  gnp:     { pos: ["ground"],                  label: "Ground & pound" },
  sub:     { pos: ["ground"],                  label: "Submission" },
  scramble:{ pos: ["ground"],                  label: "Scramble" },
  sweep:   { pos: ["ground"],                  label: "Sweep" },
  advance: { pos: ["ground"],                  label: "Position advance" },
};

// ── Matchup modifier: archetype rock-paper-scissors ──
// Returns { striker: bonus, grappler: bonus } for fighter A vs B
function matchupMod(A, B) {
  const key = `${A.archetype}_vs_${B.archetype}`;
  const table = {
    "Boxer_vs_Wrestler":          { aStrike: 0.10, aTDDef: -0.15 },
    "Boxer_vs_BJJ Specialist":    { aStrike: 0.15, aTDDef: 0.10 },
    "Boxer_vs_Boxer":             { aStrike: -0.05 },
    "Muay Thai_vs_Wrestler":      { aClinch: 0.15, aTDDef: 0.05 },
    "Muay Thai_vs_BJJ Specialist":{ aClinch: 0.10, aTDDef: -0.10 },
    "Muay Thai_vs_Boxer":         { aStrike: -0.05, aClinch: 0.15 },
    "Wrestler_vs_Boxer":          { aTD: 0.20, aGNP: 0.10 },
    "Wrestler_vs_Muay Thai":      { aTD: 0.05, aGNP: 0.10 },
    "Wrestler_vs_BJJ Specialist": { aTD: 0.10, aSubRisk: 0.12 },
    "BJJ Specialist_vs_Wrestler": { aSub: 0.10, aSweep: 0.15 },
    "BJJ Specialist_vs_Muay Thai":{ aSub: 0.10, aSweep: 0.10 },
    "BJJ Specialist_vs_Boxer":    { aTD: -0.05, aSub: 0.05 },
  };
  return table[key] || {};
}

// ── Auto game plan: pick best plan based on stats ──
export function autoGamePlan(fighter, opponent) {
  const f = fighter.attrs; const o = opponent.attrs;
  if (f.wrestling > o.wrestling + 15) return "Take It Down";
  if (f.striking > o.striking + 12) return "Keep It Standing";
  if (f.bjj > o.bjj + 12 && o.wrestling < 50) return "Finish It";
  if (f.cardio > o.cardio + 10) return "Survive & Outpoint";
  if (f.fightIQ > o.fightIQ + 10) return "Keep It Standing";
  return "Balanced";
}

// ── Exchange picker with proper position awareness ──
function pickExchange(pos, A, planA, matchup) {
  const pool = [];
  const isGround = typeof pos === "object" && pos.type;
  const groundType = isGround ? pos.type : null;
  const isTop = isGround ? pos.top === "A" : false;

  if (!isGround) {
    // Standing
    pool.push("strike", "strike", "strike", "strike");
    pool.push("power");
    pool.push("clinch", "clinch");
    const tdWeight = A.attrs.wrestling > 55 || planA === "Take It Down" ? 4 : 1;
    for (let i = 0; i < tdWeight; i++) pool.push("td");
  } else {
    // Ground — exchange type depends on position and who's on top
    const g = GROUND[groundType] || GROUND.guard;
    const gnpW = isTop ? Math.round(g.topGNP * 8) : 0;
    const subW = isTop ? Math.round(clamp((A.attrs.bjj - 30) / 20, 1, 5)) : Math.round(g.bottomSub * 5);
    const sweepW = !isTop ? Math.round(g.sweepChance * 6) : 0;
    const advW = isTop ? Math.round(g.advanceChance * 4) : 0;

    for (let i = 0; i < gnpW; i++) pool.push("gnp");
    for (let i = 0; i < subW; i++) pool.push("sub");
    for (let i = 0; i < sweepW; i++) pool.push("sweep");
    for (let i = 0; i < advW; i++) pool.push("advance");
    pool.push("scramble", "scramble");
  }

  return pool.length > 0 ? pick(pool) : "strike";
}

// ── MAIN FIGHT ROUND ──
export function simRound(rnd, A, B, stA, stB, planA, cornerA, cutPenA, momentum = 0) {
  const summaryLog = [];
  const tickLog = [];
  let dmgA = 0, dmgB = 0, bodyDmgA = 0, bodyDmgB = 0, legDmgA = 0, legDmgB = 0;
  let ptsA = 0, ptsB = 0, finish = null, knockdown = null;
  let landA = 0, landB = 0;
  let position = "standing"; // "standing" or { type: "guard"|...|"backMount", top: "A"|"B" }
  let mom = momentum || 0;
  const agg = cornerA === "go" ? 1.25 : cornerA === "save" ? 0.8 : 1;
  const matchup = matchupMod(A, B);

  // Submission progress system (not binary)
  let subProgress = 0;
  const SUB_THRESHOLD = 100;

  const both = (min, sec, msg) => {
    const line = `[${min}:${String(sec).padStart(2, "0")}] ${msg}`;
    summaryLog.push(line); tickLog.push(line);
  };
  const tickOnly = (min, sec, msg) =>
    tickLog.push(`[${min}:${String(sec).padStart(2, "0")}] ${msg}`);

  both(0, 5, `Round ${rnd} — bell rings! ${A.name} vs ${B.name}!`);
  tickOnly(0, 10, `${A.name} in the center of the cage.`);
  tickOnly(0, 20, `${B.name} circling, looking for opening.`);

  // 6-9 exchanges per round (was 3-5)
  const nEx = RI(6, 9);
  for (let ex = 0; ex < nEx; ex++) {
    if (finish) break;
    const exMin = Math.floor(ex * 4.5 / nEx);
    const exSec = Math.floor((ex * 60 / nEx) % 60);
    const exType = pickExchange(position, A, planA, matchup);

    const momMult = clamp(1 + (mom > 0 ? mom * 0.0006 : mom * 0.0003), 0.90, 1.10);
    const phase = ex < 2 ? 0.7 : ex >= nEx - 2 ? 0.5 : 0.6;

    // ── STRIKING (stand-up punch/kick) ──
    if (exType === "strike" || exType === "power") {
      const pow = exType === "power" ? 1.5 : 1;
      const strikeModA = (matchup.aStrike || 0);
      const defA = effAttr(B, "footwork", stB, {}) * clamp(1 - (legDmgA || 0) * 0.003, 0.70, 1);
      const defB = effAttr(A, "footwork", stA, {}) * clamp(1 - (legDmgB || 0) * 0.003, 0.70, 1);
      const outA = effAttr(A, "striking", stA, {}) * agg * phase * momMult * pow * (1 + strikeModA);
      const outB = effAttr(B, "striking", stB, {}) * phase * pow;
      const la = Math.round(R(4, 10) * (outA / (outA + defA + 1)));
      const lb = Math.round(R(3, 8) * (outB / (outB + defB + 1)));
      const hitB = la * (effAttr(A, "strength", stA) / 50) * R(0.8, 1.3);
      const hitA = lb * (effAttr(B, "strength", stB) / 50) * R(0.8, 1.3);
      dmgB += hitB; dmgA += hitA;
      bodyDmgB += hitB * (cornerA === "body" ? 0.7 : 0.3);
      bodyDmgA += hitA * 0.3;
      legDmgB += hitB * (cornerA === "body" ? 0.5 : 0.15);
      legDmgA += hitA * 0.15;
      landA += la; landB += lb;
      ptsA += la + Math.round(hitB * 0.4);
      ptsB += lb + Math.round(hitA * 0.4);

      if (la + lb > 0) {
        both(exMin, exSec, `${A.name} landed ${la} strikes — ${B.name} ${lb}.`);
      }
      if (exType === "power" && la > lb + 3) {
        tickOnly(exMin, exSec + 5, `Big power shot from ${A.name}! ${B.name} felt that!`);
      }
      mom += (la - lb) * 2;

    // ── CLINCH (knees, elbows, dirty boxing) ──
    } else if (exType === "clinch") {
      const isThaiA = A.archetype === "Muay Thai";
      const isThaiB = B.archetype === "Muay Thai";
      const clinchModA = (matchup.aClinch || 0);
      const dmgThaiA = isThaiA ? R(4, 10) * (1 + clinchModA) : R(1, 4);
      const dmgThaiB = isThaiB ? R(4, 10) : R(1, 4);
      const outA = effAttr(A, "striking", stA, {}) * agg * (isThaiA ? 1.4 : 1) * (1 + clinchModA);
      const outB = effAttr(B, "striking", stB, {}) * (isThaiB ? 1.4 : 1);
      const la = Math.round(outA * R(0.3, 0.6));
      const lb = Math.round(outB * R(0.3, 0.6));
      dmgB += la * (isThaiA ? 1.8 : 1); dmgA += lb * (isThaiB ? 1.8 : 1);
      bodyDmgB += la * 0.5; bodyDmgA += lb * 0.5;
      landA += la; landB += lb;
      ptsA += Math.round(la * 1.2); ptsB += Math.round(lb * 1.2);

      if (la + lb > 0) {
        const descA = isThaiA ? "knees & elbows" : "dirty boxing";
        const descB = isThaiB ? "knees & elbows" : "dirty boxing";
        both(exMin, exSec, `Clinch — ${A.name} lands ${descA}, ${B.name} answers with ${descB}.`);
      }
      if (la > lb + 4) mom += 8;
      else if (lb > la + 4) mom -= 8;
      // Takedown from clinch
      if (random() < 0.25 && A.attrs.wrestling > 40) {
        position = { type: "halfGuard", top: "A" };
        tickOnly(exMin, exSec + 8, `${A.name} trips ${B.name} from the clinch — half guard!`);
        mom += 5;
      }

    // ── TAKEDOWN ──
    } else if (exType === "td") {
      const tdBonus = (matchup.aTD || 0) + (planA === "Take It Down" ? 0.18 : 0) + (cornerA === "tdd" ? -0.10 : 0);
      const tdDefBonus = (matchup.aTDDef || 0);
      const p = clamp(0.32 + (effAttr(A, "wrestling", stA, {}) - effAttr(B, "wrestling", stB, {})) / 110 + tdBonus + tdDefBonus, 0.05, 0.88);
      if (random() < p) {
        ptsA += 12; dmgB += R(3, 8);
        position = { type: "halfGuard", top: "A" };
        both(exMin, exSec + 10, `${A.name} shoots — takedown! Lands in half guard.`);
        mom += 12;
      } else {
        ptsB += 4; mom -= 8;
        both(exMin, exSec + 12, `${A.name} shoots — stuffed by ${B.name}!`);
        // Guillotine counter chance for BJJ specialist
        if (B.archetype === "BJJ Specialist" && random() < 0.10) {
          finish = { by: "B", how: "Submission" };
          both(exMin + 1, 0, `GUILLOTINE! ${B.name} catches the neck on the way in! IT'S OVER!`);
        }
      }

    // ── GROUND & POUND ──
    } else if (exType === "gnp") {
      const isTopA = position?.top === "A";
      const gType = position?.type || "guard";
      const g = GROUND[gType] || GROUND.guard;
      const gnpMult = g.topGNP + (matchup.aGNP || 0);
      const dmg = R(2, 8) * gnpMult;
      const attacker = isTopA ? A : B;
      if (isTopA) { dmgB += dmg; ptsA += Math.round(dmg * 0.8); mom += 4; bodyDmgB += dmg * 0.5; }
      else         { dmgA += dmg; ptsB += Math.round(dmg * 0.8); mom -= 4; bodyDmgA += dmg * 0.5; }
      both(exMin, exSec, `${attacker.name} landing ground and pound from ${g.label}.`);
      // Scramble chance
      if (random() < 0.35) {
        position = "standing";
        tickOnly(exMin, exSec + 8, `Scramble! Both fighters back to their feet!`);
      }

    // ── SUBMISSION (progressive system) ──
    } else if (exType === "sub") {
      const isTopA = position?.top === "A";
      const attacker = isTopA ? A : B;
      const defender = isTopA ? B : A;
      const gType = position?.type || "guard";
      const g = GROUND[gType] || GROUND.guard;
      const attackerSta = isTopA ? stA : stB;
      const defenderSta = isTopA ? stB : stA;

      // Position bonus: back mount >> mount >> side >> guard
      const posBonus = gType === "backMount" ? 35 : gType === "mount" ? 20 : gType === "sideControl" ? 10 : 5;
      const subMod = (matchup.aSub || 0);

      const adv = clamp(
        (effAttr(attacker, "bjj", attackerSta, {}) * 0.7 + effAttr(attacker, "strength", attackerSta, {}) * 0.15 + posBonus + subMod * 30)
        - (effAttr(defender, "bjj", defenderSta, {}) * 0.5 + effAttr(defender, "fightIQ", defenderSta, {}) * 0.3),
        -10, 45
      );

      subProgress += adv;

      if (subProgress >= SUB_THRESHOLD) {
        finish = { by: isTopA ? "A" : "B", how: "Submission" };
        both(exMin, exSec + 5, `SUBMISSION! ${attacker.name} sinks it in! IT'S OVER!`);
        tickOnly(exMin, exSec + 10, `${defender.name} has no choice but to tap!`);
      } else {
        tickOnly(exMin, exSec + 5, `${attacker.name} hunting for a submission — ${defender.name} defends. ${
          subProgress > 60 ? "It's getting tight!" : subProgress > 30 ? "Good attempt." : ""
        }`);
        if (isTopA) { ptsA += 5; mom += 2; } else { ptsB += 5; mom -= 2; }
        // Defender escape chance resets partial progress
        if (random() < 0.20) {
          subProgress = clamp(subProgress - RI(15, 30), 0, SUB_THRESHOLD);
          tickOnly(exMin, exSec + 10, `${defender.name} creates space — submission pressure eases.`);
        }
      }

    // ── SWEEP (bottom reverses position) ──
    } else if (exType === "sweep") {
      const isTopA = position?.top === "A";
      const sweeper = isTopA ? B : A;
      const sweepMod = (matchup.aSweep || 0);
      if (random() < 0.35 + sweepMod) {
        position = { type: "guard", top: isTopA ? "B" : "A" };
        both(exMin, exSec + 5, `${sweeper.name} sweeps! Position reversed!`);
        mom += isTopA ? -10 : 10;
      } else {
        tickOnly(exMin, exSec + 5, `${sweeper.name} tries to sweep — ${isTopA ? A.name : B.name} stays heavy.`);
      }

    // ── POSITION ADVANCE (top improves position) ──
    } else if (exType === "advance") {
      const gType = position?.type || "guard";
      const idx = GROUND_ORDER.indexOf(gType);
      const g = GROUND[gType] || GROUND.guard;
      if (idx >= 0 && idx < GROUND_ORDER.length - 1 && random() < g.advanceChance) {
        const next = GROUND_ORDER[idx + 1];
        position = { ...position, type: next };
        both(exMin, exSec + 5, `${position.top === "A" ? A.name : B.name} advances to ${GROUND[next].label}!`);
        mom += position.top === "A" ? 6 : -6;
      } else {
        tickOnly(exMin, exSec + 5, `${gType === "backMount" ? "Nowhere to go — " : ""}${position.top === "A" ? B.name : A.name} defends the position.`);
      }

    // ── SCRAMBLE ──
    } else if (exType === "scramble") {
      if (random() < 0.45) {
        position = "standing";
        both(exMin, exSec, `Scramble! Both fighters back up!`);
        mom += R(-2, 5);
      } else {
        both(exMin, exSec, `Scramble on the ground — positions unchanged.`);
        mom -= 2;
      }
    }

    // ── KNOCKDOWN CHECK (unchanged logic) ──
    if (!finish && !knockdown && (dmgA > 55 || dmgB > 55)) {
      const kdTarget = dmgA > dmgB ? A : B;
      const isTargetA = kdTarget === A;
      const chin = effAttr(kdTarget, "chin", isTargetA ? stA : stB);
      const kdChance = clamp(((isTargetA ? dmgA : dmgB) - 40) / chin * 0.3, 0, 0.35) * (planA === "Finish It" ? 1.5 : 1);
      if (random() < kdChance) {
        knockdown = { fighter: isTargetA ? "A" : "B", name: kdTarget.name, canRecover: true };
        both(exMin + 1, 0, `${kdTarget.name} IS DOWN! He's hurt bad!`);
        tickOnly(exMin + 1, 2, `The referee is watching closely...`);
        mom += isTargetA ? -25 : 25;
        if (random() < 0.25) {
          knockdown.canRecover = false;
          finish = { by: isTargetA ? "B" : "A", how: "KO/TKO" };
          both(exMin + 1, 5, `KO!! ${isTargetA ? B.name : A.name} with the walk-off!`);
        }
      }
    }
  }

  // ── ROUND END ──
  if (!finish) {
    tickOnly(4, 50, `Final seconds — ${A.name} looking for a home run.`);
    both(5, 0, `Round ${rnd} ends. Judges score this round.`);
  }

  // ── TRAIT COMMENTARY ──
  if (A.traits?.includes("Explosive") && rnd === 1) both(0, 25, `${A.name}'s explosive style on display early.`);
  if (A.traits?.includes("Iron Chin") && dmgA > 20) both(3, 10, `${A.name}'s iron chin holding up.`);
  if (B.traits?.includes("Glass Jaw") && dmgB > 25) both(3, 40, `${B.name} wobbles — that glass jaw!`);
  if (A.traits?.includes("Grinder") && rnd >= 3) both(3, 20, `${A.name}'s grinding pressure wearing ${B.name} down.`);
  if (A.traits?.includes("Showboat") && landA > 20) both(2, 15, `${A.name} showboating — crowd loves it!`);
  if (A.traits?.includes("Warrior") && dmgA > 40 && !finish) both(3, 0, `${A.name} keeps firing despite taking damage — true warrior spirit!`);

  // ── DAMAGE EFFECTS (strengthened) ──
  const bodyMultA = 1 + (bodyDmgA || 0) * 0.004; // was 0.003
  const bodyMultB = 1 + (bodyDmgB || 0) * 0.004;
  const legModA = clamp(1 - (legDmgA || 0) * 0.003, 0.65, 1); // was 0.002 / 0.85
  const legModB = clamp(1 - (legDmgB || 0) * 0.003, 0.65, 1);

  const drainA = R(10, 16) * agg * (planA === "Finish It" ? 1.3 : 1) * (planA === "Survive & Outpoint" ? 0.75 : 1) *
    (cornerA === "save" ? 0.70 : 1) * (65 / clamp(A.attrs.cardio * legModA, 30, 95)) * bodyMultA;
  const drainB = R(10, 16) * (65 / clamp(B.attrs.cardio * legModB, 30, 95)) * bodyMultB;

  mom = clamp(Math.round(mom * 0.65), -100, 100);

  return {
    log: summaryLog, tickLog,
    dmgA, dmgB, bodyDmgA, bodyDmgB, legDmgA, legDmgB,
    staA: clamp(stA - drainA, 5, 100),
    staB: clamp(stB - drainB, 5, 100),
    scoreA: ptsA, scoreB: ptsB,
    finish, knockdown, landA, landB,
    momentum: mom,
  };
}

export function prepFighter(f) {
  const c = JSON.parse(JSON.stringify(f));
  const mo = f.morale == null ? 60 : f.morale;
  const m = mo >= 75 ? 1.04 : mo < 40 ? 0.94 : 1;
  const a = f.age >= 37 ? 0.85 : f.age >= 34 ? 0.9 : f.age >= 31 ? 0.95 : f.age <= 21 ? 0.9 : 1;
  ATTRS.forEach((k) => { if (k !== "chin") c.attrs[k] = clamp(c.attrs[k] * m * a, 5, 99); });
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
