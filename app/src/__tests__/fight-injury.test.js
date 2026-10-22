// P1 #22 (FT7): fight injuries depend on damage taken and the medical
// facility, use the right label table for doctor stoppages, and have no dead
// TKO entry the engine can never produce.
import { describe, it, expect, afterEach } from 'vitest'
import { setRNG, resetRNG } from '@ironfist/engine/rng.js'
import { FIGHT_INJURY_CHANCE, FIGHT_INJURY_LABELS, FIGHT_INJURY_DMG_REF } from '@ironfist/engine/data.js'
import { fightInjuryChance, fightInjuryHowKey, medicalInjuryMult } from '@ironfist/engine/fights/injury.js'
import { commitFightResult } from '@ironfist/engine/fights/commitResult.js'
import { createTestGame } from './helpers.js'

afterEach(() => resetRNG())

const game = (medical = 1) => { const g = createTestGame(); g.facilities.medical = medical; return g }
const lossBy = (how, totalDmgA) => ({ won: false, how, r: 2, totalDmgA, totalDmgB: 20 })

describe('fightInjuryChance', () => {
  it('maps every engine finish to a key with a chance, damage reference and labels', () => {
    for (const how of ['KO/TKO', 'Doctor Stoppage', 'Submission', 'Decision']) {
      const k = fightInjuryHowKey(how)
      for (const side of ['winner_', 'loser_']) {
        expect(FIGHT_INJURY_CHANCE[side + k]).toBeGreaterThan(0)
        expect(FIGHT_INJURY_DMG_REF[side + k]).toBeGreaterThan(0)
      }
      expect(FIGHT_INJURY_LABELS[k]?.length).toBeGreaterThan(0)
    }
    expect(Object.keys(FIGHT_INJURY_CHANCE).some((k) => k.includes('TKO'))).toBe(false)
  })

  it('scales with damage taken: base at the reference, half at zero, capped at double', () => {
    const g = game(1)
    const f = { traits: [] }
    const base = FIGHT_INJURY_CHANCE.loser_KO
    const ref = FIGHT_INJURY_DMG_REF.loser_KO
    expect(fightInjuryChance(g, f, lossBy('KO/TKO', ref)).chance).toBeCloseTo(base)
    expect(fightInjuryChance(g, f, lossBy('KO/TKO', 0)).chance).toBeCloseTo(base * 0.5)
    expect(fightInjuryChance(g, f, lossBy('KO/TKO', ref * 2)).chance).toBeCloseTo(base * 1.5)
    expect(fightInjuryChance(g, f, lossBy('KO/TKO', ref * 50)).chance).toBeCloseTo(base * 2)
    expect(fightInjuryChance(g, f, lossBy('KO/TKO', undefined)).chance).toBeCloseTo(base)
  })

  it('medical facility and traits reduce or raise the chance like training injuries', () => {
    const f = { traits: [] }
    const ref = FIGHT_INJURY_DMG_REF.loser_Submission
    const at = (med, traits = []) => fightInjuryChance(game(med), { traits }, lossBy('Submission', ref)).chance
    expect(medicalInjuryMult(game(1))).toBe(1)
    expect(at(5)).toBeCloseTo(at(1) * 0.8)
    expect(at(1, ['Cautious'])).toBeCloseTo(at(1) * 0.85)
    expect(at(1, ['Injury Prone'])).toBeCloseTo(at(1) * 2)
    expect(fightInjuryChance(game(1), f, { won: false, how: 'Mystery' }).chance).toBe(0)
  })
})

describe('commitFightResult injury roll', () => {
  function commit(g, result, roll) {
    const f = g.roster[0]
    f.injury = null
    let calls = 0
    setRNG(() => (calls++ === 0 ? roll : 0)) // first draw decides injury, the rest pick tier/label
    commitFightResult(g, { id: f.id, booked: { opponent: { name: 'Opp', level: 0.8 }, show: 1000, winBonus: 500 } }, result)
    resetRNG()
    return f
  }

  it('a doctor stoppage loss uses doctor-stoppage injury labels', () => {
    const g = game(1)
    const f = commit(g, lossBy('Doctor Stoppage', 50), 0)
    expect(f.injury).toBeTruthy()
    expect(FIGHT_INJURY_LABELS.Doctor).toContain(f.injury.label)
  })

  it('the same roll injures a battered fighter but not an untouched one', () => {
    const roll = FIGHT_INJURY_CHANCE.loser_KO * 0.8
    expect(commit(game(1), lossBy('KO/TKO', 200), roll).injury).toBeTruthy()
    expect(commit(game(1), lossBy('KO/TKO', 0), roll).injury).toBeNull()
  })

  it('the same roll injures at medical level 1 but not at level 5', () => {
    const ref = FIGHT_INJURY_DMG_REF.loser_KO
    const roll = FIGHT_INJURY_CHANCE.loser_KO * 0.9
    expect(commit(game(1), lossBy('KO/TKO', ref), roll).injury).toBeTruthy()
    expect(commit(game(5), lossBy('KO/TKO', ref), roll).injury).toBeNull()
  })
})
