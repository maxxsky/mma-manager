// ============================================================
//   CONTENT IDENTITY — Regional flavor, coach identity, sponsors, nicknames
//   Richer identities from existing systems. No new core mechanics.
// ============================================================

import { clamp, pick, R, RI } from "./rng.js";

// ── REGIONAL FLAVOR ──

const REGION_FLAVOR = {
  Brazil: {
    archWeights: { "BJJ Specialist": 4, "All-Rounder": 2, "Muay Thai": 1, Boxer: 1, Wrestler: 1 },
    traitWeights: { "Natural Talent": 3, Showboat: 2, "Crowd Favorite": 2, Grinder: 2 },
    ambitionWeights: { "Belt Chaser": 3, Legacy: 2, Paycheck: 2 },
    attrBonus: { bjj: 5, footwork: 3 },
  },
  Russia: {
    archWeights: { Wrestler: 4, Boxer: 2, "All-Rounder": 2, "BJJ Specialist": 1, "Muay Thai": 1 },
    traitWeights: { Grinder: 3, "Iron Will": 3, Warrior: 2, Explosive: 2 },
    ambitionWeights: { Legacy: 3, "Belt Chaser": 2, Grinder: 2 },
    attrBonus: { wrestling: 5, strength: 3 },
  },
  USA: {
    archWeights: { Wrestler: 3, Boxer: 3, "All-Rounder": 2, "Muay Thai": 1, "BJJ Specialist": 1 },
    traitWeights: { "Crowd Favorite": 3, Showboat: 2, "Natural Talent": 2, "Iron Chin": 2 },
    ambitionWeights: { "Star Power": 3, Paycheck: 2, "Belt Chaser": 2 },
    attrBonus: { strength: 3, striking: 3 },
  },
  Netherlands: {
    archWeights: { "Muay Thai": 4, Boxer: 2, "All-Rounder": 2, Wrestler: 1, "BJJ Specialist": 1 },
    traitWeights: { Explosive: 3, "Iron Chin": 2, Cautious: 2, Warrior: 2 },
    ambitionWeights: { Legacy: 3, "Belt Chaser": 2, "Star Power": 2 },
    attrBonus: { striking: 5, cardio: 3 },
  },
  Japan: {
    archWeights: { "All-Rounder": 4, "BJJ Specialist": 2, Boxer: 2, Wrestler: 1, "Muay Thai": 1 },
    traitWeights: { Grinder: 4, Cautious: 2, "Iron Will": 2, "Team Player": 2 },
    ambitionWeights: { Legacy: 4, "Belt Chaser": 2, Grinder: 2 },
    attrBonus: { fightIQ: 5, cardio: 3 },
  },
  Nigeria: {
    archWeights: { "All-Rounder": 3, Wrestler: 2, Boxer: 2, "Muay Thai": 1, "BJJ Specialist": 1 },
    traitWeights: { Explosive: 3, Warrior: 3, "Natural Talent": 2, "Iron Chin": 2 },
    ambitionWeights: { "Belt Chaser": 3, "Star Power": 2, Legacy: 2 },
    attrBonus: { strength: 5, striking: 3 },
  },
  UK: {
    archWeights: { Boxer: 4, "Muay Thai": 2, "All-Rounder": 2, Wrestler: 1, "BJJ Specialist": 1 },
    traitWeights: { Warrior: 2, "Iron Chin": 2, "Crowd Favorite": 2, "Iron Will": 2 },
    ambitionWeights: { Paycheck: 3, "Belt Chaser": 2, Legacy: 2 },
    attrBonus: { striking: 5, chin: 3 },
  },
  Indonesia: {
    archWeights: { Boxer: 3, "All-Rounder": 2, "Muay Thai": 2, Wrestler: 1, "BJJ Specialist": 1 },
    traitWeights: { "Team Player": 3, Grinder: 2, "Natural Talent": 2, "Iron Will": 2 },
    ambitionWeights: { Paycheck: 3, "Family Man": 3, "Belt Chaser": 2 },
    attrBonus: { striking: 3, cardio: 3 },
  },
};

export function weightedPick(weights, defaultPool) {
  const pool = [];
  for (const [key, w] of Object.entries(weights)) {
    for (let i = 0; i < w; i++) pool.push(key);
  }
  // Fill missing keys with weight 1
  if (defaultPool) {
    defaultPool.forEach((k) => {
      if (!weights[k]) pool.push(k);
    });
  }
  return pick(pool);
}

export function getRegionFlavor(regionName) {
  return REGION_FLAVOR[regionName] || null;
}

// ── COACH IDENTITY ──

export function computeCoachIdentity(coach, g) {
  if (!coach._career) coach._career = { fightersDeveloped: 0, championsProduced: 0, yearsActive: 0, hireWeek: g?.week || 0 };

  const c = coach._career;
  c.yearsActive = Math.floor(((g?.week || 0) - c.hireWeek) / 48);

  const titles = [];
  if (c.championsProduced >= 3) titles.push("Championship Coach");
  if (c.championsProduced >= 1 && c.fightersDeveloped >= 5) titles.push("Prospect Developer");
  if (c.yearsActive >= 5) titles.push("Veteran Coach");
  if (coach.skill >= 8) titles.push("Elite Technician");
  if (coach.specialty === "S&C" && c.fightersDeveloped >= 3) titles.push("Conditioning Expert");
  if ((coach.specialty === "Wrestling" || coach.specialty === "BJJ") && c.championsProduced >= 1) titles.push("Grappling Specialist");
  if (coach.personality === "Motivator" && c.championsProduced >= 1) titles.push("Inspirational Leader");

  return titles.length > 0 ? titles : [coach.specialty + " Coach"];
}

export function recordCoachAchievement(coach, type) {
  if (!coach._career) coach._career = { fightersDeveloped: 0, championsProduced: 0, yearsActive: 0, hireWeek: 0 };
  if (type === "fighter_developed") coach._career.fightersDeveloped++;
  if (type === "champion_produced") coach._career.championsProduced++;
}

// ── SPONSOR PROGRESSION ──

export function getSponsorRelationship(sponsor) {
  if (!sponsor._rel) sponsor._rel = { level: 0, weeksWithCamp: 0, totalPaid: 0, bonusesEarned: 0 };
  return sponsor._rel;
}

export function advanceSponsorRel(sponsor, amount) {
  const rel = getSponsorRelationship(sponsor);
  rel.level = clamp(rel.level + amount, 0, 5);
  rel.weeksWithCamp++;
  return rel;
}

export function getSponsorRelBonus(rel) {
  // Level 0: base. Level 5: +25% rate, exclusive offers
  const bonus = rel.level * 0.05;
  return { multiplier: 1 + bonus, level: rel.level, label: getSponsorRelLabel(rel.level) };
}

function getSponsorRelLabel(level) {
  const labels = ["New Partner", "Trusted", "Preferred", "Strategic", "Elite", "Legendary"];
  return labels[clamp(level, 0, 5)] || "Partner";
}

// ── DYNAMIC FIGHTER IDENTITY (Nicknames) ──

export function generateFighterNickname(f) {
  const nicknames = [];
  const totalFights = (f.record?.w || 0) + (f.record?.l || 0);
  const koCount = f.record?.ko || 0;
  const subCount = f.record?.sub || 0;

  // Finish-style nicknames
  if (koCount >= 5 && koCount > subCount) nicknames.push("The Knockout Artist");
  if (subCount >= 5 && subCount > koCount) nicknames.push("The Submission Specialist");
  if (koCount >= 10) nicknames.push("Hands of Stone");
  if (subCount >= 8) nicknames.push("The Human Anaconda");

  // Career nicknames
  if (f.giantKills >= 3) nicknames.push("Giant Killer");
  if (totalFights >= 20) nicknames.push("Ironman");
  if (f.streakW >= 5) nicknames.push("The Unstoppable");
  if (f.milestoneFirstTitle && f.titleDefenses >= 3) nicknames.push("The Reign");
  if (f.milestoneFirstTitle && !f.titles?.some(t => t.includes("Champion"))) nicknames.push("The Former King");
  if (f.milestone3Losses && f.streakW >= 2) nicknames.push("The Comeback Kid");

  // Trait nicknames
  if (f.traits?.includes("Iron Chin")) nicknames.push("Iron");
  if (f.traits?.includes("Glass Jaw")) nicknames.push("Glass");
  if (f.traits?.includes("Crowd Favorite")) nicknames.push("Fan Favorite");
  if (f.traits?.includes("Showboat")) nicknames.push("The Showman");
  if (f.traits?.includes("Grinder")) nicknames.push("The Grinder");
  if (f.traits?.includes("Natural Talent")) nicknames.push("The Prodigy");

  // Regional nicknames
  if (f.region === "Brazil") nicknames.push("The Brazilian");
  if (f.region === "Russia") nicknames.push("The Russian Bear");
  if (f.region === "Japan") nicknames.push("The Rising Sun");
  if (f.region === "USA") nicknames.push("The American");

  // Prime/age nicknames
  if ((f.age || 25) <= 22 && totalFights <= 5) nicknames.push("The Prospect");
  if ((f.age || 30) >= 36 && totalFights >= 10) nicknames.push("The Veteran");

  if (nicknames.length === 0) return null;
  return nicknames[Math.floor(Math.random() * nicknames.length)];
}

// ── COACH CAREER TRACKING ──

export function trackCoachCareer(g) {
  g.coaches?.forEach((c) => {
    if (!c._career) c._career = { fightersDeveloped: 0, championsProduced: 0, hireWeek: g.week, yearsActive: 0 };

    // Count fighters with significant wins while this coach was present
    const developedCount = g.roster?.filter((f) => {
      const totalFights = (f.record?.w || 0) + (f.record?.l || 0);
      return totalFights >= 5 && f.joinedWeek >= c._career.hireWeek;
    }).length || 0;

    if (developedCount > c._career.fightersDeveloped) {
      c._career.fightersDeveloped = developedCount;
    }

    // Count champions
    const champCount = g.roster?.filter((f) =>
      f.titles?.some((t) => t.includes("Champion")) && f.joinedWeek >= c._career.hireWeek
    ).length || 0;

    if (champCount > c._career.championsProduced) {
      c._career.championsProduced = champCount;
    }
  });
}

// ── SPONSOR TRACKING ──

export function trackSponsorRelations(g) {
  g.sponsors?.forEach((sp) => {
    if (!sp._rel) sp._rel = { level: 0, weeksWithCamp: 0, totalPaid: 0 };
    sp._rel.weeksWithCamp++;
    sp._rel.totalPaid += (sp.rate || 0);

    // Level up every 24 weeks with the camp
    if (sp._rel.weeksWithCamp % 24 === 0 && sp._rel.level < 5) {
      sp._rel.level++;
      sp.rate = Math.round(sp.rate * 1.05); // 5% rate increase per level
    }
  });
}
