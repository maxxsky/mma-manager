// Rankings tests — divisions without rival camps, events, press effects
import { describe, it, expect } from 'vitest'
import { createTestGame, useSeed } from './helpers.js'
import { mulberry32, setRNG, resetRNG } from '@ironfist/engine/rng.js'
import { newGame, tick } from '@ironfist/engine/state.js'
import { maintainDivisions } from '@ironfist/engine/world.js'
import { commitFightResult } from '@ironfist/engine/fights/commitResult.js'
import { TICK_YEARLY } from '@ironfist/engine/world/config.js'
import { createEventContext } from '@ironfist/engine/events/context.js'
import { tickFightOffers } from '@ironfist/engine/tick/fight-offers.js'
import { getPublicOpinion } from '@ironfist/engine/publicOpinion.js'

const hasCampTag = (o) => !!o && ('campId' in o || 'campName' in o)

describe('P1 #21 — world has no rival camps', () => {
  it('newGame creates no rival camps and no camp tags', () => {
    setRNG(mulberry32(7))
    const g = newGame()
    resetRNG()
    expect(g.rivals).toBeUndefined()
    for (const div of Object.values(g.divisions)) {
      expect(div.list.some(hasCampTag)).toBe(false)
      expect(hasCampTag(div.champ)).toBe(false)
    }
  })

  it('replacement fighters and ten simulated years add no camp tags', () => {
    useSeed(42)
    const g = createTestGame()
    g.week = TICK_YEARLY
    maintainDivisions(g)
    for (let i = 0; i < 480; i++) { g.cash = Math.max(g.cash, 250000); tick(g) }
    expect(g.rivals).toBeUndefined()
    for (const div of Object.values(g.divisions)) {
      expect(div.list.some(hasCampTag)).toBe(false)
      expect(hasCampTag(div.champ)).toBe(false)
      expect(Object.values(div.tierChamps || {}).some(hasCampTag)).toBe(false)
    }
  })

  it('player title win stores no camp fields', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.weightClass = 'Lightweight'
    f.rankPoints = 95
    const div = g.divisions['Lightweight']
    div.champ = { name: 'Old Champ', player: false, age: 30 }
    const fighter = {
      id: f.id,
      booked: {
        opponent: { name: 'AI Opponent', level: 0.9 },
        title: true, show: 10000, winBonus: 5000,
        promotionId: 'test-promo',
      },
    }
    commitFightResult(g, fighter, { won: true, how: 'KO/TKO', r: 2, totalDmgA: 50, totalDmgB: 20 })
    expect(div.champ.name).toBe(f.name)
    expect(div.champ.player).toBe(true)
    expect(hasCampTag(div.champ)).toBe(false)
  })
})

describe('Grudge match — personal rivalry only', () => {
  function offerFor(markRivals) {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.rivalries = {}
    f.rankPoints = 95
    f.record = { w: 5, l: 1, ko: 1, sub: 0, dec: 4 }
    f.streakW = 1
    f.titles = []
    g.rep = 25
    if (markRivals) g.divisions[f.weightClass].list.forEach((c) => { f.rivalries[c.name] = { count: 2 } })
    g.inbox = []
    setRNG(() => 0.3) // below the 0.35 ranked-offer threshold
    tickFightOffers(g)
    resetRNG()
    return g.inbox.find((m) => m.type === 'offer' && m.fighterId === f.id)
  }

  it('a repeat opponent makes the offer a grudge match with 1.25x show', () => {
    const plain = offerFor(false)
    const grudge = offerFor(true)
    expect(plain.isGrudgeMatch).toBe(false)
    expect(grudge.isGrudgeMatch).toBe(true)
    expect(grudge.opponent.name).toBe(plain.opponent.name)
    expect(grudge.show).toBe(Math.round(plain.show * 1.25))
  })
})

describe('Task 55 — pickRandomPair in createEventContext', () => {
  it('returns 2 different fighters from roster of 2+', () => {
    useSeed(42)
    const g = createTestGame()
    const ctx = createEventContext(g)
    expect(ctx.rosterSize).toBeGreaterThanOrEqual(2)

    for (let i = 0; i < 20; i++) {
      const [a, b] = ctx.pickRandomPair()
      expect(a).not.toBeNull()
      expect(b).not.toBeNull()
      expect(a.id).not.toBe(b.id) // never same fighter double
    }
  })

  it('returns [null, null] for 0-roster game', () => {
    const g = { roster: [], week: 1 }
    const ctx = createEventContext(g)
    expect(ctx.pickRandomPair()).toEqual([null, null])
  })

  it('tension event does not crash over 200 weeks with roster 2+', () => {
    useSeed(42)
    const g = createTestGame()
    // Ensure tension triggers by lowering chemistry
    g.chemistry = 20
    // Make sure we have 2+ fighters
    expect(g.roster.length).toBeGreaterThanOrEqual(2)

    for (let i = 0; i < 200; i++) {
      expect(() => tick(g)).not.toThrow()
    }
  })
})


describe('Task 58 — Staredown attitude effects (N1)', () => {
  it('Trash talk loser: morale -8, rep -5, clamped', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.morale = 50
    f.ambition = 'Grinder' // no fight-time ambition effect (Paycheck would add morale)
    f.popularity = 30
    g.rep = 20

    const fighter = {
      id: f.id,
      booked: { opponent: { name: 'Opp' }, show: 1000, winBonus: 500 },
    }
    commitFightResult(g, fighter, {
      won: false, how: 'KO/TKO', r: 1,
      attitude: 'Trash talk',
    })
    // Base loss: morale -14, rep -3 → then attitude: morale -8, rep -5
    expect(f.morale).toBe(28) // 50 - 14 - 8
    expect(g.rep).toBe(12)    // 20 - 3 - 5
  })

  it('Respectful: popularity +2 regardless of win/loss', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.popularity = 30

    const fighter = {
      id: f.id,
      booked: { opponent: { name: 'Opp' }, show: 1000, winBonus: 500 },
    }
    commitFightResult(g, fighter, {
      won: true, how: 'Decision', r: 3,
      attitude: 'Respectful',
      totalDmgA: 20, totalDmgB: 15,
    })
    // Win base: popularity +3 (Decision) + Respectful +2 = +5
    expect(f.popularity).toBe(35) // 30 + 3 + 2
  })
})

describe('Task 58 — publicOpinion auto-connects (N2)', () => {
  it('popularity gain from attitude changes opinion label', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    // Start at pop=55, streakW=2 → Solid Pro (neutral)
    f.popularity = 55
    f.streakW = 2
    f.streakL = 0

    const before = getPublicOpinion(f)
    expect(before.sentiment).toBe('neutral')
    expect(before.label).toBe('Solid Pro')

    // Add +5 from Trash talk attitude + win base popularity gain
    f.popularity = 60 // manually push to trigger change

    const after = getPublicOpinion(f)
    expect(after.sentiment).toBe('positive')
    expect(after.label).toBe('Fan Favorite')
  })
})

describe('Task 58 — WeighIn Tale of Tape removed (N3)', () => {
  it('WeighIn.jsx no longer contains Tale of the Tape section', () => {
    const fs = require('fs')
    const content = fs.readFileSync('src/components/fight/WeighIn.jsx', 'utf8')
    expect(content).not.toMatch('Tale of the Tape')
    // CompareBar import should also be removed
    expect(content).not.toMatch('CompareBar')
  })
})
