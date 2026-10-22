// Side symmetry — the opponent (side B) gets a game plan and corner, and every
// plan/corner effect works the same for both sides. Identical fighters with
// identical choices must win about half the time from either side.
import { describe, it, expect } from 'vitest'
import { createTestFighter } from './helpers.js'
import { simRound, runFight, prepFighter, autoGamePlan, aiCorner } from '@ironfist/engine/fight.js'
import { setRNG, mulberry32 } from '@ironfist/engine/rng.js'

const ARCHS = ['Boxer', 'Muay Thai', 'Wrestler', 'BJJ Specialist', 'All-Rounder']
const ATTRS = { striking: 62, wrestling: 60, bjj: 58, cardio: 60, strength: 60, chin: 60, footwork: 58, fightIQ: 58 }

function pair(archetype) {
  return [
    prepFighter(createTestFighter({ id: 'a', name: 'Alpha', archetype, attrs: { ...ATTRS } })),
    prepFighter(createTestFighter({ id: 'b', name: 'Beta', archetype, attrs: { ...ATTRS } })),
  ]
}

// Side A win share over fixed seeds, same plan and corner for both sides.
function mirrorWinShare(plan, corner, perArch = 400) {
  let winsA = 0, total = 0
  for (const arch of ARCHS) {
    const [A, B] = pair(arch)
    for (let i = 0; i < perArch; i++) {
      const r = runFight(A, B, plan, () => corner, 10007 * i + 13, 3, { planB: plan, cornerPolicyB: () => corner })
      if (r.winner === 'A') winsA++
      total++
    }
  }
  return winsA / total
}

describe('mirrored fighters win about half the time', () => {
  const cases = [
    ['Balanced', 'neutral'],
    ['Balanced', 'go'],
    ['Balanced', 'save'],
    ['Take It Down', 'body'],
    ['Finish It', 'go'],
    ['Survive & Outpoint', 'save'],
  ]
  for (const [plan, corner] of cases) {
    it(`${plan} / ${corner}`, () => {
      const share = mirrorWinShare(plan, corner)
      expect(share).toBeGreaterThan(0.46)
      expect(share).toBeLessThan(0.54)
    })
  }
})

describe('side B plan and corner have effects', () => {
  const [A, B] = pair('All-Rounder')
  const round = (opts) => {
    setRNG(mulberry32(4242))
    return simRound(2, A, B, 80, 80, 'Balanced', 'neutral', 0, 0, 0, opts)
  }

  it('a "save" corner drains less stamina than pushing the pace', () => {
    expect(round({ planB: 'Balanced', cornerB: 'save' }).staB)
      .toBeGreaterThan(round({ planB: 'Balanced', cornerB: 'go' }).staB)
  })

  it('"Finish It" drains more stamina than "Survive & Outpoint"', () => {
    expect(round({ planB: 'Survive & Outpoint', cornerB: 'neutral' }).staB)
      .toBeGreaterThan(round({ planB: 'Finish It', cornerB: 'neutral' }).staB)
  })

  it('a "clinch" corner costs side B round points and saves stamina', () => {
    let ptsN = 0, ptsC = 0, staN = 0, staC = 0
    for (let s = 1; s <= 200; s++) {
      setRNG(mulberry32(s))
      const base = simRound(2, A, B, 80, 80, 'Balanced', 'neutral', 0, 0, 0, { planB: 'Balanced', cornerB: 'neutral' })
      setRNG(mulberry32(s))
      const clinch = simRound(2, A, B, 80, 80, 'Balanced', 'neutral', 0, 0, 0, { planB: 'Balanced', cornerB: 'clinch' })
      expect(clinch.cornerB).toBe('clinch')
      ptsN += base.scoreB; ptsC += clinch.scoreB
      staN += base.staB; staC += clinch.staB
    }
    expect(ptsC).toBeLessThan(ptsN * 0.85)
    expect(staC).toBeGreaterThan(staN)
  })

  it('defaults to autoGamePlan and an AI corner when B choices are left out', () => {
    const r = round({})
    expect(r.planB).toBe(autoGamePlan(B, A))
    expect(typeof r.cornerB).toBe('string')
  })
})

describe('aiCorner', () => {
  it('protects its own cut first, then attacks the opponent cut', () => {
    expect(aiCorner({ rnd: 2, cutOwn: 4, cutOpp: 5 })).toBe('stop_bleed')
    expect(aiCorner({ rnd: 2, cutOpp: 4 })).toBe('target_cut')
  })

  it('saves energy when tired and empties the tank when behind in the last round', () => {
    expect(aiCorner({ rnd: 2, staOwn: 30, staOpp: 60 })).toBe('save')
    expect(aiCorner({ rnd: 3, totalRounds: 3, momOwn: -10 })).toBe('empty_tank')
    expect(aiCorner({ rnd: 3, totalRounds: 5, momOwn: -10 })).not.toBe('empty_tank')
  })

  it('follows the game plan when nothing urgent is going on', () => {
    expect(aiCorner({ rnd: 1, plan: 'Finish It' })).toBe('go')
    expect(aiCorner({ rnd: 1, plan: 'Survive & Outpoint' })).toBe('save')
    expect(aiCorner({ rnd: 1, plan: 'Balanced' })).toBe('neutral')
  })
})
