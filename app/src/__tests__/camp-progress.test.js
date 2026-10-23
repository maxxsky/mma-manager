import { it, expect } from 'vitest';
import { checkAchievements } from '@ironfist/engine/achievements.js';
import { getPrestige } from '@ironfist/engine/prestige.js';
import { createTestGame } from './helpers.js';
it('ties camp achievement progress to visible prestige and preserves saved badges', () => {
  const g = createTestGame({ legacy: 999999 });
  g._dynasty = { championsProduced: 6 };
  expect(getPrestige(g)).toBeGreaterThanOrEqual(12);
  expect(checkAchievements(g)).toContain('legacy_1k');
  expect(g._unlocked).not.toContain('legacy_5k');
  g._unlocked.push('legacy_5k');
  g._dynasty = {};
  checkAchievements(g);
  expect(g._unlocked).toContain('legacy_5k');
});
