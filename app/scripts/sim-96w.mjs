// 96-week simulation to verify cash runway post-fix
import { createTestGame, useSeed } from '../src/__tests__/helpers.js'
import { tick } from '../src/engine/state.js'

// Run 3 seeds for reliable picture
for (const seed of [42, 12345, 999]) {
  useSeed(seed)
  const g = createTestGame()
  const snapshots = []
  let minCash = g.cash
  
  for (let w = 0; w < 96; w++) {
    tick(g)
    if (g.cash < minCash) minCash = g.cash
    if ((w + 1) % 12 === 0) snapshots.push({ week: g.week, cash: g.cash })
  }
  
  console.log(`Seed ${seed}:`)
  snapshots.forEach(s => console.log(`  W${String(s.week).padStart(3)}: $${s.cash}`))
  console.log(`  Min: $${minCash}, Final: $${g.cash}\n`)
}
