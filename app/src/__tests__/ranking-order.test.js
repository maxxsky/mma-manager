import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, it, expect, vi } from 'vitest'
import Rankings from '../ui/Rankings.jsx'
import { createTestGame, createTestFighter, useSeed } from './helpers.js'
import { divisionRankings, rankOf } from '@ironfist/engine/rankings.js'
import { tickFightOffers } from '@ironfist/engine/tick/fight-offers.js'
import { simulateAITitleDefenses, maintainDivisions, generateWorldEvents } from '@ironfist/engine/world.js'
import { generateWorldNews } from '@ironfist/engine/narrative/generators/world-news.js'
import { createNarrativeContext } from '@ironfist/engine/narrative/context.js'
import { setRNG, resetRNG } from '@ironfist/engine/rng.js'
import { TICK_TITLE_DEFENSE, TICK_YEARLY, TICK_QUARTERLY } from '@ironfist/engine/world/config.js'

afterEach(() => { resetRNG(); vi.unstubAllGlobals() })

function setup() {
  const ai = (id, points) => ({ id, name: id, points, level: 1, age: 25,
    archetype: 'Boxer', record: { w: 5, l: 1, ko: 2, sub: 0, dec: 3 } })
  const top = ai('Top Contender', 95)
  const middle = ai('Middle Contender', 80)
  const low = ai('Low Contender', 20)
  const champ = ai('World Champion', 100)
  const f = createTestFighter({ id: 'player', name: 'Player Fighter', rankPoints: 90 })
  const teammate = createTestFighter({ id: 'teammate', name: 'Teammate Fighter', rankPoints: 92 })
  const div = { champ: { ...champ, player: false }, tierChamps: {}, list: [low, champ, middle, top] }
  const g = createTestGame({ week: 12, roster: [f, teammate], divisions: { Lightweight: div }, rep: 10 })
  return { g, f, teammate, div, top, middle, low }
}

describe('shared point-based ranking', () => {
  it('merges teammates, excludes the world champion and leaves storage unchanged', () => {
    const { g, f, teammate, div } = setup()
    const storageOrder = div.list.map(c => c.id)
    expect(divisionRankings(g, 'Lightweight').map(c => [c.fighter.name, c.rank])).toEqual([
      ['Top Contender', 1], ['Teammate Fighter', 2], ['Player Fighter', 3],
      ['Middle Contender', 4], ['Low Contender', 5],
    ])
    expect(rankOf(g, f)).toBe(3)
    expect(rankOf(g, teammate)).toBe(2)
    expect(div.list.map(c => c.id)).toEqual(storageOrder)
  })

  it('uses deterministic ties independent of storage order', () => {
    const { g, div, f, teammate } = setup()
    div.list.forEach(c => { c.points = 90 })
    teammate.rankPoints = f.rankPoints = 90
    const original = divisionRankings(g, 'Lightweight').map(c => c.fighter.id)
    div.list.reverse(); g.roster.reverse()
    expect(divisionRankings(g, 'Lightweight').map(c => c.fighter.id)).toEqual(original)
    expect(original).toEqual(['Low Contender', 'Middle Contender', 'Top Contender', 'player', 'teammate'])
  })

  it('updates ranks immediately after points change without requiring a tick', () => {
    const { g, f, top } = setup()
    f.rankPoints = 96
    expect(rankOf(g, f)).toBe(1)
    top.points = 97
    expect(rankOf(g, f)).toBe(2)
  })

  it('returns null outside top 15 or without points; champion is rank 0', () => {
    const { g, f, div } = setup()
    div.list = Array.from({ length: 15 }, (_, i) => ({ id: i, name: `AI ${i}`, points: 100 - i }))
    f.rankPoints = 1
    expect(rankOf(g, f)).toBeNull()
    f.rankPoints = 0
    expect(rankOf(g, f)).toBeNull()
    div.champ = { player: true, fighterId: f.id, name: f.name }
    expect(rankOf(g, f)).toBe(0)
    expect(divisionRankings(g, 'Lightweight').some(c => c.fighter.id === f.id)).toBe(false)
  })

  it('renders the same order as engine rankOf', () => {
    const { g, f } = setup()
    vi.stubGlobal('window', { innerWidth: 1200 })
    const html = renderToStaticMarkup(React.createElement(Rankings, { g, t: key => key }))
    const names = ['Top Contender', 'Teammate Fighter', 'Player Fighter', 'Middle Contender', 'Low Contender']
    const offsets = names.map(name => html.indexOf(name))
    expect(offsets.every(n => n >= 0)).toBe(true)
    expect(offsets).toEqual([...offsets].sort((a, b) => a - b))
    expect(rankOf(g, f)).toBe(names.indexOf(f.name) + 1)
  })
})

describe('ranked opponent selection', () => {
  it('mandatory defense chooses the best eligible AI and reports its displayed rank', () => {
    const { g, f, teammate, div, top } = setup()
    g.week = 25
    div.list = div.list.filter(c => c.name !== div.champ.name)
    div.champ = { name: f.name, player: true, fighterId: f.id, lastDefenseWeek: 1 }
    f.titles = ['Major World Champion']
    teammate.rankPoints = 96
    teammate.injury = { weeks: 4 }
    tickFightOffers(g)
    const offer = g.inbox.find(m => m.defense && m.fighterId === f.id)
    expect(offer.opponent.name).toBe(top.name)
    expect(offer.contenderId).toBe(top.id)
    expect(offer.oppRank).toBe(2)
  })

  it.each([1, 2])('vacant title for player rank #%i chooses the highest AI', rank => {
    const { g, f, teammate, div, top } = setup()
    div.list = div.list.filter(c => c.name !== div.champ.name)
    div.champ = null
    f.rankPoints = rank === 1 ? 101 : 99
    teammate.rankPoints = 0
    if (rank === 2) top.points = 100
    tickFightOffers(g)
    const offer = g.inbox.find(m => m.vacantTitle && m.fighterId === f.id)
    expect(offer.opponent.name).toBe(top.name)
    expect(offer.oppRank).toBe(rank === 1 ? 2 : 1)
  })

  it('ordinary offers retain the displayed opponent rank across shuffled storage and many seeds', () => {
    let checked = 0
    for (let seed = 0; seed < 60; seed++) {
      const { g, f, teammate, div } = setup()
      teammate.injury = { weeks: 4 }
      const expected = divisionRankings(g, f.weightClass)
      useSeed(seed); tickFightOffers(g)
      const offer = g.inbox.find(m => m.type === 'offer' && m.fighterId === f.id)
      if (!offer || offer.contenderId == null) continue
      const entry = expected.find(c => c.fighter.id === offer.contenderId)
      expect(offer.opponent.name).toBe(entry.fighter.name)
      expect(offer.oppRank).toBe(entry.rank)
      expect(offer.opponent.name).not.toBe(div.champ.name)
      expect(entry.player).toBe(false)
      const first = { name: offer.opponent.name, rank: offer.oppRank }
      g.inbox = []; div.list.reverse()
      useSeed(seed); tickFightOffers(g)
      const shuffled = g.inbox.find(m => m.type === 'offer' && m.fighterId === f.id)
      expect({ name: shuffled.opponent.name, rank: shuffled.oppRank }).toEqual(first)
      checked++
    }
    expect(checked).toBeGreaterThan(10)
  })

  it('AI title defense and vacant-title winner use points instead of array position', () => {
    const { g, div, top } = setup()
    g.roster = []; g.week = TICK_TITLE_DEFENSE
    setRNG(() => 0)
    simulateAITitleDefenses(g)
    expect(div.champ.name).toBe(top.name)
    const vacant = setup()
    vacant.g.roster = []; vacant.g.week = TICK_TITLE_DEFENSE; vacant.div.champ = null
    simulateAITitleDefenses(vacant.g)
    // With no champion, the former world champion re-enters at 100 points.
    expect(vacant.div.champ.name).toBe('World Champion')
  })

  it('retired champion replacement selects the highest points', () => {
    const { g, div } = setup()
    g.roster = []; g.week = TICK_YEARLY
    div.champ = { name: 'Retired Champion', player: false }
    maintainDivisions(g)
    expect(div.champ.name).toBe('World Champion')
  })

  it('top-three world news excludes lower-ranked prospects despite storage order', () => {
    const { g, div, low, middle, top } = setup()
    g.week = TICK_QUARTERLY
    low.age = middle.age = top.age = 22
    low.points = 76; middle.points = 80; top.points = 95
    const news = generateWorldNews(createNarrativeContext(g))
    expect(news.some(e => e.body?.includes(top.name))).toBe(true)
    expect(news.some(e => e.body?.includes(middle.name))).toBe(false)
    expect(news.some(e => e.body?.includes(low.name))).toBe(false)
    setRNG(() => 0.5)
    generateWorldEvents(g)
    expect(top._breakthroughNotified).toBe(true)
    expect(middle._breakthroughNotified).toBeUndefined()
    expect(low._breakthroughNotified).toBeUndefined()
  })
})
