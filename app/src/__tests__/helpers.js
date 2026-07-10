// Test helpers — deterministic RNG, game state factory, invariant validators
import { mulberry32, setRNG, resetRNG, R, RI, clamp, pick, random } from '../engine/rng.js'

// ── FIXED SEED ──
export const TEST_SEED = 12345
export const TEST_SEED_2 = 67890

export function useSeed(seed = TEST_SEED) {
  setRNG(mulberry32(seed))
}

export function clearSeed() {
  resetRNG()
}

// ── GAME STATE FACTORY ──
import { newGame } from '../engine/state.js'

export function createTestGame(overrides = {}) {
  useSeed(TEST_SEED)
  const g = newGame()
  Object.assign(g, overrides)
  return g
}

// ── FIGHTER FACTORY ──
export function createTestFighter(overrides = {}) {
  return {
    id: overrides.id || 'test-fighter-1',
    name: overrides.name || 'Test Fighter',
    age: overrides.age || 25,
    archetype: overrides.archetype || 'All-Rounder',
    weightClass: overrides.weightClass || 'Lightweight',
    attrs: overrides.attrs || {
      striking: 60, wrestling: 50, bjj: 40, cardio: 55,
      strength: 58, chin: 52, footwork: 48, fightIQ: 45,
    },
    ceilings: overrides.ceilings || {
      striking: 80, wrestling: 75, bjj: 65, cardio: 78,
      strength: 76, chin: 70, footwork: 72, fightIQ: 70,
    },
    traits: overrides.traits || [],
    titles: overrides.titles || [],
    record: overrides.record || { w: 0, l: 0, ko: 0, sub: 0, dec: 0 },
    morale: overrides.morale ?? 60,
    popularity: overrides.popularity ?? 20,
    overtraining: overrides.overtraining ?? 0,
    injury: overrides.injury || null,
    booked: overrides.booked || null,
    training: overrides.training || { type: 'conditioning', intensity: 'Medium' },
    streakW: overrides.streakW ?? 0,
    streakL: overrides.streakL ?? 0,
    rankPoints: overrides.rankPoints ?? 0,
    lastFightWeek: overrides.lastFightWeek ?? 0,
    fightsThisYear: overrides.fightsThisYear ?? 0,
    contract: overrides.contract || null,
    ambition: overrides.ambition || 'Balanced',
    agent: overrides.agent || 'none',
    joinedWeek: overrides.joinedWeek ?? 0,
    natWeight: overrides.natWeight ?? 155,
    weightClassDelta: overrides.weightClassDelta ?? 0,
    fightHistory: overrides.fightHistory || [],
    trainingHistory: overrides.trainingHistory || [],
    careerHistory: overrides.careerHistory || [],
    rivalries: overrides.rivalries || {},
    giantKills: overrides.giantKills ?? 0,
    titleDefenses: overrides.titleDefenses ?? 0,
    firstFightWeek: overrides.firstFightWeek || null,
    injuryCount: overrides.injuryCount ?? 0,
    seriousInjuries: overrides.seriousInjuries ?? 0,
    milestoneFirstTitle: overrides.milestoneFirstTitle || false,
    convincedOnce: overrides.convincedOnce || false,
    _flags: overrides._flags || {},
    _memory: overrides._memory || {},
  }
}

// ── GLOBAL INVARIANTS ──
export function validateInvariants(g) {
  const errors = []

  // Fighters
  if (g.roster) {
    const ids = new Set()
    for (const f of g.roster) {
      if (!f.id) errors.push('Fighter missing id')
      if (ids.has(f.id)) errors.push(`Duplicate fighter id: ${f.id}`)
      ids.add(f.id)

      if (f.age != null && f.age < 16) errors.push(`${f.name}: age ${f.age} < 16`)
      if (f.morale != null && (f.morale < 0 || f.morale > 100)) errors.push(`${f.name}: morale ${f.morale} out of range`)
      if (f.overtraining != null && (f.overtraining < 0 || f.overtraining > 100)) errors.push(`${f.name}: overtraining ${f.overtraining} out of range`)
      if (f.popularity != null && (f.popularity < 0 || f.popularity > 100)) errors.push(`${f.name}: popularity ${f.popularity} out of range`)
      if (f.injury && f.injury.weeks != null && f.injury.weeks < 0) errors.push(`${f.name}: negative injury weeks`)
    }
  }

  // Camp
  if (g.chemistry != null && (g.chemistry < 0 || g.chemistry > 100)) errors.push('Chemistry out of range')
  if (g.rep != null && (g.rep < 2 || g.rep > 100)) errors.push(`Rep ${g.rep} out of range [2,100]`)
  if (g.cash != null && !isFinite(g.cash)) errors.push('Cash is not finite')

  // Coaches
  if (g.coaches) {
    const coachIds = new Set()
    for (const c of g.coaches) {
      if (!c.id) errors.push('Coach missing id')
      if (coachIds.has(c.id)) errors.push(`Duplicate coach id: ${c.id}`)
      coachIds.add(c.id)
      if (c.skill != null && (c.skill < 1 || c.skill > 10)) errors.push(`${c.name}: skill ${c.skill} out of range`)
    }
  }

  return errors
}

export function assertInvariants(g) {
  const errors = validateInvariants(g)
  if (errors.length > 0) {
    throw new Error('Invariant violations:\n  ' + errors.join('\n  '))
  }
}
