// Systems removed because they never did anything (P2 decisions).
import { describe, it, expect } from 'vitest'
import { setRNG, mulberry32, resetRNG } from '@ironfist/engine/rng.js'
import { newGame, tick } from '@ironfist/engine/state.js'
import * as engine from '@ironfist/engine/index.js'

describe('P2 #28 — fighter-to-fighter relationships removed', () => {
  it('new games carry no relationships map and the engine exports no relationship helpers', () => {
    setRNG(mulberry32(3))
    const g = newGame()
    for (let i = 0; i < 12; i++) tick(g)
    resetRNG()
    expect(g.relationships).toBeUndefined()
    expect(engine.addRel).toBeUndefined()
    expect(engine.getRel).toBeUndefined()
  })
})

describe('P2 #34 — passive mentor training bonus removed', () => {
  it('career.js no longer exports a mentor multiplier', async () => {
    const career = await import('@ironfist/engine/career.js')
    expect(career.calcMentorBonus).toBeUndefined()
  })
})

describe('P2 #37 — legacy SET_SPONSOR removed', () => {
  it('the action no longer writes the old single-sponsor field', async () => {
    const { reducer } = await import('@ironfist/engine/reducer.js')
    setRNG(mulberry32(4))
    const g = newGame()
    resetRNG()
    reducer(g, { type: 'SET_SPONSOR', brand: 'Anything', rate: 999 })
    expect(g.sponsor).toBeUndefined()
  })
})
