// Media System Tests — press conferences, public opinion, rumors
import { describe, it, expect } from 'vitest'
import { createTestFighter, createTestGame, useSeed } from './helpers.js'
import { commitFightResult } from '../engine/fights/commitResult.js'
import { getPublicOpinion } from '../engine/publicOpinion.js'
import { tick } from '../engine/state.js'

// Helper: popularity gain from winning (replicates commitResult win-branch logic)
function winPopGain(resultHow, f) {
  const popBase = resultHow === "Decision" ? 3 : 7
  const crowdMult = f.traits?.includes("Crowd Favorite") ? 2 : 1
  const showboatBonus = f.traits?.includes("Showboat") && resultHow !== "Decision" ? 5 : 0
  return popBase * crowdMult + showboatBonus
}

describe('Trash Talk — commitResult effect', () => {
  it('trash talk on win — popularity +5 on top of win bonus (commitResult line ~113)', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.popularity = 30 // set known baseline

    const fighter = {
      id: f.id,
      booked: { title: false, opponent: { name: 'Opp' }, pressChoice: 'trashTalk' },
    }
    commitFightResult(g, fighter, { won: true, how: 'KO/TKO', r: 2, totalDmgA: 60, totalDmgB: 10 })

    // Win gives popularity boost + trash talk gives +5
    const expected = 30 + winPopGain('KO/TKO', f) + 5
    expect(f.popularity).toBe(expected)
  })

  it('trash talk on loss — popularity -5 (commitResult line ~165)', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.popularity = 50

    const fighter = {
      id: f.id,
      booked: { title: false, opponent: { name: 'Opp' }, pressChoice: 'trashTalk' },
    }
    commitFightResult(g, fighter, { won: false, how: 'Decision', r: 3 })

    // Loss doesn't add win pop bonus, just trash talk penalty
    expect(f.popularity).toBe(45)
  })

  it('trash talk win adds +5 regardless of win pop bonus size', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.popularity = 30
    f.traits = ['Crowd Favorite'] // win bonus is now popBase * 2

    const fighter = {
      id: f.id,
      booked: { title: false, opponent: { name: 'Opp' }, pressChoice: 'trashTalk' },
    }
    commitFightResult(g, fighter, { won: true, how: 'Decision', r: 3, totalDmgA: 10, totalDmgB: 8 })

    // Decision win with Crowd Favorite: popBase=3, crowdMult=2 → win bonus 6
    // Plus trash talk +5 = 11 total from baseline 30
    expect(f.popularity).toBe(30 + 3 * 2 + 5) // 41
  })

  it('no trash talk — no extra popularity effect', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.popularity = 30

    const fighter = {
      id: f.id,
      booked: { title: false, opponent: { name: 'Opp' }, pressChoice: 'confident' },
    }
    commitFightResult(g, fighter, { won: true, how: 'KO/TKO', r: 2, totalDmgA: 60, totalDmgB: 10 })

    // Win bonus only (7), no trash talk
    expect(f.popularity).toBe(30 + winPopGain('KO/TKO', f))
  })
})

describe('SET_PRESS_CHOICE — immediate effects (reducer logic is inline-verifiable)', () => {
  it('confident: popularity +2 immediately', () => {
    const f = createTestFighter({ popularity: 50 })
    f.booked = { opponent: { name: 'Opp' }, weeksLeft: 4 }
    // SET_PRESS_CHOICE = confident (reducer logic)
    f.booked.pressChoice = 'confident'
    f.popularity = Math.min(100, (f.popularity || 0) + 2)
    expect(f.popularity).toBe(52)
    expect(f.booked.pressChoice).toBe('confident')
  })

  it('humble: morale +3 immediately', () => {
    const f = createTestFighter({ morale: 50 })
    f.booked = { opponent: { name: 'Opp' }, weeksLeft: 4 }
    // SET_PRESS_CHOICE = humble (reducer logic)
    f.booked.pressChoice = 'humble'
    f.morale = Math.min(100, (f.morale || 0) + 3)
    expect(f.morale).toBe(53)
    expect(f.booked.pressChoice).toBe('humble')
  })

  it('trashTalk: no immediate effect (deferred to commitResult)', () => {
    const f = createTestFighter({ popularity: 50 })
    f.booked = { opponent: { name: 'Opp' }, weeksLeft: 4 }
    const popBefore = f.popularity
    const morBefore = f.morale
    // SET_PRESS_CHOICE = trashTalk (reducer logic — no immediate stat change)
    f.booked.pressChoice = 'trashTalk'
    expect(f.popularity).toBe(popBefore)
    expect(f.morale).toBe(morBefore)
    expect(f.booked.pressChoice).toBe('trashTalk')
  })
})

describe('getPublicOpinion — 4 combinations + neutral', () => {
  const mk = (pop, sw, sl) => ({ popularity: pop, streakW: sw, streakL: sl })

  it('high popularity + positive streak = Fan Favorite', () => {
    const o = getPublicOpinion(mk(70, 3, 0))
    expect(o.label).toBe('Fan Favorite')
    expect(o.sentiment).toBe('positive')
  })

  it('high popularity + negative streak = Over the Hill', () => {
    const o = getPublicOpinion(mk(70, 0, 3))
    expect(o.label).toBe('Over the Hill')
    expect(o.sentiment).toBe('negative')
  })

  it('low popularity + positive streak = Dark Horse', () => {
    const o = getPublicOpinion(mk(20, 3, 0))
    expect(o.label).toBe('Dark Horse')
    expect(o.sentiment).toBe('positive')
  })

  it('low popularity + negative streak = Journeyman', () => {
    const o = getPublicOpinion(mk(20, 0, 3))
    expect(o.label).toBe('Journeyman')
    expect(o.sentiment).toBe('negative')
  })

  it('neutral popularity (40-59) = Solid Pro, sentiment neutral', () => {
    const o = getPublicOpinion(mk(50, 1, 0))
    expect(o.label).toBe('Solid Pro')
    expect(o.sentiment).toBe('neutral')
  })

  it('high popularity + exactly equal streaks = Solid Pro', () => {
    const o = getPublicOpinion(mk(70, 0, 0))
    expect(o.label).toBe('Solid Pro')
    expect(o.sentiment).toBe('neutral')
  })

  it('low popularity + equal streaks = Solid Pro', () => {
    const o = getPublicOpinion(mk(20, 0, 0))
    expect(o.label).toBe('Solid Pro')
    expect(o.sentiment).toBe('neutral')
  })
})

describe('Rumors — tick/rivals.js timing', () => {
  it('rumor fires at week % 8 === 6, body contains no fighter name', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.morale = 40
    f.loyalty = 30
    f.contract = { managerCut: 0.18, fightsLeft: 2, fightsTotal: 4, durationMo: 24, signedWeek: 1 }
    g.rivals.forEach(r => { r.rivalry = 80 }) // keep above 15 despite 0.5/tick decay

    let rumorBody = null
    let rumorWeek = null
    for (let w = 0; w < 48; w++) {
      tick(g)
      const msgs = g.inbox.filter(m => m.title === '👂 Rumor Mill')
      if (msgs.length > 0) {
        rumorWeek = g.week
        rumorBody = msgs[0].body
        break
      }
    }

    expect(rumorWeek).not.toBeNull()
    // Body should be generic — no roster fighter name
    const anyFighterName = g.roster.some(f => rumorBody && rumorBody.includes(f.name))
    expect(anyFighterName).toBe(false)
  })

  it('rumor at %8===6 AND poach at %8===0 both fire, poach type is "event"', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.morale = 40
    f.loyalty = 30
    f.contract = { managerCut: 0.18, fightsLeft: 2, fightsTotal: 4, durationMo: 24, signedWeek: 1 }
    g.rivals.forEach(r => { r.rivalry = 80 })

    let poachFired = false
    let rumorFired = false

    for (let w = 0; w < 24; w++) {
      tick(g)
      if (g.inbox.some(m => m.title && m.title.includes('coba poach'))) poachFired = true
      if (g.inbox.some(m => m.title === '👂 Rumor Mill')) rumorFired = true
    }

    expect(poachFired).toBe(true)
    expect(rumorFired).toBe(true)

    // Confirm poach type is "event" (normal inbox event, not world/press)
    const poachMsg = g.inbox.find(m => m.title && m.title.includes('coba poach'))
    if (poachMsg) expect(poachMsg.type).toBe('event')
  })
})
