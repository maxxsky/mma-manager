// Achievement checker — runs after tick and after fights
// Returns array of newly unlocked achievements

import { ACHIEVEMENTS } from "./data.js";
import { getPrestige } from "./prestige.js";

export const isKnockout = how => how === "KO/TKO" || how === "Doctor Stoppage";

export function koWinStreak(f) {
  if (!f.fightHistory?.length) return f.koStreak || 0;
  let streak = 0;
  for (let i = f.fightHistory.length - 1; i >= 0; i--) {
    const fight = f.fightHistory[i];
    if (fight.result !== "W" || !isKnockout(fight.method)) break;
    streak++;
  }
  return streak;
}

export function checkAchievements(g, context = {}) {
  // g._unlocked = Set of achievement IDs already unlocked
  if (!g._unlocked) g._unlocked = [];
  const unlocked = g._unlocked;
  const newly = [];

  const add = (id) => {
    if (!unlocked.includes(id)) {
      unlocked.push(id);
      newly.push(id);
    }
  };

  const totalWins = g.roster.reduce((s, f) => s + f.record.w, 0);

  const won = context.fightResult?.won && !context.fightResult?.draw;
  if (won) add("first_win");
  if (won && isKnockout(context.fightResult.how)) add("first_ko");
  if (won && context.fightResult.how === "Submission") add("first_sub");
  if (won && context.fightResult.titleWon) add("first_title");
  if (totalWins >= 5) add("five_wins");
  if (totalWins >= 10) add("ten_wins");
  // Keep the saved IDs so earned badges survive the consolidation.
  if (getPrestige(g) >= 12) add("legacy_1k");
  if (getPrestige(g) >= 55) add("legacy_5k");
  if (g.cash >= 100000) add("cash_100k");
  if (g.cash >= 1000000) add("cash_1m");
  if (g.campTier >= 3) add("tier_3");
  if (g.campTier >= 5) add("tier_5");
  if (context.signedSProspect) add("sign_s_prospect");
  if (context.koStreak >= 3) add("ko_streak_3"); // tracked per-fighter

  // Log newly unlocked
  newly.forEach((id) => {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a) g.log.unshift(`🏆 ACHIEVEMENT: ${a.icon} ${a.title} — ${a.desc}`);
  });

  return newly;
}
