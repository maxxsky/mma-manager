// P1 #20 (CA5): poach price follows current OVR, odds depend on strength,
// and POACH_FIGHTER recomputes everything instead of trusting the UI.
import { describe, it, expect, afterEach } from 'vitest'
import { ATTRS, CAMP_TIERS } from '@ironfist/engine/data.js'
import { reducer } from '@ironfist/engine/reducer.js'
import { setRNG } from '@ironfist/engine/rng.js'
import { poachTerms } from '@ironfist/engine/rivals.js'
import { createTestGame, clearSeed } from './helpers.js'

const withOvr = (id, ovr, extra = {}) => ({
  id, name: `T${id}`, archetype: 'Boxer', morale: 60, asking: 1000,
  attrs: Object.fromEntries(ATTRS.map((k) => [k, ovr])), ...extra,
})

function setup({ ovr = 66, rivalry = 0, cash = 1e7, rep = 20, rivalRep = 20 } = {}) {
  const g = createTestGame()
  g.cash = cash
  g.rep = rep
  const target = withOvr('tgt', ovr)
  const rival = { id: 'riv', name: 'Rival', trait: 'Balanced', rep: rivalRep, rivalry, chemistry: 50, coaches: [], fighters: [target] }
  g.rivals.push(rival)
  return { g, rival, target }
}

afterEach(() => clearSeed())

describe('poachTerms', () => {
  it('price follows current OVR, not the asking fee from generation', () => {
    const { g, rival, target } = setup({ ovr: 50 })
    const before = poachTerms(g, rival, target).cost
    for (const k of ATTRS) target.attrs[k] = 66 // fighter developed
    const after = poachTerms(g, rival, target).cost
    expect(after).toBeGreaterThan(before * 2)
    target.asking = 999999
    expect(poachTerms(g, rival, target).cost).toBe(after)
  })

  it('review example: OVR 66 rival fighter is no longer ~$2k at 50%', () => {
    const { g, rival, target } = setup({ ovr: 66, rep: 20, rivalRep: 20 })
    const { cost, failCost, successChance } = poachTerms(g, rival, target)
    expect(cost).toBe(64800)
    expect(failCost).toBe(12960)
    expect(successChance).toBe(28)
  })

  it('odds drop steeply with OVR and with rivalry', () => {
    const chance = (ovr, rivalry = 0) => {
      const { g, rival, target } = setup({ ovr, rivalry })
      return poachTerms(g, rival, target).successChance
    }
    expect(chance(40)).toBeGreaterThan(chance(50))
    expect(chance(50) - chance(66)).toBeGreaterThanOrEqual(30)
    expect(chance(80)).toBeLessThanOrEqual(10)
    expect(chance(66, 60)).toBeLessThan(chance(66, 0))
    expect(chance(95)).toBe(5)
    expect(chance(15)).toBe(85)
  })

  it('reports blockers', () => {
    let s = setup({ cash: 100 })
    expect(poachTerms(s.g, s.rival, s.target).blocked).toBe('cash')
    s = setup()
    s.g.roster.length = 0
    const cap = CAMP_TIERS[s.g.campTier || 0].rosterCap
    for (let i = 0; i < cap; i++) s.g.roster.push(withOvr(`r${i}`, 40))
    expect(poachTerms(s.g, s.rival, s.target).blocked).toBe('rosterFull')
    s = setup()
    s.target.injury = { weeks: 2 }
    expect(poachTerms(s.g, s.rival, s.target).blocked).toBe('unavailable')
  })
})

describe('POACH_FIGHTER reducer', () => {
  it('ignores cost and chance sent in the action', () => {
    const { g, rival, target } = setup({ ovr: 66 })
    const { cost } = poachTerms(g, rival, target)
    const cashBefore = g.cash
    setRNG(() => 0)
    reducer(g, { type: 'POACH_FIGHTER', rivalId: 'riv', targetId: 'tgt', cost: 1, failCost: 0, successChance: 100 })
    expect(g.roster.some((f) => f.id === 'tgt')).toBe(true)
    expect(g.cash).toBe(cashBefore - cost)
  })

  it('uses the engine chance: a roll above it fails even if the action claims 100%', () => {
    const { g, rival, target } = setup({ ovr: 66 })
    const { failCost, successChance } = poachTerms(g, rival, target)
    const cashBefore = g.cash
    setRNG(() => (successChance + 1) / 100)
    reducer(g, { type: 'POACH_FIGHTER', rivalId: 'riv', targetId: 'tgt', successChance: 100 })
    expect(g.roster.some((f) => f.id === 'tgt')).toBe(false)
    expect(g.cash).toBe(cashBefore - failCost)
  })

  it('refuses when roster is full, without charging or rolling', () => {
    const { g, rival } = setup()
    const cap = CAMP_TIERS[g.campTier || 0].rosterCap
    while (g.roster.length < cap) g.roster.push(withOvr(`r${g.roster.length}`, 40))
    const cashBefore = g.cash
    let rolled = false
    setRNG(() => { rolled = true; return 0 })
    reducer(g, { type: 'POACH_FIGHTER', rivalId: 'riv', targetId: 'tgt', successChance: 100 })
    expect(g.roster.length).toBe(cap)
    expect(g.cash).toBe(cashBefore)
    expect(rival.fighters).toHaveLength(1)
    expect(rolled).toBe(false)
    expect(rival.rivalry).toBe(0)
  })

  it('refuses when cash is short or target is booked', () => {
    let s = setup({ cash: 5000 })
    setRNG(() => 0)
    reducer(s.g, { type: 'POACH_FIGHTER', rivalId: 'riv', targetId: 'tgt' })
    expect(s.g.cash).toBe(5000)
    expect(s.rival.fighters).toHaveLength(1)
    s = setup()
    s.target.booked = { opp: 'x' }
    const cash = s.g.cash
    reducer(s.g, { type: 'POACH_FIGHTER', rivalId: 'riv', targetId: 'tgt' })
    expect(s.g.cash).toBe(cash)
    expect(s.rival.fighters).toHaveLength(1)
  })
})

describe('Rivals screen', () => {
  it('shows the same price and chance the reducer will use', async () => {
    const React = (await import('react')).default
    const { renderToStaticMarkup } = await import('react-dom/server')
    const { default: RivalsScreen } = await import('../ui/RivalsScreen.jsx')
    const { fmt$ } = await import('@ironfist/engine/rng.js')
    const { g, rival, target } = setup({ ovr: 66 })
    g.rivals = [rival]
    const { cost, successChance } = poachTerms(g, rival, target)
    const html = renderToStaticMarkup(React.createElement(RivalsScreen, { g, dispatch: () => {} }))
    expect(html).toContain(fmt$(cost))
    expect(html).toContain(`${successChance}%`)
  })
})
