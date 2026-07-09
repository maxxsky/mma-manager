// ============================================================
//   DYNASTY & LEGACY — Camp history, records, Hall of Fame, identity
//   All emergent from simulation data. No scripted stories.
// ============================================================

import { clamp } from "./rng.js";

// ── CAMP DYNASTY ──

export function getCampDynasty(g) {
  const d = g._dynasty || initDynasty(g);
  return {
    ...d,
    totalFighters: g.roster?.length || 0,
    activeChampions: g.roster?.filter(f => f.titles?.some(t => t.includes("Champion"))).length || 0,
    currentTier: g.campTier || 0,
    currentRep: g.rep || 0,
    currentLegacy: g.legacy || 0,
    currentWeek: g.week || 1,
  };
}

function initDynasty(g) {
  g._dynasty = {
    foundedWeek: g.week || 1,
    totalFightersEver: (g.roster?.length || 0),
    championsProduced: 0,
    worldChampionsProduced: 0,
    totalTitleDefenses: 0,
    totalWins: 0,
    totalLosses: 0,
    totalKOs: 0,
    totalSubs: 0,
    hallOfFamers: [],
    milestones: [],
    peakRep: g.rep || 0,
    peakLegacy: 0,
  };
  return g._dynasty;
}

export function updateDynasty(g) {
  if (!g._dynasty) initDynasty(g);
  const d = g._dynasty;

  // Count current champions
  const champs = g.roster?.filter(f => f.titles?.some(t => t.includes("Champion"))) || [];
  if (champs.length > d.championsProduced) d.championsProduced = champs.length;

  // World champion = Major World Champion or Premier
  const worldChamps = champs.filter(f => f.titles?.includes("Major World Champion"));
  if (worldChamps.length > d.worldChampionsProduced) d.worldChampionsProduced = worldChamps.length;

  // Title defenses
  const defenses = g.roster?.reduce((s, f) => s + (f.titleDefenses || 0), 0) || 0;
  if (defenses > d.totalTitleDefenses) d.totalTitleDefenses = defenses;

  // Win/loss totals
  const wins = g.roster?.reduce((s, f) => s + (f.record?.w || 0), 0) || 0;
  const losses = g.roster?.reduce((s, f) => s + (f.record?.l || 0), 0) || 0;
  const kos = g.roster?.reduce((s, f) => s + (f.record?.ko || 0), 0) || 0;
  const subs = g.roster?.reduce((s, f) => s + (f.record?.sub || 0), 0) || 0;
  if (wins > d.totalWins) d.totalWins = wins;
  if (losses > d.totalLosses) d.totalLosses = losses;
  if (kos > d.totalKOs) d.totalKOs = kos;
  if (subs > d.totalSubs) d.totalSubs = subs;

  // Peaks
  if ((g.rep || 0) > d.peakRep) d.peakRep = g.rep;
  if ((g.legacy || 0) > d.peakLegacy) d.peakLegacy = g.legacy;

  // Total fighters ever (cumulative)
  d.totalFightersEver = Math.max(d.totalFightersEver, g.roster?.length || 0);
}

// ── CAMP IDENTITY ──

export function getCampIdentity(g) {
  const d = g._dynasty || initDynasty(g);
  const identities = [];

  const totalFights = d.totalWins + d.totalLosses;
  const koRate = totalFights > 0 ? d.totalKOs / totalFights : 0;
  const subRate = totalFights > 0 ? d.totalSubs / totalFights : 0;

  // Prospect Factory: many fighters developed, fewer champs
  if (d.totalFightersEver >= 10 && d.championsProduced <= 2) {
    identities.push({ id: "prospect_factory", label: "Prospect Factory", desc: "Known for developing raw talent into professional fighters." });
  }

  // Championship Camp: multiple champions
  if (d.championsProduced >= 3) {
    identities.push({ id: "championship_camp", label: "Championship Camp", desc: "A proven producer of world-class champions." });
  }

  // Knockout Factory: high KO rate
  if (totalFights >= 20 && koRate > 0.5) {
    identities.push({ id: "ko_factory", label: "Knockout Factory", desc: "Fighters from this camp finish fights. Period." });
  }

  // Grappling Academy: high submission rate
  if (totalFights >= 15 && subRate > 0.35) {
    identities.push({ id: "grappling_academy", label: "Grappling Academy", desc: "Specialists in ground control and submissions." });
  }

  // Elite Development: high champion ratio
  if (d.totalFightersEver >= 5 && d.championsProduced >= d.totalFightersEver * 0.4) {
    identities.push({ id: "elite_dev", label: "Elite Development", desc: "Nearly every fighter who walks through these doors becomes a champion." });
  }

  // Legendary Camp: high legacy
  if ((g.legacy || 0) >= 50000) {
    identities.push({ id: "legendary", label: "Legendary Camp", desc: "One of the greatest institutions in MMA history." });
  }

  // Dynasty: long-running
  if ((g.week || 0) - d.foundedWeek >= 500) {
    identities.push({ id: "dynasty", label: "Dynasty", desc: "A decade of dominance. This camp defines its era." });
  }

  return identities;
}

// ── HISTORICAL RECORDS ──

export function getWorldRecords(g) {
  const records = [];
  if (!g._worldRecords) g._worldRecords = initWorldRecords();

  const r = g._worldRecords;
  const allFighters = [...(g.roster || [])];

  // Check each fighter for record-breaking
  allFighters.forEach(f => {
    const wins = f.record?.w || 0;
    const kos = f.record?.ko || 0;
    const subs = f.record?.sub || 0;
    const defs = f.titleDefenses || 0;
    const age = f.age || 0;

    if (defs > r.mostTitleDefenses.value) {
      r.mostTitleDefenses = { value: defs, holder: f.name, week: g.week };
    }
    if (wins > r.mostWins.value) {
      r.mostWins = { value: wins, holder: f.name, week: g.week };
    }
    if (kos > r.mostKOs.value) {
      r.mostKOs = { value: kos, holder: f.name, week: g.week };
    }
    if (subs > r.mostSubs.value) {
      r.mostSubs = { value: subs, holder: f.name, week: g.week };
    }
    // Youngest champion
    if (f.milestoneFirstTitle && age > 0 && (r.youngestChamp.value === 0 || age < r.youngestChamp.value)) {
      r.youngestChamp = { value: age, holder: f.name, week: g.week };
    }
    // Oldest champion
    if (f.titles?.some(t => t.includes("Champion")) && age > r.oldestChamp.value) {
      r.oldestChamp = { value: age, holder: f.name, week: g.week };
    }
  });

  return [
    { label: "Most Title Defenses", value: `${r.mostTitleDefenses.value}`, holder: r.mostTitleDefenses.holder },
    { label: "Most Wins", value: `${r.mostWins.value}`, holder: r.mostWins.holder },
    { label: "Most KOs", value: `${r.mostKOs.value}`, holder: r.mostKOs.holder },
    { label: "Most Submissions", value: `${r.mostSubs.value}`, holder: r.mostSubs.holder },
    { label: "Youngest Champion", value: `${r.youngestChamp.value}y`, holder: r.youngestChamp.holder },
    { label: "Oldest Champion", value: `${r.oldestChamp.value}y`, holder: r.oldestChamp.holder },
  ];
}

function initWorldRecords() {
  return {
    mostTitleDefenses: { value: 0, holder: "—", week: 0 },
    mostWins: { value: 0, holder: "—", week: 0 },
    mostKOs: { value: 0, holder: "—", week: 0 },
    mostSubs: { value: 0, holder: "—", week: 0 },
    youngestChamp: { value: 0, holder: "—", week: 0 },
    oldestChamp: { value: 0, holder: "—", week: 0 },
  };
}

// ── HALL OF FAME ──

export function checkHallOfFame(f, g) {
  if (!g._hallOfFame) g._hallOfFame = [];
  if (g._hallOfFame.some(h => h.id === f.id)) return null; // already inducted

  let score = 0;
  const wins = f.record?.w || 0;
  score += wins * 2;
  if (f.titles?.some(t => t.includes("Champion"))) score += 30;
  if (f.titles?.includes("Major World Champion")) score += 20;
  score += (f.titleDefenses || 0) * 5;
  if (f.milestoneFirstTitle) score += 10;
  if ((f.milestone10Wins)) score += 15;
  if ((f.record?.ko || 0) >= 10) score += 10;
  if ((f.record?.sub || 0) >= 8) score += 10;
  if (f.giantKills >= 3) score += 15;
  if (f.milestone3Losses && f.streakW >= 2) score += 5; // comeback

  const threshold = 50; // minimum Hall of Fame score

  if (score >= threshold) {
    const entry = {
      id: f.id, name: f.name, week: g.week,
      record: `${wins}-${f.record?.l || 0}`,
      titles: f.titles || [],
      defenses: f.titleDefenses || 0,
      highlights: [],
    };
    if ((f.record?.ko || 0) >= 10) entry.highlights.push("Knockout Artist");
    if ((f.record?.sub || 0) >= 8) entry.highlights.push("Submission Specialist");
    if (f.milestoneFirstTitle) entry.highlights.push("World Champion");
    if ((f.titleDefenses || 0) >= 3) entry.highlights.push(`${f.titleDefenses}x Title Defenses`);
    g._hallOfFame.push(entry);
    if (g._dynasty) g._dynasty.hallOfFamers = g._hallOfFame.map(h => h.name);
    return entry;
  }
  return null;
}

// ── GENERATIONAL LEGACY ──

export function getGenerationalLinks(g) {
  const links = [];
  if (!g._dynasty) return links;

  // Former fighters who became coaches
  g.coaches?.forEach(c => {
    const formerFighter = g._hallOfFame?.find(h => c.name.includes(h.name?.split(" ").pop()));
    if (formerFighter) {
      links.push({ type: "fighter_to_coach", text: `${formerFighter.name} — former champion, now coaching the next generation.` });
    }
  });

  // Coaches who produced multiple champions
  g.coaches?.forEach(c => {
    if ((c._career?.championsProduced || 0) >= 2) {
      links.push({ type: "coach_legacy", text: `${c.name} has produced ${c._career.championsProduced} champions.` });
    }
  });

  return links;
}
