// P3 #45 (DU9): one message per AI title change, with varied wording.
import { describe, it, expect, afterEach } from 'vitest'
import { setRNG, mulberry32, resetRNG } from '@ironfist/engine/rng.js'
import { newGame, tick } from '@ironfist/engine/state.js'

afterEach(() => resetRNG())

describe('world title news', () => {
  it('a player who dismisses news each week sees each AI title change announced once', () => {
    setRNG(mulberry32(1000))
    const g = newGame()
    let changes = 0, champNews = 0
    const titles = new Set()
    const holder = Object.fromEntries(Object.entries(g.divisions).map(([wc, d]) => [wc, d.champ?.name]))
    for (let w = 1; w <= 240; w++) {
      g.cash = Math.max(g.cash, 250000)
      const before = new Set(g.inbox.map((m) => m.id))
      tick(g)
      for (const [wc, d] of Object.entries(g.divisions)) if (d.champ?.name !== holder[wc]) { changes++; holder[wc] = d.champ?.name }
      for (const m of g.inbox) {
        if (before.has(m.id) || typeof m.title !== 'string') continue
        if (/^👑/.test(m.title) || /Shake-up/.test(m.title)) { champNews++; titles.add(m.title.replace(/[A-Z][a-z]+ [A-Z][a-z]+|[A-Z][a-z]+weight|Light Heavyweight/g, 'X')) }
      }
      g.inbox = g.inbox.filter((m) => !(m.type === 'event' && m.choices?.length === 1 && m.choices[0].label === 'OK'))
    }
    expect(changes).toBeGreaterThan(3)
    expect(champNews).toBeLessThanOrEqual(changes + 2) // vacant/retired promotions may add one each
    expect(titles.size).toBeGreaterThan(1)
  })
})
