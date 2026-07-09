// ============================================================
//   WORLD SIMULATION — Lightweight AI world that feels alive
//   No full fight engine. No AI camp management.
//   Runs on monthly tick. Preserves player balance.
// ============================================================

import { R, RI, clamp, pick, random, uid } from "./rng.js";

// ── AI CAREER PROGRESSION ──

export function ageAIFighters(g) {
  if (g.week % 48 !== 0) return; // yearly

  Object.values(g.divisions).forEach((d) => {
    d.list.forEach((c) => {
      // Track age if not set
      if (!c.age) c.age = RI(22, 32);
      c.age++;

      // Lightweight skill adjustments by age
      if (c.age <= 26 && !c.peaked) {
        c.level = clamp(c.level + R(0.005, 0.015), 0.3, 1.5);
        c.points = clamp(c.points + RI(1, 3), 5, 120);
      } else if (c.age >= 34) {
        c.peaked = true;
        c.level = clamp(c.level - R(0.005, 0.02), 0.3, 1.5);
        c.points = clamp(c.points - RI(1, 5), 5, 120);
      }
    });

    // Champion aging
    if (d.champ && d.champ.age) {
      d.champ.age++;
    }
    if (d.champ && !d.champ.age) {
      d.champ.age = RI(28, 35);
    }
  });
}

// ── AI TITLE DEFENSES ──

export function simulateAITitleDefenses(g) {
  if (g.week % 24 !== 0) return []; // every ~6 months
  const events = [];

  Object.entries(g.divisions).forEach(([wc, d]) => {
    // Only simulate if AI champ exists and has a #1 contender
    if (!d.champ || d.champ.player) return;
    if (!d.list || d.list.length < 1) return;

    const contender = d.list[0];
    const champ = d.champ;

    // Simple outcome: champ skill proxy vs contender skill proxy
    const champSkill = (champ.level || 1.2) * (1 - (champ.age > 33 ? 0.1 : 0));
    const contSkill = (contender.level || 0.9) * (1 + (contender.points > 90 ? 0.1 : 0));
    const upsetChance = 0.25; // 25% base chance of title change
    const skillRatio = contSkill / Math.max(champSkill, 0.1);
    const changeChance = clamp(upsetChance * skillRatio, 0.1, 0.5);

    if (random() < changeChance) {
      // Title changes hands!
      const oldChamp = champ.name;
      d.champ = {
        name: contender.name,
        player: false,
        age: contender.age || RI(27, 33),
      };
      // Track world history
      if (!g._worldHistory) g._worldHistory = { titleChanges: [], retiredChamps: [] };
      g._worldHistory.titleChanges.push({
        week: g.week, division: wc, newChamp: contender.name, oldChamp,
      });

      events.push({
        title: `👑 New ${wc} Champion!`,
        body: `${contender.name} defeats ${oldChamp} to become the new ${wc} champion!`,
      });

      // Former champ drops in rankings
      const oldIdx = d.list.findIndex((c) => c.name === oldChamp);
      if (oldIdx >= 0 && oldIdx < d.list.length - 5) {
        d.list.splice(oldIdx, 1);
        d.list.push({
          id: uid(),
          name: oldChamp,
          archetype: pick(["Boxer", "Wrestler", "BJJ Specialist", "Muay Thai", "All-Rounder"]),
          points: Math.round(clamp(contender.points - RI(10, 20), 5, 100)),
          level: clamp(champ.level - 0.1, 0.3, 1.5),
          record: { w: RI(8, 18), l: 1, ko: 0, sub: 0, dec: 0 },
          age: champ.age || 33,
        });
      }
    } else {
      events.push({
        title: `🛡️ ${wc}: ${champ.name} defends`,
        body: `${champ.name} successfully defends the ${wc} title against ${contender.name}.`,
      });
    }
  });

  return events;
}

// ── MONTHLY WORLD EVENTS ──

export function generateWorldEvents(g) {
  if (g.week % 4 !== 0) return []; // monthly
  const events = [];

  // Win streak tracker (AI)
  Object.values(g.divisions).forEach((d) => {
    d.list.forEach((c) => {
      // Track form
      if (!c._streak) c._streak = 0;
      const r = random();
      if (r < 0.4) {
        c._streak = clamp(c._streak + 1, 0, 8);
        c.points = clamp(c.points + RI(2, 5), 5, 120);
      } else if (r < 0.7) {
        c._streak = 0;
      } else {
        c._streak = clamp(c._streak - 1, -3, 8);
        c.points = clamp(c.points - RI(1, 3), 5, 120);
      }

      if (c._streak >= 5 && g.week % 12 === 0) {
        events.push({
          title: `🔥 ${c.name} on fire!`,
          body: `${c.name} has won ${c._streak} straight in the ${Object.keys(g.divisions).find(k => g.divisions[k].list.includes(c))} division. Title shot incoming?`,
        });
      }
    });
  });

  // Top contender breakthroughs
  if (g.week % 12 === 0) {
    Object.entries(g.divisions).forEach(([wc, d]) => {
      if (!d.champ || d.champ.player) return;
      const top3 = d.list.slice(0, 3);
      top3.forEach((c) => {
        if (c.age <= 24 && c.points >= 80 && !c._breakthroughNotified) {
          c._breakthroughNotified = true;
          events.push({
            title: `⭐ ${c.name} — Breakthrough Prospect`,
            body: `At just ${c.age}, ${c.name} has cracked the top 3 in ${wc}. The future is bright.`,
          });
        }
      });
    });
  }

  // Veteran retirements (heavyweight division only, for flavor)
  if (g.week % 48 === 0 && g._worldHistory) {
    const retiring = [];
    Object.values(g.divisions).forEach((d) => {
      d.list.forEach((c) => {
        if (c.age >= 38 && random() < 0.3) {
          c.retiring = true;
          retiring.push(c);
          if (!g._worldHistory.retiredChamps) g._worldHistory.retiredChamps = [];
          if (!g._worldHistory.retiredChamps.some((r) => r.name === c.name)) {
            g._worldHistory.retiredChamps.push({ name: c.name, week: g.week, division: Object.keys(g.divisions).find(k => g.divisions[k].list.includes(c)) });
          }
        }
      });
    });
    if (retiring.length > 0) {
      events.push({
        title: `🎗️ Veterans Retire`,
        body: `${retiring.map((r) => r.name).join(", ")} hang up the gloves this year. Respect.`,
      });
    }
  }

  return events;
}

// ── DIVISION HEALTH MAINTENANCE ──

export function maintainDivisions(g) {
  if (g.week % 48 !== 0) return []; // yearly
  const events = [];

  Object.entries(g.divisions).forEach(([wc, d]) => {
    // Ensure minimum 15 fighters
    while (d.list.length < 15) {
      const nf = {
        id: uid(),
        name: generateAIName(),
        archetype: pick(["Boxer", "Wrestler", "BJJ Specialist", "Muay Thai", "All-Rounder"]),
        points: Math.round(R(5, 20)),
        level: R(0.4, 0.7),
        record: { w: 0, l: 0, ko: 0, sub: 0, dec: 0 },
        age: RI(18, 25),
      };
      d.list.push(nf);
    }

    // Retire old veterans
    const retired = [];
    d.list = d.list.filter((c) => {
      if (c.age >= 40 || c.retiring) {
        retired.push(c.name);
        return false;
      }
      return true;
    });

    if (retired.length > 0) {
      events.push({
        title: `🔄 ${wc} Division Update`,
        body: `${retired.join(", ")} retired. Fresh prospects entering the rankings.`,
      });
    }

    // If champ retired and no player champ, promote #1
    if (!d.champ || (!d.champ.player && !d.list.some((c) => c.name === d.champ.name))) {
      if (d.list.length > 0) {
        const newChamp = d.list[0];
        d.champ = { name: newChamp.name, player: false, age: newChamp.age || 30 };
        events.push({
          title: `👑 New ${wc} Champion`,
          body: `${newChamp.name} is the new ${wc} champion after the title was vacated.`,
        });
      }
    }
  });

  return events;
}

// ── HELPERS ──

const AI_FIRST = ["Marcus", "Carlos", "Dmitri", "Kaito", "Jamal", "Rafael", "Andre", "Sergei", "Takeshi", "Miguel", "Chris", "Ryan", "Diego", "Yuki", "Viktor"];
const AI_LAST = ["Silva", "Johnson", "Volkov", "Tanaka", "Carter", "Lima", "Santos", "Ivanov", "Sato", "Reyes", "Miller", "Garcia", "Kozlov", "Mori", "Petrov"];

function generateAIName() {
  return `${pick(AI_FIRST)} ${pick(AI_LAST)}`;
}

// ── WORLD TICK — called from state.js monthly cycle ──

export function worldTick(g) {
  const events = [];

  // AI career progression (yearly)
  ageAIFighters(g);

  // AI title defenses (every 24 weeks)
  const titleEvents = simulateAITitleDefenses(g);
  events.push(...titleEvents);

  // Monthly world events
  const worldEvents = generateWorldEvents(g);
  events.push(...worldEvents);

  // Division health maintenance (yearly)
  const healthEvents = maintainDivisions(g);
  events.push(...healthEvents);

  // Push events to inbox
  events.forEach((ev) => {
    if (!g.inbox) g.inbox = [];
    g.inbox.unshift({
      id: uid(), type: "event",
      title: ev.title, body: ev.body,
      choices: [{ label: "OK", chem: 0 }],
    });
  });

  return events.length;
}
