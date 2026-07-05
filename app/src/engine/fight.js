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

export function simRound(rnd, A, B, stA, stB, planA, cornerA, cutPenA) {
  const log = [];

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

  // Helper: log line with timestamp
  const tm = (min, sec, msg) => log.push(`[${min}:${String(sec).padStart(2,"0")}] ${msg}`);

  tm(0, 5, `Round ${rnd} — bell rings! ${A.name} vs ${B.name}!`);

  // Early exchange (first 2 min)
  {
    const phase = 0.6; // 60% output early
    const outA = effAttr(A, "striking", stA, mA) * agg * phase;
    const outB = effAttr(B, "striking", stB, mB) * phase;
    landA = Math.round(R(4, 9) * (outA / (outA + effAttr(B, "footwork", stB, mB))));
    landB = Math.round(R(4, 9) * (outB / (outB + effAttr(A, "footwork", stA, mA) * (cutPenA ? 0.95 : 1))));
    const hitB = landA * (effAttr(A, "strength", stA) / 55) * R(0.8, 1.3) * phase;
    const hitA = landB * (effAttr(B, "strength", stB) / 55) * R(0.8, 1.3) * phase;
    dmgB += hitB; dmgA += hitA;
    ptsA += landA + hitB; ptsB += landB + hitA;

    if (landA + landB > 0) {
      tm(1, 15, `${A.name} landed ${landA}/${landA + landB} strikes — ${B.name} landed ${landB}.`);
    } else {
      tm(1, 20, `Both fighters feeling each other out — few strikes exchanged.`);
    }
  }

  // Takedown attempt (mid-round)
  {
    const tdBonusA = (planA === "Take It Down" ? 0.15 : 0) + (cornerA === "tdd" ? -0.1 : 0);
    const wantTdA = A.attrs.wrestling > 55 || planA === "Take It Down";
    const wantTdB = B.attrs.wrestling > 55;
    const tddA = cornerA === "tdd" ? 0.15 : 0;

    if (wantTdA && random() < 0.6) {
      const p = clamp(0.35 + (effAttr(A, "wrestling", stA, mA) - effAttr(B, "wrestling", stB)) / 120 + tdBonusA, 0.05, 0.85);
      if (random() < p) {
        ptsA += 12; dmgB += R(3, 8);
        tm(2, 30, `${A.name} shoots for a takedown — gets it! Top control.`);
        tm(2, 50, `${A.name} working ground and pound.`);
        if (random() < clamp((effAttr(A, "bjj", stA) - effAttr(B, "bjj", stB)) / 150 + 0.08, 0.02, 0.35)) {
          finish = { by: "A", how: "Submission" };
          tm(3, 10, `SUBMISSION! ${A.name} locks in the choke! IT'S OVER!`);
        }
      } else { ptsB += 4; tm(2, 35, `${A.name} shoots for a takedown — stuffed by ${B.name}!`); }
    } else if (!finish && wantTdB && random() < 0.55) {
      const p = clamp(0.35 + (effAttr(B, "wrestling", stB, mB) - effAttr(A, "wrestling", stA, mA)) / 120 - tddA, 0.05, 0.85);
      if (random() < p) {
        ptsB += 12; dmgA += R(3, 8);
        tm(2, 40, `${B.name} with a takedown! Now on top.`);
        if (random() < clamp((effAttr(B, "bjj", stB) - effAttr(A, "bjj", stA)) / 150 + 0.08, 0.02, 0.35)) {
          finish = { by: "B", how: "Submission" };
          tm(3, 5, `SUBMISSION! ${B.name} sinks it in! Fight over!`);
        }
      } else { ptsA += 4; tm(2, 45, `${A.name} stuffs the takedown attempt.`); }
    }
  }

  // Late exchange (last 1.5 min) — only if no finish yet
  if (!finish) {
    const phase = 0.4; // 40% reduced output from fatigue
    const outA = effAttr(A, "striking", stA, mA) * agg * phase;
    const outB = effAttr(B, "striking", stB, mB) * phase;
    landA = Math.round(R(3, 7) * (outA / (outA + effAttr(B, "footwork", stB, mB))));
    landB = Math.round(R(3, 7) * (outB / (outB + effAttr(A, "footwork", stA, mA) * (cutPenA ? 0.95 : 1))));
    const hitB = landA * (effAttr(A, "strength", stA) / 55) * R(0.7, 1.1) * phase;
    const hitA = landB * (effAttr(B, "strength", stB) / 55) * R(0.7, 1.1) * phase;
    dmgB += hitB; dmgA += hitA;
    ptsA += landA + hitB; ptsB += landB + hitA;

    if (landA + landB > 0) {
      tm(3, 30, `${A.name} lands ${landA} more strikes in the closing moments.`);
      if (landB > 0) tm(4, 0, `${B.name} fires back — ${landB} strikes.`);
    }
    tm(4, 30, `Fighters are in the clinch against the cage — round winding down.`);
  }

  // KO check (only in late phase or if high damage)
  if (!finish) {
    const koB = clamp((dmgB + ptsA * 0.3) / (effAttr(B, "chin", stB) * 4.2), 0, 0.5) * (planA === "Finish It" ? 1.3 : 1);
    const koA = clamp((dmgA + ptsB * 0.3) / (effAttr(A, "chin", stA) * 4.2), 0, 0.5);
    if (random() < koB) { finish = { by: "A", how: "KO/TKO" }; tm(4, 50, `KO!! ${A.name} drops ${B.name} with a massive shot! Referee steps in!`); }
    else if (random() < koA) { finish = { by: "B", how: "KO/TKO" }; tm(4, 55, `KO!! ${B.name} connects cleanly! ${A.name} is out!`); }
  }

  // Round end
  if (!finish) tm(5, 0, `Round ${rnd} ends. Judges will score this round.`);

  // Trait commentary
  if (A.traits?.includes("Explosive") && rnd === 1) tm(0, 30, `${A.name}'s explosive style is on full display early.`);
  if (A.traits?.includes("Iron Chin") && dmgA > 15) tm(3, 15, `${A.name}'s iron chin is holding up well after heavy blows.`);
  if (B.traits?.includes("Glass Jaw") && dmgB > 20) tm(3, 45, `${B.name} wobbles — that glass jaw might be cracked!`);
  if (A.traits?.includes("Grinder") && rnd >= 3) tm(3, 0, `${A.name}'s grinding pressure is wearing ${B.name} down.`);
  if (B.traits?.includes("Natural Talent") && rnd === 1) tm(1, 0, `${B.name}'s natural gifts are on display — smooth technique.`);
  if (A.traits?.includes("Showboat") && landA + ptsA > 30) tm(2, 10, `${A.name} is showboating! The crowd loves it!`);

  const drainA = R(10, 16) * agg * (planA === "Finish It" ? 1.25 : 1) * (planA === "Survive & Outpoint" ? 0.8 : 1) * (cornerA === "save" ? 0.75 : 1) * (65 / clamp(A.attrs.cardio, 30, 95));
  const drainB = R(10, 16) * (65 / clamp(B.attrs.cardio, 30, 95));
  return {
    log, dmgA, dmgB,
    staA: clamp(stA - drainA, 5, 100),
    staB: clamp(stB - drainB, 5, 100),
    scoreA: ptsA, scoreB: ptsB,
    finish, landA, landB,
  };
}

// Modifier morale & usia diterapkan sebagai salinan attrs saat fight
export function prepFighter(f) {
  const c = JSON.parse(JSON.stringify(f));
  const mo = f.morale == null ? 60 : f.morale;
  const m = mo >= 75 ? 1.04 : mo < 40 ? 0.94 : 1;
  const a = f.age >= 37 ? 0.85 : f.age >= 34 ? 0.9 : f.age >= 31 ? 0.95 : f.age <= 21 ? 0.9 : 1;
  ATTRS.forEach((k) => { if (k !== "chin") c.attrs[k] = clamp(c.attrs[k] * m * a, 5, 99); });
  // Weight class delta: pindah kelas = size advantage/disadvantage
  const delta = f.weightClassDelta || 0;
  if (delta > 0) {
    // Naik kelas: lawan lbh besar → strength kurang efektif, footwork lbh ringan
    c.attrs.strength = clamp(c.attrs.strength * clamp(1 - delta * 0.02, 0.85, 1), 5, 99);
    c.attrs.footwork = clamp(c.attrs.footwork * clamp(1 + delta * 0.015, 1, 1.1), 5, 99);
  } else if (delta < 0) {
    // Turun kelas: size advantage → strength lbh efektif, footwork lbh berat (dehidrasi)
    c.attrs.strength = clamp(c.attrs.strength * clamp(1 + Math.abs(delta) * 0.02, 1, 1.1), 5, 99);
    c.attrs.footwork = clamp(c.attrs.footwork * clamp(1 - Math.abs(delta) * 0.015, 0.85, 1), 5, 99);
  }
  return c;
}
