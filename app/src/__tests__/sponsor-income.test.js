import { describe, it, expect } from 'vitest'
import { createTestGame, useSeed } from './helpers.js'
import { computeMonthlyIncome, computeMonthlyExpense } from '@ironfist/engine/economy.js'
import { monthlyIn } from '@ironfist/engine/finance.js'
import { tickSettlement } from '@ironfist/engine/tick/settlement.js'

describe('sponsors add to reputation income', () => {
  it('keeps the $15,000 base when signing one or several sponsors', () => {
    const g = createTestGame({ rep: 40, sponsors: [] })
    const base = computeMonthlyIncome(g)
    expect(base.sponsorAmt).toBe(15000)
    g.sponsors = [{ brand: 'HypeTracker Pro', terms: 'placement', rate: 400 }]
    expect(computeMonthlyIncome(g).sponsorAmt).toBe(15400)
    expect(monthlyIn(g)).toBe(base.total + 400)
    g.sponsors.push({ brand: 'ArenaVision', terms: 'placement', rate: 350 },
      { brand: 'Titan Nutrition', terms: 'placement', rate: 300 })
    expect(computeMonthlyIncome(g).sponsorAmt).toBe(16050)
    g.sponsors = []
    expect(computeMonthlyIncome(g)).toEqual(base)
  })

  it('applies champion and royalty bonuses to the contract amount only', () => {
    const g = createTestGame({ rep: 40, sponsors: [] })
    g.roster.forEach(f => { f.titles = []; f.lastFightWeek = null })
    g.roster[0].titles = ['Major World Champion']
    g.roster[0].lastFightWeek = g.week
    g.roster[0].record.w = 1
    g.sponsors = [{ brand: 'FightFist Gear', terms: 'royalty', rate: 200 }]
    expect(computeMonthlyIncome(g).sponsorAmt).toBe(15000 + 300 * 1.5)
  })

  it('pays the previewed extra income at settlement', () => {
    const base = createTestGame({ rep: 40, week: 4, sponsors: [] })
    const signed = JSON.parse(JSON.stringify(base))
    signed.sponsors = [{ brand: 'HypeTracker Pro', terms: 'placement', rate: 400, weeksLeft: 1 }]
    const income = monthlyIn(signed)
    const expense = computeMonthlyExpense(signed).total
    const before = signed.cash
    useSeed(42)
    tickSettlement(base)
    useSeed(42)
    tickSettlement(signed)
    expect(signed.cash - before).toBe(income - expense)
    expect(signed.cash - base.cash).toBe(400)
    expect(signed.sponsors).toEqual([])
    expect(computeMonthlyIncome(signed).sponsorAmt).toBe(15000)
  })
})
