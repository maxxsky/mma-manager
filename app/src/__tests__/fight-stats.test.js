// Fight statistics — checks who wins, not just that a winner exists.
// side-symmetry.test.js covers identical fighters with identical choices.
// This file covers different fighters with AI choices on both sides, and
// decisions across archetypes and fight lengths. tools/fight-balance.mjs runs
// the same checks with far more fights in CI.
import { describe, it, expect } from 'vitest'
import { runFight, prepFighter, autoGamePlan, aiCorner } from '@ironfist/engine/fight.js'
import { mulberry32 } from '@ironfist/engine/rng.js'
import { ATTRS } from '@ironfist/engine/data/attributes.js'
import { ARCHETYPES } from '@ironfist/engine/data/archetypes.js'

const ARCHS = Object.keys(ARCHETYPES)

// Fighter of one archetype with OVR (mean of the eight attributes) at `ovr`.
function buildFighter(id, archetype, ovr, rng) {
  const mult = ARCHETYPES[archetype]
  const raw = {}
  for (const k of ATTRS) raw[k] = (ovr + (rng() * 2 - 1) * 8) * (mult[k] ?? 1)
  const mean = ATTRS.reduce((s, k) => s + raw[k], 0) / ATTRS.length
  const attrs = {}
  for (const k of ATTRS) attrs[k] = Math.max(15, Math.min(95, Math.round(raw[k] + ovr - mean)))
  return prepFighter({ id, name: id, archetype, age: 26, morale: 60, traits: [], attrs })
}

// AI plan and corner on both sides. runFight forces "go" for A in round 1,
// so B does the same (removing that is P0 #5).
function aiFight(A, B, seed, totalRounds = 3) {
  const planA = autoGamePlan(A, B)
  const planB = autoGamePlan(B, A)
  const policyA = (_res, r, st) => aiCorner({
    rnd: r, totalRounds, staOwn: st.staA, staOpp: st.staB,
    cutOwn: st.cutA, cutOpp: st.cutB, momOwn: st.momentum, plan: planA,
  })
  const policyB = (_res, r, st) => r === 1 ? 'go' : aiCorner({
    rnd: r, totalRounds, staOwn: st.staB, staOpp: st.staA,
    cutOwn: st.cutB, cutOpp: st.cutA, momOwn: -st.momentum, plan: planB,
  })
  return runFight(A, B, planA, policyA, seed, totalRounds, { planB, cornerPolicyB: policyB })
}

describe('side swap: the same fighter wins about as often from either side', () => {
  const pairs = [
    ['Muay Thai', 'BJJ Specialist'],
    ['Boxer', 'Wrestler'],
    ['Wrestler', 'All-Rounder'],
  ]
  for (const [X, Y] of pairs) {
    it(`${X} vs ${Y}`, () => {
      let asA = 0, asB = 0
      const n = 1200
      for (let i = 0; i < n; i++) {
        const rng = mulberry32(3301 + i)
        const ovr = [50, 65, 80][i % 3]
        const fx = buildFighter('X', X, ovr, rng)
        const fy = buildFighter('Y', Y, ovr, rng)
        const seed = 7919 * i + 17
        if (aiFight(fx, fy, seed).winner === 'A') asA++
        if (aiFight(fy, fx, seed).winner === 'B') asB++
      }
      expect(Math.abs(asA - asB) / n).toBeLessThan(0.06)
    })
  }

  it('side A wins about half of all fights between different archetypes', () => {
    let winsA = 0, total = 0
    for (let xi = 0; xi < ARCHS.length; xi++) {
      for (let yi = 0; yi < ARCHS.length; yi++) {
        if (xi === yi) continue
        for (let i = 0; i < 200; i++) {
          const rng = mulberry32(1000 * xi + 100 * yi + i)
          const A = buildFighter('A', ARCHS[xi], 65, rng)
          const B = buildFighter('B', ARCHS[yi], 65, rng)
          if (aiFight(A, B, 104729 * i + xi * 31 + yi).winner === 'A') winsA++
          total++
        }
      }
    }
    const share = winsA / total
    expect(share).toBeGreaterThan(0.47)
    expect(share).toBeLessThan(0.53)
  })

  it.todo('identical fighters with Warrior, Explosive or Cautious win about half from either side (P0 #3)')
})

describe('decisions follow the rounds across archetypes and fight lengths', () => {
  for (const totalRounds of [3, 5]) {
    it(`${totalRounds} rounds: the winner only won fewer rounds when a 10-8 round evened the card`, () => {
      let decisions = 0, fewer = 0
      for (let i = 0; i < 1500; i++) {
        const rng = mulberry32(55001 + i)
        const A = buildFighter('A', ARCHS[i % ARCHS.length], 65, rng)
        const B = buildFighter('B', ARCHS[(i * 3 + 1) % ARCHS.length], 65, rng)
        const r = aiFight(A, B, 6151 * i + 7, totalRounds)
        if (r.how !== 'Decision') continue
        decisions++
        const rounds = r.scorecard.rounds
        const won = rounds.filter((x) => x.winner === r.winner).length
        const lost = rounds.filter((x) => x.winner !== 'draw' && x.winner !== r.winner).length
        if (lost > won) {
          fewer++
          expect(rounds.some((x) => x.a === 8 || x.b === 8)).toBe(true)
        }
      }
      expect(decisions).toBeGreaterThan(300)
      expect(fewer / decisions).toBeLessThan(0.03)
    })
  }
})
