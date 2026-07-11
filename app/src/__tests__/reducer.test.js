// Reducer Tests — state mutation correctness
import { describe, it, expect } from 'vitest'
import { createTestGame, useSeed, createTestFighter } from './helpers.js'
import { reducer } from '../engine/reducer.js'

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
})
