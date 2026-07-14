import { R, RI, clamp, pick, random, uid } from "./rng.js";
import { WEIGHTS, RIVAL_TRAITS } from "./data.js";
import { genFighter } from "./fighter.js";
import { genBio } from "./fighter.js";
import { recordEra } from "./world/history.js";

// ── Archetype → RIVAL_TRAITS spec mapping ──
const ARCH_TO_SPEC = {
  "Boxer": "striking",
  "Muay Thai": "striking",
  "Wrestler": "wrestling",
  "BJJ Specialist": "bjj",
  "All-Rounder": null,
};

/**
 * Weighted random pick from items array.
 * Higher weight = higher probability.
 */
function weightedPick(items, weights) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/**
 * Select 2-4 fighters from a division list and mark them with campId/campName.
 * Weighted by camp rep, with spec-matching priority.
 */
function assignCampMarkings(list, rivals) {
  const count = RI(2, 4);
  const available = list.map((f, i) => ({ fighter: f, idx: i }));
  const result = [];

  for (let c = 0; c < count && available.length > 0 && rivals.length > 0; c++) {
    // Compute camp weights: base = rep, boost if spec-matched fighters remain
    const campWeights = rivals.map((rc) => {
      const spec = RIVAL_TRAITS[rc.trait]?.spec;
      let w = rc.rep;
      // Bonus if any remaining fighter matches this camp's spec
      const hasMatch = available.some((a) => {
        const fighterSpec = ARCH_TO_SPEC[a.fighter.archetype];
        return spec && fighterSpec === spec;
      });
      if (hasMatch) w *= 1.5;
      return Math.max(1, Math.round(w));
    });

    const camp = weightedPick(rivals, campWeights);
    const spec = RIVAL_TRAITS[camp.trait]?.spec;

    // Pick fighter — prefer spec match, fallback to any
    let chosen;
    const matching = available.filter((a) => {
      const fighterSpec = ARCH_TO_SPEC[a.fighter.archetype];
      return spec && fighterSpec === spec;
    });
    if (matching.length > 0 && random() < 0.7) {
      chosen = pick(matching);
    } else {
      chosen = pick(available);
    }

    if (chosen) {
      chosen.fighter.campId = camp.id;
      chosen.fighter.campName = camp.name;
      result.push(chosen);
      const idx = available.findIndex((a) => a.idx === chosen.idx);
      if (idx !== -1) available.splice(idx, 1);
    }
  }

  return result;
}

// ---------- divisions & rankings ----------
export function genDivisions(rivals = []) {
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
        points: Math.round(100 - r * 5 + R(-2, 2)), level: lvl,
        record: { w: baseWins + RI(-2, 2), l: RI(0, clamp(r - 3, 0, 6)), ko: Math.round((baseWins + 2) * 0.35), sub: Math.round((baseWins + 2) * 0.20), dec: 0 },
      });
      list[list.length - 1].record.dec = list[list.length - 1].record.w - list[list.length - 1].record.ko - list[list.length - 1].record.sub;
    }
    // Assign camp markings after all 15 fighters are generated
    if (rivals.length > 0) {
      assignCampMarkings(list, rivals);
    }
    d[w.name] = { champ: { name: list[0].name, player: false, fighterId: null }, list };
  });
  return d;
}

export function rankOf(g, f) {
  const div = g.divisions && g.divisions[f.weightClass];
  if (!div || !(f.rankPoints > 0)) return null;
  const better = div.list.filter((c) => c.points > f.rankPoints).length;
  return better < 15 ? better + 1 : null;
}

export function vacateTitle(g, f) {
  const div = g.divisions && g.divisions[f.weightClass];
  if (div && div.champ && div.champ.player && div.champ.fighterId === f.id) {
    // ── Era ends if active ──
    if (div.era) {
      g.inbox.unshift({ id: uid(), type: "world", severity: "major", title: `The ${div.era.championName} Era Ends`, body: `${div.era.championName}'s era of dominance in ${f.weightClass} has come to an end after ${div.era.defenses} title defenses.` });
      recordEra(g, div.era.championName, f.weightClass, div.era.startedWeek, g.week, div.era.defenses);
      div.era = null;
    }
    div.champ = null;
    g.log.unshift(`👑 Title ${f.weightClass} kosong — akan diperebutkan.`);
  }
}

export function stripTitle(g, fighterId) {
  const f = g.roster.find((x) => x.id === fighterId);
  if (!f) return;
  vacateTitle(g, f);
  f.titles = f.titles.filter((t) => t !== "Major World Champion");
  f.morale = clamp(f.morale - 15, 0, 100);
  g.rep = clamp(g.rep - 5, 0, 100);
  g.log.unshift(`🚨 ${f.name} dicopot dari title (mandatory defense diabaikan). Rep -5.`);
}

// ---------- promoter relationship ----------
import { PROMO_TIERS } from "./data.js";

export function initPromoterRel() {
  const o = {};
  PROMO_TIERS.forEach((t) => { o[t] = 30; });
  return o;
}
