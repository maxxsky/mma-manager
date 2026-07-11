// Invariant tests — global game state integrity
import { describe, it, expect } from 'vitest'
import { createTestGame, useSeed, assertInvariants } from './helpers.js'
import { tick } from '../engine/state.js'

describe('Game State Invariants', () => {
  it('newGame produces valid state', () => {
    useSeed(42)
    const g = createTestGame()
    const errors = []
    
    expect(g.week).toBe(1)
    expect(g.roster.length).toBeGreaterThanOrEqual(1)
    expect(g.coaches.length).toBeGreaterThanOrEqual(1)
    expect(g.cash).toBeGreaterThan(0)
    expect(g.chemistry).toBeGreaterThanOrEqual(0)
    expect(g.chemistry).toBeLessThanOrEqual(100)
    expect(g.rep).toBeGreaterThanOrEqual(2)
    expect(g.rep).toBeLessThanOrEqual(100)
    expect(g.facilities).toBeDefined()
    expect(g.divisions).toBeDefined()
    
    // Every fighter is valid
    for (const f of g.roster) {
      expect(f.age).toBeGreaterThanOrEqual(16)
      expect(f.morale).toBeGreaterThanOrEqual(0)
      expect(f.morale).toBeLessThanOrEqual(100)
      expect(f.attrs).toBeDefined()
      expect(f.training).toBeDefined()
      expect(f.training.type).toBeDefined()
    }
  })

  it('invariants hold after 1 tick', () => {
    useSeed(42)
    const g = createTestGame()
    tick(g)
    expect(() => assertInvariants(g)).not.toThrow()
  })

  it('invariants hold after 10 ticks', () => {
    useSeed(42)
    const g = createTestGame()
    for (let i = 0; i < 10; i++) tick(g)
    expect(() => assertInvariants(g)).not.toThrow()
  })

  it('invariants hold after 52 ticks (1 year)', () => {
    useSeed(42)
    const g = createTestGame()
    for (let i = 0; i < 52; i++) tick(g)
    expect(() => assertInvariants(g)).not.toThrow()
  })

  it('cash never becomes NaN or Infinity', () => {
    useSeed(42)
    const g = createTestGame()
    for (let i = 0; i < 52; i++) {
      tick(g)
      expect(isFinite(g.cash)).toBe(true)
    }
  })

  it('roster never has duplicate fighters', () => {
    useSeed(42)
    const g = createTestGame()
    for (let i = 0; i < 20; i++) tick(g)
    const ids = g.roster.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('chemistry stays in [0,100]', () => {
    useSeed(42)
    const g = createTestGame()
    for (let i = 0; i < 52; i++) {
      tick(g)
      expect(g.chemistry).toBeGreaterThanOrEqual(0)
      expect(g.chemistry).toBeLessThanOrEqual(100)
    }
  })

  it('rep stays in [2,100]', () => {
    useSeed(42)
    const g = createTestGame()
    for (let i = 0; i < 52; i++) {
      tick(g)
      expect(g.rep).toBeGreaterThanOrEqual(2)
      expect(g.rep).toBeLessThanOrEqual(100)
    }
  })

  it('rival camp lifecycle never returns to expansion once left, stays in valid enum', () => {
    useSeed(42)
    const g = createTestGame()
    const VALID_LIFECYCLES = ['expansion', 'growth', 'championship', 'decline', 'rebuild']
    const hasLeftExpansion = {}

    for (let i = 0; i < 104; i++) { // 2 tahun — shadow tick tiap 12 minggu (SHADOW_TICK_INTERVAL)
      tick(g)
      g.rivals?.forEach((camp) => {
        if (!camp._shadow) return
        const lc = camp._shadow.lifecycle
        expect(VALID_LIFECYCLES).toContain(lc)
        if (hasLeftExpansion[camp.id] && lc === 'expansion') {
          throw new Error(`Camp ${camp.id} (${camp.name}) balik ke 'expansion' setelah pernah keluar`)
        }
        if (lc !== 'expansion') hasLeftExpansion[camp.id] = true
      })
    }
  })
})
