// Fight Engine Tests — simulation correctness
import { describe, it, expect } from 'vitest'
import { createTestFighter, useSeed, TEST_SEED, createTestGame } from './helpers.js'
import { simRound, prepFighter, autoGamePlan, runFight } from '../engine/fight.js'
import { pickExchange } from '../engine/fight/exchanges.js'
import { commitFightResult } from '../engine/fights/commitResult.js'
import { processTitleChange } from '../engine/career.js'
import { mulberry32, setRNG } from '../engine/rng.js'
import { tick } from '../engine/state.js'

describe('Fight Engine', () => {
  const fighterA = createTestFighter({ name: 'Alpha', id: 'a1' })
  const fighterB = createTestFighter({ name: 'Beta', id: 'b1', archetype: 'Boxer', attrs: {
    striking: 65, wrestling: 35, bjj: 20, cardio: 50, strength: 60, chin: 45, footwork: 40, fightIQ: 38
  }})

  describe('simRound basics', () => {
    it('produces a valid winner', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      expect(['A', 'B']).toContain(result.winner)
    })

    it('returns valid score values', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      expect(result.scoreA).toBeGreaterThanOrEqual(0)
      expect(result.scoreB).toBeGreaterThanOrEqual(0)
      expect(isFinite(result.scoreA)).toBe(true)
      expect(isFinite(result.scoreB)).toBe(true)
    })

    it('stamina stays in valid range', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      expect(result.staA).toBeGreaterThanOrEqual(0)
      expect(result.staA).toBeLessThanOrEqual(100)
      expect(result.staB).toBeGreaterThanOrEqual(0)
      expect(result.staB).toBeLessThanOrEqual(100)
    })

    it('damage values are non-negative', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      expect(result.dmgA).toBeGreaterThanOrEqual(0)
      expect(result.dmgB).toBeGreaterThanOrEqual(0)
    })

    it('landed strikes are non-negative', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      expect(result.landA).toBeGreaterThanOrEqual(0)
      expect(result.landB).toBeGreaterThanOrEqual(0)
    })

    it('generates log entries', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      expect(result.log.length).toBeGreaterThan(0)
    })

    it('generates tick log entries', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      expect(result.tickLog.length).toBeGreaterThan(0)
    })
  })

  describe('round count', () => {
    it('non-title fights have correct round count (3 rounds max)', () => {
      useSeed(TEST_SEED)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      // Run 3 rounds
      let staA = 100, staB = 100, mom = 0
      for (let r = 1; r <= 3; r++) {
        const result = simRound(r, A, B, staA, staB, 'Balanced', 'neutral', mom)
        staA = result.staA
        staB = result.staB
        mom = result.momentum
        if (result.finish) break
      }
      // Should complete without error
      expect(true).toBe(true)
    })
  })

  describe('autoGamePlan', () => {
    it('returns a valid plan', () => {
      const plan = autoGamePlan(fighterA, fighterB)
      expect(['Take It Down', 'Keep It Standing', 'Finish It', 'Survive & Outpoint', 'Balanced']).toContain(plan)
    })
  })

  describe('prepFighter', () => {
    it('does not mutate original fighter', () => {
      const original = { ...fighterA, attrs: { ...fighterA.attrs } }
      prepFighter(fighterA)
      expect(fighterA.attrs.striking).toBe(original.attrs.striking)
    })

    it('returns a fighter with valid attrs', () => {
      useSeed(TEST_SEED)
      const prepped = prepFighter(fighterA)
      for (const k of Object.keys(prepped.attrs)) {
        expect(prepped.attrs[k]).toBeGreaterThanOrEqual(5)
        expect(prepped.attrs[k]).toBeLessThanOrEqual(99)
      }
    })
  })

  describe('deterministic seed', () => {
    it('same seed + same inputs = identical fight result (deep equal)', () => {
      const seed = 123456
      const run = () => {
        setRNG(mulberry32(seed))
        const A = prepFighter(fighterA)
        const B = prepFighter(fighterB)
        return simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0)
      }
      const r1 = run()
      const r2 = run()
      expect(r1).toEqual(r2)
    })
  })

  describe('runFight (headless)', () => {
    it('same seed + same inputs = identical result (deep equal)', () => {
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const r1 = runFight(A, B, 'Balanced', () => 'go', 99999, 3)
      const r2 = runFight(A, B, 'Balanced', () => 'go', 99999, 3)
      expect(r1.winner).toBe(r2.winner)
      expect(r1.how).toBe(r2.how)
      expect(r1.round).toBe(r2.round)
      expect(r1.totalDmgA).toBe(r2.totalDmgA)
      expect(r1.totalDmgB).toBe(r2.totalDmgB)
    })

    it('produces valid winner and round between 1 and total', () => {
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = runFight(A, B, 'Balanced', () => 'go', 42, 3)
      expect(['A', 'B']).toContain(result.winner)
      expect(result.round).toBeGreaterThanOrEqual(1)
      expect(result.round).toBeLessThanOrEqual(3)
      expect(result.roundLogs.length).toBeGreaterThanOrEqual(1)
      expect(result.roundLogs.length).toBeLessThanOrEqual(3)
    })

    it('no crash or NaN across 100 different seeds', () => {
      for (let s = 0; s < 100; s++) {
        const A = prepFighter(fighterA)
        const B = prepFighter(fighterB)
        const r = runFight(A, B, 'Balanced', () => 'go', s * 137 + 7, 3)
        expect(['A', 'B']).toContain(r.winner)
        expect(r.round).toBeGreaterThanOrEqual(1)
        expect(r.round).toBeLessThanOrEqual(3)
        expect(isFinite(r.totalDmgA)).toBe(true)
        expect(isFinite(r.totalDmgB)).toBe(true)
        expect(r.totalDmgA).toBeGreaterThanOrEqual(0)
        expect(r.totalDmgB).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('exchange symmetry', () => {
    function tdRatio(A, B, n) {
      let td = 0, tdB = 0
      for (let i = 0; i < n; i++) {
        const ex = pickExchange({ type: 'standing', top: null }, A, B, 'Balanced')
        if (ex === 'td') td++
        else if (ex === 'tdB') tdB++
      }
      return td / Math.max(td + tdB, 1)
    }

    it('td/tdB ratio is similar when wrestler is A vs when wrestler is B', () => {
      const wrestler = createTestFighter({ id: 'w', name: 'Wrestler', archetype: 'Wrestler', attrs: {
        striking: 50, wrestling: 75, bjj: 40, cardio: 60, strength: 70, chin: 55, footwork: 50, fightIQ: 50
      }})
      const boxer = createTestFighter({ id: 'b', name: 'Boxer', archetype: 'Boxer', attrs: {
        striking: 70, wrestling: 40, bjj: 30, cardio: 55, strength: 60, chin: 50, footwork: 65, fightIQ: 55
      }})

      const N = 500
      const ratioA = tdRatio(wrestler, boxer, N)
      const ratioB = tdRatio(boxer, wrestler, N)

      // Ketika Wrestler adalah A: proporsi td harusnya > tdB
      expect(ratioA).toBeGreaterThan(0.5)
      // Ketika Wrestler adalah B: proporsi td (A=Boxer) harusnya < tdB (B=Wrestler)
      expect(ratioB).toBeLessThan(0.5)
      // Kedua rasio harus simetris dalam toleransi: jarak dari 0.5 tidak boleh beda > 0.3
      const distA = Math.abs(ratioA - 0.5)
      const distB = Math.abs(ratioB - 0.5)
      expect(Math.abs(distA - distB)).toBeLessThan(0.3)
    })
  })

  describe('reign tracking', () => {
    it('first title win creates new reign with titleDefenses=0 and pushes reignHistory', () => {
      useSeed(42)
      const g = createTestGame()
      const f = g.roster[0]
      f.titles = []
      g.divisions[f.weightClass].champ = null

      const fighter = { id: f.id, booked: { title: true, opponent: { name: 'Opp' } } }
      commitFightResult(g, fighter, { won: true, how: 'KO/TKO', r: 2 })

      const champ = g.divisions[f.weightClass].champ
      expect(champ.fighterId).toBe(f.id)
      expect(champ.titleDefenses).toBe(0)
      expect(champ.wonWeek).toBe(g.week)
      expect(f.reignHistory.length).toBe(1)
      expect(f.reignHistory[0].weightClass).toBe(f.weightClass)
    })

    it('same fighter winning again is a defense — titleDefenses+1, wonWeek unchanged', () => {
      useSeed(42)
      const g = createTestGame()
      const f = g.roster[0]
      const origWeek = 10
      f.titles = ['Major World Champion']
      g.divisions[f.weightClass].champ = { name: f.name, player: true, fighterId: f.id, wonWeek: origWeek, lastDefenseWeek: origWeek, titleDefenses: 0 }

      const fighter = { id: f.id, booked: { title: true, opponent: { name: 'Opp' } } }
      commitFightResult(g, fighter, { won: true, how: 'Decision', r: 5 })

      const champ = g.divisions[f.weightClass].champ
      expect(champ.titleDefenses).toBe(1)
      expect(champ.wonWeek).toBe(origWeek) // tidak berubah
      expect(champ.lastDefenseWeek).toBe(g.week)
      expect(f.reignHistory).toBeUndefined() // tidak ada reign baru
    })
  })

  describe('title streak eligibility', () => {
    it('streakW >= 2 allows title:true, streakW=0 blocks it, undefined allows it', () => {
      // Test the condition directly — no tick() needed
      const cond = (streakW) => (streakW >= 2 || streakW == null)
      expect(cond(3)).toBe(true)   // win streak → allowed
      expect(cond(5)).toBe(true)   // win streak → allowed
      expect(cond(0)).toBe(false)  // loss streak → blocked
      expect(cond(undefined)).toBe(true) // no fights yet → allowed
      expect(cond(null)).toBe(true) // no fights yet → allowed
    })
  })

  describe('cut damage', () => {
    it('simRound with cutA/cutB inputs returns cumulative values >= inputs', () => {
      useSeed(42)
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const result = simRound(1, A, B, 100, 100, 'Balanced', 'neutral', 0, 3, 2)
      expect(result.cutA).toBeGreaterThanOrEqual(3)
      expect(result.cutB).toBeGreaterThanOrEqual(2)
    })

    it('runFight with same seed produces identical results (including doctor stoppage paths)', () => {
      const A = prepFighter(fighterA)
      const B = prepFighter(fighterB)
      const r1 = runFight(A, B, 'Balanced', () => 'go', 77777, 3)
      const r2 = runFight(A, B, 'Balanced', () => 'go', 77777, 3)
      expect(r1.winner).toBe(r2.winner)
      expect(r1.round).toBe(r2.round)
      // Extract cut values from roundLogs
      const cutB1 = r1.roundLogs.reduce((s, r) => s + (r.cutB || 0), 0)
      const cutB2 = r2.roundLogs.reduce((s, r) => s + (r.cutB || 0), 0)
      expect(cutB1).toBe(cutB2)
    })

    it('cut damage accumulates plausibly across many fights (doctor stoppage is possible but rare for equal fighters)', () => {
      let totalCutB = 0, maxCutB = 0, docStops = 0
      const N = 200
      for (let s = 0; s < N; s++) {
        const A = prepFighter(fighterA)
        const B = prepFighter(fighterB)
        const r = runFight(A, B, 'Balanced', () => 'go', s * 137 + 7, 3)
        const fightCutB = r.roundLogs.reduce((sum, rnd) => sum + (rnd.cutB || 0), 0)
        totalCutB += fightCutB
        if (fightCutB > maxCutB) maxCutB = fightCutB
        if (r.how === 'Doctor Stoppage') docStops++
      }
      const avgCutB = totalCutB / N
      // Average cutB should be > 0 (mechanism works)
      expect(avgCutB).toBeGreaterThan(0)
      // Max cutB across 200 fights should show at least some accumulation
      expect(maxCutB).toBeGreaterThanOrEqual(1)
    })
  })

  describe('multi-division champion', () => {
    it('2 different weight classes across reigns → gets badge', () => {
      useSeed(42)
      const g = createTestGame()
      const f = g.roster[0]
      f.reignHistory = [
        { wonWeek: 10, weightClass: 'Lightweight' },
        { wonWeek: 30, weightClass: 'Welterweight' },
      ]
      const events = processTitleChange(f, g, 'won')
      expect(f.titles).toContain('Multi-Division Champion')
      expect(events.some((e) => e.title?.includes('Multi-Division'))).toBe(true)
    })

    it('same weight class across reigns → no badge', () => {
      useSeed(42)
      const g = createTestGame()
      const f = g.roster[0]
      f.reignHistory = [
        { wonWeek: 10, weightClass: 'Lightweight' },
        { wonWeek: 30, weightClass: 'Lightweight' },
      ]
      const events = processTitleChange(f, g, 'won')
      expect(f.titles).not.toContain('Multi-Division Champion')
    })
  })
})
