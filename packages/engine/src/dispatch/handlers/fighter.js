// Fighter handlers — release, retire, convince, toCoach, morale, poach counter, promises
import { clamp, uid } from "../../rng.js";
import { vacateTitle } from "../../rankings.js";
import { recordRetirement } from "../../world/history.js";
import { avgSkill } from "../../fighter.js";
import { checkHallOfFame } from "../../dynasty.js";
import { pushInboxEvent, onFightComplaintIgnored } from "../../events.js";
import { makePromise } from "../../promises.js";
import { uniqueName } from "../../names.js";

export function registerFighterHandlers(register) {
  register("release", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.release);
    if (!f) return;
    vacateTitle(g, f);
    g.roster = g.roster.filter((x) => x.id !== c.release);
    g.chemistry = clamp(g.chemistry - 5, 0, 100);
    g.log.unshift(`👋 ${f.name} di-release.`);
  });

  register("retire", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.retire);
    if (!f) return;
    vacateTitle(g, f);
    recordRetirement(g, g.week, f.weightClass, f.name);
    const hof = checkHallOfFame(f, g);
    if (hof) {
      g.log.unshift(`🏛️ ${f.name} inducted into the Hall of Fame!`);
      pushInboxEvent(g, { type: "event", title: `🏛️ Hall of Fame`, body: `${f.name} has been inducted into the Hall of Fame! Record: ${hof.record}. ${hof.highlights.join(" · ")}`, choices: [{ label: "Legendary", chem: 3 }] });
    }
    g.roster = g.roster.filter((x) => x.id !== c.retire);
    g.rep = clamp(g.rep + 3, 0, 100);
    g.log.unshift(`🎗️ ${f.name} pensiun. Rep +3.`);
  });

  register("convince", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.convince);
    if (!f) return;
    if (f.morale >= 60 && !f.convincedOnce) {
      f.convincedOnce = true;
      f.morale = clamp(f.morale - 10, 0, 100);
      g.log.unshift(`🤝 ${f.name} setuju satu run terakhir.`);
    } else {
      vacateTitle(g, f);
      g.roster = g.roster.filter((x) => x.id !== c.convince);
      g.log.unshift(`🎗️ ${f.name} tetap pensiun.`);
    }
  });

  register("toCoach", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.toCoach);
    if (!f) return;
    vacateTitle(g, f);
    g.roster = g.roster.filter((x) => x.id !== c.toCoach);
    const cap2 = g.rep >= 50 ? 3 : g.rep >= 10 ? 2 : 1;
    if (g.coaches.length < cap2) {
      const specMap = { Boxer: "Striking", "Muay Thai": "Striking", Wrestler: "Wrestling", "BJJ Specialist": "BJJ", "All-Rounder": "Head" };
      const sk = clamp(Math.round(avgSkill(f) / 12), 2, 8);
      const occupied = [...g.coaches, ...(g.coachMarket || []), ...Object.values(g.staff || {}).filter(Boolean), ...Object.values(g.staffMarket || {}).flat()].map(person => person.name);
      const name = uniqueName("Coach " + f.name.split(" ").pop(), occupied);
      g.coaches.push({ id: uid(), name, spec: specMap[f.archetype] || "Head", skill: sk, salary: sk * 1800 });
      g.chemistry = clamp(g.chemistry + 5, 0, 100);
      g.log.unshift(`👨‍🏫 ${f.name} pensiun dan jadi coach.`);
    }
  });

  // Ignoring a fighter who asked to leave is remembered.
  //
  // The engine already contains a "fighter frustrated" event whose trigger is
  // three ignored complaints, but nothing ever recorded one — a reachability
  // scan showed onFightComplaintIgnored was exported and never called, and
  // there is no complaint feature anywhere in the codebase. The branch was
  // unreachable by construction.
  //
  // Rather than invent a complaint system, this hangs the memory on an action
  // the player already takes: brushing off a retention request. Ignore the same
  // fighter three times and he starts talking to other camps.
  register("complaint", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.complaint);
    if (!f) return;
    onFightComplaintIgnored(g, f);
  });

  // One { id, amt } or a list of them.
  register("moraleTo", ({ g, c }) => {
    [].concat(c.moraleTo || []).forEach(({ id, amt }) => {
      const f = g.roster.find((x) => x.id === id);
      if (!f || !amt) return;
      f.morale = clamp(f.morale + amt, 0, 100);
      g.log.unshift(`${amt > 0 ? "🙂" : "😕"} Morale ${f.name} ${amt > 0 ? "+" : ""}${amt}.`);
    });
  });

  register("letGo", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.letGo);
    if (!f) return;
    vacateTitle(g, f);
    g.roster = g.roster.filter((x) => x.id !== c.letGo);
    g.rep = clamp(g.rep - 3, 0, 100);
    g.chemistry = clamp(g.chemistry - 5, 0, 100);
    g.log.unshift(`🚪 ${f.name} pindah ke camp lain.`);
  });

  register("talk", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.talk);
    if (!f) return;
    if (g.chemistry >= 50) {
      f.morale = clamp(f.morale + 15, 0, 100);
      g.chemistry = clamp(g.chemistry - 5, 0, 100);
      g.log.unshift(`🤝 ${f.name} diyakinkan bertahan.`);
    } else {
      vacateTitle(g, f);
      g.roster = g.roster.filter((x) => x.id !== c.talk);
      g.log.unshift(`🚪 ${f.name} tetap pergi.`);
    }
  });

  register("counter", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.counter.fighterId);
    if (!f || g.cash < c.counter.cost) return;
    g.cash -= c.counter.cost;
    f.morale = clamp(f.morale + 20, 0, 100);
    if (f.contract) f.contract.managerCut = clamp((f.contract.managerCut || 0.18) + 0.02, 0, 0.35);
    g.log.unshift(`💰 ${f.name} dipertahankan.`);
  });

  // Promises are recorded with a deadline (promises.js): kept pays a little,
  // broken costs morale and loyalty.
  register("fightPromise", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.fightPromise);
    if (!f) return;
    f.morale = clamp(f.morale + 3, 0, 100);
    const p = makePromise(g, f, "fight");
    if (p) g.log.unshift(`📝 Janji ke ${f.name}: fight sebelum minggu ${p.dueWeek}.`);
  });

  register("upgradePromise", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.upgradePromise?.fighterId);
    if (!f) return;
    f.morale = clamp(f.morale + 4, 0, 100);
    const fac = c.upgradePromise.fac;
    const p = makePromise(g, f, "upgrade", { fac, levelAt: g.facilities?.[fac] || 0 });
    if (p) g.log.unshift(`📝 Janji ke ${f.name}: upgrade fasilitas sebelum minggu ${p.dueWeek}.`);
  });

  register("applyTrainingRec", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.applyTrainingRec.fighterId);
    if (!f) return;
    f.training = { type: c.applyTrainingRec.program, intensity: f.training?.intensity || "Medium" };
    g.log.unshift(`🎯 ${f.name} beralih ke training ${c.applyTrainingRec.program}.`);
  });
}
