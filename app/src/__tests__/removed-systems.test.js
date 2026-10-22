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
