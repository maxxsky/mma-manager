// Rankings domain — AI movement, rotation, player rank decay
import { RI, clamp, R, uid } from "../rng.js";
import { genFighter } from "../fighter.js";

export function tickRankings(g) {
  if (!g || !g.divisions) return;
  // AI ranking jitter
  Object.values(g.divisions).forEach((d) =>
    d.list.forEach((c) => { c.points = clamp(c.points + RI(-8, 12), 5, 120); })
  );

  // AI fighter rotation every 48 weeks
  if (g.week % 48 === 0) {
    Object.values(g.divisions).forEach((d) => {
      const retireCount = 3;
      const retired = d.list.splice(d.list.length - retireCount, retireCount);
      const retiredNames = retired.map((x) => x.name).join(", ");
      for (let i = 0; i < retireCount; i++) {
        const lvl = R(0.5, 0.85);
        const nf = genFighter(lvl);
        d.list.push({
          id: uid(), name: nf.name, archetype: nf.archetype,
          points: Math.round(R(10, 25)), level: lvl,
          record: { w: RI(0, 3), l: RI(0, 2), ko: 0, sub: 0, dec: 0 },
        });
      }
      g.log.unshift(`🔄 Divisi — 3 fighter pensiun diganti prospect baru. (${retiredNames})`);
    });
  }

  // Player rank decay
  g.roster.forEach((f) => {
    if (f.injury || f.booked) return;
    if (!f.rankPoints || f.rankPoints <= 0) return;
    const weeksSinceFight = g.week - (f.lastFightWeek || 0);
    if (weeksSinceFight > 24) {
      f.rankPoints = Math.max(1, f.rankPoints - 1);
      if (weeksSinceFight > 36 && g.week % 4 === 0) {
        g.log.unshift(`📉 ${f.name}: rank pts -1 karena ${Math.floor(weeksSinceFight / 4)} bulan tanpa fight.`);
      }
    }
  });
}
