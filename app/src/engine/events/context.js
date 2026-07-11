// Event context — precomputed camp state + lightweight context for event generators.
// computeCampState() and hasCampState() live here so generators don't need raw game state.

import { clamp } from "../rng.js";
import { CAMP_TIERS } from "../data.js";
import {
  HIGH_MORALE_MIN, HIGH_MORALE_CHEM_MIN,
  TENSION_CHEM_MAX, TENSION_CHEM_CLEAR,
  WIN_STREAK_MIN, WIN_MOMENTUM_CHEM_MIN, WIN_MOMENTUM_MORALE_MAX,
  REBUILDING_MAX_FIGHTS, REBUILDING_RATIO, REBUILDING_MIN_ROSTER, REBUILDING_CLEAR,
  PRESSURE_CASH_MAX, PRESSURE_REP_MAX, PRESSURE_MIN_WEEK, PRESSURE_CASH_CLEAR,
  TRAINING_CRISIS_OT_THRESHOLD, TRAINING_CRISIS_RATIO,
  EVENT_COOLDOWN_WEEKS,
} from "./config.js";

// ── CAMP STATE ──

export function computeCampState(g) {
  if (!g._campState) g._campState = {};

  const moraleAvg = g.roster?.length > 0
    ? g.roster.reduce((s, f) => s + (f.morale || 50), 0) / g.roster.length
    : 50;
  const winStreak = g.roster?.some((f) => (f.streakW || 0) >= WIN_STREAK_MIN);

  // High Morale
  if (moraleAvg >= HIGH_MORALE_MIN && g.chemistry >= HIGH_MORALE_CHEM_MIN) {
    g._campState.high_morale = true;
  } else {
    delete g._campState.high_morale;
  }

  // Internal Tension
  if ((g._flags?.chemistry_shaken > 0) || (g.chemistry < TENSION_CHEM_MAX)) {
    g._campState.internal_tension = true;
  } else if (g.chemistry >= TENSION_CHEM_CLEAR) {
    delete g._campState.internal_tension;
  }

  // Winning Momentum
  if (winStreak && g.chemistry >= WIN_MOMENTUM_CHEM_MIN) {
    g._campState.winning_momentum = true;
  } else if (moraleAvg < WIN_MOMENTUM_MORALE_MAX) {
    delete g._campState.winning_momentum;
  }

  // Rebuilding Phase
  const rookieCount = g.roster?.filter((f) => (f.record?.w || 0) + (f.record?.l || 0) <= REBUILDING_MAX_FIGHTS).length || 0;
  if (rookieCount >= g.roster?.length * REBUILDING_RATIO && (g.roster?.length || 0) > REBUILDING_MIN_ROSTER) {
    g._campState.rebuilding = true;
  } else if (rookieCount <= REBUILDING_CLEAR) {
    delete g._campState.rebuilding;
  }

  // Under Pressure
  if (g.cash < PRESSURE_CASH_MAX || (g.rep < PRESSURE_REP_MAX && g.week > PRESSURE_MIN_WEEK)) {
    g._campState.under_pressure = true;
  } else if (g.cash >= PRESSURE_CASH_CLEAR) {
    delete g._campState.under_pressure;
  }

  // Training Crisis
  const overtrainedCount = g.roster?.filter((f) => (f.overtraining || 0) >= TRAINING_CRISIS_OT_THRESHOLD).length || 0;
  const injuredCount = g.roster?.filter((f) => f.injury).length || 0;
  const crisisCount = overtrainedCount + injuredCount;
  if (g.roster?.length > 0 && crisisCount / g.roster.length >= TRAINING_CRISIS_RATIO) {
    g._campState.training_crisis = true;
  } else if (crisisCount === 0) {
    delete g._campState.training_crisis;
  }
}

export function hasCampState(g, state) {
  return g?._campState?.[state] === true;
}

// ── EVENT COOLDOWN ──

export function isOnCooldown(g, key) {
  const last = g._eventCooldowns?.[key];
  return last != null && (g.week - last) < EVENT_COOLDOWN_WEEKS;
}

export function markCooldown(g, key) {
  if (!g._eventCooldowns) g._eventCooldowns = {};
  g._eventCooldowns[key] = g.week;
}

// ── EVENT CONTEXT ──

import { TIER_EVENTS } from "./config.js";

/** Build a lightweight context object from game state for event generators */
export function createEventContext(g) {
  const tier = CAMP_TIERS[g.campTier || 0] || CAMP_TIERS[0];

  return {
    // Camp state flags (precomputed)
    isInternalTension: hasCampState(g, "internal_tension"),
    isWinningMomentum: hasCampState(g, "winning_momentum"),
    isRebuilding: hasCampState(g, "rebuilding"),
    isUnderPressure: hasCampState(g, "under_pressure"),
    isHighMorale: hasCampState(g, "high_morale"),
    isTrainingCrisis: hasCampState(g, "training_crisis"),

    // Tier
    tier,
    tierEvents: TIER_EVENTS[g.campTier || 0] || [],

    // Roster
    roster: g.roster || [],
    coaches: g.coaches || [],
    rosterSize: g.roster?.length || 0,
    week: g.week,
    checkCooldown: (key) => isOnCooldown(g, key),
    markCooldown: (key) => markCooldown(g, key),
  };
}
