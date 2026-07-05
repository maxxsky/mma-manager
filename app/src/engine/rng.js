// ---------- seedable RNG (mulberry32) ----------
// Ganti Math.random() di engine — server & client bisa reproduce fight yg sama
export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Default random: masih Math.random() untuk non-fight logic
// Fight engine akan override dengan RNG ber-seed
let _rng = Math.random;

export function setRNG(fn) {
  _rng = fn;
}

export function resetRNG() {
  _rng = Math.random;
}

export function random() {
  return _rng();
}

// ---------- utility ----------
export const R = (a, b) => a + random() * (b - a);
export const RI = (a, b) => Math.floor(R(a, b + 1));
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const pick = (arr) => arr[RI(0, arr.length - 1)];
export const fmt$ = (n) =>
  (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");

let UID = 1;
export const uid = () => UID++;
export const resetUID = () => { UID = 1; };
