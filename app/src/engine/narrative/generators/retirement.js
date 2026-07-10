// Retirement story generator
import { TEMPLATES } from "../templates.js";

export function generateRetirementStory(fighter, ctx) {
  if (!fighter) return null;
  const wins = fighter.record?.w || 0;
  const losses = fighter.record?.l || 0;
  const kos = fighter.record?.ko || 0;
  const subs = fighter.record?.sub || 0;
  const defenses = fighter.titleDefenses || 0;
  const hof = ctx.hallOfFame.some(h => h.id === fighter.id);
  return TEMPLATES.retirement(fighter, wins, losses, kos, subs, defenses, hof);
}
