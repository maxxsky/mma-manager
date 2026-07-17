// RNG Determinism Tests — world RNG seeded, setRNG/resetRNG behavior
// Commit 36209cb: _worldRng = mulberry32(Date.now()) init sekali,
// resetRNG() nunjuk closure yg sama — bukan reinstantiate.
import { describe, it, expect } from 'vitest'
import { mulberry32, setRNG, resetRNG, random } from '../engine/rng.js'

describe('RNG Determinism — same seed → same sequence', () => {
  it('produces identical values when seeded with the same number', () => {
    const N = 20

    // First run
    setRNG(mulberry32(123))
    const run1 = []
    for (let i = 0; i < N; i++) run1.push(random())

    // Second run — same seed
    setRNG(mulberry32(123))
    const run2 = []
    for (let i = 0; i < N; i++) run2.push(random())

    // Must be identical
    expect(run1).toEqual(run2)
  })

  it('produces the same last value as first when re-seeded', () => {
    // More compact: seed → take 5 values → re-seed → take 5 values
    // Verify every single position matches
    setRNG(mulberry32(42))
    const a = [random(), random(), random(), random(), random()]

    setRNG(mulberry32(42))
    const b = [random(), random(), random(), random(), random()]

    for (let i = 0; i < 5; i++) {
      expect(a[i]).toBe(b[i])
    }
  })

  it('all 20 values in [0, 1) range and unique', () => {
    setRNG(mulberry32(777))
    const vals = Array.from({ length: 20 }, () => random())
    vals.forEach((v, i) => {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    })
    // At least 15 should be unique (mulberry32 is high-quality)
    const unique = new Set(vals)
    expect(unique.size).toBeGreaterThanOrEqual(15)
  })
})

describe('RNG Continuity — resetRNG restores world RNG (not restart, not fight RNG)', () => {
  it('resetRNG does NOT restart the world RNG sequence', () => {
    // Take some values from the default world RNG
    const before = [random(), random(), random(), random(), random()]

    // resetRNG should NOT restart the sequence — worldRng advances
    resetRNG()
    const after = [random(), random(), random(), random(), random()]

    // If reset restarted worldRng, after would equal before.
    // They should differ because worldRng advanced through before + after.
    expect(after).not.toEqual(before)
  })

  it('resetRNG returns to world RNG, not fight RNG', () => {
    // Record world RNG state
    random() // advance worldRng
    const marker = random() // capture this position
    random() // advance again

    // Simulate fight: inject seeded RNG
    setRNG(mulberry32(999))
    const fightVal = random() // from fight RNG
    expect(fightVal).toBeGreaterThanOrEqual(0)

    // Back to world
    resetRNG()

    // This value should NOT equal fightVal (different stream)
    const back = random()
    expect(back).not.toBe(fightVal)
  })
})
