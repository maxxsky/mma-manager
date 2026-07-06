import { clamp } from "./rng.js";
import { CAMP_TIERS, RIVAL_TRAITS, CAMP_SPECS } from "./data.js";

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
    if (gains.some((k) => (map[c.spec] || []).includes(k))) b += c.skill * 0.03;
    if (c.personality === "Technician" && gains.some((k) => ["striking", "bjj", "footwork", "fightIQ"].includes(k)))
      b += 0.10;
  });
  return b;
}

export function facBonus(g, gains) {
  let b = 1;
  const tier = CAMP_TIERS[g.campTier || 0];
  if (gains.includes("wrestling") || gains.includes("bjj")) b += (g.facilities.mats - 1) * 0.06;
  if (gains.includes("striking")) b += (g.facilities.ring - 1) * 0.06;
  if (gains.includes("strength") || gains.includes("cardio")) b += (g.facilities.weights - 1) * 0.06;
  b += tier.trainBonus;
  if (g.campTag) {
    const tag = CAMP_SPECS[g.campTag] || RIVAL_TRAITS[g.campTag];
    if (tag && tag.spec && gains.includes(tag.spec)) b += 0.06;
  }
  return b;
}

// Shared facility upgrade cost — used by both UI and reducer
export function facilityCost(lvl, campTier) {
  return lvl * (15000 + (campTier || 0) * 10000);
}
