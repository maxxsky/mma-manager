// Promotions database — named entities per tier, replacing anonymous tier labels
// Shape matches SPONSOR_BRANDS pattern: array of objects, flat, data-only.
import { random } from "../rng.js";

const PERSONALITIES = {
  talentFocused: { id: "talentFocused", label: "Talent Focused", desc: "Prefers top-15 contenders" },
  grassroots:    { id: "grassroots",    label: "Grassroots",    desc: "Builds prospects, favors unranked fighters" },
  highRoller:    { id: "highRoller",    label: "High Roller",  desc: "Big purses, fast expectation" },
  oldSchool:     { id: "oldSchool",     label: "Old School",   desc: "Wants champions fighting regularly" },
};

export const PROMOTIONS = [
  // Local
  { id: "ironclad-fight-nights",  name: "Ironclad Fight Nights",  tier: "Local",    color: "#8a6f2e", personality: PERSONALITIES.grassroots,    founded: 2018, prestige: 85 },
  { id: "steel-city-combat",      name: "Steel City Combat",      tier: "Local",    color: "#7a6240", personality: PERSONALITIES.oldSchool,     founded: 2016, prestige: 90 },

  // Regional
  { id: "frontier-mma",           name: "Frontier MMA",           tier: "Regional", color: "#b88728", personality: PERSONALITIES.grassroots,    founded: 2014, prestige: 150 },
  { id: "bastion-fa",             name: "Bastion Fighting Alliance", tier: "Regional", color: "#a07830", personality: PERSONALITIES.talentFocused, founded: 2012, prestige: 180 },

  // National
  { id: "vanguard-championship",  name: "Vanguard Championship",  tier: "National", color: "#d4a030", personality: PERSONALITIES.oldSchool,     founded: 2010, prestige: 300 },
  { id: "continental-combat",     name: "Continental Combat League", tier: "National", color: "#c09038", personality: PERSONALITIES.talentFocused, founded: 2009, prestige: 320 },

  // Major
  { id: "titan-fighting-series",  name: "Titan Fighting Series",  tier: "Major",    color: "#f0b840", personality: PERSONALITIES.highRoller,    founded: 2006, prestige: 500 },
  { id: "apex-combat-league",     name: "Apex Combat League",     tier: "Major",    color: "#e0a840", personality: PERSONALITIES.talentFocused, founded: 2007, prestige: 480 },

  // Premier
  { id: "zenith-championship",    name: "Zenith Championship",    tier: "Premier",  color: "#ffd15c", personality: PERSONALITIES.highRoller,    founded: 2000, prestige: 850 },
  { id: "crown-mma",              name: "Crown MMA",              tier: "Premier",  color: "#e8c050", personality: PERSONALITIES.talentFocused, founded: 2002, prestige: 820 },
];

export function pickPromotion(tier, fighterContext) {
  const pool = PROMOTIONS.filter((p) => p.tier === tier);
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];

  // Light weighting by personality vs fighter context
  const weights = pool.map((p) => {
    let w = 1.0;
    const r = fighterContext?.r;
    if (p.personality.id === "grassroots" && (r == null || r > 10)) w += 0.2;
    if (p.personality.id === "talentFocused" && r != null && r <= 5) w += 0.2;
    if (p.personality.id === "highRoller" && fighterContext?.streakW >= 3) w += 0.2;
    if (p.personality.id === "oldSchool" && fighterContext?.streakL >= 2) w += 0.15;
    return { prom: p, weight: w };
  });

  const total = weights.reduce((s, w) => s + w.weight, 0);
  let roll = random() * total;
  for (const item of weights) {
    roll -= item.weight;
    if (roll <= 0) return item.prom;
  }
  return pool[0];
}

export function getPromotionsData() {
  return PROMOTIONS.map((p) => ({ ...p }));
}
