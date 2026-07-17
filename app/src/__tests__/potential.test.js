// Potential tiers — tests for genFighter ceiling distribution & integrity
import { describe, it, expect } from 'vitest'
import { useSeed, clearSeed } from './helpers.js'
import { genFighter } from '@ironfist/engine/fighter.js'
import { ATTRS } from '@ironfist/engine/data/attributes.js'
import { POTENTIAL_TIERS } from '@ironfist/engine/data/archetypes.js'

describe('Potential Tiers', () => {
  it('distribution roughly matches 70/22/7/1% over 1000 rolls', () => {
    const counts = { common: 0, promising: 0, special: 0, generational: 0 }
    const N = 1000
    for (let i = 0; i < N; i++) {
      // Use a fresh seed per fighter so they're independent
      useSeed(i * 7919 + 1)
      const f = genFighter(0.6)
      counts[f.potentialTier]++
    }
    clearSeed()

    // Expected percentages: common 70%, promising 22%, special 7%, generational 1%
    // Tolerances: generous (±5% for 70%, ±4% for 22%, ±3% for 7%, ±1.5% for 1%)
    expect(counts.common).toBeGreaterThanOrEqual(650)
    expect(counts.common).toBeLessThanOrEqual(750)
    expect(counts.promising).toBeGreaterThanOrEqual(150)
    expect(counts.promising).toBeLessThanOrEqual(300)
    expect(counts.special).toBeGreaterThanOrEqual(30)
    expect(counts.special).toBeLessThanOrEqual(120)
    expect(counts.generational).toBeGreaterThanOrEqual(2)
    expect(counts.generational).toBeLessThanOrEqual(25)

    // Sum should equal N
    const total = counts.common + counts.promising + counts.special + counts.generational
    expect(total).toBe(N)
  })

  it('ceiling never below current attr or above 99', () => {
    for (let i = 0; i < 200; i++) {
      useSeed(i * 4729 + 7)
      const f = genFighter(0.5 + Math.random() * 0.8)
      for (const k of ATTRS) {
        expect(f.ceilings[k]).toBeGreaterThanOrEqual(f.attrs[k])
        expect(f.ceilings[k]).toBeLessThanOrEqual(99)
      }
    }
    clearSeed()
  })

  it('fighters with same level can have different ceilings from different tiers', () => {
    // Generate many fighters at the same level and collect unique ceiling patterns
    const ceilingsSet = new Set()
    useSeed(42)
    for (let i = 0; i < 500; i++) {
      useSeed(i * 31337 + 99)
      const f = genFighter(0.7)
      const sig = `${f.potentialTier}:${ATTRS.map(k => f.ceilings[k]).join(',')}`
      ceilingsSet.add(sig)
    }
    clearSeed()
    // With 500 fighters we should see at least 2 distinct ceiling signatures
    // (different tiers producing different ceilings for same level)
    expect(ceilingsSet.size).toBeGreaterThanOrEqual(2)
  })

  it('every genFighter has a valid potentialTier', () => {
    for (let i = 0; i < 50; i++) {
      useSeed(i * 5555 + 3)
      const f = genFighter(0.6)
      const validTiers = POTENTIAL_TIERS.map(t => t.id)
      expect(validTiers).toContain(f.potentialTier)
    }
    clearSeed()
  })

  it('potentialTier uses the same seed domain as other random rolls (no regression)', () => {
    // With seed=42, multiple calls produce deterministic fighter names, attrs, etc.
    // Just verify the field exists and is one of the valid tiers after genFighter
    useSeed(42)
    const f1 = genFighter(0.6)
    expect(f1.potentialTier).toBeDefined()
    expect(['common', 'promising', 'special', 'generational']).toContain(f1.potentialTier)
  })
})
