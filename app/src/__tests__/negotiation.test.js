// P2 #27 (EK3): the agent's counter-offer lowers the camp cut (it used to
// raise it, against the agent's own client), negotiation runs in the engine,
// and clauses with no effect in the game are gone.
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, afterEach } from 'vitest'
import { setRNG, resetRNG } from '@ironfist/engine/rng.js'
import { AGENT_TYPES, CAMP_TIERS } from '@ironfist/engine/data.js'
import { reducer } from '@ironfist/engine/reducer.js'
import {
  acceptChance, isWeakOffer, counterOffer, sanitizeOffer, defaultOffer, NEGO_CUT_OPTIONS,
} from '@ironfist/engine/contracts/negotiation.js'
import NegotiateModal from '../ui/NegotiateModal.jsx'
import { createTestGame, createTestFighter } from './helpers.js'

afterEach(() => resetRNG())

const agentFighter = (agent = 'Standard', asking = 3000) => createTestFighter({ id: 'p-fighter', agent, asking })
const offer = (o = {}) => ({ signBonus: 3000, cut: 0.18, fights: 4, duration: 24, equity: 0, ...o })

function gameWithProspect(agent = 'Standard') {
  const g = createTestGame()
  g.cash = 1e6
  g.roster = g.roster.slice(0, 1)
  g.prospects = [{ id: 'pros', grade: 'B', fighter: agentFighter(agent) }]
  return g
}

describe('acceptChance', () => {
  it('a higher camp cut lowers the odds; more bonus, fights and equity raise them', () => {
    const f = agentFighter()
    const at = (o) => acceptChance(f, 'sign', offer(o))
    expect(at({ cut: 0.25 })).toBeLessThan(at({ cut: 0.18 }))
    expect(at({ signBonus: 6000 })).toBeGreaterThan(at({}))
    expect(at({ fights: 8 })).toBeGreaterThan(at({ fights: 2 }))
    expect(at({ equity: 20 })).toBeGreaterThan(at({}))
  })

  it('ignores the removed exclusivity, rematch and medical clauses', () => {
    const f = agentFighter()
    expect(acceptChance(f, 'sign', { ...offer(), exclusive: false, rematch: true, medical: 'fighter' }))
      .toBe(acceptChance(f, 'sign', offer()))
  })
})

describe('counterOffer', () => {
  it('never asks for a higher camp cut than offered, and moves toward the agent floor', () => {
    for (const agent of Object.keys(AGENT_TYPES)) {
      const f = agentFighter(agent)
      const floor = Math.round(AGENT_TYPES[agent].cutFloor * 100)
      for (const cut of NEGO_CUT_OPTIONS) {
        for (let seed = 0; seed < 20; seed++) {
          let i = seed; setRNG(() => ((i++ * 0.37) % 1))
          const c = counterOffer(f, 'sign', offer({ cut: cut / 100 }))
          const cPct = Math.round(c.cut * 100)
          expect(cPct).toBeLessThanOrEqual(cut)
          if (cut > floor) { expect(cPct).toBeLessThan(cut); expect(cPct).toBeGreaterThanOrEqual(floor) }
          expect(c.signBonus).toBeGreaterThanOrEqual(3000)
        }
      }
    }
  })

  it('treats a cut above the floor as weak, a cut at or under it as fair', () => {
    const f = agentFighter('Standard') // floor 18%
    expect(isWeakOffer(f, 'sign', offer({ cut: 0.20 }))).toBe(true)
    expect(isWeakOffer(f, 'sign', offer({ cut: 0.18 }))).toBe(false)
    expect(isWeakOffer(f, 'sign', offer({ cut: 0.15 }))).toBe(false)
    expect(isWeakOffer(f, 'sign', offer({ signBonus: 1800 }))).toBe(true)
  })
})

describe('NEGOTIATE_CONTRACT reducer', () => {
  it('a successful roll signs with the sanitized terms', () => {
    const g = gameWithProspect()
    setRNG(() => 0)
    reducer(g, { type: 'NEGOTIATE_CONTRACT', mode: 'sign', prospectId: 'pros', offer: offer({ cut: 0.19, exclusive: false }) })
    expect(g.negotiation.status).toBe('signed')
    const f = g.roster.find((x) => x.id === 'p-fighter')
    expect(f.contract.managerCut).toBe(0.18) // snapped to an offered option
    expect(f.contract).not.toHaveProperty('exclusive')
    expect(g.prospects).toHaveLength(0)
  })

  it('a failed roll stores a counter; accepting it signs those terms, not anything from the UI', () => {
    const g = gameWithProspect()
    setRNG(() => 0.999)
    reducer(g, { type: 'NEGOTIATE_CONTRACT', mode: 'sign', prospectId: 'pros', offer: offer({ cut: 0.25 }) })
    expect(g.negotiation.status).toBe('counter')
    const { counter } = g.negotiation
    expect(counter.cut).toBeLessThan(0.25)
    const cash = g.cash
    reducer(g, { type: 'ACCEPT_COUNTER_OFFER', deal: { cut: 0.35, signBonus: 0 } })
    const f = g.roster.find((x) => x.id === 'p-fighter')
    expect(f.contract.managerCut).toBe(counter.cut)
    expect(g.cash).toBe(cash - counter.signBonus)
    expect(g.negotiation.status).toBe('signed')
  })

  it('refuses without rolling when the roster is full or cash is short', () => {
    let g = gameWithProspect()
    const cap = CAMP_TIERS[g.campTier || 0].rosterCap
    while (g.roster.length < cap) g.roster.push(createTestFighter({ id: `r${g.roster.length}` }))
    let rolls = 0
    setRNG(() => { rolls++; return 0 })
    reducer(g, { type: 'NEGOTIATE_CONTRACT', mode: 'sign', prospectId: 'pros', offer: offer() })
    expect(g.negotiation.status).toBe('rosterFull')
    expect(g.prospects).toHaveLength(1)
    g = gameWithProspect()
    g.cash = 100
    reducer(g, { type: 'NEGOTIATE_CONTRACT', mode: 'sign', prospectId: 'pros', offer: offer() })
    expect(g.negotiation.status).toBe('noCash')
    expect(rolls).toBe(0)
  })

  it('extension through negotiation updates the contract and clears afterwards', () => {
    const g = gameWithProspect()
    const f = g.roster[0]
    setRNG(() => 0)
    reducer(g, { type: 'NEGOTIATE_CONTRACT', mode: 'extend', fighterId: f.id, offer: { ...defaultOffer(f, 'extend'), fights: 6 } })
    expect(g.negotiation.status).toBe('signed')
    expect(f.contract.fightsLeft).toBe(6)
    reducer(g, { type: 'CLEAR_NEGOTIATION' })
    expect(g.negotiation).toBeUndefined()
  })

  it('sanitizeOffer snaps arbitrary numbers to the screen options', () => {
    const s = sanitizeOffer(agentFighter(), 'sign', { signBonus: 1e9, cut: 0.01, fights: 99, duration: -5, equity: 50 })
    expect(s).toEqual({ signBonus: 6000, cut: 0.15, fights: 8, duration: 12, equity: 20 })
  })
})

describe('NegotiateModal', () => {
  const render = (props) => renderToStaticMarkup(React.createElement(NegotiateModal, {
    fighter: agentFighter(), mode: 'sign', cash: 1e6, rosterCap: 8, rosterSize: 1,
    onNegotiate: () => {}, onAcceptCounter: () => {}, onClose: () => {}, ...props,
  }))

  it('has no exclusivity, rematch or medical clause and shows the engine acceptance chance', () => {
    const html = render({})
    expect(html).not.toMatch(/Exclusivity|Exklusivitas|Rematch|Medical Cost|Biaya Medis/)
    expect(html).toContain(`${acceptChance(agentFighter(), 'sign', defaultOffer(agentFighter(), 'sign'))}%`)
  })

  it('ignores a stale negotiation result it did not submit', () => {
    const html = render({ negotiation: { status: 'counter', mode: 'sign', prospectId: 'pros', counter: offer() } })
    expect(html).not.toMatch(/counter offer|counter-offer|mengajukan/i)
  })
})
