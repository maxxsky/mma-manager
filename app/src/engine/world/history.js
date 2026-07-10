// World history — centralized _worldHistory mutation
export function recordTitleChange(g, week, division, newChamp, oldChamp) {
  if (!g._worldHistory) g._worldHistory = { titleChanges: [], retiredChamps: [] };
  g._worldHistory.titleChanges.push({ week, division, newChamp, oldChamp });
}

export function recordRetirement(g, week, division, name) {
  if (!g._worldHistory) g._worldHistory = { titleChanges: [], retiredChamps: [] };
  if (!g._worldHistory.retiredChamps) g._worldHistory.retiredChamps = [];
  if (!g._worldHistory.retiredChamps.some((r) => r.name === name)) {
    g._worldHistory.retiredChamps.push({ name, week, division });
  }
}
