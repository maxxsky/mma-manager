import { checkAchievements } from "@ironfist/engine/achievements.js";

// Evaluate achievements after persistence, when the actual title ownership and
// consecutive KO count are known. Cancellation callbacks return no context.
export function applyFightCompletion(old, update, fallbackContext) {
  const state = structuredClone(old);
  const context = update(state) || fallbackContext;
  return { state, newly: context ? checkAchievements(state, context) : [] };
}
