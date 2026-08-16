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
import { generateTrainingEvents } from "./events/generators/training.js";
import { generateProsperityEvents } from "./events/generators/prosperity.js";
import { addTimelineEvent } from "./narrative/timeline.js";
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

/** Push a type:"event" or "milestone" item to inbox with auto-generated id and createdWeek.
 *  Use this instead of raw g.inbox.unshift for any informational message
 *  so the auto-expiry system in tickSettlement can clean it up. */
export function pushInboxEvent(g, overrides) {
  if (!g.inbox) g.inbox = [];
  g.inbox.unshift({ id: uid(), ...overrides, createdWeek: g.week });
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
  events.push(...generateTrainingEvents(ctx));
  events.push(...generateProsperityEvents(ctx));

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
    pushInboxEvent(g, { type: "event", title: ev.title, body: ev.body, choices: ev.choices || [{ label: "OK", chem: 0 }] });
    addTimelineEvent(g, { type: "event", title: ev.title, detail: ev.body });
  });

  return all.length;
}

// ── HOOKS: call these from existing event handlers ──

export function onCoachRaiseDenied(g, coach) {
  recordMemory(coach, "raise_denied");
  setFlag(g, "chemistry_shaken");
}

export function onFightComplaintIgnored(g, fighter) {
  // Only the memory. Setting fighter_frustrated here would have blocked the
  // very event it feeds: the generator fires on three ignored complaints and
  // guards on !hasFlag(f, "fighter_frustrated"), setting that flag itself when
  // it fires. Raising it on the first complaint meant the threshold could never
  // be reached — which went unnoticed because nothing called this function at
  // all until now.
  recordMemory(fighter, "complaint_ignored");
}

// onConflictMediated, onWinningStreak and onRetentionBonusPaid were removed.
//
// All three were exported, never called, and set flags — "team_momentum" and
// "morale_boost" — that nothing in the codebase ever reads. Calling them would
// have changed nothing observable. They are left documented here rather than
// silently deleted so it is clear the behaviour was absent, not lost: if these
// states are wanted later they need a reader first, not just a setter.

