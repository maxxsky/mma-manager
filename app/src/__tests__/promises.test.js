// P2 #31 (FI5): promises to fighters are recorded and have consequences.
import { describe, it, expect } from 'vitest'
import { reducer } from '@ironfist/engine/reducer.js'
import { checkPromises, PROMISE_RULES } from '@ironfist/engine/promises.js'
import { createTestGame } from './helpers.js'

function promiseVia(g, f, choice) {
  const msg = { id: 'm1', type: 'event', choices: [choice] }
  g.inbox.unshift(msg)
  reducer(g, { type: 'INBOX_EVENT', messageId: 'm1', choice })
}

function setup() {
  const g = createTestGame()
  g.week = 100
  const f = g.roster[0]
  Object.assign(f, { morale: 50, loyalty: 50, booked: null, lastFightWeek: 60, promises: [] })
  return { g, f }
}

describe('fight promise', () => {
  it('records a deadline and gives the stated morale', () => {
    const { g, f } = setup()
    promiseVia(g, f, { label: 'x', fightPromise: f.id })
    expect(f.morale).toBe(53)
    expect(f.promises).toEqual([{ type: 'fight', madeWeek: 100, dueWeek: 100 + PROMISE_RULES.fight.weeks }])
  })

  it('kept when the fighter gets booked before the deadline', () => {
    const { g, f } = setup()
    promiseVia(g, f, { label: 'x', fightPromise: f.id })
    g.week = 105
    f.booked = { tier: 'Local', weeksLeft: 3 }
    checkPromises(g)
    expect(f.promises).toHaveLength(0)
    expect(f.morale).toBe(53 + PROMISE_RULES.fight.keptMorale)
    expect(f.loyalty).toBe(50)
  })

  it('broken after the deadline: morale and loyalty drop, inbox explains', () => {
    const { g, f } = setup()
    promiseVia(g, f, { label: 'x', fightPromise: f.id })
    g.week = 100 + PROMISE_RULES.fight.weeks
    checkPromises(g)
    expect(f.promises).toHaveLength(1) // due this week, not yet broken
    g.week += 1
    checkPromises(g)
    expect(f.promises).toHaveLength(0)
    expect(f.morale).toBe(53 + PROMISE_RULES.fight.brokenMorale)
    expect(f.loyalty).toBe(50 + PROMISE_RULES.fight.brokenLoyalty)
    expect(g.inbox.some((m) => /janji diingkari/.test(m.title))).toBe(true)
  })

  it('a second promise of the same kind does not stack a new deadline', () => {
    const { g, f } = setup()
    promiseVia(g, f, { label: 'x', fightPromise: f.id })
    promiseVia(g, f, { label: 'x', fightPromise: f.id })
    expect(f.promises).toHaveLength(1)
  })
})

describe('upgrade promise', () => {
  it('kept only by upgrading the promised facility', () => {
    const { g, f } = setup()
    g.facilities.ring = 1
    promiseVia(g, f, { label: 'x', upgradePromise: { fighterId: f.id, fac: 'ring' } })
    g.facilities.mats += 1 // a different facility does not count
    g.week += 4; checkPromises(g)
    expect(f.promises).toHaveLength(1)
    g.facilities.ring = 2
    checkPromises(g)
    expect(f.promises).toHaveLength(0)
    expect(f.morale).toBe(54 + PROMISE_RULES.upgrade.keptMorale)
  })

  it('broken after 24 weeks without the upgrade', () => {
    const { g, f } = setup()
    promiseVia(g, f, { label: 'x', upgradePromise: { fighterId: f.id, fac: 'ring' } })
    g.week += PROMISE_RULES.upgrade.weeks + 1
    checkPromises(g)
    expect(f.morale).toBe(54 + PROMISE_RULES.upgrade.brokenMorale)
    expect(f.loyalty).toBe(50 + PROMISE_RULES.upgrade.brokenLoyalty)
  })
})
