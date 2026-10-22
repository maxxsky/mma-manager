// P3 #41 (FI1): Hard is worth it as a short burst, not as a permanent setting.
import { describe, it, expect, afterEach } from 'vitest'
import { setRNG, mulberry32, resetRNG } from '@ironfist/engine/rng.js'
import { newGame } from '@ironfist/engine/state.js'
import { tickTraining } from '@ironfist/engine/tick/training.js'
import { ATTRS } from '@ironfist/engine/data.js'

afterEach(() => resetRNG())

function run(intensity, weeks, seeds = 120) {
  let gain = 0, injuries = 0
  for (let seed = 1; seed <= seeds; seed++) {
    setRNG(mulberry32(seed * 7919 + 3))
    const g = newGame(); g.cash = 1e8
    const f = g.roster[0]; g.roster = [f]
    Object.assign(f, { age: 24, injury: null, overtraining: 0, morale: 65, traits: [], training: { type: 'sparring', intensity } })
    ATTRS.forEach((k) => { f.attrs[k] = 40; f.ceilings[k] = 90 })
    const start = ATTRS.reduce((s, k) => s + f.attrs[k], 0)
    let was = false
    for (let w = 0; w < weeks; w++) { g.week = w + 1; tickTraining(g); if (f.injury && !was) injuries++; was = !!f.injury; g.inbox = [] }
    gain += ATTRS.reduce((s, k) => s + f.attrs[k], 0) - start
  }
  return { gain: gain / seeds, injuries: injuries / seeds }
}

describe('training intensity', () => {
  it('12-week Hard camp beats Medium clearly, at a moderate injury cost', () => {
    const med = run('Medium', 12), hard = run('Hard', 12)
    expect(hard.gain / med.gain).toBeGreaterThan(1.25)
    expect(hard.injuries / Math.max(med.injuries, 0.01)).toBeLessThan(2.5)
  })

  it('Hard held for a year without a break falls behind Medium', () => {
    const med = run('Medium', 48, 80), hard = run('Hard', 48, 80)
    expect(hard.gain).toBeLessThan(med.gain)
    expect(hard.injuries).toBeGreaterThan(med.injuries * 3)
  })
})
