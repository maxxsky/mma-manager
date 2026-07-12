// Active simulation — player accepts all fight offers and completes them
import { createTestGame, useSeed } from '../src/__tests__/helpers.js'
import { tick } from '../src/engine/state.js'
import { commitFightResult } from '../src/engine/fights/commitResult.js'
import { runFight, prepFighter } from '../src/engine/fight.js'
import { genFighter } from '../src/engine/fighter.js'

function resolveAllFights(g) {
  const offers = g.inbox.filter(m => m.type === 'offer')
  offers.forEach(m => {
    const f = g.roster.find(x => x.id === m.fighterId)
    if (!f || f.booked || f.injury) return
    f.booked = {
      opponent: m.opponent, weeksLeft: m.weeks,
      show: m.show, winBonus: m.winBonus,
      tier: m.tier, title: m.title,
      titleTier: m.titleTier, defense: m.defense,
      oppRank: m.oppRank, contenderId: m.contenderId,
      seed: (Math.random() * 2**31) | 0,
    }
    g.inbox = g.inbox.filter((x) => x.id !== m.id)
  })
}

function simulateFightNight(fighter, g) {
  if (!fighter || !fighter.booked || !fighter.booked.opponent) return null
  const totalRounds = fighter.booked.title === true ? 5 : 3
  
  // Build a proper opponent with attrs for the fight engine
  const oppData = fighter.booked.opponent
  const oppLevel = oppData.level || 0.7
  const opp = genFighter(oppLevel)
  opp.name = oppData.name
  opp.archetype = oppData.archetype || opp.archetype
  
  const A = prepFighter(fighter)
  const B = prepFighter(opp)
  const plan = 'Balanced'
  const seed = fighter.booked.seed || (Math.random() * 2**31) | 0
  
  const result = runFight(A, B, plan, () => 'go', seed, totalRounds)
  if (!result) return null
  
  const won = result.winner === 'A'
  const how = result.finish ? result.finish.how : 'Decision'
  const r = result.finish ? result.finish.duringRound : totalRounds
  const totalDmgA = result.totalDmgA || 0
  const totalDmgB = result.totalDmgB || 0
  return { won, how, r, totalDmgA, totalDmgB }
}

for (const seed of [42, 12345, 999]) {
  useSeed(seed)
  const g = createTestGame()
  const snapshots = []
  let minCash = g.cash

  for (let w = 0; w < 96; w++) {
    tick(g)
    
    // Accept all fight offers
    resolveAllFights(g)
    
    // Complete booked fights that are due
    g.roster.forEach(f => {
      if (f.booked && f.booked.weeksLeft <= 0) {
        const result = simulateFightNight(f, g)
        if (result) {
          commitFightResult(g, f, result)
        }
      }
    })
    
    if (g.cash < minCash) minCash = g.cash
    if ((w + 1) % 12 === 0) snapshots.push({ week: g.week, cash: g.cash, rep: g.rep })
  }

  console.log(`Seed ${seed} (ACTIVE):`)
  snapshots.forEach(s => console.log(`  W${String(s.week).padStart(3)}: $${s.cash}  rep=${Math.round(s.rep)}`))
  console.log(`  Min: $${minCash}, Final: $${g.cash}\n`)
}
