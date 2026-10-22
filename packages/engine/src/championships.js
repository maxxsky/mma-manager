// Major is the divisional world belt. Other tiers have independent holders.
import { recordEra } from "./world/history.js";
import { uid } from "./rng.js";

export const TITLE_NAMES = {
  Regional: "Regional Champion", National: "National Champion",
  Minor: "Minor World Champion", Major: "Major World Champion",
  Premier: "Premier World Champion", Interim: "Interim Champion",
};

export function titleTier(booking) {
  if (!booking?.title) return null;
  // Older world-title bookings did not carry titleTier.
  const tier = booking.titleTier || booking.tier || "Major";
  return TITLE_NAMES[tier] ? tier : null;
}

export function championAt(div, tier = "Major") {
  return tier === "Major" ? div?.champ : div?.tierChamps?.[tier];
}

export function setChampion(div, tier, champ) {
  if (tier === "Major") div.champ = champ;
  else (div.tierChamps ||= {})[tier] = champ;
}

export function endWorldEra(g, div, wc) {
  if (!div.era) return;
  const era = div.era;
  g.inbox.unshift({ id: uid(), type: "world", severity: "major", title: `The ${era.championName} Era Ends`, body: `${era.championName}'s era of dominance in ${wc} has come to an end after ${era.defenses} title defenses.` });
  recordEra(g, era.championName, wc, era.startedWeek, g.week, era.defenses);
  div.era = null;
}

// Clear ownership and its active-title label together. Career history remains.
export function removeChampion(g, wc, tier) {
  const div = g.divisions?.[wc];
  const champ = championAt(div, tier);
  if (!champ) return;
  const holder = champ.player && g.roster?.find(f => f.id === champ.fighterId);
  if (holder) holder.titles = (holder.titles || []).filter(t => t !== TITLE_NAMES[tier]);
  if (tier === "Major") endWorldEra(g, div, wc);
  setChampion(div, tier, null);
}

// One-time, deterministic migration. Old lower-tier wins overwrote div.champ;
// the displaced AI champion cannot be reconstructed, so the world belt is vacant.
export function migrateChampionships(g) {
  Object.entries(g.divisions || {}).forEach(([wc, div]) => {
    if (div.tierChamps) return;
    div.tierChamps = {};
    const holder = div.champ?.player && g.roster?.find(f => f.id === div.champ.fighterId);
    if (holder && !holder.titles?.includes(TITLE_NAMES.Major)) {
      const tier = ["Premier", "Minor", "National", "Regional", "Interim"]
        .find(t => holder.titles?.includes(TITLE_NAMES[t]));
      if (tier) div.tierChamps[tier] = { ...div.champ, tier };
      div.champ = null;
      div.era = null;
    }
    // Preserve ladder belts already earned by player fighters in legacy saves.
    (g.roster || []).filter(f => f.weightClass === wc).forEach(f => {
      Object.keys(TITLE_NAMES).filter(t => t !== "Major").forEach(tier => {
        if (f.titles?.includes(TITLE_NAMES[tier]) && !div.tierChamps[tier]) {
          div.tierChamps[tier] = { name: f.name, player: true, fighterId: f.id,
            tier, wonWeek: g.week, lastDefenseWeek: g.week, titleDefenses: 0 };
        }
      });
    });
  });
}
