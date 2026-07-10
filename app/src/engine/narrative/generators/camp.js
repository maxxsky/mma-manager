// Camp milestone story generator
import { TEMPLATES } from "../templates.js";

export function generateCampMilestoneStory(ctx) {
  const d = ctx.dynasty;
  if (!d) return null;
  const stories = [];

  if (d.championsProduced >= 5 && !d._milestone5champs) {
    d._milestone5champs = true;
    stories.push(TEMPLATES.fiveChampions());
  }
  if (d.totalWins >= 100 && !d._milestone100wins) {
    d._milestone100wins = true;
    stories.push(TEMPLATES.hundredWins());
  }
  if (ctx.hallOfFame.length >= 3 && !d._milestone3hof) {
    d._milestone3hof = true;
    stories.push(TEMPLATES.threeHof());
  }
  return stories.length > 0 ? stories : null;
}
