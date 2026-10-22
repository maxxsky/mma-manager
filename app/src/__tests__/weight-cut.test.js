import { describe, it, expect } from 'vitest'
import { weightCutInfo } from '@ironfist/engine/fight/weight-cut.js'
import { fightPurse } from '@ironfist/engine/fight/purse.js'
import { runFight, simRound } from '@ironfist/engine/fight.js'
import { commitFightResult } from '@ironfist/engine/fights/commitResult.js'
import { setRNG, mulberry32 } from '@ironfist/engine/rng.js'
import { createTestFighter, createTestGame } from './helpers.js'

const make = (natWeight = 155) => createTestFighter({ natWeight })
const neutral = () => 'neutral'
const mirror = { planB: 'Balanced', cornerPolicyB: neutral }

describe('weight cut stamina cap', () => {
  it.each([[155, 0], [159, 0], [160, 5], [166, 5], [167, 10], [170, 10]])(
    '%s lbs in Lightweight gives a %s%% penalty', (weight, pen) => {
      expect(weightCutInfo(make(weight))).toMatchObject({ limit: 155, pen, staminaCap: 100 - pen })
    },
  )

  it('uses the actual division and tolerates absent or invalid natural weight', () => {
    expect(weightCutInfo({ weightClass: 'Welterweight', natWeight: 170 }).pen).toBe(0)
    for (const natWeight of [undefined, null, NaN, Infinity, 0, -2, 150]) {
      expect(weightCutInfo({ weightClass: 'Lightweight', natWeight }).staminaCap).toBe(100)
    }
  })

  it('preserves the existing nutritionist mitigation with bounded skill', () => {
    expect(weightCutInfo(make(170), 10)).toMatchObject({ pen: 6, staminaCap: 94 })
    expect(weightCutInfo(make(170), 10).missWeightChance).toBeCloseTo(0.11)
    expect(weightCutInfo(make(170), -10).pen).toBe(10)
    expect(weightCutInfo(make(170), 999).pen).toBe(6)
  })

  it.each(['A', 'B'])('caps side %s before the first exchange in simRound', (side) => {
    const A = make(side === 'A' ? 170 : 155)
    const B = make(side === 'B' ? 170 : 155)
    const opts = { planB: 'Balanced', cornerB: 'neutral' }
    setRNG(mulberry32(123))
    const actual = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0, 0, 0, opts)
    // Removing weight metadata but explicitly starting at the promised cap
    // must resolve every exchange identically, including damage and scores.
    setRNG(mulberry32(123))
    const expected = simRound(1, make(), make(), side === 'A' ? 90 : 100, side === 'B' ? 90 : 100, 'Balanced', 'neutral', 0, 0, 0, opts)
    expect(actual).toEqual(expected)
  })

  it('starts headless policies at the cap and never charges the cut twice', () => {
    const seen = []
    const a = make(170), b = make(163)
    const cut = runFight(a, b, 'Balanced', (_res, rnd, state) => {
      seen.push({ rnd, ...state })
      return 'neutral'
    }, 19, 5, mirror)
    expect(seen[0]).toMatchObject({ staA: 90, staB: 95 })
    const expected = runFight(make(), make(), 'Balanced', neutral, 19, 5, mirror)
    // Compare to an explicit round loop starting at 90/95; a mistaken per-round
    // subtraction, or resetting stamina to the cap, changes subsequent rounds.
    setRNG(mulberry32(19))
    let staA = 90, staB = 95, momentum = 0, cutA = 0, cutB = 0
    for (const round of cut.roundLogs) {
      const res = simRound(round.duringRound, make(), make(), staA, staB, 'Balanced', 'neutral', momentum, cutA, cutB, { planB: 'Balanced', cornerB: 'neutral', totalRounds: 5 })
      expect(round).toEqual(res)
      ;({ staA, staB, momentum, cutA, cutB } = res)
    }
    expect(cut.roundLogs.length).toBeGreaterThan(1)
    expect(cut.roundLogs[0].staA).toBeLessThan(expected.roundLogs[0].staA)
    expect(a.natWeight).toBe(170)
  })

  it('applies nutritionist support on either side in runFight and simRound', () => {
    for (const side of ['A', 'B']) {
      const opts = { ...mirror, [`nutritionistSkill${side}`]: 10 }
      const A = make(side === 'A' ? 170 : 155), B = make(side === 'B' ? 170 : 155)
      const seen = []
      const res = runFight(A, B, 'Balanced', (_r, _n, st) => { seen.push(st); return 'neutral' }, 55, 3, opts)
      expect(seen[0][`sta${side}`]).toBe(94)
      setRNG(mulberry32(55))
      const first = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0, 0, 0, { ...opts, cornerB: 'neutral' })
      expect(first).toEqual(res.roundLogs[0])
    }
  })

  it('equal cuts retain side symmetry; a large cut reduces win share on either side', () => {
    let mirrorWins = 0, cutAWins = 0, cutBWins = 0
    const n = 4000
    for (let i = 1; i <= n; i++) {
      const seed = i * 7919
      if (runFight(make(170), make(170), 'Balanced', neutral, seed, 3, mirror).winner === 'A') mirrorWins++
      if (runFight(make(170), make(), 'Balanced', neutral, seed, 3, mirror).winner === 'A') cutAWins++
      if (runFight(make(), make(170), 'Balanced', neutral, seed, 3, mirror).winner === 'B') cutBWins++
    }
    expect(mirrorWins / n).toBeGreaterThan(0.47)
    expect(mirrorWins / n).toBeLessThan(0.53)
    expect(cutAWins / n).toBeLessThan(0.48)
    expect(cutBWins / n).toBeLessThan(0.48)
    expect(Math.abs(cutAWins - cutBWins) / n).toBeLessThan(0.04)
  })
})

describe('catchweight purse', () => {
  it.each([true, false])('deducts 30%% before the camp cut, won=%s', (won) => {
    const g = createTestGame()
    const f = g.roster[0]
    f.contract = { managerCut: 0.2 }
    const fighter = { ...f, booked: { show: 1000, winBonus: 500, opponent: { name: 'Opp' } } }
    const startCash = g.cash
    const result = { won, how: 'Decision', r: 3, weighinIssue: 'catchweight' }
    expect(fightPurse(fighter.booked, result).purse).toBe(won ? 1050 : 700)
    commitFightResult(g, fighter, result)
    expect(g.cash - startCash).toBe(won ? 210 : 140)
    expect(g.log.some((line) => line.includes('Catchweight'))).toBe(true)
    expect(fighter.booked.show).toBe(1000)
    expect(fighter.booked.winBonus).toBe(500)
    expect(f.booked).toBeNull()
  })

  it('leaves ordinary fights unchanged and handles missing purse amounts', () => {
    expect(fightPurse({ show: 1000, winBonus: 500 }, { won: true }).purse).toBe(1500)
    expect(fightPurse({}, { won: true, weighinIssue: 'catchweight' }).purse).toBe(0)
  })
})
