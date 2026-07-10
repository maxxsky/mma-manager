// Championship story generator
import { TEMPLATES } from "../templates.js";

export function generateChampionshipStory(fighter, ctx) {
  if (!fighter?.milestoneFirstTitle) return null;
  const stories = [];

  if (fighter.titleDefenses === 1) stories.push(TEMPLATES.firstDefense(fighter));
  if (fighter.titleDefenses === 5) stories.push(TEMPLATES.dominantReign(fighter));
  if (fighter.titleDefenses === 10) stories.push(TEMPLATES.historicDynasty(fighter));

  return stories.length > 0 ? stories : null;
}
