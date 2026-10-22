// Fight harness — measures whether fights are fair before anyone tunes them.
//
// Why this exists: the fight tests used to check only the shape of a result
// ("winner is A or B", "same seed gives the same fight"). Side bias, decisions
// that ignored the rounds, and lopsided archetypes all passed those tests.
// This harness runs tens of thousands of fights and checks the numbers that
// say whether a fight is honest.
//
// Checked (exit 1 on failure):
//   1. Mirror: identical fighters with identical choices win about half the
//      time from side A, for every game plan x corner combination.
//   2. Side swap: two different fighters with AI corners on both sides. The
//      same fighter wins about as often from side A as from side B.
//   3. Decisions: the decision winner did not win fewer rounds than the loser,
//      except when a 10-8 round evened the scorecard.
//   4. Archetype win rate at equal OVR, 45-55% overall and separately
//      by OVR and fight length. Individual matchups can have style edges.
//   5. Mirror fighters carrying Warrior, Explosive or Cautious.
//
// Usage:  node tools/fight-balance.mjs [scale]
//   node tools/fight-balance.mjs        # default sample sizes
//   node tools/fight-balance.mjs 4      # 4x more fights, tighter numbers

import { runFight, prepFighter, autoGamePlan, aiCorner } from "../packages/engine/src/fight.js";
import { mulberry32 } from "../packages/engine/src/rng.js";
import { ATTRS } from "../packages/engine/src/data/attributes.js";
import { ARCHETYPES } from "../packages/engine/src/data/archetypes.js";

const SCALE = Number(process.argv[2] || 1);
if (!Number.isInteger(SCALE) || SCALE < 1) throw new Error("scale must be a positive integer");
const ARCHS = Object.keys(ARCHETYPES);
const PLANS = ["Balanced", "Take It Down", "Keep It Standing", "Finish It", "Survive & Outpoint"];
const CORNERS = ["neutral", "go", "save", "body", "target_cut", "stop_bleed", "clinch", "empty_tank"];
const OVR_LEVELS = [50, 65, 80];
const ROUND_COUNTS = [3, 5];

const MIRROR_PER_COMBO = 2000 * SCALE;
const SWAP_PER_PAIR_LEVEL = 400 * SCALE;

// --- fighters ----------------------------------------------------------------
// Builds a fighter of one archetype whose OVR (mean of the eight attributes)
// is the target. Each attribute gets some noise, then the archetype
// multipliers, then everything is shifted so the mean lands on the target.
// Only real attributes are used: archetype keys that are not attributes (for
// example Muay Thai "clinch") are ignored, so they do not distort OVR.
function buildFighter(id, archetype, ovr, rng) {
  const mult = ARCHETYPES[archetype];
  const raw = {};
  for (const k of ATTRS) raw[k] = (ovr + (rng() * 2 - 1) * 8) * (mult[k] ?? 1);
  const mean = ATTRS.reduce((s, k) => s + raw[k], 0) / ATTRS.length;
  const attrs = {};
  for (const k of ATTRS) attrs[k] = Math.max(15, Math.min(95, Math.round(raw[k] + ovr - mean)));
  return prepFighter({ id, name: id, archetype, age: 26, morale: 60, traits: [], attrs });
}

const ovrOf = (f) => ATTRS.reduce((s, k) => s + f.attrs[k], 0) / ATTRS.length;

// Use the same AI policy for both sides, including round 1 (P0 #5).
function aiPolicyA(planA, totalRounds) {
  return (_res, r, st) => aiCorner({
    rnd: r, totalRounds, staOwn: st.staA, staOpp: st.staB,
    cutOwn: st.cutA, cutOpp: st.cutB, momOwn: st.momentum, plan: planA,
  });
}
function aiPolicyB(planB, totalRounds) {
  return (_res, r, st) => aiCorner({
    rnd: r, totalRounds, staOwn: st.staB, staOpp: st.staA,
    cutOwn: st.cutB, cutOpp: st.cutA, momOwn: -st.momentum, plan: planB,
  });
}

// Plays A vs B with AI choices on both sides.
function aiFight(A, B, seed, totalRounds = 3) {
  const planA = autoGamePlan(A, B);
  const planB = autoGamePlan(B, A);
  return runFight(A, B, planA, aiPolicyA(planA, totalRounds), seed, totalRounds, {
    planB, cornerPolicyB: aiPolicyB(planB, totalRounds),
  });
}

// --- decisions -----------------------------------------------------------------
const decisions = { total: 0, fewerRounds: 0, unexplained: 0 };
function trackDecision(r) {
  if (r.how !== "Decision") return;
  decisions.total++;
  const rounds = r.scorecard.rounds;
  const won = rounds.filter((x) => x.winner === r.winner).length;
  const lost = rounds.filter((x) => x.winner !== "draw" && x.winner !== r.winner).length;
  if (lost > won) {
    decisions.fewerRounds++;
    if (!rounds.some((x) => x.a === 8 || x.b === 8)) decisions.unexplained++;
  }
}

// --- 1. mirror -----------------------------------------------------------------
const pct = (x) => (x * 100).toFixed(1).padStart(5) + "%";
const t0 = Date.now();
console.log(`Fight harness — scale ${SCALE}\n`);
console.log(`1. Mirror: identical fighters, same plan and corner, ${MIRROR_PER_COMBO} fights per cell. Side A win %`);
console.log("   " + "".padEnd(20) + CORNERS.map((c) => c.padStart(12)).join(""));

let mirrorWinsA = 0, mirrorTotal = 0;
let mirrorWorst = { share: 0.5, label: "" };
for (const plan of PLANS) {
  const cells = [];
  for (const corner of CORNERS) {
    let winsA = 0;
    for (let i = 0; i < MIRROR_PER_COMBO; i++) {
      const arch = ARCHS[i % ARCHS.length];
      const ovr = OVR_LEVELS[i % OVR_LEVELS.length];
      const rng = mulberry32(7001 + i);
      const A = buildFighter("A", arch, ovr, rng);
      const B = { ...A, id: "B", name: "B" };
      const policyB = () => corner;
      const r = runFight(A, B, plan, () => corner, 10007 * i + 13, 3, { planB: plan, cornerPolicyB: policyB });
      if (r.winner === "A") winsA++;
      trackDecision(r);
    }
    const share = winsA / MIRROR_PER_COMBO;
    if (Math.abs(share - 0.5) > Math.abs(mirrorWorst.share - 0.5)) mirrorWorst = { share, label: `${plan} / ${corner}` };
    mirrorWinsA += winsA;
    mirrorTotal += MIRROR_PER_COMBO;
    cells.push(pct(share).padStart(12));
  }
  console.log("   " + plan.padEnd(20) + cells.join(""));
}

// --- 2. side swap and 4. archetype matrix ------------------------------------
// Each sample plays the same pair twice with the same seed: X as A, then X as B.
console.log(`\n2. Side swap: different fighters, AI corners, ${SWAP_PER_PAIR_LEVEL * OVR_LEVELS.length * ROUND_COUNTS.length} fights per side per pair`);
console.log("   pair".padEnd(34) + "X wins as A   X wins as B   gap");

const archWins = Object.fromEntries(ARCHS.map((a) => [a, { w: 0, n: 0 }]));
const strata = Object.fromEntries(ROUND_COUNTS.flatMap((r) => OVR_LEVELS.map((o) => [
  `${r}r/${o}`, Object.fromEntries(ARCHS.map((a) => [a, { w: 0, n: 0 }]))
])));
let swapWinsA = 0, swapTotal = 0, swapWorst = { gap: 0, label: "" };
let ovrGapMax = 0;
for (let xi = 0; xi < ARCHS.length; xi++) {
  for (let yi = xi + 1; yi < ARCHS.length; yi++) {
    const X = ARCHS[xi], Y = ARCHS[yi];
    let xWinsAsA = 0, xWinsAsB = 0, n = 0;
    for (const rounds of ROUND_COUNTS) {
      for (const ovr of OVR_LEVELS) {
        for (let i = 0; i < SWAP_PER_PAIR_LEVEL; i++) {
          const rng = mulberry32(99991 * (xi * 7 + yi) + 31 * ovr + i);
          const fx = buildFighter("X", X, ovr, rng);
          const fy = buildFighter("Y", Y, ovr, rng);
          ovrGapMax = Math.max(ovrGapMax, Math.abs(ovrOf(fx) - ovrOf(fy)));
          const seed = 50021 * i + ovr * 13 + xi * 101 + yi;
          const r1 = aiFight(fx, fy, seed, rounds);
          const r2 = aiFight(fy, fx, seed, rounds);
          const xWins = Number(r1.winner === "A") + Number(r2.winner === "B");
          strata[`${rounds}r/${ovr}`][X].w += xWins;
          strata[`${rounds}r/${ovr}`][X].n += 2;
          strata[`${rounds}r/${ovr}`][Y].w += 2 - xWins;
          strata[`${rounds}r/${ovr}`][Y].n += 2;
          trackDecision(r1);
          trackDecision(r2);
          if (r1.winner === "A") { xWinsAsA++; swapWinsA++; }
          if (r2.winner === "B") xWinsAsB++;
          else swapWinsA++;
          n++;
          swapTotal += 2;
        }
      }
    }
    const a = xWinsAsA / n, b = xWinsAsB / n, gap = a - b;
    if (Math.abs(gap) > Math.abs(swapWorst.gap)) swapWorst = { gap, label: `${X} vs ${Y}` };
    archWins[X].w += xWinsAsA + xWinsAsB; archWins[X].n += 2 * n;
    archWins[Y].w += 2 * n - xWinsAsA - xWinsAsB; archWins[Y].n += 2 * n;
    console.log(`   ${(X + " vs " + Y).padEnd(31)}${pct(a).padStart(11)}${pct(b).padStart(14)}${((gap * 100).toFixed(1) + "pp").padStart(9)}`);
  }
}
console.log(`   largest OVR difference inside a pair: ${ovrGapMax.toFixed(2)}`);

// --- 3. decisions ----------------------------------------------------------------
console.log(`\n3. Decisions: ${decisions.total} decisions from sections 1 and 2`);
console.log(`   winner won fewer rounds: ${decisions.fewerRounds} (${pct(decisions.fewerRounds / decisions.total).trim()}), ` +
  `of which not explained by a 10-8 round: ${decisions.unexplained}`);

// --- 4. archetype ------------------------------------------------------------------
console.log("\n4. Archetype win rate at equal OVR, all opponents, both sides (target 45-55%)");
for (const a of ARCHS) {
  const s = archWins[a].w / archWins[a].n;
  const mark = s >= 0.45 && s <= 0.55 ? "  " : " !";
  console.log(`  ${mark} ${a.padEnd(18)}${pct(s)}`);
}
console.log("\n   rounds/OVR".padEnd(20) + ARCHS.map((a) => a.padStart(16)).join(""));
for (const [key, results] of Object.entries(strata)) {
  console.log(`   ${key.padEnd(17)}` + ARCHS.map((a) => pct(results[a].w / results[a].n).padStart(16)).join(""));
}

// --- bands -------------------------------------------------------------------------
const mirrorShare = mirrorWinsA / mirrorTotal;
const swapShare = swapWinsA / swapTotal;
const BANDS = [
  {
    label: "Mirror: side A win share, all cells", value: mirrorShare, min: 0.48, max: 0.52, show: pct,
    reason: "Identical fighters with identical choices. Anything outside 48-52% is a side bias in the engine.",
  },
  {
    label: `Mirror: worst cell (${mirrorWorst.label})`, value: mirrorWorst.share, min: 0.46, max: 0.54, show: pct,
    reason: "One plan or corner effect works differently for side A and side B.",
  },
  {
    label: "Side swap: side A win share, all pairs", value: swapShare, min: 0.48, max: 0.52, show: pct,
    reason: "Different fighters, AI corners on both sides. Side A still wins more or less than half.",
  },
  {
    label: `Side swap: worst gap (${swapWorst.label})`, value: Math.abs(swapWorst.gap), max: 0.05,
    show: (v) => (v * 100).toFixed(1) + "pp",
    reason: "The same fighter wins more often from one side. Look for an effect that only reads A or B.",
  },
  {
    label: "Decisions: winner won fewer rounds", value: decisions.fewerRounds / decisions.total, max: 0.02, show: pct,
    reason: "A 10-8 round can legally outweigh the round count (about 1% of decisions when this band was set). " +
      "Much more means 10-8 rounds became too common.",
  },
  {
    label: "Decisions: not explained by a 10-8 round", value: decisions.unexplained, max: 0, show: String,
    reason: "A decision went against the round count without any 10-8 round. Scoring is broken.",
  },
];

for (const arch of ARCHS) {
  const band = (label, results) => {
    const w = results.reduce((sum, x) => sum + x[arch].w, 0);
    const n = results.reduce((sum, x) => sum + x[arch].n, 0);
    BANDS.push({ label: `${arch}: ${label}`, value: w / n, min: 0.45, max: 0.55, show: pct,
      reason: "Archetype drift at equal OVR. Check the matchup matrix and phase balance." });
  };
  band("all OVRs / rounds", [archWins]);
  for (const rounds of ROUND_COUNTS) band(`${rounds} rounds`, OVR_LEVELS.map((ovr) => strata[`${rounds}r/${ovr}`]));
  for (const ovr of OVR_LEVELS) band(`OVR ${ovr}`, ROUND_COUNTS.map((rounds) => strata[`${rounds}r/${ovr}`]));
}

console.log("\n5. Trait mirrors, identical choices on both sides");
let traitTotal = 0;
for (const trait of ["Warrior", "Explosive", "Cautious"]) {
  let wins = 0;
  const n = 3000 * SCALE;
  for (let i = 0; i < n; i++) {
    const A = buildFighter("A", ARCHS[i % ARCHS.length], OVR_LEVELS[i % OVR_LEVELS.length], mulberry32(3719 + i));
    A.traits = [trait];
    const B = { ...A, id: "B", name: "B" };
    const result = runFight(A, B, "Balanced", () => "neutral", 9151 * i + 1, 3,
      { planB: "Balanced", cornerPolicyB: () => "neutral" });
    wins += Number(result.winner === "A");
  }
  traitTotal += n;
  BANDS.push({ label: `Trait mirror: ${trait}`, value: wins / n, min: 0.48, max: 0.52, show: pct,
    reason: "An identical trait gives one side an advantage." });
}

console.log("\n" + "=".repeat(70));
let failures = 0;
for (const b of BANDS) {
  const ok = (b.min == null || b.value >= b.min) && (b.max == null || b.value <= b.max);
  const bound = [b.min != null && `min ${b.show(b.min).trim()}`, b.max != null && `max ${b.show(b.max).trim()}`].filter(Boolean).join(", ");
  console.log(`${ok ? "PASS" : "FAIL"}  ${b.label.padEnd(48)} ${b.show(b.value).trim().padStart(7)}  (${bound})`);
  if (!ok) {
    failures++;
    console.log(`      ${b.reason}`);
  }
}
console.log(`\nnote  ${mirrorTotal + swapTotal + traitTotal} fights in ${((Date.now() - t0) / 1000).toFixed(1)}s. ` +
  "Archetype matrix excludes traits and weight cuts; trait mirrors are checked separately.");
console.log("=".repeat(70));
console.log(failures === 0 ? "FIGHTS OK — every band held." : `FIGHT DRIFT — ${failures} band(s) out of range. Read the reasons above.`);
process.exit(failures === 0 ? 0 : 1);
