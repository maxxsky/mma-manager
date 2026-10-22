// World news generator — title changes, prospect breakthroughs
import { divisionRankings } from "../../rankings.js";
import { TEMPLATES } from "../templates.js";

export function generateWorldNews(ctx) {
  const events = [];

  // Title changes in world
  ctx.recentTitleChanges.forEach(tc => {
    events.push(TEMPLATES.divisionShakeup(tc));
  });

  // Prospect breakthroughs
  Object.keys(ctx.divisions).forEach(wc => {
    const top3 = divisionRankings(ctx, wc).filter(c => c.rank <= 3 && !c.player).map(c => c.fighter);
    top3.forEach(c => {
      if (c.age <= 23 && c.points >= 75 && !c.risingStarAnnounced) {
        c.risingStarAnnounced = true;
        events.push(TEMPLATES.risingStar(c));
      }
    });
  });

  return events;
}
