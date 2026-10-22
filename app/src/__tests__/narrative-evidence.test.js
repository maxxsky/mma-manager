import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it } from 'vitest'
import { generateFightNarrative, detectSignatureMoments, getFightContext } from '@ironfist/engine/narrative.js'
import { scoreRound } from '@ironfist/engine/fight/scoring.js'
import { runFight, prepFighter } from '@ironfist/engine/fight.js'
import { genFighter } from '@ironfist/engine/fighter.js'
import { resolveGround } from '@ironfist/engine/fight/resolve-ground.js'
import { createCommentary } from '@ironfist/engine/fight/commentary.js'
import { reduceFight } from '@ironfist/engine/reducer/fight.js'
import { mulberry32, setRNG, resetRNG, random } from '@ironfist/engine/rng.js'
import { createTestFighter, createTestGame } from './helpers.js'
import ResultScreen from '../components/fight/ResultScreen.jsx'
import { t } from '../i18n/index.js'

afterEach(() => resetRNG())
const A = createTestFighter({ name: 'Alpha' })
const B = createTestFighter({ id: 'b', name: 'Beta' })
const decision = { won: true, how: 'Decision', r: 3 }
const round = (scoreA, scoreB, extra = {}) => ({ scoreA, scoreB, landA: 10, landB: 10, ...extra })

describe('narrative claims from fight evidence', () => {
  it('describes the grappler winning early rounds despite landing fewer strikes (seed 217 regression)', () => {
    const rounds = [round(41, 39, { landA: 17, landB: 29 }), round(72, 33, { landA: 11, landB: 19 }), round(30, 20)]
    const story = generateFightNarrative(A, B, rounds, decision)
    expect(story.narrative).toContain('Alpha took the early rounds despite landing fewer strikes')
    expect(story.narrative).not.toContain('Beta started fast')
    expect(story.keyMoments.some(m => m.type === 'early_domination')).toBe(true)
  })

  it('identifies a comeback only when the eventual KO winner was behind on earlier rounds, for either side', () => {
    const rounds = [round(10, 20), round(15, 25), round(5, 4, { finish: { by: 'A', how: 'KO/TKO' } })]
    const result = { won: true, how: 'KO/TKO', r: 3 }
    expect(detectSignatureMoments(A, rounds, result).some(m => m.id === 'comeback_ko')).toBe(true)
    expect(generateFightNarrative(A, B, rounds, result).keyMoments.some(m => m.type === 'comeback_ko')).toBe(true)
    const swapped = rounds.map(r => ({ ...r, scoreA: r.scoreB, scoreB: r.scoreA,
      finish: r.finish ? { ...r.finish, by: 'B' } : null }))
    expect(detectSignatureMoments(A, swapped, { ...result, won: false }).some(m => m.id === 'comeback_ko')).toBe(true)
    const led = [round(20, 10), round(25, 15), rounds[2]]
    expect(detectSignatureMoments(A, led, result).some(m => m.id === 'comeback_ko')).toBe(false)
  })

  it('does not call a three-round sweep razor-close just because raw points have a small gap', () => {
    const story = generateFightNarrative(A, B, [round(11, 10), round(11, 10), round(11, 10)], decision)
    expect(story.keyMoments.some(m => m.type === 'close_decision')).toBe(false)
  })

  it('does not call failed submission skill checks or mixed-side attempts a submission clinic', () => {
    const stalled = [1, 2, 3].map(() => round(10, 10, { log: ['Alpha lacks submission skills — position stalled.'] }))
    expect(detectSignatureMoments(A, stalled, decision).some(m => m.id === 'sub_clinic')).toBe(false)
    const mixed = [round(10, 10, { subAttemptsA: 2, subAttemptsB: 1 })]
    expect(detectSignatureMoments(A, mixed, decision).some(m => m.id === 'sub_clinic')).toBe(false)
    mixed[0].subAttemptsB = 3
    expect(detectSignatureMoments(A, mixed, decision).some(m => m.id === 'sub_clinic')).toBe(true)
  })

  it('uses explicit resolver counts for successful-skill submission attempts and no counts for stalls', () => {
    const attacker = prepFighter(createTestFighter({ archetype: 'BJJ Specialist', attrs: { ...A.attrs, bjj: 80 } }))
    const defender = prepFighter(B)
    setRNG(() => 0.99)
    const action = resolveGround('sub', attacker, defender, 100, 100, { type: 'halfGuard', top: 'A' }, {}, 0, 0, 75, createCommentary(), 1, 0)
    expect(action.subAttemptsA).toBe(1)
    expect(action.subAttemptsB).toBe(0)
    const stall = resolveGround('sub', { ...attacker, archetype: 'Boxer', attrs: { ...attacker.attrs, bjj: 10 } }, defender,
      100, 100, { type: 'halfGuard', top: 'A' }, {}, 0, 0, 75, createCommentary(), 1, 0)
    expect(stall.subAttemptsA || 0).toBe(0)
  })

  it.each([true, false])('distinguishes challenging from defending a title in narrative and banner (defense=%s)', defense => {
    const fighter = { ...A, booked: { title: true, titleTier: 'Regional', defense } }
    const rounds = [round(20, 10), round(20, 10), round(20, 10)]
    const story = generateFightNarrative(fighter, B, rounds, decision)
    expect(story.narrative).toContain(defense ? 'remains the champion' : 'claims the championship')
    const loss = generateFightNarrative(fighter, B, rounds, { ...decision, won: false })
    expect(loss.narrative).toContain(defense ? 'loses the championship' : 'fails to claim the championship')
    const html = renderToStaticMarkup(React.createElement(ResultScreen, { fighter, opp: B, roundLogs: rounds, result: decision, totalRounds: 3 }))
    expect(html).toContain(t(defense ? 'RESULT.andStill' : 'RESULT.andNew').replace('{0}', A.weightClass))
    expect(getFightContext(fighter, B, {}).find(c => c.type === 'title').text).toContain(defense ? 'puts' : 'challenges')
  })

  it('does not label a favorite beating a top-three fighter as an upset, or round four of five as a final-round finish', () => {
    const fighter = { ...A, booked: { title: true, oppRank: 2, playerRank: 1 } }
    const rounds = [round(20, 10)]
    const moments = detectSignatureMoments(fighter, rounds, { won: true, how: 'KO/TKO', r: 4 })
    expect(moments.some(m => m.id === 'upset' || m.id === 'last_minute')).toBe(false)
    expect(detectSignatureMoments(fighter, rounds, { won: true, how: 'KO/TKO', r: 5 }).some(m => m.id === 'last_minute')).toBe(true)
  })

  it.each(['ACCEPT_FIGHT', 'COUNTER_FIGHT'])('records the player ranking when booking through %s', type => {
    const g = createTestGame()
    const f = g.roster[0]
    f.rankPoints = 0
    reduceFight(g, { type, fighterId: f.id, opponent: B, tier: 'Local', oppRank: 2, rel: 30 })
    expect(f.booked).toHaveProperty('playerRank', null)
  })

  it('never reverses the winner of both completed opening rounds in 2,000 real fights, without consuming RNG', () => {
    let checked = 0
    for (let seed = 1; seed <= 2000; seed++) {
      setRNG(mulberry32(seed))
      const a = prepFighter(genFighter(1)), b = prepFighter(genFighter(1))
      const fight = runFight(a, b, 'Balanced', () => 'neutral', seed, 3)
      const early = fight.roundLogs.slice(0, 2)
      if (early.length < 2 || early.some(r => r.finish)) continue
      const cards = early.map(scoreRound)
      if (!cards.every(r => r.winner === cards[0].winner) || cards[0].winner === 'draw') continue
      const snapshot = mulberry32(seed + 10000)
      const expected = snapshot()
      setRNG(mulberry32(seed + 10000))
      const story = generateFightNarrative(a, b, fight.roundLogs, { won: fight.winner === 'A', how: fight.how, r: fight.round })
      const leader = cards[0].winner === 'A' ? a.name : b.name
      expect(story.narrative.startsWith(`${leader} took the early rounds`)).toBe(true)
      expect(random()).toBe(expected)
      checked++
    }
    expect(checked).toBeGreaterThan(300)
  })
})
