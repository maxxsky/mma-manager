// Legacy comparison + historical context generator
import { TEMPLATES } from "../templates.js";

export function getHistoricalContext(fighter, ctx) {
  const context = [];

  // Compare to Hall of Famers
  if (fighter?.milestoneFirstTitle && ctx.hallOfFame.length > 0) {
    const similarHof = ctx.hallOfFame.find(h => h.titles?.some(t => fighter.titles?.includes(t)));
    if (similarHof) {
      context.push(TEMPLATES.followingHofSteps(fighter, similarHof));
    }
  }

  // Compare to records
  if (fighter?.titleDefenses >= 3 && ctx.mostTitleDefenses.value > 0) {
    if (fighter.titleDefenses < ctx.mostTitleDefenses.value) {
      context.push(TEMPLATES.chasingRecord(fighter, ctx.mostTitleDefenses));
    }
  }

  // Unbeaten streak context
  if ((fighter?.streakW || 0) >= 5) {
    context.push(TEMPLATES.unbeatenStreak(fighter));
  }

  return context;
}

export function generateComparisonNews(ctx) {
  const events = [];

  ctx.roster.forEach(f => {
    // Young champion comparison
    if (f.milestoneFirstTitle && f.age <= 25 && ctx.youngestChamp.value > 0) {
      if (f.age <= ctx.youngestChamp.value) {
        events.push(TEMPLATES.youngestChamp(f, ctx.youngestChamp));
      }
    }

    // Approaching KO record
    const koRecord = ctx.mostKOs.value || 0;
    if ((f.record?.ko || 0) >= koRecord - 2 && koRecord > 0 && f.record.ko < koRecord) {
      events.push(TEMPLATES.closingInKO(f, ctx.mostKOs));
    }
  });

  return events;
}
