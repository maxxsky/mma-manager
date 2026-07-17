// Camp domain — facility upgrades, tier advancement, sponsors
import { clamp, fmt$ } from "../rng.js";
import { CAMP_TIERS, SPONSOR_BRANDS } from "../data.js";
import { facilityCost } from "../economy.js";
import { CHEM_BOOST_UPGRADE, TEAM_BONDING_COST, TEAM_BONDING_CHEM, TEAM_BONDING_COOLDOWN } from "./constants.js";
import { INVESTMENTS } from "../data/investments.js";

export function reduceCamp(g, action) {
  switch (action.type) {
    case "UPGRADE_FACILITY": {
      const lvl = g.facilities[action.facility] || 0;
      const max = (CAMP_TIERS[g.campTier || 0]?.facMax || [2, 2, 2, 2])[Object.keys(g.facilities).indexOf(action.facility)];
      if (lvl < max) {
        const cost = facilityCost(lvl, g.campTier);
        if (g.cash >= cost) {
          g.cash -= cost;
          g.facilities[action.facility] = lvl + 1;
          g.chemistry = clamp(g.chemistry + CHEM_BOOST_UPGRADE, 0, 100);
          g.log.unshift("🏗️ " + (action.facilityLabel || action.facility) + " upgrade ke L" + (lvl + 1) + ".");
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
    case "TERMINATE_SPONSOR": {
      g.sponsors = g.sponsors.filter((x) => x.brand !== action.brand);
      g.log.unshift("❌ Kontrak " + action.brand + " diakhiri.");
      break;
    }
    case "TEAM_BONDING": {
      if (!g._lastTeamBonding || g.week - g._lastTeamBonding >= TEAM_BONDING_COOLDOWN) {
        if (g.cash >= TEAM_BONDING_COST) {
          g.cash -= TEAM_BONDING_COST;
          g.chemistry = clamp(g.chemistry + TEAM_BONDING_CHEM, 0, 100);
          g._lastTeamBonding = g.week;
          g.log.unshift("🤝 Team bonding session — chemistry +" + TEAM_BONDING_CHEM + ". ($" + (TEAM_BONDING_COST/1000) + "K)");
        }
      } else {
        const remaining = TEAM_BONDING_COOLDOWN - (g.week - g._lastTeamBonding);
        g.log.unshift("⏳ Team bonding on cooldown — available in " + remaining + " weeks.");
      }
      break;
    }
    case "PURCHASE_INVESTMENT": {
      const inv = INVESTMENTS.find((i) => i.id === action.investmentId);
      if (!inv) break;
      if (!g.investments) g.investments = {};
      if (g.investments[inv.id]) break; // udah dibeli, one-time only
      if (inv.tierReq && (g.campTier || 0) < inv.tierReq) break;
      if (inv.legacyReq && (g.legacy || 0) < inv.legacyReq) break;
      if (g.cash < inv.cost) break;
      g.cash -= inv.cost;
      g.investments[inv.id] = true;
      g.log.unshift(`🏛️ Investasi baru: ${inv.name} ($${(inv.cost/1000).toFixed(0)}K).`);
      break;
    }
  }
}
