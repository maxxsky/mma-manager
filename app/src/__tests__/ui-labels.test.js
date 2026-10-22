// P4 #47 (UI2): no raw i18n keys in navigation labels or the scout filters.
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import Sidebar from '../ui/Sidebar.jsx'
import Scout from '../ui/Scout.jsx'
import { t } from '../i18n/index.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

describe('labels', () => {
  it('sidebar nav buttons carry translated aria-labels and a stable data-tab', () => {
    const html = renderToStaticMarkup(React.createElement(Sidebar, { view: 'dashboard', setView: () => {}, onAdvance: () => {}, inboxCount: 0 }))
    expect(html).not.toMatch(/aria-label="UI\./)
    expect(html).toContain('data-tab="dashboard"')
    expect(html).toContain(`aria-label="${t('UI.dashboard')}"`)
  })

  it('scout filters are labelled as style and weight class, with no raw keys', () => {
    const g = { rep: 10, cash: 0, roster: [], facilities: {}, prospects: [] }
    const html = renderToStaticMarkup(React.createElement(Scout, {
      g, dispatch: () => {}, t, fmt$: (v) => `$${v}`, scoutFilterArch: null, setScoutFilterArch: () => {},
      scoutFilterWC: null, setScoutFilterWC: () => {}, scoutFighter: () => {}, tier: 8,
    }))
    expect(html).not.toMatch(/UI\.[a-z]/)
    expect(html).toContain(t('UI.styleFilter'))
    expect(html).toContain(t('UI.selectClass'))
  })

  it('index.html declares the default UI language', () => {
    const html = readFileSync(fileURLToPath(new URL('../../index.html', import.meta.url)), 'utf8')
    expect(html).toMatch(/<html lang="id">/)
  })
})
