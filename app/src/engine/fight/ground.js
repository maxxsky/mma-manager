// Ground position hierarchy — Guard → Half Guard → Side Control → Mount → Back Mount

export const GROUND = {
  guard:       { topGNP: 0.6, bottomSub: 0.4, sweepChance: 0.30, advanceChance: 0.25, label: "closed guard" },
  halfGuard:   { topGNP: 0.7, bottomSub: 0.3, sweepChance: 0.20, advanceChance: 0.30, label: "half guard" },
  sideControl: { topGNP: 0.85, bottomSub: 0.1, sweepChance: 0.10, advanceChance: 0.25, label: "side control" },
  mount:       { topGNP: 0.95, bottomSub: 0.05, sweepChance: 0.05, advanceChance: 0.15, label: "full mount" },
  backMount:   { topGNP: 0.3,  bottomSub: 0.0, sweepChance: 0.05, advanceChance: 0.0,  label: "back mount" },
};

export const GROUND_ORDER = ["guard", "halfGuard", "sideControl", "mount", "backMount"];
