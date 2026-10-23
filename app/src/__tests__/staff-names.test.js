import { it, expect, afterEach } from 'vitest';
import { newGame } from '@ironfist/engine/state.js';
import { setRNG, mulberry32, resetRNG } from '@ironfist/engine/rng.js';
import { tickSettlement } from '@ironfist/engine/tick/settlement.js';
import { pickUniqueName } from '@ironfist/engine/names.js';
afterEach(resetRNG);

it('keeps hired staff and the entire monthly market distinct across seeds', () => {
  for (let seed = 0; seed < 50; seed++) {
    setRNG(mulberry32(seed));
    const g = newGame(); g.rep = 100;
    expect(new Set(g.coachMarket.map(c => c.name)).size).toBe(3);
    for (let month = 1; month <= 3; month++) {
      g.week = month * 4; tickSettlement(g);
      const people = [...g.coaches, ...g.coachMarket, ...Object.values(g.staff || {}).filter(Boolean), ...Object.values(g.staffMarket).flat()];
      expect(new Set(people.map(c => c.name)).size).toBe(people.length);
      g.staff ??= {};
      g.staff.cutman ||= g.staffMarket.cutman[0];
    }
  }
});
it('terminates even with a constant RNG and exhausted name pool', () => {
  setRNG(() => 0);
  expect(pickUniqueName(['A', 'B'], ['A'])).toBe('B');
  expect(pickUniqueName(['A', 'B'], ['A', 'B', 'A 2'])).toBe('A 3');
});
