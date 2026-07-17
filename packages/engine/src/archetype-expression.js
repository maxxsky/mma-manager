// ============================================================
//   ARCHETYPE EXPRESSION — Identity through behavior, not mechanics
//   No new combat math. No new archetypes. Existing systems only.
// ============================================================

import { clamp } from "./rng.js";

// ── ARCHETYPE EXPRESSION (pickExchange modifiers) ──

export function getArchetypeBehavior(fighter) {
  const arch = fighter?.archetype;
  if (!arch) return {};

  const behaviors = {
    Boxer: {
      style: "Distance Manager",
      aggressionBias: -0.05,      // Slightly less aggressive — picks shots
      tdDefBonus: 0.10,           // Better takedown defense
      strikeWeight: 2,            // Extra striking exchanges in pool
      description: "Controls distance with jabs and footwork. Patient, technical striker."
    },
    "Muay Thai": {
      style: "Pressure Fighter",
      aggressionBias: 0.08,       // More aggressive — constant pressure
      clinchWeight: 2,            // Extra clinch exchanges in pool
      bodyDamageBonus: 0.15,      // More body damage
      description: "Relentless pressure. Knees, elbows, body attacks. Breaks opponents down."
    },
    Wrestler: {
      style: "Chain Wrestler",
      aggressionBias: 0.10,       // Aggressive takedown pursuit
      tdWeight: 2,                // Extra takedown attempts
      topControlBonus: 0.10,      // Better position maintenance
      description: "Chain takedowns. Relentless pressure against the cage. Ground control."
    },
    "BJJ Specialist": {
      style: "Guard Player",
      sweepWeight: 2,             // Extra sweep attempts
      subWeight: 1,               // Extra submission attempts
      bottomGameBonus: 0.10,      // Better from bottom position
      description: "Dangerous from every position. Guard attacks, sweeps, submissions. Never safe."
    },
    "All-Rounder": {
      style: "Adaptive Fighter",
      adaptabilityBonus: 0.05,    // Slight bonus to all actions
      description: "No single style. Adapts to opponent. Complete martial artist."
    },
  };

  return behaviors[arch] || {};
}

// ── ARCHETYPE EVOLUTION (age-based identity shifts) ──

export function getArchetypeEvolution(fighter) {
  const age = fighter?.age || 25;
  const arch = fighter?.archetype;
  const totalFights = (fighter?.record?.w || 0) + (fighter?.record?.l || 0);

  const evolution = { phase: "prime", label: "In Prime", bonuses: {} };

  if (age <= 22 && totalFights <= 5) {
    evolution.phase = "young";
    evolution.label = "Raw Talent";
    evolution.bonuses = { athleticism: 1.10, technique: 0.90 };
    evolution.description = "Relying on athleticism and natural gifts. Technique still developing.";
  } else if (age >= 34) {
    evolution.phase = "veteran";
    evolution.label = "Crafty Veteran";
    evolution.bonuses = { athleticism: 0.85, technique: 1.10, fightIQ: 1.15 };
    evolution.description = "Physical gifts fading, but experience and fight IQ compensate.";
  } else if (totalFights >= 20) {
    evolution.phase = "experienced";
    evolution.label = "Experienced";
    evolution.bonuses = { consistency: 1.05 };
    evolution.description = "Seen it all. Consistent, reliable, knows every situation.";
  }

  return evolution;
}

// ── COACH × ARCHETYPE SYNERGY ──

export function getCoachArchetypeSynergy(coach, fighter) {
  const arch = fighter?.archetype;
  if (!arch || !coach) return null;

  const synergies = {
    Boxer: {
      Striking: { rating: "perfect", bonus: 0.15, label: "Ideal Match" },
      Wrestling: { rating: "neutral", bonus: 0.05, label: "Good For Defense" },
      BJJ: { rating: "poor", bonus: 0.00, label: "Not Priority" },
      "S&C": { rating: "good", bonus: 0.10, label: "Solid Foundation" },
      Head: { rating: "good", bonus: 0.10, label: "Well-Rounded" },
    },
    "Muay Thai": {
      Striking: { rating: "perfect", bonus: 0.15, label: "Ideal Match" },
      Wrestling: { rating: "neutral", bonus: 0.03, label: "Minimal Benefit" },
      BJJ: { rating: "poor", bonus: 0.00, label: "Not Priority" },
      "S&C": { rating: "good", bonus: 0.10, label: "Cardio Essential" },
      Head: { rating: "good", bonus: 0.08, label: "Balanced" },
    },
    Wrestler: {
      Striking: { rating: "poor", bonus: 0.00, label: "Not Priority" },
      Wrestling: { rating: "perfect", bonus: 0.15, label: "Ideal Match" },
      BJJ: { rating: "good", bonus: 0.10, label: "Submission Threat" },
      "S&C": { rating: "good", bonus: 0.10, label: "Strength Focus" },
      Head: { rating: "neutral", bonus: 0.05, label: "General" },
    },
    "BJJ Specialist": {
      Striking: { rating: "poor", bonus: 0.00, label: "Not Priority" },
      Wrestling: { rating: "good", bonus: 0.08, label: "Takedown Threat" },
      BJJ: { rating: "perfect", bonus: 0.15, label: "Ideal Match" },
      "S&C": { rating: "neutral", bonus: 0.05, label: "Adequate" },
      Head: { rating: "neutral", bonus: 0.05, label: "General" },
    },
    "All-Rounder": {
      Striking: { rating: "good", bonus: 0.10, label: "Valuable" },
      Wrestling: { rating: "good", bonus: 0.10, label: "Valuable" },
      BJJ: { rating: "good", bonus: 0.10, label: "Valuable" },
      "S&C": { rating: "good", bonus: 0.10, label: "Valuable" },
      Head: { rating: "perfect", bonus: 0.15, label: "Ideal Match" },
    },
  };

  const archSynergy = synergies[arch];
  if (!archSynergy) return null;

  const spec = coach.specialty || "Head";
  return archSynergy[spec] || { rating: "neutral", bonus: 0.05, label: "General" };
}

// ── CAREER IDENTITY (archetype-aware labels) ──

export function getArchetypeCareerIdentity(fighter) {
  const arch = fighter?.archetype;
  const totalFights = (fighter?.record?.w || 0) + (fighter?.record?.l || 0);
  const koRate = totalFights > 0 ? (fighter?.record?.ko || 0) / totalFights : 0;
  const subRate = totalFights > 0 ? (fighter?.record?.sub || 0) / totalFights : 0;
  const age = fighter?.age || 25;
  const identities = [];

  if (!arch) return identities;

  // Archetype-specific achievement identities
  if (arch === "Boxer" && koRate >= 0.4 && totalFights >= 5) {
    identities.push({ id: "boxer_puncher", label: "Puncher", icon: "👊", desc: "A Boxer who finishes fights with devastating power." });
  }
  if (arch === "Boxer" && koRate < 0.2 && totalFights >= 10) {
    identities.push({ id: "boxer_technician", label: "Technician", icon: "🎯", desc: "A Boxer who wins through precision, not power." });
  }

  if (arch === "Muay Thai" && koRate >= 0.5) {
    identities.push({ id: "mt_destroyer", label: "Destroyer", icon: "💀", desc: "A Muay Thai fighter who destroys opponents." });
  }
  if (arch === "Muay Thai" && totalFights >= 15) {
    identities.push({ id: "mt_warrior", label: "Ring Warrior", icon: "⚔️", desc: "A battle-tested Muay Thai veteran." });
  }

  if (arch === "Wrestler" && totalFights >= 10 && koRate < 0.2) {
    identities.push({ id: "wrestler_grinder", label: "Grinder", icon: "⏱️", desc: "A Wrestler who grinds opponents down over rounds." });
  }
  if (arch === "Wrestler" && (fighter?.titleDefenses || 0) >= 3) {
    identities.push({ id: "wrestler_champ", label: "Dominant Champion", icon: "👑", desc: "A Wrestler who dominates their division." });
  }

  if (arch === "BJJ Specialist" && subRate >= 0.4) {
    identities.push({ id: "bjj_hunter", label: "Submission Hunter", icon: "🦈", desc: "A BJJ fighter who hunts submissions relentlessly." });
  }
  if (arch === "BJJ Specialist" && totalFights >= 12 && subRate >= 0.3) {
    identities.push({ id: "bjj_master", label: "Jiu-Jitsu Master", icon: "🥋", desc: "A master of the gentle art." });
  }

  if (arch === "All-Rounder" && totalFights >= 15) {
    identities.push({ id: "ar_complete", label: "Complete Fighter", icon: "⚔️", desc: "An All-Rounder who has truly mastered every aspect." });
  }

  // Age-based
  if (age >= 34 && totalFights >= 12) {
    identities.push({ id: "veteran_craft", label: "Crafty Veteran", icon: "🧠", desc: "Experience and wisdom compensate for lost youth." });
  }

  return identities;
}

// ── ARCHETYPE RECOGNITION (presentation hints) ──

export function getFightStyleSummary(fighter) {
  const arch = fighter?.archetype;
  const totalFights = (fighter?.record?.w || 0) + (fighter?.record?.l || 0);
  const koRate = totalFights > 0 ? (fighter?.record?.ko || 0) / totalFights : 0;
  const subRate = totalFights > 0 ? (fighter?.record?.sub || 0) / totalFights : 0;

  if (!arch) return null;

  const styles = {
    Boxer: koRate >= 0.3 ? "Power Puncher" : "Technical Boxer",
    "Muay Thai": koRate >= 0.4 ? "KO Artist" : "Clinch Specialist",
    Wrestler: subRate >= 0.2 ? "Submission Wrestler" : "Control Wrestler",
    "BJJ Specialist": subRate >= 0.3 ? "Submission Hunter" : "Positional Grappler",
    "All-Rounder": "Complete Martial Artist",
  };

  const winConditions = {
    Boxer: "Wins by knockout or clean decision. Controls distance and tempo.",
    "Muay Thai": "Wins by breaking opponents down in the clinch. Devastating knees and elbows.",
    Wrestler: "Wins by controlling where the fight happens. Takedowns and top pressure.",
    "BJJ Specialist": "Wins by finding submissions from any position. Threat from everywhere.",
    "All-Rounder": "Wins by adapting to the opponent. No single path — all paths.",
  };

  return {
    style: styles[arch] || "Fighter",
    winCondition: winConditions[arch] || "",
    isFinisher: koRate >= 0.3 || subRate >= 0.3,
    isGrinder: totalFights >= 8 && koRate < 0.2 && subRate < 0.2,
  };
}
