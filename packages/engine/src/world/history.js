// World history — centralized _worldHistory mutation
export function recordTitleChange(g, week, division, newChamp, oldChamp) {
  if (!g._worldHistory) g._worldHistory = { titleChanges: [], retiredChamps: [] };
  g._worldHistory.titleChanges.push({ week, division, newChamp, oldChamp });
}

export function recordEra(g, championName, division, startedWeek, endedWeek, totalDefenses) {
  if (!g._worldHistory) g._worldHistory = { titleChanges: [], retiredChamps: [] };
  if (!g._worldHistory.eras) g._worldHistory.eras = [];
  g._worldHistory.eras.push({ championName, division, startedWeek, endedWeek, totalDefenses });
}

export function recordRetirement(g, week, division, name) {
  if (!g._worldHistory) g._worldHistory = { titleChanges: [], retiredChamps: [] };
  if (!g._worldHistory.retiredChamps) g._worldHistory.retiredChamps = [];
  if (!g._worldHistory.retiredChamps.some((r) => r.name === name)) {
    g._worldHistory.retiredChamps.push({ name, week, division });
  }
}
