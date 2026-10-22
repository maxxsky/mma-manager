// P2 #33 (EK4): the emergency sale sells real facility levels instead of
// conjuring a flat $25,000.
import { describe, it, expect } from 'vitest'
import { reducer } from '@ironfist/engine/reducer.js'
import { tick } from '@ironfist/engine/state.js'
import { facilityCost } from '@ironfist/engine/economy.js'
import { planEmergencySale, EMERGENCY_SALE_RATE } from '@ironfist/engine/finance.js'
import { createTestGame } from './helpers.js'

const choose = (g, m, i) => reducer(g, { type: 'INBOX_EVENT', messageId: m.id, choiceIndex: i, choice: m.choices[i] })

describe('emergency sale', () => {
  it('sells the highest facility levels first, at half their build cost, until out of the hole', () => {
    const g = createTestGame()
    g.campTier = 1
    g.facilities = { mats: 3, ring: 2, weights: 1, medical: 1 }
    g.cash = -55000
    const plan = planEmergencySale(g)
    const r1 = Math.round(facilityCost(2, 1) * EMERGENCY_SALE_RATE) // mats 3→2
    expect(plan.sales[0]).toEqual({ fac: 'mats', fromLevel: 3, refund: r1 })
    expect(g.cash + plan.total).toBeGreaterThanOrEqual(-40000)
    expect(plan.sales.every((s) => s.fromLevel > 1)).toBe(true)
  })

  it('the bankruptcy prompt offers it with the real amount, and choosing it sells the assets', () => {
    const g = createTestGame()
    g.facilities = { mats: 2, ring: 2, weights: 1, medical: 1 }
    g.cash = -60000
    g.inbox = []
    tick(g)
    const m = g.inbox.find((x) => /Ambang Bangkrut/.test(x.title))
    const i = m.choices.findIndex((c) => c.emergencyCostCut)
    expect(i).toBeGreaterThanOrEqual(0)
    const planned = planEmergencySale(g)
    expect(m.choices[i].label).toContain(String(planned.sales.length))
    const cash = g.cash, chem = g.chemistry
    choose(g, m, i)
    expect(g.cash).toBe(cash + planned.total)
    expect(g.facilities.mats + g.facilities.ring).toBe(4 - planned.sales.length)
    expect(g.chemistry).toBe(Math.max(0, chem - 10))
  })

  it('with every facility at level 1 there is nothing to sell and no option for it', () => {
    const g = createTestGame()
    g.facilities = { mats: 1, ring: 1, weights: 1, medical: 1 }
    g.cash = -60000
    g.inbox = []
    tick(g)
    const m = g.inbox.find((x) => /Ambang Bangkrut/.test(x.title))
    expect(m.choices.some((c) => c.emergencyCostCut)).toBe(false)
  })
})
