// Public Opinion — fan perception of a fighter, derived from popularity + recent form
// Pure function, no side effects. Used for FighterDetail display.

/**
 * Get public opinion label for a fighter.
 * @param {object} f - fighter object with popularity, streakW, streakL
 * @returns {{ label: string, description: string, sentiment: "positive"|"neutral"|"negative" }}
 */
export function getPublicOpinion(f) {
  const pop = f.popularity ?? 50;
  const highPop = pop >= 60;
  const lowPop = pop < 40;

  // Proxy for "last 3 fights" using streaks
  const streakW = f.streakW || 0;
  const streakL = f.streakL || 0;
  const recentPositive = streakW >= 2 || streakW > streakL;
  const recentNegative = streakL >= 2 || streakL > streakW;

  if (highPop && recentPositive)
    return { label: "Fan Favorite", description: "The crowd loves them — momentum and star power combine.", sentiment: "positive" };
  if (highPop && recentNegative)
    return { label: "Over the Hill", description: "Still a known name, but recent results raise doubts.", sentiment: "negative" };
  if (lowPop && recentPositive)
    return { label: "Dark Horse", description: "Flying under the radar — quietly building wins.", sentiment: "positive" };
  if (lowPop && recentNegative)
    return { label: "Journeyman", description: "Scraping by. No buzz, no traction.", sentiment: "negative" };

  // Neutral zone
  return { label: "Solid Pro", description: "Respected but not exceptional. Consistent.", sentiment: "neutral" };
}
