// Class change handlers — accept, reject weight class changes
import { clamp, R } from "../../rng.js";
import { WEIGHTS } from "../../data.js";
import { vacateTitle } from "../../rankings.js";

export function registerClassChangeHandlers(register) {
  register("classChangeAccept", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.classChangeAccept.fighterId);
    if (!f) return;
    const oldClass = f.weightClass;
    const delta = c.classChangeAccept.targetIdx - WEIGHTS.findIndex((w) => w.name === oldClass);
    f.weightClassDelta = (f.weightClassDelta || 0) + delta;
    f.weightClass = c.classChangeAccept.targetClass;
    f.natWeight = Math.round(WEIGHTS[c.classChangeAccept.targetIdx].limit * R(1.0, 1.09));
    vacateTitle(g, f);
    f.rankPoints = Math.max(0, f.rankPoints - 20);
    f.morale = clamp(f.morale + c.classChangeAccept.moraleEffect, 0, 100);
    f.lastClassChange = g.week;
    g.log.unshift(`⚖️ ${f.name} pindah ke ${c.classChangeAccept.targetClass}.`);
  });

  register("classChangeReject", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.classChangeReject.fighterId);
    if (!f) return;
    f.morale = clamp(f.morale + c.classChangeReject.moralePenalty, 0, 100);
    f.lastClassChange = g.week;
    g.log.unshift(`🙅 ${f.name} minta pindah kelas — ditolak.`);
  });
}
