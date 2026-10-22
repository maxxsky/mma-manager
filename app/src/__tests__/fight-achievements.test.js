import { afterEach, describe, expect, it } from 'vitest'
import { createTestGame, createTestFighter } from './helpers.js'
import { commitFightResult } from '@ironfist/engine/fights/commitResult.js'
import { checkAchievements } from '@ironfist/engine/achievements.js'
import { reduceContract } from '@ironfist/engine/reducer/contract.js'
import { setRNG, resetRNG } from '@ironfist/engine/rng.js'
import { applyFightCompletion } from '../services/fightCompletion.js'

afterEach(() => resetRNG())

function setup() {
  const f = createTestFighter()
  return createTestGame({ roster: [f], cash: 50000 })
}
function finish(g, { how = 'KO/TKO', won = true, tier = null, fighterId = g.roster[0].id } = {}) {
  const fighter = g.roster.find(f => f.id === fighterId)
  fighter.booked = { title: !!tier, titleTier: tier, tier: 'Local', show: 1000,
    opponent: createTestFighter({ id: 'opponent', name: 'Opponent' }) }
  setRNG(() => 0.99)
  return applyFightCompletion(g, state => commitFightResult(state, fighter, { won, how, r: 1 }), {
    fightResult: { won, how },
  })
}

describe('fight completion achievement context', () => {
  it.each([['KO/TKO', 'first_ko'], ['Doctor Stoppage', 'first_ko'], ['Submission', 'first_sub']])(
    'unlocks first win and the correct %s achievement after committing the result', (how, id) => {
      const g = setup()
      const { state, newly } = finish(g, { how })
      expect(newly).toContain('first_win')
      expect(newly).toContain(id)
      expect(state.roster[0].record.w).toBe(1)
      expect(g.roster[0].record.w).toBe(0)
      expect(checkAchievements(state, { fightResult: { won: true, how } })).toEqual([])
    },
  )

  it.each(['KO/TKO', 'Doctor Stoppage', 'Submission'])('a loss by %s grants no victory achievement', how => {
    const { state, newly } = finish(setup(), { how, won: false, tier: 'Regional' })
    expect(newly).not.toContain('first_win')
    expect(newly).not.toContain('first_ko')
    expect(newly).not.toContain('first_sub')
    expect(newly).not.toContain('first_title')
    expect(state.roster[0].koStreak).toBe(0)
  })

  it('unlocks the title achievement from the actual awarded belt, and only once', () => {
    let g = setup()
    const first = finish(g, { tier: 'Regional' })
    expect(first.newly).toContain('first_title')
    expect(first.state.roster[0].titles).toContain('Regional Champion')
    g = first.state
    expect(finish(g, { tier: 'Regional' }).newly).not.toContain('first_title')
  })

  it('counts three consecutive KO wins for the same fighter across save/load', () => {
    let g = setup()
    g = finish(g).state
    g = finish(g).state
    expect(g._unlocked).not.toContain('ko_streak_3')
    g = JSON.parse(JSON.stringify(g))
    const third = finish(g)
    expect(third.state.roster[0].koStreak).toBe(3)
    expect(third.newly).toContain('ko_streak_3')
  })

  it.each([['Decision', true], ['Submission', true], ['KO/TKO', false]])(
    'a %s result (won=%s) breaks the KO streak', (how, won) => {
      let g = finish(finish(setup()).state).state
      g = finish(g, { how, won }).state
      expect(g.roster[0].koStreak).toBe(0)
      const next = finish(g)
      expect(next.state.roster[0].koStreak).toBe(1)
      expect(next.newly).not.toContain('ko_streak_3')
    },
  )

  it('does not combine KO wins from different fighters', () => {
    let g = setup()
    g.roster.push(createTestFighter({ id: 'second-fighter', name: 'Second Fighter' }))
    g = finish(g).state
    g = finish(g, { fighterId: 'second-fighter' }).state
    const third = finish(g)
    expect(third.state.roster[0].koStreak).toBe(2)
    expect(third.newly).not.toContain('ko_streak_3')
  })

  it('continues a legacy streak from fight history without a koStreak field', () => {
    const g = setup()
    g.roster[0].fightHistory = [{ result: 'W', method: 'KO/TKO' }, { result: 'W', method: 'KO/TKO' }]
    expect(finish(g).newly).toContain('ko_streak_3')
  })

  it('does not infer a title win from a raw UI flag when no belt was awarded', () => {
    const g = setup()
    g.divisions = {}
    expect(finish(g, { tier: 'Regional' }).newly).not.toContain('first_title')
  })

  it('cancellation changes state without awarding a win or finish', () => {
    const g = setup()
    const { newly } = applyFightCompletion(g, n => { n.roster[0].booked = null; n.rep -= 4 })
    expect(newly).toEqual([])
  })

  it('a drawn result cannot unlock KO, submission or title victories', () => {
    const g = setup()
    const newly = checkAchievements(g, { fightResult: { won: true, draw: true, how: 'KO/TKO', titleWon: true } })
    expect(newly.filter(id => ['first_win', 'first_ko', 'first_title'].includes(id))).toEqual([])
  })
})

describe('S-grade prospect signing context', () => {
  const deal = { signBonus: 1000, cut: 0.2, fights: 4, duration: 12 }
  it.each(['S', 'A'])('checks the actual grade %s when signing succeeds', grade => {
    const g = setup()
    g.prospects = [{ id: 'prospect', grade, fighter: createTestFighter({ id: 'new-fighter' }) }]
    reduceContract(g, { type: 'SIGN_CONTRACT', mode: 'sign', prospectId: 'prospect', deal })
    expect(g.roster).toHaveLength(2)
    expect(g._unlocked?.includes('sign_s_prospect') || false).toBe(grade === 'S')
    const logs = g.log.filter(l => l.includes('Talent Scout'))
    reduceContract(g, { type: 'SIGN_CONTRACT', mode: 'sign', prospectId: 'prospect', deal })
    expect(g.log.filter(l => l.includes('Talent Scout'))).toEqual(logs)
  })

  it('does not award for a nonexistent prospect or an extension', () => {
    const g = setup()
    reduceContract(g, { type: 'SIGN_CONTRACT', mode: 'sign', prospectId: 'absent', signedSProspect: true, deal })
    reduceContract(g, { type: 'SIGN_CONTRACT', mode: 'extend', fighterId: g.roster[0].id, signedSProspect: true, deal })
    expect(g._unlocked || []).not.toContain('sign_s_prospect')
  })
})
