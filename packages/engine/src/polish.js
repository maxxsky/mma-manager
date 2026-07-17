// ============================================================
//   RELEASE POLISH — Save management, achievements, stats, recovery
// ============================================================

// ── SAVE MANAGEMENT ──

export const SAVE_VERSION = 5;

export function validateSave(s) {
  if (!s || typeof s !== "object") return { valid: false, reason: "Invalid save data" };
  if (s.week == null || !s.roster || s.cash == null || isNaN(s.cash)) return { valid: false, reason: "Corrupted — missing core data" };
  if (s.cash < -50000) return { valid: false, reason: "Bankrupt save" };
  return { valid: true };
}

export function exportSave(slot) {
  try {
    const raw = localStorage.getItem(`mma-manager-save-v4-slot${slot}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    data._exportVersion = SAVE_VERSION;
    data._exportDate = new Date().toISOString();
    return JSON.stringify(data, null, 2);
  } catch { return null; }
}

export function importSave(slot, jsonString) {
  try {
    const data = JSON.parse(jsonString);
    const validation = validateSave(data);
    if (!validation.valid) return { success: false, error: validation.reason };
    localStorage.setItem(`mma-manager-save-v4-slot${slot}`, JSON.stringify(data));
    return { success: true };
  } catch (e) {
    return { success: false, error: "Invalid JSON file" };
  }
}

export function renameSlot(slot, name) {
  try {
    localStorage.setItem(`mma-manager-save-v4-slot${slot}-name`, name);
    return true;
  } catch { return false; }
}

export function getSlotName(slot) {
  try {
    return localStorage.getItem(`mma-manager-save-v4-slot${slot}-name`) || `Slot ${slot}`;
  } catch { return `Slot ${slot}`; }
}

export function deleteSlot(slot) {
  try {
    localStorage.removeItem(`mma-manager-save-v4-slot${slot}`);
    localStorage.removeItem(`mma-manager-save-v4-slot${slot}-name`);
    return true;
  } catch { return false; }
}

export function backupSave(slot) {
  try {
    const raw = localStorage.getItem(`mma-manager-save-v4-slot${slot}`);
    if (!raw) return false;
    localStorage.setItem(`mma-manager-save-v4-slot${slot}-backup`, raw);
    return true;
  } catch { return false; }
}

export function restoreBackup(slot) {
  try {
    const raw = localStorage.getItem(`mma-manager-save-v4-slot${slot}-backup`);
    if (!raw) return false;
    localStorage.setItem(`mma-manager-save-v4-slot${slot}`, raw);
    return true;
  } catch { return false; }
}

export function hasBackup(slot) {
  return localStorage.getItem(`mma-manager-save-v4-slot${slot}-backup`) !== null;
}

// ── CAREER STATISTICS ──

export function computeCareerStats(g) {
  const stats = {
    totalFights: 0, wins: 0, losses: 0, kos: 0, subs: 0, decs: 0,
    championsProduced: 0, titleDefenses: 0,
    totalEarnings: 0, totalExpenses: 0,
    prospectsSigned: 0, coachesHired: 0,
    longestWinStreak: 0, highestRep: g.rep || 0,
    legacyMilestones: [],
    totalPlayTime: g.week || 0,
  };

  g.roster?.forEach(f => {
    stats.totalFights += (f.record?.w || 0) + (f.record?.l || 0);
    stats.wins += (f.record?.w || 0);
    stats.losses += (f.record?.l || 0);
    stats.kos += (f.record?.ko || 0);
    stats.subs += (f.record?.sub || 0);
    stats.decs += (f.record?.dec || 0);
    if (f.titles?.some(t => t.includes("Champion"))) stats.championsProduced++;
    stats.titleDefenses += (f.titleDefenses || 0);
    if ((f.streakW || 0) > stats.longestWinStreak) stats.longestWinStreak = f.streakW;
  });

  // Legacy milestones
  if (g.legacy >= 1000) stats.legacyMilestones.push("Established (1K)");
  if (g.legacy >= 5000) stats.legacyMilestones.push("Hall of Famer (5K)");
  if (g.legacy >= 10000) stats.legacyMilestones.push("Legend (10K)");
  if (g.legacy >= 50000) stats.legacyMilestones.push("GOAT (50K)");

  // Reached tiers
  if (g.campTier >= 1) stats.legacyMilestones.push("Regional Camp");
  if (g.campTier >= 3) stats.legacyMilestones.push("National Center");
  if (g.campTier >= 4) stats.legacyMilestones.push("World-Class Institute");

  stats.prospectsSigned = g.roster?.filter(f => f.joinedWeek > 0).length || 0;
  stats.coachesHired = g.coaches?.length || 0;
  stats.highestRep = Math.max(stats.highestRep, g.rep || 0);

  return stats;
}

// ── ACCESSIBILITY ──

export const ACCESSIBILITY = {
  fontSize: { small: 12, medium: 14, large: 16 },
  colorblindPalette: {
    pos: "#4dac26",  // green → blue-green
    neg: "#d73027",  // red → darker red (unchanged, red is universal)
    warn: "#fee090", // yellow → light orange
    gold: "#91bfdb", // gold → blue
    ember: "#fc8d59", // orange → lighter orange
  },
};

export function getAccessibilitySettings() {
  try {
    return JSON.parse(localStorage.getItem("mma-a11y") || "{}");
  } catch { return {}; }
}

export function setAccessibilitySettings(settings) {
  localStorage.setItem("mma-a11y", JSON.stringify(settings));
}
