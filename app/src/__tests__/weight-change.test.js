// P1 #23 (FI7): moving up a class needs a real win streak, not total wins.
import { describe, it, expect, afterEach } from 'vitest'
import { setRNG, resetRNG } from '@ironfist/engine/rng.js'
import { tickWeightChange } from '@ironfist/engine/tick/weight-change.js'
import { createTestGame } from './helpers.js'

afterEach(() => resetRNG())

function setup({ w, streakW, streakL = 0 }) {
  const g = createTestGame()
  g.week = 48 * 3
  g.inbox = []
  const f = g.roster[0]
  g.roster = [f]
  Object.assign(f, {
    weightClass: 'Lightweight', injury: null, booked: null, lastClassChange: null,
    age: 27, ambition: 'Belt Chaser', titles: [], rankPoints: 0,
    record: { w, l: 5, ko: 0, sub: 0, dec: w }, streakW, streakL,
  })
  setRNG(() => 0) // any non-zero chance passes
  tickWeightChange(g)
  return g.inbox.filter((m) => m.classChange)
}

describe('weight class move-up trigger', () => {
  it('10-5 fighter who only just won once does not ask to move up', () => {
    expect(setup({ w: 10, streakW: 1 })).toHaveLength(0)
  })

  it('a real 4-fight win streak does trigger the request, with the streak in the reason', () => {
    const [m] = setup({ w: 10, streakW: 4 })
    expect(m).toBeDefined()
    expect(m.classChange.isUp).toBe(true)
    expect(m.body).toContain('4 kemenangan beruntun')
  })

  it('a save without streakW is treated as no streak', () => {
    expect(setup({ w: 12, streakW: undefined })).toHaveLength(0)
  })
})
