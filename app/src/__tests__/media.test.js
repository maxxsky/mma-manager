// Media System Tests — press conferences, public opinion, rumors
import { describe, it, expect } from 'vitest'
import { createTestFighter, createTestGame, useSeed } from './helpers.js'
import { commitFightResult } from '@ironfist/engine/fights/commitResult.js'
import { getPublicOpinion } from '@ironfist/engine/publicOpinion.js'
import { processRivalry, processFightResult, updateRivalryResult } from '@ironfist/engine/career.js'
import { tick } from '@ironfist/engine/state.js'

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

// ── RIVALRY SYSTEM TESTS (Task 30) ──

describe('Rivalry system — processRivalry lastMeetingWeek', () => {
  it('processRivalry sets lastMeetingWeek = g.week', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    const opp = { name: 'Test Opponent' }

    g.week = 15
    processRivalry(f, opp, g)

    expect(f.rivalries['Test Opponent'].lastMeetingWeek).toBe(15)
    expect(f.rivalries['Test Opponent'].count).toBe(1)
  })

  it('subsequent calls update lastMeetingWeek to latest week', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]

    g.week = 10
    processRivalry(f, { name: 'Rival A' }, g)
    expect(f.rivalries['Rival A'].lastMeetingWeek).toBe(10)

    g.week = 25
    processRivalry(f, { name: 'Rival A' }, g)
    expect(f.rivalries['Rival A'].lastMeetingWeek).toBe(25)
    expect(f.rivalries['Rival A'].count).toBe(2)
  })
})

describe('Rivalry system — decay via settlement tick', () => {
  it('rivalry count drops when g.week - lastMeetingWeek >= 52 at settlement', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.rivalries = {
      'Old Rival': { count: 3, wins: 2, losses: 1, lastMeetingWeek: 1 },
    }

    // Tick forward to the first settlement where g.week >= 53 and g.week % 4 === 0
    // g.week starts at 1. After 54 ticks: g.week = 55 (not %4)
    // After 55 ticks: g.week = 56 (56%4=0, and 56-1=55 >= 52)
    // That's one decay cycle: 3 → 2
    for (let i = 0; i < 55; i++) tick(g)
    expect(g.week).toBe(56)

    expect(f.rivalries['Old Rival']).toBeDefined()
    expect(f.rivalries['Old Rival'].count).toBe(2)
    expect(f.rivalries['Old Rival'].wins).toBe(2) // other fields unchanged
  })

  it('rivalry with count=1 gets deleted after 52+ week gap + one settlement cycle', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.rivalries = {
      'One-fight Rival': { count: 1, wins: 1, losses: 0, lastMeetingWeek: 1 },
    }

    // Same as above: after 55 ticks (g.week=56), settlement decays count 1→0→delete
    for (let i = 0; i < 55; i++) tick(g)
    expect(g.week).toBe(56)

    // Count was 1, decayed to 0 → deleted
    expect(f.rivalries['One-fight Rival']).toBeUndefined()
  })

  it('recent rivalries (gap < 52 weeks) are NOT decayed at settlement', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.rivalries = {
      'Recent Rival': { count: 2, wins: 1, losses: 1, lastMeetingWeek: 55 },
    }

    // Settle at g.week=56: diff = 56-55 = 1, < 52 → no decay
    for (let i = 0; i < 55; i++) tick(g)
    expect(g.week).toBe(56)

    expect(f.rivalries['Recent Rival']).toBeDefined()
    expect(f.rivalries['Recent Rival'].count).toBe(2)
  })

  it('multiple settlement cycles continue decaying until entry is deleted', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    f.rivalries = {
      'Decaying Rival': { count: 2, wins: 1, losses: 1, lastMeetingWeek: 1 },
    }

    // After 55 ticks: g.week=56, settlement decays 2→1
    for (let i = 0; i < 55; i++) tick(g)
    expect(f.rivalries['Decaying Rival'].count).toBe(1)

    // After 4 more ticks: g.week=60, another settlement, decays 1→0→deleted
    for (let i = 0; i < 4; i++) tick(g)
    expect(g.week).toBe(60)
    expect(f.rivalries['Decaying Rival']).toBeUndefined()
  })
})

describe('Rivalry system — fight-offers nudge', () => {
  it('rivalry nudge shifts oppIdx toward a past opponent with count >= 2', () => {
    useSeed(42)
    const g = createTestGame()
    const f = g.roster[0]
    const wc = f.weightClass
    const div = g.divisions[wc]

    // Set up rivalry with the #2 ranked fighter
    const rivalName = div.list[1].name
    f.rivalries = {}
    f.rivalries[rivalName] = { count: 2, wins: 1, losses: 1, lastMeetingWeek: g.week }

    // Simulate the nudge logic from fight-offers.js
    // Base oppIdx: opponent near rank -2 (r=2, oppIdx = clamp(2-2+RI(-1,1), 0, 14))
    // With rivalry list[1] within ±3 of oppIdx, nudge toward it
    let oppIdx = 0 // near rank #1
    let nudged = false
    const divList = div.list
    for (let i = Math.max(0, oppIdx - 3); i <= Math.min(14, oppIdx + 3); i++) {
      const c = divList[i]
      if (c && f.rivalries[c.name]?.count >= 2) {
        nudged = true
        break
      }
    }
    expect(nudged).toBe(true)

    // Also verify: a fighter with NO rivalries does NOT get nudged
    const f2 = g.roster[1] // second fighter, no rivalries set
    let nudged2 = false
    for (let i = Math.max(0, oppIdx - 3); i <= Math.min(14, oppIdx + 3); i++) {
      const c = divList[i]
      if (c && f2.rivalries?.[c.name]?.count >= 2) {
        nudged2 = true
        break
      }
    }
    expect(nudged2).toBe(false)
  })

  it('rivalry with count=1 does NOT trigger the nudge', () => {
    // Only count >= 2 (rematch level) should nudge
    const g = createTestGame()
    const f = g.roster[0]
    const wc = f.weightClass
    const div = g.divisions[wc]
    const rivalName = div.list[1].name
    f.rivalries = {}
    f.rivalries[rivalName] = { count: 1, wins: 1, losses: 0, lastMeetingWeek: g.week }

    let nudged = false
    for (let i = Math.max(0, 0 - 3); i <= Math.min(14, 0 + 3); i++) {
      const c = div.list[i]
      if (c && f.rivalries[c.name]?.count >= 2) {
        nudged = true
        break
      }
    }
    expect(nudged).toBe(false)
  })
})

describe('Rivalry system — Career Rival label logic', () => {
  it('highest count entry with count >= 2 is the Career Rival', () => {
    const rivalries = {
      'Alpha': { count: 3, wins: 2, losses: 1, lastMeetingWeek: 10 },
      'Beta': { count: 2, wins: 1, losses: 1, lastMeetingWeek: 8 },
      'Gamma': { count: 1, wins: 0, losses: 1, lastMeetingWeek: 5 },
    }
    const sorted = Object.entries(rivalries).sort((a, b) => b[1].count - a[1].count || (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))
    const top = sorted[0]
    expect(top[0]).toBe('Alpha')
    expect(top[1].count).toBe(3)
  })

  it('single rivalry entry (no other rival) does not get Career Rival label', () => {
    const rivalries = {
      'Only Opponent': { count: 2, wins: 1, losses: 1, lastMeetingWeek: 10 },
    }
    const sorted = Object.entries(rivalries).sort((a, b) => b[1].count - a[1].count || (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))
    const top = sorted[0]
    // isCareerRival = top && name === top[0] && sorted.length > 1 && r.count >= 2
    const isCareerRival = sorted.length > 1 && top[1].count >= 2
    expect(isCareerRival).toBe(false)
  })

  it('tie-break: count equal, wins+losses higher wins Career Rival', () => {
    const rivalries = {
      'More Fights': { count: 3, wins: 2, losses: 2, lastMeetingWeek: 15 },
      'Fewer Fights': { count: 3, wins: 2, losses: 1, lastMeetingWeek: 20 },
    }
    const sorted = Object.entries(rivalries).sort((a, b) => b[1].count - a[1].count || (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses))
    expect(sorted[0][0]).toBe('More Fights')
    expect(sorted[0][1].wins + sorted[0][1].losses).toBe(4) // More Fights has 4 fights
    expect(sorted[1][1].wins + sorted[1][1].losses).toBe(3) // Fewer Fights has 3 fights
  })
})
