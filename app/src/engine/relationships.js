import { clamp } from "./rng.js";

export const relKey = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);

export function getRel(g, a, b) {
  return g.relationships?.[relKey(a, b)] || 0;
}

export function addRel(g, a, b, amt) {
  const k = relKey(a, b);
  g.relationships[k] = clamp((g.relationships[k] || 0) + amt, -100, 100);
}
