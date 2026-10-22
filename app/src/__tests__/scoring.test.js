// Judges' scoring — the decision must follow the whole fight, not the last round
import { describe, it, expect } from 'vitest'
import { createTestFighter, useSeed } from './helpers.js'
import { scoreRound, scoreDecision } from '@ironfist/engine/fight/scoring.js'
import { runFight, prepFighter } from '@ironfist/engine/fight.js'

const round = (scoreA, scoreB, extra = {}) => ({ scoreA, scoreB, dmgA: 0, dmgB: 0, knockdown: null, ...extra })

describe('scoreRound', () => {
  it('scores the round winner 10-9', () => {
    expect(scoreRound(round(30, 20))).toEqual({ a: 10, b: 9, winner: 'A' })
    expect(scoreRound(round(20, 30))).toEqual({ a: 9, b: 10, winner: 'B' })
  })

  it('scores exactly even points 10-10, not as a win for either side', () => {
    expect(scoreRound(round(25, 25))).toEqual({ a: 10, b: 10, winner: 'draw' })
  })

  it('scores 10-8 when the winner drops the loser and doubles their points', () => {
    expect(scoreRound(round(40, 15, { knockdown: { fighter: 'B' } }))).toEqual({ a: 10, b: 8, winner: 'A' })
    expect(scoreRound(round(15, 40, { knockdown: { fighter: 'A' } }))).toEqual({ a: 8, b: 10, winner: 'B' })
  })

  it('keeps 10-9 for a knockdown in a close round', () => {
    expect(scoreRound(round(30, 25, { knockdown: { fighter: 'B' } }))).toEqual({ a: 10, b: 9, winner: 'A' })
  })

  it('keeps 10-9 when the round winner was the one knocked down', () => {
    expect(scoreRound(round(40, 10, { knockdown: { fighter: 'A' } }))).toEqual({ a: 10, b: 9, winner: 'A' })
  })
})

describe('scoreDecision', () => {
  it('gives the decision to the fighter who won more rounds, even after losing the last round badly', () => {
    const logs = [round(30, 20), round(30, 20), round(5, 60)]
    const sc = scoreDecision(logs)
    expect(sc.winner).toBe('A')
    expect(sc.totalA).toBe(29)
    expect(sc.totalB).toBe(28)
    expect(sc.tiebreak).toBe(null)
  })

  it('is symmetric: swapping the sides swaps the winner', () => {
    const logs = [round(30, 20), round(18, 22), round(26, 24)]
    const swapped = logs.map((l) => round(l.scoreB, l.scoreA))
    expect(scoreDecision(logs).winner).toBe('A')
    expect(scoreDecision(swapped).winner).toBe('B')
  })

  it('breaks an even scorecard on total points, not on which side is the player', () => {
    // 10-9, 9-10, 10-10 → 29-29. B scored more points overall.
    const logs = [round(21, 20), round(10, 40), round(15, 15)]
    const sc = scoreDecision(logs)
    expect(sc.totalA).toBe(sc.totalB)
    expect(sc.winner).toBe('B')
    expect(sc.tiebreak).toBe('points')
  })

  it('falls back to damage dealt when scorecard and points are both even', () => {
    // dmgA is damage taken by A, so B dealt more here.
    const logs = [round(30, 20, { dmgA: 5, dmgB: 1 }), round(20, 30, { dmgA: 5, dmgB: 1 })]
    const sc = scoreDecision(logs)
    expect(sc.winner).toBe('B')
    expect(sc.tiebreak).toBe('damage')
  })
})

describe('runFight decisions', () => {
  const A0 = createTestFighter({ name: 'Alpha', id: 'a1' })
  const B0 = createTestFighter({ name: 'Beta', id: 'b1' })

  it('every decision winner has the higher (or tie-broken) scorecard', () => {
    useSeed()
    let decisions = 0
    for (let s = 0; s < 300; s++) {
      const r = runFight(prepFighter(A0), prepFighter(B0), 'Balanced', () => 'go', s * 131 + 3, 3)
      if (r.how !== 'Decision') {
        expect(r.scorecard).toBe(null)
        continue
      }
      decisions++
      expect(r.scorecard.winner).toBe(r.winner)
      const mine = r.winner === 'A' ? r.scorecard.totalA : r.scorecard.totalB
      const theirs = r.winner === 'A' ? r.scorecard.totalB : r.scorecard.totalA
      expect(mine).toBeGreaterThanOrEqual(theirs)
      if (mine === theirs) expect(r.scorecard.tiebreak).not.toBe(null)
    }
    expect(decisions).toBeGreaterThan(0)
  })

  it('a fighter who won more rounds only loses when a 10-8 round evened the scorecard', () => {
    for (let s = 0; s < 300; s++) {
      const r = runFight(prepFighter(A0), prepFighter(B0), 'Balanced', () => 'go', s * 977 + 11, 3)
      if (r.how !== 'Decision') continue
      const won = r.scorecard.rounds.filter((x) => x.winner === r.winner).length
      const lost = r.scorecard.rounds.filter((x) => x.winner !== 'draw' && x.winner !== r.winner).length
      if (lost > won) {
        expect(r.scorecard.rounds.some((x) => x.a === 8 || x.b === 8)).toBe(true)
      }
    }
  })
})
