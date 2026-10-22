import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveGame, loadGame, getSlotInfo } from '../services/saveService.js'
import { getWorldRNGState, restoreWorldRNGState, resetRNG, random, uid, setRNG, mulberry32 } from '@ironfist/engine/rng.js'
import { newGame, tick } from '@ironfist/engine/state.js'
import { runFight } from '@ironfist/engine/fight.js'
import { createTestFighter } from './helpers.js'

let store
beforeEach(() => {
  store = new Map()
  vi.stubGlobal('localStorage', {
    getItem: key => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
  })
  restoreWorldRNGState({ state: 1234, nextUID: 1 })
  resetRNG()
})
afterEach(() => { vi.unstubAllGlobals(); resetRNG() })

const draws = () => Array.from({ length: 20 }, () => ({ roll: random(), id: uid() }))

describe('world RNG persistence', () => {
  it('resumes at the saved position, including IDs, after another session runs', () => {
    const g = newGame()
    for (let i = 0; i < 4; i++) tick(g)
    expect(saveGame(1, g)).toBe(true)
    const expected = draws()
    restoreWorldRNGState({ state: 999, nextUID: 9000 })
    resetRNG()
    draws()
    loadGame(1)
    expect(draws()).toEqual(expected)
    loadGame(1)
    expect(draws()).toEqual(expected)
  })

  it('replays twelve full weeks exactly after loading the checkpoint', () => {
    const g = newGame()
    for (let i = 0; i < 5; i++) tick(g)
    saveGame(1, g)
    for (let i = 0; i < 12; i++) tick(g)
    const expectedRng = getWorldRNGState()
    const loaded = loadGame(1)
    for (let i = 0; i < 12; i++) tick(loaded)
    // Stored checkpoint metadata describes the save boundary, not these ticks.
    const { worldRngState, ...actual } = loaded
    expect(actual).toEqual(g)
    expect(getWorldRNGState()).toEqual(expectedRng)
  })

  it('records world RNG while a seeded fight is active without interrupting it', () => {
    const world = getWorldRNGState()
    const expectedFight = mulberry32(77)
    setRNG(mulberry32(77))
    expect(random()).toBe(expectedFight())
    saveGame(1, { week: 1 })
    expect(random()).toBe(expectedFight())
    expect(JSON.parse(store.get('mma-manager-save-v4-slot1')).worldRngState).toEqual(world)
    runFight(createTestFighter(), createTestFighter({ id: 2 }), 'Balanced', () => 'neutral', 444, 3)
    resetRNG()
    expect(getWorldRNGState()).toEqual(world)
    loadGame(1)
    expect(random()).toBe(mulberry32(world.state)())
  })

  it('keeps a queued autosave checkpoint even when global RNG has moved on', () => {
    const g = newGame()
    const checkpoint = getWorldRNGState()
    const expected = draws()
    saveGame(1, g, checkpoint)
    loadGame(1)
    expect(draws()).toEqual(expected)
  })

  it('keeps separate RNG checkpoints for separate slots and metadata reads', () => {
    saveGame(1, { week: 1 })
    const one = draws()
    saveGame(2, { week: 2 })
    const two = draws()
    const beforeInfo = getWorldRNGState()
    getSlotInfo()
    expect(getWorldRNGState()).toEqual(beforeInfo)
    loadGame(1)
    expect(draws()).toEqual(one)
    loadGame(2)
    expect(draws()).toEqual(two)
  })

  it('migrates old saves deterministically and allocates IDs above existing data', () => {
    const legacy = { week: 12, roster: [{ id: 50 }], inbox: [{ id: 250 }] }
    store.set('mma-manager-save-v4-slot1', JSON.stringify(legacy))
    const loaded = loadGame(1)
    expect(loaded.week).toBe(12)
    expect(loaded.worldRngState.nextUID).toBe(251)
    const expected = draws()
    restoreWorldRNGState({ state: 900, nextUID: 1000 })
    loadGame(1)
    expect(draws()).toEqual(expected)
    saveGame(1, loaded)
    expect(JSON.parse(store.get('mma-manager-save-v4-slot1')).worldRngState).toEqual(getWorldRNGState())
  })

  it('supports seed zero and repairs invalid RNG metadata without breaking saves', () => {
    expect(restoreWorldRNGState({ state: 0, nextUID: 1 })).toBe(true)
    resetRNG()
    expect(random()).toBe(mulberry32(0)())
    const before = getWorldRNGState()
    expect(restoreWorldRNGState({ state: -1, nextUID: 1 })).toBe(false)
    expect(getWorldRNGState()).toEqual(before)
    store.set('mma-manager-save-v4-slot1', JSON.stringify({ week: 9, worldRngState: { state: 'bad' } }))
    expect(loadGame(1).week).toBe(9)
    expect(random()).toBeGreaterThanOrEqual(0)
  })
})
