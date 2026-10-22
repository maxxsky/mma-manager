// Corner trade-offs (P0 #5). Every corner instruction must give something and
// cost something, "Work the body" must do something, round 1 is not forced to
// "go", and no fixed corner is best in every situation.
import { describe, it, expect } from 'vitest'
import { runFight, simRound, prepFighter, autoGamePlan } from '@ironfist/engine/fight.js'
import { CORNER_EFFECTS, CORNER_BODY_STA_PER_LAND } from '@ironfist/engine/fight/config.js'
import { setRNG, mulberry32 } from '@ironfist/engine/rng.js'
import { ATTRS } from '@ironfist/engine/data/attributes.js'
import { ARCHETYPES } from '@ironfist/engine/data/archetypes.js'

const ARCHS = Object.keys(ARCHETYPES)

// Fighter of one archetype whose OVR is the target; `over` sets attributes after.
function build(id, arch, ovr, rng, over = {}) {
  const mult = ARCHETYPES[arch]
  const raw = {}
  for (const k of ATTRS) raw[k] = (ovr + (rng() * 2 - 1) * 8) * (mult[k] ?? 1)
  const mean = ATTRS.reduce((s, k) => s + raw[k], 0) / ATTRS.length
  const attrs = {}
  for (const k of ATTRS) attrs[k] = Math.max(15, Math.min(95, Math.round(raw[k] + ovr - mean)))
  Object.assign(attrs, over)
  return prepFighter({ id, name: id, archetype: arch, age: 26, morale: 60, traits: [], attrs })
}

// Side A uses one corner every round; side B is the AI (plan and corner).
function fixedCornerWinRate(corner, { rounds = 3, overA = {}, overB = {}, n = 1500 } = {}) {
  let wins = 0
  for (let i = 0; i < n; i++) {
    const rng = mulberry32(31337 + i)
    const A = build('A', ARCHS[i % 5], 65, rng, overA)
    const B = build('B', ARCHS[(i * 3 + 1) % 5], 65, rng, overB)
    const r = runFight(A, B, autoGamePlan(A, B), () => corner, 7919 * i + 5, rounds)
    if (r.winner === 'A') wins++
  }
  return wins / n
}

describe('corner effects table', () => {
  // Higher is better for out and kd; lower is better for exposed and drain.
  const gains = (e) => [e.out > 1, e.kd > 1, e.exposed < 1, e.drain < 1]
  const costs = (e) => [e.out < 1, e.kd < 1, e.exposed > 1, e.drain > 1]

  for (const [k, e] of Object.entries(CORNER_EFFECTS)) {
    if (k === 'neutral') continue
    it(`${k} has a cost and a benefit`, () => {
      expect(costs(e).some(Boolean)).toBe(true)
      // "Work the body" pays off through the opponent's stamina, not the table.
      const bodyGain = k === 'body' && CORNER_BODY_STA_PER_LAND > 0
      expect(gains(e).some(Boolean) || bodyGain).toBe(true)
    })
  }

  it('neutral changes nothing', () => {
    expect(CORNER_EFFECTS.neutral).toEqual({ out: 1, exposed: 1, drain: 1, kd: 1 })
  })
})

describe('round 1', () => {
  it('runFight asks the corner policy for round 1 too', () => {
    const asked = []
    const rng = mulberry32(5)
    const A = build('A', 'Boxer', 60, rng), B = build('B', 'Boxer', 60, rng)
    runFight(A, B, 'Balanced', (_r, rnd) => { asked.push(rnd); return 'neutral' }, 99, 3)
    expect(asked[0]).toBe(1)
  })

  it('a round 1 "save" really saves stamina (it used to be overridden by "go")', () => {
    let staSave = 0, staGo = 0
    for (let i = 0; i < 200; i++) {
      const rng = mulberry32(100 + i)
      const A = build('A', 'All-Rounder', 65, rng), B = build('B', 'All-Rounder', 65, rng)
      staSave += runFight(A, B, 'Balanced', () => 'save', 17 * i + 3, 3).roundLogs[0].staA
      staGo += runFight(A, B, 'Balanced', () => 'go', 17 * i + 3, 3).roundLogs[0].staA
    }
    expect(staSave).toBeGreaterThan(staGo)
  })
})

describe('"Work the body"', () => {
  const rng = mulberry32(77)
  const A = build('A', 'All-Rounder', 65, rng)
  const B = build('B', 'All-Rounder', 65, rng)

  it('takes extra stamina from the opponent in the same round', () => {
    let staBody = 0, staNeutral = 0
    for (let s = 1; s <= 200; s++) {
      setRNG(mulberry32(s))
      staBody += simRound(1, A, B, 100, 100, 'Balanced', 'body', 0, 0, 0, { planB: 'Balanced', cornerB: 'neutral' }).staB
      setRNG(mulberry32(s))
      staNeutral += simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0, 0, 0, { planB: 'Balanced', cornerB: 'neutral' }).staB
    }
    // About 7 stamina per round at OVR 65.
    expect((staNeutral - staBody) / 200).toBeGreaterThan(4)
  })

  it('pays off later: the opponent starts round 3 with less stamina', () => {
    let staBody = 0, staNeutral = 0, n = 0
    for (let i = 0; i < 300; i++) {
      const body = runFight(A, B, 'Balanced', (_r, rnd) => (rnd <= 2 ? 'body' : 'neutral'), 31 * i + 1, 3, { planB: 'Balanced', cornerPolicyB: () => 'neutral' })
      const base = runFight(A, B, 'Balanced', () => 'neutral', 31 * i + 1, 3, { planB: 'Balanced', cornerPolicyB: () => 'neutral' })
      if (body.roundLogs.length < 3 || base.roundLogs.length < 3) continue
      staBody += body.roundLogs[1].staB
      staNeutral += base.roundLogs[1].staB
      n++
    }
    expect(n).toBeGreaterThan(100)
    // About 8-9 stamina after two rounds of body work at OVR 65.
    expect((staNeutral - staBody) / n).toBeGreaterThan(6)
  })

  it('costs output in the round it is used', () => {
    let landBody = 0, landNeutral = 0
    for (let s = 1; s <= 200; s++) {
      setRNG(mulberry32(s))
      landBody += simRound(1, A, B, 100, 100, 'Balanced', 'body', 0, 0, 0, { planB: 'Balanced', cornerB: 'neutral' }).landA
      setRNG(mulberry32(s))
      landNeutral += simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0, 0, 0, { planB: 'Balanced', cornerB: 'neutral' }).landA
    }
    expect(landBody).toBeLessThan(landNeutral)
  })
})

describe('"go" opens your guard', () => {
  it('the opponent lands more on a fighter who pushes the pace', () => {
    const rng = mulberry32(88)
    const A = build('A', 'Boxer', 65, rng), B = build('B', 'Boxer', 65, rng)
    let landGo = 0, landNeutral = 0
    for (let s = 1; s <= 200; s++) {
      setRNG(mulberry32(s))
      landGo += simRound(1, A, B, 100, 100, 'Balanced', 'go', 0, 0, 0, { planB: 'Balanced', cornerB: 'neutral' }).landB
      setRNG(mulberry32(s))
      landNeutral += simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0, 0, 0, { planB: 'Balanced', cornerB: 'neutral' }).landB
    }
    expect(landGo).toBeGreaterThan(landNeutral)
  })
})

// The same corner every round, side B is the AI. Before P0 #5, "go" was best
// in every one of these situations and "body" equalled "neutral".
describe('no fixed corner is best everywhere', () => {
  it('a low-cardio fighter does better saving gas than pushing the pace', () => {
    const opts = { overA: { cardio: 35 }, overB: { cardio: 80 } }
    expect(fixedCornerWinRate('save', opts)).toBeGreaterThan(fixedCornerWinRate('go', opts) + 0.05)
  })

  it('body work wins more 5-round fights than no instruction', () => {
    expect(fixedCornerWinRate('body', { rounds: 5 })).toBeGreaterThan(fixedCornerWinRate('neutral', { rounds: 5 }) + 0.03)
  })

  it('body work does not pay against a high-cardio opponent in 3 rounds', () => {
    const opts = { overA: { cardio: 35 }, overB: { cardio: 80 } }
    expect(fixedCornerWinRate('body', opts)).toBeLessThan(fixedCornerWinRate('neutral', opts))
  })

  it('pushing the pace every round is not better than no instruction', () => {
    expect(fixedCornerWinRate('go')).toBeLessThanOrEqual(fixedCornerWinRate('neutral'))
  })
})
