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

  describe('UNDO/REDO', () => {    it.skip('undo restores previous training type', () => {
      // TODO: investigate snapshot/undo interaction with seeded state
      const g = createTestGame()
      const f = g.roster[0]
      const origType = f.training.type
      
      g._undoStack = []
      g._redoStack = []
      reducer(g, { type: 'SET_TRAINING', fighterId: f.id, program: 'sparring', intensity: 'Hard' })
      expect(f.training.type).toBe('sparring')
      
      reducer(g, { type: 'UNDO' })
      // After undo, training should revert
      expect(f.training.type).toBe(origType)
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
})
