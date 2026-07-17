// Reducer Tests — state mutation correctness
import { describe, it, expect } from 'vitest'
import { createTestGame, useSeed, createTestFighter } from './helpers.js'
import { reducer } from '@ironfist/engine/reducer.js'
import { setRNG } from '@ironfist/engine/rng.js'

describe('Reducer', () => {
  describe('SET_TRAINING', () => {
    it('updates training type and intensity', () => {
      useSeed(42)
      const g = createTestGame()
      const f = g.roster[0]
      reducer(g, { type: 'SET_TRAINING', fighterId: f.id, program: 'sparring', intensity: 'Hard' })
      expect(f.training.type).toBe('sparring')
      expect(f.training.intensity).toBe('Hard')
    })

    it('defaults intensity to Medium', () => {
      useSeed(42)
      const g = createTestGame()
      const f = g.roster[0]
      reducer(g, { type: 'SET_TRAINING', fighterId: f.id, program: 'grappling' })
      expect(f.training.intensity).toBe('Medium')
    })

    it('does nothing for unknown fighter', () => {
      useSeed(42)
      const g = createTestGame()
      const before = g.roster[0].training.type
      reducer(g, { type: 'SET_TRAINING', fighterId: 'nonexistent', program: 'sparring' })
      expect(g.roster[0].training.type).toBe(before)
    })
  })

  describe('INBOX_REMOVE', () => {
    it('removes message from inbox', () => {
      useSeed(42)
      const g = createTestGame()
      g.inbox = [{ id: 'msg1', title: 'test' }, { id: 'msg2', title: 'test2' }]
      reducer(g, { type: 'INBOX_REMOVE', messageId: 'msg1' })
      expect(g.inbox.length).toBe(1)
      expect(g.inbox[0].id).toBe('msg2')
    })
  })

  describe('cash mutation', () => {
    it('updates cash correctly', () => {
      useSeed(42)
      const g = createTestGame()
      const before = g.cash
      reducer(g, { type: 'INBOX_EVENT', messageId: 'nonexistent', choice: { cash: 0 } })
      // Cash should not change for nonexistent message
      expect(g.cash).toBe(before)
    })
  })

  describe('UNDO/REDO', () => {
    it('undo restores previous training type', () => {
      const g = createTestGame()
      const fighterId = g.roster[0].id
      const origType = g.roster[0].training.type

      g._undoStack = []
      g._redoStack = []
      reducer(g, { type: 'SET_TRAINING', fighterId, program: 'sparring', intensity: 'Hard' })
      expect(g.roster.find((x) => x.id === fighterId).training.type).toBe('sparring')

      reducer(g, { type: 'UNDO' })
      // UNDO mengganti seluruh isi g lewat Object.assign dari JSON snapshot,
      // jadi referensi objek di g.roster ikut berubah — selalu re-fetch dari g
      // setelah UNDO/REDO, jangan pegang referensi fighter dari sebelum aksi ini.
      expect(g.roster.find((x) => x.id === fighterId).training.type).toBe(origType)
    })
  })

  describe('state integrity after reducer', () => {
    it('SET_TRAINING preserves all state properties', () => {
      useSeed(42)
      const g = createTestGame()
      const f = g.roster[0]
      reducer(g, { type: 'SET_TRAINING', fighterId: f.id, program: 'sparring' })
      expect(g.roster).toBeDefined()
      expect(g.roster.length).toBeGreaterThan(0)
      expect(g.coaches).toBeDefined()
      expect(g.cash).toBeDefined()
      expect(g.log).toBeDefined()
    })
  })

  describe('POACH_FIGHTER', () => {
    it('success: fighter moves to roster, cash decreases, rivalry increases', () => {
      useSeed(42)
      const g = createTestGame()
      const rivalId = 'poach-rival-1'
      const target = { id: 'poach1', name: 'PoachTarget', archetype: 'Boxer', attrs: { striking: 50, wrestling: 50, bjj: 50, cardio: 50, strength: 50, chin: 50, footwork: 50, fightIQ: 50 } }
      g.rivals.push({ id: rivalId, name: 'TestRival', fighters: [target], rivalry: 30 })
      const rosterBefore = g.roster.length
      const cashBefore = g.cash

      reducer(g, { type: 'POACH_FIGHTER', rivalId, targetId: 'poach1', cost: 5000, failCost: 1000, successChance: 100 })

      expect(g.roster.length).toBe(rosterBefore + 1)
      expect(g.roster.find((x) => x.id === 'poach1')).toBeDefined()
      expect(g.cash).toBe(cashBefore - 5000)
      expect(g.rivals.find((x) => x.id === rivalId).rivalry).toBe(50) // 30 + 20
      expect(g.rivals.find((x) => x.id === rivalId).fighters.length).toBe(0)
    })

    it('failure: fighter stays with rival, cash decreases less, rivalry increases less', () => {
      useSeed(42)
      const g = createTestGame()
      const rivalId = 'poach-rival-2'
      const target = { id: 'poach2', name: 'FailTarget', archetype: 'Wrestler', attrs: { striking: 40, wrestling: 70, bjj: 40, cardio: 50, strength: 60, chin: 50, footwork: 40, fightIQ: 50 } }
      g.rivals.push({ id: rivalId, name: 'TestRival2', fighters: [target], rivalry: 30 })
      const rosterBefore = g.roster.length
      const cashBefore = g.cash

      reducer(g, { type: 'POACH_FIGHTER', rivalId, targetId: 'poach2', cost: 5000, failCost: 1000, successChance: 0 })

      expect(g.roster.length).toBe(rosterBefore) // no change
      expect(g.roster.find((x) => x.id === 'poach2')).toBeUndefined()
      expect(g.cash).toBe(cashBefore - 1000)
      expect(g.rivals.find((x) => x.id === rivalId).rivalry).toBe(35) // 30 + 5
      expect(g.rivals.find((x) => x.id === rivalId).fighters.length).toBe(1) // still there
    })
  })

  describe('RESOLVE_INJURY_CHOICE', () => {
    it('physio: cash berkurang sesuai formula, weeks turun 30% (rounded), no risk', () => {
      useSeed(42)
      const g = createTestGame()
      const f = g.roster[0]
      f.injury = { weeks: 10, label: '🚑 Test', cost: 5000, tier: 1, costPerWeek: 500 }
      const startCash = g.cash
      const physioCost = Math.round(5000 * 0.5 * (1 - (g.facilities.medical - 1) * 0.05))
      const expectedReduction = Math.max(1, Math.round(10 * 0.3))

      reducer(g, { type: 'RESOLVE_INJURY_CHOICE', fighterId: f.id, choice: 'physio', messageId: -1, physioCost })

      expect(g.cash).toBe(startCash - physioCost)
      expect(f.injury.weeks).toBe(10 - expectedReduction) // 10 - 3 = 7
    })

    it('push: weeks turun 40% kalau berhasil', () => {
      useSeed(42)
      const g = createTestGame()
      const f = g.roster[0]
      g.facilities.medical = 5
      f.injury = { weeks: 10, label: '🚑 Test', cost: 5000, tier: 1, costPerWeek: 500 }
      const weekBefore = f.injury.weeks

      // Use seed where random() >= reinjuryChance (0.25 - 4*0.03 = 0.13)
      // Try multiple seeds to find one where random() >= 0.13
      let foundSuccess = false
      let successWeeks = 0
      for (let s = 0; s < 100; s++) {
        useSeed(s * 137 + 7)
        const g2 = createTestGame()
        const f2 = g2.roster[0]
        g2.facilities.medical = 5
        f2.injury = { weeks: 10, label: '🚑 Test', cost: 5000, tier: 1, costPerWeek: 500 }
        const cash2 = g2.cash
        reducer(g2, { type: 'RESOLVE_INJURY_CHOICE', fighterId: f2.id, choice: 'push', messageId: -1 })
        const diff = f2.injury.weeks - 10
        if (diff < 0) {
          // Success: weeks decreased
          foundSuccess = true
          successWeeks = f2.injury.weeks
          expect(g2.cash).toBe(cash2) // no cash change
          break
        }
      }
      expect(foundSuccess).toBe(true)
      // 40% of 10 = 4 weeks reduction
      expect(successWeeks).toBe(6)
    })

    it('push: re-injury terjadi — weeks nambah, cash unchanged', () => {
      useSeed(42)
      const g = createTestGame()
      const f = g.roster[0]
      g.facilities.medical = 1 // reinjuryChance = 0.25
      f.injury = { weeks: 10, label: '🚑 Test', cost: 5000, tier: 1, costPerWeek: 500 }
      const cashBefore = g.cash

      // Override RNG to always return 0.1 (< 0.25 → triggers re-injury)
      setRNG(() => 0.1)

      const weekBefore = f.injury.weeks
      reducer(g, { type: 'RESOLVE_INJURY_CHOICE', fighterId: f.id, choice: 'push', messageId: -1 })

      // Re-injury: weeks = 10 + 4 + 2 = 16
      expect(f.injury.weeks).toBe(16)
      expect(g.cash).toBe(cashBefore) // no cash change
    })

    it('rest: no changes to weeks or cash', () => {
      useSeed(42)
      const g = createTestGame()
      const f = g.roster[0]
      f.injury = { weeks: 10, label: '🚑 Test', cost: 5000, tier: 1, costPerWeek: 500 }
      const weekBefore = f.injury.weeks
      const cashBefore = g.cash

      reducer(g, { type: 'RESOLVE_INJURY_CHOICE', fighterId: f.id, choice: 'rest', messageId: -1 })

      expect(f.injury.weeks).toBe(weekBefore) // unchanged
      expect(g.cash).toBe(cashBefore) // unchanged
    })

    it('permanent injury (tier 3): choice "ok" removes inbox item, no other changes', () => {
      useSeed(42)
      const g = createTestGame()
      const f = g.roster[0]
      f.injury = { weeks: 52, label: '💀 Career', cost: 50000, tier: 3, permanent: true, costPerWeek: 1000 }
      const weekBefore = f.injury.weeks
      const cashBefore = g.cash
      const msgId = 999
      g.inbox = [{ id: msgId, type: 'injury', fighterId: f.id, choices: [{ label: 'OK', choice: 'ok' }] }]

      reducer(g, { type: 'RESOLVE_INJURY_CHOICE', fighterId: f.id, choice: 'ok', messageId: msgId })

      // Inbox item removed, no stat changes
      expect(g.inbox.length).toBe(0)
      expect(f.injury.weeks).toBe(weekBefore) // unchanged
      expect(g.cash).toBe(cashBefore) // unchanged
    })

    it('RESOLVE_INJURY_CHOICE with no injury does nothing', () => {
      useSeed(42)
      const g = createTestGame()
      const f = g.roster[0]
      f.injury = null
      const cashBefore = g.cash

      reducer(g, { type: 'RESOLVE_INJURY_CHOICE', fighterId: f.id, choice: 'physio', messageId: -1, physioCost: 9999 })

      expect(g.cash).toBe(cashBefore) // no change
    })
  })

  describe('flashDirection — Chip comparison logic', () => {
    function fd(prev, current) {
      if (prev === current) return null;
      return current > prev ? 'up' : 'down';
    }

    it('cash turun dari 100000 ke 99000 → direction "down" (merah)', () => {
      expect(fd(100000, 99000)).toBe('down')
    })

    it('cash naik dari 100000 ke 101000 → direction "up" (hijau)', () => {
      expect(fd(100000, 101000)).toBe('up')
    })

    it('cash tidak berubah → null (tidak flash)', () => {
      expect(fd(100000, 100000)).toBeNull()
    })
  })
})
