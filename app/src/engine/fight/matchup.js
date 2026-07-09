// Archetype matchup table — calibrated via 25+ simulation iterations.
// Bidirectional sim: 5000 fights per mirror pair, target 45-55% win rates.

const TABLE = {
  "Boxer_vs_Wrestler":          { aStrike: 0.10, aTDDef: -0.08 },
  "Boxer_vs_BJJ Specialist":    { aStrike: 0.10, aTDDef: 0.05 },
  "Boxer_vs_Boxer":             { aStrike: -0.05 },
  "Muay Thai_vs_Wrestler":      { aClinch: 0.15, aTDDef: 0.05 },
  "Muay Thai_vs_BJJ Specialist":{ aClinch: 0.10, aTDDef: -0.10 },
  "Muay Thai_vs_Boxer":         { aStrike: -0.05, aClinch: 0.15 },
  "Wrestler_vs_Boxer":          { aTD: 0.20, aGNP: 0.10, aTDDef: 0.10 },
  "Wrestler_vs_Muay Thai":      { aTD: 0.05, aGNP: 0.10 },
  "Wrestler_vs_BJJ Specialist": { aTD: 0.10, aSubRisk: 0.12 },
  "BJJ Specialist_vs_Wrestler": { aSub: 0.10, aSweep: 0.15 },
  "BJJ Specialist_vs_Muay Thai":{ aSub: 0.06, aSweep: 0.10 },
  "BJJ Specialist_vs_Boxer":    { aTD: -0.05, aSub: 0.05 },
  "All-Rounder_vs_Boxer":       { aStrike: 0.08 },
  "All-Rounder_vs_Muay Thai":   { aTDDef: 0.04 },
  "All-Rounder_vs_Wrestler":    { aTDDef: 0.01 },
  "All-Rounder_vs_BJJ Specialist": { aSweep: 0.12 },
  "Boxer_vs_All-Rounder":       { aStrike: 0.05 },
  "Muay Thai_vs_All-Rounder":   { aClinch: 0.05 },
  "BJJ Specialist_vs_All-Rounder": { aSub: 0.05 },
};

const B_KEY_MAP = {
  aStrike: "bStrike", aTDDef: "bTDDef", aClinch: "bClinch",
  aTD: "bTD", aGNP: "bGNP", aSubRisk: "bSubRisk",
  aSub: "bSub", aSweep: "bSweep",
};

export function matchupMods(A, B) {
  const keyAB = `${A.archetype}_vs_${B.archetype}`;
  const keyBA = `${B.archetype}_vs_${A.archetype}`;
  const aMods = TABLE[keyAB] || {};
  const bRaw = TABLE[keyBA] || {};
  const bMods = {};
  for (const [k, v] of Object.entries(bRaw)) {
    bMods[B_KEY_MAP[k]] = v;
  }
  return { ...aMods, ...bMods };
}
