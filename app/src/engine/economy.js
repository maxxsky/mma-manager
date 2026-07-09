import { clamp } from "./rng.js";
import { CAMP_TIERS } from "./data.js";

export function coachBonus(g, gains) {
  let b = 1;
  g.coaches.forEach((c) => {
    const map = {
      Striking: ["striking", "footwork"],
      Wrestling: ["wrestling"],
      BJJ: ["bjj"],
      "S&C": ["strength", "cardio"],
      Head: ["fightIQ"],
    };
    if (gains.some((k) => (map[c.spec] || []).includes(k))) b += c.skill * 0.025;
    if (c.personality === "Technician" && gains.some((k) => ["striking", "bjj", "footwork", "fightIQ"].includes(k)))
      b += 0.10;
  });
  return b;
}

export function facBonus(g, gains) {
  let b = 1;
  const tier = CAMP_TIERS[g.campTier || 0];
  if (gains.includes("wrestling") || gains.includes("bjj")) b += Math.min(g.facilities.mats - 1, 3) * 0.06 + Math.max(0, g.facilities.mats - 4) * 0.03;
  if (gains.includes("striking")) b += Math.min(g.facilities.ring - 1, 3) * 0.06 + Math.max(0, g.facilities.ring - 4) * 0.03;
  if (gains.includes("strength") || gains.includes("cardio")) b += Math.min(g.facilities.weights - 1, 3) * 0.06 + Math.max(0, g.facilities.weights - 4) * 0.03;
  b += tier.trainBonus;
  return b;
}

// Shared facility upgrade cost — used by both UI and reducer
export function facilityCost(lvl, campTier) {
  return lvl * (15000 + (campTier || 0) * 10000);
}
