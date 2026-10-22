// P2 #26 (FI3): Paycheck, Legacy, Family Man and Star Power do what their
// descriptions say, and fightsThisYear counts completed fights.
import { describe, it, expect, afterEach } from 'vitest'
import { setRNG, resetRNG } from '@ironfist/engine/rng.js'
import { commitFightResult } from '@ironfist/engine/fights/commitResult.js'
import { tickYearly } from '@ironfist/engine/tick/yearly.js'
import {
  PAYCHECK_MORALE, LEGACY_MORALE, FAMILY_MAN_MAX_FIGHTS, FAMILY_MAN_MORALE_PENALTY, STAR_POWER_POP_MULT,
} from '@ironfist/engine/ambitions.js'
import { createTestGame } from './helpers.js'

afterEach(() => resetRNG())

// Commit one fight for a fresh fighter with the given ambition; returns the fighter after.
function fight(ambition, { won = true, oppRank = null, fightsThisYear = 0, how = 'Decision' } = {}) {
  const g = createTestGame()
  const f = g.roster[0]
  Object.assign(f, { ambition, morale: 50, popularity: 20, fightsThisYear, traits: [], injury: null })
  setRNG(() => 0.99) // no fight injury, so morale only moves by outcome + ambition
  commitFightResult(g, { id: f.id, booked: { opponent: { name: 'Opp', level: 0.8 }, show: 1000, winBonus: 500, tier: 'Local', oppRank } },
    { won, how, r: 3, totalDmgA: 30, totalDmgB: 30 })
  resetRNG()
  return { g, f }
}

describe('fightsThisYear', () => {
  it('counts every completed fight, win or loss, and resets yearly', () => {
    expect(fight('Grinder').f.fightsThisYear).toBe(1)
    expect(fight('Grinder', { won: false, fightsThisYear: 2 }).f.fightsThisYear).toBe(3)
    const { g, f } = fight('Grinder', { fightsThisYear: 4 })
    g.week = 48
    tickYearly(g)
    expect(f.fightsThisYear).toBe(0)
  })
})

describe('ambition effects', () => {
  it('Paycheck: morale up after every fight, win or loss', () => {
    expect(fight('Paycheck').f.morale - fight('Grinder').f.morale).toBe(PAYCHECK_MORALE)
    expect(fight('Paycheck', { won: false }).f.morale - fight('Grinder', { won: false }).f.morale).toBe(PAYCHECK_MORALE)
  })

  it('Legacy: extra morale only for beating a ranked opponent or champion', () => {
    expect(fight('Legacy', { oppRank: 7 }).f.morale - fight('Grinder', { oppRank: 7 }).f.morale).toBe(LEGACY_MORALE)
    expect(fight('Legacy', { oppRank: 0 }).f.morale - fight('Grinder', { oppRank: 0 }).f.morale).toBe(LEGACY_MORALE)
    expect(fight('Legacy').f.morale).toBe(fight('Grinder').f.morale)
    expect(fight('Legacy', { won: false, oppRank: 3 }).f.morale).toBe(fight('Grinder', { won: false, oppRank: 3 }).f.morale)
  })

  it(`Family Man: no penalty up to ${FAMILY_MAN_MAX_FIGHTS} fights a year, penalty beyond`, () => {
    const at = (n) => fight('Family Man', { fightsThisYear: n - 1 }).f.morale - fight('Grinder', { fightsThisYear: n - 1 }).f.morale
    expect(at(FAMILY_MAN_MAX_FIGHTS)).toBe(0)
    expect(at(FAMILY_MAN_MAX_FIGHTS + 1)).toBe(-FAMILY_MAN_MORALE_PENALTY)
  })

  it('Star Power: net popularity gain from a fight is 1.5x', () => {
    const base = fight('Grinder', { how: 'KO/TKO' }).f.popularity - 20
    const star = fight('Star Power', { how: 'KO/TKO' }).f.popularity - 20
    expect(base).toBeGreaterThan(0)
    expect(star).toBeCloseTo(base * STAR_POWER_POP_MULT)
    // A net loss is not amplified.
    expect(fight('Star Power', { won: false }).f.popularity).toBe(fight('Grinder', { won: false }).f.popularity)
  })
})
