// Promises to fighters (P2 #31, FI5). "Promise a fight" and "promise an
// upgrade" used to raise morale on the spot with nothing recorded, so they
// were free. Now each promise is stored with a deadline: keeping it gives a
// small bonus, breaking it costs more morale and loyalty than it gained.
import { clamp } from "./rng.js";
import { FAC_LABEL } from "./data.js";
import { pushInboxEvent } from "./events.js";

export const PROMISE_RULES = {
  fight:   { weeks: 12, keptMorale: 2, brokenMorale: -10, brokenLoyalty: -8 },
  upgrade: { weeks: 24, keptMorale: 2, brokenMorale: -8,  brokenLoyalty: -6 },
};

export function makePromise(g, f, type, extra = {}) {
  if (!f.promises) f.promises = [];
  if (f.promises.some((p) => p.type === type)) return null; // one open promise per kind
  const p = { type, madeWeek: g.week, dueWeek: g.week + PROMISE_RULES[type].weeks, ...extra };
  f.promises.push(p);
  return p;
}

function isKept(g, f, p) {
  if (p.type === "fight") return !!f.booked || (f.lastFightWeek || 0) > p.madeWeek;
  if (p.type === "upgrade") return (g.facilities?.[p.fac] || 0) > p.levelAt;
  return false;
}

/** Weekly: settle every open promise that was kept or has run past its deadline. */
export function checkPromises(g) {
  (g.roster || []).forEach((f) => {
    if (!f.promises?.length) return;
    f.promises = f.promises.filter((p) => {
      const r = PROMISE_RULES[p.type];
      if (!r) return false;
      if (isKept(g, f, p)) {
        f.morale = clamp(f.morale + r.keptMorale, 0, 100);
        g.log.unshift(`🤝 Janji ke ${f.name} ditepati. Morale +${r.keptMorale}.`);
        return false;
      }
      if (g.week > p.dueWeek) {
        f.morale = clamp(f.morale + r.brokenMorale, 0, 100);
        f.loyalty = clamp((f.loyalty ?? 50) + r.brokenLoyalty, 0, 100);
        const what = p.type === "fight" ? "mencarikan fight" : `meng-upgrade ${FAC_LABEL[p.fac] || p.fac}`;
        pushInboxEvent(g, {
          type: "event", title: `💔 ${f.name} — janji diingkari`,
          body: `Kamu berjanji ${what}, tapi tenggatnya lewat. Morale ${r.brokenMorale}, loyalty ${r.brokenLoyalty}.`,
          choices: [{ label: "OK", chem: 0 }],
        });
        return false;
      }
      return true;
    });
  });
}
