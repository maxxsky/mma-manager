// Fight-time ambition effects (P2 #26, FI3) and the coach-personality effects
// that hang off the same moments (P2 #29, CA3). The descriptions players see
// are AMBITIONS in data/traits.js and COACH_PERSONALITIES in data/coaches.js;
// these make Paycheck, Legacy, Family Man, the popularity half of Star Power,
// Motivator and the popularity half of Player's Coach do what they say. Belt Chaser and the
// low-popularity half of Star Power run monthly in tick/settlement.js; Grinder
// in tick/training.js.
import { clamp } from "./rng.js";

export const PAYCHECK_MORALE = 3;          // every completed fight
export const LEGACY_MORALE = 5;            // beating a ranked opponent or champion
export const FAMILY_MAN_MAX_FIGHTS = 3;    // per year (fightsThisYear resets in tick/yearly.js)
export const FAMILY_MAN_MORALE_PENALTY = 10; // each fight beyond the max
export const STAR_POWER_POP_MULT = 1.5;    // on the fight's net popularity gain
export const PLAYERS_COACH_POP_MULT = 1.15; // on the fight's net popularity gain
export const MOTIVATOR_RECOVERY_MULT = 1.2; // weekly morale recovery after a loss (tick/training.js)

/** Call once per completed fight, after every other popularity change. */
export function applyFightAmbition(g, f, { won, oppRank, popBefore }) {
  f.fightsThisYear = (f.fightsThisYear || 0) + 1;

  if (f.ambition === "Paycheck") {
    f.morale = clamp(f.morale + PAYCHECK_MORALE, 0, 100);
  }
  if (f.ambition === "Legacy" && won && oppRank != null) {
    f.morale = clamp(f.morale + LEGACY_MORALE, 0, 100);
    g.log.unshift(`🏛️ ${f.name} mengalahkan lawan ber-ranking — legacy bertambah. Morale +${LEGACY_MORALE}.`);
  }
  if (f.ambition === "Family Man" && f.fightsThisYear > FAMILY_MAN_MAX_FIGHTS) {
    f.morale = clamp(f.morale - FAMILY_MAN_MORALE_PENALTY, 0, 100);
    g.log.unshift(`🏠 ${f.name} sudah ${f.fightsThisYear} fight tahun ini — terlalu jauh dari keluarga. Morale -${FAMILY_MAN_MORALE_PENALTY}.`);
  }
  if (typeof popBefore === "number") {
    const gain = f.popularity - popBefore;
    const mult = (f.ambition === "Star Power" ? STAR_POWER_POP_MULT : 1)
      * (g.coaches?.some((c) => c.personality === "Player's Coach") ? PLAYERS_COACH_POP_MULT : 1);
    if (gain > 0 && mult !== 1) f.popularity = clamp(popBefore + gain * mult, 0, 100);
  }
}
