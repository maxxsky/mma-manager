// ============================================================
//   EVENT STATE SYSTEM — Connected events, flags, memory, camp states
//   State-driven, emergent, no scripted campaigns.
//   Orchestration layer — delegates generation to events/generators/.
// ============================================================

import { uid } from "./rng.js";
import { FLAG_DURATIONS, EVENT_INTERVAL } from "./events/config.js";
import { computeCampState, hasCampState, createEventContext } from "./events/context.js";
import { generateTierEvents } from "./events/generators/tier.js";
import { generateTensionEvents } from "./events/generators/tension.js";
import { generateMomentumEvents } from "./events/generators/momentum.js";
import { generateRebuildingEvents } from "./events/generators/rebuilding.js";
import { generatePressureEvents } from "./events/generators/pressure.js";
import { generateCoachEvents } from "./events/generators/coach.js";
import { generateFighterEvents } from "./events/generators/fighter.js";

// Re-export from context for backward compatibility
export { computeCampState, hasCampState };

// ── EVENT FLAGS ──

export function setFlag(obj, flag) {
  if (!obj._flags) obj._flags = {};
  obj._flags[flag] = (obj._flags[flag] || 0) + FLAG_DURATIONS[flag];
}

export function hasFlag(obj, flag) {
  return obj?._flags?.[flag] > 0;
}

export function decayFlags(g) {
  g.roster?.forEach((f) => decayObjFlags(f));
  g.coaches?.forEach((c) => decayObjFlags(c));
  decayObjFlags(g);
}

function decayObjFlags(obj) {
  if (!obj._flags) return;
  Object.keys(obj._flags).forEach((k) => {
    obj._flags[k] = Math.max(0, obj._flags[k] - 1);
    if (obj._flags[k] <= 0) delete obj._flags[k];
  });
}

// ── EVENT MEMORY ──

export function recordMemory(obj, key) {
  if (!obj._memory) obj._memory = {};
  obj._memory[key] = (obj._memory[key] || 0) + 1;
}

export function getMemory(obj, key) {
  return obj?._memory?.[key] || 0;
}

// ── DELAYED CONSEQUENCES ──

export function queueDelayedEvent(g, event, triggerWeek) {
  if (!g._delayedEvents) g._delayedEvents = [];
  g._delayedEvents.push({ ...event, triggerWeek: g.week + triggerWeek });
}

export function processDelayedEvents(g) {
  if (!g._delayedEvents) return [];
  const events = [];
  g._delayedEvents = g._delayedEvents.filter((e) => {
    if (g.week >= e.triggerWeek) {
      events.push(e);
      return false;
    }
    return true;
  });
  return events;
}

// ── EVENT ENHANCEMENT — delegates to generators ──

export function enhanceEvents(g) {
  const events = [];
  if (g.week % EVENT_INTERVAL !== 0) return events;

  const ctx = createEventContext(g);

  // Tier-based events
  events.push(...generateTierEvents(ctx));

  // State-driven events
  events.push(...generateTensionEvents(ctx));
  events.push(...generateMomentumEvents(ctx));
  events.push(...generateRebuildingEvents(ctx));
  events.push(...generatePressureEvents(ctx));

  // Delayed consequence checks
  events.push(...generateCoachEvents(g, ctx));
  events.push(...generateFighterEvents(g, ctx));

  return events;
}

// ── INTEGRATION: process all event enhancements ──

export function processEventSystem(g) {
  decayFlags(g);
  computeCampState(g);

  const delayed = processDelayedEvents(g);
  const enhanced = enhanceEvents(g);

  const all = [...delayed, ...enhanced];

  all.forEach((ev) => {
    if (!g.inbox) g.inbox = [];
    g.inbox.unshift({
      id: uid(), type: "event",
      title: ev.title, body: ev.body,
      choices: ev.choices || [{ label: "OK", chem: 0 }],
    });
  });

  return all.length;
}

// ── HOOKS: call these from existing event handlers ──

export function onCoachRaiseDenied(g, coach) {
  recordMemory(coach, "raise_denied");
  setFlag(g, "chemistry_shaken");
}

export function onFightComplaintIgnored(g, fighter) {
  recordMemory(fighter, "complaint_ignored");
  setFlag(fighter, "fighter_frustrated");
}

export function onConflictMediated(g) {
  setFlag(g, "team_momentum");
}

export function onWinningStreak(g) {
  setFlag(g, "team_momentum");
}

export function onRetentionBonusPaid(g, fighter) {
  recordMemory(fighter, "retention_bonus");
  setFlag(fighter, "morale_boost");
}
