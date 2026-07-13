// Data barrel — re-exports from split modules
// All existing imports from "./engine/data.js" continue to work unchanged.

export { ATTRS, ATTR_LABEL } from "./data/attributes.js";
export { WEIGHTS } from "./data/weights.js";
export { ARCHETYPES, ARCH_COLOR, REGIONS, REGION_COLOR, POTENTIAL_TIERS } from "./data/archetypes.js";
export { TRAITS, TRAIT_KEYS, TRAIT_CONFLICTS, AMBITIONS, AMBITION_KEYS } from "./data/traits.js";
export { GAME_PLANS, TRAINING, INTENSITY } from "./data/training.js";
export { COACH_SPECS, COACH_NAMES, COACH_PERSONALITIES } from "./data/coaches.js";
export { AGENT_TYPES } from "./data/agents.js";
export { RIVAL_NAMES, RIVAL_TRAITS, PROMO_TIERS } from "./data/rivals.js";
export { CAMP_TIERS, FAC_LABEL, SPARRING_MATCH, MEMBER_FEE } from "./data/camp.js";
export { SPONSOR_BRANDS, SPONSOR_TERMS } from "./data/sponsors.js";
export { PROMOTIONS, pickPromotion, getPromotionsData } from "./data/promotions.js";
// ACHIEVEMENTS is defined here to avoid circular imports with achievements.js
export const ACHIEVEMENTS = [
  { id: "first_win", title: "First Blood", desc: "Win your first fight", icon: "🩸" },
  { id: "first_ko", title: "Knockout Artist", desc: "Win by KO/TKO", icon: "💥" },
  { id: "first_sub", title: "Submission Specialist", desc: "Win by submission", icon: "🦾" },
  { id: "first_title", title: "World Champion", desc: "Win any title", icon: "👑" },
  { id: "five_wins", title: "Hot Streak", desc: "Win 5 fights total", icon: "🔥" },
  { id: "ten_wins", title: "Dominant Force", desc: "Win 10 fights total", icon: "⚡" },
  { id: "legacy_1k", title: "Established", desc: "Reach 1,000 legacy points", icon: "🏛️" },
  { id: "legacy_5k", title: "Hall of Famer", desc: "Reach 5,000 legacy points", icon: "🏆" },
  { id: "cash_100k", title: "Six Figures", desc: "Reach $100,000 cash", icon: "💰" },
  { id: "cash_1m", title: "Million Dollar Man", desc: "Reach $1,000,000 cash", icon: "💎" },
  { id: "sign_s_prospect", title: "Talent Scout", desc: "Sign an S-grade prospect", icon: "🔍" },
  { id: "tier_3", title: "National Center", desc: "Upgrade camp to tier 3", icon: "🏗️" },
  { id: "tier_5", title: "World-Class Institute", desc: "Upgrade camp to tier 5", icon: "🌟" },
  { id: "ko_streak_3", title: "Finisher", desc: "3 consecutive KO/TKO wins", icon: "☠️" },
];
