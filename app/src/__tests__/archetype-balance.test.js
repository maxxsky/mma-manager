import { describe, it, expect } from 'vitest'
import { genFighter, avgSkill } from '@ironfist/engine/fighter.js'
import { effAttr } from '@ironfist/engine/fight.js'
import { ATTRS } from '@ironfist/engine/data/attributes.js'
import { setRNG, mulberry32 } from '@ironfist/engine/rng.js'
import { resolveClinch } from '@ironfist/engine/fight/resolve-clinch.js'
import { resolveTakedown } from '@ironfist/engine/fight/resolve-takedown.js'
import { resolveGround } from '@ironfist/engine/fight/resolve-ground.js'
import { pickExchange } from '@ironfist/engine/fight/exchanges.js'
import { OVR } from '../ui/theme.jsx'

const fighter = (archetype = 'Boxer', overrides = {}) => ({
  name: archetype, archetype, age: 26, morale: 60, traits: [],
  attrs: { ...Object.fromEntries(ATTRS.map(k => [k, 60])), ...overrides },
})
const A = fighter(), B = fighter()
const comm = { both() {}, bothS() {}, tickOnly() {} }
const side = { aggA: 1, aggB: 1, exposedA: 1, exposedB: 1 }
const seed = (n = 123) => setRNG(mulberry32(n))
const ground = (type, top, mods = {}, fA = A, fB = B) => {
  seed()
  return resolveGround(type, fA, fB, 100, 100, { type: 'halfGuard', top },
    mods, 0, 0, 999, comm, 0, 0)
}

describe('archetype generation and OVR', () => {
  it('generates only the eight real attributes, including Muay Thai fighters', () => {
    seed()
    let thais = 0
    for (let i = 0; i < 200; i++) {
      const f = genFighter(0.9, 'Netherlands')
      thais += Number(f.archetype === 'Muay Thai')
      expect(Object.keys(f.attrs).sort()).toEqual([...ATTRS].sort())
      expect(Object.values(f.attrs).every(Number.isFinite)).toBe(true)
    }
    expect(thais).toBeGreaterThan(0)
  })

  it('shows the engine OVR for old saves containing the spurious clinch attribute', () => {
    const old = fighter('Muay Thai', { clinch: 15 })
    expect(OVR({ f: old }).props.v).toBe(avgSkill(old))
    expect(OVR({ f: old }).props.v).toBe(60)
  })

  it('applies All-Rounder adaptation in combat without changing saved attributes', () => {
    const f = fighter('All-Rounder')
    expect(effAttr(f, 'striking', 100)).toBeCloseTo(60 * 1.055)
    expect(effAttr(f, 'wrestling', 100)).toBeCloseTo(60 * 1.055)
    expect(f.attrs.striking).toBe(60)
    expect(avgSkill(f)).toBe(60)
  })
})

describe('clinch volume and defense', () => {
  it('keeps damage near open striking while preserving Muay Thai advantage', () => {
    let normal = 0, thai = 0, defended = 0
    for (let i = 1; i <= 500; i++) {
      seed(i)
      normal += resolveClinch('clinch', A, B, 100, 100, side, {}, comm, 0, 0).dmgB
      seed(i)
      thai += resolveClinch('clinch', fighter('Muay Thai'), B, 100, 100, side, {}, comm, 0, 0).dmgB
      seed(i)
      defended += resolveClinch('clinch', A, fighter('Boxer', { wrestling: 90, strength: 90 }), 100, 100, side, {}, comm, 0, 0).dmgB
    }
    expect(normal / 500).toBeGreaterThan(2)
    expect(thai / 500).toBeLessThan(12)
    expect(thai).toBeGreaterThan(normal)
    expect(defended).toBeLessThan(normal)
  })
})

describe('Keep It Standing works on either side', () => {
  for (const defender of ['A', 'B']) {
    it(`improves ${defender}'s takedown defense`, () => {
      let balanced = 0, standing = 0
      for (let i = 1; i <= 1000; i++) {
        const type = defender === 'A' ? 'tdB' : 'td'
        seed(i)
        balanced += Number(Boolean(resolveTakedown(type, A, B, 100, 100,
          { planA: 'Balanced', planB: 'Balanced' }, {}, comm, 0, 0).newPosition))
        seed(i)
        standing += Number(Boolean(resolveTakedown(type, A, B, 100, 100,
          { planA: defender === 'A' ? 'Keep It Standing' : 'Balanced',
            planB: defender === 'B' ? 'Keep It Standing' : 'Balanced' }, {}, comm, 0, 0).newPosition))
      }
      expect(standing).toBeLessThan(balanced - 50)
    })
  }

  it('trades own takedown attempts for striking exchanges', () => {
    let baseTD = 0, planTD = 0, baseStrike = 0, planStrike = 0
    for (let i = 1; i <= 2000; i++) {
      seed(i)
      const base = pickExchange({ type: 'standing' }, A, B, 'Balanced', 'Balanced')
      seed(i)
      const plan = pickExchange({ type: 'standing' }, A, B, 'Keep It Standing', 'Balanced')
      baseTD += Number(base === 'td'); planTD += Number(plan === 'td')
      baseStrike += Number(base === 'strike'); planStrike += Number(plan === 'strike')
    }
    expect(planTD).toBeLessThan(baseTD)
    expect(planStrike).toBeGreaterThan(baseStrike)
  })
})

describe('ground bonuses belong to the fighter performing the action', () => {
  for (const top of ['A', 'B']) {
    const own = top === 'A' ? 'a' : 'b', other = top === 'A' ? 'b' : 'a'
    it(`${top} does not use the opponent's ground-and-pound bonus`, () => {
      expect(ground('gnp', top, { [`${other}GNP`]: 0.5 })).toEqual(ground('gnp', top))
      const damage = top === 'A' ? 'dmgB' : 'dmgA'
      expect(ground('gnp', top, { [`${own}GNP`]: 0.5 })[damage]).toBeGreaterThan(ground('gnp', top)[damage])
    })

    it(`${top} does not use the opponent's submission bonus`, () => {
      const fA = fighter('Wrestler'), fB = fighter('Wrestler')
      const base = ground('sub', top, {}, fA, fB)
      expect(ground('sub', top, { [`${other}Sub`]: 0.5 }, fA, fB)).toEqual(base)
      expect(ground('sub', top, { [`${own}Sub`]: 0.5 }, fA, fB).subProgress).toBeGreaterThan(base.subProgress)
    })

    it(`a sweep from under ${top} ignores the top fighter's sweep bonus`, () => {
      expect(ground('sweep', top, { [`${own}Sweep`]: 0.5 })).toEqual(ground('sweep', top))
    })
  }

  it('does not award submission points for a threat that makes no progress', () => {
    const result = ground('sub', 'A', {}, fighter('Wrestler', { bjj: 35, strength: 15 }),
      fighter('Wrestler', { bjj: 99, fightIQ: 99 }))
    expect(result.ptsA).toBe(0)
  })
})
