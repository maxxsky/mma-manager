import { afterEach, describe, expect, it } from 'vitest'
import { tickRankings } from '@ironfist/engine/tick/rankings.js'
import { setRNG, resetRNG, mulberry32, resetUID } from '@ironfist/engine/rng.js'

afterEach(() => resetRNG())

function fighter(id, points) {
  return { id, name: id, points, level: 0.9, archetype: 'Boxer' }
}

function setup(list, extra = {}) {
  resetUID()
  setRNG(() => 0.5)
  return { week: 48, roster: [], log: [], divisions: {
    Lightweight: { list, champ: null, tierChamps: {}, ...extra },
  } }
}

describe('annual ranking rotation', () => {
  it('retires the three lowest-point fighters, preserving a stronger recent prospect at the end', () => {
    const g = setup([fighter('weak-a', 10), fighter('strong', 90), fighter('weak-b', 15),
      fighter('weak-c', 20), fighter('new-prospect', 60)])
    tickRankings(g)
    const names = g.divisions.Lightweight.list.map(f => f.name)
    expect(names).toContain('new-prospect')
    expect(names).toContain('strong')
    expect(names).not.toContain('weak-a')
    expect(names).not.toContain('weak-b')
    expect(names).not.toContain('weak-c')
    expect(names).toHaveLength(5)
    expect(names.slice(0, 2)).toEqual(['strong', 'new-prospect'])
    expect(g.log[0]).toContain('(weak-c, weak-b, weak-a)')
  })

  it('selects the same retirees with reversed storage, including tied points', () => {
    const list = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => fighter(id, 40))
    const first = setup(structuredClone(list))
    tickRankings(first)
    const second = setup(structuredClone(list).reverse())
    tickRankings(second)
    expect(first.log).toEqual(second.log)
    const survivors = g => g.divisions.Lightweight.list.filter(f => typeof f.id === 'string').map(f => f.id).sort()
    expect(survivors(first)).toEqual(['a', 'b', 'c'])
    expect(survivors(second)).toEqual(survivors(first))
  })

  it('preserves Major and lower-tier champions even at the lowest points', () => {
    const g = setup([fighter('major', 5), fighter('regional', 6), fighter('weak-a', 10),
      fighter('weak-b', 15), fighter('weak-c', 20), fighter('strong', 90)], {
      champ: { name: 'major', player: false },
      tierChamps: { Regional: { name: 'regional', fighterId: 'regional' } },
    })
    tickRankings(g)
    const div = g.divisions.Lightweight
    expect(div.list.map(f => f.id)).toContain('major')
    expect(div.list.map(f => f.id)).toContain('regional')
    expect(div.champ.name).toBe('major')
    expect(div.tierChamps.Regional.fighterId).toBe('regional')
    expect(div.list).toHaveLength(6)
  })

  it.each([0, 1, 2])('replaces only existing eligible fighters in a small division of %i', size => {
    const g = setup(Array.from({ length: size }, (_, i) => fighter(`old-${i}`, 20)))
    tickRankings(g)
    expect(g.divisions.Lightweight.list).toHaveLength(size)
    expect(g.divisions.Lightweight.list.some(f => f.name.startsWith('old-'))).toBe(false)
    if (size) expect(g.log[0]).toContain(`${size} fighter`)
    else expect(g.log).toEqual([])
  })

  it('does not rotate outside the yearly boundary or when all fighters are champions', () => {
    const g = setup([fighter('only-champ', 20)], { champ: { name: 'only-champ' } })
    tickRankings(g)
    expect(g.divisions.Lightweight.list.map(f => f.id)).toEqual(['only-champ'])
    expect(g.log).toEqual([])
    g.week = 47
    g.divisions.Lightweight.champ = null
    tickRankings(g)
    expect(g.divisions.Lightweight.list.map(f => f.id)).toEqual(['only-champ'])
  })

  it('replays retirement and replacement identities with the same seed and UID state', () => {
    const list = Array.from({ length: 15 }, (_, i) => fighter(`old-${i}`, 10 + i * 5))
    const first = setup(structuredClone(list))
    setRNG(mulberry32(12345)); tickRankings(first)
    const second = setup(structuredClone(list))
    setRNG(mulberry32(12345)); tickRankings(second)
    expect(second).toEqual(first)
  })
})
