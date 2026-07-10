// Tier event generator — camp-tier-specific events
import { random, pick } from "../../rng.js";
import { PROB_TIER_EVENT } from "../config.js";

export function generateTierEvents(ctx) {
  const events = [];
  const pool = ctx.tierEvents;
  if (pool.length > 0 && random() < PROB_TIER_EVENT) {
    events.push(pick(pool));
  }
  return events;
}
