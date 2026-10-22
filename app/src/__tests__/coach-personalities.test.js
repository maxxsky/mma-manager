// P2 #29 (CA3): Motivator and Player's Coach do what their descriptions say.
import { describe, it, expect, afterEach } from 'vitest'
import { setRNG, resetRNG } from '@ironfist/engine/rng.js'
import { commitFightResult } from '@ironfist/engine/fights/commitResult.js'
import { tickTraining } from '@ironfist/engine/tick/training.js'
import { COACH_PERSONALITIES } from '@ironfist/engine/data.js'
import { PLAYERS_COACH_POP_MULT, STAR_POWER_POP_MULT, MOTIVATOR_RECOVERY_MULT } from '@ironfist/engine/ambitions.js'
import { createTestGame } from './helpers.js'

afterEach(() => resetRNG())

const coach = (personality) => ({ id: `c-${personality}`, name: 'Coach', spec: 'striking', skill: 5, salary: 1000, personality })

function popAfterWin(personality, ambition = 'Grinder') {
  const g = createTestGame()
  g.coaches = personality ? [coach(personality)] : [coach('Technician')]
  const f = g.roster[0]
  Object.assign(f, { ambition, popularity: 20, morale: 50, traits: [], injury: null })
  setRNG(() => 0.99)
  commitFightResult(g, { id: f.id, booked: { opponent: { name: 'Opp', level: 0.8 }, show: 1000, winBonus: 500, tier: 'Local' } },
    { won: true, how: 'KO/TKO', r: 1, totalDmgA: 10, totalDmgB: 50 })
  resetRNG()
  return f.popularity - 20
}

function moraleAfterWeek(personality, streakL) {
  const g = createTestGame()
  g.coaches = [coach(personality)]
  g.roster = [g.roster[0]]
  const f = g.roster[0]
  Object.assign(f, { morale: 40, streakL, injury: null, booked: null, overtraining: 0, traits: [] })
  setRNG(() => 0.99) // no training injury
  tickTraining(g)
  resetRNG()
  return f
}

describe("Player's Coach", () => {
  it('fight popularity gain +15%, stacking with Star Power', () => {
    const base = popAfterWin('Technician')
    expect(base).toBeGreaterThan(0)
    expect(popAfterWin("Player's Coach")).toBeCloseTo(base * PLAYERS_COACH_POP_MULT)
    expect(popAfterWin("Player's Coach", 'Star Power')).toBeCloseTo(base * PLAYERS_COACH_POP_MULT * STAR_POWER_POP_MULT)
  })

  it('description lists every effect it has', () => {
    expect(COACH_PERSONALITIES["Player's Coach"].desc).toMatch(/Chemistry \+2/)
    expect(COACH_PERSONALITIES["Player's Coach"].desc).toMatch(/popularity gain \+15%/)
    expect(COACH_PERSONALITIES["Player's Coach"].desc).toMatch(/talenta/)
  })
})

describe('Motivator', () => {
  it('weekly morale recovery is 20% faster after a loss, unchanged otherwise', () => {
    const tech = moraleAfterWeek('Technician', 1).morale - 40
    const motivLoss = moraleAfterWeek('Motivator', 1).morale - 40
    const motivNoLoss = moraleAfterWeek('Motivator', 0).morale - 40
    expect(motivLoss - motivNoLoss).toBeCloseTo(2 * (MOTIVATOR_RECOVERY_MULT - 1))
    expect(motivNoLoss).toBeCloseTo(tech)
  })
})
