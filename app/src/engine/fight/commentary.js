import { pick } from "../rng.js";

// Commentary templates — extracted from fight engine for pure presentation.

export function createCommentary() {
  const summaryLog = [];
  const tickLog = [];

  const both = (min, sec, msg) => {
    const line = `[${min}:${String(sec).padStart(2, "0")}] ${msg}`;
    summaryLog.push(line); tickLog.push(line);
  };
  const tickOnly = (min, sec, msg) =>
    tickLog.push(`[${min}:${String(sec).padStart(2, "0")}] ${msg}`);

  const say = (templates, ...args) => {
    const t = pick(templates);
    return typeof t === "function" ? t(...args) : t.replace(/\{(\d+)\}/g, (_, i) => args[i] || "");
  };
  const bothS = (min, sec, templates, ...args) => both(min, sec, say(templates, ...args));
  const tickS = (min, sec, templates, ...args) => tickOnly(min, sec, say(templates, ...args));

  return { summaryLog, tickLog, both, tickOnly, say, bothS, tickS };
}

// ── STRIKING COMMENTARY ──
export const STRIKE_TEMPLATES = [
  "{0} lands {1} strikes — {2} answers with {3}.",
  "Clean exchange! {0} connects {1} times, {2} fires back {3}.",
  "{0} with a flurry — {1} shots. {2} counters with {3}.",
  "Trading leather! {0}: {1} landed, {2}: {3}.",
];
export const POWER_TEMPLATES = [
  "Big power shot from {0}! {1} felt that!",
  "HUGE right hand by {0}! {1} staggers!",
  "{0} unloads a bomb — {1} is hurt!",
];

// ── CLINCH COMMENTARY ──
export const CLINCH_TEMPLATES = [
  "Clinch — {0} lands {1}, {2} answers with {3}.",
  "In the clinch: {0}: {1}, {2}: {3}.",
];

// ── SCRAMBLE COMMENTARY ──
export const SCRAMBLE_UP_TEMPLATES = [
  "Scramble! Both fighters back up!",
  "Wild scramble — they're back to their feet!",
  "Scramble on the canvas — both fighters pop up!",
];
export const SCRAMBLE_STALL_TEMPLATES = [
  "Scramble on the ground — positions unchanged.",
  "They scramble but no change in position.",
];

// ── TRAIT COMMENTARY ──
export function traitCommentary(fight, A, B, rnd, dmgA, dmgB, landA) {
  const msgs = [];
  if (A.traits?.includes("Explosive") && rnd === 1) msgs.push(`${A.name}'s explosive style on display early.`);
  if (A.traits?.includes("Iron Chin") && dmgA > 20) msgs.push(`${A.name}'s iron chin holding up.`);
  if (B.traits?.includes("Glass Jaw") && dmgB > 25) msgs.push(`${B.name} wobbles — that glass jaw!`);
  if (A.traits?.includes("Grinder") && rnd >= 3) msgs.push(`${A.name}'s grinding pressure wearing ${B.name} down.`);
  if (A.traits?.includes("Showboat") && landA > 20) msgs.push(`${A.name} showboating — crowd loves it!`);
  if (A.traits?.includes("Warrior") && dmgA > 40) msgs.push(`${A.name} keeps firing despite taking damage — true warrior spirit!`);
  return msgs;
}
