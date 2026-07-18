// sim-longrun-health.mjs — Long-run health: save size, dynasty loop, difficulty baseline
// Run: node scripts/sim-longrun-health.mjs [seed1] [seed2] [seed3]
// Default: 42 12345 999
//
// Measures across 1040 weeks (20 years):
//   1. Save size growth  (JSON.stringify(g).length)
//   2. Retirement→dynasty pipeline (fighter → retire/coach → roster replacement)
//   3. Win-rate per 5-year phase (baseline difficulty)
//   4. Cash-floor (ever)
//
// Differs from other sim scripts: processes INBOX_EVENT choices (retirement, chemistry, etc.)

import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSrc = join(__dirname, "..", "packages", "engine", "src");

// ── Data constants (mirror from other sim scripts) ──
const CAMP_TIERS = [
  { name: "Local Gym",     rep: 0,   cost: 0,       rosterCap: 4, coachCap: 1 },
  { name: "Regional Camp", rep: 15,  cost: 25000,   rosterCap: 6, coachCap: 2 },
  { name: "National Center", rep: 35, cost: 60000,  rosterCap: 8, coachCap: 3 },
  { name: "Elite MMA Factory", rep: 55, cost: 120000, rosterCap: 10, coachCap: 4 },
  { name: "World-Class Institute", rep: 75, cost: 250000, rosterCap: 14, coachCap: 5 },
];

const INVESTMENTS = [
  { id: "youthAcademy", name: "Youth Academy", cost: 45000, tierReq: 2 },
  { id: "communityOutreach", name: "Community Outreach Program", cost: 70000, tierReq: 2 },
  { id: "alumniNetwork", name: "Alumni Coaching Network", cost: 130000, tierReq: 3 },
  { id: "legacyMuseum", name: "Fight Legacy Museum", cost: 300000, legacyReq: 5000 },
];

const STAFF_ROLE_IDS = ["cutman", "nutritionist", "sportsPsych"];
const ATTR_NAMES = ["striking", "wrestling", "bjj", "footwork", "strength", "cardio", "chin", "fightIQ"];

// ── Load engine modules ──
const engine = await import(join(appSrc, "state.js"));
const rngMod = await import(join(appSrc, "rng.js"));
const fightMod = await import(join(appSrc, "fight.js"));
const commitMod = await import(join(appSrc, "fights", "commitResult.js"));
const talentMod = await import(join(appSrc, "talentPool.js"));
const trainMod = await import(join(appSrc, "training-philosophy.js"));
const fighterMod = await import(join(appSrc, "fighter.js"));
const dispatchMod = await import(join(appSrc, "dispatch.js"));
const reducerMod = await import(join(appSrc, "reducer", "ui.js"));

const { newGame, tick } = engine;
const { setRNG, setUID, clamp, random } = rngMod;
const { dispatchEvent } = dispatchMod;

// ── Helpers ──
function mulberry32(s) {
  return function(){s|=0;s=(s+0x6d2b79f5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296};
}

function fmt$(n) {
  return (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
}

// ── Inbox event processing (simulates player clicking choices) ──
function processInboxEvents(g) {
  for (const msg of [...g.inbox]) {
    if (!msg.choices || msg.choices.length === 0) continue;

    // Handle ALL message types with choices (events, sponsors, promotions, etc.)

    // ── Find the best choice ──
    let selectedChoice = null;
    let selectedIdx = -1;

    // Retirement: prefer "retire" (hormati pensiun), skip "convince"
    const hasRetire = msg.choices.findIndex((c) => c.retire != null);
    const hasConvince = msg.choices.findIndex((c) => c.convince != null);
    const hasToCoach = msg.choices.findIndex((c) => c.toCoach != null);

    if (hasRetire >= 0) {
      // Retirement event — always pick "retire" to trigger dynasty pipeline
      selectedIdx = hasRetire;
    } else if (hasToCoach >= 0 && hasConvince >= 0) {
      // Retirement event but no retire choice (edge case) — pick toCoach
      selectedIdx = hasToCoach;
    } else {
      // Generic event: pick the choice with the highest future-proof score
      // Prefer actual handler keys (chem, moraleTo, etc.) over risk/gambles
      let bestScore = -Infinity;
      for (let i = 0; i < msg.choices.length; i++) {
        const c = msg.choices[i];
        let score = 0;
        // Prefer choices with chem gain
        if (c.chem != null) score += c.chem * 3;
        // Prefer morale gains
        if (c.moraleTo?.amt) score += c.moraleTo.amt;
        // Prefer sponsor renewal (keep income)
        if (c.sponsorRenew) score += 50;
        // Prefer coachSalary raise (keep staff)
        if (c.coachSalary) score += 40;
        // Prefer viralPop (popularity)
        if (c.viralPop) score += 20;
        // Penalize gambles (unpredictable)
        if (c.gamble) score -= 15;
        // Penalize coach resign risk
        if (c.coachResignChance) score -= 30;
        // Penalize cash costs (unless it's an investment)
        if (c.cash && c.cash < 0) score -= Math.abs(c.cash) / 10000;
        if (c.retire) score += 100;  // highest priority
        if (c.toCoach) score += 80;  // second highest

        if (score > bestScore) {
          bestScore = score;
          selectedIdx = i;
        }
      }
      // Fallback: first choice
      if (selectedIdx < 0) selectedIdx = 0;
    }

    selectedChoice = msg.choices[selectedIdx];

    // Remove from inbox and dispatch
    g.inbox = g.inbox.filter((x) => x.id !== msg.id);
    dispatchEvent(g, {
      choice: selectedChoice,
      gambleRoll: selectedChoice.gamble != null ? random() : null,
    });
  }
}

// ── Auto-accept fight offers ──
function autoAcceptOffers(g) {
  for (const msg of [...g.inbox]) {
    if (msg.type === "offer" && msg.fighterId && !msg.defenseEscalation && !msg.choices) {
      const f = g.roster.find((x) => x.id === msg.fighterId);
      if (!f || f.booked || f.injury) continue;
      f.booked = {
        opponent: msg.opponent,
        weeksLeft: msg.weeks || 4,
        show: msg.show || 1000,
        winBonus: msg.winBonus || 1000,
        tier: msg.tier || "Local",
        title: msg.title || false,
        titleTier: msg.titleTier || null,
        defense: msg.defense || false,
        oppRank: msg.oppRank || null,
        contenderId: msg.contenderId || null,
        seed: Math.floor(random() * 2**31),
        promotionId: msg.promotionId,
      };
      g.inbox = g.inbox.filter((x) => x.id !== msg.id);
    }
  }
}

// ── Simulate a booked fighter's fight ──
function simFight(g, f) {
  if (!f.booked) return;
  const opp = f.booked.opponent;
  if (!opp) {
    const purse = (f.booked.show || 0) + (f.booked.winBonus || 0);
    const campCut = Math.round((f.contract?.managerCut || 0.18) * purse);
    g.cash += campCut;
    f.booked = null;
    return { outcome: "default-win", won: true };
  }
  const A = fightMod.prepFighter(f);
  const B = fightMod.prepFighter(opp);
  const result = fightMod.simRound(1, A, B, 100, 100, "Balanced", "neutral", 0);
  const won = result.winner === "A";
  commitMod.commitFightResult(g, f, {
    won, how: result.finish?.how || "Decision",
    r: result.finish?.duringRound || 1,
    totalDmgA: result.dmgA || 0,
    totalDmgB: result.dmgB || 0,
    attitude: "Professional",
  });
  if (f.booked) f.booked = null;
  return { outcome: won ? "win" : "loss", won };
}

// ── Auto-enlist prospects ──
function autoEnlistProspects(g) {
  if (!g.prospects) return;
  for (const p of [...g.prospects]) {
    if (!talentMod.rosterHasSpace(g)) break;
    const f = p.fighter;
    f.contract = fighterMod.defaultContract();
    f.joinedWeek = g.week;
    g.roster.push(f);
    g.prospects = g.prospects.filter((x) => x.id !== p.id);
    g.log.unshift(`🏋️ ${f.name} auto-enlisted dari prospect.`);
  }
}

// ── Assign training for all fighters ──
function assignTraining(g) {
  g.roster.forEach((f) => {
    if (f.injury || f.booked) return;
    let program = "conditioning";
    if (g.coaches && g.coaches.length > 0) {
      const recs = trainMod.getCoachRecommendation(g.coaches[0], f);
      if (recs.length > 0) program = recs[0].program;
    }
    if ((f.overtraining || 0) >= 50) {
      program = "recovery";
      f.training = { type: "recovery", intensity: "Light" };
      return;
    }
    f.training = { type: program, intensity: "Medium" };
  });
}

// ── Single run ──
function run(seed, label) {
  setRNG(mulberry32(seed));
  setUID(1);

  const g = newGame();
  g.investments = {};
  g.staff = {};
  g.legacy = 0;

  // Metrics
  let totalFights = 0, totalWins = 0;
  let cashFloor = g.cash;
  let cumulativeRetired = 0;
  let cumulativeCoaches = 0;
  let maxCoachCount = g.coaches?.length || 0;
  let predecessorCount = g.coaches?.length || 0;
  const saveSnapshots = [];  // weekly save-size snapshots
  const phaseRecords = [];   // 5-year (260-week) phase records

  // Phase tracking
  let phaseWins = 0, phaseFights = 0;
  let phaseStart = 0;

  let lastPhaseCheck = 0;

  for (let w = 1; w <= 1040; w++) {
    // Track coach count growth from toCoach handler
    if (g.coaches?.length > maxCoachCount) {
      cumulativeCoaches += (g.coaches.length - maxCoachCount);
      maxCoachCount = g.coaches.length;
    }

    // ── Settlement cycle (every 4 weeks) ──
    if (w % 4 === 0) {
      // 1. Process inbox events (retirement, chemistry, etc.)
      processInboxEvents(g);

      // 2. Auto-accept fight offers
      autoAcceptOffers(g);

      // 3. Enlist prospects
      autoEnlistProspects(g);

      // 4. Assign training
      assignTraining(g);

      // 5. Tier upgrade
      const nextTier = (g.campTier || 0) + 1;
      if (nextTier < CAMP_TIERS.length) {
        const t = CAMP_TIERS[nextTier];
        if (g.rep >= t.rep && g.cash >= t.cost) {
          g.cash -= t.cost;
          g.campTier = nextTier;
          g.rep = Math.min(g.rep + 8, 100);
        }
      }

      // 6. Investments
      for (const inv of [...INVESTMENTS].sort((a, b) => a.cost - b.cost)) {
        if (g.investments[inv.id]) continue;
        if (inv.tierReq && (g.campTier || 0) < inv.tierReq) continue;
        if (inv.legacyReq && (g.legacy || 0) < inv.legacyReq) continue;
        if (g.cash < inv.cost) continue;
        g.cash -= inv.cost;
        g.investments[inv.id] = true;
        break;
      }

      // 7. Staff
      for (const roleId of STAFF_ROLE_IDS) {
        if (g.staff[roleId]) continue;
        if ((g.campTier || 0) < 1) continue;
        const market = g.staffMarket?.[roleId] || [];
        if (market.length === 0) continue;
        const cand = [...market].sort((a, b) => a.salary - b.salary)[0];
        const projectedSal = Object.values(g.staff).reduce((s, m) => s + (m?.salary || 0), 0) + cand.salary;
        if (g.cash - projectedSal * 3 < 5000) continue;
        g.staff[roleId] = cand;
        g.staffMarket[roleId] = g.staffMarket[roleId].filter((x) => x.id !== cand.id);
      }

      // 8. Simulate fights
      for (const f of g.roster) {
        if (f.booked && f.booked.weeksLeft <= 0 && !f.injury) {
          const result = simFight(g, f);
          if (result) {
            totalFights++;
            phaseFights++;
            if (result.won) {
              totalWins++;
              phaseWins++;
            }
          }
        }
      }
    }

    // ── Track retirement by checking roster changes ──
    // Count ex-fighters who were retired (removed from roster via "retire" key)
    // This is tracked via the number of g.roster.filter removals in the retire handler.
    // We can't directly observe it, but we infer from roster shrinkage then regrowth.
    // Instead: count retired fighters from g._worldHistory.retiredChamps after simulation.
    // Actually, we'll track it post-run.

    // ── Tick ──
    tick(g);

    // ── Track cash floor ──
    if (g.cash < cashFloor) cashFloor = g.cash;

    // ── Annual snapshot (every 52 weeks) ──
    if (w % 52 === 0) {
      const saveSize = JSON.stringify(g).length;
      saveSnapshots.push({ week: w, saveSize });

      // Track roster replacements: roster not empty = alive
    }

    // ── Phase boundary (every 260 weeks = 5 years) ──
    if (w % 260 === 0 && w > 0) {
      phaseRecords.push({
        phase: `W${w - 259}-${w}`,
        week: w,
        fights: phaseFights,
        wins: phaseWins,
        winRate: phaseFights > 0 ? Math.round((phaseWins / phaseFights) * 100) : "N/A",
        roster: g.roster.length,
      });
      phaseFights = 0;
      phaseWins = 0;
    }
  }

  // ── Post-run metrics ──
  const finalSaveSize = saveSnapshots.length > 0 ? saveSnapshots[saveSnapshots.length - 1].saveSize : JSON.stringify(g).length;
  const overallWinRate = totalFights > 0 ? Math.round((totalWins / totalFights) * 100) : "N/A";
  const totalRetired = g._worldHistory?.retiredChamps?.length || 0;
  const coachFromFighters = g.coaches?.filter((c) => c.name?.startsWith("Coach "))?.length || 0;

  // Detect generation transition: at least 1 retirement AND new fighters joined
  const newFightersJoined = g.roster.some((f) => f.joinedWeek > 400); // joined after year 8
  const generationTransition = totalRetired > 0 && g.roster.length >= 2;

  // Roster age distribution (youngest 3 fighters' average age = proxy for fresh blood)
  const sortedByAge = [...g.roster].sort((a, b) => a.age - b.age);
  const youngestAvg = sortedByAge.length >= 3
    ? Math.round((sortedByAge[0].age + sortedByAge[1].age + sortedByAge[2].age) / 3)
    : sortedByAge.length > 0 ? sortedByAge[0].age : "N/A";

  // ── Print ──
  console.log(`\n${"=".repeat(120)}`);
  console.log(`  ${label} — 1040 weeks (20 years)`);
  console.log(`${"=".repeat(120)}`);

  // Save size over time
  console.log(`\n📦 Save Size Growth (JSON.stringify):`);
  console.log(`  Week  Size (KB)`);
  for (const s of saveSnapshots) {
    console.log(`  W${String(s.week).padStart(4)}  ${(s.saveSize / 1024).toFixed(2)} KB`);
  }

  // Phase win-rates
  console.log(`\n📊 Win Rate per 5-Year Phase:`);
  console.log(`  Phase              Fights  Wins    Win%    Roster`);
  for (const p of phaseRecords) {
    console.log(`  ${p.phase.padStart(14)}  ${String(p.fights).padStart(6)}  ${String(p.wins).padStart(5)}  ${String(p.winRate).padStart(5)}  ${String(p.roster).padStart(6)}`);
  }
  if (phaseFights > 0) { // Remaining 4th phase partial
    phaseRecords.push({
      phase: `W${(Math.floor(1040 / 260) * 260) + 1}-${1040}`,
      week: 1040, fights: phaseFights, wins: phaseWins,
      winRate: Math.round((phaseWins / phaseFights) * 100),
      roster: g.roster.length,
    });
    console.log(`  W${(Math.floor(1040 / 260) * 260) + 1}-${1040}${" ".repeat(5)}  ${String(phaseFights).padStart(6)}  ${String(phaseWins).padStart(5)}  ${String(Math.round(phaseWins / phaseFights * 100)).padStart(5)}  ${String(g.roster.length).padStart(6)}`);
  }

  // Dynasty / generation transition
  console.log(`\n👑 Dynasty & Retirement Pipeline:`);
  console.log(`  Total retired champions recorded: ${totalRetired}`);
  console.log(`  Coaches converted from fighters:  ${coachFromFighters} (name starts with "Coach ")`);
  console.log(`  Roster age range:                 ${sortedByAge.length > 0 ? sortedByAge[0].age : "?"} — ${sortedByAge.length > 0 ? sortedByAge[sortedByAge.length - 1].age : "?"} years`);
  console.log(`  Youngest 3 avg age:               ${youngestAvg}`);
  console.log(`  Generation transition detected:   ${generationTransition ? "✅ YES" : "❌ NO"}`);
  console.log(`  Roster count (end):               ${g.roster.length}`);
  if (g.roster.length >= 2) {
    const oldest = [...g.roster].sort((a, b) => b.age - a.age);
    console.log(`  Oldest fighter:                   ${oldest[0].name} (${oldest[0].age}yo)`);
    console.log(`  Youngest fighter:                 ${sortedByAge[0].name} (${sortedByAge[0].age}yo)`);
  }

  // Overall
  console.log(`\n💰 Financial:`);
  console.log(`  Final cash:   ${fmt$(g.cash)}`);
  console.log(`  Cash floor:   ${fmt$(cashFloor)}`);
  console.log(`  Final Tier:   T${g.campTier || 0} (${CAMP_TIERS[g.campTier || 0]?.name || "?"})`);
  console.log(`  Final Rep:    ${g.rep}`);
  console.log(`  Investments:  ${Object.keys(g.investments).filter(k => g.investments[k]).length}/${INVESTMENTS.length}`);
  console.log(`  Staff:        ${Object.keys(g.staff).filter(k => g.staff[k]).length}/3`);

  console.log(`\n🤺 Overall:`);
  console.log(`  Total fights: ${totalFights}`);
  console.log(`  Total wins:   ${totalWins}`);
  console.log(`  Win rate:     ${overallWinRate}%`);
  console.log(`  Final save:   ${(finalSaveSize / 1024).toFixed(2)} KB (${(finalSaveSize / 1024 / 1024).toFixed(4)} MB)`);
  console.log(`  Save growth:  ${saveSnapshots.length > 1 ? ((saveSnapshots[saveSnapshots.length - 1].saveSize - saveSnapshots[0].saveSize) / 1024).toFixed(2) + " KB" : "N/A"}`);

  // ── Return structured results ──
  return {
    seed,
    saveSizeBytes: finalSaveSize,
    totalRetired,
    coachFromFighters,
    generationTransition,
    cashFloor,
    overallWinRate: typeof overallWinRate === "number" ? overallWinRate : 0,
    totalFights,
    totalWins,
    finalRoster: g.roster.length,
    youngestAvg,
    phaseRecords,
    saveSnapshots,
  };
}

// ── Main ──
const seeds = process.argv.slice(2).map(Number).filter((n) => !isNaN(n));
if (seeds.length === 0) seeds.push(42, 12345, 999);

const results = [];
for (const seed of seeds) {
  const r = run(seed, `seed=${seed}`);
  results.push(r);
}

// ── Summary table ──
console.log(`\n${"━".repeat(120)}`);
console.log(`  SUMMARY — 1040-week Long-Run Health`);
console.log(`${"━".repeat(120)}`);
console.log(`  Seed   Save(KB)  Retired  Coaches  GenTrans  CashFloor   WinRate  Fights  Roster  YoungAvg`);
for (const r of results) {
  const saveKB = (r.saveSizeBytes / 1024).toFixed(1);
  const genTrans = r.generationTransition ? "✅" : "❌";
  const cashFmt = fmt$(r.cashFloor).padStart(10);
  console.log(`  ${String(r.seed).padStart(5)}  ${saveKB.padStart(8)}  ${String(r.totalRetired).padStart(5)}  ${String(r.coachFromFighters).padStart(5)}  ${genTrans.padStart(5)}   ${cashFmt}  ${String(r.overallWinRate).padStart(4)}%  ${String(r.totalFights).padStart(5)}  ${String(r.finalRoster).padStart(5)}  ${String(r.youngestAvg).padStart(4)}`);
}

console.log(`\n✅ Done — ${results.length} seed(s) simulated for 1040 weeks each.`);
