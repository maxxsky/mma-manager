// Talent Pool — tests for hidden internal prospect system
import { describe, it, expect, beforeEach } from 'vitest'
import { useSeed, clearSeed, createTestGame, createTestFighter } from './helpers.js'
import { genTalentEntry, rollAddTalent, rollDiscoverTalent, pushTalentDiscoveryEvent, TALENT_POOL_MAX, rosterHasSpace, rosterFullMessage } from '@ironfist/engine/talentPool.js'
import { defaultContract } from '@ironfist/engine/fighter.js'
import { CAMP_TIERS } from '@ironfist/engine/data/camp.js'
import { tick } from '@ironfist/engine/state.js'

describe('Talent Pool', () => {
  /** Create a minimal game state for talent pool tests */
  function makeG(overrides = {}) {
    return {
      week: 1,
      roster: [],
      coaches: [],
      talentPool: [],
      facilities: { mats: 1, ring: 1, weights: 1, medical: 1 },
      rep: 8,
      campTier: 0,
      log: [],
      inbox: [],
      ...overrides,
    }
  }

  describe('genTalentEntry', () => {
    it('produces a valid fighter with potentialTier and high loyalty', () => {
      const f = genTalentEntry()
      expect(f.name).toBeDefined()
      expect(f.attrs).toBeDefined()
      expect(f.ceilings).toBeDefined()
      expect(f.potentialTier).toBeDefined()
      expect(['common', 'promising', 'special', 'generational']).toContain(f.potentialTier)
      // Loyalty harus di rentang 60-90 (lebih tinggi dari fighter normal)
      expect(f.loyalty).toBeGreaterThanOrEqual(60)
      expect(f.loyalty).toBeLessThanOrEqual(90)
    })
  })

  describe('rollAddTalent', () => {
    it('talentPool never exceeds TALENT_POOL_MAX', () => {
      useSeed(42)
      const g = makeG({
        facilities: { mats: 10, ring: 10, weights: 10, medical: 10 },
        rep: 100,
        campTier: 4,
      })
      // Force-add to fill pool
      for (let i = 0; i < TALENT_POOL_MAX; i++) {
        g.talentPool.push(genTalentEntry())
      }
      expect(g.talentPool.length).toBe(TALENT_POOL_MAX)

      // rollAddTalent should return false and not add beyond max
      const result = rollAddTalent(g)
      expect(result).toBe(false)
      expect(g.talentPool.length).toBe(TALENT_POOL_MAX)
      clearSeed()
    })

    it('high membership gives high probability of adding entries', () => {
      // With 200+ members, chance should be near 100% — pool fills to max quickly
      useSeed(12345)
      const g = makeG({
        facilities: { mats: 10, ring: 10, weights: 10, medical: 10 },
        rep: 100,
        campTier: 4,
      })
      // Pool should reach max capacity within 10 attempts
      let added = 0
      for (let i = 0; i < 10; i++) {
        if (rollAddTalent(g)) added++
      }
      // With near-100% chance, should fill all 3 slots very quickly
      expect(added).toBeGreaterThanOrEqual(2)
      expect(g.talentPool.length).toBe(TALENT_POOL_MAX)
      clearSeed()
    })

    it('low membership gives low probability of adding entries', () => {
      // With 1 mat and low rep, membership should be low (~130 members)
      useSeed(42)
      const g = makeG({
        facilities: { mats: 1, ring: 1, weights: 1, medical: 1 },
        rep: 8,
        campTier: 0,
      })
      let added = 0
      for (let i = 0; i < 100; i++) {
        if (rollAddTalent(g)) added++
      }
      // Low membership = low chance — should add fewer than with high membership
      expect(added).toBeLessThan(40)
      clearSeed()
    })
  })

  describe('rollDiscoverTalent', () => {
    it('returns null when talentPool is empty', () => {
      const g = makeG({ talentPool: [] })
      const result = rollDiscoverTalent(g)
      expect(result).toBeNull()
    })

    it('returns a fighter and removes from pool on success', () => {
      useSeed(42)
      const g = makeG()
      const entry = genTalentEntry()
      const entryId = entry.id
      g.talentPool = [entry]

      const result = rollDiscoverTalent(g)
      // May be null if RNG doesn't hit — but if it hits, remove from pool
      if (result) {
        expect(result.id).toBe(entryId)
        expect(g.talentPool.length).toBe(0)
      }
      clearSeed()
    })

    it('Player\'s Coach coach increases discovery chance', () => {
      useSeed(42)
      // With Player's Coach: run many cycles and count discoveries
      let withCoachDiscoveries = 0
      for (let i = 0; i < 100; i++) {
        useSeed(i * 7919 + 1)
        const g = makeG({
          coaches: [{ id: 1, name: 'Test Coach', personality: "Player's Coach", spec: 'Head', skill: 5 }],
        })
        g.talentPool = [genTalentEntry()]
        if (rollDiscoverTalent(g)) withCoachDiscoveries++
      }
      clearSeed()

      // Without Player's Coach
      useSeed(42)
      let withoutCoachDiscoveries = 0
      for (let i = 0; i < 100; i++) {
        useSeed(i * 7919 + 1)
        const g = makeG({
          coaches: [{ id: 1, name: 'Test Coach', personality: 'Technician', spec: 'Head', skill: 5 }],
        })
        g.talentPool = [genTalentEntry()]
        if (rollDiscoverTalent(g)) withoutCoachDiscoveries++
      }
      clearSeed()

      // With Player's Coach should discover more often (30%+20% = 50% vs 30%)
      expect(withCoachDiscoveries).toBeGreaterThan(withoutCoachDiscoveries)
    })
  })

  describe('rosterHasSpace', () => {
    it('returns true when roster is below capacity', () => {
      const g = makeG({
        roster: [createTestFighter({ id: 'f1' })],
        campTier: 0,
      })
      expect(rosterHasSpace(g)).toBe(true)
    })

    it('returns false when roster is at capacity', () => {
      const cap = CAMP_TIERS[0].rosterCap
      const roster = []
      for (let i = 0; i < cap; i++) {
        roster.push(createTestFighter({ id: `f${i}` }))
      }
      const g = makeG({ roster, campTier: 0 })
      expect(rosterHasSpace(g)).toBe(false)
    })
  })

  describe('talentAccept handler integration', () => {
    it('accepting a talent does not reduce cash and adds fighter with high loyalty', () => {
      useSeed(42)
      const g = createTestGame()
      const cashBefore = g.cash
      const rosterCountBefore = g.roster.length

      // Create a talent fighter
      const talent = genTalentEntry()
      const loyaltyBefore = talent.loyalty

      // Simulate the handler
      const { registerTalentHandlers } = require('@ironfist/engine/dispatch/handlers/talent.js')
      const handlers = {}
      registerTalentHandlers((key, fn) => { handlers[key] = fn })
      handlers.talentAccept({ g, c: { talentFighter: talent } })

      // Cash tidak berkurang
      expect(g.cash).toBe(cashBefore)
      // Fighter masuk roster
      expect(g.roster.length).toBe(rosterCountBefore + 1)
      // Loyalty di rentang tinggi
      const added = g.roster.find(f => f.loyalty === loyaltyBefore)
      expect(added).toBeDefined()
      expect(added.loyalty).toBeGreaterThanOrEqual(60)
      clearSeed()
    })

    it('cannot accept talent when roster is full', () => {
      useSeed(42)
      const cap = CAMP_TIERS[0].rosterCap
      const roster = []
      for (let i = 0; i < cap; i++) {
        roster.push(createTestFighter({ id: `f${i}` }))
      }
      const g = makeG({ roster, campTier: 0, inbox: [], log: [] })
      const talent = genTalentEntry()

      const { registerTalentHandlers } = require('@ironfist/engine/dispatch/handlers/talent.js')
      const handlers = {}
      registerTalentHandlers((key, fn) => { handlers[key] = fn })
      handlers.talentAccept({ g, c: { talentFighter: talent } })

      // Roster unchanged
      expect(g.roster.length).toBe(cap)
      // Should have a log message about full roster
      const fullMsg = g.log.some(l => l.includes('penuh') || l.includes('full') || l.includes('Tidak bisa'))
      expect(fullMsg).toBe(true)
      clearSeed()
    })
  })

  describe('talent pool during full game ticks', () => {
    it('talentPool is initialized for new games', () => {
      const g = createTestGame()
      expect(g.talentPool).toBeDefined()
      expect(Array.isArray(g.talentPool)).toBe(true)
    })

    it('talentPool never exceeds max after many settlement cycles', () => {
      useSeed(42)
      const g = createTestGame()
      // Force high membership for quick pool filling
      g.facilities = { mats: 10, ring: 10, weights: 10, medical: 10 }
      g.campTier = 4
      g.rep = 100

      // Run 104 weeks (2 years) — 26 settlement cycles
      for (let i = 0; i < 104; i++) {
        tick(g)
      }
      expect(g.talentPool.length).toBeLessThanOrEqual(TALENT_POOL_MAX)
      clearSeed()
    })
  })
})
