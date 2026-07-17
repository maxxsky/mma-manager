// sim-active-progression.mjs — Simulasi kurva pertumbuhan fighter aktif
// Run: node scripts/sim-active-progression.mjs [seed1] [seed2] [seed3]
// Default: 42 12345 999
//
// Logic: auto-accept fight + talent discovery + auto-training + auto-buy
// Mirip sim-active-spending + recruitment + training assignment.

import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const appSrc = join(__dirname, "..", "app", "src", "engine");

// ── Data constants ──
const CAMP_TIERS = [
  { name: "Local Gym", rep: 0, cost: 0, rosterCap: 4, coachCap: 1 },
  { name: "Regional Camp", rep: 15, cost: 25000, rosterCap: 6, coachCap: 2 },
  { name: "National Center", rep: 35, cost: 60000, rosterCap: 8, coachCap: 3 },
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

const { newGame, tick } = engine;
const { clamp } = rngMod;

// ── Helpers ──
function mulberry32(s) {
  return function(){s|=0;s=(s+0x6d2b79f5)|0;let t=Math.imul(s^(s>>>15),1|s);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296};
}

function fmt$(n) {
  return (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
}

function calcAvgAttrs(roster) {
  if (!roster || roster.length === 0) return 0;
  const totals = {};
  ATTR_NAMES.forEach(k => totals[k] = 0);
  roster.forEach(f => {
    ATTR_NAMES.forEach(k => { totals[k] += f.attrs?.[k] || 0; });
  });
  const avg = ATTR_NAMES.reduce((s, k) => s + totals[k] / roster.length, 0) / ATTR_NAMES.length;
  return Math.round(avg * 10) / 10;
}

// ── Auto-accept all inbox offers ──
function autoAcceptOffers(g) {
  for (const msg of [...g.inbox]) {
    if (msg.type === "offer" && msg.fighterId && !msg.defenseEscalation) {
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
        seed: Math.floor(rngMod.random() * 2**31),
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
    f.record.w++;
    f.morale = clamp(f.morale + 12, 0, 100);
    f.popularity = clamp(f.popularity + 5, 0, 100);
    g.rep = clamp(g.rep + 7, 0, 100);
    g.legacy = (g.legacy || 0) + 600;
    return;
  }
  const A = fightMod.prepFighter(f);
  const B = fightMod.prepFighter(opp);
  const result = fightMod.simRound(1, A, B, 100, 100, "Balanced", "neutral", 0);
  const won = result.winner === "A";
  const how = result.finish ? result.finish.how : "Decision";
  const r = result.finish ? result.finish.duringRound : 1;
  commitMod.commitFightResult(g, f, { won, how, r, totalDmgA: result.dmgA || 0, totalDmgB: result.dmgB || 0, attitude: "Professional" });
  if (f.booked) f.booked = null;
}

// ── Single run ──
function run(seed, label) {
  rngMod.setRNG(mulberry32(seed));
  rngMod.setUID(1);

  const g = newGame();
  g.investments = {};
  g.staff = {};
  g.legacy = 0;

  let tierLabel = "T0";
  const snapshots = [];

  for (let w = 1; w <= 192; w++) {
    if (w % 4 === 0) {
      // ── Auto-accept fight offers ──
      autoAcceptOffers(g);

      // ── Auto-accept talent discovery ──
      // rollDiscoverTalent is called inside tickSettlement (via settlement.js),
      // so we check if a fighter was discovered by scanning inbox for talent events
      if (talentMod.rosterHasSpace(g)) {
        // The talent is auto-added via rollDiscoverTalent + settlement,
        // but we need to make sure the inbox event is processed.
        // Since we simulate tick() after this block, settlement will have
        // already run for the previous cycle. For new talent, we proactively
        // discover + accept here.
        const discovered = talentMod.rollDiscoverTalent(g);
        if (discovered) {
          const f = discovered;
          f.contract = fighterMod.defaultContract();
          f.joinedWeek = g.week;
          g.roster.push(f);
          g.log.unshift(`🏋️ ${f.name} auto-accepted ke roster.`);
        }
      }

      // ── Assign training for all fighters ──
      g.roster.forEach((f) => {
        if (f.injury || f.booked) return;
        // Use first coach's recommendation, or default to conditioning
        let program = "conditioning";
        let intensity = "Medium";
        if (g.coaches && g.coaches.length > 0) {
          const recs = trainMod.getCoachRecommendation(g.coaches[0], f);
          if (recs.length > 0) {
            program = recs[0].program;
          }
        }
        // Respect overtraining: switch to recovery if needed
        if ((f.overtraining || 0) >= 50) {
          program = "recovery";
          intensity = "Light";
        }
        f.training = { type: program, intensity };
      });

      // ── Tier upgrade ──
      const nextTier = (g.campTier || 0) + 1;
      if (nextTier < CAMP_TIERS.length) {
        const t = CAMP_TIERS[nextTier];
        if (g.rep >= t.rep && g.cash >= t.cost) {
          g.cash -= t.cost;
          g.campTier = nextTier;
          g.rep = Math.min(g.rep + 8, 100);
          tierLabel = `T${nextTier}`;
        }
      }

      // ── Investments ──
      for (const inv of [...INVESTMENTS].sort((a, b) => a.cost - b.cost)) {
        if (g.investments[inv.id]) continue;
        if (inv.tierReq && (g.campTier || 0) < inv.tierReq) continue;
        if (inv.legacyReq && (g.legacy || 0) < inv.legacyReq) continue;
        if (g.cash < inv.cost) continue;
        g.cash -= inv.cost;
        g.investments[inv.id] = true;
        break;
      }

      // ── Staff ──
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

      // ── Fight simulation ──
      for (const f of g.roster) {
        if (f.booked && f.booked.weeksLeft <= 0 && !f.injury) {
          simFight(g, f);
        }
      }
    }

    tick(g);

    if (w % 24 === 0 || w === 1) {
      const avgAttr = calcAvgAttrs(g.roster);
      const invOwned = Object.keys(g.investments).filter((k) => g.investments[k]).length;
      snapshots.push({
        week: g.week,
        cash: g.cash,
        tier: tierLabel,
        rep: g.rep,
        legacy: g.legacy || 0,
        roster: g.roster.length,
        avgAttr,
        inv: invOwned,
      });
    }
  }

  // ── Print ──
  console.log(`\n${"=".repeat(110)}`);
  console.log(`  ${label}`);
  console.log(`${"=".repeat(110)}`);
  console.log("Week  Cash           Tier  Rep  Legacy  Roster  AvgAttr  Investments");
  for (const s of snapshots) {
    console.log(
      `W${String(s.week).padStart(3)}  ${fmt$(s.cash).padStart(11)}  ${s.tier.padStart(4)}  ${String(s.rep).padStart(3)}  ${String(Math.round(s.legacy)).padStart(5)}  ${String(s.roster).padStart(6)}  ${String(s.avgAttr).padStart(6)}  ${s.inv}/${INVESTMENTS.length}`
    );
  }

  const startAvg = calcAvgAttrs(newGame().roster);
  const endAvg = calcAvgAttrs(g.roster);
  console.log(`\n📊 Growth summary:`);
  console.log(`  Roster: ${snapshots[0]?.roster || "?"} → ${g.roster.length} fighters`);
  console.log(`  Avg attrs: ${startAvg} (initial roster) → ${endAvg} (final)`);
  console.log(`  Rep: ${snapshots[0]?.rep || "?"} → ${g.rep}`);
  console.log(`  Cash: ${fmt$(snapshots[0]?.cash || 0)} → ${fmt$(g.cash)}`);
  console.log(`  Tier: ${tierLabel}`);
  console.log(`  Investments: ${Object.keys(g.investments).filter(k => g.investments[k]).length}/${INVESTMENTS.length}`);
  console.log(`  Staff: ${Object.keys(g.staff).filter(k => g.staff[k]).length}/3`);
}

// ── Main ──
const seeds = process.argv.slice(2).map(Number).filter((n) => !isNaN(n));
if (seeds.length === 0) seeds.push(42, 12345, 999);

for (const seed of seeds) {
  run(seed, `seed=${seed}`);
}

console.log(`\n✅ Done — ${seeds.length} seed(s) simulated for 192 weeks each.`);
