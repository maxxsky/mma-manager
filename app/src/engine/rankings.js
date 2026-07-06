import { R, RI, clamp, pick, uid } from "./rng.js";
import { WEIGHTS } from "./data.js";
import { genFighter } from "./fighter.js";

// ---------- divisions & rankings ----------
export function genDivisions() {
  const d = {};
  WEIGHTS.forEach((w) => {
    const list = [];
    for (let r = 1; r <= 15; r++) {
      const lvl = clamp(1.4 - r * 0.035, 0.8, 1.5);
      const nf = genFighter(lvl);
      list.push({
        id: uid(), name: nf.name, archetype: nf.archetype,
        points: Math.round(100 - r * 5 + R(-2, 2)), level: lvl,
      });
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
  if (div && div.champ.player && div.champ.fighterId === f.id) {
    const newChamp = div.list[0];
    div.champ = { name: newChamp.name, player: false, fighterId: null };
    g.log.unshift(`👑 Title ${f.weightClass} vakum — ${newChamp.name} (#1 contender) naik jadi juara baru.`);
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
