// P1 #25 (DU8): promoter relation decay reads fight data, not log text, and
// the log cap is one constant shared by the game and the harnesses.
import { describe, it, expect } from 'vitest'
import { promoterTierActive } from '@ironfist/engine/promoter-activity.js'
import { LOG_MAX } from '@ironfist/engine/reducer/constants.js'
import { tickSettlement } from '@ironfist/engine/tick/settlement.js'
import { tick } from '@ironfist/engine/state.js'
import { createTestGame, useSeed } from './helpers.js'

function game() {
  useSeed(42)
  const g = createTestGame()
  g.week = 100
  g.roster.forEach((f) => { f.booked = null; f.fightHistory = []; f.lastFightWeek = 0 })
  return g
}

describe('promoterTierActive', () => {
  it('a recent fight or a current booking in the tier counts; other tiers do not', () => {
    const g = game()
    g.roster[0].fightHistory.push({ result: 'W', tier: 'National', week: 92 })
    expect(promoterTierActive(g, 'National')).toBe(true)
    expect(promoterTierActive(g, 'Regional')).toBe(false)
    g.roster[1].booked = { tier: 'Regional', weeksLeft: 3 }
    expect(promoterTierActive(g, 'Regional')).toBe(true)
  })

  it('fights older than 12 weeks and log lines naming the tier do not count', () => {
    const g = game()
    g.roster[0].fightHistory.push({ result: 'W', tier: 'Local', week: 87 })
    g.roster[0].lastFightWeek = 99 // recent fight in another tier
    g.roster[0].fightHistory.push({ result: 'W', tier: 'National', week: 99 })
    g.log = ['👀 Scout: Local Amateur Circuit menemukan prospek', '📝 Someone menerima fight Local vs X']
    expect(promoterTierActive(g, 'Local')).toBe(false)
  })
})

describe('settlement decay', () => {
  it('decays an inactive tier even when the log mentions it, keeps an active one', () => {
    const g = game()
    g.week = 96 // settlement week
    g.promoterRel = { Local: 50, Regional: 50, National: 50, Major: 30, Premier: 30 }
    g.roster[0].fightHistory.push({ result: 'W', tier: 'Regional', week: 90 })
    g.roster[0].lastFightWeek = 90
    g.log = ['Local Local Local']
    tickSettlement(g)
    expect(g.promoterRel.Local).toBeLessThan(50)
    expect(g.promoterRel.Regional).toBeGreaterThanOrEqual(50)
  })
})

describe('log cap', () => {
  it('tick keeps at most LOG_MAX lines, the same cap the game UI used', () => {
    const g = game()
    g.log = Array.from({ length: 500 }, (_, i) => `line ${i}`)
    tick(g)
    expect(LOG_MAX).toBe(30)
    expect(g.log.length).toBeLessThanOrEqual(LOG_MAX)
  })
})
