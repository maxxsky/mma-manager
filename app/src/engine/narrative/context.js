// Narrative context — precomputed history and world state for story generators.
// Avoids repeated deep queries against game state during narrative generation.

export function createNarrativeContext(g) {
  return {
    // World history
    worldHistory: g._worldHistory || {},
    titleChanges: g._worldHistory?.titleChanges || [],
    recentTitleChanges: (g._worldHistory?.titleChanges || []).filter(tc => g.week - tc.week <= 4),

    // Hall of Fame
    hallOfFame: g._hallOfFame || [],
    recentHofInductions: (g._hallOfFame || []).filter(h => h.week === g.week),

    // World records
    records: g._worldRecords || {},
    mostTitleDefenses: g._worldRecords?.mostTitleDefenses || { value: 0, holder: "" },
    mostKOs: g._worldRecords?.mostKOs || { value: 0, holder: "" },
    youngestChamp: g._worldRecords?.youngestChamp || { value: 0, holder: "" },

    // Dynasty
    dynasty: g._dynasty,

    // Timeline
    timeline: g._timeline || [],

    // Roster
    roster: g.roster || [],

    // Divisions
    divisions: g.divisions || {},

    // Week
    week: g.week,
  };
}
