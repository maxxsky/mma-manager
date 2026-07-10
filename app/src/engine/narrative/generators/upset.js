// Upset story generator
import { TEMPLATES } from "../templates.js";

export function generateUpsetStory(fighter, opponent, ctx) {
  if (!fighter || !opponent) return null;
  const oppRank = fighter?.booked?.oppRank;
  if (oppRank == null || oppRank > 3) return null;
  return TEMPLATES.upset(fighter, opponent, oppRank);
}
