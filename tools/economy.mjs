// Economy and progression harness — a scripted player actually plays.
//
// The balance harness (tools/balance.mjs) deliberately holds the camp solvent
// so the world keeps turning; it is blind to money and to fighter development
// because nobody in it ever books a fight or runs a training block. This one
// closes that gap: it accepts fights, resolves them headlessly, trains, hires,
// upgrades, and signs prospects, then reports what happens to the money and to
// the fighters over twenty in-game years.
//
// Two questions it exists to answer, both currently unproven claims:
//   1. Does cash become effectively infinite in the late game?
//   2. Does training converge, i.e. do all fighters drift toward the same
//      statline until archetypes stop meaning anything?
//
// The scripted player is competent but not optimal. It is meant to stand in
// for a reasonable human, not a min-maxer, so the numbers describe the typical
// path rather than the best one.
//
// Usage:  node tools/economy.mjs [weeks] [seeds]

import {
  newGame, tick, reducer, setRNG, mulberry32,
  prepFighter, autoGamePlan, avgSkill,
  ATTRS, TRAINING, getPrestige, getPrestigeTier,
} from "../packages/engine/src/index.js";
// Not re-exported by the barrel; imported directly.
import { runFight } from "../packages/engine/src/fight.js";
import { commitFightResult } from "../packages/engine/src/fights/commitResult.js";

const WEEKS = Number(process.argv[2] || 960);
const SEED_COUNT = Number(process.argv[3] || 3);
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => 500 + i * 1361);

const YEAR = 48;
const nanHits = [];

function isBad(n) {
  return typeof n === "number" && !Number.isFinite(n);
}

// --- scripted player -------------------------------------------------------

function resolveDueFights(g, seed, week) {
  for (const f of [...g.roster]) {
    if (!f.booked || f.booked.weeksLeft > 0 || f.injury) continue;

    const opp = f.booked.opponent || {};
    const A = prepFighter({ ...f, attrs: { ...f.attrs } });
    const B = prepFighter({ ...opp, attrs: { ...(opp.attrs || {}) } });

    // Opponents drawn from the ranking lists carry no attribute block. Record
    // it rather than papering over it, then give them a plausible statline so
    // the run can continue.
    if (!opp.attrs) {
      nanHits.push({ week, kind: "opponent-without-attrs", name: opp.name || "?" });
      const base = Math.max(20, Math.min(90, Math.round((opp.level || 0.8) * 60)));
      for (const k of ATTRS) B.attrs[k] = base;
    }

    const rounds = f.booked.title ? 5 : 3;
    const plan = autoGamePlan(A, B);
    const res = runFight(A, B, plan, () => "go", f.booked.seed ?? seed + week, rounds);

    if (isBad(res.totalDmgA) || isBad(res.totalDmgB)) {
      nanHits.push({ week, kind: "NaN-damage", name: opp.name || "?" });
    }

    // The fighter argument must be a detached copy. commitFightResult nulls
    // f.booked partway through, and if the caller passed the roster object
    // itself the two alias — so every later read of fighter.booked.titleTier
    // sees null and no belt is ever awarded. The UI passes a fighter from the
    // pre-clone state, so it never hit this; the harness did, and it reported
    // zero championships across ten years while titles were being won.
    commitFightResult(g, { ...f, booked: { ...f.booked } }, {
      won: res.winner === "A",
      how: res.how,
      r: res.finalRound,
      totalDmgA: res.totalDmgA,
      totalDmgB: res.totalDmgB,
      attitude: "Professional",
    });
  }
}

function acceptOffers(g) {
  for (const m of [...g.inbox]) {
    if (m.type !== "offer") continue;
    const f = g.roster.find((x) => x.id === m.fighterId);
    if (!f || f.booked || f.injury) continue;
    reducer(g, {
      type: "ACCEPT_FIGHT",
      fighterId: m.fighterId, opponent: m.opponent, weeks: m.weeks,
      show: m.show, winBonus: m.winBonus, tier: m.tier, title: m.title,
      titleTier: m.titleTier, defense: m.defense, oppRank: m.oppRank,
      contenderId: m.contenderId, messageId: m.id,
    });
  }
}

// Clears prompts by taking the cheapest choice, so the inbox does not silently
// become the reason nothing else happens.
function clearPrompts(g) {
  for (const m of [...g.inbox]) {
    if (m.type === "offer" || m.type === "press") continue;
    if (!m.choices || m.choices.length === 0) continue;
    const choice =
      [...m.choices].sort((a, b) => (a.cash ? -a.cash : 0) - (b.cash ? -b.cash : 0))[0];
    reducer(g, { type: "INBOX_EVENT", messageId: m.id, choice, gambleRoll: 0.5 });
  }
}

function manageTraining(g) {
  const programs = ["striking", "grappling", "conditioning", "sparring"];
  for (const f of g.roster) {
    if (f.injury || f.booked) continue;
    if (f.overtraining > 55) {
      reducer(g, { type: "SET_TRAINING", fighterId: f.id, program: "recovery", intensity: "Light" });
      continue;
    }
    // Train the weakest of the attributes this program feeds — a plausible
    // human habit, and the behaviour most likely to cause convergence.
    let worst = null, worstVal = Infinity;
    for (const p of programs) {
      for (const k of TRAINING[p].gains) {
        if (f.attrs[k] < worstVal) { worstVal = f.attrs[k]; worst = p; }
      }
    }
    reducer(g, {
      type: "SET_TRAINING", fighterId: f.id,
      program: worst || "sparring",
      intensity: f.overtraining > 35 ? "Medium" : "Hard",
    });
  }
}

function spend(g) {
  // Facilities first, then coaches. Keep a buffer so the camp is not one bad
  // month from insolvency.
  const BUFFER = 60000;
  for (const fac of Object.keys(g.facilities || {})) {
    if (g.cash < BUFFER) break;
    reducer(g, { type: "UPGRADE_FACILITY", facility: fac });
  }
  if (g.cash > BUFFER * 3 && g.coachMarket?.length) {
    reducer(g, { type: "HIRE_COACH", coachId: g.coachMarket[0].id });
  }
  reducer(g, { type: "UPGRADE_TIER" });
}

// --- run -------------------------------------------------------------------

function spreadOf(roster) {
  // Mean pairwise distance BETWEEN fighters. Confounded by roster churn: new
  // signings inject variety, so this can rise even while everyone flattens.
  if (roster.length < 2) return null;
  let total = 0, pairs = 0;
  for (let i = 0; i < roster.length; i++) {
    for (let j = i + 1; j < roster.length; j++) {
      let d = 0;
      for (const k of ATTRS) d += Math.abs(roster[i].attrs[k] - roster[j].attrs[k]);
      total += d / ATTRS.length;
      pairs++;
    }
  }
  return Math.round((total / pairs) * 10) / 10;
}

function identityOf(roster) {
  // Mean WITHIN-fighter spread: how far a fighter's best attribute sits from
  // their worst. This is the honest test of archetype identity. A striker who
  // trains their weaknesses ends up with a flat statline, and a falling number
  // here means archetypes have stopped meaning anything — regardless of how
  // different fighters look from each other.
  if (!roster.length) return null;
  let total = 0;
  for (const f of roster) {
    const vals = ATTRS.map((k) => f.attrs[k]);
    total += Math.max(...vals) - Math.min(...vals);
  }
  return Math.round((total / roster.length) * 10) / 10;
}

function veteransOf(g) {
  // Fighters who have been in the camp three years or more. Roster-wide
  // averages are dragged down by fresh signings; this isolates development.
  const vets = g.roster.filter((f) => g.week - (f.joinedWeek || 0) >= 144);
  if (!vets.length) return null;
  return Math.round(vets.reduce((a, f) => a + avgSkill(f), 0) / vets.length);
}

function runSeed(seed) {
  setRNG(mulberry32(seed));
  const g = newGame();
  const snaps = [];

  for (let w = 1; w <= WEEKS; w++) {
    resolveDueFights(g, seed, w);
    acceptOffers(g);
    clearPrompts(g);
    manageTraining(g);
    if (w % 4 === 0) spend(g);

    tick(g);
    if (g.over) break;

    if (w % YEAR === 0) {
      snaps.push({
        year: w / YEAR,
        cash: Math.round(g.cash),
        rep: Math.round(g.rep),
        roster: g.roster.length,
        avgSkill: Math.round(g.roster.reduce((a, f) => a + avgSkill(f), 0) / (g.roster.length || 1)),
        spread: spreadOf(g.roster),
        identity: identityOf(g.roster),
        vet: veteransOf(g),
        tier: g.campTier,
        champs: g._dynasty?.championsProduced || 0,
        prestige: getPrestige(g),
        wins: g.roster.reduce((a, f) => a + (f.record?.w || 0), 0),
      });
    }
  }
  return { seed, snaps, over: g.over, endWeek: g.week };
}

console.log(`Economy harness — ${WEEKS} weeks (${(WEEKS / YEAR).toFixed(0)}y) x ${SEEDS.length} seeds`);
console.log("Scripted player: accepts every fight, trains weakest attribute, upgrades, hires.\n");

const all = [];
for (const seed of SEEDS) {
  const r = runSeed(seed);
  all.push(r);
  console.log(`seed ${r.seed}${r.over ? `   ENDED week ${r.endWeek}: ${r.over}` : ""}`);
  console.log("  year        cash  rep  roster  avgSkill  identity  tier  wins  champs  prestige");
  for (const s of r.snaps) {
    if (s.year % 2 && s.year !== 1) continue; // every other year, keep it readable
    console.log(
      `  ${String(s.year).padStart(4)}  ${String(s.cash).padStart(10)}  ` +
      `${String(s.rep).padStart(3)}  ${String(s.roster).padStart(6)}  ` +
      `${String(s.avgSkill).padStart(8)}  ${String(s.identity ?? "-").padStart(8)}  ` +
      `${String(s.tier).padStart(4)}  ${String(s.wins).padStart(4)}  ` +
      `${String(s.champs).padStart(6)}  ${String(s.prestige).padStart(8)}`,
    );
  }
  console.log();
}

// --- read the result -------------------------------------------------------
console.log("=".repeat(72));

const withSnaps = all.filter((r) => r.snaps.length >= 4);
if (withSnaps.length === 0) {
  console.log("No seed survived long enough to judge. That is itself the finding.");
} else {
  const early = [], late = [], idEarly = [], idLate = [];
  for (const r of withSnaps) {
    const e = r.snaps[Math.min(2, r.snaps.length - 1)];
    const l = r.snaps[r.snaps.length - 1];
    early.push(e.cash); late.push(l.cash);
    if (e.identity != null) idEarly.push(e.identity);
    if (l.identity != null) idLate.push(l.identity);
  }
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

  console.log(`Cash    year 3 avg ${Math.round(avg(early)).toLocaleString()}  ->  ` +
              `final avg ${Math.round(avg(late)).toLocaleString()}`);
  console.log(`Identity  year 3 avg ${avg(idEarly).toFixed(1)}  ->  ` +
              `final avg ${avg(idLate).toFixed(1)}   ` +
              `(best-minus-worst attribute within a fighter; falling = archetypes flattening)`);
  console.log(`Ended early: ${all.filter((r) => r.over).length}/${all.length} seeds`);
}

if (nanHits.length) {
  const byKind = {};
  for (const h of nanHits) byKind[h.kind] = (byKind[h.kind] || 0) + 1;
  console.log(`\nData issues seen while simulating fights: ${JSON.stringify(byKind)}`);
}
console.log("=".repeat(72));
