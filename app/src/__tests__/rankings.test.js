// Rankings tests — campId marking in divisions
import { describe, it, expect } from 'vitest'
import { createTestGame, useSeed, clearSeed } from './helpers.js'
import { genDivisions } from '../engine/rankings.js'
import { genRivalCamp } from '../engine/rivals.js'
import { mulberry32, setRNG } from '../engine/rng.js'
import { tick } from '../engine/state.js'
import { maintainDivisions } from '../engine/world.js'
import { TICK_YEARLY } from '../engine/world/config.js'

describe('Camp marking — genDivisions', () => {
  it('marks exactly 2-4 fighters per division with campId', () => {
    useSeed(42)
    const rivals = [genRivalCamp(0), genRivalCamp(1), genRivalCamp(2)]
    const d = genDivisions(rivals)

    Object.entries(d).forEach(([wc, div]) => {
      const marked = div.list.filter((f) => f.campId != null)
      expect(
        marked.length,
        `${wc}: expected 2-4 marked, got ${marked.length}`
      ).toBeGreaterThanOrEqual(2)
      expect(
        marked.length,
        `${wc}: expected 2-4 marked, got ${marked.length}`
      ).toBeLessThanOrEqual(4)

      // Every marked fighter has both campId and campName
      marked.forEach((f) => {
        expect(f.campId).toBeDefined()
        expect(f.campName).toBeDefined()
        expect(typeof f.campName).toBe('string')
      })
    })
  })

  it('never marks more than 4 or less than 2 per division across many seeds', () => {
    for (let seed = 0; seed < 20; seed++) {
      useSeed(seed * 7 + 3)
      const rivals = [genRivalCamp(0), genRivalCamp(1), genRivalCamp(2)]
      const d = genDivisions(rivals)

      Object.entries(d).forEach(([wc, div]) => {
        const marked = div.list.filter((f) => f.campId != null)
        expect(marked.length).toBeGreaterThanOrEqual(2)
        expect(marked.length).toBeLessThanOrEqual(4)
      })
    }
  })

  it('all 15 fighters are present after marking (no fighters removed)', () => {
    useSeed(42)
    const rivals = [genRivalCamp(0), genRivalCamp(1), genRivalCamp(2)]
    const d = genDivisions(rivals)

    Object.values(d).forEach((div) => {
      expect(div.list.length).toBe(15)
    })
  })

  it('campId references a valid rival camp when provided', () => {
    useSeed(42)
    const rivals = [genRivalCamp(0), genRivalCamp(1), genRivalCamp(2)]
    const campIds = new Set(rivals.map((r) => r.id))
    const d = genDivisions(rivals)

    Object.values(d).forEach((div) => {
      div.list.forEach((f) => {
        if (f.campId) {
          expect(campIds.has(f.campId), `campId ${f.campId} not in rivals`).toBe(true)
        }
      })
    })
  })
})

describe('Camp marking — rep-weighted distribution', () => {
  it('high-rep camp gets more fighters than low-rep camp over many seeds', () => {
    // Create 2 rivals with deliberately skewed rep
    const lowRep = genRivalCamp(0)
    const highRep = genRivalCamp(1)
    lowRep.rep = 1
    highRep.rep = 99
    const rivals = [lowRep, highRep]

    let highRepCount = 0
    let lowRepCount = 0
    const seeds = 50

    for (let seed = 0; seed < seeds; seed++) {
      useSeed(seed * 13 + 7)
      const d = genDivisions(rivals)

      Object.values(d).forEach((div) => {
        div.list.forEach((f) => {
          if (f.campId === highRep.id) highRepCount++
          if (f.campId === lowRep.id) lowRepCount++
        })
      })
    }

    // High rep camp should have a statistically significant advantage
    expect(highRepCount).toBeGreaterThan(lowRepCount * 2)
  })
})

describe('Camp marking — world integration', () => {
  it('genDivisions through newGame produces marked fighters', () => {
    useSeed(42)
    const g = createTestGame()

    Object.values(g.divisions).forEach((div) => {
      const marked = div.list.filter((f) => f.campId != null)
      expect(marked.length).toBeGreaterThanOrEqual(2)
      expect(marked.length).toBeLessThanOrEqual(4)
    })
  })
})

describe('Camp marking — maintainDivisions', () => {
  it('replacement fighters sometimes get campId, not always', () => {
    useSeed(42)
    const g = createTestGame()

    // Track all fighters with campId before any replacements
    const beforeCamps = new Set()
    Object.values(g.divisions).forEach((div) => {
      div.list.forEach((f) => {
        if (f.campId) beforeCamps.add(f.id)
      })
    })

    // Run multiple ticks at yearly boundaries
    // tick() increments g.week first, so set week to (multiple - 1)
    for (let i = 0; i < 10; i++) {
      g.week = i * TICK_YEARLY + TICK_YEARLY - 1
      tick(g)
    }

    // Collect all fighters after ticks
    const afterFighters = []
    Object.values(g.divisions).forEach((div) => {
      div.list.forEach((f) => {
        afterFighters.push(f)
      })
    })

    const newFighters = afterFighters.filter((f) => !beforeCamps.has(f.id))
    const newMarked = newFighters.filter((f) => f.campId != null)

    // At least some replacements should exist
    expect(newFighters.length).toBeGreaterThan(0)

    // Some replacements should be marked (not zero), but NOT all
    expect(newMarked.length).toBeGreaterThan(0)
    expect(newMarked.length).toBeLessThan(newFighters.length)
  })
})
