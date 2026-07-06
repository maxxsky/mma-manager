import { R, clamp, random } from "./rng.js";
import { ATTRS } from "./data.js";

// ---------- fight engine ----------
export function effAttr(f, k, sta, mods) {
  let v = f.attrs[k] * (0.45 + 0.55 * (sta / 100));
  if (k === "chin") {
    if (f.traits?.includes("Iron Chin")) v += 8;
    if (f.traits?.includes("Glass Jaw")) v -= 10;
  }
  return v * (mods?.[k] || 1);
}

export function simRound(rnd, A, B, stA, stB, planA, cornerA, cutPenA, momentum = 0) {
  const summaryLog = [];
  const tickLog = [];

  function planB(f) {
    return f.attrs.wrestling > f.attrs.striking ? "Take It Down" : "Keep It Standing";
  }

  const mkMods = (f, plan, corner) => {
    const m = { striking: 1, wrestling: 1, footwork: 1, cardio: 1 };
    if (plan === "Keep It Standing") { m.striking *= 1.15; m.footwork *= 1.1; }
    if (plan === "Take It Down") m.wrestling *= 1.2;
    if (plan === "Finish It") m.striking *= 1.12;
    if (corner === "body") m.striking *= 1.12;
    if (corner === "go") m.striking *= 1.2;
    if (f.traits?.includes("Explosive")) m.striking *= rnd === 1 ? 1.2 : rnd >= 3 ? 0.85 : 1;
    return m;
  };

  const mA = mkMods(A, planA, cornerA);
  const mB = mkMods(B, planB(B), null);
  let dmgA = 0, dmgB = 0, ptsA = 0, ptsB = 0, finish = null, landA = 0, landB = 0;
  const agg = cornerA === "go" ? 1.25 : cornerA === "save" ? 0.8 : 1;

  const both = (min, sec, msg) => {
    const line = `[${min}:${String(sec).padStart(2,"0")}] ${msg}`;
    summaryLog.push(line);
    tickLog.push(line);
  };
  const tickOnly = (min, sec, msg) => tickLog.push(`[${min}:${String(sec).padStart(2,"0")}] ${msg}`);

  both(0, 5, `Round ${rnd} - bell rings! ${A.name} vs ${B.name}!`);
  tickOnly(0, 10, `${A.name} in the center of the cage. Here we go!`);
  tickOnly(0, 20, `${B.name} circling to his left, looking for an opening.`);

  // Early exchange
  {
    const outA = effAttr(A, "striking", stA, mA) * agg * 0.6;
    const outB = effAttr(B, "striking", stB, mB) * 0.6;
    landA = Math.round(R(4, 9) * (outA / (outA + effAttr(B, "footwork", stB, mB))));
    landB = Math.round(R(4, 9) * (outB / (outB + effAttr(A, "footwork", stA, mA) * (cutPenA ? 0.95 : 1))));
    const hitB = landA * (effAttr(A, "strength", stA) / 55) * R(0.8, 1.3) * 0.6;
    const hitA = landB * (effAttr(B, "strength", stB) / 55) * R(0.8, 1.3) * 0.6;
    dmgB += hitB; dmgA += hitA;
    ptsA += landA + hitB; ptsB += landB + hitA;

    tickOnly(0, 45, `Jab from ${A.name}, probing.`);
    tickOnly(1, 10, `${A.name} flicks out a low kick to test the range.`);
    if (landA + landB > 0) {
      both(1, 15, `${A.name} landed ${landA}/${landA + landB} strikes - ${B.name} landed ${landB}.`);
    } else {
      both(1, 20, `Both fighters feeling each other out - few strikes exchanged.`);
    }
    tickOnly(1, 30, `${A.name} pawing with his lead hand, gauging distance.`);
  }

  // Takedown attempt
  {
    const tdBonusA = (planA === "Take It Down" ? 0.15 : 0) + (cornerA === "tdd" ? -0.1 : 0);
    const wantTdA = A.attrs.wrestling > 55 || planA === "Take It Down";
    const wantTdB = B.attrs.wrestling > 55;
    const tddA = cornerA === "tdd" ? 0.15 : 0;

    tickOnly(2, 0, `${A.name} changes levels... looking for something.`);

    if (wantTdA && random() < 0.6) {
      const p = clamp(0.35 + (effAttr(A, "wrestling", stA, mA) - effAttr(B, "wrestling", stB)) / 120 + tdBonusA, 0.05, 0.85);
      if (random() < p) {
        ptsA += 12; dmgB += R(3, 8);
        both(2, 30, `${A.name} shoots for a takedown - gets it! Top control.`);
        tickOnly(2, 35, `He's in half guard, looking to advance position.`);
        both(2, 50, `${A.name} working ground and pound.`);
        tickOnly(2, 55, `Short elbows from the top - ${B.name} covering up.`);
        if (random() < clamp((effAttr(A, "bjj", stA) - effAttr(B, "bjj", stB)) / 150 + 0.08, 0.02, 0.35)) {
          finish = { by: "A", how: "Submission" };
          both(3, 10, `SUBMISSION! ${A.name} locks in the choke! IT'S OVER!`);
          tickOnly(3, 10, `The crowd erupts! ${A.name} sinks it deep!`);
        }
      } else { ptsB += 4; both(2, 35, `${A.name} shoots for a takedown - stuffed by ${B.name}!`); }
    } else if (!finish && wantTdB && random() < 0.55) {
      const p = clamp(0.35 + (effAttr(B, "wrestling", stB, mB) - effAttr(A, "wrestling", stA, mA)) / 120 - tddA, 0.05, 0.85);
      if (random() < p) {
        ptsB += 12; dmgA += R(3, 8);
        both(2, 40, `${B.name} with a takedown! Now on top.`);
        tickOnly(2, 45, `${A.name} is on his back - needs to scramble.`);
        if (random() < clamp((effAttr(B, "bjj", stB) - effAttr(A, "bjj", stA)) / 150 + 0.08, 0.02, 0.35)) {
          finish = { by: "B", how: "Submission" };
          both(3, 5, `SUBMISSION! ${B.name} sinks it in! Fight over!`);
        }
      } else { ptsA += 4; both(2, 45, `${A.name} stuffs the takedown attempt.`); }
    }
  }

  // Late exchange
  if (!finish) {
    tickOnly(3, 0, `Both fighters show signs of fatigue.`);
    const outA = effAttr(A, "striking", stA, mA) * agg * 0.4;
    const outB = effAttr(B, "striking", stB, mB) * 0.4;
    landA = Math.round(R(3, 7) * (outA / (outA + effAttr(B, "footwork", stB, mB))));
    landB = Math.round(R(3, 7) * (outB / (outB + effAttr(A, "footwork", stA, mA) * (cutPenA ? 0.95 : 1))));
    const hitB = landA * (effAttr(A, "strength", stA) / 55) * R(0.7, 1.1) * 0.4;
    const hitA = landB * (effAttr(B, "strength", stB) / 55) * R(0.7, 1.1) * 0.4;
    dmgB += hitB; dmgA += hitA;
    ptsA += landA + hitB; ptsB += landB + hitA;

    if (landA + landB > 0) {
      both(3, 30, `${A.name} lands ${landA} more strikes in the closing moments.`);
      if (landB > 0) both(4, 0, `${B.name} fires back - ${landB} strikes.`);
    }
    tickOnly(4, 15, `Heavy breathing - both fighters digging deep.`);
    both(4, 30, `Fighters are in the clinch against the cage - round winding down.`);
    tickOnly(4, 50, `Ten seconds remaining - ${A.name} looking for a home run.`);
  }

  // KO check
  if (!finish) {
    const koB = clamp((dmgB + ptsA * 0.3) / (effAttr(B, "chin", stB) * 4.2), 0, 0.5) * (planA === "Finish It" ? 1.3 : 1);
    const koA = clamp((dmgA + ptsB * 0.3) / (effAttr(A, "chin", stA) * 4.2), 0, 0.5);
    if (random() < koB) { finish = { by: "A", how: "KO/TKO" }; both(4, 50, `KO!! ${A.name} drops ${B.name} with a massive shot! Referee steps in!`); tickOnly(4, 51, `${B.name} is out cold! The crowd is going crazy!`); }
    else if (random() < koA) { finish = { by: "B", how: "KO/TKO" }; both(4, 55, `KO!! ${B.name} connects cleanly! ${A.name} is out!`); tickOnly(4, 56, `Unbelievable! ${B.name} with the walk-off KO!`); }
  }

  if (!finish) both(5, 0, `Round ${rnd} ends. Judges will score this round.`);

  // Trait commentary (both summary + tick)
  if (A.traits?.includes("Explosive") && rnd === 1) both(0, 30, `${A.name}'s explosive style is on full display early.`);
  if (A.traits?.includes("Iron Chin") && dmgA > 15) both(3, 15, `${A.name}'s iron chin is holding up well after heavy blows.`);
  if (B.traits?.includes("Glass Jaw") && dmgB > 20) both(3, 45, `${B.name} wobbles - that glass jaw might be cracked!`);
  if (A.traits?.includes("Grinder") && rnd >= 3) both(3, 0, `${A.name}'s grinding pressure is wearing ${B.name} down.`);
  if (B.traits?.includes("Natural Talent") && rnd === 1) both(1, 0, `${B.name}'s natural gifts are on display - smooth technique.`);
  if (A.traits?.includes("Showboat") && landA + ptsA > 30) both(2, 10, `${A.name} is showboating! The crowd loves it!`);

  // Momentum update
  let mom = momentum;
  if (landA > landB + 5) mom += 15; else if (landB > landA + 5) mom -= 15;
  if (finish?.by === "A") mom += 30; else if (finish?.by === "B") mom -= 30;
  // Takedown momentum swing
  if (tickLog.some(l => l.includes("takedown") && l.includes(A.name))) mom += 10;
  if (tickLog.some(l => l.includes("takedown") && l.includes(B.name))) mom -= 10;
  // Submission attempt
  if (tickLog.some(l => l.includes("SUBMISSION"))) mom += 5;
  // Natural decay toward 0
  mom = clamp(mom - (mom > 0 ? 8 : -8), -100, 100);
  // Momentum commentary
  if (mom > 30) tickOnly(0, 25, `${A.name} is riding the momentum — he can feel it!`);
  if (mom < -30) tickOnly(0, 25, `${B.name} has the momentum now — ${A.name} needs a shift.`);

  const drainA = R(10, 16)
  const drainB = R(10, 16) * (65 / clamp(B.attrs.cardio, 30, 95));
  return {
    log: summaryLog, tickLog,
    dmgA, dmgB,
    staA: clamp(stA - drainA, 5, 100),
    staB: clamp(stB - drainB, 5, 100),
    scoreA: ptsA, scoreB: ptsB,
    finish, landA, landB,
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
