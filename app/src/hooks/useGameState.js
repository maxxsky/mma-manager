// Game state hook — state management, dispatch, auto-save, weekly tick
import { useState, useRef, useEffect } from "react";
import { saveGame } from "../services/saveService.js";
import { checkAchievements } from "../engine/achievements.js";
import { ACHIEVEMENTS } from "../engine/data.js";
import { tick } from "../engine/state.js";
import { reducer } from "../engine/reducer.js";

export function useGameState(g, setGOrig, saveSlot) {
  const [activeFight, setActiveFight] = useState(null);
  const [weekFlash, setWeekFlash] = useState(0);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [nego, setNego] = useState(null);

  const saveTimer = useRef(null);

  // Cloned state setter with auto-save throttle
  const up = (fn) => setGOrig((old) => {
    if (!old.roster) console.error('UP OLD CORRUPTED', Object.keys(old));
    const clean = Object.assign({}, old);
    delete clean._undoStack;
    delete clean._redoStack;
    const n = JSON.parse(JSON.stringify(clean));
    fn(n);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveGame(saveSlot, n);
    }, 1000);
    return n;
  });

  const setG = (newG) => setGOrig(newG);

  // Dispatch wrapper — intercepts SIGN_CONTRACT_PRE for nego modal
  const dispatch = (action) => {
    if (action.type === "SIGN_CONTRACT_PRE") {
      setNego({ fighter: action.fighter, mode: action.mode || "sign", prospectId: action.prospectId, fighterId: action.fighterId });
      return;
    }
    up((n) => { reducer(n, action); });
  };

  // Weekly advance
  const advance = () => {
    up((n) => { tick(n); if (n.log) n.log = n.log.slice(0, 30);
      const newly = checkAchievements(n);
      // Surface achievement unlocks in weekly summary
      const achieveNames = newly && newly.length > 0
        ? newly.map(id => (ACHIEVEMENTS[id]?.name || id)).filter(Boolean)
        : [];
      // Build weekly summary directly from n (already the updated state)
      const highlights = n.log ? n.log.slice(0, 5) : [];
      const injured = n.roster ? n.roster.filter((f) => f.injury) : [];
      setWeeklySummary({
        week: n.week, cash: n.cash, rep: n.rep,
        rosterCount: n.roster ? n.roster.length : 0,
        inboxCount: n.inbox ? n.inbox.length : 0,
        injuredCount: injured.length,
        injuredNames: injured.map((f) => f.name).slice(0, 3),
        highlights,
        achievements: achieveNames,
      });
    });
    setWeekFlash((x) => x + 1);
    setTimeout(() => setWeekFlash(0), 1200);
  };

  // Fight queue detection
  useEffect(() => {
    const dueList = g.roster?.filter((f) => f.booked && f.booked.weeksLeft <= 0 && !f.injury) || [];
    if (dueList.length > 0 && !activeFight && !g.over) setActiveFight(dueList[0].id);
  }, [g.week, activeFight, g.roster?.length]);

  return {
    up, dispatch, advance,
    activeFight, setActiveFight,
    weekFlash, setWeekFlash,
    weeklySummary, setWeeklySummary,
    nego, setNego,
  };
}
