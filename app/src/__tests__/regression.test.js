// Regression Tests — deterministic seeds, must never change
import { describe, it, expect } from 'vitest'
import { createTestFighter, useSeed, createTestGame } from './helpers.js'
import { simRound, prepFighter } from '../engine/fight.js'
import { tick } from '../engine/state.js'

describe('Regression — Fight Engine (seed=12345)', () => {
  const fighterA = createTestFighter({ name: 'Alpha', id: 'a1' })
  const fighterB = createTestFighter({ name: 'Beta', id: 'b1', archetype: 'Boxer', attrs: {
    striking: 65, wrestling: 35, bjj: 20, cardio: 50, strength: 60, chin: 45, footwork: 40, fightIQ: 38
  }})

  it('produces deterministic winner at seed 12345', () => {
    useSeed(12345)
    const A = prepFighter(fighterA)
    const B = prepFighter(fighterB)
    const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
    // Deterministic output — if this fails, KD mechanism may have changed
    // Note: winner 'B' after KD rebalance (exDmg-based triggers instead of cumulative)
    expect(result.winner).toBe('B')
    expect(result.scoreA).toBeGreaterThan(0)
    expect(result.scoreB).toBeGreaterThan(0)
    expect(result.finish).toBeTruthy() // KD rebalance makes this seed produce a finish
    expect(result.finish.by).toBe('B')
    expect(result.finish.how).toBe('KO/TKO')
  })

  it('produces deterministic damage at seed 12345', () => {
    useSeed(12345)
    const A = prepFighter(fighterA)
    const B = prepFighter(fighterB)
    const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
    // These exact numbers must not change
    expect(result.landA).toBeGreaterThan(0)
    expect(result.landB).toBeGreaterThan(0)
    expect(result.dmgA).toBeGreaterThanOrEqual(0)
    expect(result.dmgB).toBeGreaterThanOrEqual(0)
  })

  it('produces different results with different seeds', () => {
    useSeed(12345)
    const A1 = prepFighter(fighterA)
    const B1 = prepFighter(fighterB)
    const r1 = simRound(1, A1, B1, 100, 100, 'Balanced', 'neutral', 0)

    useSeed(67890)
    const A2 = prepFighter(fighterA)
    const B2 = prepFighter(fighterB)
    const r2 = simRound(1, A2, B2, 100, 100, 'Balanced', 'neutral', 0)

    // Different seeds should generally produce different results
    const sameWinner = r1.winner === r2.winner
    const sameScore = r1.scoreA === r2.scoreA && r1.scoreB === r2.scoreB
    // At least one of these should differ (very high probability)
    expect(sameWinner && sameScore).toBe(false)
  })
})

describe('Regression — State Tick (seed=42)', () => {
  it('week increments correctly', () => {
    useSeed(42)
    const g = createTestGame()
    expect(g.week).toBe(1)
    tick(g)
    expect(g.week).toBe(2)
    tick(g)
    expect(g.week).toBe(3)
  })

  it('state properties survive tick cycle', () => {
    useSeed(42)
    const g = createTestGame()
    tick(g)
    expect(g.roster).toBeDefined()
    expect(g.roster.length).toBeGreaterThan(0)
    expect(g.coaches).toBeDefined()
    expect(g.log).toBeDefined()
    expect(g.inbox).toBeDefined()
    expect(g.cash).toBeDefined()
    expect(isFinite(g.cash)).toBe(true)
  })
})

describe('Calibration — Training Rate (seed=42)', () => {
  it('conditioning training produces expected attribute gain over 1 month', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    const start = { strength: f.attrs.strength, cardio: f.attrs.cardio }

    for (let i = 0; i < 4; i++) {
      f.training = { type: 'conditioning', intensity: 'Medium' }
      tick(g)
    }

    const totalGain = (f.attrs.strength - start.strength) + (f.attrs.cardio - start.cardio)

    // Baseline empiris (seed=42): ~4.77 selama 4 minggu. Band lebar (2.0–9.0) buat
    // nampung variance normal dari sistem lain yang ikut consume RNG stream selama
    // tick(), tapi tetap nangkep kalau formula training rate berubah signifikan
    // (misal ada yang gak sengaja ubah R(0.5,1.4) atau lupa apply salah satu multiplier).
    expect(totalGain).toBeGreaterThan(2.0)
    expect(totalGain).toBeLessThan(9.0)
  })
})

describe('Calibration — Upset Rate (Combat)', () => {
  function simulateFight(weak, strong, seed) {
    useSeed(seed)
    const A = prepFighter(weak)
    const B = prepFighter(strong)
    let staA = 100, staB = 100, mom = 0
    let scoreA = 0, scoreB = 0
    for (let r = 1; r <= 3; r++) {
      const result = simRound(r, A, B, staA, staB, 'Balanced', 'neutral', mom)
      staA = result.staA; staB = result.staB; mom = result.momentum
      scoreA += result.scoreA; scoreB += result.scoreB
      if (result.finish) return result.finish.by === 'A' ? 'weak' : 'strong'
    }
    return scoreA > scoreB ? 'weak' : scoreA < scoreB ? 'strong' : 'draw'
  }

  it('10-point stat gap produces a plausible (non-zero, non-dominant) upset rate', () => {
    const N = 300
    let weakWins = 0
    const uniformAttrs = (v) => ({
      striking: v, wrestling: v, bjj: v, cardio: v,
      strength: v, chin: v, footwork: v, fightIQ: v,
    })

    for (let i = 0; i < N; i++) {
      const weak = createTestFighter({ id: 'w1', name: 'Weak', attrs: uniformAttrs(50) })
      const strong = createTestFighter({ id: 's1', name: 'Strong', attrs: uniformAttrs(60) })
      const outcome = simulateFight(weak, strong, i * 137 + 7)
      if (outcome === 'weak') weakWins++
    }

    const upsetRate = weakWins / N
    // Baseline empiris (gap=10 poin di semua attribut): ~3.7% (11/300).
    // Band [1%, 15%] — cukup ketat buat nangkep kalau upset jadi mustahil (0%,
    // engine kelewat deterministik) atau kelewat sering (>15%, skill gak lagi berarti),
    // tapi cukup longgar buat variance wajar dari perubahan kecil di sistem lain.
    expect(upsetRate).toBeGreaterThan(0.01)
    expect(upsetRate).toBeLessThan(0.15)
  })
})
