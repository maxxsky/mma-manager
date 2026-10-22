// P1 #21: rival camps removed. Unhappy fighters can still get an offer from
// "another camp", and old saves lose their rival-camp leftovers on load.
import { describe, it, expect, afterEach, vi } from 'vitest'
import { setRNG, resetRNG } from '@ironfist/engine/rng.js'
import { reducer } from '@ironfist/engine/reducer.js'
import {
  tickOutsideOffers, outsideOfferTargets, OUTSIDE_OFFER_CHANCE, OUTSIDE_OFFER_INTERVAL,
} from '@ironfist/engine/tick/outside-offers.js'
import { migrateRemovedRivalCamps } from '@ironfist/engine/migrations/remove-rival-camps.js'
import { createTestGame, useSeed } from './helpers.js'

afterEach(() => resetRNG())

function unhappyGame() {
  useSeed(42)
  const g = createTestGame()
  g.inbox = []
  g.week = OUTSIDE_OFFER_INTERVAL * 3
  g.roster.forEach((f) => { f.morale = 90; f.loyalty = 90 })
  const f = g.roster[0]
  Object.assign(f, { morale: 40, loyalty: 30, booked: null, injury: null, asking: 1000,
    contract: { managerCut: 0.18, fightsLeft: 2, fightsTotal: 4, durationMo: 24, signedWeek: 1 } })
  return { g, f }
}
const offers = (g) => g.inbox.filter((m) => m.outsideOfferFighterId)

describe('outside offers', () => {
  it('fires for an unhappy fighter when the roll passes, with working choices', () => {
    const { g, f } = unhappyGame()
    setRNG(() => 0)
    tickOutsideOffers(g)
    const [m] = offers(g)
    expect(m).toBeDefined()
    expect(m.type).toBe('event')
    expect(m.outsideOfferFighterId).toBe(f.id)
    expect(m.title).toContain(f.name)
    expect(m.choices.map((c) => Object.keys(c).find((k) => k !== 'label'))).toEqual(['counter', 'letGo', 'talk'])
    expect(m.choices[0].counter.cost).toBe(1250)

    const cash = g.cash
    reducer(g, { type: 'INBOX_EVENT', messageId: m.id, choice: m.choices[0] })
    expect(g.cash).toBe(cash - 1250)
    expect(g.roster.some((x) => x.id === f.id)).toBe(true)
  })

  it('let go removes the fighter', () => {
    const { g, f } = unhappyGame()
    setRNG(() => 0)
    tickOutsideOffers(g)
    const [m] = offers(g)
    reducer(g, { type: 'INBOX_EVENT', messageId: m.id, choice: m.choices[1] })
    expect(g.roster.some((x) => x.id === f.id)).toBe(false)
    expect(g.log[0]).toContain('camp lain')
  })

  it('does not fire when the roll fails, off-interval, or nobody is unhappy', () => {
    let { g } = unhappyGame()
    setRNG(() => OUTSIDE_OFFER_CHANCE)
    tickOutsideOffers(g)
    expect(offers(g)).toHaveLength(0)

    ;({ g } = unhappyGame())
    g.week += 1
    setRNG(() => 0)
    tickOutsideOffers(g)
    expect(offers(g)).toHaveLength(0)

    const s = unhappyGame()
    s.f.loyalty = 60
    setRNG(() => 0)
    tickOutsideOffers(s.g)
    expect(offers(s.g)).toHaveLength(0)
  })

  it('skips booked, injured, out-of-contract fighters and ones with a pending offer', () => {
    const { g, f } = unhappyGame()
    expect(outsideOfferTargets(g).map((x) => x.id)).toEqual([f.id])
    for (const patch of [{ booked: { weeksLeft: 2 } }, { injury: { weeks: 2 } }, { contract: { fightsLeft: 0 } }]) {
      const saved = { booked: f.booked, injury: f.injury, contract: f.contract }
      Object.assign(f, patch)
      expect(outsideOfferTargets(g)).toHaveLength(0)
      Object.assign(f, saved)
    }
    setRNG(() => 0)
    tickOutsideOffers(g)
    g.week += OUTSIDE_OFFER_INTERVAL
    tickOutsideOffers(g)
    expect(offers(g)).toHaveLength(1)
  })

  it('does not consume RNG when nobody is eligible', () => {
    const { g, f } = unhappyGame()
    f.morale = 90
    let rolls = 0
    setRNG(() => { rolls++; return 0 })
    tickOutsideOffers(g)
    expect(rolls).toBe(0)
  })
})

describe('migrateRemovedRivalCamps', () => {
  it('drops camps, camp tags and coach-poach prompts, keeps fighter-poach prompts', () => {
    const s = {
      rivals: [{ id: 'r1' }],
      divisions: { Lightweight: {
        list: [{ name: 'A', campId: 'r1', campName: 'Chimera Gym' }, { name: 'B' }],
        champ: { name: 'C', campId: 'r1', campName: 'Chimera Gym' },
        tierChamps: { Regional: { name: 'D', campId: 'r1', campName: 'X' } },
      } },
      roster: [{ id: 'f1', booked: { opponent: { name: 'A', campId: 'r1', campName: 'Chimera Gym' } } }],
      inbox: [
        { id: 1, choices: [{ coachPoach: { id: 'c1', newSalary: 1, rivalId: 'r1' } }, { coachLeave: 'c1' }] },
        { id: 2, choices: [{ counter: { fighterId: 'f1', cost: 10 } }, { letGo: 'f1' }, { talk: 'f1' }] },
        { id: 3, type: 'offer', opponent: { name: 'A', campId: 'r1', campName: 'Chimera Gym' } },
      ],
    }
    migrateRemovedRivalCamps(s)
    const json = JSON.stringify(s)
    expect(s.rivals).toBeUndefined()
    expect(json).not.toContain('campId')
    expect(json).not.toContain('campName')
    expect(s.inbox.map((m) => m.id)).toEqual([2, 3])
    expect(migrateRemovedRivalCamps(JSON.parse(json))).toEqual(JSON.parse(json))
  })
})

describe('removed rivals tab', () => {
  it('a remembered "rivals" tab opens the dashboard instead of an empty page', async () => {
    const store = new Map()
    vi.stubGlobal('localStorage', {
      getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)),
    })
    const { rememberTab, getLastTab } = await import('../ui/ui-utils.js')
    rememberTab('rivals')
    expect(getLastTab()).toBe('dashboard')
    rememberTab('roster')
    expect(getLastTab()).toBe('roster')
    vi.unstubAllGlobals()
  })
})
