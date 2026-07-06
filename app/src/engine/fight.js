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

// Exchange data: label, allowed position, generates commentary
const EXCHANGES = {
  strike: { pos: ["standing"], label: "Striking exchange" },
  power: { pos: ["standing"], label: "Power shot" },
  td: { pos: ["standing"], label: "Takedown" },
  clinch: { pos: ["standing"], label: "Clinch" },
  gnp: { pos: ["groundA", "groundB"], label: "Ground & pound" },
  sub: { pos: ["groundA", "groundB"], label: "Submission" },
  scramble: { pos: ["groundA", "groundB"], label: "Scramble" },
};

function pickExchange(position, A, planA) {
  const pool = [];
  if (position === "standing") pool.push("strike", "strike", "strike", "clinching", "power");
  if (position === "standing" && (A.attrs.wrestling > 55 || planA === "Take It Down")) pool.push("td", "td", "td");
  if (position === "groundA" || position === "groundB") pool.push("gnping", "gnping", "scramble");
  if ((position === "groundA" || position === "groundB") && A.attrs.bjj > 55) pool.push("sub");
  return pool.length > 0 ? pick(pool) : "strike";
}

export function simRound(rnd, A, B, stA, stB, planA, cornerA, cutPenA, momentum = 0) {
  const summaryLog = [];
  const tickLog = [];
  let dmgA = 0, dmgB = 0, bodyDmgA = 0, bodyDmgB = 0, legDmgA = 0, legDmgB = 0;
  let ptsA = 0, ptsB = 0, finish = null, knockdown = null;
  let landA = 0, landB = 0;
  let position = "standing";
  let mom = momentum || 0;
  const agg = cornerA === "go" ? 1.25 : cornerA === "save" ? 0.8 : 1;

  const both = (min, sec, msg) => {
    const line = `[${min}:${String(sec).padStart(2,"0")}] ${msg}`;
    summaryLog.push(line); tickLog.push(line);
  };
  const tickOnly = (min, sec, msg) => tickLog.push(`[${min}:${String(sec).padStart(2,"0")}] ${msg}`);

  both(0, 5, `Round ${rnd} — bell rings! ${A.name} vs ${B.name}!`);
  tickOnly(0, 10, `${A.name} in the center of the cage.`);
  tickOnly(0, 20, `${B.name} circling, looking for opening.`);

  // Pick 3-5 exchanges for this round
  const nEx = RI(3, 5);
  for (let ex = 0; ex < nEx; ex++) {
    if (finish) break;
    const exMin = Math.floor(ex * 4.5 / nEx);
    const exSec = (ex * 60 / nEx) % 60;
    const exType = pickExchange(position, A, planA);

    // Momentum bonus small
    const momMult = clamp(1 + (mom > 0 ? mom * 0.0005 : mom * 0.0003), 0.92, 1.08);
    const phase = (ex === 0 ? 0.7 : ex >= nEx - 2 ? 0.5 : 0.6); // early vs late output

    // Calc damage & points based on exchange type
    if (exType === "strike" || exType === "power") {
      const pow = exType === "power" ? 1.4 : 1;
      const defA = effAttr(B, "footwork", stB, {}) * (1 - (legDmgB || 0) * 0.002);
      const defB = effAttr(A, "footwork", stA, {}) * (1 - (legDmgA || 0) * 0.002);
      const outA = effAttr(A, "striking", stA, {}) * agg * phase * momMult * pow;
      const outB = effAttr(B, "striking", stB, {}) * phase * pow;
      const la = Math.round(R(4, 9) * (outA / (outA + defA + 1)));
      const lb = Math.round(R(3, 7) * (outB / (outB + defB + 1)));
      const hitB = la * (effAttr(A, "strength", stA) / 55) * R(0.8, 1.3);
      const hitA = lb * (effAttr(B, "strength", stB) / 55) * R(0.8, 1.3);
      dmgB += hitB; dmgA += hitA;
      bodyDmgB += hitB * (cornerA === "body" ? 0.7 : 0.3);
      bodyDmgA += hitA * 0.3;
      legDmgB += hitB * (cornerA === "body" ? 0.5 : 0.15);
      legDmgA += hitA * 0.15;
      landA += la; landB += lb;
      ptsA += la + hitB; ptsB += lb + hitA;

      if (la + lb > 0) {
        both(exMin, exSec, `${A.name} landed ${la} strikes — ${B.name} ${lb}.`);
      }
      if (exType === "power" && la > lb + 3) {
        tickOnly(exMin, exSec + 5, `Big power shot from ${A.name}! ${B.name} felt that!`);
      }
      if (la > lb + 4) mom += 10; else if (lb > la + 4) mom -= 10;

    } else if (exType === "td") {
      const wantB = B.attrs.wrestling > 55;
      const tdBonus = (planA === "Take It Down" ? 0.15 : 0) + (cornerA === "tdd" ? -0.1 : 0);
      const p = clamp(0.35 + (effAttr(A, "wrestling", stA, {}) - effAttr(B, "wrestling", stB)) / 120 + tdBonus, 0.05, 0.85);
      if (random() < p) {
        ptsA += 12; dmgB += R(3, 8); position = "groundA";
        both(exMin, exSec + 10, `${A.name} shoots for a takedown — gets it!`);
        tickOnly(exMin, exSec + 15, `He's in side control.`);
        mom += 12;
        // Sub attempt chance
        if (random() < clamp((effAttr(A, "bjj", stA) - effAttr(B, "bjj", stB)) / 150 + 0.06, 0.02, 0.3)) {
          finish = { by: "A", how: "Submission" };
          both(exMin + 1, 0, `SUBMISSION! ${A.name} locks in the choke! IT'S OVER!`);
          tickOnly(exMin + 1, 5, `The crowd erupts! ${B.name} has no choice but to tap!`);
        }
      } else {
        ptsB += 4; mom -= 8;
        both(exMin, exSec + 12, `${A.name} shoots — stuffed by ${B.name}!`);
      }
    } else if (exType === "gnp") {
      const attacker = position === "groundA" ? A : B;
      const isAttackerA = attacker === A;
      const dmg = R(2, 6);
      if (isAttackerA) { dmgB += dmg; ptsA += 8; mom += 5; bodyDmgB += dmg * 0.4; }
      else { dmgA += dmg; ptsB += 8; mom -= 5; bodyDmgA += dmg * 0.4; }
      both(exMin, exSec, `${attacker.name} working ground and pound.`);
      tickOnly(exMin, exSec + 5, `Short elbows from the top.`);
      // Scramble chance
      if (random() < 0.4) {
        position = "standing";
        tickOnly(exMin, exSec + 10, `Scramble! Both fighters back to their feet!`);
      }

    } else if (exType === "sub") {
      const onTop = position === "groundA" ? A : B;
      const isTopA = onTop === A;
      const subChance = clamp((effAttr(onTop, "bjj", isTopA ? stA : stB) - effAttr(isTopA ? B : A, "bjj", isTopA ? stB : stA)) / 150 + 0.05, 0.02, 0.3);
      if (random() < subChance) {
        finish = { by: isTopA ? "A" : "B", how: "Submission" };
        both(exMin, exSec + 5, `SUBMISSION! ${onTop.name} sinks it in!`);
      } else {
        tickOnly(exMin, exSec + 5, `${onTop.name} hunting for a submission — ${isTopA ? B.name : A.name} defends!`);
        if (isTopA) { ptsA += 6; mom += 3; } else { ptsB += 6; mom -= 3; }
      }
    } else if (exType === "scramble") {
      const scrambleWin = random() < 0.5;
      if (scrambleWin) { position = "standing"; both(exMin, exSec, `Scramble! Both fighters back up!`); mom += 3; }
      else { both(exMin, exSec, `Scramble on the ground — ${A.name} holds position.`); mom -= 2; }
    }

    // Knockdown check
    if (!finish && !knockdown && (dmgA > 50 || dmgB > 50)) {
      const kdTarget = dmgA > dmgB ? A : B;
      const isTargetA = kdTarget === A;
      const chin = effAttr(kdTarget, "chin", isTargetA ? stA : stB);
      const kdChance = clamp(((isTargetA ? dmgA : dmgB) - 40) / chin * 0.3, 0, 0.35) * (planA === "Finish It" ? 1.5 : 1);
      if (random() < kdChance) {
        knockdown = { fighter: isTargetA ? "A" : "B", name: kdTarget.name, canRecover: true };
        both(exMin + 1, 0, `${kdTarget.name} IS DOWN! He's hurt bad!`);
        tickOnly(exMin + 1, 2, `The referee is watching closely...`);
        mom += isTargetA ? -25 : 25;
        // Small chance it's a flash KO
        if (random() < 0.3) {
          knockdown.canRecover = false;
          finish = { by: isTargetA ? "B" : "A", how: "KO/TKO" };
          both(exMin + 1, 5, `KO!! ${isTargetA ? B.name : A.name} with the walk-off! No recovery possible!`);
        }
      }
    }
  }

  // Round end or early finish
  if (!finish) {
    tickOnly(4, 50, `Final seconds — ${A.name} looking for a home run.`);
    both(5, 0, `Round ${rnd} ends. Judges score this round.`);
  }

  // Trait commentary
  if (A.traits?.includes("Explosive") && rnd === 1) both(0, 25, `${A.name}'s explosive style on display early.`);
  if (A.traits?.includes("Iron Chin") && dmgA > 20) both(3, 10, `${A.name}'s iron chin holding up.`);
  if (B.traits?.includes("Glass Jaw") && dmgB > 25) both(3, 40, `${B.name} wobbles — that glass jaw!`);
  if (A.traits?.includes("Grinder") && rnd >= 3) both(3, 20, `${A.name}'s grinding pressure wearing ${B.name} down.`);
  if (A.traits?.includes("Showboat") && landA > 20) both(2, 15, `${A.name} showboating — crowd loves it!`);

  // Body damage effect: extra stamina drain
  const bodyDrainMultA = 1 + (bodyDmgA || 0) * 0.003;
  const bodyDrainMultB = 1 + (bodyDmgB || 0) * 0.003;
  // Leg damage effect: reduced footwork
  const legModA = clamp(1 - (legDmgA || 0) * 0.002, 0.85, 1);
  const legModB = clamp(1 - (legDmgB || 0) * 0.002, 0.85, 1);

  const drainA = R(10, 16) * agg * (planA === "Finish It" ? 1.25 : 1) * (planA === "Survive & Outpoint" ? 0.8 : 1) *
    (cornerA === "save" ? 0.75 : 1) * (65 / clamp(A.attrs.cardio * legModA, 30, 95)) * bodyDrainMultA;
  const drainB = R(10, 16) * (65 / clamp(B.attrs.cardio * legModB, 30, 95)) * bodyDrainMultB;

  // Momentum decay
  mom = clamp(Math.round(mom * 0.7), -100, 100);

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
