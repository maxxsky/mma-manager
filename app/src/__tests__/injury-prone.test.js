// P2 #36 (FI4): Injury Prone is earned from serious injuries of any source,
// and has a description.
import { describe, it, expect, afterEach } from 'vitest'
import { setRNG, resetRNG } from '@ironfist/engine/rng.js'
import { ACQUIRED_TRAITS, TRAIT_KEYS, INJURY_PRONE_SERIOUS_INJURIES } from '@ironfist/engine/data.js'
import { commitFightResult } from '@ironfist/engine/fights/commitResult.js'
import { createTestGame } from './helpers.js'

afterEach(() => resetRNG())

describe('Injury Prone', () => {
  it('is an acquired trait with a description, never rolled at generation', () => {
    expect(ACQUIRED_TRAITS['Injury Prone']).toMatch(/2x/)
    expect(TRAIT_KEYS).not.toContain('Injury Prone')
  })

  it('a serious fight injury that reaches the threshold grants it immediately', () => {
    const g = createTestGame()
    const f = g.roster[0]
    Object.assign(f, { traits: [], seriousInjuries: INJURY_PRONE_SERIOUS_INJURIES - 1, injury: null })
    // First draw: injury happens; second: severity roll 0.9 → tier 2 (serious).
    const seq = [0, 0.9]; let i = 0
    setRNG(() => (i < seq.length ? seq[i++] : 0.5))
    commitFightResult(g, { id: f.id, booked: { opponent: { name: 'Opp', level: 0.8 }, show: 1000, winBonus: 500 } },
      { won: false, how: 'KO/TKO', r: 2, totalDmgA: 80, totalDmgB: 10 })
    expect(f.injury.tier).toBeGreaterThanOrEqual(2)
    expect(f.seriousInjuries).toBe(INJURY_PRONE_SERIOUS_INJURIES)
    expect(f.traits).toContain('Injury Prone')
  })
})
