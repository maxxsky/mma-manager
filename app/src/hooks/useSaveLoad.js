// Save/load hook — game persistence, slot management, migration
import { useState, useEffect } from "react";
import { getActiveSlot, setActiveSlot, loadGame, deleteGame, getSlotInfo } from "../services/saveService.js";
import { backupSave } from "../engine/polish.js";
import { genDivisions, initPromoterRel } from "../engine/rankings.js";
import { genRivalCamp } from "../engine/rivals.js";
import { clamp, RI, pick } from "../engine/rng.js";
import { ATTRS, AMBITION_KEYS, PROMOTIONS } from "../engine/data.js";
import { agentFor } from "../engine/fighter.js";
import { setUID } from "../engine/rng.js";
import { getPromotionsData } from "../engine/data/promotions.js";

export function useSaveLoad(setG) {
  const [loaded, setLoaded] = useState(false);
  const [saveSlot, setSaveSlotState] = useState(getActiveSlot());
  const [slotInfo, setSlotInfo] = useState([]);

  const refreshSlotInfo = () => setSlotInfo(getSlotInfo());

  const setSaveSlot = (s) => {
    setSaveSlotState(s);
    setActiveSlot(s);
    setTimeout(refreshSlotInfo, 100);
  };

  useEffect(() => {
    (async () => {
      try {
        const s = loadGame(saveSlot);
        if (s) {
          // Migration / repair
          if (s.week == null || !s.roster || s.cash == null || isNaN(s.cash)) {
            s.week = 1; s.cash = 100000; s.roster = []; s.log = ["Save rusak — dimulai ulang."];
          }
          if (!s.divisions) s.divisions = genDivisions();
          if (!s.rivals) s.rivals = [genRivalCamp(0), genRivalCamp(1), genRivalCamp(2)];
          if (!s.promoterRel) s.promoterRel = initPromoterRel();
          if (!s.promotions) s.promotions = getPromotionsData();
          if (s.campTier == null) s.campTier = 0;
          if (!s.relationships) s.relationships = {};
          if (s.rep == null || isNaN(s.rep) || s.rep <= 0) s.rep = 8;
          if (!s.sponsors) {
            s.sponsors = s.sponsor ? [{ brand: s.sponsor.brand, terms: "placement", rate: s.sponsor.rate, weeksLeft: null }] : [];
          }
          delete s.sponsor;
          s.roster.forEach((f) => {
            if (!f.ambition) f.ambition = pick(AMBITION_KEYS);
            if (!f.agent) f.agent = agentFor(f);
            if (!f.contract) f.contract = { managerCut: 0.18, fightsLeft: 4, fightsTotal: 4, durationMo: 24, signedWeek: f.joinedWeek || 0, renegoFlagged: false };
            if (!f.training) f.training = { type: "conditioning", intensity: "Medium" };
            if (!f.ceilings) {
              f.ceilings = {};
              ATTRS.forEach((k) => (f.ceilings[k] = clamp(f.attrs[k] + RI(8, 30), f.attrs[k], 99)));
            }
            f.injuryCount = f.injuryCount || 0;
            f.seriousInjuries = f.seriousInjuries || 0;
            if (!f.fightHistory) f.fightHistory = [];
            if (!f.trainingHistory) f.trainingHistory = [];
            if (!f.careerHistory) f.careerHistory = [];
            if (!f.rivalries) f.rivalries = {};
            f.giantKills = f.giantKills || 0;
            f.titleDefenses = f.titleDefenses || 0;
            f.loyalty = f.loyalty ?? 50;
            f.firstFightWeek = f.firstFightWeek || null;
            f.reignHistory = f.reignHistory || [];
            if (f.booked && f.booked.seed == null) f.booked.seed = (Math.random() * 2**31) | 0;
          });
          // Division champ field defaults
          Object.values(s.divisions || {}).forEach((d) => {
            if (d.champ) {
              d.champ.titleDefenses = d.champ.titleDefenses || 0;
              d.champ.wonWeek = d.champ.wonWeek || s.week;
              d.champ.lastDefenseWeek = d.champ.lastDefenseWeek || d.champ.wonWeek;
            }
          });
          setG(s);

          // Rehydrate UID: scan seluruh state untuk id numerik, set UID ke max + 1
          ;(function rehydrateUID(obj) {
            let maxId = 0;
            function walk(v) {
              if (v == null || typeof v !== 'object') return;
              if (Array.isArray(v)) { v.forEach(walk); return; }
              // Check this object for a numeric id
              if (typeof v.id === 'number' && v.id > maxId) maxId = v.id;
              Object.values(v).forEach(walk);
            }
            walk(obj);
            if (maxId > 0) setUID(maxId + 1);
          })(s);
        }
      } catch (e) { /* belum ada save */ }
      setLoaded(true);
      backupSave(saveSlot);
      refreshSlotInfo();
    })();
  }, []);

  const newGame = (ng) => {
    setG(ng);
    deleteGame(saveSlot);
  };

  return { loaded, saveSlot, setSaveSlot, slotInfo, newGame, refreshSlotInfo };
}
