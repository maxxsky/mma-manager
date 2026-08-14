// Headless balance harness — runs the engine for years across several seeds
// and checks the results against explicit bands.
//
// Why this exists: unit tests prove a function returns the right number for
// one input. They say nothing about whether the world is still coherent after
// ten simulated years. Drift shows up as a save that balloons, an inbox no
// human could triage, a division that empties out, or an economy that cannot
// be survived — none of which any single assertion would catch.
//
// A band that fails is not automatically a bug. It means something moved and
// a human should decide whether the move was intended. If it was, edit the
// band in the same commit as the change, so the new normal is recorded.
//
// Usage:  node tools/balance.mjs [weeks] [seeds]
//   node tools/balance.mjs            # 480 weeks (10y), 5 seeds
//   node tools/balance.mjs 960 3      # 20 years, 3 seeds

import { newGame, tick, setRNG, mulberry32 } from "../packages/engine/src/index.js";

// A camp that never books a fight has no income, so an untouched simulation
// goes bankrupt within a few years and the run ends long before the horizon we
// care about. We are measuring world coherence, not economic survival, so cash
// is held above the failure line to keep the world turning. This deliberately
// makes the harness blind to economy balance — that needs its own harness with
// a scripted player, and is not what this file claims to test.
const SOLVENCY_FLOOR = 250_000;

const WEEKS = Number(process.argv[2] || 480);
const SEED_COUNT = Number(process.argv[3] || 5);
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => 1000 + i * 7919);

// --- bands -----------------------------------------------------------------
// Each band is checked against the aggregate across all seeds. Keep the
// reason field honest: it is what a future reader uses to decide whether a
// failure matters.
const BANDS = [
  {
    key: "inboxPeak",
    label: "Peak inbox size",
    max: 90,
    reason:
      "The inbox is capped at 60 during monthly settlement; messages added " +
      "between settlements push it a little higher. Well above this means " +
      "retention has stopped working and the player is facing an unreadable list.",
  },
  {
    key: "inboxStale",
    label: "Messages older than one year",
    max: 0,
    reason:
      "Nothing should survive a full in-game year. A non-zero value means a " +
      "message type is escaping every retention layer.",
  },
  {
    key: "saveKB",
    label: "Save size at end of run (KB)",
    max: 1024,
    reason:
      "localStorage gives roughly 5MB. 1MB is a deliberately early alarm so " +
      "there is time to react before saves start failing silently.",
  },
  {
    key: "logLen",
    label: "Log length",
    max: 200,
    reason: "The log is explicitly capped at 200. Exceeding it means the cap was bypassed.",
  },
  {
    key: "worldFightersMin",
    label: "Smallest world roster across divisions",
    min: 80,
    reason:
      "Divisions refill yearly. A shrinking world means retirement is " +
      "outpacing generation and the game will run out of opponents.",
  },
];

// --- run -------------------------------------------------------------------
function runSeed(seed) {
  setRNG(mulberry32(seed));
  const g = newGame();

  let inboxPeak = 0;
  let logPeak = 0;
  let worldMin = Infinity;
  let bankruptAt = null;
  const titleHolders = new Set();

  for (let w = 1; w <= WEEKS; w++) {
    if (g.cash < SOLVENCY_FLOOR) g.cash = SOLVENCY_FLOOR;
    tick(g);

    inboxPeak = Math.max(inboxPeak, g.inbox?.length ?? 0);
    logPeak = Math.max(logPeak, g.log?.length ?? 0);

    const worldFighters = Object.values(g.divisions || {}).reduce(
      (a, d) => a + (d.list?.length || 0),
      0,
    );
    worldMin = Math.min(worldMin, worldFighters);

    for (const d of Object.values(g.divisions || {})) {
      if (d.champ?.name) titleHolders.add(d.champ.name);
    }

    if (g.over && bankruptAt == null) {
      bankruptAt = w;
      break;
    }
  }

  const clean = { ...g };
  delete clean._undoStack;
  delete clean._redoStack;

  return {
    seed,
    weeksRun: bankruptAt ?? WEEKS,
    bankruptAt,
    inboxPeak,
    inboxEnd: g.inbox?.length ?? 0,
    inboxStale: (g.inbox || []).filter(
      (m) => m.createdWeek != null && g.week - m.createdWeek > 48,
    ).length,
    logLen: logPeak,
    saveKB: Math.round(JSON.stringify(clean).length / 1024),
    worldFightersMin: worldMin === Infinity ? 0 : worldMin,
    uniqueChamps: titleHolders.size,
  };
}

console.log(`Balance harness — ${WEEKS} weeks (${(WEEKS / 48).toFixed(1)}y) x ${SEEDS.length} seeds\n`);

const results = SEEDS.map((s) => {
  const r = runSeed(s);
  console.log(
    `  seed ${String(r.seed).padStart(6)}  ` +
      `weeks ${String(r.weeksRun).padStart(4)}  ` +
      `inbox ${String(r.inboxPeak).padStart(3)}pk/${String(r.inboxEnd).padStart(3)}end  ` +
      `stale ${String(r.inboxStale).padStart(3)}  ` +
      `save ${String(r.saveKB).padStart(4)}KB  ` +
      `world ${String(r.worldFightersMin).padStart(4)}  ` +
      `champs ${String(r.uniqueChamps).padStart(3)}` +
      (r.bankruptAt ? `  BANKRUPT@${r.bankruptAt}` : ""),
  );
  return r;
});

// --- aggregate and check ---------------------------------------------------
const agg = {};
for (const b of BANDS) {
  const vals = results.map((r) => r[b.key]);
  agg[b.key] = b.min != null ? Math.min(...vals) : Math.max(...vals);
}

console.log("\n" + "=".repeat(70));
let failures = 0;
for (const b of BANDS) {
  const v = agg[b.key];
  const ok = b.min != null ? v >= b.min : v <= b.max;
  const bound = b.min != null ? `min ${b.min}` : `max ${b.max}`;
  console.log(`${ok ? "PASS" : "FAIL"}  ${b.label.padEnd(38)} ${String(v).padStart(6)}  (${bound})`);
  if (!ok) {
    failures++;
    console.log(`      ${b.reason}`);
  }
}

const shortRuns = results.filter((r) => r.weeksRun < WEEKS).length;
console.log(
  `\nnote  cash held at or above ${SOLVENCY_FLOOR.toLocaleString()} so the world keeps ` +
    `turning; economy balance is NOT covered by this harness.`,
);
if (shortRuns > 0) {
  console.log(
    `note  ${shortRuns}/${results.length} seed(s) still ended early — investigate, ` +
      `the solvency floor should have prevented that.`,
  );
}

console.log("=".repeat(70));
if (failures === 0) {
  console.log("BALANCE OK — every band held.");
} else {
  console.log(`BALANCE DRIFT — ${failures} band(s) out of range. Read the reasons above.`);
}
process.exit(failures === 0 ? 0 : 1);
