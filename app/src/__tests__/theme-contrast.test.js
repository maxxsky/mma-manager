import { it, expect } from 'vitest';
import { T } from '../ui/theme.jsx';
const luminance = hex => {
  const rgb = hex.slice(1).match(/../g).map(v => parseInt(v, 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
};
it('negative text meets WCAG AA on every panel and button text on negative fill', () => {
  for (const bg of [T.bg, T.surface, T.raised, T.raisedHi]) {
    const a = luminance(T.neg), b = luminance(bg);
    expect((Math.max(a,b) + 0.05) / (Math.min(a,b) + 0.05)).toBeGreaterThanOrEqual(4.5);
  }
});
