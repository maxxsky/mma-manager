import { afterEach, describe, expect, it } from 'vitest'
import { createTestGame, createTestFighter } from './helpers.js'
import { ATTRS } from '@ironfist/engine/data.js'
import { tickFightOffers } from '@ironfist/engine/tick/fight-offers.js'
import { genDivisions } from '@ironfist/engine/rankings.js'
import { tickRankings } from '@ironfist/engine/tick/rankings.js'
import { ensureWorldProfile, worldOpponent, migrateWorldProfiles, aiChampion } from '@ironfist/engine/world/fighter-profile.js'
import { simulateAITitleDefenses, ageAIFighters } from '@ironfist/engine/world.js'
import { setRNG, mulberry32, resetRNG, getWorldRNGState } from '@ironfist/engine/rng.js'
import { runFight } from '@ironfist/engine/fight.js'

afterEach(() => resetRNG())

function fixture() {
  const f = createTestFighter({ rankPoints: 90 })
  const target = { id: 'stable-ai', name: 'Stable Opponent', archetype: 'Wrestler', level: 1,
    points: 80, record: { w: 0, l: 1, ko: 0, sub: 0, dec: 0 } }
  const g = createTestGame({ week: 8, rep: 10, roster: [f], divisions: {
    Lightweight: { champ: { name: 'Other Champion', player: false }, tierChamps: {}, list: [target] },
  } })
  return { g, f, target }
}

describe('persistent world combat profiles', () => {
  it('stores valid attributes and style on initial divisions and yearly replacements', () => {
    setRNG(mulberry32(123))
    const g = { week: 48, roster: [], log: [], divisions: genDivisions() }
    for (const [wc, div] of Object.entries(g.divisions)) {
      expect(div.champ.attrs).toEqual(div.list[0].attrs)
      for (const f of div.list) {
        expect(f.weightClass).toBe(wc)
        expect(ATTRS.every(k => Number.isFinite(f.attrs[k]))).toBe(true)
      }
    }
    const ids = new Set(Object.values(g.divisions).flatMap(d => d.list.map(f => f.id)))
    tickRankings(g)
    const replacements = Object.values(g.divisions).flatMap(d => d.list).filter(f => !ids.has(f.id))
    expect(replacements).toHaveLength(24)
    expect(replacements.every(f => ATTRS.every(k => Number.isFinite(f.attrs[k])))).toBe(true)
  })

  it('reuses the same ranked opponent attributes, traits, ID and record across offer seeds', () => {
    const { g, target } = fixture()
    const offered = []
    for (let seed = 0; seed < 80; seed++) {
      g.inbox = []
      setRNG(mulberry32(seed)); tickFightOffers(g)
      const offer = g.inbox.find(m => m.contenderId === target.id)
      if (offer) offered.push(offer.opponent)
    }
    expect(offered.length).toBeGreaterThan(10)
    for (const opp of offered) {
      expect(opp).toEqual(target)
      expect(opp).not.toBe(target)
      expect(opp.record.w).toBe(0)
    }
    offered[0].attrs.striking = 1
    offered[0].traits.push('Explosive')
    expect(offered[1]).toEqual(target)
  })

  it('hydrates legacy fighters deterministically without consuming world RNG or IDs', () => {
    const { target } = fixture()
    const before = getWorldRNGState()
    const first = worldOpponent(structuredClone(target), 'Lightweight')
    setRNG(mulberry32(999))
    const second = worldOpponent(structuredClone(target), 'Lightweight')
    expect(second).toEqual(first)
    expect(getWorldRNGState()).toEqual(before)
    expect(first.attrs.wrestling).toBeGreaterThan(first.attrs.striking)
  })

  it('persists through JSON save/load and preserves an already accepted legacy opponent', () => {
    const { g, f, target } = fixture()
    const known = createTestFighter({ id: 'old-rerolled-id', name: target.name, archetype: 'Boxer' })
    f.booked = { contenderId: target.id, opponent: known }
    migrateWorldProfiles(g)
    expect(target.attrs).toEqual(known.attrs)
    expect(target.archetype).toBe('Boxer')
    const saved = JSON.parse(JSON.stringify(g))
    migrateWorldProfiles(saved)
    expect(saved).toEqual(g)
    expect(worldOpponent(saved.divisions.Lightweight.list[0], 'Lightweight').attrs).toEqual(known.attrs)
  })

  it('mandatory defense and vacant title use the stored profile without strength boosts', () => {
    const { g, f, target } = fixture()
    ensureWorldProfile(target, 'Lightweight')
    g.week = 25
    g.divisions.Lightweight.champ = { name: f.name, player: true, fighterId: f.id, lastDefenseWeek: 1 }
    tickFightOffers(g)
    expect(g.inbox.find(m => m.defense).opponent).toEqual(target)
    g.inbox = []; g.divisions.Lightweight.champ = null
    tickFightOffers(g)
    expect(g.inbox.find(m => m.vacantTitle).opponent).toEqual(target)
  })

  it('world title changes preserve the former champion identity and attributes', () => {
    const { g, target } = fixture()
    g.roster = []; g.week = 24
    const former = ensureWorldProfile({ id: 'former', name: 'Former Champion', level: 1,
      points: 85, archetype: 'Boxer' }, 'Lightweight')
    g.divisions.Lightweight.list.push(former)
    g.divisions.Lightweight.champ = aiChampion(former, 'Lightweight')
    const attrs = structuredClone(former.attrs)
    setRNG(() => 0); simulateAITitleDefenses(g)
    expect(g.divisions.Lightweight.champ.worldFighterId).toBe(target.id)
    expect(g.divisions.Lightweight.champ.attrs).toEqual(target.attrs)
    expect(g.divisions.Lightweight.list.find(f => f.id === former.id)).toBe(former)
    expect(former.attrs).toEqual(attrs)
  })

  it('aging adjusts stored attributes explicitly rather than rerolling them per offer', () => {
    const { g, target } = fixture()
    ensureWorldProfile(target, 'Lightweight'); target.age = 22
    const before = structuredClone(target.attrs)
    g.week = 48; ageAIFighters(g)
    expect(target.attrs.wrestling).toBeGreaterThanOrEqual(before.wrestling)
    expect(worldOpponent(target, 'Lightweight').attrs).toEqual(target.attrs)
  })

  it('the same saved opponent and fight seed replay the complete fight identically', () => {
    const { f, target } = fixture()
    const opp = worldOpponent(target, 'Lightweight')
    const saved = JSON.parse(JSON.stringify(opp))
    setRNG(mulberry32(345)); const first = runFight(f, opp, 'Balanced')
    setRNG(mulberry32(345)); const second = runFight(f, saved, 'Balanced')
    expect(second).toEqual(first)
  })
})
