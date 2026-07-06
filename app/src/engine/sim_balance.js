/**
 * Archetype Balance Simulator
 * 5000 fights per matchup, 3 rounds, neutral corner
 * Uses same fight engine as game (fight.js)
 */

import { R, RI, clamp, pick, random, setRNG, resetRNG, mulberry32 } from "./rng.js";
import { ATTRS, ARCHETYPES } from "./data.js";
import { simRound, prepFighter } from "./fight.js";

const archs = Object.keys(ARCHETYPES);
const FIGHTS_PER_MATCHUP = 5000;
const TOTAL_ROUNDS = 3;

// Build matchup tracking
const results = {};
for (const a of archs) {
  for (const b of archs) {
    if (a === b) continue;
    const key = a + " vs " + b;
    results[key] = {
      aWins: 0, bWins: 0, draws: 0,
      koA: 0, koB: 0, subA: 0, subB: 0, decA: 0, decB: 0,
      total: 0,
    };
  }
}

// Generate balanced fighters
function genBalanced(arch) {
  const base = 60; // all stats ~60, clean
  const attrs = {};
  ATTRS.forEach(k => attrs[k] = clamp(Math.round(base + R(-5, 5)), 15, 95));
  Object.entries(ARCHETYPES[arch]).forEach(([k, m]) => {
    attrs[k] = clamp(Math.round(attrs[k] * m), 15, 95);
  });
  const ceilings = {};
  ATTRS.forEach(k => ceilings[k] = clamp(attrs[k] + 15, attrs[k], 99));
  return {
    name: arch, archetype: arch, attrs, ceilings,
    traits: [], morale: 65, age: 26, weightClassDelta: 0,
  };
}

console.log("Archetype Balance Simulation — 5000 fights per matchup, stats ~60\n");
console.log("| Player (A) | Opponent (B) | A Wins | B Wins | Draw | Win% | KO A | KO B | Sub A | Sub B | Dec A | Dec B |");
console.log("|------------|-------------|--------|--------|------|------|------|------|-------|-------|-------|-------|");

const startTime = Date.now();

for (const archA of archs) {
  for (const archB of archs) {
    if (archA === archB) continue;
    const key = archA + " vs " + archB;
    const m = results[key];
    
    for (let f = 0; f < FIGHTS_PER_MATCHUP; f++) {
      // Seed varies per fight for reproducibility
      setRNG(mulberry32(f * 7919 + archs.indexOf(archA) * 1009 + archs.indexOf(archB) * 5003));
      
      const A = genBalanced(archA);
      const B = genBalanced(archB);
      const baseA = prepFighter(A);
      const baseB = prepFighter(B);
      
      let stA = 100, stB = 100, dmgA = 0, dmgB = 0;
      let scores = [];
      let finish = null;
      let planA = "Balanced";
      
      for (let r = 1; r <= TOTAL_ROUNDS; r++) {
        const res = simRound(r, baseA, baseB, stA, stB, planA, "plan", false, 0);
        dmgA += res.dmgA;
        dmgB += res.dmgB;
        stA = res.staA;
        stB = res.staB;
        scores.push({ a: res.scoreA, b: res.scoreB });
        if (res.finish) { finish = res.finish; break; }
      }
      
      m.total++;
      if (finish) {
        if (finish.by === "A") {
          m.aWins++;
          if (finish.how === "KO/TKO") m.koA++;
          else m.subA++;
        } else {
          m.bWins++;
          if (finish.how === "KO/TKO") m.koB++;
          else m.subB++;
        }
      } else {
        const winsA = scores.filter(s => s.a > s.b).length;
        const winsB = scores.filter(s => s.b > s.a).length;
        if (winsA > winsB) { m.aWins++; m.decA++; }
        else if (winsB > winsA) { m.bWins++; m.decB++; }
        else m.draws++;
      }
    }
    
    // Reset RNG
    resetRNG();
    
    const pct = (m.aWins / m.total * 100).toFixed(1);
    console.log(
      `| ${archA.padEnd(16)} | ${archB.padEnd(12)} | ${String(m.aWins).padStart(6)} | ${String(m.bWins).padStart(6)} | ${String(m.draws).padStart(4)} | ${pct.padStart(4)}% | ${String(m.koA).padStart(4)} | ${String(m.koB).padStart(4)} | ${String(m.subA).padStart(5)} | ${String(m.subB).padStart(5)} | ${String(m.decA).padStart(5)} | ${String(m.decB).padStart(5)} |`
    );
  }
}

// Overall stats per archetype
console.log("\n\n=== Overall Archetype Win Rates (as Player A) ===");
const archStats = {};
for (const a of archs) archStats[a] = { wins: 0, total: 0, ko: 0, sub: 0, dec: 0 };

for (const [key, m] of Object.entries(results)) {
  const a = key.split(" vs ")[0];
  archStats[a].wins += m.aWins;
  archStats[a].total += m.total;
  archStats[a].ko += m.koA;
  archStats[a].sub += m.subA;
  archStats[a].dec += m.decA;
}

console.log("| Archetype | Overall Win% | KO% | Sub% | Dec% |");
console.log("|-----------|-------------|-----|------|------|");
for (const a of archs) {
  const s = archStats[a];
  const wp = (s.wins / s.total * 100).toFixed(1);
  const kp = (s.ko / s.total * 100).toFixed(1);
  const sp = (s.sub / s.total * 100).toFixed(1);
  const dp = (s.dec / s.total * 100).toFixed(1);
  console.log(`| ${a.padEnd(16)} | ${wp.padStart(4)}% | ${kp}% | ${sp}% | ${dp}% |`);
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nRan in ${elapsed}s`);
