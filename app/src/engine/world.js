// ============================================================
//   WORLD SIMULATION — Lightweight AI world that feels alive
//   Orchestration layer — delegates to world/ modules.
//   Returns events array; caller delivers to inbox.
// ============================================================

import { R, RI, clamp, random, pick } from "./rng.js";
import { createAIFighter, createVeteranFighter } from "./world/ai-fighter.js";
import { recordTitleChange, recordRetirement } from "./world/history.js";
import { rankOf } from "./rankings.js";
import { RIVAL_TRAITS } from "./data.js";
import {
  TICK_YEARLY, TICK_TITLE_DEFENSE, TICK_MONTHLY, TICK_QUARTERLY,
  MIN_DIVISION_SIZE, MAX_FIGHTER_AGE, RETIREMENT_AGE, RETIREMENT_CHANCE,
  UPSET_BASE_CHANCE, UPSET_MIN, UPSET_MAX,
  STREAK_THRESHOLD, STREAK_MAX, STREAK_MIN,
  BREAKTHROUGH_AGE, BREAKTHROUGH_POINTS,
  CHAMP_AGE_DECLINE, PEAK_AGE, DECLINE_AGE,
  SKILL_MIN, SKILL_MAX, POINTS_MIN, POINTS_MAX,
} from "./world/config.js";

// ── Archetype → RIVAL_TRAITS spec mapping (shared with rankings.js) ──
const ARCH_TO_SPEC = {
  "Boxer": "striking",
  "Muay Thai": "striking",
  "Wrestler": "wrestling",
  "BJJ Specialist": "bjj",
  "All-Rounder": null,
};

/**
 * Weighted random pick — higher weight = higher probability.
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
 * ~20% chance to assign a rival camp to a fighter.
 * Uses same weighted pattern as genDivisions (rankings.js).
 */
function maybeAssignCamp(g, fighter) {
  if (!g.rivals || g.rivals.length === 0) return;
  // ~20% chance — consistent with 2-4 per 15 fighter ratio
  if (random() > 0.2) return;

  const rivals = g.rivals;
  const weights = rivals.map((rc) => {
    const spec = RIVAL_TRAITS[rc.trait]?.spec;
    let w = rc.rep;
    const fighterSpec = ARCH_TO_SPEC[fighter.archetype];
    if (spec && fighterSpec === spec) w *= 1.5;
    return Math.max(1, Math.round(w));
  });

  const camp = weightedPick(rivals, weights);
  fighter.campId = camp.id;
  fighter.campName = camp.name;
}

// ── AI CAREER PROGRESSION ──

export function ageAIFighters(g) {
  if (g.week % TICK_YEARLY !== 0) return;

  Object.values(g.divisions).forEach((d) => {
    if (!d.list) return;
    d.list.forEach((c) => {
      if (!c.age) c.age = RI(22, 32);
      c.age++;

      if (c.age <= PEAK_AGE && !c.peaked) {
        c.level = clamp(c.level + R(0.015, 0.04), SKILL_MIN, SKILL_MAX);
        c.points = clamp(c.points + RI(2, 8), POINTS_MIN, POINTS_MAX);
      } else if (c.age >= DECLINE_AGE) {
        c.peaked = true;
        c.level = clamp(c.level - R(0.01, 0.03), SKILL_MIN, SKILL_MAX);
        c.points = clamp(c.points - RI(2, 8), POINTS_MIN, POINTS_MAX);
      }
    });

    // Champion aging
    if (d.champ && d.champ.age) d.champ.age++;
    if (d.champ && !d.champ.age) d.champ.age = RI(28, 35);
  });
}

// ── AI TITLE DEFENSES ──

export function simulateAITitleDefenses(g) {
  if (g.week % TICK_TITLE_DEFENSE !== 0) return [];
  const events = [];

  Object.entries(g.divisions).forEach(([wc, d]) => {
    if (d.champ && d.champ.player) return;
    if (!d.champ) {
      // Vacant title — check if any player fighter is eligible
      const playerEligible = g.roster?.some((f) =>
        f.weightClass === wc && !f.injury && rankOf(g, f) != null && rankOf(g, f) <= 2
      );
      if (playerEligible) return; // let player get the offer instead
      // No eligible player — AI resolves vacant title
      const candidates = d.list?.filter((c) => c.level > 0.7) || [];
      if (candidates.length < 2) return;
      // Deduplicate by name to prevent same-name matchup
      const uniqueCandidates = candidates.filter((c, i, a) => a.findIndex(x => x.name === c.name) === i);
      if (uniqueCandidates.length < 2) return;
      const winner = uniqueCandidates[0];
      const loser = uniqueCandidates[1];
      d.champ = { name: winner.name, player: false, age: winner.age || RI(27, 33) };
      events.push({
        title: `👑 New ${wc} Champion!`,
        body: `${winner.name} defeats ${loser.name} to win the vacant ${wc} title!`,
      });
      return;
    }
    if (!d.list || d.list.length < 1) return;

    const champ = d.champ;
    // Ensure contender is not the champion themselves
    const contender = d.list.find(c => c.name !== champ.name);
    if (!contender) return;

    const champSkill = (champ.level || 1.2) * (1 - (champ.age > CHAMP_AGE_DECLINE ? 0.1 : 0));
    const contSkill = (contender.level || 0.9) * (1 + (contender.points > 90 ? 0.1 : 0));
    const skillRatio = contSkill / Math.max(champSkill, 0.1);
    const changeChance = clamp(UPSET_BASE_CHANCE * skillRatio, UPSET_MIN, UPSET_MAX);

    if (random() < changeChance) {
      const oldChamp = champ.name;
      d.champ = { name: contender.name, player: false, age: contender.age || RI(27, 33) };
      recordTitleChange(g, g.week, wc, contender.name, oldChamp);

      events.push({
        title: `👑 New ${wc} Champion!`,
        body: `${contender.name} defeats ${oldChamp} to become the new ${wc} champion!`,
      });

      // Former champ drops in rankings
      const oldIdx = d.list.findIndex((c) => c.name === oldChamp);
      if (oldIdx >= 0 && oldIdx < d.list.length - 5) {
        d.list.splice(oldIdx, 1);
        d.list.push(createVeteranFighter({
          name: oldChamp,
          points: Math.round(clamp(contender.points - RI(10, 20), POINTS_MIN, POINTS_MAX)),
          level: clamp(champ.level - 0.1, SKILL_MIN, SKILL_MAX),
          age: champ.age || 33,
        }));
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
  if (g.week % TICK_MONTHLY !== 0) return [];
  const events = [];

  // Win streak tracker (AI)
  Object.values(g.divisions).forEach((d) => {
    d.list.forEach((c) => {
      if (!c._streak) c._streak = 0;
      const r = random();
      if (r < 0.4) {
        c._streak = clamp(c._streak + 1, 0, STREAK_MAX);
        c.points = clamp(c.points + RI(2, 5), POINTS_MIN, POINTS_MAX);
      } else if (r < 0.7) {
        c._streak = 0;
      } else {
        c._streak = clamp(c._streak - 1, STREAK_MIN, STREAK_MAX);
        c.points = clamp(c.points - RI(1, 3), POINTS_MIN, POINTS_MAX);
      }

      if (c._streak >= STREAK_THRESHOLD && g.week % TICK_QUARTERLY === 0) {
        events.push({
          title: `🔥 ${c.name} on fire!`,
          body: `${c.name} has won ${c._streak} straight in the ${Object.keys(g.divisions).find(k => g.divisions[k].list.includes(c))} division. Title shot incoming?`,
        });
      }
    });
  });

  // Top contender breakthroughs
  if (g.week % TICK_QUARTERLY === 0) {
    Object.entries(g.divisions).forEach(([wc, d]) => {
      if (!d.champ || d.champ.player) return;
      const top3 = d.list.slice(0, 3);
      top3.forEach((c) => {
        if (c.age <= BREAKTHROUGH_AGE && c.points >= BREAKTHROUGH_POINTS && !c._breakthroughNotified) {
          c._breakthroughNotified = true;
          events.push({
            title: `⭐ ${c.name} — Breakthrough Prospect`,
            body: `At just ${c.age}, ${c.name} has cracked the top 3 in ${wc}. The future is bright.`,
          });
        }
      });
    });
  }

  // Golden generation — one-time event when a region reaches 3 champions
  if (g._worldHistory?.regionStats) {
    Object.entries(g._worldHistory.regionStats).forEach(([region, stats]) => {
      if (stats.championsProduced >= 3 && !g._worldHistory._goldenGenNotified?.includes(region)) {
        if (!g._worldHistory._goldenGenNotified) g._worldHistory._goldenGenNotified = [];
        g._worldHistory._goldenGenNotified.push(region);
        events.push({
          title: `🌏 ${region} Golden Generation`,
          body: `${region} is having a golden generation — ${stats.championsProduced} active champions and ${stats.totalFighters} fighters dominating the world stage.`,
          severity: "major",
        });
      }
    });
  }

  // Veteran retirements
  if (g.week % TICK_YEARLY === 0 && g._worldHistory) {
    const retiring = [];
    Object.values(g.divisions).forEach((d) => {
      d.list.forEach((c) => {
        if (c.age >= RETIREMENT_AGE && random() < RETIREMENT_CHANCE) {
          c.retiring = true;
          retiring.push(c);
          recordRetirement(g, g.week, Object.keys(g.divisions).find(k => g.divisions[k].list.includes(c)), c.name);
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
  if (g.week % TICK_YEARLY !== 0) return [];
  const events = [];

  Object.entries(g.divisions).forEach(([wc, d]) => {
    if (!d.list) return;
    // Ensure minimum division size
    while (d.list.length < MIN_DIVISION_SIZE) {
      const f = createAIFighter();
      maybeAssignCamp(g, f);
      d.list.push(f);
    }

    // Retire old veterans
    const retired = [];
    d.list = d.list.filter((c) => {
      if (c.age >= MAX_FIGHTER_AGE || c.retiring) {
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

// ── WORLD TICK — orchestration ──

export function worldTick(g) {
  const events = [];

  ageAIFighters(g);

  const titleEvents = simulateAITitleDefenses(g);
  events.push(...titleEvents);

  const worldEvents = generateWorldEvents(g);
  events.push(...worldEvents);

  const healthEvents = maintainDivisions(g);
  events.push(...healthEvents);

  // Assign severity based on content
  events.forEach((ev) => {
    if (ev.severity) return; // already set
    const t = ev.title || "";
    if (t.includes("New") || t.includes("Champion") || t.includes("retire") || t.includes("Breakthrough")) {
      ev.severity = "major";
    } else {
      ev.severity = "minor";
    }
  });

  return events;
}
