/**
 * Comprehensive Archetype Simulation — all 10 unique pairs, round tracking
 */
import { R, RI, clamp, pick, random, setRNG, resetRNG, mulberry32 } from "./rng.js";
import { ATTRS, ARCHETYPES } from "./data.js";
import { simRound, prepFighter } from "./fight.js";

const archs = Object.keys(ARCHETYPES);
const N = 5000;

function genF(arch) {
  const base = 60;
  const attrs = {};
  ATTRS.forEach(k => attrs[k] = clamp(Math.round(base + R(-5, 5)), 15, 95));
  Object.entries(ARCHETYPES[arch]).forEach(([k, m]) => {
    attrs[k] = clamp(Math.round(attrs[k] * m), 15, 95);
  });
  return { name: arch, archetype: arch, attrs, ceilings: {}, traits: [], morale: 65, age: 26, weightClassDelta: 0 };
}

const results = {};
for (let i = 0; i < archs.length; i++) {
  for (let j = i + 1; j < archs.length; j++) {
    const a = archs[i], b = archs[j];
    const key = a + " vs " + b;
    results[key] = {
      aW: 0, bW: 0, draw: 0,
      koA: 0, koB: 0, subA: 0, subB: 0, decA: 0, decB: 0,
      r1A: 0, r1B: 0, r2A: 0, r2B: 0, r3A: 0, r3B: 0,
      total: 0,
    };
  }
}

const start = Date.now();

for (const [key, m] of Object.entries(results)) {
  const [archA, archB] = key.split(" vs ");

  for (let f = 0; f < N; f++) {
    setRNG(mulberry32(f * 7919 + archs.indexOf(archA) * 1009 + archs.indexOf(archB) * 5003));
    const A = genF(archA), B = genF(archB);
    const bA = prepFighter(A), bB = prepFighter(B);
    let stA = 100, stB = 100, scores = [], finish = null, finishRound = 0;

    for (let r = 1; r <= 3; r++) {
      const res = simRound(r, bA, bB, stA, stB, "Balanced", "plan", false, 0);
      stA = res.staA; stB = res.staB;
      scores.push({ a: res.scoreA, b: res.scoreB });
      if (res.finish) { finish = res.finish; finishRound = r; break; }
    }

    m.total++;
    if (finish) {
      const isA = finish.by === "A";
      if (isA) {
        m.aW++;
        if (finish.how === "KO/TKO") m.koA++;
        else m.subA++;
      } else {
        m.bW++;
        if (finish.how === "KO/TKO") m.koB++;
        else m.subB++;
      }
      if (finishRound === 1) { if (isA) m.r1A++; else m.r1B++; }
      else if (finishRound === 2) { if (isA) m.r2A++; else m.r2B++; }
      else { if (isA) m.r3A++; else m.r3B++; }
    } else {
      const wa = scores.filter(s => s.a > s.b).length;
      const wb = scores.filter(s => s.b > s.a).length;
      if (wa > wb) { m.aW++; m.decA++; }
      else if (wb > wa) { m.bW++; m.decB++; }
      else m.draw++;
    }
  }
  resetRNG();
}

// Print matchups
console.log("=== ALL 10 UNIQUE MATCHUPS ===");
console.log("Matchup | A W% | KO A | Sub A | Dec A | R1/R2/R3 A | B W% | KO B | Sub B | Dec B | R1/R2/R3 B | Dr");
console.log("--------|------|------|-------|-------|-------------|------|------|-------|-------|-------------|----");

for (const [key, m] of Object.entries(results)) {
  const [a, b] = key.split(" vs ");
  const aPct = (m.aW / N * 100).toFixed(1);
  const bPct = (m.bW / N * 100).toFixed(1);
  const aFin = `${m.koA}/${m.subA}/${m.decA}`;
  const bFin = `${m.koB}/${m.subB}/${m.decB}`;
  const aRnd = `${m.r1A}/${m.r2A}/${m.r3A}`;
  const bRnd = `${m.r1B}/${m.r2B}/${m.r3B}`;
  console.log(`${a.padEnd(8)} vs ${b.padEnd(12)} | ${aPct.padStart(5)}% | ${String(m.koA).padStart(4)} | ${String(m.subA).padStart(5)} | ${String(m.decA).padStart(5)} | ${aRnd.padStart(11)} | ${bPct.padStart(5)}% | ${String(m.koB).padStart(4)} | ${String(m.subB).padStart(5)} | ${String(m.decB).padStart(5)} | ${bRnd.padStart(11)} | ${m.draw}`);
}

// Mirror check — sum of A win% + B win% ≈ 100% (minus draws)
console.log("\n=== MIRROR CHECKS ===");
console.log("Pair | A Win% | B Win% | Draw | Sum |");
console.log("-----|--------|--------|------|------|");
for (const [key, m] of Object.entries(results)) {
  const aPct = (m.aW / N * 100).toFixed(1);
  const bPct = (m.bW / N * 100).toFixed(1);
  const dPct = (m.draw / N * 100).toFixed(1);
  const sum = (parseFloat(aPct) + parseFloat(bPct) + parseFloat(dPct)).toFixed(1);
  const mark = Math.abs(parseFloat(sum) - 100) <= 1 ? "✅" : "⚠️";
  console.log(`${key.padEnd(24)} | ${aPct.padStart(5)}% | ${bPct.padStart(5)}% | ${dPct.padStart(4)}% | ${sum}% ${mark}`);
}

// Round distribution analysis
console.log("\n=== ROUND OF FINISH ===");
console.log("Matchup | Finish% | R1% | R2% | R3%");
console.log("--------|---------|-----|-----|-----");
for (const [key, m] of Object.entries(results)) {
  const totalFin = m.r1A + m.r2A + m.r3A + m.r1B + m.r2B + m.r3B;
  const finPct = (totalFin / N * 100).toFixed(1);
  const r1Pct = ((m.r1A + m.r1B) / totalFin * 100).toFixed(1);
  const r2Pct = ((m.r2A + m.r2B) / totalFin * 100).toFixed(1);
  const r3Pct = ((m.r3A + m.r3B) / totalFin * 100).toFixed(1);
  console.log(`${key.padEnd(24)} | ${finPct.padStart(5)}% | ${r1Pct.padStart(4)}% | ${r2Pct.padStart(4)}% | ${r3Pct.padStart(4)}%`);
}

// Overall
console.log("\n=== OVERALL ===");
const stats = {};
for (const a of archs) stats[a] = { w: 0, t: 0 };
for (const [key, m] of Object.entries(results)) {
  const [a, b] = key.split(" vs ");
  stats[a].w += m.aW; stats[a].t += N;
  stats[b].w += m.bW; stats[b].t += N;
}
for (const a of archs) {
  console.log(`${a.padEnd(16)} | ${(stats[a].w / stats[a].t * 100).toFixed(1)}%`);
}

console.log(`\nRan in ${((Date.now() - start) / 1000).toFixed(1)}s`);
