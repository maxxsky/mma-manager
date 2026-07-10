// Fighter handlers — release, retire, convince, toCoach, morale, poach counter, promises
import { clamp, uid } from "../../rng.js";
import { vacateTitle } from "../../rankings.js";
import { avgSkill } from "../../fighter.js";
import { checkHallOfFame } from "../../dynasty.js";

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
    const hof = checkHallOfFame(f, g);
    if (hof) {
      g.log.unshift(`🏛️ ${f.name} inducted into the Hall of Fame!`);
      g.inbox.unshift({ id: uid(), type: "event", title: `🏛️ Hall of Fame`, body: `${f.name} has been inducted into the Hall of Fame! Record: ${hof.record}. ${hof.highlights.join(" · ")}`, choices: [{ label: "Legendary", chem: 3 }] });
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
      g.coaches.push({ id: uid(), name: "Coach " + f.name.split(" ").pop(), spec: specMap[f.archetype] || "Head", skill: sk, salary: sk * 1800 });
      g.chemistry = clamp(g.chemistry + 5, 0, 100);
      g.log.unshift(`👨‍🏫 ${f.name} pensiun dan jadi coach.`);
    }
  });

  register("moraleTo", ({ g, c }) => {
    if (!c.moraleTo) return;
    const f = g.roster.find((x) => x.id === c.moraleTo.id);
    if (f) { f.morale = clamp(f.morale + c.moraleTo.amt, 0, 100); g.log.unshift("💰 Bonus retensi — morale " + f.name + " naik."); }
  });

  register("letGo", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.letGo);
    if (!f) return;
    vacateTitle(g, f);
    g.roster = g.roster.filter((x) => x.id !== c.letGo);
    g.rep = clamp(g.rep - 3, 0, 100);
    g.chemistry = clamp(g.chemistry - 5, 0, 100);
    g.log.unshift(`🚪 ${f.name} pergi ke rival.`);
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

  register("fightPromise", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.fightPromise);
    if (f) f.morale = clamp(f.morale + 3, 0, 100);
  });

  register("upgradePromise", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.upgradePromise?.fighterId);
    if (f) f.morale = clamp(f.morale + 4, 0, 100);
  });
}
