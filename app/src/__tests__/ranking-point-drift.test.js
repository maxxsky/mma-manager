import { afterEach, describe, expect, it } from 'vitest'
import { tickRankings } from '@ironfist/engine/tick/rankings.js'
import { divisionRankings } from '@ironfist/engine/rankings.js'
import { newGame, tick } from '@ironfist/engine/state.js'
import { mulberry32, setRNG, resetRNG } from '@ironfist/engine/rng.js'

afterEach(() => resetRNG())

// Isolate ranking noise from retirement, age progression and fight outcomes.
function cohort(size, points = 60) {
  return { week: 4, roster: [], log: [], divisions: {
    Lightweight: { champ: null, list: Array.from({ length: size }, (_, id) => ({
      id, name: `AI ${id}`, points,
    })) },
  } }
}

describe('ranking point noise', () => {
  it('has zero mean and symmetric gains/losses over an equally weighted roll distribution', () => {
    const g = cohort(17)
    let draw = 0
    setRNG(() => (draw++ + 0.5) / 17)
    tickRankings(g)
    const changes = g.divisions.Lightweight.list.map(f => f.points - 60)
    expect(changes.reduce((a, b) => a + b, 0)).toBe(0)
    expect(changes.filter(n => n < 0)).toHaveLength(changes.filter(n => n > 0).length)
    expect([...changes].reverse().map(n => n === 0 ? 0 : -n)).toEqual(changes)
  })

  it('keeps points bounded and lets fighters move away from the old cap', () => {
    const g = cohort(2)
    const [low, high] = g.divisions.Lightweight.list
    low.points = 5; high.points = 120
    setRNG(() => 0)
    tickRankings(g)
    expect(low.points).toBe(5)
    expect(high.points).toBeLessThan(120)
    setRNG(() => 0.999)
    tickRankings(g)
    expect(low.points).toBeGreaterThan(5)
    expect(high.points).toBeLessThanOrEqual(120)
  })

  it('does not inflate an isolated population over ten years of monthly changes', () => {
    let total = 0, atCap = 0
    const size = 100, seeds = 100
    for (let seed = 0; seed < seeds; seed++) {
      setRNG(mulberry32(1000 + seed * 7919))
      const g = cohort(size)
      for (let month = 0; month < 120; month++) tickRankings(g)
      for (const f of g.divisions.Lightweight.list) {
        expect(f.points).toBeGreaterThanOrEqual(5)
        expect(f.points).toBeLessThanOrEqual(120)
        total += f.points
        atCap += Number(f.points === 120)
      }
    }
    // Starting at 60, clipping near the bounds can shift the mean slightly.
    // Old +2-point noise produces mean 113.64 and 38.81% at 120 here.
    expect(total / (size * seeds)).toBeGreaterThan(55)
    expect(total / (size * seeds)).toBeLessThan(70)
    expect(atCap / (size * seeds)).toBeLessThan(0.08)
  })

  it('keeps headroom in real-world top-five rankings after ten simulated years', () => {
    let total = 0, atCap = 0, count = 0
    for (let i = 0; i < 5; i++) {
      setRNG(mulberry32(1000 + i * 7919))
      const g = newGame()
      for (let week = 0; week < 480; week++) {
        g.cash = Math.max(g.cash, 250000)
        tick(g)
      }
      expect(g.over).toBeNull()
      for (const wc of Object.keys(g.divisions)) {
        for (const entry of divisionRankings(g, wc).filter(c => !c.player && c.rank <= 5)) {
          total += entry.points
          atCap += Number(entry.points === 120)
          count++
        }
      }
    }
    expect(count).toBe(200)
    // Aggregate across seeds: at least one full positive roll of headroom,
    // and fewer than one in five contenders pinned at the upper limit.
    expect(total / count).toBeLessThan(112)
    expect(atCap / count).toBeLessThan(0.2)
  })

  it('repeats point changes exactly from the same seed and saved ranking state', () => {
    const first = cohort(15)
    const saved = structuredClone(first)
    setRNG(mulberry32(9876))
    for (let month = 0; month < 24; month++) tickRankings(first)
    setRNG(mulberry32(9876))
    for (let month = 0; month < 24; month++) tickRankings(saved)
    expect(saved).toEqual(first)
  })
})
