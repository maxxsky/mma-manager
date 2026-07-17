// World news generator — title changes, prospect breakthroughs
import { TEMPLATES } from "../templates.js";

export function generateWorldNews(ctx) {
  const events = [];

  // Title changes in world
  ctx.recentTitleChanges.forEach(tc => {
    events.push(TEMPLATES.divisionShakeup(tc));
  });

  // Prospect breakthroughs
  Object.values(ctx.divisions).forEach(d => {
    const top3 = d.list?.slice(0, 3) || [];
    top3.forEach(c => {
      if (c.age <= 23 && c.points >= 75 && !c.risingStarAnnounced) {
        c.risingStarAnnounced = true;
        events.push(TEMPLATES.risingStar(c));
      }
    });
  });

  return events;
}
