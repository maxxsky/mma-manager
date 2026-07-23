// sim-fight-injury.mjs — Simulasi injury dari fight selama 192 minggu
// Run: node scripts/sim-fight-injury.mjs
//
// Mengukur: distribusi injury dari commitFightResult, bukan dari training.
// Hanya melakukan booking → fight → commit → repeat tanpa training/offers.

import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSrc = join(__dirname, "..", "packages", "engine", "src");

// ── Engine modules ──
const engine = await import(join(appSrc, "state.js"));
const rngMod = await import(join(appSrc, "rng.js"));
const fightMod = await import(join(appSrc, "fight.js"));
const commitMod = await import(join(appSrc, "fights", "commitResult.js"));

const { newGame, tick } = engine;
const { clamp } = rngMod;

function mulberry32(s) {
  return function(){s|=0;s=(s+0x6d2b79f5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296};
}

// ── Create a simple opponent ──
function makeOpponent() {
  return {
    name: "Opponent",
    archetype: "Boxer",
    attrs: { striking: 55, wrestling: 45, bjj: 35, cardio: 50, strength: 55, chin: 50, footwork: 45, fightIQ: 45 },
    level: 0.5,
  };
}

// ── Simulate ──
function run(seed, label) {
  rngMod.setRNG(mulberry32(seed));
  rngMod.setUID(1);

  const g = newGame();
  const roster = g.roster;

  let totalFights = 0;
  let totalInjuries = 0;
  let severeCount = 0;    // tier >= 2
  let permanentCount = 0; // N/A for fight injuries (no permanent)
  let byMethod = {};
  let byTier = { 0: 0, 1: 0, 2: 0, 3: 0 };
  let weeksSum = 0;

  for (let w = 1; w <= 192; w++) {
    g.week = w;

    // Weekly: auto-heal injuries (same as tick/training.js logic)
    roster.forEach((f) => {
      if (f.injury) {
        f.injury.weeks--;
        if (f.injury.weeks <= 0) f.injury = null;
      }
    });

    // Every 4 weeks: book and fight
    if (w % 4 === 0) {
      // RNG per tick (simulate real gameplay — RNG consumed by other systems)
      // Pick a random non-injured fighter
      const available = roster.filter((f) => !f.injury && !f.booked);
      if (available.length === 0) continue;

      const f = rngMod.pick(available);
      const opp = makeOpponent();

      // Book fight
      f.booked = {
        opponent: opp,
        weeksLeft: 4,
        show: 1000,
        winBonus: 500,
        tier: "Local",
        title: false,
        seed: Math.floor(rngMod.random() * 2 ** 31),
      };

      // Simulate fight
      const A = fightMod.prepFighter(f);
      const B = fightMod.prepFighter(opp);
      const result = fightMod.runFight(A, B, "Balanced", () => "go", f.booked.seed, 3);

      const won = result.winner === "A";
      const how = result.how || "Decision";
      const resultData = {
        won,
        how,
        r: result.round || 1,
        totalDmgA: result.totalDmgA || 0,
        totalDmgB: result.totalDmgB || 0,
        attitude: "Professional",
      };

      commitMod.commitFightResult(g, f, resultData);
      totalFights++;

      if (f.injury) {
        totalInjuries++;
        weeksSum += f.injury.weeks || 0;
        const tier = f.injury.tier ?? 0;
        byTier[tier] = (byTier[tier] || 0) + 1;
        if (tier >= 2) severeCount++;

        const methodKey = how === "KO/TKO" ? "KO/TKO" : how;
        byMethod[methodKey] = (byMethod[methodKey] || 0) + 1;

        // Booked cleared inside commitFightResult
      }

      // Clear booked if still set (safety)
      if (f.booked) f.booked = null;
    }
  }

  // ── Report ──
  const report = {
    label,
    totalFights,
    totalInjuries,
    injuryRate: totalFights > 0 ? (totalInjuries / totalFights * 100).toFixed(1) + "%" : "N/A",
    severeRate: totalFights > 0 ? (severeCount / totalFights * 100).toFixed(1) + "%" : "N/A",
    avgWeeks: totalInjuries > 0 ? (weeksSum / totalInjuries).toFixed(1) : "N/A",
    tierDistribution: {
      tier0_ringan: byTier[0] || 0,
      tier1_sedang: byTier[1] || 0,
      tier2_serius: byTier[2] || 0,
      tier3_berat: byTier[3] || 0,
    },
    byMethod,
  };

  return report;
}

// ── 3 runs with different seeds ──
const seeds = [42, 12345, 9999];
const results = seeds.map((s, i) => run(s, `Run #${i + 1} (seed=${s})`));

console.log("\n=== FIGHT → INJURY SIMULATION (192 minggu) ===\n");

results.forEach((r) => {
  console.log(`--- ${r.label} ---`);
  console.log(`  Total fights: ${r.totalFights}`);
  console.log(`  Total injuries: ${r.totalInjuries} (${r.injuryRate})`);
  console.log(`  Severe (tier>=2): ${r.severeRate}`);
  console.log(`  Avg recovery weeks: ${r.avgWeeks}`);
  console.log(`  Tier distribution:`, JSON.stringify(r.tierDistribution));
  console.log(`  By method:`, JSON.stringify(r.byMethod));
  console.log("");
});

// Aggregate
const agg = {
  totalFights: results.reduce((s, r) => s + r.totalFights, 0),
  totalInjuries: results.reduce((s, r) => s + r.totalInjuries, 0),
  severe: results.reduce((s, r) => s + (r.tierDistribution.tier2_serius + r.tierDistribution.tier3_berat), 0),
};
console.log("=== AGGREGATE ===");
console.log(`  Fights: ${agg.totalFights}`);
console.log(`  Injuries: ${agg.totalInjuries} (${(agg.totalInjuries / agg.totalFights * 100).toFixed(1)}%)`);
console.log(`  Severe: ${agg.severe} (${(agg.severe / agg.totalFights * 100).toFixed(1)}%)`);
console.log(`  Feel: "kadang, cukup jarang buat berarti pas kejadian" — target`);
