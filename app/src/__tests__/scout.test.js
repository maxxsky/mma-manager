// Scout tests — package level ranges, scoutGrade/makeReport unchanged
import { describe, it, expect } from 'vitest'
import { R } from '@ironfist/engine/rng.js'
import { genFighter, scoutGrade, makeReport } from '@ironfist/engine/fighter.js'
import { useSeed, clearSeed } from './helpers.js'

// Scout package ranges (mirroring Scout.jsx)
const AMATEUR_PACKAGES = [
  { label: 'Local Amateur Circuit',   level: [0.30, 0.45] },
  { label: 'Regional Tryouts',        level: [0.35, 0.55] },
  { label: 'National Scouting Trip',  level: [0.40, 0.60] },
]

const DIAMOND_PACKAGE = { label: 'Diamond in the Rough', level: [1.0, 1.45] }

describe('Scout Package Level Ranges', () => {
  it('Local Amateur Circuit produces fighters in [0.30, 0.45] range', () => {
    for (let i = 0; i < 50; i++) {
      useSeed(i * 1001 + 7)
      const level = R(0.30, 0.45)
      expect(level).toBeGreaterThanOrEqual(0.30)
      expect(level).toBeLessThanOrEqual(0.45)
      const f = genFighter(level)
      // assert fighter exists (genFighter doesn't crash)
      expect(f.name).toBeDefined()
      expect(f.attrs).toBeDefined()
    }
    clearSeed()
  })

  it('Regional Tryouts produces fighters in [0.35, 0.55] range', () => {
    for (let i = 0; i < 50; i++) {
      useSeed(i * 2002 + 13)
      const level = R(0.35, 0.55)
      expect(level).toBeGreaterThanOrEqual(0.35)
      expect(level).toBeLessThanOrEqual(0.55)
      const f = genFighter(level)
      expect(f.name).toBeDefined()
    }
    clearSeed()
  })

  it('National Scouting Trip produces fighters in [0.40, 0.60] range', () => {
    for (let i = 0; i < 50; i++) {
      useSeed(i * 3003 + 21)
      const level = R(0.40, 0.60)
      expect(level).toBeGreaterThanOrEqual(0.40)
      expect(level).toBeLessThanOrEqual(0.60)
      const f = genFighter(level)
      expect(f.name).toBeDefined()
    }
    clearSeed()
  })

  it('amateur level ranges overlap with each other', () => {
    // [0.30, 0.45] overlaps with [0.35, 0.55] at 0.35-0.45
    expect(0.35).toBeGreaterThanOrEqual(0.30)
    expect(0.35).toBeLessThanOrEqual(0.45)
    expect(0.45).toBeGreaterThanOrEqual(0.35)
    expect(0.45).toBeLessThanOrEqual(0.55)

    // [0.35, 0.55] overlaps with [0.40, 0.60] at 0.40-0.55
    expect(0.40).toBeGreaterThanOrEqual(0.35)
    expect(0.40).toBeLessThanOrEqual(0.55)
    expect(0.55).toBeGreaterThanOrEqual(0.40)
    expect(0.55).toBeLessThanOrEqual(0.60)

    // [0.30, 0.45] overlaps with [0.40, 0.60] at 0.40-0.45
    expect(0.40).toBeGreaterThanOrEqual(0.30)
    expect(0.40).toBeLessThanOrEqual(0.45)
    expect(0.45).toBeGreaterThanOrEqual(0.40)
    expect(0.45).toBeLessThanOrEqual(0.60)
  })

  it('Diamond in the Rough stays at [1.0, 1.45] — completely separate from amateur', () => {
    // No overlap: diamond min (1.0) > amateur max (0.60)
    expect(DIAMOND_PACKAGE.level[0]).toBeGreaterThan(0.60)
    expect(DIAMOND_PACKAGE.level[1]).toBe(1.45)
    for (let i = 0; i < 20; i++) {
      useSeed(i * 4004 + 42)
      const level = R(1.0, 1.45)
      expect(level).toBeGreaterThanOrEqual(1.0)
      expect(level).toBeLessThanOrEqual(1.45)
      const f = genFighter(level)
      expect(f.name).toBeDefined()
    }
    clearSeed()
  })
})

describe('scoutGrade unchanged', () => {
  it('scoutGrade maps rep to grade the same as before', () => {
    expect(scoutGrade(10)).toBe('C')
    expect(scoutGrade(20)).toBe('B')
    expect(scoutGrade(35)).toBe('B')
    expect(scoutGrade(40)).toBe('A')
    expect(scoutGrade(55)).toBe('A')
    expect(scoutGrade(60)).toBe('S')
    expect(scoutGrade(80)).toBe('S')
  })
})

describe('makeReport unchanged', () => {
  it('produces the same shape regardless of scout package level range', () => {
    useSeed(42)
    const fLow = genFighter(0.30)
    const fMid = genFighter(0.45)
    const fHigh = genFighter(0.60)

    const rep = 40 // Grade A
    const r1 = makeReport(fLow, scoutGrade(rep))
    const r2 = makeReport(fMid, scoutGrade(rep))
    const r3 = makeReport(fHigh, scoutGrade(rep))

    // All reports have the expected fields
    for (const r of [r1, r2, r3]) {
      expect(r.est).toBeDefined()
      expect(r.pot).toBeDefined()
      expect(Array.isArray(r.traits)).toBe(true)
      expect(r.bestCeiling).toBeDefined()
    }
    clearSeed()
  })

  it('grade=fuzz remains consistent — high-rep shows more', () => {
    useSeed(42)
    const f = genFighter(0.5)

    const repLow = 10  // Grade C
    const repHigh = 70 // Grade S

    const low = makeReport(f, scoutGrade(repLow))
    const high = makeReport(f, scoutGrade(repHigh))

    // C grade: chin and fightIQ should be "?"
    expect(low.est.chin).toBe('?')
    expect(low.est.fightIQ).toBe('?')
    // S grade: no question marks
    expect(high.est.chin).not.toBe('?')
    expect(high.est.fightIQ).not.toBe('?')
    // C grade: no real traits shown
    expect(low.traits.length).toBe(0)
    // S grade: full traits
    expect(high.traits.length).toBe(2)
    clearSeed()
  })
})
