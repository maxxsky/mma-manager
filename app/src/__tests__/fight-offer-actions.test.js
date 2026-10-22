// Fight offers are booked from the inbox offer itself (found during P2 #32):
// the UI used to rebuild the booking and dropped promotionId/isMainEvent, and
// rolled the counter-offer in the component.
import { describe, it, expect, afterEach } from 'vitest'
import { setRNG, resetRNG } from '@ironfist/engine/rng.js'
import { reducer } from '@ironfist/engine/reducer.js'
import { counterChance, counterBoost } from '@ironfist/engine/reducer/fight.js'
import { commitFightResult } from '@ironfist/engine/fights/commitResult.js'
import { createTestGame } from './helpers.js'

afterEach(() => resetRNG())

function withOffer(extra = {}) {
  const g = createTestGame()
  const f = g.roster[0]
  f.booked = null
  const offer = {
    id: 'offer-1', type: 'offer', fighterId: f.id, tier: 'Regional', show: 4000, winBonus: 2000, weeks: 5,
    opponent: { name: 'Opp', level: 0.8 }, title: false, defense: false, oppRank: 9, contenderId: 'c9',
    promotionId: 'promo-x', promotionName: 'Promo X', isMainEvent: true, ...extra,
  }
  g.inbox.unshift(offer)
  g.promoterRel = { ...g.promoterRel, Regional: 40 }
  return { g, f, offer }
}

describe('ACCEPT_FIGHT', () => {
  it('books the offer from the inbox, including promotion and main-event flags', () => {
    const { g, f } = withOffer()
    reducer(g, { type: 'ACCEPT_FIGHT', messageId: 'offer-1', show: 1e9 })
    expect(f.booked).toMatchObject({ show: 4000, winBonus: 2000, weeksLeft: 5, tier: 'Regional', promotionId: 'promo-x', isMainEvent: true, oppRank: 9 })
    expect(g.inbox.some((m) => m.id === 'offer-1')).toBe(false)
    expect(g.promoterRel.Regional).toBeGreaterThan(40)
  })

  it('a completed fight from that booking counts toward the promotion', () => {
    const { g, f } = withOffer()
    reducer(g, { type: 'ACCEPT_FIGHT', messageId: 'offer-1' })
    setRNG(() => 0.99)
    commitFightResult(g, { id: f.id, booked: { ...f.booked } }, { won: true, how: 'Decision', r: 3, totalDmgA: 20, totalDmgB: 30 })
    expect(f.promotionFightCounts).toEqual({ 'promo-x': 1 })
  })

  it('does nothing without a matching offer message', () => {
    const { g, f } = withOffer()
    reducer(g, { type: 'ACCEPT_FIGHT', messageId: 'nope', fighterId: f.id, show: 1e9, tier: 'Local' })
    expect(f.booked).toBeNull()
  })
})

describe('COUNTER_FIGHT', () => {
  it('engine roll under the chance books a boosted purse and costs relation', () => {
    const { g, f } = withOffer()
    expect(counterChance(g, 'Regional')).toBe(60)
    setRNG(() => 0.59)
    reducer(g, { type: 'COUNTER_FIGHT', messageId: 'offer-1', boosted: 1e9 })
    expect(f.booked.show).toBe(Math.round(4000 * counterBoost(40)))
    expect(f.booked.promotionId).toBe('promo-x')
    expect(g.promoterRel.Regional).toBeLessThan(40)
  })

  it('a roll over the chance cancels the offer like a rejection', () => {
    const { g, f } = withOffer()
    setRNG(() => 0.61)
    reducer(g, { type: 'COUNTER_FIGHT', messageId: 'offer-1' })
    expect(f.booked).toBeNull()
    expect(g.inbox.some((m) => m.id === 'offer-1')).toBe(false)
  })
})

describe('REJECT_FIGHT', () => {
  it('strips a defended title based on the offer, not on caller flags', () => {
    const { g, f } = withOffer({ tier: 'Major', title: true, defense: true, titleTier: 'Major' })
    const div = g.divisions[f.weightClass]
    div.champ = { name: f.name, player: true, fighterId: f.id, tier: 'Major', titleDefenses: 0 }
    f.titles = ['World Champion']
    reducer(g, { type: 'REJECT_FIGHT', messageId: 'offer-1', stripTitle: false })
    expect(div.champ?.fighterId).not.toBe(f.id)
  })
})

describe('exclusive promotion contract offers', () => {
  it('are events with their own choices, cannot be booked as a fight, and still expire', async () => {
    const { tickSettlement } = await import('@ironfist/engine/tick/settlement.js')
    const { tickFightOffers } = await import('@ironfist/engine/tick/fight-offers.js')
    const g = createTestGame()
    g.week = 96
    const f = g.roster[0]
    f.booked = null
    const promo = g.promotions[0]
    f.promotionFightCounts = { [promo.id]: 2 }
    g.promoterRel = { ...g.promoterRel, [promo.tier]: 80 }
    g.inbox = []
    tickSettlement(g)
    const m = g.inbox.find((x) => x.promotionContractOffer === promo.id)
    expect(m).toBeDefined()
    expect(m.type).toBe('event')
    reducer(g, { type: 'ACCEPT_FIGHT', messageId: m.id })
    expect(f.booked).toBeNull()
    for (let i = 0; i < 6; i++) { g.week++; tickFightOffers(g) }
    expect(g.inbox.some((x) => x.id === m.id)).toBe(false)
  })
})
