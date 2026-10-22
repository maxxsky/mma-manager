// Inbox choices apply every effect they list (found while doing P2 #32), and
// the chemistry events no longer have a free option that is strictly best.
import { describe, it, expect, afterEach } from 'vitest'
import { setRNG, resetRNG } from '@ironfist/engine/rng.js'
import { reducer } from '@ironfist/engine/reducer.js'
import { tickChemistry, campBondingCost } from '@ironfist/engine/tick/chemistry.js'
import { createTestGame } from './helpers.js'

afterEach(() => resetRNG())

function choose(g, choices, i, extra = {}) {
  g.inbox.unshift({ id: 'm', type: 'event', title: 't', choices })
  reducer(g, { type: 'INBOX_EVENT', messageId: 'm', choiceIndex: i, choice: choices[i], ...extra })
}

describe('INBOX_EVENT applies every effect on a choice', () => {
  it('retention bonus: charges the cash AND raises morale (used to be free)', () => {
    const g = createTestGame(); const f = g.roster[0]; f.morale = 40; const cash = g.cash
    choose(g, [{ label: 'Bonus retensi $5,000', cash: -5000, moraleTo: { id: f.id, amt: 30 } }], 0)
    expect(g.cash).toBe(cash - 5000)
    expect(f.morale).toBe(70)
  })

  it('paid party: charges the cash AND raises chemistry (chemistry used to be dropped)', () => {
    const g = createTestGame(); g.chemistry = 50; const cash = g.cash
    choose(g, [{ label: 'Pesta besar ($5,000, chemistry +8)', cash: -5000, chem: 8 }], 0)
    expect(g.cash).toBe(cash - 5000)
    expect(g.chemistry).toBe(58)
  })

  it('a choice with a handler key still applies its chem', () => {
    const g = createTestGame(); g.chemistry = 50; const f = g.roster[0]
    choose(g, [{ label: 'x', chem: -5, complaint: f.id }], 0)
    expect(g.chemistry).toBe(45)
  })

  it('uses the choice stored on the message, not one invented by the caller', () => {
    const g = createTestGame(); const cash = g.cash
    g.inbox.unshift({ id: 'm', type: 'event', title: 't', choices: [{ label: 'Small', cash: -100 }] })
    reducer(g, { type: 'INBOX_EVENT', messageId: 'm', choiceIndex: 0, choice: { label: 'Small', cash: 1e9 } })
    expect(g.cash).toBe(cash - 100)
  })

  it('gambles are rolled by the engine RNG when no roll is passed', () => {
    const outcome = (r) => {
      const g = createTestGame(); g.chemistry = 50
      setRNG(() => r)
      choose(g, [{ label: 'g', gamble: [6, -8] }], 0)
      resetRNG()
      return g.chemistry
    }
    expect(outcome(0.1)).toBe(56)
    expect(outcome(0.9)).toBe(42)
  })
})

describe('chemistry events (P2 #32)', () => {
  function eventFor(rollValue) {
    const g = createTestGame()
    g.inbox = []
    // random() order in tickChemistry: event gate, event roll, then picks.
    const seq = [0, rollValue]; let i = 0
    setRNG(() => (i < seq.length ? seq[i++] : 0.3))
    tickChemistry(g)
    resetRNG()
    return { g, m: g.inbox[0] }
  }

  it('sparring conflict: mediation costs money; separating is free but smaller', () => {
    const { g, m } = eventFor(0.1)
    expect(m.title).toBe('Konflik sparring')
    const mediation = m.choices.find((c) => /Mediasi/.test(c.label))
    const separate = m.choices.find((c) => /Pisahkan/.test(c.label))
    expect(mediation.cash).toBe(-Math.round(campBondingCost(g) * 0.5))
    expect(mediation.chem).toBeGreaterThan(separate.chem)
    expect(separate.cash).toBeUndefined()
  })

  it('jealousy: special attention helps the jealous fighter and costs the star some morale', () => {
    const { g, m } = eventFor(0.5)
    expect(m.title).toMatch(/cemburu/)
    const attention = m.choices[0]
    const [jealous, star] = attention.moraleTo
    const fj = g.roster.find((f) => f.id === jealous.id), fs = g.roster.find((f) => f.id === star.id)
    const before = { j: fj.morale, s: fs.morale, chem: g.chemistry }
    choose(g, m.choices, 0)
    expect(fj.morale).toBe(Math.min(100, before.j + 6))
    expect(fs.morale).toBe(Math.max(0, before.s - 4))
    expect(g.chemistry).toBe(Math.min(100, before.chem + 3))
  })
})
