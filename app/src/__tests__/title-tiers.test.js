import { describe, it, expect } from 'vitest'
import { createTestGame, createTestFighter, useSeed } from './helpers.js'
import { commitFightResult } from '@ironfist/engine/fights/commitResult.js'
import { TITLE_NAMES, championAt, migrateChampionships } from '@ironfist/engine/championships.js'
import { stripTitle, vacateTitle } from '@ironfist/engine/rankings.js'
import { tickFightOffers } from '@ironfist/engine/tick/fight-offers.js'
import { reduceFight } from '@ironfist/engine/reducer/fight.js'
import { reduceFighter } from '@ironfist/engine/reducer/fighter.js'

function setup(tier = 'Regional') {
  const g = createTestGame({ week: 12 })
  const f = createTestFighter({ booked: { title: true, titleTier: tier, tier: 'Major', show: 1000,
    winBonus: 500, opponent: createTestFighter({ id: 'opponent', name: 'Opponent' }) } })
  g.roster = [f]
  return { g, f, div: g.divisions[f.weightClass] }
}
function finish(g, f, won = true) {
  useSeed(42)
  // Exercise the engine with the actual state fighter, not a detached UI copy.
  commitFightResult(g, f, { won, how: 'Decision', r: 3 })
}
function book(f, tier, title = true) {
  f.booked = { title, titleTier: tier, tier: 'Major', opponent: createTestFighter({ id: 'opponent', name: 'Opponent' }) }
}

describe('independent championship ownership', () => {
  it.each(['Regional', 'National', 'Minor', 'Premier', 'Interim'])('%s win preserves the Major champion and era', tier => {
    const { g, f, div } = setup(tier)
    div.era = { championName: div.champ.name, startedWeek: 1, defenses: 4 }
    const original = structuredClone({ champ: div.champ, era: div.era })
    finish(g, f)
    expect({ champ: div.champ, era: div.era }).toEqual(original)
    expect(championAt(div, tier)).toMatchObject({ fighterId: f.id, titleDefenses: 0, wonWeek: 12 })
    expect(f.titles).toEqual([TITLE_NAMES[tier]])
    expect(f.reignHistory[0].tier).toBe(tier)
    expect(f.booked).toBeNull()
  })

  it('a Regional champion gets no Major mandatory defense', () => {
    const { g, f } = setup()
    finish(g, f)
    g.week = 40
    tickFightOffers(g)
    expect(g.inbox.some(m => m.defense && m.fighterId === f.id)).toBe(false)
    expect(f.titles).toContain('Regional Champion')
  })

  it('counts defenses within the contested reign and preserves wonWeek', () => {
    const { g, f, div } = setup('Major')
    finish(g, f)
    expect(f.titleDefenses).toBe(0)
    book(f, 'Major'); g.week = 16; finish(g, f)
    expect(f.titleDefenses).toBe(1)
    expect(div.champ).toMatchObject({ wonWeek: 12, lastDefenseWeek: 16, titleDefenses: 1 })
    book(f, 'Regional'); g.week = 17; finish(g, f)
    expect(div.champ.titleDefenses).toBe(1)
    expect(div.tierChamps.Regional.titleDefenses).toBe(0)
    book(f, 'Regional'); g.week = 18; finish(g, f)
    expect(div.tierChamps.Regional.titleDefenses).toBe(1)
    expect(div.champ.lastDefenseWeek).toBe(16)
  })

  it('loss transfers only the contested belt and removes its active label', () => {
    const { g, f, div } = setup('Major')
    finish(g, f)
    book(f, 'Regional'); finish(g, f)
    book(f, 'Regional'); finish(g, f, false)
    expect(div.champ.fighterId).toBe(f.id)
    expect(div.tierChamps.Regional.name).toBe('Opponent')
    expect(f.titles).toEqual(['Major World Champion'])
  })

  it('a non-title loss does not transfer a belt', () => {
    const { g, f, div } = setup('Major')
    finish(g, f)
    book(f, 'Major', false); finish(g, f, false)
    expect(div.champ.fighterId).toBe(f.id)
    expect(f.titles).toContain('Major World Champion')
  })

  it('Major loss ends the era but preserves lower belts', () => {
    const { g, f, div } = setup('Regional')
    finish(g, f)
    book(f, 'Major'); finish(g, f)
    div.era = { championName: f.name, startedWeek: 1, defenses: 4 }
    book(f, 'Major'); finish(g, f, false)
    expect(div.champ.name).toBe('Opponent')
    expect(div.era).toBeNull()
    expect(f.titles).toEqual(['Regional Champion'])
  })

  it('rejecting a Major mandatory strips Major only, including its ownership', () => {
    const { g, f, div } = setup('Major')
    finish(g, f)
    book(f, 'Regional'); finish(g, f)
    g.inbox.unshift({ id: 'defense-offer', type: 'offer', fighterId: f.id, tier: 'Major', title: true, defense: true, titleTier: 'Major', opponent: { name: 'Contender' } })
    reduceFight(g, { type: 'REJECT_FIGHT', messageId: 'defense-offer' })
    expect(div.champ).toBeNull()
    expect(f.titles).toEqual(['Regional Champion'])
    expect(div.tierChamps.Regional.fighterId).toBe(f.id)
  })

  it('stale mandatory expiry cannot strip a different champion', () => {
    const { g, f } = setup('Regional')
    finish(g, f)
    const before = f.morale
    stripTitle(g, f.id)
    expect(f.morale).toBe(before)
    expect(f.titles).toEqual(['Regional Champion'])
  })

  it('vacates all held tiers on a weight change even after weightClass changed', () => {
    const { g, f, div } = setup('Regional')
    finish(g, f)
    book(f, 'Major'); finish(g, f)
    reduceFighter(g, { type: 'CLASS_CHANGE_ACCEPT', fighterId: f.id,
      targetClass: 'Welterweight', targetIdx: 4, moraleEffect: 5 })
    expect(div.champ).toBeNull()
    expect(div.tierChamps.Regional).toBeNull()
    expect(f.titles).toEqual([])
  })

  it('vacating one tier preserves other champions and title labels', () => {
    const { g, f, div } = setup('Regional')
    finish(g, f)
    book(f, 'Major'); finish(g, f)
    vacateTitle(g, f, 'Major')
    expect(div.champ).toBeNull()
    expect(f.titles).toEqual(['Regional Champion'])
  })

  it('a new player holder removes the previous player holder label', () => {
    const { g, f, div } = setup('Regional')
    finish(g, f)
    const challenger = createTestFighter({ id: 'challenger', name: 'Challenger' })
    g.roster.push(challenger)
    book(challenger, 'Regional'); finish(g, challenger)
    expect(div.tierChamps.Regional.fighterId).toBe(challenger.id)
    expect(f.titles).toEqual([])
  })

  it('Interim win leaves Major intact; unification removes Interim', () => {
    const { g, f, div } = setup('Interim')
    const champName = div.champ.name
    finish(g, f)
    expect(div.champ.name).toBe(champName)
    book(f, 'Major'); finish(g, f)
    expect(div.champ.fighterId).toBe(f.id)
    expect(div.tierChamps.Interim).toBeNull()
    expect(f.titles).toEqual(['Major World Champion'])
  })

  it('migrates a polluted legacy world slot once without changing valid Major ownership', () => {
    const { g, f, div } = setup()
    delete div.tierChamps
    f.titles = ['Regional Champion']
    div.champ = { name: f.name, player: true, fighterId: f.id, wonWeek: 8 }
    div.era = { championName: f.name }
    migrateChampionships(g)
    expect(div.champ).toBeNull()
    expect(div.era).toBeNull()
    expect(div.tierChamps.Regional.fighterId).toBe(f.id)
    const first = structuredClone(g)
    migrateChampionships(g)
    expect(g).toEqual(first)
    delete div.tierChamps
    f.titles.push('Major World Champion')
    div.champ = { name: f.name, player: true, fighterId: f.id }
    migrateChampionships(g)
    expect(div.champ.fighterId).toBe(f.id)
  })
})
