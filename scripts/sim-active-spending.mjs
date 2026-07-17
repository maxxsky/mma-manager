// sim-active-spending.mjs — Simulasi late-game dengan active spending
// Run: node scripts/sim-active-spending.mjs [seed1] [seed2] [seed3]
// Default: 42 12345 999
//
// Logic: tiap settlement, auto-accept fight offers, auto-simulate fights,
// auto-buy investment termurah + rekrut staff termurah yang available.

import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSrc = join(__dirname, "..", "app", "src", "engine");

// ── Data constants ──
const CAMP_TIERS = [
  { name: "Local Gym",     rep: 0,   cost: 0,       rosterCap: 4, coachCap: 1 },
  { name: "Regional Camp", rep: 15,  cost: 25000,   rosterCap: 6, coachCap: 2 },
  { name: "National Center", rep: 35, cost: 60000,  rosterCap: 8, coachCap: 3 },
  { name: "Elite MMA Factory", rep: 55, cost: 120000, rosterCap: 10, coachCap: 4 },
  { name: "World-Class Institute", rep: 75, cost: 250000, rosterCap: 14, coachCap: 5 },
];

const INVESTMENTS = [
  { id: "youthAcademy", name: "Youth Academy", cost: 250000, tierReq: 2 },
  { id: "communityOutreach", name: "Community Outreach Program", cost: 400000, tierReq: 2 },
  { id: "alumniNetwork", name: "Alumni Coaching Network", cost: 600000, tierReq: 3 },
  { id: "legacyMuseum", name: "Fight Legacy Museum", cost: 800000, legacyReq: 5000 },
];

const STAFF_ROLE_IDS = ["cutman", "nutritionist", "sportsPsych"];

// ── Load engine modules ──
const engine = await import(join(appSrc, "state.js"));
const rngMod = await import(join(appSrc, "rng.js"));
const fightMod = await import(join(appSrc, "fight.js"));
const commitMod = await import(join(appSrc, "fights", "commitResult.js"));
const reducerFight = await import(join(appSrc, "reducer", "fight.js"));

const { newGame, tick } = engine;
const { clamp } = rngMod;

// ── Helpers ──
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmt$(n) {
  return (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
}

// ── Auto-accept all inbox offers ──
function autoAcceptOffers(g) {
  for (const msg of [...g.inbox]) {
    if (msg.type === "offer" && msg.fighterId && !msg.defenseEscalation) {
      // Check fighter isn't already booked
      const f = g.roster.find((x) => x.id === msg.fighterId);
      if (!f || f.booked || f.injury) continue;
      // Accept the fight
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
        seed: Math.floor(rngMod.random() * 2**31),
        promotionId: msg.promotionId,
      };
      g.inbox = g.inbox.filter((x) => x.id !== msg.id);
      g.log.unshift(`📝 ${f.name} auto-accepted ${msg.tier || "?"} fight.`);
    }
  }
}

// ── Simulate a booked fighter's fight ──
function simFight(g, f) {
  if (!f.booked) return;
  const opp = f.booked.opponent;
  if (!opp) {
    // No opponent — just win by default
    const purse = (f.booked.show || 0) + (f.booked.winBonus || 0);
    const campCut = Math.round((f.contract?.managerCut || 0.18) * purse);
    g.cash += campCut;
    f.booked = null;
    f.record.w++;
    f.morale = clamp(f.morale + 12, 0, 100);
    f.popularity = clamp(f.popularity + 5, 0, 100);
    g.rep = clamp(g.rep + 7, 0, 100);
    g.legacy = (g.legacy || 0) + (f.booked?.title ? 2000 : 600);
    g.log.unshift(`🏆 ${f.name} wins (default).`);
    return;
  }
  // Simulate using the fight engine
  const A = fightMod.prepFighter(f);
  const B = fightMod.prepFighter(opp);
  const result = fightMod.simRound(1, A, B, 100, 100, "Balanced", "neutral", 0);
  const won = result.winner === "A";
  const how = result.finish ? result.finish.how : "Decision";
  const r = result.finish ? result.finish.duringRound : 1;

  commitMod.commitFightResult(g, f, { won, how, r, totalDmgA: result.dmgA || 0, totalDmgB: result.dmgB || 0, attitude: "Professional" });

  // The fighter's booked is cleared by commitFightResult, re-check
  if (f.booked) {
    // Safety: force clear if commitResult didn't
    g.log.unshift(`⚠️ ${f.name} fight result processed, clearing stale booked.`);
    f.booked = null;
  }
}

// ── Single run ──
function run(seed, label) {
  const myRng = mulberry32(seed);
  rngMod.setRNG(myRng);
  rngMod.setUID(1);

  const g = newGame();
  g.investments = {};
  g.staff = {};
  g.legacy = 0;

  const purchases = [];
  let tierLabel = "T0";
  const snapshots = [];

  for (let w = 1; w <= 192; w++) {
    // Pre-tick: settlement decisions
    if (w % 4 === 0) {
      // ── Auto-accept offers before tick processes them ──
      autoAcceptOffers(g);

      // ── Tier upgrade ──
      const nextTier = (g.campTier || 0) + 1;
      if (nextTier < CAMP_TIERS.length) {
        const t = CAMP_TIERS[nextTier];
        if (g.rep >= t.rep && g.cash >= t.cost) {
          g.cash -= t.cost;
          g.campTier = nextTier;
          g.rep = Math.min(g.rep + 8, 100);
          purchases.push({ week: w, type: "tier", name: t.name, cost: t.cost });
          tierLabel = `T${nextTier}`;
        }
      }

      // ── Investments: buy cheapest affordable, not owned ──
      for (const inv of [...INVESTMENTS].sort((a, b) => a.cost - b.cost)) {
        if (g.investments[inv.id]) continue;
        if (inv.tierReq && (g.campTier || 0) < inv.tierReq) continue;
        if (inv.legacyReq && (g.legacy || 0) < inv.legacyReq) continue;
        if (g.cash < inv.cost) continue;
        g.cash -= inv.cost;
        g.investments[inv.id] = true;
        purchases.push({ week: w, type: "investment", name: inv.name, cost: inv.cost });
        break;
      }

      // ── Staff: hire cheapest per role (only if cash buffer > 3mo salary) ──
      for (const roleId of STAFF_ROLE_IDS) {
        if (g.staff[roleId]) continue;
        const market = g.staffMarket?.[roleId] || [];
        if (market.length === 0) continue;
        const cand = [...market].sort((a, b) => a.salary - b.salary)[0];
        // Only hire if camp has enough income to sustain: need T1+ and cash buffer 3mo salary
        if ((g.campTier || 0) < 1) continue;
        const projectedSal = Object.values(g.staff).reduce((s, m) => s + (m?.salary || 0), 0) + cand.salary;
        if (g.cash - projectedSal * 3 < 5000) continue;
        g.staff[roleId] = cand;
        g.staffMarket[roleId] = g.staffMarket[roleId].filter((x) => x.id !== cand.id);
        purchases.push({ week: w, type: "staff", role: roleId, name: cand.name, salary: cand.salary });
      }

      // ── Simulate fights for booked fighters with weeksLeft <= 0 ──
      for (const f of g.roster) {
        if (f.booked && f.booked.weeksLeft <= 0 && !f.injury) {
          simFight(g, f);
        }
      }
    }

    tick(g);

    // Snapshots every 12 weeks
    if (w % 24 === 0 || w === 1) {
      const ownedInv = Object.keys(g.investments).filter((k) => g.investments[k]);
      const hiredStaff = Object.keys(g.staff).filter((k) => g.staff[k]).map((k) => `${k}:${g.staff[k].name}`);
      snapshots.push({
        week: g.week,
        cash: g.cash,
        tier: tierLabel,
        rep: g.rep,
        legacy: g.legacy || 0,
        inv: ownedInv.length > 0 ? ownedInv.join(", ") : "—",
        staff: hiredStaff.length > 0 ? hiredStaff.join(", ") : "—",
      });
    }
  }

  // ── Print ──
  console.log(`\n${"=".repeat(100)}`);
  console.log(`  ${label}`);
  console.log(`${"=".repeat(100)}`);
  console.log("Week  Cash           Tier  Rep  Legacy  Investments                                                      Staff");
  for (const s of snapshots) {
    console.log(
      `W${String(s.week).padStart(2)}  ${fmt$(s.cash).padStart(11)}  ${s.tier.padStart(4)}  ${String(s.rep).padStart(3)}  ${String(Math.round(s.legacy)).padStart(5)}  ${s.inv.padEnd(65)}  ${s.staff}`
    );
  }

  console.log(`\nPurchase timeline (${purchases.length} events):`);
  for (const p of purchases) {
    let line;
    if (p.type === "tier") line = `  W${String(p.week).padStart(2)}  🏗️  Tier → ${p.name} (${fmt$(p.cost)})`;
    else if (p.type === "investment") line = `  W${String(p.week).padStart(2)}  🏛️  Buy ${p.name} (${fmt$(p.cost)})`;
    else line = `  W${String(p.week).padStart(2)}  👤  Hire ${p.name} (${p.role}) $${p.salary}/bln`;
    console.log(line);
  }

  const investSpent = purchases.filter((p) => p.type === "investment" || p.type === "tier").reduce((s, p) => s + (p.cost || 0), 0);
  const staffHired = Object.keys(g.staff).filter((k) => g.staff[k]).length;
  const staffSal = Object.values(g.staff).reduce((s, m) => s + (m?.salary || 0), 0);
  const invOwned = Object.keys(g.investments).filter((k) => g.investments[k]).length;
  console.log(`\n📊 Final:`);
  console.log(`  Cash: ${fmt$(g.cash)}  |  ${tierLabel}  |  Rep: ${g.rep}  |  Legacy: ${g.legacy}`);
  console.log(`  Total spent on tier+invest: ${fmt$(investSpent)}`);
  console.log(`  Staff: ${staffHired}/3 hired  |  ${fmt$(staffSal)}/mo`);
  console.log(`  Investments: ${invOwned}/${INVESTMENTS.length} owned`);
  if (invOwned < INVESTMENTS.length) {
    const missing = INVESTMENTS.filter((i) => !g.investments[i.id]).map((i) => i.name);
    console.log(`  Missing: ${missing.join(", ")}`);
  }
}

// ── Main ──
const seeds = process.argv.slice(2).map(Number).filter((n) => !isNaN(n));
if (seeds.length === 0) seeds.push(42, 12345, 999);

for (const seed of seeds) {
  run(seed, `seed=${seed}`);
}

console.log(`\n✅ Done — ${seeds.length} seed(s) simulated for 192 weeks each.`);
