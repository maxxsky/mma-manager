/**
 * @typedef {Object} Fighter
 * @property {number} id
 * @property {string} name
 * @property {number} age
 * @property {string} region
 * @property {string} archetype - Boxer | Muay Thai | Wrestler | BJJ Specialist | All-Rounder
 * @property {string} weightClass
 * @property {number} natWeight
 * @property {Object<string,number>} attrs - striking, wrestling, bjj, footwork, strength, cardio, chin, fightIQ
 * @property {Object<string,number>} ceilings
 * @property {string[]} traits
 * @property {number} morale
 * @property {number} popularity
 * @property {number} overtraining
 * @property {?{weeks:number, label:string, tier:number}} injury
 * @property {{type:string, intensity:string}} training
 * @property {?{opponent:Fighter, weeksLeft:number, show:number, winBonus:number, tier:string, titleTier:string}} booked
 * @property {{w:number, l:number, ko:number, sub:number, dec:number}} record
 * @property {string[]} titles
 * @property {string} ambition
 * @property {number} rankPoints
 * @property {string} agent
 * @property {?{managerCut:number, fightsLeft:number, fightsTotal:number, durationMo:number, medical:string}} contract
 *
 * @typedef {Object} Game
 * @property {number} week
 * @property {number} cash
 * @property {number} rep
 * @property {number} chemistry
 * @property {Fighter[]} roster
 * @property {Object[]} coaches
 * @property {Object[]} inbox
 * @property {string[]} log
 * @property {Object<string,Object>} divisions
 * @property {?{amount:number, weeklyPayment:number, remaining:number}} loan
 * @property {Object[]} investors
 * @property {Object[]} sponsors
 * @property {number} legacy
 */

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
export const clamp = (v, a, b) => { const n = isNaN(v) ? a : v; return Math.min(b, Math.max(a, n)); };
export const pick = (arr) => arr[RI(0, arr.length - 1)];
export const fmt$ = (n) =>
  (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");

let UID = 1;
export const uid = () => UID++;
export const resetUID = () => { UID = 1; };
