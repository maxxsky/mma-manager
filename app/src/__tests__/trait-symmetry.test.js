// Trait symmetry — Warrior, Explosive and Cautious work for side B (the
// opponent) the same way they work for side A (the player).
import { describe, it, expect } from 'vitest'
import { createTestFighter } from './helpers.js'
import { simRound, runFight, prepFighter } from '@ironfist/engine/fight.js'
import { resolveStriking } from '@ironfist/engine/fight/resolve-striking.js'
import { explosiveMult } from '@ironfist/engine/fight/trait-effects.js'
import { setRNG, mulberry32 } from '@ironfist/engine/rng.js'

const ATTRS = { striking: 62, wrestling: 60, bjj: 58, cardio: 60, strength: 60, chin: 60, footwork: 58, fightIQ: 58 }
const fighter = (id, traits = [], archetype = 'Boxer') =>
  prepFighter(createTestFighter({ id, name: id, archetype, attrs: { ...ATTRS }, traits }))

const SIDE = { cornerA: 'neutral', cornerB: 'neutral', aggA: 1, aggB: 1, momMultA: 1, momMultB: 1 }
const NO_MATCHUP = {}

function strike(A, B, side, ptsA, ptsB, seed = 99) {
  setRNG(mulberry32(seed))
  return resolveStriking('strike', A, B, 80, 80, side, 1, 1, NO_MATCHUP, ptsA, ptsB, 0, 0, null, 0, 0)
}

describe('Warrior', () => {
  const A = fighter('A')
  const plainB = fighter('B')
  const warriorB = fighter('B', ['Warrior'])

  it('gives side B +15% damage while B is behind on points', () => {
    const base = strike(A, plainB, SIDE, 30, 10)
    const war = strike(A, warriorB, SIDE, 30, 10)
    expect(base.landB).toBeGreaterThan(0)
    expect(war.dmgA).toBeCloseTo(base.dmgA * 1.15, 6)
    expect(war.dmgB).toBe(base.dmgB)
  })

  it('gives no bonus while B is ahead', () => {
    expect(strike(A, warriorB, SIDE, 10, 30).dmgA).toBe(strike(A, plainB, SIDE, 10, 30).dmgA)
  })

  it('matches side A exactly', () => {
    // Swap sides: a Warrior on A behind on points gets the same multiplier.
    const base = strike(plainB, A, SIDE, 10, 30)
    const war = strike(warriorB, A, SIDE, 10, 30)
    expect(war.dmgB).toBeCloseTo(base.dmgB * 1.15, 6)
  })
})

describe('Explosive', () => {
  const A = fighter('A')
  const plainB = fighter('B')
  const expB = fighter('B', ['Explosive'])

  it('scales side B striking output in resolveStriking', () => {
    let base = 0, exp = 0
    for (let s = 1; s <= 200; s++) {
      base += strike(A, plainB, SIDE, 0, 0, s).landB
      exp += strike(A, expB, { ...SIDE, expMultB: explosiveMult(expB, 1) }, 0, 0, s).landB
    }
    expect(exp).toBeGreaterThan(base * 1.08)
  })

  // Lands summed over many seeded rounds; only B's trait differs.
  const landsB = (B, rnd) => {
    let sum = 0
    for (let s = 1; s <= 1500; s++) {
      setRNG(mulberry32(s * 7 + 1))
      sum += simRound(rnd, A, B, 90, 90, 'Balanced', 'neutral', 0, 0, 0, { planB: 'Balanced', cornerB: 'neutral' }).landB
    }
    return sum
  }

  it('makes side B stronger in round 1 and weaker in round 3', () => {
    expect(landsB(expB, 1)).toBeGreaterThan(landsB(plainB, 1))
    expect(landsB(expB, 3)).toBeLessThan(landsB(plainB, 3))
  })
})

describe('Cautious', () => {
  const ARCHS = ['Boxer', 'Muay Thai', 'Wrestler', 'BJJ Specialist', 'All-Rounder']

  // KO wins for each side over fixed seeds, identical fighters except traits.
  // KOs are rare (about 9% of fights), so the sample has to be large for a
  // 5% margin to sit outside the noise.
  function koCounts(traitsA, traitsB, perArch = 1000) {
    let koA = 0, koB = 0
    for (const arch of ARCHS) {
      const A = fighter('A', traitsA, arch)
      const B = fighter('B', traitsB, arch)
      for (let i = 0; i < perArch; i++) {
        const r = runFight(A, B, 'Balanced', () => 'neutral', 7919 * i + 31, 3,
          { planB: 'Balanced', cornerPolicyB: () => 'neutral' })
        if (r.how === 'KO/TKO') r.winner === 'A' ? koA++ : koB++
      }
    }
    return { koA, koB }
  }

  const none = koCounts([], [])
  const cautA = koCounts(['Cautious'], [])
  const cautB = koCounts([], ['Cautious'])

  it('lowers KO wins for whichever side has it', () => {
    expect(cautA.koA).toBeLessThan(none.koA * 0.95)
    expect(cautB.koB).toBeLessThan(none.koB * 0.95)
  })

  it('does not protect its owner from being knocked out', () => {
    expect(cautA.koB).toBeGreaterThan(none.koB * 0.95)
    expect(cautB.koA).toBeGreaterThan(none.koA * 0.95)
  })
})
