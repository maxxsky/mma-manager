// Coach domain — hire, fire
import { clamp, fmt$ } from "../rng.js";
import { CAMP_TIERS } from "../data.js";
import { CHEM_PENALTY_FIRE_COACH, DEFAULT_COACH_CAP } from "./constants.js";

export function reduceCoach(g, action) {
  switch (action.type) {
    case "HIRE_COACH": {
      const cap = CAMP_TIERS[g.campTier || 0]?.coachCap || DEFAULT_COACH_CAP;
      if (g.coaches.length < cap) {
        const c = g.coachMarket.find((x) => x.id === action.coachId);
        if (c) {
          c.hiredWeek = g.week;
          g.coaches.push(c);
          g.coachMarket = g.coachMarket.filter((x) => x.id !== action.coachId);
          g.log.unshift("👨‍🏫 " + (action.coachName || c.name) + " (" + (action.coachSpec || c.spec) + ") direkrut — gaji " + fmt$(action.coachSalary || c.salary) + "/bln.");
        }
      }
      break;
    }
    case "FIRE_COACH": {
      if (g.coaches.length > 1) {
        g.cash -= action.severance || 0;
        g.coaches = g.coaches.filter((x) => x.id !== action.coachId);
        g.chemistry = clamp(g.chemistry - CHEM_PENALTY_FIRE_COACH, 0, 100);
        g.log.unshift("👋 " + (action.coachName || "Coach") + " dipecat — severance 1 bulan gaji. Chemistry -" + CHEM_PENALTY_FIRE_COACH + ".");
      }
      break;
    }
  }
}
