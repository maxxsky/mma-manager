// P2 #35 (DU8): promoter personalities change the offers they make.
import { describe, it, expect, afterEach } from 'vitest'
import { setRNG, resetRNG } from '@ironfist/engine/rng.js'
import { PROMOTIONS, promotionOfferTerms } from '@ironfist/engine/data/promotions.js'
import { tickFightOffers } from '@ironfist/engine/tick/fight-offers.js'
import { createTestGame } from './helpers.js'

afterEach(() => resetRNG())
const byPersonality = (id) => PROMOTIONS.find((p) => p.personality.id === id)

describe('promotionOfferTerms', () => {
  it('matches each personality description', () => {
    expect(promotionOfferTerms(byPersonality('highRoller'))).toEqual({ purseMult: 1.2, expires: 2 })
    expect(promotionOfferTerms(byPersonality('grassroots'), { ranked: false }).purseMult).toBe(1.1)
    expect(promotionOfferTerms(byPersonality('grassroots'), { ranked: true }).purseMult).toBe(1)
    expect(promotionOfferTerms(byPersonality('talentFocused'), { ranked: true }).purseMult).toBe(1.1)
    expect(promotionOfferTerms(byPersonality('talentFocused'), { ranked: false }).purseMult).toBe(1)
    expect(promotionOfferTerms(byPersonality('oldSchool'), { champion: true }).purseMult).toBe(1.1)
    expect(promotionOfferTerms(byPersonality('oldSchool'), {}).purseMult).toBe(1)
    for (const p of PROMOTIONS) expect(p.personality.desc).toMatch(/%|weeks/)
  })
})

describe('attached to real offers', () => {
  it('a high-roller offer gets +20% purse, a note and a 2-week expiry', () => {
    const g = createTestGame()
    const f = g.roster[0]
    f.booked = null; f.injury = null
    const hr = byPersonality('highRoller')
    f.promotionContract = { promotionId: hr.id, fightsLeft: 3 } // forces this promotion
    g.inbox = [{ id: 'o', type: 'offer', fighterId: f.id, tier: hr.tier, show: 10000, winBonus: 5000, expires: 4, opponent: { name: 'X' } }]
    setRNG(() => 0.99) // no new offers this tick
    tickFightOffers(g)
    const m = g.inbox.find((x) => x.id === 'o')
    expect(m.promotionId).toBe(hr.id)
    expect(m.show).toBe(12000)
    expect(m.winBonus).toBe(6000)
    expect(m.promotionNote).toMatch(/High Roller: purse \+20%/)
    expect(m.expires).toBeLessThanOrEqual(2)
  })

  it('applies once: a second tick does not stack the bonus', () => {
    const g = createTestGame()
    const f = g.roster[0]
    f.booked = null; f.injury = null
    const hr = byPersonality('highRoller')
    f.promotionContract = { promotionId: hr.id, fightsLeft: 3 }
    g.inbox = [{ id: 'o', type: 'offer', fighterId: f.id, tier: hr.tier, show: 10000, winBonus: 5000, expires: 4, opponent: { name: 'X' } }]
    setRNG(() => 0.99)
    tickFightOffers(g); tickFightOffers(g)
    expect(g.inbox.find((x) => x.id === 'o')?.show ?? 12000).toBe(12000)
  })
})
