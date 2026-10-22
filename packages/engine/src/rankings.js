import { R, RI, clamp, uid } from "./rng.js";
import { WEIGHTS } from "./data.js";
import { genFighter } from "./fighter.js";
import { ensureWorldProfile, aiChampion } from "./world/fighter-profile.js";
import { genBio } from "./fighter.js";
import { TITLE_NAMES, championAt, removeChampion } from "./championships.js";

// ---------- divisions & rankings ----------
export function genDivisions() {
  const d = {};
  WEIGHTS.forEach((w) => {
    const list = [];
    for (let r = 1; r <= 15; r++) {
      const lvl = clamp(1.4 - r * 0.035, 0.8, 1.5);
      const nf = genFighter(lvl);
      nf.bio = genBio(nf);
      const baseWins = Math.round(20 - r * 0.8);
      list.push({
        id: uid(), name: nf.name, archetype: nf.archetype,
        attrs: nf.attrs, traits: nf.traits, region: nf.region, age: nf.age,
        points: Math.round(100 - r * 5 + R(-2, 2)), level: lvl,
        record: { w: baseWins + RI(-2, 2), l: RI(0, clamp(r - 3, 0, 6)), ko: Math.round((baseWins + 2) * 0.35), sub: Math.round((baseWins + 2) * 0.20), dec: 0 },
      });
      list[list.length - 1].record.dec = list[list.length - 1].record.w - list[list.length - 1].record.ko - list[list.length - 1].record.sub;
    }
    list.forEach(f => ensureWorldProfile(f, w.name));
    d[w.name] = { champ: aiChampion(list[0], w.name), tierChamps: {}, list };
  });
  return d;
}

/** The shared order for UI, eligibility, matchmaking and world simulation.
 * Returns references to fighters, without sorting/mutating the storage array.
 * The Major champion is separate (rank 0). Ties: AI first, then stable ID/name.
 */
export function divisionRankings(g, weightClass) {
  const div = g.divisions?.[weightClass];
  if (!div) return [];
  const roster = (g.roster || []).filter(f => f.weightClass === weightClass);
  const playerNames = new Set(roster.map(f => f.name));
  const entries = (div.list || [])
    .filter(f => f.name !== div.champ?.name && !playerNames.has(f.name))
    .map(fighter => ({ fighter, player: false, points: fighter.points || 0 }));
  roster.filter(f => f.rankPoints > 0 && !(div.champ?.player && div.champ.fighterId === f.id))
    .forEach(fighter => entries.push({ fighter, player: true, points: fighter.rankPoints }));
  return entries.sort((a, b) => {
    const byPoints = b.points - a.points || Number(a.player) - Number(b.player);
    if (byPoints) return byPoints;
    const keyA = String(a.fighter.id ?? a.fighter.name);
    const keyB = String(b.fighter.id ?? b.fighter.name);
    return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
  }).map((entry, i) => ({ ...entry, rank: i + 1 }));
}

export function rankedAIContenders(g, weightClass) {
  return divisionRankings(g, weightClass).filter(entry => !entry.player);
}

export function rankOf(g, f) {
  const div = g.divisions?.[f.weightClass];
  if (div?.champ?.player && div.champ.fighterId === f.id) return 0;
  const entry = divisionRankings(g, f.weightClass).find(entry => entry.player && entry.fighter.id === f.id);
  return entry?.rank <= 15 ? entry.rank : null;
}

export function vacateTitle(g, f, tier = null) {
  // Scan all divisions: callers may already have changed f.weightClass.
  Object.entries(g.divisions || {}).forEach(([wc, div]) => {
    const tiers = tier ? [tier] : Object.keys(TITLE_NAMES);
    tiers.forEach(t => {
      const champ = championAt(div, t);
      if (champ?.player && champ.fighterId === f.id) {
        removeChampion(g, wc, t);
        g.log.unshift(`👑 Title ${t} ${wc} kosong — akan diperebutkan.`);
      }
    });
  });
}

export function stripTitle(g, fighterId, tier = "Major") {
  const f = g.roster.find(x => x.id === fighterId);
  if (!f) return;
  const champ = championAt(g.divisions?.[f.weightClass], tier);
  if (!champ?.player || champ.fighterId !== f.id) return;
  vacateTitle(g, f, tier);
  f.morale = clamp(f.morale - 15, 0, 100);
  g.rep = clamp(g.rep - 5, 0, 100);
  g.log.unshift(`🚨 ${f.name} dicopot dari title ${tier} (mandatory defense diabaikan). Rep -5.`);
}

// ---------- promoter relationship ----------
import { PROMO_TIERS } from "./data.js";

export function initPromoterRel() {
  const o = {};
  PROMO_TIERS.forEach((t) => { o[t] = 30; });
  return o;
}
