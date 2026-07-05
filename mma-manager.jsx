import React, { useState, useEffect, useRef } from "react";

/* ============================================================
   MMA MANAGER — "FIGHT NIGHT" UI v2
   Redesign: estetika broadcast PPV + fighting-game HUD.
   Logika gameplay identik dengan versi sebelumnya.
   ============================================================ */

// ---------- util ----------
const R = (a, b) => a + Math.random() * (b - a);
const RI = (a, b) => Math.floor(R(a, b + 1));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pick = (arr) => arr[RI(0, arr.length - 1)];
const fmt$ = (n) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
let UID = 1;
const uid = () => UID++;

// ---------- data ----------
const ATTRS = ["striking", "wrestling", "bjj", "footwork", "strength", "cardio", "chin", "fightIQ"];
const ATTR_LABEL = {
  striking: "Striking", wrestling: "Wrestling", bjj: "BJJ", footwork: "Footwork",
  strength: "Strength", cardio: "Cardio", chin: "Chin", fightIQ: "Fight IQ",
};

const WEIGHTS = [
  { name: "Flyweight", limit: 125 }, { name: "Bantamweight", limit: 135 },
  { name: "Featherweight", limit: 145 }, { name: "Lightweight", limit: 155 },
  { name: "Welterweight", limit: 170 }, { name: "Middleweight", limit: 185 },
  { name: "Light Heavyweight", limit: 205 }, { name: "Heavyweight", limit: 265 },
];

const ARCHETYPES = {
  Boxer: { striking: 1.3, footwork: 1.2, wrestling: 0.8, bjj: 0.7 },
  "Muay Thai": { striking: 1.35, strength: 1.1, bjj: 0.7, wrestling: 0.75 },
  Wrestler: { wrestling: 1.35, strength: 1.2, striking: 0.75, bjj: 0.95 },
  "BJJ Specialist": { bjj: 1.4, wrestling: 1.05, striking: 0.7, footwork: 0.85 },
  "All-Rounder": { fightIQ: 1.15 },
};
const ARCH_COLOR = {
  Boxer: "#e14b44", "Muay Thai": "#e88a3a", Wrestler: "#3f8fd4",
  "BJJ Specialist": "#9a6ae0", "All-Rounder": "#57b56b",
};

const REGIONS = {
  Brazil: { arch: "BJJ Specialist", first: ["Carlos", "Thiago", "Rafael", "Gilberto", "Marcio", "Renan"], last: ["Silva", "Oliveira", "Souza", "Costa", "Barbosa", "Lima"] },
  Russia: { arch: "Wrestler", first: ["Dmitri", "Islam", "Magomed", "Sergei", "Anatoly", "Zaur"], last: ["Volkov", "Petrov", "Nurmagov", "Ivanov", "Gadzhiev", "Orlov"] },
  USA: { arch: "Wrestler", first: ["Marcus", "Tyler", "Deshawn", "Cody", "Brandon", "Jake"], last: ["Johnson", "Miller", "Carter", "Reyes", "Brooks", "Hall"] },
  Netherlands: { arch: "Muay Thai", first: ["Rico", "Jasper", "Melvin", "Daan", "Sem", "Bram"], last: ["Verhoeven", "de Vries", "Bakker", "Visser", "Smit", "Mulder"] },
  Japan: { arch: "All-Rounder", first: ["Kenta", "Ryo", "Takeshi", "Yuki", "Shinya", "Kaito"], last: ["Sato", "Tanaka", "Yamamoto", "Kobayashi", "Aoki", "Mori"] },
  Nigeria: { arch: "All-Rounder", first: ["Kamaru", "Chidi", "Israel", "Emeka", "Tobi", "Sodiq"], last: ["Adesanya", "Okafor", "Usman", "Balogun", "Eze", "Ade"] },
  UK: { arch: "Boxer", first: ["Liam", "Callum", "Darren", "Owen", "Reece", "Kieran"], last: ["Edwards", "Till", "Pearson", "Aspinall", "Wood", "Hardy"] },
  Indonesia: { arch: "Boxer", first: ["Bima", "Raka", "Dimas", "Agus", "Yoga", "Rizky"], last: ["Saputra", "Wijaya", "Pratama", "Santoso", "Hidayat", "Nugroho"] },
};

const TRAITS = {
  "Iron Will": "Morale tidak anjlok saat kalah",
  "Glass Jaw": "Chin efektif -10 di fight",
  "Iron Chin": "Chin efektif +8 di fight",
  "Natural Talent": "Training speed +15%",
  "Team Player": "Chemistry camp +1/bulan",
  Diva: "Chemistry camp -1/bulan",
  "Crowd Favorite": "Popularity naik 2x",
  Warrior: "Bonus damage saat tertinggal",
  Cautious: "Risiko cedera -15%, finish rate turun",
  Explosive: "R1 kuat, output R3 turun 15%",
  Grinder: "Gain training konsisten, tanpa plateau",
  Showboat: "Popularity +5 per finish, defense -5%",
};
const TRAIT_KEYS = Object.keys(TRAITS);

const AMBITIONS = {
  "Belt Chaser": "Bahagia jika ranked; morale turun jika stuck unranked",
  Paycheck: "Morale naik setiap selesai fight (dibayar)",
  Legacy: "Morale naik ekstra saat mengalahkan lawan ranked",
  "Family Man": "Max 3 fight/tahun — lebih dari itu morale anjlok",
  Grinder: "Overtraining menumpuk 25% lebih lambat",
  "Star Power": "Popularity gain +50%; murung jika popularity rendah",
};
const AMBITION_KEYS = Object.keys(AMBITIONS);

// ---------- kontrak & agent (GDD Sec 8) ----------
const AGENT_TYPES = {
  none: { label: "Tanpa agent", cutFloor: 0.15, hardness: 0 },
  Budget: { label: "Budget Agent", cutFloor: 0.16, hardness: 0.4 },
  Standard: { label: "Standard Agent", cutFloor: 0.18, hardness: 0.7 },
  Power: { label: "Power Agent", cutFloor: 0.20, hardness: 1.0 },
};
// Agent ditentukan dari kualitas + popularity fighter saat digenerate/di-scout
function agentFor(f) {
  const q = avgSkill(f) + f.popularity * 0.5;
  if (q > 78) return "Power";
  if (q > 62) return "Standard";
  if (q > 48) return "Budget";
  return "none";
}
// Kontrak default saat generate (belum sign — diisi player saat negosiasi)
function defaultContract() {
  return { managerCut: 0.18, fightsLeft: 4, fightsTotal: 4, durationMo: 24, signedWeek: 0, renegoFlagged: false };
}

const GAME_PLANS = {
  "Take It Down": "Fokus takedown & top control",
  "Keep It Standing": "Jaga jarak, sprawl, volume striking",
  "Finish It": "Cari finish — stamina terbakar cepat",
  "Survive & Outpoint": "Defense & manajemen stamina",
};

const TRAINING = {
  striking: { label: "Striking", cost: 500, gains: ["striking", "footwork"] },
  grappling: { label: "Grappling", cost: 500, gains: ["wrestling", "bjj"] },
  conditioning: { label: "S&C", cost: 300, gains: ["strength", "cardio"] },
  sparring: { label: "Sparring", cost: 800, gains: ["fightIQ", "striking", "wrestling"] },
  recovery: { label: "Recovery", cost: 100, gains: [] },
  fightcamp: { label: "Fight Camp", cost: 1000, gains: ["fightIQ", "cardio"] },
};
const INTENSITY = {
  Light: { mult: 0.6, inj: 0, ot: 4 },
  Medium: { mult: 1.0, inj: 0.02, ot: 9 },
  Hard: { mult: 1.4, inj: 0.08, ot: 16 },
};

const COACH_SPECS = ["Striking", "Wrestling", "BJJ", "S&C", "Head"];
const COACH_NAMES = ["R. Mendez", "T. Okoye", "V. Kadyrov", "J. Halvorsen", "B. Siregar", "M. Duarte", "K. Ferreira", "A. Blackwood", "S. Yoon", "G. Petrossian"];

// ---------- generators ----------
function genAttrs(level) {
  const o = {};
  ATTRS.forEach((k) => (o[k] = clamp(Math.round(level * 60 + R(-12, 12)), 15, 95)));
  return o;
}
function genFighter(level, regionName) {
  const region = regionName || pick(Object.keys(REGIONS));
  const rd = REGIONS[region];
  const archetype = Math.random() < 0.55 ? rd.arch : pick(Object.keys(ARCHETYPES));
  const attrs = genAttrs(level);
  Object.entries(ARCHETYPES[archetype]).forEach(([k, m]) => {
    attrs[k] = clamp(Math.round(attrs[k] * m), 15, 95);
  });
  const ceilings = {};
  ATTRS.forEach((k) => (ceilings[k] = clamp(attrs[k] + RI(8, 30), attrs[k], 99)));
  const wc = pick(WEIGHTS);
  const traits = [];
  while (traits.length < 2) {
    const t = pick(TRAIT_KEYS);
    if (!traits.includes(t)) traits.push(t);
  }
  return {
    id: uid(),
    name: pick(rd.first) + " " + pick(rd.last),
    age: RI(18, 31), region, archetype,
    weightClass: wc.name, natWeight: Math.round(wc.limit * R(1.0, 1.09)),
    attrs, ceilings, traits,
    morale: RI(55, 80), popularity: RI(0, 25), overtraining: 0,
    injury: null,
    training: { type: "conditioning", intensity: "Medium" },
    booked: null,
    record: { w: 0, l: 0, ko: 0, sub: 0, dec: 0 },
    titles: [],
    ambition: pick(AMBITION_KEYS), ambitionRevealed: false,
    rankPoints: 0, joinedWeek: 0, lastFightWeek: 0, fightsThisYear: 0,
    streakL: 0, convincedOnce: false,
    agent: "none", contract: null,
    asking: Math.round(level * 8000 + R(500, 3000)),
  };
}
function assignAgent(f) { f.agent = agentFor(f); return f; }
function avgSkill(f) { return ATTRS.reduce((s, k) => s + f.attrs[k], 0) / ATTRS.length; }
function tierOf(f) { const a = avgSkill(f); return a < 45 ? "Prospect" : a < 60 ? "Pro" : a < 75 ? "Main Card" : "Elite"; }
function weeklyFee(f) { return { Prospect: 200, Pro: 500, "Main Card": 800, Elite: 1200 }[tierOf(f)]; }
function genCoach() {
  const skill = RI(2, 9);
  return { id: uid(), name: "Coach " + pick(COACH_NAMES), spec: pick(COACH_SPECS), skill, salary: skill * RI(1600, 2400) };
}
function gradeOf(v) { return v >= 85 ? "A+" : v >= 75 ? "A" : v >= 65 ? "B+" : v >= 55 ? "B" : v >= 45 ? "C+" : v >= 35 ? "C" : "D"; }
function scoutGrade(rep) { return rep >= 60 ? "S" : rep >= 40 ? "A" : rep >= 20 ? "B" : "C"; }
function makeReport(f, grade) {
  const err = { C: 18, B: 10, A: 5, S: 0 }[grade];
  const est = {};
  ATTRS.forEach((k) => {
    if (grade === "C" && (k === "chin" || k === "fightIQ")) est[k] = "?";
    else est[k] = gradeOf(clamp(f.attrs[k] + RI(-err, err), 10, 99));
  });
  const potAvg = ATTRS.reduce((s, k) => s + f.ceilings[k], 0) / ATTRS.length;
  const pot = grade === "C" ? "?" : "⭐".repeat(clamp(Math.round(potAvg / 20), 1, 5));
  const traits = grade === "S" ? f.traits : grade === "A" ? [f.traits[0]] : [];
  return { est, pot, traits, ambition: grade === "S" ? f.ambition : null };
}

// ---------- divisions & rankings ----------
function genDivisions() {
  const d = {};
  WEIGHTS.forEach((w) => {
    const list = [];
    for (let r = 1; r <= 15; r++) {
      const lvl = clamp(1.4 - r * 0.035, 0.8, 1.5);
      const nf = genFighter(lvl);
      list.push({ id: uid(), name: nf.name, archetype: nf.archetype, points: Math.round(100 - r * 5 + R(-2, 2)), level: lvl });
    }
    d[w.name] = { champ: { name: genFighter(1.5).name, player: false }, list };
  });
  return d;
}
function rankOf(g, f) {
  const div = g.divisions && g.divisions[f.weightClass];
  if (!div || !(f.rankPoints > 0)) return null;
  const better = div.list.filter((c) => c.points > f.rankPoints).length;
  return better < 15 ? better + 1 : null;
}
// Modifier morale & usia diterapkan sebagai salinan attrs saat fight
function prepFighter(f) {
  const c = JSON.parse(JSON.stringify(f));
  const mo = f.morale == null ? 60 : f.morale;
  const m = mo >= 75 ? 1.04 : mo < 40 ? 0.94 : 1;
  const a = f.age >= 37 ? 0.85 : f.age >= 34 ? 0.9 : f.age >= 31 ? 0.95 : f.age <= 21 ? 0.9 : 1;
  ATTRS.forEach((k) => { if (k !== "chin") c.attrs[k] = clamp(c.attrs[k] * m * a, 5, 99); });
  return c;
}
function vacateTitle(g, f) {
  const div = g.divisions && g.divisions[f.weightClass];
  if (div && div.champ.player && div.champ.fighterId === f.id) {
    div.champ = { name: genFighter(1.45).name, player: false };
    g.log.unshift(`👑 Title ${f.weightClass} vakum, lalu diisi juara baru.`);
  }
}
function stripTitle(g, fighterId) {
  const f = g.roster.find((x) => x.id === fighterId);
  if (!f) return;
  vacateTitle(g, f);
  f.titles = f.titles.filter((t) => t !== "Major World Champion");
  f.morale = clamp(f.morale - 15, 0, 100);
  g.rep = clamp(g.rep - 5, 0, 100);
  g.log.unshift(`🚨 ${f.name} dicopot dari title (mandatory defense diabaikan). Rep -5.`);
}

// ---------- fight engine (identik dengan v1) ----------
function effAttr(f, k, sta, mods) {
  let v = f.attrs[k] * (0.45 + 0.55 * (sta / 100));
  if (k === "chin") {
    if (f.traits?.includes("Iron Chin")) v += 8;
    if (f.traits?.includes("Glass Jaw")) v -= 10;
  }
  return v * (mods?.[k] || 1);
}
function simRound(rnd, A, B, stA, stB, planA, cornerA, cutPenA) {
  const log = [];
  function planB(f) { return f.attrs.wrestling > f.attrs.striking ? "Take It Down" : "Keep It Standing"; }
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
  let dmgA = 0, dmgB = 0, ptsA = 0, ptsB = 0, finish = null;
  const agg = cornerA === "go" ? 1.25 : cornerA === "save" ? 0.8 : 1;

  const outA = effAttr(A, "striking", stA, mA) * agg;
  const outB = effAttr(B, "striking", stB, mB);
  const landA = Math.round(R(8, 16) * (outA / (outA + effAttr(B, "footwork", stB, mB))));
  const landB = Math.round(R(8, 16) * (outB / (outB + effAttr(A, "footwork", stA, mA) * (cutPenA ? 0.95 : 1))));
  const hitB = landA * (effAttr(A, "strength", stA) / 55) * R(0.8, 1.3);
  const hitA = landB * (effAttr(B, "strength", stB) / 55) * R(0.8, 1.3);
  dmgB += hitB; dmgA += hitA;
  ptsA += landA + hitB; ptsB += landB + hitA;
  log.push(`Striking: ${landA} landed vs ${landB}.`);

  const tdBonusA = (planA === "Take It Down" ? 0.15 : 0) + (cornerA === "tdd" ? -0.1 : 0);
  const wantTdA = A.attrs.wrestling > 55 || planA === "Take It Down";
  const wantTdB = B.attrs.wrestling > 55;
  const tddA = cornerA === "tdd" ? 0.15 : 0;
  if (wantTdA && Math.random() < 0.6) {
    const p = clamp(0.35 + (effAttr(A, "wrestling", stA, mA) - effAttr(B, "wrestling", stB)) / 120 + tdBonusA, 0.05, 0.85);
    if (Math.random() < p) {
      ptsA += 12; dmgB += R(3, 8);
      log.push(`${A.name} mendapat takedown & kontrol atas.`);
      if (Math.random() < clamp((effAttr(A, "bjj", stA) - effAttr(B, "bjj", stB)) / 150 + 0.08, 0.02, 0.35)) {
        finish = { by: "A", how: "Submission" };
        log.push(`SUBMISSION! ${A.name} mengunci lawannya!`);
      }
    } else { ptsB += 4; log.push(`Takedown ${A.name} gagal — sprawl bagus.`); }
  }
  if (!finish && wantTdB && Math.random() < 0.55) {
    const p = clamp(0.35 + (effAttr(B, "wrestling", stB, mB) - effAttr(A, "wrestling", stA, mA)) / 120 - tddA, 0.05, 0.85);
    if (Math.random() < p) {
      ptsB += 12; dmgA += R(3, 8);
      log.push(`${B.name} membawa fight ke kanvas.`);
      if (Math.random() < clamp((effAttr(B, "bjj", stB) - effAttr(A, "bjj", stA)) / 150 + 0.08, 0.02, 0.35)) {
        finish = { by: "B", how: "Submission" };
        log.push(`SUBMISSION! ${B.name} menyelesaikan pertarungan!`);
      }
    } else { ptsA += 4; log.push(`${A.name} mempertahankan takedown.`); }
  }

  if (!finish) {
    const koB = clamp((dmgB + hitB) / (effAttr(B, "chin", stB) * 4.2), 0, 0.5) * (planA === "Finish It" ? 1.3 : 1);
    const koA = clamp((dmgA + hitA) / (effAttr(A, "chin", stA) * 4.2), 0, 0.5);
    if (Math.random() < koB) { finish = { by: "A", how: "KO/TKO" }; log.push(`KO!! ${A.name} menjatuhkan lawan!`); }
    else if (Math.random() < koA) { finish = { by: "B", how: "KO/TKO" }; log.push(`KO!! ${A.name} terjatuh dan wasit menghentikan fight.`); }
  }

  const drainA = R(10, 16) * agg * (planA === "Finish It" ? 1.25 : 1) * (planA === "Survive & Outpoint" ? 0.8 : 1) * (cornerA === "save" ? 0.75 : 1) * (65 / clamp(A.attrs.cardio, 30, 95));
  const drainB = R(10, 16) * (65 / clamp(B.attrs.cardio, 30, 95));
  return {
    log, dmgA, dmgB,
    staA: clamp(stA - drainA, 5, 100), staB: clamp(stB - drainB, 5, 100),
    scoreA: ptsA, scoreB: ptsB, finish, landA, landB,
  };
}

// ---------- initial state ----------
function newGame() {
  return {
    week: 1, cash: 100000, rep: 8, chemistry: 60,
    roster: [assignAgent(genFighter(0.55, "Indonesia")), assignAgent(genFighter(0.5))].map((f) => ({ ...f, contract: { managerCut: 0.18, fightsLeft: 4, fightsTotal: 4, durationMo: 24, signedWeek: 0, renegoFlagged: false } })),
    coaches: [{ ...genCoach(), salary: 0, freeUntil: 4, name: "Coach Basic", skill: 3, spec: "Head" }],
    coachMarket: [genCoach(), genCoach(), genCoach()],
    facilities: { mats: 1, ring: 1, weights: 1, medical: 1 },
    divisions: genDivisions(),
    inbox: [], log: ["Camp dibuka. Budget awal $100,000. Bertahanlah."],
    prospects: [], legacy: 0, over: null, won: false,
  };
}
const FAC_LABEL = { mats: "Training Mats", ring: "Boxing Ring", weights: "Weight Room", medical: "Medical Room" };

// ---------- tick logic (identik dengan v1) ----------
function coachBonus(g, gains) {
  let b = 1;
  g.coaches.forEach((c) => {
    const map = { Striking: ["striking", "footwork"], Wrestling: ["wrestling"], BJJ: ["bjj"], "S&C": ["strength", "cardio"], Head: ["fightIQ"] };
    if (gains.some((k) => (map[c.spec] || []).includes(k))) b += c.skill * 0.03;
  });
  return b;
}
function facBonus(g, gains) {
  let b = 1;
  if (gains.includes("wrestling") || gains.includes("bjj")) b += (g.facilities.mats - 1) * 0.06;
  if (gains.includes("striking")) b += (g.facilities.ring - 1) * 0.06;
  if (gains.includes("strength") || gains.includes("cardio")) b += (g.facilities.weights - 1) * 0.06;
  return b;
}
function tick(g) {
  g.week++;
  const chemMult = g.chemistry >= 80 ? 1.15 : g.chemistry < 40 ? 0.9 : 1;
  g.roster.forEach((f) => {
    if (!f.ambitionRevealed && g.week - (f.joinedWeek || 0) >= 8) {
      f.ambitionRevealed = true;
      g.log.unshift(`💭 Ambisi ${f.name} terungkap: ${f.ambition} — ${AMBITIONS[f.ambition]}.`);
    }
    f.morale = clamp(f.morale + (60 - f.morale) * 0.02, 0, 100);
    if (!f.booked && !f.injury && g.week - (f.lastFightWeek || 0) > 16) f.morale = clamp(f.morale - 0.5, 0, 100);
    if (f.injury) {
      f.injury.weeks--;
      if (f.injury.weeks <= 0) { f.injury = null; g.log.unshift(`✅ ${f.name} pulih dari cedera.`); }
      f.overtraining = clamp(f.overtraining - 10, 0, 100);
      return;
    }
    const t = f.booked ? TRAINING.fightcamp : TRAINING[f.training.type];
    const inten = INTENSITY[f.training.intensity];
    g.cash -= t.cost;
    if (f.training.type === "recovery" && !f.booked) {
      f.overtraining = clamp(f.overtraining - 30, 0, 100);
      f.morale = clamp(f.morale + 4, 0, 100);
    } else {
      const ageMult = f.age <= 21 ? 1.3 : f.age <= 26 ? 1.15 : f.age <= 30 ? 1 : f.age <= 33 ? 0.85 : 0.6;
      const otMult = f.overtraining < 25 ? 1 : f.overtraining < 50 ? 0.9 : f.overtraining < 75 ? 0.75 : 0.5;
      const traitMult = f.traits.includes("Natural Talent") ? 1.15 : 1;
      const moraleMult = f.morale >= 75 ? 1.1 : f.morale < 40 ? 0.85 : 1;
      t.gains.forEach((k) => {
        const cap = f.ceilings[k];
        const prog = f.attrs[k] / cap;
        const capMult = f.traits.includes("Grinder") ? 0.9 : prog < 0.7 ? 1 : prog < 0.9 ? 0.6 : 0.3;
        const gain = R(0.5, 1.4) * inten.mult * ageMult * otMult * traitMult * moraleMult * capMult * chemMult * coachBonus(g, [k]) * facBonus(g, [k]);
        f.attrs[k] = clamp(f.attrs[k] + gain, 0, cap);
      });
      f.overtraining = clamp(f.overtraining + inten.ot * (f.ambition === "Grinder" ? 0.75 : 1) - 8, 0, 100);
      let injP = inten.inj + (f.overtraining > 50 ? 0.05 : 0) + (f.overtraining > 75 ? 0.08 : 0);
      if (f.traits.includes("Cautious")) injP *= 0.85;
      injP *= 1 - (g.facilities.medical - 1) * 0.05;
      if (Math.random() < injP) {
        const sev = Math.random() < 0.7 ? { weeks: RI(1, 2), label: "Cedera ringan", cost: RI(500, 2000) } : { weeks: RI(3, 6), label: "Cedera sedang", cost: RI(2000, 8000) };
        f.injury = sev; g.cash -= sev.cost;
        f.morale = clamp(f.morale - 8, 0, 100);
        g.log.unshift(`🚑 ${f.name}: ${sev.label} saat latihan (${sev.weeks} minggu, biaya ${fmt$(sev.cost)}).`);
        if (f.booked) {
          g.log.unshift(`❌ Fight ${f.name} DIBATALKAN karena cedera. Relasi promotor turun.`);
          f.booked = null; g.rep = clamp(g.rep - 2, 0, 100);
        }
      }
      if (f.overtraining >= 90) {
        f.injury = { weeks: 2, label: "Breakdown (overtraining)" };
        f.morale = clamp(f.morale - 10, 0, 100);
        g.log.unshift(`⚠️ ${f.name} breakdown karena overtraining — istirahat paksa 2 minggu.`);
      }
    }
    g.cash += weeklyFee(f);
    if (f.booked) f.booked.weeksLeft--;
  });

  if (Math.random() < 0.22 && g.roster.length >= 2) {
    const [a, b] = [pick(g.roster), pick(g.roster)];
    if (a.id !== b.id) {
      g.inbox.unshift({
        id: uid(), type: "event", title: "Konflik sparring",
        body: `${a.name} dan ${b.name} clash saat sparring — suasana camp tegang.`,
        choices: [
          { label: "Pisahkan jadwal", chem: 2 },
          { label: "Biarkan selesai sendiri", gamble: [6, -8] },
          { label: "Mediasi", chem: 5 },
        ],
      });
    }
  }

  g.roster.forEach((f) => {
    if (f.injury || f.booked) return;
    const div = g.divisions[f.weightClass];
    const isChamp = div && div.champ.player && div.champ.fighterId === f.id;
    // Champion: hanya menerima mandatory defense tiap ±6 bulan
    if (isChamp) {
      if (g.week - (f.lastFightWeek || 0) >= 24 && !g.inbox.some((m) => m.type === "offer" && m.defense && m.fighterId === f.id)) {
        const c0 = div.list[0];
        const opp = genFighter(clamp((c0.level || 1.3) + 0.05, 0.8, 1.5));
        opp.name = c0.name; opp.archetype = c0.archetype; opp.weightClass = f.weightClass;
        opp.record = { w: RI(10, 18), l: RI(0, 3), ko: 0, sub: 0, dec: 0 };
        g.inbox.unshift({
          id: uid(), type: "offer", fighterId: f.id, expires: 3,
          tier: "Major", show: RI(150, 300) * 1000, winBonus: RI(150, 300) * 1000,
          opponent: opp, title: true, defense: true, oppRank: 1, contenderId: c0.id,
          titleTier: "Major", titleText: "🛡️ MANDATORY TITLE DEFENSE", weeks: RI(4, 6),
        });
        g.log.unshift(`🛡️ Mandatory defense untuk ${f.name} tiba — tolak atau biarkan expire = title dicopot.`);
      }
      return;
    }
    if (Math.random() < 0.35) {
      const rep = g.rep;
      const r = rankOf(g, f);
      const has = (t) => f.titles.includes(t);
      let titleTier = null;
      let titleReason = "";
      // Tangga berjenjang (GDD 12.2): Regional → National → Major.
      // Major hanya untuk yang SUDAH punya National title DAN rank ≤5 yang terverifikasi.
      if (rep >= 60 && r != null && r <= 5 && has("National Champion") && !has("Major World Champion") && Math.random() < 0.35) {
        titleTier = "Major"; titleReason = `rank #${r} + juara Nasional + rep ${Math.round(rep)}`;
      } else if (rep >= 40 && r != null && r <= 10 && has("Regional Champion") && !has("National Champion") && f.record.w >= 5 && Math.random() < 0.3) {
        titleTier = "National"; titleReason = `rank #${r} + juara Regional + ${f.record.w} menang`;
      } else if (rep >= 20 && f.record.w >= 3 && !has("Regional Champion") && Math.random() < 0.3) {
        titleTier = "Regional"; titleReason = `${f.record.w} menang + rep ${Math.round(rep)}`;
      }
      let tier, show;
      // CATATAN: tier di sini HANYA menentukan besar purse, TIDAK memberi title.
      // Title murni ditentukan oleh titleTier di atas.
      if (rep >= 60 && f.record.w >= 6) { tier = "Major"; show = RI(60, 200) * 1000; }
      else if (rep >= 40 && f.record.w >= 4) { tier = "National"; show = RI(12, 60) * 1000; }
      else if (rep >= 20 && f.record.w >= 2) { tier = "Regional"; show = RI(3, 12) * 1000; }
      else { tier = "Local"; show = RI(8, 30) * 100; }
      if (titleTier) show = Math.round(show * 1.5);
      // Lawan
      let opp, oppRank = null, contenderId = null;
      if (titleTier === "Major") {
        opp = genFighter(1.45); opp.name = div.champ.name; oppRank = 0; // sang juara
      } else if (div && ((r != null && Math.random() < 0.6) || (r == null && f.record.w >= 2 && rep >= 20 && Math.random() < 0.35))) {
        const idx = r != null ? clamp(r - 2 + RI(-1, 1), 0, 14) : RI(11, 14);
        const c = div.list[idx];
        opp = genFighter(clamp(c.level || 1, 0.5, 1.5));
        opp.name = c.name; opp.archetype = c.archetype;
        oppRank = idx + 1; contenderId = c.id;
      } else {
        opp = genFighter(clamp(avgSkill(f) / 60 + R(-0.08, 0.1), 0.3, 1.5));
      }
      opp.weightClass = f.weightClass;
      if (!opp.record.w) opp.record = { w: RI(2, 14), l: RI(0, 5), ko: 0, sub: 0, dec: 0 };
      if (titleTier) g.log.unshift(`📣 Title shot ${titleTier} untuk ${f.name} — syarat terpenuhi: ${titleReason}.`);
      g.inbox.unshift({
        id: uid(), type: "offer", fighterId: f.id, expires: 3,
        tier, show, winBonus: show, opponent: opp,
        title: titleTier === "Major", titleTier, oppRank, contenderId,
        titleText: titleTier === "Major" ? "🏆 MAJOR WORLD TITLE FIGHT" : titleTier === "National" ? "🥇 NATIONAL TITLE FIGHT" : titleTier === "Regional" ? "🥇 REGIONAL TITLE FIGHT" : null,
        weeks: RI(4, 6),
      });
    }
  });
  g.inbox = g.inbox.filter((m) => {
    if (m.type !== "offer") return true;
    m.expires--;
    if (m.expires <= 0 && m.defense) stripTitle(g, m.fighterId);
    return m.expires > 0;
  });

  if (g.week % 4 === 0) {
    let sal = 0;
    g.coaches.forEach((c) => { if (!c.freeUntil || g.week > c.freeUntil) sal += c.salary; });
    const facVal = Object.values(g.facilities).reduce((s, l) => s + l * 30000, 0);
    const maint = Math.round(facVal * 0.05);
    const sponsor = Math.round(g.rep * 500);
    const fSponsor = g.roster.reduce((s, f) => s + f.popularity * 150, 0);
    g.cash += sponsor + fSponsor - sal - maint;
    g.chemistry = clamp(g.chemistry + g.roster.filter((f) => f.traits.includes("Team Player")).length - g.roster.filter((f) => f.traits.includes("Diva")).length, 0, 100);
    g.log.unshift(`📊 Settlement bulanan: sponsor +${fmt$(sponsor + fSponsor)}, gaji coach -${fmt$(sal)}, maintenance -${fmt$(maint)}.`);
    if (Math.random() < 0.5) g.coachMarket = [genCoach(), genCoach(), genCoach()];
    // Kontender AI bergeser tiap bulan (simulasi fight mereka)
    Object.values(g.divisions).forEach((d) => d.list.forEach((c) => { c.points = clamp(c.points + RI(-3, 4), 5, 120); }));
    // Hook ambisi bulanan + permintaan release saat morale hancur
    g.roster.forEach((f) => {
      const r = rankOf(g, f);
      if (f.ambition === "Belt Chaser") {
        if (r) f.morale = clamp(f.morale + 3, 0, 100);
        else if (f.record.w >= 4) f.morale = clamp(f.morale - 3, 0, 100);
      }
      if (f.ambition === "Star Power" && f.popularity < 30) f.morale = clamp(f.morale - 2, 0, 100);
      // Kontrak habis → free agent (perpanjangan)
      if (f.contract && f.contract.fightsLeft <= 0 && !g.inbox.some((m) => m.extendFighterId === f.id)) {
        g.inbox.unshift({
          id: uid(), type: "event", extendFighterId: f.id,
          title: `${f.name} — kontrak habis`,
          body: `Fight commitment ${f.name} sudah terpenuhi. Dia kini free agent — perpanjang kontrak atau lepas.`,
          choices: [
            { label: "Negosiasi perpanjangan", openExtend: f.id },
            { label: "Lepas (jadi free agent)", release: f.id },
          ],
        });
      }
      // Renegotiation trigger: masuk Top 10 atau Diva, dan belum di-flag
      const rr = rankOf(g, f);
      if (f.contract && !f.contract.renegoFlagged && f.contract.fightsLeft > 0 && ((rr != null && rr <= 10) || f.traits.includes("Diva"))) {
        f.contract.renegoFlagged = true;
        const why = rr != null && rr <= 10 ? `masuk Top 10 (rank #${rr})` : "trait Diva";
        g.inbox.unshift({
          id: uid(), type: "event", extendFighterId: f.id,
          title: `${f.name} minta renegosiasi`,
          body: `${f.name} menuntut kontrak baru karena ${why}. Kalau diabaikan, morale-nya turun.`,
          choices: [
            { label: "Buka renegosiasi", openExtend: f.id },
            { label: "Tolak (morale -8)", moraleTo: { id: f.id, amt: -8 } },
          ],
        });
      }
      if (f.morale < 20 && !g.inbox.some((m) => m.releaseFighterId === f.id)) {
        const bonus = RI(3, 8) * 1000;
        g.inbox.unshift({
          id: uid(), type: "event", releaseFighterId: f.id,
          title: `${f.name} minta release`,
          body: `Morale sangat rendah (${Math.round(f.morale)}). Dia merasa tidak berkembang dan ingin keluar dari camp.`,
          choices: [
            { label: "Kabulkan release", release: f.id },
            { label: `Bonus retensi ${fmt$(bonus)}`, cash: -bonus, moraleTo: { id: f.id, amt: 30 } },
            { label: "Abaikan", chem: -5 },
          ],
        });
      }
    });
    // Tahunan: umur, chin decay, reset fight count, event pensiun
    if (g.week % 48 === 0) {
      g.roster.forEach((f) => {
        f.age++;
        f.fightsThisYear = 0;
        if (f.age >= 37) f.attrs.chin = clamp(f.attrs.chin - 6, 10, 99);
        else if (f.age >= 34) f.attrs.chin = clamp(f.attrs.chin - 4, 10, 99);
        else if (f.age >= 31) f.attrs.chin = clamp(f.attrs.chin - 2, 10, 99);
        if (f.age >= 35 && !g.inbox.some((m) => m.retireFighterId === f.id)) {
          const p = (f.age - 34) * 0.15 + ((f.streakL || 0) >= 3 ? 0.3 : 0);
          if (Math.random() < p) {
            g.inbox.unshift({
              id: uid(), type: "event", retireFighterId: f.id,
              title: `${f.name} mempertimbangkan pensiun`,
              body: `Usia ${f.age}, ${f.streakL || 0} kekalahan beruntun. Dia datang ke kantormu untuk bicara soal masa depannya.`,
              choices: [
                { label: "Hormati pensiun (rep +3)", retire: f.id },
                { label: "Bujuk satu run lagi", convince: f.id },
                { label: "Jadikan coach", toCoach: f.id },
              ],
            });
          }
        }
      });
    }
  }

  if (g.cash < -50000) g.over = "BANGKRUT — kas di bawah -$50,000. Camp ditutup.";
}

/* ============================================================
   UI SYSTEM — "ARENA BROADCAST"
   Palette: arena night, championship gold, red vs blue corner.
   Display face: Impact (fight-poster). Panel: cut-corner steel.
   ============================================================ */
const C = {
  bg: "#07090f", spot: "#141a28", panel: "#10151f", panel2: "#1a2130",
  line: "#26314a", gold: "#e6b64c", goldDim: "#8a6f2e",
  red: "#e14b44", blue: "#3f8fd4", green: "#57b56b",
  chalk: "#f2ead8", dim: "#8b97ad",
};
const DISPLAY = "'Impact','Haettenschweiler','Arial Narrow Bold',sans-serif";

const GlobalStyle = () => (
  <style>{`
    @keyframes rise { from { opacity:0; transform:translateY(8px);} to {opacity:1; transform:none;} }
    @keyframes belldrop { 0% {opacity:0; transform:scale(2.6) rotate(-14deg);} 60% {opacity:1; transform:scale(.95) rotate(-8deg);} 100% {transform:scale(1) rotate(-8deg);} }
    @keyframes pulsering { 0% { box-shadow:0 0 0 0 rgba(225,75,68,.55);} 100% { box-shadow:0 0 0 14px rgba(225,75,68,0);} }
    @keyframes goldglow { 0%,100% { text-shadow:0 0 8px rgba(230,182,76,.35);} 50% { text-shadow:0 0 22px rgba(230,182,76,.75);} }
    @keyframes weekpop { 0% {opacity:0; transform:translate(-50%,-40%) scale(.6);} 25% {opacity:1; transform:translate(-50%,-50%) scale(1.05);} 70% {opacity:1;} 100% {opacity:0; transform:translate(-50%,-58%) scale(1);} }
    @keyframes koflash { 0%,100% { opacity:0;} 15%,45% {opacity:.85;} }
    .rise { animation: rise .35s ease both; }
    button { -webkit-tap-highlight-color: transparent; }
    ::-webkit-scrollbar { width:6px; height:6px; } ::-webkit-scrollbar-thumb { background:#26314a; border-radius:3px; }
  `}</style>
);

const cut = (s = 12) => ({ clipPath: `polygon(0 0, calc(100% - ${s}px) 0, 100% ${s}px, 100% 100%, ${s}px 100%, 0 calc(100% - ${s}px))` });

const Card = ({ children, style, accent }) => (
  <div className="rise" style={{ position: "relative", background: `linear-gradient(160deg, ${C.panel2}, ${C.panel})`, padding: 14, marginBottom: 12, border: `1px solid ${accent || C.line}`, ...cut(12), ...style }}>
    {accent && <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: accent }} />}
    {children}
  </div>
);
const H = ({ children, color = C.gold }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
    <div style={{ width: 14, height: 3, background: color, transform: "skewX(-20deg)" }} />
    <div style={{ fontFamily: DISPLAY, fontSize: 14, letterSpacing: 2.5, textTransform: "uppercase", color }}>{children}</div>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.line}, transparent)` }} />
  </div>
);
const Btn = ({ children, onClick, color = C.gold, disabled, small, wide }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: disabled ? "#1b2331" : `linear-gradient(180deg, ${color}, ${color}cc)`,
    color: disabled ? "#4d5a70" : "#0a0d14",
    border: "none", padding: small ? "6px 12px" : "10px 18px",
    fontFamily: DISPLAY, fontSize: small ? 12 : 15, letterSpacing: 1.5, textTransform: "uppercase",
    cursor: disabled ? "default" : "pointer", width: wide ? "100%" : undefined,
    boxShadow: disabled ? "none" : `0 3px 0 #00000088`,
    ...cut(7),
  }}>{children}</button>
);
const Tag = ({ children, color = C.gold }) => (
  <span style={{ display: "inline-block", border: `1px solid ${color}66`, background: `${color}14`, color, fontSize: 10, padding: "1px 7px", letterSpacing: 1, textTransform: "uppercase", marginRight: 4, marginBottom: 2, transform: "skewX(-8deg)" }}>{children}</span>
);
// Bar bergaya fighting-game: segmented, bisa skew & mirror
const Bar = ({ v, max = 100, color, h = 8, skew, mirror }) => (
  <div style={{ position: "relative", background: "#04060b", height: h, overflow: "hidden", border: "1px solid #00000066", transform: skew ? "skewX(-16deg)" : undefined }}>
    <div style={{ position: "absolute", top: 0, bottom: 0, [mirror ? "right" : "left"]: 0, width: `${clamp((v / max) * 100, 0, 100)}%`, background: `linear-gradient(180deg, ${color}, ${color}99)`, transition: "width .5s cubic-bezier(.2,.8,.2,1)" }} />
    <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg, transparent 0 10px, rgba(0,0,0,.4) 10px 11px)" }} />
  </div>
);
const OVR = ({ f, size = 44 }) => (
  <div style={{ width: size, height: size + 8, background: `linear-gradient(180deg, ${C.gold}, #b8892f)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", ...cut(8), flexShrink: 0 }}>
    <div style={{ fontFamily: DISPLAY, fontSize: size * 0.48, color: "#0a0d14", lineHeight: 1 }}>{Math.round(avgSkill(f))}</div>
    <div style={{ fontSize: 8, fontWeight: 800, color: "#0a0d14aa", letterSpacing: 1 }}>OVR</div>
  </div>
);

/* ============================================================
   FIGHT NIGHT — full broadcast takeover
   ============================================================ */
function FightNight({ fighter, done }) {
  const [stage, setStage] = useState("weighin");
  const [plan, setPlan] = useState("Keep It Standing");
  const [rnd, setRnd] = useState(1);
  const [state, setSt] = useState(null);
  const [roundLog, setRoundLog] = useState(null);
  const [corner, setCornerState] = useState("plan");
  const cornerRef = useRef("plan");
  const setCorner = (k) => { cornerRef.current = k; setCornerState(k); };
  const [result, setResult] = useState(null);
  const [timer, setTimer] = useState(20);
  const opp = fighter.booked.opponent;
  const A = prepFighter(fighter);
  const B = prepFighter(opp);
  const totalRounds = fighter.booked.title ? 5 : 3;
  const limit = WEIGHTS.find((w) => w.name === fighter.weightClass).limit;
  const cutPct = (fighter.natWeight - limit) / fighter.natWeight;
  const cutInfo = cutPct < 0.03 ? { label: "Easy Cut", pen: 0 } : cutPct < 0.06 ? { label: "Moderate Cut · -5% stamina", pen: 5 } : { label: "Hard Cut · -10% stamina", pen: 10 };

  const runRound = (r, st, cornerChoice) => {
    const res = simRound(r, A, B, st.staA, st.staB, plan, cornerChoice, cutInfo.pen > 5);
    const newSt = {
      staA: res.staA, staB: res.staB,
      dmgA: st.dmgA + res.dmgA, dmgB: st.dmgB + res.dmgB,
      scores: [...st.scores, { a: res.scoreA, b: res.scoreB }],
    };
    setSt(newSt); setRoundLog(res);
    if (res.finish) { setResult({ won: res.finish.by === "A", how: res.finish.how, r }); setStage("result"); }
    else if (r >= totalRounds) {
      const winsA = newSt.scores.filter((s) => s.a >= s.b).length;
      setResult({ won: winsA > totalRounds / 2, how: "Decision", r }); setStage("result");
    } else setStage("corner");
  };
  const startFight = () => {
    const st0 = { staA: 100 - cutInfo.pen, staB: 100, dmgA: 0, dmgB: 0, scores: [] };
    setSt(st0); setStage("round");
    setTimeout(() => runRound(1, st0, "plan"), 60);
  };
  const nextRound = () => {
    const nr = rnd + 1; setRnd(nr); setStage("round");
    runRound(nr, state, cornerRef.current);
  };
  // 60s di GDD → 20s di prototype supaya pace tetap cepat
  useEffect(() => {
    if (stage !== "corner") return;
    setTimer(20);
    const iv = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(iv);
  }, [stage, rnd]);
  useEffect(() => { if (stage === "corner" && timer <= 0) nextRound(); }, [timer]); // eslint-disable-line

  const applyResult = () => {
    done((g2) => {
      const f = g2.roster.find((x) => x.id === fighter.id);
      const b = f.booked; f.booked = null;
      const purse = b.show + (result.won ? b.winBonus : 0);
      const cutRate = (f.contract && f.contract.managerCut) || 0.18;
      const cutC = Math.round(purse * cutRate);
      g2.cash += cutC;
      f.lastFightWeek = g2.week;
      f.fightsThisYear = (f.fightsThisYear || 0) + 1;
      if (f.contract) {
        f.contract.fightsLeft = Math.max(0, (f.contract.fightsLeft || 0) - 1);
      }
      const div = g2.divisions[f.weightClass];
      if (result.won) {
        f.record.w++; f.streakL = 0;
        if (result.how === "KO/TKO") f.record.ko++; else if (result.how === "Submission") f.record.sub++; else f.record.dec++;
        f.morale = clamp(f.morale + 12, 0, 100);
        const popMult = (f.traits.includes("Crowd Favorite") ? 2 : 1) * (f.ambition === "Star Power" ? 1.5 : 1);
        f.popularity = clamp(f.popularity + (result.how === "Decision" ? 3 : 7) * popMult, 0, 100);
        g2.rep = clamp(g2.rep + { Local: 1, Regional: 2, National: 4, Major: 7 }[b.tier], 0, 100);
        g2.chemistry = clamp(g2.chemistry + 1, 0, 100);
        g2.legacy += { Local: 50, Regional: 120, National: 300, Major: 600 }[b.tier];
        let pts = b.oppRank != null ? 8 + Math.max(0, 16 - b.oppRank) : 3;
        if (result.how !== "Decision") pts += 3;
        f.rankPoints = (f.rankPoints || 0) + pts;
        if (b.contenderId && div) { const c = div.list.find((x) => x.id === b.contenderId); if (c) c.points = Math.round(c.points * 0.75); }
        if (f.ambition === "Legacy" && b.oppRank != null) f.morale = clamp(f.morale + 5, 0, 100);
        g2.log.unshift(`🏆 ${f.name} MENANG via ${result.how} (R${result.r})! +${pts} ranking pts · camp cut ${fmt$(cutC)}.`);
        if (b.titleTier === "Major") {
          if (!f.titles.includes("Major World Champion")) f.titles.push("Major World Champion");
          if (div) div.champ = { name: f.name, player: true, fighterId: f.id };
          g2.rep = clamp(g2.rep + 20, 0, 100); g2.legacy += 2000; g2.won = true;
          g2.log.unshift(`👑 ${f.name} adalah MAJOR WORLD CHAMPION ${f.weightClass}!`);
        } else if (b.titleTier === "National") {
          f.titles.push("National Champion"); g2.rep = clamp(g2.rep + 10, 0, 100); g2.legacy += 800;
          g2.log.unshift(`🥇 ${f.name} merebut NATIONAL TITLE!`);
        } else if (b.titleTier === "Regional") {
          f.titles.push("Regional Champion"); g2.rep = clamp(g2.rep + 6, 0, 100); g2.legacy += 300;
          g2.log.unshift(`🥇 ${f.name} merebut REGIONAL TITLE!`);
        }
      } else {
        f.record.l++; f.streakL = (f.streakL || 0) + 1;
        f.rankPoints = Math.floor((f.rankPoints || 0) / 2);
        if (!f.traits.includes("Iron Will")) f.morale = clamp(f.morale - 14, 0, 100);
        g2.chemistry = clamp(g2.chemistry - (result.how === "KO/TKO" ? 5 : 2), 0, 100);
        g2.log.unshift(`❌ ${f.name} kalah via ${result.how} (R${result.r}). Ranking pts terpangkas setengah. Camp cut ${fmt$(cutC)}.`);
        if (b.defense) {
          if (div) div.champ = { name: b.opponent.name, player: false };
          f.titles = f.titles.filter((t) => t !== "Major World Champion");
          g2.log.unshift(`👑 Title ${f.weightClass} lepas ke ${b.opponent.name}.`);
        }
      }
      if (f.ambition === "Paycheck") f.morale = clamp(f.morale + 5, 0, 100);
      if (f.ambition === "Family Man" && f.fightsThisYear > 3) {
        f.morale = clamp(f.morale - 10, 0, 100);
        g2.log.unshift(`🏠 ${f.name} (Family Man): lebih dari 3 fight tahun ini — morale anjlok.`);
      }
      if (Math.random() < (result.won ? 0.15 : 0.35)) {
        const inj = { weeks: RI(2, 5), label: "Cedera dari fight" };
        f.injury = inj;
        g2.log.unshift(`🚑 Post-fight: ${f.name} cedera, ${inj.weeks} minggu pemulihan.`);
      }
    });
  };

  const cornerOpts = [
    { k: "tdd", label: "Stay on your feet", desc: "+takedown defense" },
    { k: "body", label: "Work the body", desc: "+output body shot" },
    { k: "go", label: "He's tired — GO NOW", desc: "+agresi, stamina terbakar" },
    { k: "save", label: "Conservative", desc: "hemat stamina" },
    { k: "plan", label: "Stick to game plan", desc: "jalankan rencana" },
  ];

  const hpA = state ? clamp(100 - state.dmgA, 0, 100) : 100;
  const hpB = state ? clamp(100 - state.dmgB, 0, 100) : 100;

  const StatVs = ({ label, a, b }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <div style={{ flex: 1 }}><Bar v={a} color={C.red} mirror /></div>
      <div style={{ width: 76, textAlign: "center", fontSize: 9, letterSpacing: 1.5, color: C.dim, textTransform: "uppercase" }}>{label}<div style={{ color: C.chalk, fontSize: 11, fontFamily: DISPLAY }}>{Math.round(a)} · {Math.round(b)}</div></div>
      <div style={{ flex: 1 }}><Bar v={b} color={C.blue} /></div>
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, overflowY: "auto", background: `radial-gradient(ellipse 90% 55% at 50% -5%, ${C.spot} 0%, ${C.bg} 60%)` }}>
      {/* spot beams */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "linear-gradient(115deg, transparent 42%, rgba(230,182,76,.05) 47%, transparent 53%), linear-gradient(65deg, transparent 42%, rgba(63,143,212,.05) 47%, transparent 53%)" }} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: 14, position: "relative" }}>

        {/* MARQUEE */}
        <div style={{ textAlign: "center", margin: "10px 0 14px" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 11, letterSpacing: 5, color: C.goldDim }}>{fighter.booked.tier.toUpperCase()} EVENT · {fighter.weightClass.toUpperCase()}</div>
          {fighter.booked.titleTier && <div style={{ fontFamily: DISPLAY, color: C.gold, fontSize: 16, letterSpacing: 3, animation: "goldglow 2s infinite" }}>★ {fighter.booked.defense ? "TITLE DEFENSE" : `${fighter.booked.titleTier.toUpperCase()} TITLE FIGHT`} ★</div>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 }}>
            <div style={{ flex: 1, textAlign: "right" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 22, color: C.red, lineHeight: 1, textTransform: "uppercase" }}>{fighter.name}</div>
              <div style={{ color: C.dim, fontSize: 11 }}>{fighter.record.w}-{fighter.record.l} · {fighter.archetype}</div>
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 26, color: C.gold, transform: "skewX(-10deg)", textShadow: "0 0 14px rgba(230,182,76,.5)" }}>VS</div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 22, color: C.blue, lineHeight: 1, textTransform: "uppercase" }}>{opp.name}</div>
              <div style={{ color: C.dim, fontSize: 11 }}>{opp.record.w}-{opp.record.l} · {opp.archetype}</div>
            </div>
          </div>
        </div>

        {/* HUD fighting-game saat fight berjalan */}
        {state && stage !== "weighin" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ flex: 1 }}><Bar v={hpA} color={hpA > 40 ? C.red : "#ff2216"} h={14} skew mirror /></div>
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: totalRounds }).map((_, i) => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i < state.scores.length ? (state.scores[i].a >= state.scores[i].b ? C.red : C.blue) : i === state.scores.length && stage !== "result" ? C.gold : "#232c40", boxShadow: i === state.scores.length && stage !== "result" ? `0 0 6px ${C.gold}` : "none" }} />
                ))}
              </div>
              <div style={{ flex: 1 }}><Bar v={hpB} color={C.blue} h={14} skew /></div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
              <div style={{ flex: 1 }}><Bar v={state.staA} color={C.green} h={5} skew mirror /></div>
              <div style={{ width: 56, textAlign: "center", fontSize: 8, letterSpacing: 1.5, color: C.dim }}>HP / STA</div>
              <div style={{ flex: 1 }}><Bar v={state.staB} color={C.green} h={5} skew /></div>
            </div>
          </div>
        )}

        {/* WEIGH-IN + TALE OF THE TAPE */}
        {stage === "weighin" && (
          <>
            <Card accent={C.gold}>
              <H>Tale of the Tape</H>
              <StatVs label="Striking" a={fighter.attrs.striking} b={opp.attrs.striking} />
              <StatVs label="Wrestling" a={fighter.attrs.wrestling} b={opp.attrs.wrestling} />
              <StatVs label="BJJ" a={fighter.attrs.bjj} b={opp.attrs.bjj} />
              <StatVs label="Cardio" a={fighter.attrs.cardio} b={opp.attrs.cardio} />
              <StatVs label="Chin" a={fighter.attrs.chin} b={opp.attrs.chin} />
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: cutInfo.pen ? C.red : C.green }}>
                ⚖️ Weigh-in: {fighter.natWeight} → {limit} lbs · <b>{cutInfo.label}</b>
              </div>
            </Card>
            <Card>
              <H>Game Plan</H>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.entries(GAME_PLANS).map(([k, d]) => (
                  <div key={k} onClick={() => setPlan(k)} style={{ border: `1px solid ${plan === k ? C.gold : C.line}`, background: plan === k ? "rgba(230,182,76,.08)" : "transparent", padding: 10, cursor: "pointer", ...cut(8) }}>
                    <div style={{ fontFamily: DISPLAY, color: plan === k ? C.gold : C.chalk, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>{k}</div>
                    <div style={{ color: C.dim, fontSize: 10, marginTop: 3 }}>{d}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12 }}><Btn wide color={C.red} onClick={startFight}>🔔 Bunyikan Bel</Btn></div>
            </Card>
          </>
        )}

        {/* ROUND LOG */}
        {(stage === "round" || stage === "corner") && roundLog && (
          <Card accent={C.line}>
            <H color={C.chalk}>Round {rnd} · Commentary</H>
            {roundLog.log.map((l, i) => (
              <div key={i} className="rise" style={{ animationDelay: `${i * 0.12}s`, color: l.includes("KO") || l.includes("SUB") ? C.gold : C.chalk, fontSize: 13, marginBottom: 6, paddingLeft: 10, borderLeft: `2px solid ${l.includes("KO") || l.includes("SUB") ? C.gold : C.line}` }}>{l}</div>
            ))}
          </Card>
        )}

        {/* CORNER DECISION */}
        {stage === "corner" && (
          <Card accent={C.gold} style={{ boxShadow: "0 0 30px rgba(230,182,76,.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontFamily: DISPLAY, color: C.gold, fontSize: 15, letterSpacing: 2 }}>🪑 CORNER — 60 DETIK</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 22, color: timer <= 5 ? C.red : C.chalk, minWidth: 40, textAlign: "right", animation: timer <= 5 ? "goldglow 1s infinite" : "none" }}>0:{String(Math.max(timer, 0)).padStart(2, "0")}</div>
            </div>
            <div style={{ color: C.dim, fontSize: 11, marginBottom: 8 }}>Instruksi untuk Round {rnd + 1} — kalau waktu habis, fighter jalan dengan game plan.</div>
            {cornerOpts.map((o) => (
              <div key={o.k} onClick={() => setCorner(o.k)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${corner === o.k ? C.gold : C.line}`, background: corner === o.k ? "rgba(230,182,76,.08)" : "transparent", padding: "8px 10px", marginBottom: 6, cursor: "pointer", ...cut(7) }}>
                <span style={{ fontFamily: DISPLAY, color: corner === o.k ? C.gold : C.chalk, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>“{o.label}”</span>
                <span style={{ color: C.dim, fontSize: 10 }}>{o.desc}</span>
              </div>
            ))}
            <Btn wide color={C.red} onClick={nextRound}>🔔 Round {rnd + 1}</Btn>
          </Card>
        )}

        {/* RESULT */}
        {stage === "result" && result && (
          <div style={{ position: "relative" }}>
            {result.how === "KO/TKO" && <div style={{ position: "fixed", inset: 0, background: "#fff", pointerEvents: "none", animation: "koflash .9s ease both" }} />}
            <Card accent={result.won ? C.gold : C.red} style={{ textAlign: "center", paddingTop: 26, paddingBottom: 22 }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 46, letterSpacing: 4, color: result.won ? C.gold : C.red, display: "inline-block", padding: "2px 18px", border: `3px solid ${result.won ? C.gold : C.red}`, animation: "belldrop .6s cubic-bezier(.2,1.4,.4,1) both", textTransform: "uppercase", ...cut(10) }}>
                {result.won ? "Victory" : "Defeat"}
              </div>
              <div style={{ color: C.chalk, fontSize: 14, margin: "14px 0 4px" }}>
                <b style={{ color: result.won ? C.red : C.blue }}>{result.won ? fighter.name : opp.name}</b> menang via {result.how} · Round {result.r}
              </div>
              {result.won && fighter.booked.title && <div style={{ fontFamily: DISPLAY, color: C.gold, fontSize: 18, letterSpacing: 2, animation: "goldglow 2s infinite" }}>👑 AND {fighter.booked.defense ? "STILL" : "NEW"} WORLD CHAMPION</div>}
              <div style={{ color: C.dim, fontSize: 12, margin: "8px 0 14px" }}>
                Purse {fmt$(fighter.booked.show + (result.won ? fighter.booked.winBonus : 0))} → camp cut {Math.round(((fighter.contract && fighter.contract.managerCut) || 0.18) * 100)}% = <b style={{ color: C.green }}>{fmt$((fighter.booked.show + (result.won ? fighter.booked.winBonus : 0)) * ((fighter.contract && fighter.contract.managerCut) || 0.18))}</b>
              </div>
              <Btn onClick={applyResult}>Kembali ke Camp</Btn>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   FIGHTER CARD — trading-card style
   ============================================================ */
function FighterCard({ f, g, up }) {
  const [open, setOpen] = useState(false);
  const ac = ARCH_COLOR[f.archetype];
  const r = rankOf(g, f);
  const div = g.divisions && g.divisions[f.weightClass];
  const isChamp = div && div.champ.player && div.champ.fighterId === f.id;
  return (
    <Card accent={ac}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <OVR f={f} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: DISPLAY, color: C.chalk, fontSize: 17, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {f.name} {f.titles.length > 0 && "👑"}
          </div>
          <div style={{ marginTop: 2 }}>
            <Tag color={ac}>{f.archetype}</Tag><Tag color={C.dim}>{f.weightClass}</Tag><Tag color={C.dim}>{f.age} th</Tag>{isChamp ? <Tag color={C.gold}>👑 Champ</Tag> : r ? <Tag color={C.gold}>Rank #{r}</Tag> : null}
          </div>
          <div style={{ color: C.dim, fontSize: 11, marginTop: 3 }}>
            {f.record.w}-{f.record.l} ({f.record.ko} KO · {f.record.sub} SUB) · {tierOf(f)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {f.injury ? <div style={{ color: C.red, fontFamily: DISPLAY, fontSize: 12, letterSpacing: 1 }}>🚑 {f.injury.weeks} MGG</div>
            : f.booked ? <div style={{ color: C.gold, fontFamily: DISPLAY, fontSize: 12, letterSpacing: 1 }}>🥊 T-{f.booked.weeksLeft}</div>
            : <div style={{ color: C.dim, fontSize: 11 }}>{TRAINING[f.training.type].label}</div>}
          <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>{open ? "▲" : "▼"}</div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
            {ATTRS.map((k) => (
              <div key={k}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: 1 }}>
                  <span>{ATTR_LABEL[k]}</span>
                  <span style={{ color: C.chalk, fontFamily: DISPLAY, fontSize: 12 }}>{Math.round(f.attrs[k])}<span style={{ color: "#42506a" }}>/{f.ceilings[k]}</span></span>
                </div>
                <Bar v={f.attrs[k]} color={f.attrs[k] / f.ceilings[k] > 0.9 ? C.gold : ac} h={6} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>{f.traits.map((t) => <Tag key={t} color={C.red}>{t}</Tag>)}</div>
          <div style={{ color: C.dim, fontSize: 10, marginTop: 3 }}>{f.traits.map((t) => `${t}: ${TRAITS[t]}`).join(" · ")}</div>
          <div style={{ color: C.dim, fontSize: 10, marginTop: 4 }}>
            🎯 Ambisi: {f.ambitionRevealed ? <span style={{ color: C.gold }}>{f.ambition} — {AMBITIONS[f.ambition]}</span> : <span>??? (terungkap setelah ±2 bulan di camp, atau lewat scout grade S)</span>}
          </div>
          {f.contract && (
            <div style={{ color: C.dim, fontSize: 10, marginTop: 4 }}>
              📄 Kontrak: cut <b style={{ color: C.chalk }}>{Math.round(f.contract.managerCut * 100)}%</b> · sisa <b style={{ color: f.contract.fightsLeft <= 1 ? C.red : C.chalk }}>{f.contract.fightsLeft}/{f.contract.fightsTotal}</b> fight · {f.contract.durationMo} bln · 🤝 {AGENT_TYPES[f.agent || "none"].label}
            </div>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: 1 }}>
            <div style={{ flex: 1 }}>Morale<Bar v={f.morale} color={f.morale > 60 ? C.green : C.red} h={6} /></div>
            <div style={{ flex: 1 }}>Overtraining<Bar v={f.overtraining} color={f.overtraining > 50 ? C.red : C.gold} h={6} /></div>
            <div style={{ flex: 1 }}>Popularity<Bar v={f.popularity} color={C.gold} h={6} /></div>
          </div>
          {!f.booked && !f.injury && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Program minggu ini · {fmt$(TRAINING[f.training.type].cost)}/mgg</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {Object.entries(TRAINING).filter(([k]) => k !== "fightcamp").map(([k, t]) => (
                  <button key={k} onClick={() => up((g2) => { g2.roster.find((x) => x.id === f.id).training.type = k; })}
                    style={{ background: f.training.type === k ? C.gold : C.panel2, color: f.training.type === k ? "#0a0d14" : C.chalk, border: `1px solid ${C.line}`, padding: "4px 9px", fontSize: 11, cursor: "pointer", fontFamily: DISPLAY, letterSpacing: 1, textTransform: "uppercase", ...cut(5) }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 5, marginTop: 6, alignItems: "center" }}>
                {Object.keys(INTENSITY).map((k) => (
                  <button key={k} onClick={() => up((g2) => { g2.roster.find((x) => x.id === f.id).training.intensity = k; })}
                    style={{ background: f.training.intensity === k ? C.red : C.panel2, color: f.training.intensity === k ? "#fff" : C.dim, border: `1px solid ${C.line}`, padding: "4px 9px", fontSize: 11, cursor: "pointer", fontFamily: DISPLAY, letterSpacing: 1, ...cut(5) }}>
                    {k.toUpperCase()}
                  </button>
                ))}
                <span style={{ color: C.dim, fontSize: 9 }}>keras = gain↑ risiko↑</span>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ============================================================
   MAIN APP
   ============================================================ */
const SAVE_KEY = "mma-manager-save-v3";

/* ============================================================
   NEGOTIATE MODAL — sign / extend contract (GDD Sec 8)
   ============================================================ */
function NegotiateModal({ fighter, mode, cash, onClose, onSign }) {
  // mode: "sign" (prospek baru) | "extend" (perpanjangan / renego)
  const ag = AGENT_TYPES[fighter.agent || "none"];
  const baseAsking = fighter.asking || 3000;
  const [signBonus, setSignBonus] = useState(mode === "extend" ? 0 : baseAsking);
  const [cut, setCut] = useState(mode === "extend" && fighter.contract ? Math.round(fighter.contract.managerCut * 100) : Math.round(ag.cutFloor * 100));
  const [fights, setFights] = useState(4);
  const [duration, setDuration] = useState(24);

  // Estimasi probabilitas fighter/agent menerima.
  // CATATAN JUJUR: formula ini kalibrasi perkiraan, belum di-playtest — kemungkinan butuh tuning.
  const cutPenalty = Math.max(0, cut / 100 - ag.cutFloor) * 100 * (2 + ag.hardness * 3); // cut tinggi = fighter enggan
  const bonusBoost = mode === "sign" ? (signBonus / baseAsking - 1) * 22 : signBonus / 1000 * 1.2;
  const fightsBoost = (fights >= 6 ? 6 : fights >= 4 ? 2 : -4) * (1 - ag.hardness * 0.3); // commitment panjang = rasa aman
  const hardnessDrag = ag.hardness * 10;
  const accept = clamp(Math.round(70 + bonusBoost + fightsBoost - cutPenalty - hardnessDrag), 3, 97);
  const tooPoor = signBonus > cash;

  const wrap = { position: "fixed", inset: 0, zIndex: 70, background: "rgba(6,9,14,.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 };
  const Row = ({ label, children, hint }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 11, letterSpacing: 1, color: C.dim, textTransform: "uppercase" }}>{label}</span>
        {hint && <span style={{ fontSize: 10, color: C.dim }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
  const Opt = ({ v, set, val, children }) => (
    <button onClick={() => set(val)} style={{ background: v === val ? C.gold : C.panel2, color: v === val ? "#0a0d14" : C.chalk, border: `1px solid ${C.line}`, padding: "6px 10px", fontSize: 12, cursor: "pointer", fontFamily: DISPLAY, letterSpacing: 1, ...cut(5) }}>{children}</button>
  );

  return (
    <div style={wrap} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: "100%", background: `linear-gradient(160deg, ${C.panel2}, ${C.panel})`, border: `1px solid ${C.gold}`, padding: 16, maxHeight: "90vh", overflowY: "auto", ...cut(14) }}>
        <H>{mode === "extend" ? "Perpanjangan Kontrak" : "Negosiasi Kontrak"}</H>
        <div style={{ fontFamily: DISPLAY, color: C.chalk, fontSize: 18, letterSpacing: 1, textTransform: "uppercase" }}>{fighter.name}</div>
        <div style={{ color: C.dim, fontSize: 11, marginBottom: 12 }}>
          {ag.label}{fighter.agent !== "none" && ` · minta cut ≥ ${Math.round(ag.cutFloor * 100)}% untukmu`}
          {fighter.agent === "Power" && " · agent agresif, tuntutan tinggi"}
        </div>

        <Row label="Manager Cut (bagianmu)" hint={`agent floor ${Math.round(ag.cutFloor * 100)}%`}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[15, 16, 18, 20, 22, 25].map((v) => <Opt key={v} v={cut} set={setCut} val={v}>{v}%</Opt>)}
          </div>
          <div style={{ fontSize: 10, color: C.dim, marginTop: 4 }}>Makin besar cut untukmu, makin enggan fighter tanda tangan.</div>
        </Row>

        <Row label={mode === "extend" ? "Bonus Perpanjangan" : "Signing Bonus"} hint={`asking ~${fmt$(baseAsking)}`}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(mode === "extend" ? [0, 2000, 5000, 10000, 20000] : [Math.round(baseAsking * 0.6), baseAsking, Math.round(baseAsking * 1.4), Math.round(baseAsking * 2)]).map((v) => (
              <Opt key={v} v={signBonus} set={setSignBonus} val={v}>{fmt$(v)}</Opt>
            ))}
          </div>
        </Row>

        <Row label="Fight Commitment">
          <div style={{ display: "flex", gap: 6 }}>{[2, 4, 6, 8].map((v) => <Opt key={v} v={fights} set={setFights} val={v}>{v} fight</Opt>)}</div>
        </Row>
        <Row label="Durasi">
          <div style={{ display: "flex", gap: 6 }}>{[12, 18, 24, 36].map((v) => <Opt key={v} v={duration} set={setDuration} val={v}>{v} bln</Opt>)}</div>
        </Row>

        <div style={{ background: "#0a0e17", padding: 10, margin: "6px 0 12px", ...cut(8) }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: C.dim, textTransform: "uppercase", letterSpacing: 1 }}>Estimasi diterima</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 20, color: accept >= 60 ? C.green : accept >= 35 ? C.gold : C.red }}>{accept}%</span>
          </div>
          <Bar v={accept} color={accept >= 60 ? C.green : accept >= 35 ? C.gold : C.red} h={6} />
          <div style={{ fontSize: 10, color: C.dim, marginTop: 6 }}>Estimasi, bukan jaminan — hasil akhir tetap ada unsur acak. Kalau ditolak, prospek hilang.</div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Btn small disabled={tooPoor} onClick={() => onSign({ signBonus, cut: cut / 100, fights, duration, accept })}>
            {tooPoor ? "Kas tak cukup" : mode === "extend" ? "Tawarkan" : "Ajukan Kontrak"}
          </Btn>
          <Btn small color={C.dim} onClick={onClose}>Batal</Btn>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [g, setG] = useState(newGame);
  const [tab, setTab] = useState("dashboard");
  const [activeFight, setActiveFight] = useState(null);
  const [weekFlash, setWeekFlash] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [rankDiv, setRankDiv] = useState(null);
  const [resetArm, setResetArm] = useState(false);
  const [nego, setNego] = useState(null); // {fighter, mode, prospectId?}
  useEffect(() => {
    (async () => {
      try {
        if (window.storage) {
          const r = await window.storage.get(SAVE_KEY);
          if (r && r.value) {
            const s = JSON.parse(r.value);
            if (!s.divisions) s.divisions = genDivisions();
            s.roster.forEach((f) => {
              if (!f.ambition) f.ambition = pick(AMBITION_KEYS);
              if (!f.agent) f.agent = agentFor(f);
              if (!f.contract) f.contract = { managerCut: 0.18, fightsLeft: 4, fightsTotal: 4, durationMo: 24, signedWeek: f.joinedWeek || 0, renegoFlagged: false };
            });
            setG(s);
          }
        }
      } catch (e) { /* belum ada save — mulai game baru */ }
      setLoaded(true);
    })();
  }, []);
  const up = (fn) => setG((old) => {
    const n = JSON.parse(JSON.stringify(old));
    fn(n);
    try { window.storage && window.storage.set(SAVE_KEY, JSON.stringify(n)).catch(() => {}); } catch (e) {}
    return n;
  });

  const advance = () => {
    up((n) => { tick(n); n.log = n.log.slice(0, 30); });
    setWeekFlash((x) => x + 1);
  };
  const dueList = g.roster.filter((f) => f.booked && f.booked.weeksLeft <= 0 && !f.injury);
  if (dueList.length > 0 && !activeFight && !g.over) setActiveFight(dueList[0].id);
  const fightFighter = activeFight ? g.roster.find((f) => f.id === activeFight) : null;

  const scout = (cost, level, label) => {
    up((n) => {
      n.cash -= cost;
      const grade = scoutGrade(n.rep);
      const f = assignAgent(genFighter(R(level[0], level[1])));
      n.prospects.unshift({ id: uid(), fighter: f, report: makeReport(f, grade), grade, method: label });
      n.prospects = n.prospects.slice(0, 5);
      n.log.unshift(`🔍 Scout report baru (${label}, grade ${grade}).`);
    });
  };

  const monthlyBurn = g.coaches.reduce((s, c) => s + ((!c.freeUntil || g.week > c.freeUntil) ? c.salary : 0), 0)
    + Math.round(Object.values(g.facilities).reduce((s, l) => s + l * 30000, 0) * 0.05)
    + g.roster.reduce((s, f) => s + (f.injury ? 0 : TRAINING[f.booked ? "fightcamp" : f.training.type].cost * 4), 0);
  const monthlyIn = g.roster.reduce((s, f) => s + weeklyFee(f) * 4, 0) + g.rep * 500 + g.roster.reduce((s, f) => s + f.popularity * 150, 0);

  const coachCap = g.rep >= 50 ? 3 : g.rep >= 10 ? 2 : 1;
  const tabs = [
    ["dashboard", "🏠", "Camp"], ["roster", "👥", "Roster"], ["rank", "🏆", "Rank"], ["scout", "🔍", "Scout"],
    ["inbox", "📨", `Inbox${g.inbox.length ? ` ${g.inbox.length}` : ""}`], ["mgmt", "🏗️", "Staff"],
  ];
  const Meter = ({ label, v, color }) => (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, letterSpacing: 1.5, color: C.dim, textTransform: "uppercase", marginBottom: 2 }}>
        <span>{label}</span><span style={{ color, fontFamily: DISPLAY, fontSize: 11 }}>{Math.round(v)}</span>
      </div>
      <Bar v={v} color={color} h={4} skew />
    </div>
  );

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <GlobalStyle />
      <div style={{ fontFamily: DISPLAY, color: C.gold, letterSpacing: 4, fontSize: 18, animation: "goldglow 1.5s infinite" }}>LOADING CAMP…</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse 100% 40% at 50% 0%, ${C.spot} 0%, ${C.bg} 70%)`, fontFamily: "ui-sans-serif, system-ui, sans-serif", paddingBottom: 84 }}>
      <GlobalStyle />

      {/* week flash */}
      {weekFlash > 0 && (
        <div key={weekFlash} style={{ position: "fixed", top: "40%", left: "50%", zIndex: 40, pointerEvents: "none", fontFamily: DISPLAY, fontSize: 40, letterSpacing: 6, color: C.gold, textShadow: "0 0 30px rgba(230,182,76,.6)", animation: "weekpop 1.1s ease both", textTransform: "uppercase" }}>
          Week {g.week}
        </div>
      )}

      {/* HEADER — marquee camp */}
      <div style={{ borderBottom: `2px solid ${C.gold}`, background: "linear-gradient(180deg, #10151f, #07090f)", padding: "12px 14px 10px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: DISPLAY, fontSize: 22, letterSpacing: 3, textTransform: "uppercase", background: `linear-gradient(180deg, #f6d98a, ${C.gold} 55%, #a37c2c)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 }}>
                Iron Path MMA
              </div>
              <div style={{ color: C.dim, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginTop: 3 }}>
                Y{Math.floor((g.week - 1) / 48) + 1} · Bulan {Math.floor(((g.week - 1) % 48) / 4) + 1} · Minggu {((g.week - 1) % 4) + 1}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 8, letterSpacing: 2, color: C.dim, textTransform: "uppercase" }}>Bank</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 20, color: g.cash < 0 ? C.red : C.chalk, lineHeight: 1 }}>{fmt$(g.cash)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <Meter label="Reputation" v={g.rep} color={C.gold} />
            <Meter label="Chemistry" v={g.chemistry} color={g.chemistry >= 60 ? C.green : C.red} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 8, letterSpacing: 1.5, color: C.dim, textTransform: "uppercase", marginBottom: 2 }}>Legacy</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 14, color: C.gold, lineHeight: 1 }}>★ {g.legacy.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: 12 }}>
        {g.won && (
          <Card accent={C.gold} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28 }}>👑</div>
            <div style={{ fontFamily: DISPLAY, color: C.gold, fontSize: 18, letterSpacing: 2, textTransform: "uppercase", animation: "goldglow 2s infinite" }}>World Class Camp</div>
            <div style={{ color: C.dim, fontSize: 12 }}>Win condition Gold tercapai — kejar Dynasty.</div>
          </Card>
        )}
        {g.over && (
          <Card accent={C.red} style={{ textAlign: "center", padding: 24 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 32, letterSpacing: 3, color: C.red, textTransform: "uppercase", display: "inline-block", border: `3px solid ${C.red}`, padding: "2px 16px", transform: "rotate(-6deg)", ...cut(8) }}>Game Over</div>
            <div style={{ color: C.chalk, fontSize: 13, margin: "14px 0" }}>{g.over}</div>
            <Btn onClick={() => setG(newGame())}>Mulai Ulang</Btn>
          </Card>
        )}

        {tab === "dashboard" && !g.over && (
          <>
            <Card>
              <H>Cash Flow</H>
              <div style={{ display: "flex", justifyContent: "space-between", color: C.chalk, fontSize: 13, marginBottom: 3 }}>
                <span>Estimasi masuk / bln</span><b style={{ color: C.green, fontFamily: DISPLAY }}>{fmt$(monthlyIn)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: C.chalk, fontSize: 13 }}>
                <span>Estimasi keluar / bln</span><b style={{ color: C.red, fontFamily: DISPLAY }}>{fmt$(monthlyBurn)}</b>
              </div>
              <div style={{ color: C.dim, fontSize: 11, marginTop: 6 }}>
                {monthlyIn < monthlyBurn ? "⚠️ Negatif — kamu butuh purse dari fight untuk bertahan." : "✅ Positif."} Bangkrut jika kas &lt; -$50K.
              </div>
            </Card>
            <Card accent={C.red}>
              <H color={C.red}>Fight Schedule</H>
              {g.roster.filter((f) => f.booked).length === 0 && <div style={{ color: C.dim, fontSize: 13 }}>Belum ada fight terjadwal — cek Inbox untuk offer promotor.</div>}
              {g.roster.filter((f) => f.booked).map((f) => (
                <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ color: C.chalk, fontSize: 13 }}>
                    <b style={{ color: C.red }}>{f.name}</b> <span style={{ color: C.gold, fontFamily: DISPLAY }}>vs</span> <b style={{ color: C.blue }}>{f.booked.opponent.name}</b> {f.booked.title && "🏆"}
                    <div style={{ color: C.dim, fontSize: 10 }}>{f.booked.tier} · show {fmt$(f.booked.show)}</div>
                  </div>
                  <div style={{ fontFamily: DISPLAY, color: C.gold, fontSize: 16 }}>T-{f.booked.weeksLeft}</div>
                </div>
              ))}
            </Card>
            <Card>
              <H>Camp Feed</H>
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                {g.log.map((l, i) => <div key={i} style={{ color: i === 0 ? C.chalk : C.dim, fontSize: 12, marginBottom: 5, paddingBottom: 5, borderBottom: `1px solid ${C.line}55` }}>{l}</div>)}
              </div>
            </Card>
          </>
        )}

        {tab === "roster" && g.roster.map((f) => <FighterCard key={f.id} f={f} g={g} up={up} />)}

        {tab === "rank" && (() => {
          const wc = rankDiv || (g.roster[0] && g.roster[0].weightClass) || "Lightweight";
          const div = g.divisions[wc];
          const combined = [
            ...div.list.map((c) => ({ name: c.name, points: c.points, player: false, arch: c.archetype })),
            ...g.roster.filter((f) => f.weightClass === wc && (f.rankPoints || 0) > 0 && !(div.champ.player && div.champ.fighterId === f.id)).map((f) => ({ name: f.name, points: f.rankPoints, player: true, arch: f.archetype })),
          ].sort((a, b) => b.points - a.points);
          const top = combined.slice(0, 15);
          const outside = combined.slice(15).filter((x) => x.player);
          const unranked = g.roster.filter((f) => f.weightClass === wc && !(f.rankPoints > 0) && !(div.champ.player && div.champ.fighterId === f.id));
          return (
            <>
              <Card>
                <H>Rankings · Divisi</H>
                <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 4 }}>
                  {WEIGHTS.map((w) => {
                    const has = g.roster.some((f) => f.weightClass === w.name);
                    return (
                      <button key={w.name} onClick={() => setRankDiv(w.name)} style={{ background: wc === w.name ? C.gold : C.panel2, color: wc === w.name ? "#0a0d14" : has ? C.chalk : C.dim, border: `1px solid ${C.line}`, padding: "4px 9px", fontSize: 10, cursor: "pointer", whiteSpace: "nowrap", fontFamily: DISPLAY, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0, ...cut(5) }}>
                        {w.name}{has ? " ●" : ""}
                      </button>
                    );
                  })}
                </div>
              </Card>
              <Card accent={C.gold}>
                <H>{wc} · Champion & Top 15</H>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", marginBottom: 8, background: "rgba(230,182,76,.08)", border: `1px solid ${C.gold}`, ...cut(8) }}>
                  <span style={{ fontFamily: DISPLAY, color: C.gold, fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>👑 {div.champ.name}</span>
                  <span style={{ fontSize: 10, color: div.champ.player ? C.green : C.dim, letterSpacing: 1 }}>{div.champ.player ? "CAMP KAMU" : "CHAMPION"}</span>
                </div>
                {top.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 8px", borderBottom: `1px solid ${C.line}44`, background: c.player ? "rgba(230,182,76,.07)" : "transparent" }}>
                    <span style={{ fontFamily: DISPLAY, color: c.player ? C.gold : C.dim, width: 28, fontSize: 14 }}>#{i + 1}</span>
                    <span style={{ flex: 1, color: c.player ? C.gold : C.chalk, fontSize: 13, fontWeight: c.player ? 700 : 400 }}>{c.name}{c.player ? " ★" : ""}</span>
                    <span style={{ color: C.dim, fontSize: 10 }}>{c.arch}</span>
                    <span style={{ fontFamily: DISPLAY, color: C.dim, fontSize: 12, width: 34, textAlign: "right" }}>{c.points}</span>
                  </div>
                ))}
                {outside.map((c, i) => (
                  <div key={"o" + i} style={{ color: C.dim, fontSize: 11, padding: "6px 8px" }}>Di luar Top 15: <b style={{ color: C.chalk }}>{c.name}</b> ({c.points} pts)</div>
                ))}
                {unranked.map((f) => (
                  <div key={f.id} style={{ color: C.dim, fontSize: 11, padding: "6px 8px" }}>Belum masuk ranking: <b style={{ color: C.chalk }}>{f.name}</b> — kalahkan lawan (terutama ranked) untuk poin.</div>
                ))}
                <div style={{ color: C.dim, fontSize: 10, marginTop: 8 }}>Menang = +poin (lebih besar vs ranked & via finish) · kalah = poin dipotong setengah · kontender AI bergeser tiap bulan · rank ≤5 + rep 60 membuka title shot.</div>
              </Card>
            </>
          );
        })()}

        {tab === "scout" && (
          <>
            <Card>
              <H>Scouting Network · Grade {scoutGrade(g.rep)}</H>
              <div style={{ color: C.dim, fontSize: 11, marginBottom: 8 }}>Grade laporan naik seiring reputasi camp — laporan grade rendah bisa meleset jauh.</div>
              {[
                ["Local Amateur Circuit", 0, [0.35, 0.6]],
                ["Regional Tryouts", 500, [0.5, 0.9]],
                ["National Scouting Trip", 2000, [0.8, 1.2]],
                ["Diamond in the Rough", 10000, [1.0, 1.45]],
              ].map(([label, cost, lvl]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.line}55` }}>
                  <div>
                    <div style={{ color: C.chalk, fontSize: 13, fontFamily: DISPLAY, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
                    <div style={{ color: C.dim, fontSize: 11 }}>{cost ? fmt$(cost) : "Gratis"}</div>
                  </div>
                  <Btn small disabled={g.cash < cost || g.roster.length >= 8} onClick={() => scout(cost, lvl, label)}>Kirim</Btn>
                </div>
              ))}
              {g.roster.length >= 8 && <div style={{ color: C.red, fontSize: 11, marginTop: 6 }}>Kapasitas camp penuh (8 fighter).</div>}
            </Card>
            {g.prospects.map((p) => (
              <Card key={p.id} accent={ARCH_COLOR[p.fighter.archetype]}>
                <H>Scouting Report · Grade {p.grade}</H>
                <div style={{ fontFamily: DISPLAY, color: C.chalk, fontSize: 16, letterSpacing: 1, textTransform: "uppercase" }}>{p.fighter.name}</div>
                <div style={{ margin: "4px 0" }}>
                  <Tag color={ARCH_COLOR[p.fighter.archetype]}>{p.fighter.archetype}</Tag>
                  <Tag color={C.dim}>{p.fighter.weightClass}</Tag><Tag color={C.dim}>{p.fighter.age} th</Tag><Tag color={C.dim}>{p.fighter.region}</Tag>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, margin: "10px 0" }}>
                  {ATTRS.map((k) => (
                    <div key={k} style={{ background: "#0a0e17", padding: "5px 6px", textAlign: "center", ...cut(5) }}>
                      <div style={{ fontSize: 8, color: C.dim, letterSpacing: 1, textTransform: "uppercase" }}>{ATTR_LABEL[k]}</div>
                      <div style={{ fontFamily: DISPLAY, fontSize: 15, color: p.report.est[k] === "?" ? C.dim : C.gold }}>{p.report.est[k]}</div>
                    </div>
                  ))}
                </div>
                <div style={{ color: C.dim, fontSize: 12 }}>
                  Potensi: <span style={{ color: C.gold }}>{p.report.pot}</span>
                  {p.report.ambition && <> · Ambisi: <b style={{ color: C.gold }}>{p.report.ambition}</b></>}
                  {p.report.traits.length > 0 && <> · {p.report.traits.map((t) => <Tag key={t} color={C.red}>{t}</Tag>)}</>}
                  {p.grade !== "S" && <span> · estimasi bisa meleset (grade {p.grade})</span>}
                </div>
                <div style={{ color: C.dim, fontSize: 11, marginTop: 4 }}>🤝 {AGENT_TYPES[p.fighter.agent || "none"].label}{p.fighter.agent === "Power" && " — tuntutan tinggi"} · asking ~{fmt$(p.fighter.asking)}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Btn small disabled={g.roster.length >= 8} onClick={() => setNego({ fighter: p.fighter, mode: "sign", prospectId: p.id })}>Negosiasi</Btn>
                  <Btn small color={C.dim} onClick={() => up((n) => { n.prospects = n.prospects.filter((x) => x.id !== p.id); })}>Pass</Btn>
                </div>
              </Card>
            ))}
          </>
        )}

        {tab === "inbox" && (
          <>
            {g.inbox.length === 0 && <Card><div style={{ color: C.dim, fontSize: 13 }}>Inbox kosong — advance minggu, offer & event akan datang.</div></Card>}
            {g.inbox.map((m) => {
              if (m.type === "offer") {
                const f = g.roster.find((x) => x.id === m.fighterId);
                if (!f || f.booked || f.injury) return null;
                return (
                  <Card key={m.id} accent={m.title ? C.gold : C.blue}>
                    <H color={m.title ? C.gold : C.blue}>{m.titleText || `Fight Offer · ${m.tier}`}</H>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "4px 0 8px" }}>
                      <span style={{ fontFamily: DISPLAY, color: C.red, fontSize: 15, textTransform: "uppercase" }}>{f.name}</span>
                      <span style={{ fontFamily: DISPLAY, color: C.gold, fontSize: 13 }}>VS</span>
                      <span style={{ fontFamily: DISPLAY, color: C.blue, fontSize: 15, textTransform: "uppercase" }}>{m.opponent.name}</span>
                    </div>
                    <div style={{ color: C.dim, fontSize: 11, textAlign: "center", marginBottom: 8 }}>
                      Lawan {m.oppRank ? <b style={{ color: C.gold }}>#{m.oppRank} </b> : m.oppRank === 0 ? <b style={{ color: C.gold }}>👑 </b> : ""}{m.opponent.record.w}-{m.opponent.record.l} ({m.opponent.archetype}) · Show <b style={{ color: C.chalk }}>{fmt$(m.show)}</b> + Win <b style={{ color: C.chalk }}>{fmt$(m.winBonus)}</b> · cut camp {Math.round(((f.contract && f.contract.managerCut) || 0.18) * 100)}% · T-{m.weeks} mgg · expire {m.expires} mgg{m.defense && <b style={{ color: C.red }}> · WAJIB — tolak = title dicopot</b>}
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                      <Btn small color={C.green} onClick={() => up((n) => {
                        const nf = n.roster.find((x) => x.id === m.fighterId);
                        nf.booked = { opponent: m.opponent, weeksLeft: m.weeks, show: m.show, winBonus: m.winBonus, tier: m.tier, title: m.title, titleTier: m.titleTier, defense: m.defense, oppRank: m.oppRank, contenderId: m.contenderId };
                        n.inbox = n.inbox.filter((x) => x.id !== m.id);
                        n.log.unshift(`📝 ${nf.name} menerima fight ${m.tier} vs ${m.opponent.name} — masuk Fight Camp.`);
                      })}>Accept</Btn>
                      <Btn small color={C.dim} onClick={() => up((n) => { n.inbox = n.inbox.filter((x) => x.id !== m.id); if (m.defense) stripTitle(n, m.fighterId); })}>Reject</Btn>
                    </div>
                  </Card>
                );
              }
              return (
                <Card key={m.id} accent={C.red}>
                  <H color={C.red}>⚡ {m.title}</H>
                  <div style={{ color: C.chalk, fontSize: 13, marginBottom: 10 }}>{m.body}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {m.choices.map((c, i) => (
                      <Btn key={i} small onClick={() => {
                        if (c.openExtend != null) {
                          const f = g.roster.find((x) => x.id === c.openExtend);
                          up((n) => { n.inbox = n.inbox.filter((x) => x.id !== m.id); });
                          if (f) setNego({ fighter: f, mode: "extend" });
                          return;
                        }
                        up((n) => {
                        n.inbox = n.inbox.filter((x) => x.id !== m.id);
                        const findF = (id) => n.roster.find((x) => x.id === id);
                        if (c.release != null) {
                          const f = findF(c.release);
                          if (f) { vacateTitle(n, f); n.roster = n.roster.filter((x) => x.id !== c.release); n.chemistry = clamp(n.chemistry - 5, 0, 100); n.log.unshift(`👋 ${f.name} di-release dari camp.`); }
                        } else if (c.retire != null) {
                          const f = findF(c.retire);
                          if (f) { vacateTitle(n, f); n.roster = n.roster.filter((x) => x.id !== c.retire); n.rep = clamp(n.rep + 3, 0, 100); n.log.unshift(`🎗️ ${f.name} pensiun dengan hormat. Rep +3.`); }
                        } else if (c.convince != null) {
                          const f = findF(c.convince);
                          if (f && f.morale >= 60 && !f.convincedOnce) {
                            f.convincedOnce = true; f.morale = clamp(f.morale - 10, 0, 100);
                            n.log.unshift(`🤝 ${f.name} setuju satu run terakhir (hanya bisa dibujuk sekali).`);
                          } else if (f) {
                            vacateTitle(n, f); n.roster = n.roster.filter((x) => x.id !== c.convince);
                            n.log.unshift(`🎗️ ${f.name} tetap pensiun — hatinya sudah bulat (butuh morale ≥60 untuk dibujuk).`);
                          }
                        } else if (c.toCoach != null) {
                          const f = findF(c.toCoach);
                          if (f) {
                            const cap2 = n.rep >= 50 ? 3 : n.rep >= 10 ? 2 : 1;
                            vacateTitle(n, f);
                            n.roster = n.roster.filter((x) => x.id !== c.toCoach);
                            if (n.coaches.length < cap2) {
                              const specMap = { Boxer: "Striking", "Muay Thai": "Striking", Wrestler: "Wrestling", "BJJ Specialist": "BJJ", "All-Rounder": "Head" };
                              const sk = clamp(Math.round(avgSkill(f) / 12), 2, 8);
                              n.coaches.push({ id: uid(), name: "Coach " + f.name.split(" ").pop(), spec: specMap[f.archetype], skill: sk, salary: sk * 1800 });
                              n.chemistry = clamp(n.chemistry + 5, 0, 100);
                              n.log.unshift(`👨‍🏫 ${f.name} pensiun dan jadi coach ${specMap[f.archetype]} (skill ${sk}).`);
                            } else n.log.unshift(`🎗️ Slot coach penuh — ${f.name} akhirnya pensiun biasa.`);
                          }
                        } else {
                          let d = c.chem || 0;
                          if (c.gamble) d = Math.random() < 0.5 ? c.gamble[0] : c.gamble[1];
                          n.chemistry = clamp(n.chemistry + d, 0, 100);
                          if (d) n.log.unshift(`Keputusan "${c.label}" → chemistry ${d >= 0 ? "+" : ""}${d}.`);
                        }
                        if (c.cash) n.cash += c.cash;
                        if (c.moraleTo) { const f = findF(c.moraleTo.id); if (f) { f.morale = clamp(f.morale + c.moraleTo.amt, 0, 100); n.log.unshift(`💰 Bonus retensi dibayar — morale ${f.name} naik.`); } }
                        });
                      }}>{c.label}</Btn>
                    ))}
                  </div>
                </Card>
              );
            })}
          </>
        )}

        {tab === "mgmt" && (
          <>
            <Card>
              <H>Coach Aktif · {g.coaches.length}/{coachCap} slot</H>
              {g.coaches.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: C.chalk, fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${C.line}55` }}>
                  <span>{c.name} <Tag>{c.spec}</Tag><span style={{ fontFamily: DISPLAY, color: C.gold }}> {c.skill}</span></span>
                  <span style={{ color: C.dim, fontSize: 11 }}>{c.freeUntil && g.week <= c.freeUntil ? "gratis (intro)" : fmt$(c.salary) + "/bln"}
                    {g.coaches.length > 1 && <button onClick={() => up((n) => { n.coaches = n.coaches.filter((x) => x.id !== c.id); n.chemistry = clamp(n.chemistry - 5, 0, 100); })} style={{ marginLeft: 8, background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 11 }}>pecat</button>}
                  </span>
                </div>
              ))}
              <div style={{ color: C.dim, fontSize: 10, marginTop: 6 }}>Slot bertambah dengan reputasi (rep 10 → 2 slot, rep 50 → 3 slot).</div>
            </Card>
            <Card>
              <H>Pasar Coach</H>
              {g.coachMarket.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.line}55` }}>
                  <div>
                    <div style={{ color: C.chalk, fontSize: 13 }}>{c.name} <Tag>{c.spec}</Tag><span style={{ fontFamily: DISPLAY, color: C.gold }}> {c.skill}</span></div>
                    <div style={{ color: C.dim, fontSize: 11 }}>{fmt$(c.salary)}/bulan</div>
                  </div>
                  <Btn small disabled={g.coaches.length >= coachCap} onClick={() => up((n) => {
                    n.coaches.push(c);
                    n.coachMarket = n.coachMarket.filter((x) => x.id !== c.id);
                    n.log.unshift(`👨‍🏫 ${c.name} (${c.spec}) direkrut.`);
                  })}>Hire</Btn>
                </div>
              ))}
            </Card>
            <Card>
              <H>Fasilitas · boost training +6%/level</H>
              {Object.entries(g.facilities).map(([k, lvl]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.line}55` }}>
                  <div>
                    <div style={{ color: C.chalk, fontSize: 13 }}>{FAC_LABEL[k]}</div>
                    <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                      {Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ width: 16, height: 5, background: i < lvl ? C.gold : "#1b2331", transform: "skewX(-16deg)" }} />)}
                    </div>
                  </div>
                  <Btn small disabled={lvl >= 5 || g.cash < lvl * 30000} onClick={() => up((n) => {
                    n.cash -= lvl * 30000; n.facilities[k]++; n.chemistry = clamp(n.chemistry + 5, 0, 100); n.rep = clamp(n.rep + 2, 0, 100);
                    n.log.unshift(`🏗️ ${FAC_LABEL[k]} upgrade ke L${lvl + 1}.`);
                  })}>{lvl >= 5 ? "MAX" : `⬆ ${fmt$(lvl * 30000)}`}</Btn>
                </div>
              ))}
              <div style={{ color: C.dim, fontSize: 10, marginTop: 6 }}>Maintenance bulanan = 5% dari total nilai fasilitas.</div>
            </Card>
            <Card>
              <H>Save Game</H>
              <div style={{ color: C.dim, fontSize: 12, marginBottom: 10 }}>
                Progress tersimpan otomatis setiap aksi. Catatan: penyimpanan bergantung pada dukungan storage di environment artifact — kalau tidak tersedia, game tetap jalan tapi progress hilang saat halaman ditutup.
              </div>
              {!resetArm ? (
                <Btn small color={C.red} onClick={() => setResetArm(true)}>Hapus Save & Mulai Baru</Btn>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small color={C.red} onClick={() => {
                    try { window.storage && window.storage.delete(SAVE_KEY).catch(() => {}); } catch (e) {}
                    setResetArm(false); setG(newGame());
                  }}>Yakin — Hapus Semua</Btn>
                  <Btn small color={C.dim} onClick={() => setResetArm(false)}>Batal</Btn>
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      {/* BOTTOM NAV — game menu */}
      {!g.over && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30, background: "linear-gradient(0deg, #05070c, #0b101ae6)", borderTop: `1px solid ${C.line}`, padding: "8px 10px calc(8px + env(safe-area-inset-bottom))" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ display: "flex", flex: 1, justifyContent: "space-around" }}>
              {tabs.map(([k, icon, label]) => (
                <button key={k} onClick={() => setTab(k)} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center", padding: "2px 4px", opacity: tab === k ? 1 : 0.55 }}>
                  <div style={{ fontSize: 18, filter: tab === k ? "drop-shadow(0 0 6px rgba(230,182,76,.7))" : "none" }}>{icon}</div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 9, letterSpacing: 1, color: tab === k ? C.gold : C.dim, textTransform: "uppercase" }}>{label}</div>
                  {tab === k && <div style={{ height: 2, background: C.gold, marginTop: 2, transform: "skewX(-20deg)" }} />}
                </button>
              ))}
            </div>
            <button onClick={advance} style={{ background: `linear-gradient(180deg, ${C.red}, #a3322c)`, border: "none", color: "#fff", fontFamily: DISPLAY, fontSize: 13, letterSpacing: 1.5, padding: "12px 16px", cursor: "pointer", animation: "pulsering 2s infinite", textTransform: "uppercase", ...cut(8) }}>
              ▶ Week
            </button>
          </div>
        </div>
      )}

      {nego && (
        <NegotiateModal
          fighter={nego.fighter} mode={nego.mode} cash={g.cash}
          onClose={() => setNego(null)}
          onSign={(deal) => {
            const success = Math.random() * 100 < deal.accept;
            up((n) => {
              if (nego.mode === "sign") {
                const prospect = n.prospects.find((x) => x.id === nego.prospectId);
                if (!prospect) return;
                if (success) {
                  const f = prospect.fighter;
                  n.cash -= deal.signBonus;
                  f.joinedWeek = n.week;
                  if (n.prospects.find((x) => x.id === nego.prospectId).grade === "S") f.ambitionRevealed = true;
                  f.contract = { managerCut: deal.cut, fightsLeft: deal.fights, fightsTotal: deal.fights, durationMo: deal.duration, signedWeek: n.week, renegoFlagged: false };
                  n.roster.push(f);
                  n.prospects = n.prospects.filter((x) => x.id !== nego.prospectId);
                  n.log.unshift(`✍️ ${f.name} teken kontrak: cut ${Math.round(deal.cut * 100)}%, ${deal.fights} fight, ${deal.duration} bln (bonus ${fmt$(deal.signBonus)}).`);
                } else {
                  n.prospects = n.prospects.filter((x) => x.id !== nego.prospectId);
                  n.log.unshift(`🚪 ${nego.fighter.name} menolak tawaran kontrak dan pergi ke camp lain.`);
                }
              } else {
                // extend / renego
                const f = n.roster.find((x) => x.id === nego.fighter.id);
                if (!f) return;
                if (success) {
                  n.cash -= deal.signBonus;
                  f.contract = { managerCut: deal.cut, fightsLeft: deal.fights, fightsTotal: deal.fights, durationMo: deal.duration, signedWeek: n.week, renegoFlagged: false };
                  f.morale = clamp(f.morale + 8, 0, 100);
                  n.log.unshift(`📝 ${f.name} perpanjang kontrak: cut ${Math.round(deal.cut * 100)}%, ${deal.fights} fight.`);
                } else {
                  f.morale = clamp(f.morale - 6, 0, 100);
                  n.log.unshift(`😤 ${f.name} menolak tawaran perpanjangan — morale turun. Coba lagi dengan syarat lebih baik.`);
                }
              }
            });
            setNego(null);
          }}
        />
      )}

      {fightFighter && fightFighter.booked && (
        <FightNight fighter={fightFighter} done={(fx) => {
          setActiveFight(null);
          setG((old) => {
            const n = JSON.parse(JSON.stringify(old));
            fx(n);
            try { window.storage && window.storage.set(SAVE_KEY, JSON.stringify(n)).catch(() => {}); } catch (e) {}
            // rantai: jika masih ada fight lain yang jatuh tempo, langsung buka
            const next = n.roster.find((f) => f.id !== fightFighter.id && f.booked && f.booked.weeksLeft <= 0 && !f.injury);
            if (next && !n.over) setTimeout(() => setActiveFight(next.id), 60);
            return n;
          });
        }} />
      )}
    </div>
  );
}
