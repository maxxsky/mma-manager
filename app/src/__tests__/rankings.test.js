// Rankings tests — campId marking in divisions
import { describe, it, expect, beforeEach } from 'vitest'
import { createTestGame, useSeed, clearSeed } from './helpers.js'
import { genDivisions } from '../engine/rankings.js'
import { genRivalCamp } from '../engine/rivals.js'
import { mulberry32, setRNG, random, RI } from '../engine/rng.js'
import { tick } from '../engine/state.js'
import { maintainDivisions, simulateAITitleDefenses } from '../engine/world.js'
import { commitFightResult } from '../engine/fights/commitResult.js'
import { TICK_YEARLY, TICK_TITLE_DEFENSE } from '../engine/world/config.js'
import { createEventContext } from '../engine/events/context.js'

describe('Camp marking — genDivisions', () => {
  it('marks exactly 2-4 fighters per division with campId', () => {
    useSeed(42)
    const rivals = [genRivalCamp(0), genRivalCamp(1), genRivalCamp(2)]
    const d = genDivisions(rivals)

    Object.entries(d).forEach(([wc, div]) => {
      const marked = div.list.filter((f) => f.campId != null)
      expect(
        marked.length,
        `${wc}: expected 2-4 marked, got ${marked.length}`
      ).toBeGreaterThanOrEqual(2)
      expect(
        marked.length,
        `${wc}: expected 2-4 marked, got ${marked.length}`
      ).toBeLessThanOrEqual(4)

      // Every marked fighter has both campId and campName
      marked.forEach((f) => {
        expect(f.campId).toBeDefined()
        expect(f.campName).toBeDefined()
        expect(typeof f.campName).toBe('string')
      })
    })
  })

  it('never marks more than 4 or less than 2 per division across many seeds', () => {
    for (let seed = 0; seed < 20; seed++) {
      useSeed(seed * 7 + 3)
      const rivals = [genRivalCamp(0), genRivalCamp(1), genRivalCamp(2)]
      const d = genDivisions(rivals)

      Object.entries(d).forEach(([wc, div]) => {
        const marked = div.list.filter((f) => f.campId != null)
        expect(marked.length).toBeGreaterThanOrEqual(2)
        expect(marked.length).toBeLessThanOrEqual(4)
      })
    }
  })

  it('all 15 fighters are present after marking (no fighters removed)', () => {
    useSeed(42)
    const rivals = [genRivalCamp(0), genRivalCamp(1), genRivalCamp(2)]
    const d = genDivisions(rivals)

    Object.values(d).forEach((div) => {
      expect(div.list.length).toBe(15)
    })
  })

  it('campId references a valid rival camp when provided', () => {
    useSeed(42)
    const rivals = [genRivalCamp(0), genRivalCamp(1), genRivalCamp(2)]
    const campIds = new Set(rivals.map((r) => r.id))
    const d = genDivisions(rivals)

    Object.values(d).forEach((div) => {
      div.list.forEach((f) => {
        if (f.campId) {
          expect(campIds.has(f.campId), `campId ${f.campId} not in rivals`).toBe(true)
        }
      })
    })
  })
})

describe('Camp marking — rep-weighted distribution', () => {
  it('high-rep camp gets more fighters than low-rep camp over many seeds', () => {
    // Create 2 rivals with deliberately skewed rep
    const lowRep = genRivalCamp(0)
    const highRep = genRivalCamp(1)
    lowRep.rep = 1
    highRep.rep = 99
    const rivals = [lowRep, highRep]

    let highRepCount = 0
    let lowRepCount = 0
    const seeds = 50

    for (let seed = 0; seed < seeds; seed++) {
      useSeed(seed * 13 + 7)
      const d = genDivisions(rivals)

      Object.values(d).forEach((div) => {
        div.list.forEach((f) => {
          if (f.campId === highRep.id) highRepCount++
          if (f.campId === lowRep.id) lowRepCount++
        })
      })
    }

    // High rep camp should have a statistically significant advantage
    expect(highRepCount).toBeGreaterThan(lowRepCount * 2)
  })
})

describe('Camp marking — world integration', () => {
  it('genDivisions through newGame produces marked fighters', () => {
    useSeed(42)
    const g = createTestGame()

    Object.values(g.divisions).forEach((div) => {
      const marked = div.list.filter((f) => f.campId != null)
      expect(marked.length).toBeGreaterThanOrEqual(2)
      expect(marked.length).toBeLessThanOrEqual(4)
    })
  })
})

describe('Camp marking — maintainDivisions', () => {
  it('replacement fighters sometimes get campId, not always', () => {
    useSeed(42)
    const g = createTestGame()

    // Track all fighters with campId before any replacements
    const beforeCamps = new Set()
    Object.values(g.divisions).forEach((div) => {
      div.list.forEach((f) => {
        if (f.campId) beforeCamps.add(f.id)
      })
    })

    // Run multiple ticks at yearly boundaries
    // tick() increments g.week first, so set week to (multiple - 1)
    for (let i = 0; i < 10; i++) {
      g.week = i * TICK_YEARLY + TICK_YEARLY - 1
      tick(g)
    }

    // Collect all fighters after ticks
    const afterFighters = []
    Object.values(g.divisions).forEach((div) => {
      div.list.forEach((f) => {
        afterFighters.push(f)
      })
    })

    const newFighters = afterFighters.filter((f) => !beforeCamps.has(f.id))
    const newMarked = newFighters.filter((f) => f.campId != null)

    // At least some replacements should exist
    expect(newFighters.length).toBeGreaterThan(0)

    // Some replacements should be marked (not zero), but NOT all
    expect(newMarked.length).toBeGreaterThan(0)
    expect(newMarked.length).toBeLessThan(newFighters.length)
  })
})

describe('Task 54 — Title campId sync (R1)', () => {
  it('AI title change propagates campId to div.champ', () => {
    useSeed(42)
    const g = createTestGame()
    const div = g.divisions['Lightweight']

    const camp = g.rivals[0]
    const contender = div.list[1]
    contender.campId = camp.id
    contender.campName = camp.name

    div.champ = { name: div.champ.name, player: false, age: 35, level: 0.5 }
    contender.level = 1.5
    contender.points = 110

    const origRandom = random
    setRNG(() => 0)
    g.week = TICK_TITLE_DEFENSE
    const events = simulateAITitleDefenses(g)
    setRNG(origRandom)

    expect(div.champ.name).toBe(contender.name)
    expect(div.champ.campId).toBe(camp.id)
    expect(div.champ.campName).toBe(camp.name)
  })

  it('AI vacant title champ carries campId from winner', () => {
    useSeed(42)
    const g = createTestGame()
    const div = g.divisions['Lightweight']

    const camp = g.rivals[0]
    const topFighter = div.list[0]
    topFighter.campId = camp.id
    topFighter.campName = camp.name
    div.champ = null

    const origRandom = random
    setRNG(() => 0)
    g.week = TICK_TITLE_DEFENSE
    simulateAITitleDefenses(g)
    setRNG(origRandom)

    expect(div.champ).toBeDefined()
    expect(div.champ.name).toBe(topFighter.name)
    expect(div.champ.campId).toBe(camp.id)
    expect(div.champ.campName).toBe(camp.name)
  })

  it('maintainDivisions champ promotion carries campId', () => {
    useSeed(42)
    const g = createTestGame()
    const div = g.divisions['Lightweight']

    const camp = g.rivals[0]
    div.list[0].campId = camp.id
    div.list[0].campName = camp.name
    div.champ = null

    g.week = TICK_YEARLY
    maintainDivisions(g)

    expect(div.champ).toBeDefined()
    expect(div.champ.name).toBe(div.list[0].name)
    expect(div.champ.campId).toBe(camp.id)
    expect(div.champ.campName).toBe(camp.name)
  })
})

describe('Task 54 — Player title win + rivalry nudge (R1+R3)', () => {
  it('player title win leaves div.champ.campId null, no errors', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.weightClass = 'Lightweight'
    f.rankPoints = 95
    const div = g.divisions['Lightweight']
    div.champ = { name: 'Old Champ', player: false, age: 30 }

    // Separate fighter object (same id) — needed because commitFightResult
    // reads booked from the external fighter param, not from the roster entry
    const fighter = {
      id: f.id,
      booked: {
        opponent: { name: 'AI Opponent', level: 0.9 },
        title: true, show: 10000, winBonus: 5000,
        promotionId: 'test-promo',
      },
    }
    commitFightResult(g, fighter, {
      won: true, how: 'KO/TKO', r: 2,
      totalDmgA: 50, totalDmgB: 20,
    })

    expect(div.champ.name).toBe(f.name)
    expect(div.champ.player).toBe(true)
    expect(div.champ).toHaveProperty('campId', null)
    expect(div.champ).toHaveProperty('campName', null)
  })

  it('winning against camp-affiliated fighter nudges rivalry', () => {
    useSeed(42)
    const g = createTestGame()
    const camp = g.rivals[0]
    const initialRivalry = camp.rivalry

    const f = g.roster[0]
    const fighter = {
      id: f.id,
      booked: {
        opponent: { name: 'Camp Fighter', campId: camp.id, campName: camp.name, level: 0.8 },
        show: 5000, winBonus: 2500,
        opponentLevel: 0.8,
      },
    }
    commitFightResult(g, fighter, {
      won: true, how: 'Decision', r: 3,
      totalDmgA: 30, totalDmgB: 25,
    })
    expect(camp.rivalry).toBeGreaterThan(initialRivalry)
  })

  it('opponent without campId does not affect rivalry', () => {
    useSeed(42)
    const g = createTestGame()
    const initial = g.rivals.map((r) => r.rivalry)

    const f = g.roster[0]
    const fighter = {
      id: f.id,
      booked: {
        opponent: { name: 'Independent Fighter', level: 0.7 },
        show: 5000, winBonus: 2500,
      },
    }
    commitFightResult(g, fighter, {
      won: true, how: 'KO/TKO', r: 1,
      totalDmgA: 60, totalDmgB: 10,
    })
    g.rivals.forEach((r, i) => {
      expect(r.rivalry).toBe(initial[i])
    })
  })
})

describe('Task 54 — Championship Contender event (R2)', () => {
  it('rival with divisional champion triggers Championship Contender event', () => {
    useSeed(42)
    const g = createTestGame()
    const camp = g.rivals[0]

    const div = g.divisions['Lightweight']
    div.champ.campId = camp.id
    div.champ.campName = camp.name
    delete camp._milestoneTitleNotified

    g.week = 1
    tick(g)

    const champEvent = g.inbox.find((m) =>
      m.title?.includes('Championship Contender')
    )
    expect(champEvent).toBeDefined()
    expect(champEvent.title).toContain(camp.name)
    expect(champEvent.title).toContain('Championship Contender')
    expect(champEvent.body).toContain('Lightweight')
  })

  it('rep-based Established Camp event still fires separately', () => {
    useSeed(42)
    const g = createTestGame()
    const camp = g.rivals[1]
    camp.rep = 75
    delete camp._milestoneChampNotified

    Object.values(g.divisions).forEach((d) => {
      if (d.champ) { d.champ.campId = 'other'; d.champ.campName = 'Other' }
    })
    camp._milestoneTitleNotified = true

    g.week = 1
    tick(g)

    const repEvent = g.inbox.find((m) =>
      m.title?.includes('Established Camp')
    )
    expect(repEvent).toBeDefined()
    expect(repEvent.title).toContain(camp.name)
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
