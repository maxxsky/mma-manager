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

it('repairs a legacy lower-tier champion through the actual load hook', () => {
  const legacy = newGame()
  const f = legacy.roster[0]
  const div = legacy.divisions[f.weightClass]
  delete div.tierChamps
  f.titles = ['National Champion']
  div.champ = { name: f.name, player: true, fighterId: f.id, wonWeek: 1 }
  localStorage.setItem('mma-manager-save-v4-slot1', JSON.stringify(legacy))
  const loaded = loadWithMigrations()
  const migrated = loaded.divisions[f.weightClass]
  expect(migrated.champ).toBeNull()
  expect(migrated.tierChamps.National.fighterId).toBe(f.id)
  expect(loaded.roster[0].titles).toEqual(['National Champion'])
})

it('hydrates world profiles once through the load hook and keeps accepted fight attributes', () => {
  const legacy = newGame()
  const f = legacy.roster[0]
  const target = legacy.divisions[f.weightClass].list[2]
  delete target.attrs; delete target.traits
  f.booked = { seed: 42, contenderId: target.id, opponent: {
    ...structuredClone(f), id: target.id, name: target.name, booked: null,
  } }
  localStorage.setItem('mma-manager-save-v4-slot1', JSON.stringify(legacy))
  const loaded = loadWithMigrations()
  const actual = loaded.divisions[f.weightClass].list.find(c => c.id === target.id)
  expect(actual.attrs).toEqual(f.attrs)
  expect(actual.archetype).toBe(f.archetype)
  localStorage.setItem('mma-manager-save-v4-slot1', JSON.stringify(loaded))
  expect(loadWithMigrations()).toEqual(loaded)
})
