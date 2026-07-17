// Breakthrough — training reveals hidden potential
import { describe, it, expect } from 'vitest'
import { useSeed, clearSeed } from './helpers.js'
import { tickTraining } from '@ironfist/engine/tick/training.js'
import { ATTRS } from '@ironfist/engine/data/attributes.js'

describe('Breakthrough from training', () => {
  /** Set all attrs to currentVal and ceilings to ceilingVal on a fighter */
  function setAttrLevel(f, currentVal, ceilingVal) {
    ATTRS.forEach((k) => {
      f.attrs[k] = currentVal
      f.ceilings[k] = ceilingVal
    })
  }

  /** Build a minimal fighter object that tickTraining expects */
  function makeFighter(overrides = {}) {
    return {
      id: 'f1',
      name: 'Test Fighter',
      age: 25,
      archetype: 'All-Rounder',
      weightClass: 'Lightweight',
      attrs: {},
      ceilings: {},
      training: { type: 'conditioning', intensity: 'Medium' },
      morale: 60,
      popularity: 20,
      overtraining: 0,
      injury: null,
      booked: null,
      loyalty: 50,
      ambition: 'Belt Chaser',
      agent: 'none',
      traits: [],
      titles: [],
      record: { w: 0, l: 0, ko: 0, sub: 0, dec: 0 },
      rankPoints: 0,
      lastFightWeek: 0,
      fightsThisYear: 0,
      joinedWeek: 1,
      streakL: 0,
      convincedOnce: false,
      fightHistory: [],
      trainingHistory: [],
      potentialTier: 'common',
      _breakthroughNotified: false,
      ...overrides,
    }
  }

  /** Minimal game state with a single fighter for tickTraining */
  function makeG(fighter) {
    return {
      week: 10,
      roster: [fighter],
      coaches: [{ id: 1, name: 'Coach', spec: 'Head', skill: 5, personality: 'Technician' }],
      facilities: { mats: 2, ring: 2, weights: 2, medical: 2 },
      chemistry: 60,
      cash: 50000,
      inbox: [],
      log: [],
      campTier: 1,
      relationships: {},
    }
  }

  it('generational fighter at 60%+ ceiling triggers breakthrough once', () => {
    const f = makeFighter({ id: 'f1', name: 'Test Gen', potentialTier: 'generational' })
    setAttrLevel(f, 60, 100) // 60% of ceiling
    const g = makeG(f)

    const inboxBefore = g.inbox.length

    // Disable training cost to avoid cash drain issues
    g.cash = 50000
    tickTraining(g)

    // First call — breakthrough should fire
    const discovered = g.inbox.filter((m) => m.title && m.title.includes('Mulai Menunjukkan'))
    expect(discovered.length).toBe(1)
    expect(g.roster[0]._breakthroughNotified).toBe(true)

    // Second call — should NOT fire again
    g.cash = 50000
    tickTraining(g)
    const discovered2 = g.inbox.filter((m) => m.title && m.title.includes('Mulai Menunjukkan'))
    expect(discovered2.length).toBe(1) // still exactly 1, not 2
  })

  it('common fighter at same ceiling ratio never gets breakthrough', () => {
    const f = makeFighter({ id: 'f2', name: 'Test Common', potentialTier: 'common' })
    setAttrLevel(f, 80, 100) // 80% — well past threshold
    const g = makeG(f)

    g.cash = 50000
    tickTraining(g)

    const discovered = g.inbox.filter((m) => m.title && m.title.includes('Mulai Menunjukkan'))
    expect(discovered.length).toBe(0)
    expect(g.roster[0]._breakthroughNotified).toBeFalsy()
  })

  it('special fighter also triggers breakthrough', () => {
    const f = makeFighter({ id: 'f3', name: 'Test Special', potentialTier: 'special' })
    setAttrLevel(f, 65, 100) // 65% of ceiling
    const g = makeG(f)

    g.cash = 50000
    tickTraining(g)

    const discovered = g.inbox.filter((m) => m.title && m.title.includes('Mulai Menunjukkan'))
    expect(discovered.length).toBe(1)
    expect(g.roster[0]._breakthroughNotified).toBe(true)
  })

  it('does not trigger if avg stat is below 60% of ceiling', () => {
    const f = makeFighter({ id: 'f4', name: 'Test Early', potentialTier: 'generational' })
    setAttrLevel(f, 30, 100) // 30% — below threshold
    const g = makeG(f)

    g.cash = 50000
    tickTraining(g)

    const discovered = g.inbox.filter((m) => m.title && m.title.includes('Mulai Menunjukkan'))
    expect(discovered.length).toBe(0)
    expect(g.roster[0]._breakthroughNotified).toBeFalsy()
  })

  it('promising fighter does not trigger breakthrough (only special/generational)', () => {
    const f = makeFighter({ id: 'f5', name: 'Test Promising', potentialTier: 'promising' })
    setAttrLevel(f, 80, 100) // well past threshold
    const g = makeG(f)

    g.cash = 50000
    tickTraining(g)

    const discovered = g.inbox.filter((m) => m.title && m.title.includes('Mulai Menunjukkan'))
    expect(discovered.length).toBe(0)
    expect(g.roster[0]._breakthroughNotified).toBeFalsy()
  })
})
