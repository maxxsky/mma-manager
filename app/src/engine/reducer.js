// Lightweight reducer — actions recorded for future multiplayer replay
// Pattern: dispatch({ type, payload }) → pure state transformation

import { clamp, RI, R, pick, fmt$, uid } from "./rng.js";
import {
  ATTRS, TRAINING, INTENSITY, CAMP_TIERS, SPONSOR_BRANDS, FAC_LABEL,
} from "./data.js";
import { weeklyFee, avgSkill } from "./fighter.js";
import { WEIGHTS } from "./data.js";
import { vacateTitle } from "./rankings.js";
import { coachBonus, facBonus } from "./economy.js";
import { getRel } from "./relationships.js";

export function reducer(g, action) {
  // Log every action for multiplayer replay
  if (!g.actionLog) g.actionLog = [];
  g.actionLog.push({ ...action, week: g.week, ts: Date.now() });
  if (g.actionLog.length > 500) g.actionLog = g.actionLog.slice(-500);

  switch (action.type) {
    case "SET_TRAINING": {
      const f = g.roster.find((x) => x.id === action.fighterId);
      if (f) { f.training.type = action.program; f.training.intensity = action.intensity || "Medium"; }
      break;
    }
    case "HIRE_COACH": {
      if (g.coaches.length < (CAMP_TIERS[g.campTier || 0]?.coachCap || 5)) {
        const c = g.coachMarket.find((x) => x.id === action.coachId);
        if (c) { g.coaches.push(c); g.coachMarket = g.coachMarket.filter((x) => x.id !== action.coachId); }
      }
      break;
    }
    case "FIRE_COACH": {
      if (g.coaches.length > 1) {
        g.coaches = g.coaches.filter((x) => x.id !== action.coachId);
        g.chemistry = clamp(g.chemistry - 5, 0, 100);
      }
      break;
    }
    case "UPGRADE_FACILITY": {
      const lvl = g.facilities[action.facility] || 0;
      const max = (CAMP_TIERS[g.campTier || 0]?.facMax || [2,2,2,2])[Object.keys(g.facilities).indexOf(action.facility)];
      if (lvl < max) {
        const cost = lvl * (15000 + (g.campTier || 0) * 10000);
        if (g.cash >= cost) {
          g.cash -= cost;
          g.facilities[action.facility] = lvl + 1;
          g.chemistry = clamp(g.chemistry + 5, 0, 100);
        }
      }
      break;
    }
    case "UPGRADE_TIER": {
      const next = g.campTier + 1;
      if (next < CAMP_TIERS.length) {
        const t = CAMP_TIERS[next];
        if (g.rep >= t.rep && g.cash >= t.cost) {
          g.cash -= t.cost;
          g.campTier = next;
          g.rep = clamp(g.rep + 8, 0, 100);
          g.log.unshift(`🏗️ Camp upgrade ke TIER ${next + 1}: ${t.name}!`);
        }
      }
      break;
    }
    case "SET_SPONSOR": {
      const brand = SPONSOR_BRANDS.find((b) => b.name === action.brand);
      if (brand) {
        g.sponsor = { brand: action.brand, rate: action.rate || brand.baseRate, type: brand.type };
        g.log.unshift(`📢 ${action.brand} jadi sponsor camp — ${fmt$(action.rate || brand.baseRate)}/bln.`);
      }
      break;
    }
    case "TOGGLE_OPEN_GYM": {
      g.openGymActive = !g.openGymActive;
      break;
    }
    case "TAKE_LOAN": {
      if (!g.loan) {
        g.cash += action.amount;
        g.loan = { amount: action.amount, weeklyPayment: action.weekly, remaining: action.amount + Math.round(action.amount * 0.12) };
      }
      break;
    }
    case "SET_CAMP_TAG": {
      if (action.tag && g.rep >= 5) {
        g.campTag = action.tag;
      }
      break;
    }
    case "CLASS_CHANGE_ACCEPT": {
      const f2 = g.roster.find((x) => x.id === action.fighterId);
      if (f2) {
        const oldClass = f2.weightClass;
        const delta = action.targetIdx - WEIGHTS.findIndex((w) => w.name === oldClass);
        f2.weightClassDelta = (f2.weightClassDelta || 0) + delta;
        f2.weightClass = action.targetClass;
        f2.natWeight = Math.round(WEIGHTS[action.targetIdx].limit * R(1.0, 1.09));
        vacateTitle(g, f2);
        f2.rankPoints = Math.max(0, f2.rankPoints - 20);
        f2.morale = clamp(f2.morale + action.moraleEffect, 0, 100);
        f2.lastClassChange = g.week;
        g.log.unshift(`⚖️ ${f2.name} pindah dari ${oldClass} ke ${action.targetClass} (permintaan sendiri).`);
      }
      break;
    }
    case "CLASS_CHANGE_REJECT": {
      const f2 = g.roster.find((x) => x.id === action.fighterId);
      if (f2) {
        f2.morale = clamp(f2.morale + action.moralePenalty, 0, 100);
        f2.lastClassChange = g.week;
        g.log.unshift(`🙅 ${f2.name} minta pindah kelas — permintaan ditolak (morale ${action.moralePenalty > 0 ? "+" : ""}${action.moralePenalty}).`);
      }
      break;
    }
    default:
      // Unknown action — no-op, App.jsx handles complex flows directly
      break;
  }
  return g;
}
