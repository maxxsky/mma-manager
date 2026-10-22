// P3 #42 (FI1): the training multipliers are shown, from the same function
// the simulation uses.
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { trainingFactors } from '@ironfist/engine/tick/training.js'
import { TrainingFactors } from '../ui/FighterDetail.jsx'
import { createTestGame } from './helpers.js'

describe('trainingFactors', () => {
  it('reports each multiplier by name', () => {
    const g = createTestGame()
    const f = g.roster[0]
    Object.assign(f, { age: 20, overtraining: 60, morale: 80, traits: ['Natural Talent'], training: { type: 'sparring', intensity: 'Hard' }, booked: null })
    g.chemistry = 85
    const fx = trainingFactors(g, f)
    expect(fx).toMatchObject({ intensity: 1.5, age: 1.3, overtraining: 0.75, trait: 1.15, morale: 1.1, chemistry: 1.15 })
    expect(fx.sparring).toBeGreaterThanOrEqual(0.9)
    expect(fx.attention).toBeGreaterThan(0)
    expect(fx.coach).toBeGreaterThanOrEqual(1)
    expect(fx.facility).toBeGreaterThanOrEqual(1)
  })
})

describe('TrainingFactors panel (FighterDetail)', () => {
  it('shows the training factor breakdown', () => {
    const g = createTestGame()
    const f = g.roster[0]
    f.injury = null
    f.training = { type: 'sparring', intensity: 'Medium' }
    const html = renderToStaticMarkup(React.createElement(TrainingFactors, { f, g }))
    expect(html).toMatch(/Faktor training minggu ini|This week&#x27;s training factors|This week's training factors/)
    expect(html).toMatch(/Overtraining/)
    expect(html).toMatch(/×\d\.\d\d/)
  })
})
