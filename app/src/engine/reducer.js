// Lightweight reducer — actions recorded for future multiplayer replay
// Pattern: dispatch({ type, payload }) → pure state transformation

import { clamp, RI, R, pick, fmt$, uid, snapshot } from "./rng.js";
import { onCoachRaiseDenied, onConflictMediated } from "./events.js";
import { dispatchEvent } from "./dispatch.js";
import {
  ATTRS, TRAINING, INTENSITY, CAMP_TIERS, SPONSOR_BRANDS, FAC_LABEL,
} from "./data.js";
import { weeklyFee, avgSkill, genBio } from "./fighter.js";
import { WEIGHTS } from "./data.js";
import { vacateTitle } from "./rankings.js";
import { coachBonus, facBonus, facilityCost } from "./economy.js";
import { getRel } from "./relationships.js";

// Game-state mutator — applies actions directly to game object.
// Unlike Redux-style reducers, this mutates `g` in place for performance.
// Named "reducer" for familiarity; functions identically to a state machine.
export function reducer(g, action) {
  // Ignore undo/redo in the action log itself
  const isMetaAction = action.type === "UNDO" || action.type === "REDO";

  // Snapshot before every non-meta action (undo/redo stack)
  if (!isMetaAction && action.type !== "INIT") {
    if (!g._undoStack) g._undoStack = [];
    if (!g._redoStack) g._redoStack = [];
    // Save current state, drop oldest if > 20 entries
    g._undoStack.push({ snapshot: snapshot(g) });
    if (g._undoStack.length > 20) g._undoStack.shift();
    g._redoStack = []; // new action clears redo
  }

  // Log every action for multiplayer replay (skip meta + init)
  if (!isMetaAction) {
    if (!g.actionLog) g.actionLog = [];
    g.actionLog.push({ ...action, week: g.week, ts: Date.now() });
    if (g.actionLog.length > 500) g.actionLog = g.actionLog.slice(-500);
  }

  // ── UNDO/REDO ──
  if (action.type === "UNDO") {
    if (g._undoStack && g._undoStack.length > 0) {
      const current = snapshot(g);
      g._redoStack.push({ snapshot: current });
      const prev = g._undoStack.pop().snapshot;
      Object.keys(g).forEach((k) => delete g[k]);
      Object.assign(g, prev);
      g.log.unshift("⏪ Undo — kembali ke state sebelumnya.");
    }
    return g;
  }
  if (action.type === "REDO") {
    if (g._redoStack && g._redoStack.length > 0) {
      const current = snapshot(g);
      g._undoStack.push({ snapshot: current });
      const next = g._redoStack.pop().snapshot;
      Object.keys(g).forEach((k) => delete g[k]);
      Object.assign(g, next);
      g.log.unshift("⏩ Redo — maju ke state berikutnya.");
    }
    return g;
  }

  switch (action.type) {
    case "SET_TRAINING": {
      const f = g.roster.find((x) => x.id === action.fighterId);
      if (f) { f.training.type = action.program; f.training.intensity = action.intensity || "Medium"; }
      break;
    }
    case "HIRE_COACH": {
      if (g.coaches.length < (CAMP_TIERS[g.campTier || 0]?.coachCap || 5)) {
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
        g.chemistry = clamp(g.chemistry - 5, 0, 100);
        g.log.unshift("👋 " + (action.coachName || "Coach") + " dipecat — severance 1 bulan gaji. Chemistry -5.");
      }
      break;
    }
    case "UPGRADE_FACILITY": {
      const lvl = g.facilities[action.facility] || 0;
      const max = (CAMP_TIERS[g.campTier || 0]?.facMax || [2,2,2,2])[Object.keys(g.facilities).indexOf(action.facility)];
      if (lvl < max) {
        const cost = facilityCost(lvl, g.campTier);
        if (g.cash >= cost) {
          g.cash -= cost;
          g.facilities[action.facility] = lvl + 1;
          g.chemistry = clamp(g.chemistry + 5, 0, 100);
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
        // Career history
        if (!f2.careerHistory) f2.careerHistory = [];
        f2.careerHistory.push({ week: g.week, type: "class", text: `⚖️ ${oldClass} → ${action.targetClass}` });
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
    case "DISMISS_PROSPECT": {
      g.prospects = g.prospects.filter((x) => x.id !== action.prospectId);
      break;
    }
    case "TERMINATE_SPONSOR": {
      g.sponsors = g.sponsors.filter((x) => x.brand !== action.brand);
      g.log.unshift("❌ Kontrak " + action.brand + " diakhiri.");
      break;
    }
    case "SCOUT": {
      if (!g.prospects) g.prospects = [];
      g.cash -= action.cost;
      g.prospects.unshift({ id: uid(), fighter: action.fighter, report: action.report, grade: action.grade, method: action.method, scoutedWeek: g.week });
      if (g.prospects.length > 5) {
        const dropped = g.prospects[g.prospects.length - 1];
        g.log.unshift("📋 " + dropped.fighter.name + " (prospect) di-drop — slot scouting penuh.");
      }
      g.prospects = g.prospects.slice(0, 5);
      g.log.unshift("🔍 Scout report baru (" + action.method + ", grade " + action.grade + ").");
      break;
    }
    case "ACCEPT_FIGHT": {
      const nf = g.roster.find((x) => x.id === action.fighterId);
      if (nf) {
        nf.booked = { opponent: action.opponent, weeksLeft: action.weeks, show: action.show, winBonus: action.winBonus, tier: action.tier, title: action.title, titleTier: action.titleTier, defense: action.defense, oppRank: action.oppRank, contenderId: action.contenderId };
        g.inbox = g.inbox.filter((x) => x.id !== action.messageId);
        if (g.promoterRel) g.promoterRel[action.tier] = clamp((g.promoterRel[action.tier] || 30) + 5, 0, 100);
        g.log.unshift("📝 " + nf.name + " menerima fight " + action.tier + " vs " + (action.opponent ? action.opponent.name : "?" + ". Relasi " + action.tier + " +5."));
      }
      break;
    }
    case "COUNTER_FIGHT": {
      const nf2 = g.roster.find((x) => x.id === action.fighterId);
      if (nf2) {
        nf2.booked = { opponent: action.opponent, weeksLeft: action.weeks, show: action.boosted, winBonus: action.boostedWin, tier: action.tier, title: action.title, titleTier: action.titleTier, defense: action.defense, oppRank: action.oppRank, contenderId: action.contenderId };
        g.inbox = g.inbox.filter((x) => x.id !== action.messageId);
        if (g.promoterRel) g.promoterRel[action.tier] = clamp(action.rel - 3, 0, 100);
        g.log.unshift("💬 " + nf2.name + " counter offer diterima. Relasi " + action.tier + " -3.");
      }
      break;
    }
    case "REJECT_FIGHT": {
      g.inbox = g.inbox.filter((x) => x.id !== action.messageId);
      if (g.promoterRel) g.promoterRel[action.tier] = clamp((g.promoterRel[action.tier] || 30) - 8, 0, 100);
      if (action.stripTitle) {
        const f3 = g.roster.find((x) => x.id === action.fighterId);
        if (f3) { f3.titles = f3.titles.filter((t) => !t.includes("Champion")); }
      }
      break;
    }
    case "COUNTER_POACH": {
      const f4 = g.roster.find((x) => x.id === action.fighterId);
      if (f4 && g.cash >= action.cost) {
        g.cash -= action.cost;
        f4.morale = clamp(f4.morale + 20, 0, 100);
        if (f4.contract) f4.contract.managerCut = clamp((f4.contract.managerCut || 0.18) + 0.02, 0, 0.35);
        g.log.unshift("💰 " + f4.name + " dipertahankan — bonus match. Cash -" + fmt$(action.cost) + ".");
      }
      break;
    }
    case "TALK_POACH": {
      const f5 = g.roster.find((x) => x.id === action.fighterId);
      if (f5 && g.chemistry >= 50) {
        f5.morale = clamp(f5.morale + 15, 0, 100);
        g.chemistry = clamp(g.chemistry - 5, 0, 100);
        g.log.unshift("🤝 " + f5.name + " diyakinkan bertahan. Chemistry -5.");
      }
      break;
    }
    case "INBOX_REMOVE": {
      g.inbox = g.inbox.filter((x) => x.id !== action.messageId);
      break;
    }
    case "SIGN_CONTRACT": {
      if (action.mode === "sign") {
        const prospect = g.prospects.find((x) => x.id === action.prospectId);
        if (!prospect) break;
        const f = prospect.fighter;
        g.cash -= action.deal.signBonus;
        f.joinedWeek = g.week;
        if (prospect.grade === "S") f.ambitionRevealed = true;
        f.contract = { managerCut: action.deal.cut, fightsLeft: action.deal.fights, fightsTotal: action.deal.fights, durationMo: action.deal.duration, signedWeek: g.week, renegoFlagged: false, exclusive: action.deal.exclusive, rematch: action.deal.rematch, medical: action.deal.medical, equity: action.deal.equity };
        g.roster.push(f);
        g.prospects = g.prospects.filter((x) => x.id !== action.prospectId);
        if (!f.bio) f.bio = genBio(f);
        g.log.unshift("✍️ " + f.name + " teken kontrak: cut " + Math.round(action.deal.cut * 100) + "%, " + action.deal.fights + " fight.");
      } else {
        const f = g.roster.find((x) => x.id === action.fighterId);
        if (!f) break;
        g.cash -= action.deal.signBonus;
        f.contract = { managerCut: action.deal.cut, fightsLeft: action.deal.fights, fightsTotal: action.deal.fights, durationMo: action.deal.duration, signedWeek: g.week, renegoFlagged: true, exclusive: action.deal.exclusive, rematch: action.deal.rematch, medical: action.deal.medical, equity: action.deal.equity };
        f.morale = clamp(f.morale + 8, 0, 100);
        g.log.unshift("📝 " + f.name + " perpanjang kontrak: cut " + Math.round(action.deal.cut * 100) + "%, " + action.deal.fights + " fight.");
      }
      break;
    }
    case "INBOX_EVENT": {
      const m = g.inbox.find((x) => x.id === action.messageId);
      if (!m) break;
      g.inbox = g.inbox.filter((x) => x.id !== action.messageId);
      dispatchEvent(g, action);
      break;
    }
    default:
      // Unknown action — no-op, App.jsx handles complex flows directly
      break;
  }
  return g;
}
