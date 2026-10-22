import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import FightNight from '../ui/FightNight.jsx'
import { createTestGame, createTestFighter } from './helpers.js'
import { applyFightCompletion } from '../services/fightCompletion.js'

// A small hook driver lets the actual FightNight event handlers run in Node.
// User actions change hook state; each render exposes the next stage's props.
const driver = vi.hoisted(() => ({ values: [], cursor: 0, controls: {}, how: 'KO/TKO' }))
vi.mock('react', async original => {
  const actual = await original()
  const useState = initial => {
    const i = driver.cursor++
    if (!(i in driver.values)) driver.values[i] = typeof initial === 'function' ? initial() : initial
    return [driver.values[i], update => {
      driver.values[i] = typeof update === 'function' ? update(driver.values[i]) : update
    }]
  }
  return { ...actual, useState, useRef: initial => useState({ current: initial })[0] }
})
vi.mock('../hooks/useFightSeed.js', () => ({ useFightSeed: () => {} }))
vi.mock('@ironfist/engine/fight.js', async original => ({
  ...await original(), simRound: () => ({
    duringRound: 1, dmgA: 20, dmgB: 5, staA: 90, staB: 80, cutA: 0, cutB: 0,
    momentum: 0, finish: { by: 'A', how: driver.how }, log: [],
  }),
}))
vi.mock('../components/fight/Staredown.jsx', () => ({ default: props => { driver.controls.staredown = props; return null } }))
vi.mock('../components/fight/WeighIn.jsx', () => ({ default: props => { driver.controls.weighin = props; return null } }))
vi.mock('../components/fight/Entrance.jsx', () => ({ default: () => null }))
vi.mock('../components/fight/RoundView.jsx', () => ({ default: props => { driver.controls.round = props; return null } }))
vi.mock('../components/fight/Knockdown.jsx', () => ({ default: props => { driver.controls.knockdown = props; return null } }))
vi.mock('../components/fight/ResultScreen.jsx', () => ({ default: props => { driver.controls.result = props; return null } }))

beforeEach(() => { driver.values = []; driver.controls = {}; vi.useFakeTimers() })
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers() })

it.each([['KO/TKO', 'first_ko'], ['Submission', 'first_sub']])(
  'passes actual %s context from FightNight to completion and commits only once', (how, achievement) => {
    driver.how = how
    const fighter = createTestFighter({ booked: { seed: 42, gamePlan: 'Balanced',
      opponent: createTestFighter({ id: 'opponent', name: 'Opponent' }) } })
    const g = createTestGame({ roster: [fighter] })
    let completed
    const done = vi.fn((update, context) => { completed = applyFightCompletion(g, update, context) })
    const render = () => {
      driver.cursor = 0
      renderToStaticMarkup(React.createElement(FightNight, { fighter, done }))
    }
    render()
    driver.controls.staredown.setAttitude('Professional')
    driver.controls.staredown.onContinue()
    render()
    driver.controls.weighin.onStart()
    vi.advanceTimersByTime(500)
    render()
    driver.controls.round.onSeeFinish()
    render()
    if (how === 'KO/TKO') {
      driver.controls.knockdown.onSeeResult()
      render()
    }
    driver.controls.result.onCommit()
    driver.controls.result.onCommit()
    expect(done).toHaveBeenCalledTimes(1)
    expect(done.mock.calls[0][1].fightResult).toMatchObject({ won: true, how })
    expect(completed.state.roster[0].record.w).toBe(1)
    expect(completed.newly).toContain('first_win')
    expect(completed.newly).toContain(achievement)
  },
)
