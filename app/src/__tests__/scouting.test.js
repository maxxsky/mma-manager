// P3 #40 (CA1): report grade is capped per scouting method, so high
// reputation alone no longer makes every report grade S; scouting runs in
// the engine instead of App.jsx.
import { describe, it, expect } from 'vitest'
import { reducer } from '@ironfist/engine/reducer.js'
import { CAMP_TIERS } from '@ironfist/engine/data.js'
import { SCOUT_METHODS, scoutMethod, scoutGradeFor, repScoutGrade } from '@ironfist/engine/scouting.js'
import { createTestGame, createTestFighter } from './helpers.js'

const game = (o = {}) => { const g = createTestGame(); Object.assign(g, { cash: 1e6, prospects: [] }, o); g.roster = g.roster.slice(0, 1); return g }

describe('scoutGradeFor', () => {
  it('rep 100 no longer means grade S everywhere: each method has a cap', () => {
    const g = { rep: 100 }
    expect(repScoutGrade(100)).toBe('S')
    expect(scoutGradeFor(g, scoutMethod('local'))).toBe('B')
    expect(scoutGradeFor(g, scoutMethod('regional'))).toBe('A')
    expect(scoutGradeFor(g, scoutMethod('national'))).toBe('S')
    expect(scoutGradeFor(g, scoutMethod('diamond'))).toBe('A')
  })

  it('low reputation still limits every method', () => {
    for (const m of SCOUT_METHODS) expect(scoutGradeFor({ rep: 5 }, m)).toBe('C')
    expect(scoutGradeFor({ rep: 30 }, scoutMethod('national'))).toBe('B')
  })
})

describe('SCOUT reducer', () => {
  it('generates the prospect and report in the engine and charges the method cost', () => {
    const g = game({ rep: 100 })
    const cash = g.cash
    reducer(g, { type: 'SCOUT', methodId: 'local', fighter: createTestFighter({ name: 'Injected' }), grade: 'S', cost: 1 })
    expect(g.cash).toBe(cash - 75)
    expect(g.prospects).toHaveLength(1)
    const p = g.prospects[0]
    expect(p.grade).toBe('B')
    expect(p.fighter.name).not.toBe('Injected')
    expect(p.report.est).toBeDefined()
    expect(p.method).toBe('Local Amateur Circuit')
  })

  it('honours the archetype filter when it can', () => {
    const g = game({ rep: 50 })
    reducer(g, { type: 'SCOUT', methodId: 'national', filterArch: 'Wrestler' })
    expect(g.prospects[0].fighter.archetype).toBe('Wrestler')
  })

  it('refuses when the roster is full, cash is short, or Diamond is locked', () => {
    let g = game()
    while (g.roster.length < CAMP_TIERS[g.campTier || 0].rosterCap) g.roster.push(createTestFighter({ id: `r${g.roster.length}`, name: `R${g.roster.length}` }))
    reducer(g, { type: 'SCOUT', methodId: 'local' })
    expect(g.prospects).toHaveLength(0)
    g = game({ cash: 10 })
    reducer(g, { type: 'SCOUT', methodId: 'local' })
    expect(g.prospects).toHaveLength(0)
    g = game({ rep: 50, facilities: { mats: 1, ring: 1, weights: 1, medical: 1 } })
    reducer(g, { type: 'SCOUT', methodId: 'diamond' })
    expect(g.prospects).toHaveLength(0)
    g.facilities = { mats: 2, ring: 2, weights: 2, medical: 2 }
    reducer(g, { type: 'SCOUT', methodId: 'diamond' })
    expect(g.prospects).toHaveLength(1)
    expect(g.prospects[0].transferReason).toBeTruthy()
  })
})
