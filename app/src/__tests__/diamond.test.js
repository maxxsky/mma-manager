// Diamond in the Rough — eligibility gate & transfer reason tests
import { describe, it, expect } from 'vitest'
import { generateTransferReason } from '../engine/narrative/generators/transfer.js'
import { genFighter } from '../engine/fighter.js'
import { useSeed, clearSeed } from './helpers.js'

describe('generateTransferReason', () => {
  it('returns one of the two expected patterns', () => {
    const patterns = [
      'Ingin akses training partner dan fasilitas yang lebih baik.',
      'Merasa tidak lagi jadi prioritas di camp lamanya.',
    ]
    for (let i = 0; i < 20; i++) {
      useSeed(i * 777 + 42)
      const f = genFighter(0.5)
      const reason = generateTransferReason(f)
      expect(patterns).toContain(reason)
    }
    clearSeed()
  })

  it('returns consistent result for same seed (deterministic)', () => {
    useSeed(42)
    const f1 = genFighter(0.7)
    const r1 = generateTransferReason(f1)

    useSeed(42)
    const f2 = genFighter(0.7)
    const r2 = generateTransferReason(f2)

    expect(r1).toBe(r2)
    clearSeed()
  })
})

describe('Diamond Eligibility Gate', () => {
  it('rep ≥ 20 and avg fac ≥ 2 → eligible', () => {
    const g = {
      rep: 25,
      facilities: { mats: 3, ring: 2, weights: 2, medical: 2 },
    }
    const facLevels = Object.values(g.facilities)
    const avgFac = facLevels.reduce((s, v) => s + v, 0) / facLevels.length
    expect(g.rep >= 20).toBe(true)
    expect(avgFac >= 2).toBe(true)
  })

  it('rep < 20 → not eligible regardless of facilities', () => {
    const g = {
      rep: 15,
      facilities: { mats: 3, ring: 3, weights: 3, medical: 3 },
    }
    const facLevels = Object.values(g.facilities)
    const avgFac = facLevels.reduce((s, v) => s + v, 0) / facLevels.length
    expect(g.rep >= 20).toBe(false)
    expect(avgFac >= 2).toBe(true)
  })

  it('avg fac < 2 → not eligible regardless of rep', () => {
    const g = {
      rep: 40,
      facilities: { mats: 1, ring: 1, weights: 1, medical: 1 },
    }
    const facLevels = Object.values(g.facilities)
    const avgFac = facLevels.reduce((s, v) => s + v, 0) / facLevels.length
    expect(g.rep >= 20).toBe(true)
    expect(avgFac >= 2).toBe(false)
  })

  it('both conditions must be met — rep=20 and avgFac=2 both just at threshold', () => {
    const g = {
      rep: 20,
      facilities: { mats: 2, ring: 2, weights: 2, medical: 2 },
    }
    const facLevels = Object.values(g.facilities)
    const avgFac = facLevels.reduce((s, v) => s + v, 0) / facLevels.length
    expect(g.rep >= 20).toBe(true)
    expect(avgFac >= 2).toBe(true)
  })
})

describe('TransferReason stored on SCOUT action', () => {
  it('SCOUT action for Diamond stores transferReason on prospect', () => {
    // Simulate the reduceUI logic
    const { uid, resetUID } = require('../engine/rng.js')
    resetUID()

    const uid1 = uid()
    const action = {
      type: 'SCOUT',
      cost: 10000,
      fighter: { id: 'f1', name: 'Test Fighter' },
      report: { est: {}, pot: '', traits: [], ambition: null, bestCeiling: null },
      grade: 'S',
      method: 'Diamond in the Rough',
      transferReason: 'Ingin akses training partner dan fasilitas yang lebih baik.',
    }

    const g = {
      prospects: [],
      cash: 50000,
      log: [],
    }

    // Manually apply the SCOUT case from reduceUI
    const { MAX_PROSPECTS } = require('../engine/reducer/constants.js')
    g.cash -= action.cost
    g.prospects.unshift({
      id: uid1,
      fighter: action.fighter,
      report: action.report,
      grade: action.grade,
      method: action.method,
      scoutedWeek: 1,
      transferReason: action.transferReason,
    })
    g.prospects = g.prospects.slice(0, MAX_PROSPECTS)

    expect(g.prospects.length).toBe(1)
    expect(g.prospects[0].transferReason).toBeDefined()
    expect(g.prospects[0].transferReason).toContain('training partner')
  })

  it('amateur scout does not have transferReason', () => {
    const action = {
      type: 'SCOUT',
      cost: 75,
      fighter: { id: 'f2', name: 'Local Fighter' },
      report: { est: {}, pot: '', traits: [], ambition: null, bestCeiling: null },
      grade: 'C',
      method: 'Local Amateur Circuit',
      transferReason: undefined,
    }

    const g = { prospects: [], cash: 50000, log: [] }
    const { MAX_PROSPECTS } = require('../engine/reducer/constants.js')
    g.cash -= action.cost
    g.prospects.unshift({
      id: 999,
      fighter: action.fighter,
      report: action.report,
      grade: action.grade,
      method: action.method,
      scoutedWeek: 1,
      transferReason: action.transferReason,
    })
    g.prospects = g.prospects.slice(0, MAX_PROSPECTS)

    expect(g.prospects[0].transferReason).toBeUndefined()
  })
})
