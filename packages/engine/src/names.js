import { pick } from "./rng.js";

// One seeded roll, even when a name is occupied. Never loop on RNG collisions.
export function pickUniqueName(pool, occupied = []) {
  const used = new Set(occupied);
  const chosen = pick(pool);
  const start = pool.indexOf(chosen);
  for (let offset = 0; offset < pool.length; offset++) {
    const name = pool[(start + offset) % pool.length];
    if (!used.has(name)) return name;
  }
  let suffix = 2;
  while (used.has(`${chosen} ${suffix}`)) suffix++;
  return `${chosen} ${suffix}`;
}
