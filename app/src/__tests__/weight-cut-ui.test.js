import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect, vi } from 'vitest'
import WeighIn from '../components/fight/WeighIn.jsx'
import ResultScreen from '../components/fight/ResultScreen.jsx'
import { useFightPrep } from '../hooks/useFightPrep.js'
import { Btn } from '../ui/theme.jsx'
import { t } from '../i18n/index.js'
import { setRNG, mulberry32, random } from '@ironfist/engine/rng.js'
import { createTestFighter } from './helpers.js'

const fighter = createTestFighter({ natWeight: 170, booked: { seed: 42, show: 1000, winBonus: 500 }, contract: { managerCut: 0.2 } })
const opp = createTestFighter({ id: 'opp', name: 'Opponent', natWeight: 163 })
function prep(staff) {
  let value
  function Probe() { value = useFightPrep(fighter, opp, 'Professional', staff); return null }
  renderToStaticMarkup(React.createElement(Probe))
  return value
}
function props(over = {}) {
  return {
    fighter, opp, ...prep(), plan: 'Balanced', weighinIssue: null, missedWeight: true,
    setWeighinIssue: vi.fn(), setPlan: vi.fn(), setViewMode: vi.fn(), onStart: vi.fn(), ...over,
  }
}
function buttons(node) {
  if (!node || typeof node !== 'object') return []
  if (node.type === Btn) return [node]
  return React.Children.toArray(node.props?.children).flatMap(buttons)
}
const startButton = (p) => buttons(WeighIn(p)).find((b) => b.props.onClick === p.onStart)

describe('weigh-in integration', () => {
  it('shows the correct division limit and both penalties from fight prep', () => {
    const p = props()
    expect(p.cutInfo.staminaCap).toBe(90)
    expect(p.oppCutInfo.staminaCap).toBe(95)
    expect(prep({ nutritionist: { skill: 10 } }).cutInfo.staminaCap).toBe(94)
    const html = renderToStaticMarkup(React.createElement(WeighIn, p))
    expect(html).toContain('→ 155 lbs')
    expect(html).toContain('−10% stamina cap')
    expect(html).toContain('−5% stamina cap')
  })

  it('reuses a booked weigh-in roll across remounts without consuming fight RNG', () => {
    setRNG(mulberry32(123))
    const expected = random()
    setRNG(mulberry32(123))
    const first = prep().missedWeight
    expect(prep().missedWeight).toBe(first)
    expect(random()).toBe(expected)
  })

  it('blocks the bell until a failed weigh-in is resolved, even with a game plan', () => {
    expect(startButton(props()).props.disabled).toBe(true)
    expect(startButton(props({ missedWeight: false })).props.disabled).toBe(false)
    expect(startButton(props({ missedWeight: false, plan: null })).props.disabled).toBe(true)
  })

  it('accepts catchweight explicitly and continues showing missed weight and its costs', () => {
    const p = props()
    buttons(WeighIn(p)).find((b) => b.props.children === t('WEIGH.catchweight')).props.onClick()
    expect(p.setWeighinIssue).toHaveBeenCalledWith('catchweight')
    const accepted = { ...p, weighinIssue: 'catchweight' }
    expect(startButton(accepted).props.disabled).toBe(false)
    const html = renderToStaticMarkup(React.createElement(WeighIn, accepted))
    expect(html).toContain(t('WEIGH.missed'))
    expect(html).not.toContain(t('WEIGH.made'))
    expect(html).toContain(t('WEIGH.catchweightAccepted'))
  })

  it('lets cancellation be confirmed without selecting a game plan', () => {
    const p = props({ plan: null })
    buttons(WeighIn(p)).find((b) => b.props.children === t('WEIGH.cancel')).props.onClick()
    expect(p.setWeighinIssue).toHaveBeenCalledWith('cancelled')
    const button = startButton({ ...p, weighinIssue: 'cancelled' })
    expect(button.props.disabled).toBe(false)
    expect(button.props.children).toBe(t('WEIGH.confirmCancel'))
  })

  it('shows the same catchweight deduction and camp payout that persistence uses', () => {
    const html = renderToStaticMarkup(React.createElement(ResultScreen, { fighter, opp, roundLogs: [], result: { won: true, how: 'Decision', r: 3, weighinIssue: 'catchweight' } }))
    expect(html).toContain('−$450')
    expect(html).toContain('$210')
    expect(html).not.toContain('$300')
  })
})
