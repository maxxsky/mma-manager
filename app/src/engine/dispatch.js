// Inbox Event Dispatcher — handler registry for INBOX_EVENT choices
// Replaces the 20-branch if/else chain in reducer.js

import { clamp, random, RI, fmt$, uid } from "./rng.js";
import { vacateTitle } from "./rankings.js";
import { avgSkill } from "./fighter.js";
import { genBio } from "./fighter.js";
import { WEIGHTS } from "./data.js";
import { onCoachRaiseDenied } from "./events.js";

// Handler registry
const handlers = {};

function register(key, fn) { handlers[key] = fn; }

// ── Register all handlers ──

register("openExtend", (g, c, action) => {
  // Handled in App.jsx — setNego modal
});

register("classChangeAccept", (g, c, action) => {
  const f = g.roster.find((x) => x.id === c.classChangeAccept.fighterId);
  if (!f) return;
  const oldClass = f.weightClass;
  const delta = c.classChangeAccept.targetIdx - WEIGHTS.findIndex((w) => w.name === oldClass);
  f.weightClassDelta = (f.weightClassDelta || 0) + delta;
  f.weightClass = c.classChangeAccept.targetClass;
  f.natWeight = Math.round(WEIGHTS[c.classChangeAccept.targetIdx].limit * __rng_R(1.0, 1.09));
  vacateTitle(g, f);
  f.rankPoints = Math.max(0, f.rankPoints - 20);
  f.morale = clamp(f.morale + c.classChangeAccept.moraleEffect, 0, 100);
  f.lastClassChange = g.week;
  g.log.unshift(`⚖️ ${f.name} pindah ke ${c.classChangeAccept.targetClass}.`);
});

register("classChangeReject", (g, c, action) => {
  const f = g.roster.find((x) => x.id === c.classChangeReject.fighterId);
  if (!f) return;
  f.morale = clamp(f.morale + c.classChangeReject.moralePenalty, 0, 100);
  f.lastClassChange = g.week;
  g.log.unshift(`🙅 ${f.name} minta pindah kelas — ditolak.`);
});

register("release", (g, c, action) => {
  const f = g.roster.find((x) => x.id === c.release);
  if (!f) return;
  vacateTitle(g, f);
  g.roster = g.roster.filter((x) => x.id !== c.release);
  g.chemistry = clamp(g.chemistry - 5, 0, 100);
  g.log.unshift(`👋 ${f.name} di-release.`);
});

register("retire", (g, c, action) => {
  const f = g.roster.find((x) => x.id === c.retire);
  if (!f) return;
  vacateTitle(g, f);
  g.roster = g.roster.filter((x) => x.id !== c.retire);
  g.rep = clamp(g.rep + 3, 0, 100);
  g.log.unshift(`🎗️ ${f.name} pensiun. Rep +3.`);
});

register("convince", (g, c, action) => {
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

register("toCoach", (g, c, action) => {
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

register("coachSalary", (g, c, action) => {
  const coach = g.coaches.find((x) => x.id === c.coachSalary.id);
  if (!coach) return;
  coach.salary = c.coachSalary.amt;
  coach.lastRaiseWeek = g.week;
  g.log.unshift("💰 Coach dinaikkan gajinya.");
});

register("viralPop", (g, c, action) => {
  const f = g.roster.find((x) => x.id === c.viralPop);
  if (f) f.popularity = clamp(f.popularity + 8, 0, 100);
});

register("cash", (g, c, action) => {
  if (c.cash) g.cash += c.cash;
});

register("moraleTo", (g, c, action) => {
  if (!c.moraleTo) return;
  const f = g.roster.find((x) => x.id === c.moraleTo.id);
  if (f) { f.morale = clamp(f.morale + c.moraleTo.amt, 0, 100); g.log.unshift("💰 Bonus retensi — morale " + f.name + " naik."); }
});

register("letGo", (g, c, action) => {
  const f = g.roster.find((x) => x.id === c.letGo);
  if (!f) return;
  vacateTitle(g, f);
  g.roster = g.roster.filter((x) => x.id !== c.letGo);
  g.rep = clamp(g.rep - 3, 0, 100);
  g.chemistry = clamp(g.chemistry - 5, 0, 100);
  g.log.unshift(`🚪 ${f.name} pergi ke rival.`);
});

register("talk", (g, c, action) => {
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

register("counter", (g, c, action) => {
  const f = g.roster.find((x) => x.id === c.counter.fighterId);
  if (!f || g.cash < c.counter.cost) return;
  g.cash -= c.counter.cost;
  f.morale = clamp(f.morale + 20, 0, 100);
  if (f.contract) f.contract.managerCut = clamp((f.contract.managerCut || 0.18) + 0.02, 0, 0.35);
  g.log.unshift(`💰 ${f.name} dipertahankan.`);
});

register("coachPoach", (g, c, action) => {
  const coach = g.coaches.find((x) => x.id === c.coachPoach.id);
  if (!coach) return;
  if (g.cash >= c.coachPoach.newSalary * 4) {
    coach.hiredWeek = g.week;
    coach.salary = c.coachPoach.newSalary;
    g.cash -= c.coachPoach.newSalary * 4;
    if (g.rivals) { const riv = g.rivals.find((x) => x.id === c.coachPoach.rivalId); if (riv) riv.rivalry = clamp(riv.rivalry + 10, 0, 100); }
    g.log.unshift(`🛡️ ${coach.name} dipertahankan — gaji naik.`);
  } else {
    g.coaches = g.coaches.filter((x) => x.id !== c.coachPoach.id);
    g.chemistry = clamp(g.chemistry - 8, 0, 100);
    g.log.unshift("🦊 Coach pergi ke rival.");
  }
});

register("coachResignChance", (g, c, action) => {
  const coach = g.coaches.find((x) => x.id === c.coachResignChance.id);
  if (coach) {
    const c2 = c.coachResignChance;
    onCoachRaiseDenied(g, coach);
    if (Math.random() < c2.chance) {
      g.coaches = g.coaches.filter((x) => x.id !== coach.id);
      g.chemistry = clamp(g.chemistry - 8, 0, 100);
      g.log.unshift(`👋 ${coach.name} resign.`);
    }
  }
});

register("coachLeave", (g, c, action) => {
  g.coaches = g.coaches.filter((x) => x.id !== c.coachLeave);
  g.chemistry = clamp(g.chemistry - 8, 0, 100);
});

register("fightPromise", (g, c, action) => {
  const f = g.roster.find((x) => x.id === c.fightPromise);
  if (f) f.morale = clamp(f.morale + 3, 0, 100);
});

register("upgradePromise", (g, c, action) => {
  const f = g.roster.find((x) => x.id === c.upgradePromise?.fighterId);
  if (f) f.morale = clamp(f.morale + 4, 0, 100);
});

register("sponsorAccept", (g, c, action) => {
  const d = c.sponsorAccept;
  if (!g.sponsors) g.sponsors = [];
  if (g.sponsors.length >= 3) { g.log.unshift("📢 Sponsor penuh — maks 3."); return; }
  g.sponsors.push({ brand: d.brand, terms: d.terms, rate: d.rate, weeksLeft: d.weeksLeft });
  g.log.unshift(`📢 ${d.brand} sponsor camp.`);
});

register("sponsorReject", (g, c, action) => {
  g.log.unshift("📢 Sponsor ditolak.");
});

// Fallback: chem/gamble
function fallbackHandler(g, c, action) {
  let d = c.chem || 0;
  if (c.gamble && action.gambleRoll != null) d = action.gambleRoll < 0.5 ? c.gamble[0] : c.gamble[1];
  g.chemistry = clamp(g.chemistry + d, 0, 100);
  if (d) g.log.unshift("Chemistry " + (d >= 0 ? "+" : "") + d + ".");
}

// ── Main dispatch function ──

export function dispatchEvent(g, action) {
  const c = action.choice;
  if (!c) return;

  for (const [key, handler] of Object.entries(handlers)) {
    if (c[key] != null) {
      handler(g, c, action);
      return;
    }
  }
  // Fallback
  fallbackHandler(g, c, action);
}

// Import needed by classChangeAccept
import { R as __rng_R } from "./rng.js";
