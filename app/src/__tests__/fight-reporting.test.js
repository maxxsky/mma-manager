import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { fightTotals, fightNightBonus } from '@ironfist/engine/fight/report.js'
import { fightPurse } from '@ironfist/engine/fight/purse.js'
import { commitFightResult } from '@ironfist/engine/fights/commitResult.js'
import { simRound, prepFighter } from '@ironfist/engine/fight.js'
import { setRNG, mulberry32, resetRNG } from '@ironfist/engine/rng.js'
import { createTestGame, createTestFighter } from './helpers.js'
import ResultScreen from '../components/fight/ResultScreen.jsx'
import Scoreboard from '../components/fight/Scoreboard.jsx'

afterEach(() => resetRNG())
const rounds = [
  { duringRound: 1, landA: 15, landB: 14, tdA: 2, tdB: 0, scoreA: 20, scoreB: 10 },
  { duringRound: 2, landA: 15, landB: 16, tdA: 0, tdB: 1, scoreA: 10, scoreB: 20 },
  { duringRound: 3, landA: 15, landB: 12, tdA: 1, tdB: 0, scoreA: 20, scoreB: 19 },
]

describe('fight statistics and FOTN settlement', () => {
  it('sums the actual STR/TD totals across all rounds', () => {
    expect(fightTotals(rounds)).toEqual({ landA: 45, landB: 42, tdA: 3, tdB: 1 })
  })

  it.each([true, false])('pays the awarded bonus and displays the same camp share, won=%s', won => {
    const fighter = createTestFighter({ booked: { show: 1000, winBonus: 500, tier: 'Local' }, contract: { managerCut: 0.2 } })
    const result = { won, how: 'Decision', r: 3, roundLogs: rounds }
    const g = createTestGame({ roster: [structuredClone(fighter)] })
    const before = g.cash
    const expected = (1000 + (won ? 500 : 0) + 50000) * 0.2
    setRNG(() => 0.99)
    commitFightResult(g, fighter, result)
    expect(g.cash - before).toBe(expected)
    expect(fightPurse(fighter.booked, result).fightNight).toBe(50000)
    const html = renderToStaticMarkup(React.createElement(ResultScreen, {
      fighter, opp: createTestFighter({ name: 'Opponent' }), roundLogs: rounds, result, totalRounds: 3,
    }))
    expect(html).toContain('$50,000')
    expect(html).toContain(expected.toLocaleString('en-US'))
    expect(html).toContain('45')
  })

  it('grants no bonus for an ordinary victory, a one-sided fight, missing stats or a fabricated award flag', () => {
    const result = { won: true, how: 'Decision', r: 3, fightNight: 50000 }
    expect(fightNightBonus([], result)).toBe(0)
    expect(fightNightBonus(rounds.map(r => ({ ...r, scoreA: 30, scoreB: 5 })), result)).toBe(0)
    expect(fightNightBonus(rounds.map(r => ({ landA: r.landA, landB: r.landB })), result)).toBe(0)
    expect(fightPurse({ show: 1000 }, result).purse).toBe(1000)
    const html = renderToStaticMarkup(React.createElement(ResultScreen, {
      fighter: createTestFighter({ booked: { show: 1000 } }), opp: createTestFighter(),
      roundLogs: [rounds[0]], result: { won: true, how: 'KO/TKO', r: 1 }, totalRounds: 3,
    }))
    expect(html).not.toContain('Fight of the Night')
    expect(html).not.toContain('$50,000')
  })

  it('keeps catchweight forfeiture on the contracted purse and adds the actual performance bonus', () => {
    const result = { won: true, how: 'Decision', r: 3, weighinIssue: 'catchweight', roundLogs: rounds }
    expect(fightPurse({ show: 1000, winBonus: 500 }, result)).toMatchObject({ forfeit: 450, fightNight: 50000, purse: 51050 })
  })

  it('keeps zero HP and stamina on the scoreboard instead of displaying 100', () => {
    const html = renderToStaticMarkup(React.createElement(Scoreboard, {
      fighter: createTestFighter(), opp: createTestFighter(), state: { hpA: 0, hpB: 0, staA: 0, staB: 0 },
      rnd: 1, totalRounds: 3, totalLandA: 45, totalLandB: 42, totalTdA: 3, totalTdB: 1,
    }))
    expect(html).not.toContain('width:100%')
    expect(html).toContain('width:0%')
  })
})

describe('engine reporting from real rounds', () => {
  it('reports every successful takedown rather than the final ground position', () => {
    const A = prepFighter(createTestFighter({ name: 'Alpha' }))
    const B = prepFighter(createTestFighter({ id: 'b', name: 'Beta' }))
    let multiple = false
    for (let seed = 0; seed < 200; seed++) {
      setRNG(mulberry32(seed))
      const round = simRound(1, A, B, 100, 100, 'Take It Down', 'neutral')
      expect(round.tdA).toBe(round.log.filter(l => l.includes('Alpha shoots — takedown!')).length)
      expect(round.tdB).toBe(round.log.filter(l => l.includes('Beta shoots — takedown!')).length)
      multiple ||= round.tdA > 1 || round.tdB > 1
    }
    expect(multiple).toBe(true)
  })

  it('keeps summary and tick timestamps ordered and inside the five-minute round', () => {
    const A = prepFighter(createTestFighter({ traits: ['Explosive', 'Warrior'] }))
    const B = prepFighter(createTestFighter({ id: 'b', traits: ['Iron Chin', 'Glass Jaw'] }))
    const time = line => { const [, m, s] = line.match(/^\[(\d+):(\d+)\]/); return Number(m) * 60 + Number(s) }
    for (let seed = 0; seed < 200; seed++) {
      setRNG(mulberry32(seed))
      const round = simRound(1, A, B, 100, 100, 'Finish It', 'go')
      for (const lines of [round.log, round.tickLog]) {
        const times = lines.map(time)
        expect(times).toEqual([...times].sort((a, b) => a - b))
        expect(Math.max(...times)).toBeLessThanOrEqual(300)
        expect(lines[0]).toContain('bell rings')
      }
    }
  })
})
