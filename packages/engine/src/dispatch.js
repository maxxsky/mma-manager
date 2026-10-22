// Inbox Event Dispatcher — handler registry for INBOX_EVENT choices.
// Registry-driven: handlers register by choice key, dispatcher routes by key match.
//
// Handlers receive a context object { g, c, action } for future extensibility.

import { clamp, random } from "./rng.js";
import { registerFighterHandlers } from "./dispatch/handlers/fighter.js";
import { registerCoachHandlers } from "./dispatch/handlers/coach.js";
import { registerClassChangeHandlers } from "./dispatch/handlers/class-change.js";
import { registerSponsorHandlers } from "./dispatch/handlers/sponsor.js";
import { registerPromotionHandlers } from "./dispatch/handlers/promotion.js";
import { registerGeneralHandlers } from "./dispatch/handlers/general.js";
import { registerTalentHandlers } from "./dispatch/handlers/talent.js";

// ── Registry ──

const handlers = {};

function register(key, fn) {
  handlers[key] = fn;
}

// Bootstrap all handler modules
registerFighterHandlers(register);
registerCoachHandlers(register);
registerClassChangeHandlers(register);
registerSponsorHandlers(register);
registerPromotionHandlers(register);
registerGeneralHandlers(register);
registerTalentHandlers(register);

// ── Fallback: chemistry / gamble ──

// Chemistry part of a choice: a fixed delta, or a gamble rolled here.
// gambleRoll may be passed by harnesses/tests for a fixed outcome; the game
// leaves it out so the roll uses the engine RNG inside the reducer.
function applyChemistry(g, c, action) {
  let d = c.chem || 0;
  if (c.gamble) {
    const roll = typeof action.gambleRoll === "number" ? action.gambleRoll : random();
    d = roll < 0.5 ? c.gamble[0] : c.gamble[1];
  }
  g.chemistry = clamp(g.chemistry + d, 0, 100);
  if (d) g.log.unshift("Chemistry " + (d >= 0 ? "+" : "") + d + ".");
}


/**
 * Apply an inbox choice. Every effect key on the choice runs, in handler
 * registration order, then its chemistry. This used to stop at the first
 * matching key, so e.g. "Bonus retensi" raised morale without charging the
 * cash and "Pesta besar ($5,000, chemistry +8)" charged the cash without the
 * chemistry (P2 #32 investigation).
 */
export function dispatchEvent(g, action, choice = action.choice) {
  const c = choice;
  if (!c) return;

  // Context object for handlers — future extensibility
  const ctx = { g, c, action };

  for (const [key, handler] of Object.entries(handlers)) {
    if (c[key] != null) handler(ctx);
  }
  if (c.chem || c.gamble) applyChemistry(g, c, action);
}
