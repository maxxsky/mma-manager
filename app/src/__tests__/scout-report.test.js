// P1 #19 (CA1): the Scout screen must show only what the scout report says,
// never the prospect's true attributes.
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { ATTRS } from '@ironfist/engine/data.js'
import { RI, clamp } from '@ironfist/engine/rng.js'
import { genFighter, makeReport, gradeOf, reportAttrValue, reportOvr } from '@ironfist/engine/fighter.js'
import Scout from '../ui/Scout.jsx'
import { heat } from '../ui/theme.jsx'
import { t } from '../i18n/index.js'
import { useSeed, clearSeed } from './helpers.js'

// Colors of the attribute value cells (14px mono values in the estimate grid).
const cellColors = (html) => [...html.matchAll(/font-size:14px;font-weight:700;color:(#[0-9a-f]+)">/g)].map((m) => m[1])

const trueOvr = (f) => Math.round(ATTRS.reduce((s, k) => s + f.attrs[k], 0) / ATTRS.length)

function renderScout(prospect) {
  const g = { rep: 10, cash: 0, roster: [], facilities: {}, prospects: [prospect] }
  return renderToStaticMarkup(React.createElement(Scout, {
    g, dispatch: () => {}, t, fmt$: (v) => `$${v}`,
    scoutFilterArch: null, setScoutFilterArch: () => {},
    scoutFilterWC: null, setScoutFilterWC: () => {},
    scoutFighter: () => {}, tier: 8,
  }))
}

describe('makeReport numeric estimates', () => {
  it('estVal matches the letter grade and consumes RNG exactly like the old report', () => {
    for (const grade of ['C', 'B', 'A', 'S']) {
      for (let i = 0; i < 40; i++) {
        useSeed(i * 7919 + 3)
        const f = genFighter(0.5)
        useSeed(i + 101)
        const r = makeReport(f, grade)
        // Old algorithm replayed on the same seed: same rolls, same letters.
        useSeed(i + 101)
        const err = { C: 12, B: 10, A: 5, S: 0 }[grade]
        for (const k of ATTRS) {
          if (grade === 'C' && (k === 'chin' || k === 'fightIQ')) {
            expect(r.est[k]).toBe('?')
            expect(r.estVal[k]).toBeNull()
            continue
          }
          const old = clamp(f.attrs[k] + RI(-err, err), 10, 99)
          expect(r.estVal[k]).toBe(old)
          expect(r.est[k]).toBe(gradeOf(old))
          expect(Math.abs(r.estVal[k] - clamp(f.attrs[k], 10, 99))).toBeLessThanOrEqual(err)
        }
      }
    }
    clearSeed()
  })

  it('grade S report is exact', () => {
    useSeed(5)
    const f = genFighter(0.6)
    const r = makeReport(f, 'S')
    for (const k of ATTRS) expect(r.estVal[k]).toBe(clamp(f.attrs[k], 10, 99))
    clearSeed()
  })
})

describe('reportOvr / reportAttrValue', () => {
  it('ignores hidden attributes and never reads true attrs', () => {
    const report = { est: {}, estVal: {} }
    ATTRS.forEach((k, i) => { report.estVal[k] = i < 2 ? null : 40 + i })
    const known = ATTRS.slice(2).map((_, i) => 40 + i + 2)
    expect(reportOvr(report)).toBe(Math.round(known.reduce((s, v) => s + v, 0) / known.length))
    expect(reportAttrValue(report, ATTRS[0])).toBeNull()
  })

  it('falls back to grade midpoints for reports saved before estVal', () => {
    const report = { est: Object.fromEntries(ATTRS.map((k) => [k, 'B'])) }
    report.est.chin = '?'
    expect(reportAttrValue(report, 'chin')).toBeNull()
    expect(reportAttrValue(report, 'striking')).toBe(60)
    expect(reportOvr(report)).toBe(60)
    expect(reportOvr({ est: {} })).toBeNull()
  })
})

describe('Scout screen', () => {
  it('shows OVR and attribute colors from the report, not the true attributes', () => {
    useSeed(77)
    const fighter = genFighter(0.5)
    clearSeed()
    for (const k of ATTRS) fighter.attrs[k] = 95 // true fighter is elite
    const estVal = Object.fromEntries(ATTRS.map((k) => [k, 30]))
    estVal.chin = null
    const est = Object.fromEntries(ATTRS.map((k) => [k, estVal[k] == null ? '?' : gradeOf(30)]))
    const prospect = { id: 'p1', fighter, grade: 'C', method: 'Local Amateur Circuit',
      report: { est, estVal, pot: '?', traits: [], ambition: null, bestCeiling: null } }

    const html = renderScout(prospect)
    expect(trueOvr(fighter)).toBe(95)
    expect(html).toContain('>30<')
    expect(html).not.toContain('>95<')
    const colors = cellColors(html)
    expect(colors).toHaveLength(ATTRS.length)
    expect(colors.filter((c) => c === heat(30))).toHaveLength(ATTRS.length - 1)
    expect(colors).not.toContain(heat(95))
  })

  it('legacy prospect without estVal still renders from its letter grades', () => {
    useSeed(78)
    const fighter = genFighter(0.5)
    clearSeed()
    for (const k of ATTRS) fighter.attrs[k] = 95
    const est = Object.fromEntries(ATTRS.map((k) => [k, 'C']))
    const prospect = { id: 'p2', fighter, grade: 'C', method: 'x',
      report: { est, pot: '?', traits: [], ambition: null, bestCeiling: null } }
    const html = renderScout(prospect)
    expect(html).toContain('>40<')
    expect(cellColors(html)).toEqual(ATTRS.map(() => heat(40)))
  })
})
