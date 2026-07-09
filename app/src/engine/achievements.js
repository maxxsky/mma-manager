// Achievement checker — runs after tick and after fights
// Returns array of newly unlocked achievements

import { ACHIEVEMENTS } from "./data.js";

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
  const totalKOs = g.roster.reduce((s, f) => s + f.record.ko, 0);
  const totalSubs = g.roster.reduce((s, f) => s + f.record.sub, 0);

  if (context.fightResult?.won && !context.fightResult?.draw) add("first_win");
  if (context.fightResult?.how === "KO/TKO" || context.fightResult?.how === "Doctor Stoppage") add("first_ko");
  if (context.fightResult?.how === "Submission") add("first_sub");
  if (context.fightResult?.titleWon) add("first_title");
  if (totalWins >= 5) add("five_wins");
  if (totalWins >= 10) add("ten_wins");
  if (g.legacy >= 1000) add("legacy_1k");
  if (g.legacy >= 5000) add("legacy_5k");
  if (g.cash >= 100000) add("cash_100k");
  if (g.cash >= 1000000) add("cash_1m");
  if (g.campTier >= 3) add("tier_3");
  if (g.campTier >= 4) add("tier_5");
  if (context.signedSProspect) add("sign_s_prospect");
  if (context.koStreak >= 3) add("ko_streak_3"); // tracked per-fighter

  // Log newly unlocked
  newly.forEach((id) => {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (a) g.log.unshift(`🏆 ACHIEVEMENT: ${a.icon} ${a.title} — ${a.desc}`);
  });

  return newly;
}
