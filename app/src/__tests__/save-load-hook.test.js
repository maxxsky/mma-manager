import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useSaveLoad } from '../hooks/useSaveLoad.js'
import { newGame, tick } from '@ironfist/engine/state.js'
import { getWorldRNGState, restoreWorldRNGState, resetRNG } from '@ironfist/engine/rng.js'

// Run the hook's mount effect after rendering, without a browser or a DOM.
const { effects } = vi.hoisted(() => ({ effects: [] }))
vi.mock('react', async importOriginal => ({
  ...await importOriginal(), useEffect: effect => { effects.push(effect) },
}))

beforeEach(() => {
  const storage = new Map()
  vi.stubGlobal('localStorage', {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
  })
  effects.length = 0
  restoreWorldRNGState({ state: 9876, nextUID: 1 })
  resetRNG()
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); resetRNG() })

function loadWithMigrations() {
  let state
  function Probe() { useSaveLoad(value => { state = value }); return null }
  renderToStaticMarkup(React.createElement(Probe))
  effects.splice(0).forEach(effect => effect())
  return state
}

it('repeats old-save migrations and subsequent weeks identically across reloads', () => {
  const legacy = newGame()
  delete legacy.divisions
  delete legacy.rivals
  delete legacy.roster[0].ambition
  delete legacy.roster[0].ceilings
  legacy.roster[0].booked = { seed: null, weeksLeft: 4 }
  localStorage.setItem('mma-manager-save-v4-slot1', JSON.stringify(legacy))
  vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Unseeded migration roll') })

  const first = loadWithMigrations()
  expect(first.roster[0].booked.seed).toBeTypeOf('number')
  expect(first.roster[0].ceilings).toBeDefined()
  const migrated = JSON.stringify(first)
  for (let i = 0; i < 4; i++) tick(first)
  const rngAfter = getWorldRNGState()

  restoreWorldRNGState({ state: 555, nextUID: 9999 })
  const second = loadWithMigrations()
  expect(JSON.stringify(second)).toBe(migrated)
  for (let i = 0; i < 4; i++) tick(second)
  expect(second).toEqual(first)
  expect(getWorldRNGState()).toEqual(rngAfter)
})
