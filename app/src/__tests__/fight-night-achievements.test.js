import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import FightNight from '../ui/FightNight.jsx'
import { createTestGame, createTestFighter } from './helpers.js'
import { applyFightCompletion } from '../services/fightCompletion.js'

// A small hook driver lets the actual FightNight event handlers run in Node.
// User actions change hook state; each render exposes the next stage's props.
const driver = vi.hoisted(() => ({ values: [], cursor: 0, controls: {}, how: 'KO/TKO', rounds: null, effects: [], cleanups: [] }))
vi.mock('react', async original => {
  const actual = await original()
  const useState = initial => {
    const i = driver.cursor++
    if (!(i in driver.values)) driver.values[i] = typeof initial === 'function' ? initial() : initial
    return [driver.values[i], update => {
      driver.values[i] = typeof update === 'function' ? update(driver.values[i]) : update
    }]
  }
  return { ...actual, useState, useRef: initial => useState({ current: initial })[0], useEffect: effect => { driver.effects.push(effect) } }
})
vi.mock('../hooks/useFightSeed.js', () => ({ useFightSeed: () => {} }))
vi.mock('@ironfist/engine/fight.js', async original => ({
  ...await original(), simRound: rn => driver.rounds?.[rn - 1] || ({
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
vi.mock('../components/fight/Corner.jsx', () => ({ default: props => { driver.controls.corner = props; return null } }))
vi.mock('../components/fight/Scoreboard.jsx', () => ({ default: props => { driver.controls.scoreboard = props; return null } }))

beforeEach(() => { driver.values = []; driver.controls = {}; driver.rounds = null; driver.effects = []; driver.cleanups = []; vi.useFakeTimers() })
afterEach(() => { driver.cleanups.forEach(fn => fn()); vi.clearAllTimers(); vi.useRealTimers() })

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

it('updates cumulative scoreboard stats and passes all rounds through the result callback', () => {
  driver.rounds = [1, 2, 3].map(r => ({ duringRound: r, landA: r * 5, landB: 4, tdA: r, tdB: 1,
    scoreA: r === 2 ? 10 : 20, scoreB: r === 2 ? 20 : 10,
    dmgA: 5, dmgB: 5, staA: 90, staB: 90, cutA: 0, cutB: 0, momentum: 0, log: [], finish: null }))
  const fighter = createTestFighter({ booked: { seed: 42, gamePlan: 'Balanced', opponent: createTestFighter() } })
  const done = vi.fn()
  const render = () => { driver.cursor = 0; renderToStaticMarkup(React.createElement(FightNight, { fighter, done })) }
  render(); driver.controls.staredown.onContinue(); render(); driver.controls.weighin.onStart()
  vi.advanceTimersByTime(500); render()
  expect(driver.controls.scoreboard).toMatchObject({ totalLandA: 5, totalLandB: 4, totalTdA: 1, totalTdB: 1 })
  driver.controls.round.onEndRound(); render()
  driver.controls.corner.runRound(2, driver.controls.corner.state, 'neutral'); render()
  expect(driver.controls.scoreboard).toMatchObject({ totalLandA: 15, totalTdA: 3 })
  driver.controls.round.onEndRound(); render()
  driver.controls.corner.runRound(3, driver.controls.corner.state, 'neutral'); render()
  expect(driver.controls.scoreboard).toMatchObject({ totalLandA: 30, totalLandB: 12, totalTdA: 6, totalTdB: 3 })
  driver.controls.round.onEndRound(); render(); driver.controls.corner.processResult(); render()
  expect(driver.controls.result.roundLogs).toHaveLength(3)
  driver.controls.result.onCommit()
  const g = createTestGame({ roster: [fighter] })
  const context = done.mock.calls[0][0](g)
  expect(context.fightResult.roundLogs).toHaveLength(3)
})

it.each([false, true])('tick view advances unfinished rounds instead of ending the fight (knockdown=%s)', knockdown => {
  driver.rounds = [1, 2].map(r => ({ duringRound: r, landA: 8, landB: 7, tdA: 1, tdB: 0,
    scoreA: 20, scoreB: 15, dmgA: 5, dmgB: 5, staA: 90, staB: 90, cutA: 0, cutB: 0,
    momentum: 0, log: ['[0:05] Summary'], tickLog: ['[0:05] Bell', '[0:40] Detail'],
    knockdown: r === 1 && knockdown ? { fighter: 'B' } : null,
    finish: r === 2 ? { by: 'A', how: 'Submission' } : null }))
  const fighter = createTestFighter({ booked: { seed: 42, gamePlan: 'Balanced', opponent: createTestFighter() } })
  const render = () => {
    driver.cursor = 0; driver.effects = []
    renderToStaticMarkup(React.createElement(FightNight, { fighter, done: vi.fn() }))
    driver.cleanups.forEach(fn => fn()); driver.cleanups = []
    driver.effects.forEach(effect => { const cleanup = effect(); if (cleanup) driver.cleanups.push(cleanup) })
  }
  render(); driver.controls.staredown.onContinue(); render()
  driver.controls.weighin.setViewMode('tick'); render(); driver.controls.weighin.onStart()
  vi.advanceTimersByTime(500); render()
  expect(driver.controls.round.displayLog).toEqual(driver.rounds[0].tickLog)
  vi.advanceTimersByTime(2400); render(); render()
  if (knockdown) { driver.controls.knockdown.onSeeResult(); render() }
  expect(driver.controls.corner.rnd).toBe(1)
  expect(driver.controls.result).toBeUndefined()
  driver.controls.corner.runRound(2, driver.controls.corner.state, 'neutral'); render()
  vi.advanceTimersByTime(2400); render(); render()
  expect(driver.controls.result.result).toMatchObject({ how: 'Submission', r: 2 })
})
