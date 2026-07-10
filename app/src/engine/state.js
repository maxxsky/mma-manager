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

// ---------- tick orchestration ----------
export function tick(g) {
  g.week++;

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

  // Phase 8: World simulation
  worldTick(g);
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
  // Cap log to prevent unbounded memory growth
  if (g.log.length > 200) g.log = g.log.slice(0, 200);
  if (g.cash < -50000) g.over = "BANGKRUT — kas di bawah -$50,000. Camp ditutup.";
}
