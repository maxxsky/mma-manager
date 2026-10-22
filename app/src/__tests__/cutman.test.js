// P2 #30 (CA2): the cutman closes cuts in the break, before the doctor check.
import { describe, it, expect, afterEach } from 'vitest'
import { setRNG, resetRNG, mulberry32 } from '@ironfist/engine/rng.js'
import { simRound, runFight, cutmanTreat, autoGamePlan } from '@ironfist/engine/fight.js'
import { genFighter } from '@ironfist/engine/fighter.js'

afterEach(() => resetRNG())

function pair(seed) {
  setRNG(mulberry32(seed))
  const A = genFighter(0.8), B = genFighter(0.8)
  B.weightClass = A.weightClass; B.natWeight = A.natWeight
  return { A, B }
}

describe('cutmanTreat', () => {
  it('closes ceil(skill / 3) cut points, never below zero, nothing without a cutman', () => {
    expect(cutmanTreat(5, 0)).toBe(5)
    expect(cutmanTreat(5, 2)).toBe(4)
    expect(cutmanTreat(5, 5)).toBe(3)
    expect(cutmanTreat(5, 9)).toBe(2)
    expect(cutmanTreat(1, 9)).toBe(0)
  })
})

describe('simRound with a cutman', () => {
  const round = (rnd, cutmanSkillA, totalRounds = 3) => {
    const { A, B } = pair(11)
    setRNG(mulberry32(99))
    return simRound(rnd, A, B, 100, 100, 'Balanced', 'neutral', 0, 6, 6, { totalRounds, cutmanSkillA })
  }

  it('treats the player side in the break; the opponent keeps theirs', () => {
    const without = round(1, 0)
    const withCutman = round(1, 9)
    expect(without.finish).toBeFalsy()
    expect(withCutman.cutA).toBe(Math.max(0, without.cutA - 3))
    expect(withCutman.cutB).toBe(without.cutB)
    expect(withCutman.log.join(' ')).toMatch(/cutman closes the cut/)
  })

  it('does nothing after the final round and uses no RNG', () => {
    expect(round(3, 9).cutA).toBe(round(3, 0).cutA)
    const { A, B } = pair(12)
    setRNG(mulberry32(5)); const a = runFight(A, B, autoGamePlan(A, B), () => 'neutral', 5, 3)
    setRNG(mulberry32(5)); const b = runFight(A, B, autoGamePlan(A, B), () => 'neutral', 5, 3, { cutmanSkillA: 9 })
    expect(b.winner).toBe(a.winner)
    expect(b.roundLogs.map((r) => r.scoreA)).toEqual(a.roundLogs.map((r) => r.scoreA))
  })
})
