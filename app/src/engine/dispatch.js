// Inbox Event Dispatcher — handler registry for INBOX_EVENT choices.
// Registry-driven: handlers register by choice key, dispatcher routes by key match.
//
// Handlers receive a context object { g, c, action } for future extensibility.

import { clamp } from "./rng.js";
import { registerFighterHandlers } from "./dispatch/handlers/fighter.js";
import { registerCoachHandlers } from "./dispatch/handlers/coach.js";
import { registerClassChangeHandlers } from "./dispatch/handlers/class-change.js";
import { registerSponsorHandlers } from "./dispatch/handlers/sponsor.js";
import { registerPromotionHandlers } from "./dispatch/handlers/promotion.js";
import { registerGeneralHandlers } from "./dispatch/handlers/general.js";

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

// ── Fallback: chemistry / gamble ──

function fallbackHandler(g, c, action) {
  let d = c.chem || 0;
  if (c.gamble && action.gambleRoll != null) {
    d = action.gambleRoll < 0.5 ? c.gamble[0] : c.gamble[1];
  }
  g.chemistry = clamp(g.chemistry + d, 0, 100);
  if (d) g.log.unshift("Chemistry " + (d >= 0 ? "+" : "") + d + ".");
}

// ── Main dispatch function ──

export function dispatchEvent(g, action) {
  const c = action.choice;
  if (!c) return;

  // Context object for handlers — future extensibility
  const ctx = { g, c, action };

  for (const [key, handler] of Object.entries(handlers)) {
    if (c[key] != null) {
      handler(ctx);
      return;
    }
  }

  // No registered handler matched — fallback
  fallbackHandler(g, c, action);
}
