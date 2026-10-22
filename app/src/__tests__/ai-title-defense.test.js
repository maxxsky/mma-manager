// P3 #43 (DU7): AI champions change less often. Was 27% of defenses lost and
// 3 of 8 divisions changing champion in the first 8 months.
import { describe, it, expect, afterEach } from 'vitest'
import { setRNG, mulberry32, resetRNG } from '@ironfist/engine/rng.js'
import { newGame } from '@ironfist/engine/state.js'
import { simulateAITitleDefenses } from '@ironfist/engine/world.js'
import { TICK_TITLE_DEFENSE, UPSET_BASE_CHANCE, UPSET_MIN, UPSET_MAX } from '@ironfist/engine/world/config.js'

afterEach(() => resetRNG())

describe('AI title defenses', () => {
  it('champions lose roughly 10–22% of defenses', () => {
    let defenses = 0, lost = 0
    for (let seed = 1; seed <= 40; seed++) {
      setRNG(mulberry32(seed * 7919))
      const g = newGame()
      for (let k = 1; k <= 5; k++) {
        g.week = TICK_TITLE_DEFENSE * k
        const before = Object.fromEntries(Object.entries(g.divisions).map(([wc, d]) => [wc, d.champ?.name]))
        simulateAITitleDefenses(g)
        for (const [wc, d] of Object.entries(g.divisions)) {
          if (!before[wc]) continue
          defenses++
          if (d.champ?.name !== before[wc]) lost++
        }
      }
    }
    const rate = lost / defenses
    expect(defenses).toBeGreaterThan(1000)
    expect(rate).toBeGreaterThan(0.10)
    expect(rate).toBeLessThan(0.22)
  })

  it('constants: lower base and range than before', () => {
    expect(UPSET_BASE_CHANCE).toBeLessThan(0.25)
    expect(UPSET_MAX).toBeLessThan(0.5)
    expect(UPSET_MIN).toBeLessThan(0.1)
  })
})
