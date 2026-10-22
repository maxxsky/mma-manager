import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameState } from '../hooks/useGameState.js'
import { saveGame } from '../services/saveService.js'
import { createTestGame, createTestFighter } from './helpers.js'
import { MAX_UNDO_STACK } from '@ironfist/engine/reducer/constants.js'
import { getWorldRNGState, restoreWorldRNGState, resetRNG, random, uid } from '@ironfist/engine/rng.js'

vi.mock('../services/saveService.js', () => ({ saveGame: vi.fn() }))

function mount() {
  let state = createTestGame()
  let hook
  function Probe() {
    hook = useGameState(state, update => { state = update(state) }, 2)
    return null
  }
  renderToStaticMarkup(React.createElement(Probe))
  return { hook, state: () => state, train: program => hook.dispatch({
    type: 'SET_TRAINING', fighterId: state.roster[0].id, program, intensity: 'Hard',
  }) }
}

beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks() })
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers() })

describe('useGameState undo/redo through actual dispatch', () => {
  it('persists an S-grade signing achievement and restores it with undo/redo', () => {
    const app = mount()
    app.state().prospects = [{ id: 's-prospect', grade: 'S', fighter: createTestFighter({ id: 'signed-fighter' }) }]
    app.hook.dispatch({ type: 'SIGN_CONTRACT', mode: 'sign', prospectId: 's-prospect',
      deal: { signBonus: 1000, cut: 0.2, fights: 4, duration: 12 } })
    expect(app.state()._unlocked).toContain('sign_s_prospect')
    app.hook.dispatch({ type: 'UNDO' })
    expect(app.state()._unlocked || []).not.toContain('sign_s_prospect')
    app.hook.dispatch({ type: 'REDO' })
    expect(app.state()._unlocked).toContain('sign_s_prospect')
    vi.advanceTimersByTime(1000)
    expect(saveGame.mock.calls[0][1]._unlocked).toContain('sign_s_prospect')
  })
  it('walks back multiple actions, then reapplies them with redo', () => {
    const app = mount()
    const before = app.state().roster[0].training.type
    app.train('grappling')
    app.train('sparring')
    app.hook.dispatch({ type: 'UNDO' })
    expect(app.state().roster[0].training.type).toBe('grappling')
    app.hook.dispatch({ type: 'UNDO' })
    expect(app.state().roster[0].training.type).toBe(before)
    app.hook.dispatch({ type: 'REDO' })
    app.hook.dispatch({ type: 'REDO' })
    expect(app.state().roster[0].training.type).toBe('sparring')
  })

  it('does not mutate previous React state or stored snapshots on undo', () => {
    const app = mount()
    app.train('grappling')
    app.train('sparring')
    const old = app.state()
    const serialized = JSON.stringify(old)
    app.hook.dispatch({ type: 'UNDO' })
    app.hook.up(n => { n.roster[0].morale = 1 })
    expect(JSON.stringify(old)).toBe(serialized)
    expect(app.state()._redoStack).toHaveLength(1)
  })

  it('invalidates redo on a new action and bounds history', () => {
    const app = mount()
    app.train('grappling')
    app.hook.dispatch({ type: 'UNDO' })
    app.train('sparring')
    app.hook.dispatch({ type: 'REDO' })
    expect(app.state().roster[0].training.type).toBe('sparring')
    expect(app.state()._redoStack).toHaveLength(0)
    for (let i = 0; i < 25; i++) app.train(i % 2 ? 'grappling' : 'sparring')
    expect(app.state()._undoStack).toHaveLength(MAX_UNDO_STACK)
    expect(app.state()._undoStack[0].snapshot._undoStack).toBeUndefined()
  })

  it('autosaves the latest undo result to the selected slot', () => {
    const app = mount()
    app.train('grappling')
    app.train('sparring')
    app.hook.dispatch({ type: 'UNDO' })
    vi.advanceTimersByTime(1000)
    expect(saveGame).toHaveBeenCalledTimes(1)
    expect(saveGame).toHaveBeenCalledWith(2, app.state(), app.state().worldRngState)
    expect(saveGame.mock.calls[0][1].roster[0].training.type).toBe('grappling')
  })

  it('captures world RNG before the autosave delay and restores it with undo/redo', () => {
    const app = mount()
    restoreWorldRNGState({ state: 789, nextUID: 3000 })
    resetRNG()
    app.train('grappling')
    const first = getWorldRNGState()
    app.hook.up(n => { n.roll = random(); n.generatedId = uid() })
    app.train('sparring')
    const second = getWorldRNGState()
    app.hook.dispatch({ type: 'UNDO' })
    expect(getWorldRNGState()).toEqual(second)
    app.hook.dispatch({ type: 'UNDO' })
    expect(getWorldRNGState()).toEqual(first)
    app.hook.dispatch({ type: 'REDO' })
    expect(getWorldRNGState()).toEqual(second)
    random()
    vi.advanceTimersByTime(1000)
    expect(saveGame.mock.calls[0][2]).toEqual(second)
    expect(getWorldRNGState()).not.toEqual(second)
  })
})
