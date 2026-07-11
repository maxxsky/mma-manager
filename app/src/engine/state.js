// state.js — orchestration layer for MMA Manager game engine
//
// Responsibilities:
//   - newGame() — assemble initial game state from builders
//   - tick()    — orchestrate simulation domains in order
//   - Final state checks (log cap, game over)
//
// Domain logic lives in dedicated tick modules:
//   tick/chemistry.js    — camp events, fighter relationships
//   tick/training.js     — fighter growth, overtraining, injury
//   tick/fight-offers.js — matchmaking, inbox expiry, prospect decay
//   tick/settlement.js   — monthly finances, coach growth, fighter requests
//   tick/yearly.js       — aging, retirement, fight inactivity
//   tick/weight-change.js— weight class movement
//   tick/rankings.js     — division rankings
//   tick/rivals.js       — rival camp simulation, poaching

import { uid } from "./rng.js";
import { BANKRUPT_THRESHOLD, BANKRUPTCY_GRACE_WEEKS, CASH_WARNING_THRESHOLD, CASH_WARNING_RESET_BUFFER } from "./reducer/constants.js";
import { fmt$ } from "./rng.js";
import { createEconomy, createCamp, createRoster, createCoaches, createWorld } from "./builders.js";
import { tickTraining } from "./tick/training.js";
import { tickChemistry } from "./tick/chemistry.js";
import { tickFightOffers } from "./tick/fight-offers.js";
import { tickSettlement } from "./tick/settlement.js";
import { tickYearly } from "./tick/yearly.js";
import { tickWeightChange } from "./tick/weight-change.js";
import { tickRivals } from "./tick/rivals.js";
import { worldTick } from "./world.js";
import { processEventSystem } from "./events.js";
import { trackCoachCareer, trackSponsorRelations } from "./identity.js";
import { tickAllShadowCamps } from "./shadow-ai.js";
import { narrativeTick } from "./narrative-presentation.js";
import { updateDynasty } from "./dynasty.js";
import { checkObjectives, getTip } from "./onboarding.js";

// ---------- initial state ----------
export function newGame() {
  return {
    week: 1,
    ...createEconomy(),
    ...createCamp(),
    roster: createRoster(),
    ...createCoaches(),
    ...createWorld(),
    legacy: 0, over: null, won: false,
  };
}

// ---------- cash warning ----------
function checkCashWarning(g) {
  if (g.cash < CASH_WARNING_THRESHOLD && !g.cashWarningActive) {
    g.cashWarningActive = true;
    g.inbox.unshift({
      id: uid(), type: "event",
      title: "⚠️ Kas Menipis",
      body: `Kas camp tinggal ${fmt$(g.cash)}. Kalau terus minus, camp bisa bangkrut di ${fmt$(BANKRUPT_THRESHOLD)}. Cek tab Finance.`,
      choices: [{ label: "Mengerti", chem: 0 }],
    });
  } else if (g.cash >= CASH_WARNING_THRESHOLD + CASH_WARNING_RESET_BUFFER) {
    g.cashWarningActive = false;
  }
}

// ---------- tick orchestration ----------
export function tick(g) {
  g.week++;

  // DEBUG: check state integrity
  if (!g.roster || !g.log || !g.coaches || !g.inbox) {
    console.error('TICK STATE CORRUPTED:', {
      hasRoster: !!g.roster, rosterType: typeof g.roster,
      hasLog: !!g.log, logType: typeof g.log,
      hasCoaches: !!g.coaches, hasInbox: !!g.inbox,
      hasCash: !!g.cash, hasWeek: !!g.week
    });
  }

  // Phase 1: Training
  tickTraining(g);

  // Phase 2: Chemistry — camp events + relationships
  if (!tickChemistry(g)) return;

  // Phase 3: Fight offers — matchmaking + expiry
  tickFightOffers(g);

  // Phase 4: Monthly settlement — finances, rankings, fighter requests
  tickSettlement(g);

  // Phase 5: Yearly events — aging, retirement
  tickYearly(g);

  // Phase 6: Weight class changes
  tickWeightChange(g);

  // Phase 7: Rival simulation
  tickRivals(g);

  // Phase 8: World simulation — returns events, deliver to inbox
  const worldEvents = worldTick(g);
  worldEvents.forEach((ev) => {
    g.inbox.unshift({ id: uid(), type: "world", severity: ev.severity || "minor", title: ev.title, body: ev.body, choices: [{ label: "OK", chem: 0 }] });
  });
  processEventSystem(g);
  trackCoachCareer(g);
  tickAllShadowCamps(g);
  narrativeTick(g);
  checkObjectives(g);
  updateDynasty(g);

  // Onboarding tip
  const tip = getTip(g);
  if (tip) {
    g.inbox.unshift({ id: uid(), type: "event", title: tip.title, body: tip.body, choices: [{ label: "Got it", chem: 0 }] });
  }
  trackSponsorRelations(g);

  // Final state checks
  checkCashWarning(g);
  // Cap log to prevent unbounded memory growth
  if (g.log && g.log.length > 200) g.log = g.log.slice(0, 200);
  if (g.cash < BANKRUPT_THRESHOLD) {
    if (g.bankruptcyGraceWeeksLeft == null) {
      g.bankruptcyGraceWeeksLeft = BANKRUPTCY_GRACE_WEEKS;
      g.inbox.unshift({
        id: uid(), type: "event",
        title: "🚨 Camp di Ambang Bangkrut",
        body: `Kas ${fmt$(g.cash)} — di bawah batas. ${BANKRUPTCY_GRACE_WEEKS} minggu buat benerin sebelum camp resmi tutup.`,
        choices: [
          { label: "Potong biaya darurat (jual aset, chemistry -10)", emergencyCostCut: true },
          { label: "Coba pulihkan sendiri", chem: 0 },
        ],
      });
    } else {
      g.bankruptcyGraceWeeksLeft--;
      if (g.bankruptcyGraceWeeksLeft <= 0) {
        g.over = "BANGKRUT — gagal pulih dalam masa tenggang. Camp ditutup.";
      }
    }
  } else if (g.bankruptcyGraceWeeksLeft != null) {
    g.bankruptcyGraceWeeksLeft = null;
    g.log.unshift("✅ Kas pulih di atas ambang bangkrut — camp selamat.");
  }
}
