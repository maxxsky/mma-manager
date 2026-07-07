/**
 * Comprehensive Simulation — bidirectional (A↔B per pair)
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

function runMatchup(archA, archB, seedOffset) {
  let aW = 0, bW = 0, draw = 0;
  let koA = 0, koB = 0, subA = 0, subB = 0, decA = 0, decB = 0;
  let r1A = 0, r1B = 0, r2A = 0, r2B = 0, r3A = 0, r3B = 0;

  for (let f = 0; f < N; f++) {
    setRNG(mulberry32(f * 7919 + seedOffset));
    const A = genF(archA), B = genF(archB);
    const bA = prepFighter(A), bB = prepFighter(B);
    let stA = 100, stB = 100, scores = [], finish = null, fr = 0;

    for (let r = 1; r <= 3; r++) {
      const res = simRound(r, bA, bB, stA, stB, "Balanced", "plan", false, 0);
      stA = res.staA; stB = res.staB;
      scores.push({ a: res.scoreA, b: res.scoreB });
      if (res.finish) { finish = res.finish; fr = r; break; }
    }

    if (finish) {
      const isA = finish.by === "A";
      if (isA) { aW++; if (finish.how === "KO/TKO") koA++; else subA++; }
      else { bW++; if (finish.how === "KO/TKO") koB++; else subB++; }
      if (fr === 1) { if (isA) r1A++; else r1B++; }
      else if (fr === 2) { if (isA) r2A++; else r2B++; }
      else { if (isA) r3A++; else r3B++; }
    } else {
      const wa = scores.filter(s => s.a > s.b).length;
      const wb = scores.filter(s => s.b > s.a).length;
      if (wa > wb) { aW++; decA++; }
      else if (wb > wa) { bW++; decB++; }
      else draw++;
    }
  }
  resetRNG();
  return { aW, bW, draw, koA, koB, subA, subB, decA, decB, r1A, r1B, r2A, r2B, r3A, r3B };
}

const start = Date.now();

// Run all 20 directional matchups
const dirResults = {};
for (const a of archs) {
  for (const b of archs) {
    if (a === b) continue;
    const key = a + " vs " + b;
    const seedOff = archs.indexOf(a) * 1009 + archs.indexOf(b) * 5003;
    dirResults[key] = runMatchup(a, b, seedOff);
  }
}

// Unique pairs (10)
console.log("=== MATCHUPS (bidirectional) ===");
console.log("Matchup | A Win% | B Win% | Dr | Mirror");
console.log("--------|--------|--------|----|-------");

for (let i = 0; i < archs.length; i++) {
  for (let j = i + 1; j < archs.length; j++) {
    const a = archs[i], b = archs[j];
    const fwd = dirResults[a + " vs " + b];
    const rev = dirResults[b + " vs " + a];
    const fwdA = (fwd.aW / N * 100).toFixed(1);
    const fwdB = (fwd.bW / N * 100).toFixed(1);
    const revA = (rev.aW / N * 100).toFixed(1);
    const mirror = (parseFloat(fwdA) + parseFloat(revA)).toFixed(1);
    const mark = Math.abs(parseFloat(mirror) - 100) <= 5 ? "✅" : Math.abs(parseFloat(mirror) - 100) <= 10 ? "🟡" : "⚠️";
    console.log(`${a.padEnd(8)} vs ${b.padEnd(12)} | ${fwdA.padStart(5)}% | ${fwdB.padStart(5)}% | ${String(fwd.draw).padStart(2)} | ${mirror}% ${mark}`);
  }
}

// Full table (20)
console.log("\n=== FULL 20 DIRECTIONAL ===");
console.log("A vs B | A W% | KO A | Sub A | Dec A | R1/R2/R3 A | B W% | KO B | Sub B | Dec B | R1/R2/R3 B | Dr");
console.log("-------|------|------|-------|-------|-------------|------|------|-------|-------|-------------|----");
for (const [key, m] of Object.entries(dirResults)) {
  const [a, b] = key.split(" vs ");
  const aP = (m.aW/N*100).toFixed(1), bP = (m.bW/N*100).toFixed(1);
  console.log(`${a.padEnd(6)} vs ${b.padEnd(12)} | ${aP.padStart(5)}% | ${String(m.koA).padStart(4)} | ${String(m.subA).padStart(5)} | ${String(m.decA).padStart(5)} | ${String(m.r1A).padStart(2)}/${String(m.r2A).padStart(2)}/${String(m.r3A).padStart(2)} | ${bP.padStart(5)}% | ${String(m.koB).padStart(4)} | ${String(m.subB).padStart(5)} | ${String(m.decB).padStart(5)} | ${String(m.r1B).padStart(2)}/${String(m.r2B).padStart(2)}/${String(m.r3B).padStart(2)} | ${m.draw}`);
}

// Overall
console.log("\n=== OVERALL ===");
const stats = {};
for (const a of archs) stats[a] = { w: 0, t: 0 };
for (const [key, m] of Object.entries(dirResults)) {
  const [a, b] = key.split(" vs ");
  stats[a].w += m.aW; stats[a].t += N;
}
for (const a of archs) {
  console.log(`${a.padEnd(16)} | ${(stats[a].w / stats[a].t * 100).toFixed(1)}%`);
}

console.log(`\nRan in ${((Date.now()-start)/1000).toFixed(1)}s`);
