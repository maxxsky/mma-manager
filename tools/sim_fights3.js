// Simulate 1000 fights between equal-stat fighters of different archetypes
// Run with: node /tmp/sim_fights.js

import { R, RI, clamp, pick, random } from "./rng.js";

// Copy the fight engine inline to avoid import issues
const ATTRS = ["striking","wrestling","bjj","footwork","strength","cardio","chin","fightIQ"];

const ARCHETYPES = {
  Boxer: { striking: 1.15, footwork: 1.10, wrestling: 0.8, bjj: 0.7 },
  "Muay Thai": { striking: 1.10, strength: 1.05, bjj: 0.7, wrestling: 0.75 },
  Wrestler: { wrestling: 1.50, strength: 1.10, striking: 0.75, bjj: 0.95 },
  "BJJ Specialist": { bjj: 1.50, wrestling: 1.15, striking: 0.7, footwork: 0.85 },
  "All-Rounder": { fightIQ: 1.10 },
};

function genFighter(level, arch) {
  const attrs = {};
  ATTRS.forEach(k => attrs[k] = clamp(Math.round(level * 60 + R(-12, 12)), 15, 95));
  Object.entries(ARCHETYPES[arch]).forEach(([k, m]) => {
    attrs[k] = clamp(Math.round(attrs[k] * m), 15, 95);
  });
  const ceilings = {};
  ATTRS.forEach(k => ceilings[k] = clamp(attrs[k] + RI(8, 30), attrs[k], 99));
  return {
    name: arch + "_" + Date.now(), archetype: arch, attrs, ceilings,
    traits: [], morale: 60, age: 26,
  };
}

// Simplified fight sim — run simRound for all rounds
function simRound(rnd, A, B, stA, stB, planA, cornerA, cutPenA, momentum) {
  const summaryLog = [];
  const tickLog = [];
  let dmgA = 0, dmgB = 0, bodyDmgA = 0, bodyDmgB = 0, legDmgA = 0, legDmgB = 0;
  let ptsA = 0, ptsB = 0, finish = null, knockdown = null;
  let landA = 0, landB = 0;
  let position = "standing";
  let mom = momentum || 0;
  const agg = cornerA === "go" ? 1.25 : cornerA === "save" ? 0.8 : 1;
  
  const SUB_THRESHOLD = 50;
  let subProgress = 0;
  
  function effAttr(f, k, sta, mods) {
    let v = f.attrs[k] * (0.45 + 0.55 * (sta / 100));
    if (k === "chin") {
      if (f.traits?.includes("Iron Chin")) v += 8;
      if (f.traits?.includes("Glass Jaw")) v -= 10;
    }
    return v * (mods?.[k] || 1);
  }

  const nEx = RI(8, 12);
  for (let ex = 0; ex < nEx; ex++) {
    if (finish) break;
    const exMin = Math.floor(ex * 4.5 / nEx);
    const phase = ex < 2 ? 0.7 : ex >= nEx - 2 ? 0.5 : 0.6;
    const momMult = clamp(1 + (mom > 0 ? mom * 0.0006 : mom * 0.0003), 0.90, 1.10);
    
    // Pick exchange type based on position and plan
    const pool = [];
    const isGround = typeof position === "object";
    if (!isGround) {
      pool.push("strike","strike","strike","strike","power","clinch","clinch");
      const tdW = A.attrs.wrestling > 55 || planA === "Take It Down" ? 4 : 1;
      for (let i = 0; i < tdW; i++) pool.push("td");
    }
    let exType;
    if (ex < 3 && pool.includes('td') && (A.archetype === 'Wrestler' || A.archetype === 'BJJ Specialist')) {
      exType = pick(['td','td','td','clinch','strike']);
    } else if (ex < 3 && A.archetype === 'Muay Thai') {
      exType = pick(['clinch','clinch','strike','strike','td']);
    } else if (ex < 3 && A.archetype === 'Boxer') {
      exType = pick(['strike','strike','strike','power','td']);
    } else {
      exType = pick(pool);
    }
    
    if (exType === "strike" || exType === "power") {
      const pow = exType === "power" ? 1.5 : 1;
      const defA = effAttr(B, "footwork", stB, {}) * clamp(1 - (legDmgA || 0) * 0.003, 0.70, 1);
      const defB = effAttr(A, "footwork", stA, {}) * clamp(1 - (legDmgB || 0) * 0.003, 0.70, 1);
      const outA = effAttr(A, "striking", stA, {}) * agg * phase * momMult * pow;
      const outB = effAttr(B, "striking", stB, {}) * phase * pow;
      const la = Math.round(R(3, 7) * (outA / (defA + 12)));
      const lb = Math.round(R(2, 6) * (outB / (defB + 12)));
      const hitB = la * (effAttr(A, "strength", stA) / 50) * R(0.8, 1.3);
      const hitA = lb * (effAttr(B, "strength", stB) / 50) * R(0.8, 1.3);
      dmgB += hitB; dmgA += hitA;
      landA += la; landB += lb;
      ptsA += la + Math.round(hitB * 0.6);
      ptsB += lb + Math.round(hitA * 0.6);
      mom += (la - lb) * 2;
      
      // Knockdown check
      if (!knockdown && (dmgA > 55 || dmgB > 55)) {
        const kdTarget = dmgA > dmgB ? A : B;
        const isTargetA = kdTarget === A;
        const chin = effAttr(kdTarget, "chin", isTargetA ? stA : stB);
        const attackerStr = effAttr(isTargetA ? B : A, "strength", isTargetA ? stB : stA);
        const kdChance = clamp(((isTargetA ? dmgA : dmgB) - 40) / chin * 0.3 + (attackerStr - 40) * 0.002, 0, 0.40) * (planA === "Finish It" ? 1.5 : 1);
        if (random() < kdChance) {
          knockdown = { fighter: isTargetA ? "A" : "B", canRecover: true };
          if (random() < 0.25) {
            finish = { by: isTargetA ? "B" : "A", how: "KO/TKO" };
          }
        }
      }
      
    } else if (exType === "td") {
      const p = clamp(0.32 + (effAttr(A, "wrestling", stA, {}) - effAttr(B, "wrestling", stB, {})) / 80, 0.10, 0.92);
      if (random() < p) {
        ptsA += 12; dmgB += R(3, 8); position = { type: "halfGuard", top: "A" };
        mom += 12;
      } else {
        ptsB += 4; mom -= 8;
      }
      
    } else if (exType === "clinch") {
      const isThaiA = A.archetype === "Muay Thai";
      const isThaiB = B.archetype === "Muay Thai";
      const outA = effAttr(A, "striking", stA, {}) * agg * (isThaiA ? 1.4 : 1);
      const outB = effAttr(B, "striking", stB, {}) * (isThaiB ? 1.4 : 1);
      const la = Math.round(outA * R(0.3, 0.6));
      const lb = Math.round(outB * R(0.3, 0.6));
      dmgB += la * (isThaiA ? 1.8 : 1); dmgA += lb * (isThaiB ? 1.8 : 1);
      landA += la; landB += lb;
      ptsA += Math.round(la * 1.2); ptsB += Math.round(lb * 1.2);
    }
  }

  const drainA = R(8, 13) * agg * (65 / clamp(A.attrs.cardio, 30, 95));
  const drainB = R(8, 13) * (55 / clamp(B.attrs.cardio, 30, 95));
  mom = clamp(Math.round(mom * 0.65), -100, 100);

  return {
    dmgA, dmgB, staA: clamp(stA - drainA, 5, 100), staB: clamp(stB - drainB, 5, 100),
    scoreA: ptsA, scoreB: ptsB, finish, knockdown, landA, landB, momentum: mom,
  };
}

// ===== RUN 1000 FIGHTS =====
const archs = Object.keys(ARCHETYPES);
const matchups = {};
for (const a of archs) {
  for (const b of archs) {
    if (a === b) continue;
    const key = a + " vs " + b;
    matchups[key] = { aWins: 0, bWins: 0, draws: 0, koA: 0, koB: 0, subA: 0, subB: 0, totalFights: 0 };
  }
}

const level = 1.0; // all fighters at level 1.0

for (let i = 0; i < 1000; i++) {
  for (const archA of archs) {
    for (const archB of archs) {
      if (archA === archB) continue;
      const key = archA + " vs " + archB;
      
      const A = genFighter(level, archA);
      const B = genFighter(level, archB);
      
      let stA = 100, stB = 100, dmgA = 0, dmgB = 0;
      let scores = [];
      let finish = null;
      
      for (let r = 1; r <= 3; r++) {
        const res = simRound(r, A, B, stA, stB, "Balanced", "plan", false, 0);
        dmgA += res.dmgA; dmgB += res.dmgB;
        stA = res.staA; stB = res.staB;
        scores.push({ a: res.scoreA, b: res.scoreB });
        if (res.finish) { finish = res.finish; break; }
      }
      
      matchups[key].totalFights++;
      if (finish) {
        if (finish.by === "A") {
          matchups[key].aWins++;
          if (finish.how === "KO/TKO") matchups[key].koA++;
          else matchups[key].subA++;
        } else {
          matchups[key].bWins++;
          if (finish.how === "KO/TKO") matchups[key].koB++;
          else matchups[key].subB++;
        }
      } else {
        const winsA = scores.filter(s => s.a > s.b).length;
        const winsB = scores.filter(s => s.b > s.a).length;
        if (winsA > winsB) matchups[key].aWins++;
        else if (winsB > winsA) matchups[key].bWins++;
        else matchups[key].draws++;
      }
    }
  }
}

// ===== PRINT RESULTS =====
console.log("=== Matchup Matrix (1000 fights per pair, equal stats level 1.0) ===\n");
console.log("| Matchup | A Wins | B Wins | Draws | A Win% | KO A | KO B | Sub A | Sub B |");
console.log("|---------|--------|--------|-------|--------|------|------|-------|-------|");

for (const [key, m] of Object.entries(matchups)) {
  const [a, b] = key.split(" vs ");
  const aPct = (m.aWins / m.totalFights * 100).toFixed(1);
  console.log(`| ${a.padEnd(15)} vs ${b.padEnd(15)} | ${String(m.aWins).padStart(4)} | ${String(m.bWins).padStart(4)} | ${String(m.draws).padStart(5)} | ${aPct.padStart(5)}% | ${String(m.koA).padStart(4)} | ${String(m.koB).padStart(4)} | ${String(m.subA).padStart(5)} | ${String(m.subB).padStart(5)} |`);
}
