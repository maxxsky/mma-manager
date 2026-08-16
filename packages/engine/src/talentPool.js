// Talent Pool — hidden internal prospects generated from gym membership
// These are regular members who train at the camp, noticed by coaches
import { RI, R, random, uid } from "./rng.js";
import { genFighter } from "./fighter.js";
import { ATTRS } from "./data/attributes.js";
import { computeMembership } from "./economy.js";
import { pushInboxEvent } from "./events.js";
import { CAMP_TIERS } from "./data.js";
import { getPrestige, prospectTierWeights } from "./prestige.js";

// ── Constants ──
//
// Intake scales with the size of the camp. These numbers were tuned when the
// roster capped at four to fourteen, and produced roughly two new fighters a
// year — measured across twenty in-game years, forty-four in total. The late
// camp tiers raise the cap to twenty-four, which that trickle cannot fill, so
// improved prospects had nowhere to land and never showed up in the roster
// average. A bigger camp should be noticed by more people, and needs to be.
const TALENT_POOL_BASE = 3;
const TALENT_POOL_PER_TIER = 1;

// Kept as a plain export for callers that only need the floor.
export const TALENT_POOL_MAX = TALENT_POOL_BASE;

export function talentPoolMax(g) {
  return TALENT_POOL_BASE + (g?.campTier || 0) * TALENT_POOL_PER_TIER;
}

// Base discovery chance per settlement cycle (4 weeks)
const BASE_DISCOVERY_CHANCE = 0.30;
const DISCOVERY_PER_TIER = 0.06;
// Bonus if any coach has "Player's Coach" personality
const PLAYERS_COACH_BONUS = 0.20;

// ── Generate a single talent pool entry ──
// Low-level amateur fighter (0.35-0.6 range), full genFighter() with potentialTier
export function genTalentEntry(g = null) {
  const level = R(0.35, 0.6);
  // A camp's history shapes who turns up. Passing no game state falls back to
  // the default distribution, which keeps existing callers and tests honest.
  const weights = g ? prospectTierWeights(getPrestige(g)) : null;
  const f = genFighter(level, undefined, weights);
  // Member recruits get higher loyalty — they grew up in this gym
  f.loyalty = RI(60, 90);
  return f;
}

// ── Roll to add a new entry to the pool ──
// Called each settlement cycle. Chance scales with membership count.
// Formula: members / 200 — at 200 members = 100% per cycle
export function rollAddTalent(g) {
  if (!g.talentPool) g.talentPool = [];
  if (g.talentPool.length >= talentPoolMax(g)) return false;

  const { members } = computeMembership(g);
  const chance = Math.min(members / 200, 1.0);
  if (random() >= chance) return false;

  // Deduplicate by checking if a fighter with same name+region already in pool
  const entry = genTalentEntry(g);
  const exists = g.talentPool.some(
    (t) => t.name === entry.name && t.region === entry.region && t.archetype === entry.archetype
  );
  if (exists) return rollAddTalent(g); // retry with new fighter

  g.talentPool.push(entry);
  return true;
}

// ── Roll for coach to notice a talent ──
// Higher chance if any coach has "Player's Coach" personality
export function rollDiscoverTalent(g) {
  if (!g.talentPool || g.talentPool.length === 0) return null;

  const hasPlayersCoach = g.coaches?.some((c) => c.personality === "Player's Coach");
  const academyBonus = g.investments?.youthAcademy ? 0.15 : 0;
  const chance = BASE_DISCOVERY_CHANCE + (g.campTier || 0) * DISCOVERY_PER_TIER
    + (hasPlayersCoach ? PLAYERS_COACH_BONUS : 0) + academyBonus;
  if (random() >= chance) return null;

  // Pick one randomly from the pool
  const idx = RI(0, g.talentPool.length - 1);
  const fighter = g.talentPool[idx];
  g.talentPool.splice(idx, 1);

  return fighter;
}

// ── Build the inbox report for a discovered talent ──
// Current stats: accurate (coach has been watching for months)
// Potential: fuzzy/qualitative (use existing gradeOf fuzz pattern for ceilings)
const POTENTIAL_DESC = {
  common:       "Kelihatannya biasa aja, tapi gak pernah bolos latihan.",
  promising:    "Dia cepat nangkap teknik dan rajin. Mungkin ada potensi kalau digarap serius.",
  special:      "Ada sesuatu di dia — koordinasi dan instingnya di atas rata-rata member biasa.",
  generational: "Jujur, ini yang paling berbakat yang pernah aku lihat di gym ini. Serius.",
};

export function buildTalentReport(fighter) {
  // Current stats: accurate — display in grade format
  const statsStr = ATTRS.map((k) => {
    const v = fighter.attrs[k];
    return `${k}: ${v}`;
  }).join(", ");

  // Potential: fuzzy qualitative description based on potentialTier
  const potDesc = POTENTIAL_DESC[fighter.potentialTier] || POTENTIAL_DESC.common;

  return {
    name: fighter.name,
    archetype: fighter.archetype,
    region: fighter.region,
    age: fighter.age,
    weightClass: fighter.weightClass,
    statsStr,
    potDesc,
  };
}

// ── Push the inbox event for a discovered talent ──
export function pushTalentDiscoveryEvent(g, fighter) {
  const report = buildTalentReport(fighter);
  const coachName = g.coaches?.[0]?.name || "Coach";

  pushInboxEvent(g, {
    type: "event",
    title: `🏋️ Bakat Baru Ditemukan: ${report.name}`,
    body: `${report.name} (${report.archetype}, ${report.region}, ${report.age}tahun) udah latihan rutin di gym beberapa bulan ini. ${coachName} ngerasa dia layak dicoba di jalur pro.

📊 **Stat sekarang:**
${report.statsStr}

📈 **Catatan coach:**
"${report.potDesc}"
`,
    choices: [
      { label: "Terima ke roster", talentAccept: fighter.id, talentFighter: fighter },
      { label: "Tolak — biarkan dia member biasa", talentReject: fighter.id },
    ],
  });
}

// ── Roster cap check ──
export function rosterHasSpace(g) {
  const cap = CAMP_TIERS[g.campTier || 0].rosterCap;
  return (g.roster?.length || 0) < cap;
}

export function rosterFullMessage(g) {
  const cap = CAMP_TIERS[g.campTier || 0].rosterCap;
  return `Roster penuh (${g.roster?.length || 0}/${cap}). Upgrade camp tier untuk menambah kapasitas.`;
}
