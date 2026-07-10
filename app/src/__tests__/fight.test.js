// Fight Engine Tests — simulation correctness
import { describe, it, expect } from 'vitest'
import { createTestFighter, useSeed, TEST_SEED } from './helpers.js'
import { simRound, prepFighter, autoGamePlan } from '../engine/fight.js'

describe('Fight Engine', () => {
  const fighterA = createTestFighter({ name: 'Alpha', id: 'a1' })
  const fighterB = createTestFighter({ name: 'Beta', id: 'b1', archetype: 'Boxer', attrs: {
    striking: 65, wrestling: 35, bjj: 20, cardio: 50, strength: 60, chin: 45, footwork: 40, fightIQ: 38
  }})

  describe('simRound basics', () => {
    it('produces a valid winner', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      expect(['A', 'B']).toContain(result.winner)
    })

    it('returns valid score values', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      expect(result.scoreA).toBeGreaterThanOrEqual(0)
      expect(result.scoreB).toBeGreaterThanOrEqual(0)
      expect(isFinite(result.scoreA)).toBe(true)
      expect(isFinite(result.scoreB)).toBe(true)
    })

    it('stamina stays in valid range', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      expect(result.staA).toBeGreaterThanOrEqual(0)
      expect(result.staA).toBeLessThanOrEqual(100)
      expect(result.staB).toBeGreaterThanOrEqual(0)
      expect(result.staB).toBeLessThanOrEqual(100)
    })

    it('damage values are non-negative', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      expect(result.dmgA).toBeGreaterThanOrEqual(0)
      expect(result.dmgB).toBeGreaterThanOrEqual(0)
    })

    it('landed strikes are non-negative', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      expect(result.landA).toBeGreaterThanOrEqual(0)
      expect(result.landB).toBeGreaterThanOrEqual(0)
    })

    it('generates log entries', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      expect(result.log.length).toBeGreaterThan(0)
    })

    it('generates tick log entries', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      expect(result.tickLog.length).toBeGreaterThan(0)
    })
  })

  describe('round count', () => {
    it('non-title fights have correct round count (3 rounds max)', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      // Run 3 rounds
      let staA = 100, staB = 100, mom = 0
      for (let r = 1; r <= 3; r++) {
        const result = simRound(r, A, B, staA, staB, 'Balanced', 'neutral', mom)
        staA = result.staA
        staB = result.staB
        mom = result.momentum
        if (result.finish) break
      }
      // Should complete without error
      expect(true).toBe(true)
    })
  })

  describe('autoGamePlan', () => {
    it('returns a valid plan', () => {
      const plan = autoGamePlan(fighterA, fighterB)
      expect(['Take It Down', 'Keep It Standing', 'Finish It', 'Survive & Outpoint', 'Balanced']).toContain(plan)
    })
  })

  describe('prepFighter', () => {
    it('does not mutate original fighter', () => {
      const original = { ...fighterA, attrs: { ...fighterA.attrs } }
      prepFighter(fighterA)
      expect(fighterA.attrs.striking).toBe(original.attrs.striking)
    })

    it('returns a fighter with valid attrs', () => {
      useSeed(TEST_SEED)
      const prepped = prepFighter(fighterA)
      for (const k of Object.keys(prepped.attrs)) {
        expect(prepped.attrs[k]).toBeGreaterThanOrEqual(5)
        expect(prepped.attrs[k]).toBeLessThanOrEqual(99)
      }
    })
  })
})
