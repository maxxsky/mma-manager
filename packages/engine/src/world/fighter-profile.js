// Persist combat identity on world entries. Legacy profiles use an independent
// seed, so repairing a save never consumes the world's simulation RNG or IDs.
import { ATTRS, ARCHETYPES, WEIGHTS, TRAIT_KEYS, TRAIT_CONFLICTS } from "../data.js";
import { clamp, mulberry32 } from "../rng.js";

export function ensureWorldProfile(f, weightClass) {
  const identity = `${weightClass}|${f.id ?? f.worldFighterId ?? ""}|${f.name}`;
  let seed = 2166136261;
  for (let i = 0; i < identity.length; i++) seed = Math.imul(seed ^ identity.charCodeAt(i), 16777619);
  const roll = mulberry32(seed >>> 0);
  const level = Number.isFinite(f.level) ? f.level : 1.2;
  f.attrs ||= {};
  ATTRS.forEach(k => {
    const generated = clamp(Math.round((level * 60 + roll() * 24 - 12) * (ARCHETYPES[f.archetype]?.[k] ?? 1)), 15, 95);
    if (!Number.isFinite(f.attrs[k])) f.attrs[k] = generated;
  });
  if (!Array.isArray(f.traits)) {
    f.traits = [];
    for (let tries = 0; f.traits.length < 2 && tries < 100; tries++) {
      const trait = TRAIT_KEYS[Math.floor(roll() * TRAIT_KEYS.length)];
      if (!f.traits.includes(trait) && !(TRAIT_CONFLICTS[trait] || []).some(t => f.traits.includes(t))) f.traits.push(trait);
    }
  }
  f.weightClass = weightClass;
  const limit = WEIGHTS.find(w => w.name === weightClass)?.limit;
  if (!Number.isFinite(f.natWeight) && limit) f.natWeight = Math.round(limit * (1 + roll() * 0.09));
  f.age ??= 22 + Math.floor(roll() * 11);
  f.morale ??= 70;
  f.popularity ??= Math.round(level * 15);
  f.overtraining ??= 0;
  f.record ||= { w: 0, l: 0, ko: 0, sub: 0, dec: 0 };
  return f;
}

export function worldOpponent(f, weightClass) {
  return structuredClone(ensureWorldProfile(f, weightClass));
}

export function championFighter(div, champ, weightClass, roster = []) {
  if (champ.player) return roster.find(f => f.id === champ.fighterId) || champ;
  const entry = div.list?.find(f => champ.worldFighterId != null ? f.id === champ.worldFighterId : f.name === champ.name);
  return ensureWorldProfile(entry || champ, weightClass);
}

export function aiChampion(f, weightClass) {
  return { ...worldOpponent(f, weightClass), player: false, fighterId: null, worldFighterId: f.id };
}

export function migrateWorldProfiles(g) {
  Object.entries(g.divisions || {}).forEach(([wc, div]) => {
    // Preserve a fight already accepted/offered in a legacy save when it has
    // the only known combat attributes for that contender. Bookings win over
    // inbox snapshots; subsequent offers use this canonical stored profile.
    const snapshots = [
      ...(g.roster || []).filter(f => f.weightClass === wc).map(f => f.booked),
      ...(g.inbox || []).filter(m => m.type === "offer" && g.roster?.some(f => f.id === m.fighterId && f.weightClass === wc)),
    ].filter(Boolean);
    snapshots.forEach(booking => {
      const opp = booking.opponent;
      if (!opp || !ATTRS.every(k => Number.isFinite(opp.attrs?.[k]))) return;
      const entry = div.list?.find(f => booking.contenderId != null ? f.id === booking.contenderId : f.name === opp.name);
      if (!entry || ATTRS.every(k => Number.isFinite(entry.attrs?.[k]))) return;
      entry.attrs = { ...opp.attrs };
      entry.traits = [...(opp.traits || [])];
      entry.archetype = opp.archetype || entry.archetype;
      entry.natWeight = opp.natWeight;
    });
    (div.list || []).forEach(f => ensureWorldProfile(f, wc));
    [div.champ, ...Object.values(div.tierChamps || {})].filter(c => c && !c.player).forEach(champ => {
      const f = championFighter(div, champ, wc);
      Object.assign(champ, worldOpponent(f, wc), { player: false, fighterId: null, worldFighterId: f.id });
    });
  });
}

// Career development changes the stored attributes without rolling a new style.
export function changeWorldLevel(f, level) {
  const oldLevel = f.level;
  f.level = level;
  if (f.attrs && oldLevel > 0) ATTRS.forEach(k => {
    if (Number.isFinite(f.attrs[k])) f.attrs[k] = clamp(Math.round(f.attrs[k] * level / oldLevel), 15, 95);
  });
}
