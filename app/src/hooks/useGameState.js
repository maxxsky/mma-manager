// Game state hook — state management, dispatch, auto-save, weekly tick
import { useState, useRef, useEffect } from "react";
import { saveGame } from "../services/saveService.js";
import { checkAchievements } from "../engine/achievements.js";
import { tick } from "../engine/state.js";
import { reducer } from "../engine/reducer.js";

export function useGameState(saveSlot) {
  const [g, setGOrig] = useState(() => ({})); // initialized by useSaveLoad
  const [activeFight, setActiveFight] = useState(null);
  const [weekFlash, setWeekFlash] = useState(0);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [nego, setNego] = useState(null);

  const saveTimer = useRef(null);

  // Cloned state setter with auto-save throttle
  const up = (fn) => setGOrig((old) => {
    const clean = Object.assign({}, old);
    delete clean._undoStack;
    delete clean._redoStack;
    const n = structuredClone(clean);
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
    up((n) => { tick(n); n.log = n.log.slice(0, 30); checkAchievements(n); });
    setWeekFlash((x) => x + 1);
    setTimeout(() => {
      setGOrig((current) => {
        const highlights = current.log.slice(0, 5);
        const injured = current.roster.filter((f) => f.injury);
        setWeeklySummary({
          week: current.week,
          cash: current.cash,
          rep: current.rep,
          rosterCount: current.roster.length,
          inboxCount: current.inbox.length,
          injuredCount: injured.length,
          injuredNames: injured.map((f) => f.name).slice(0, 3),
          highlights,
        });
        return current;
      });
    }, 50);
  };

  // Fight queue detection
  useEffect(() => {
    const dueList = g.roster?.filter((f) => f.booked && f.booked.weeksLeft <= 0 && !f.injury) || [];
    if (dueList.length > 0 && !activeFight && !g.over) setActiveFight(dueList[0].id);
  }, [g.week, activeFight, g.roster?.length]);

  return {
    g, setG, up, dispatch, advance,
    activeFight, setActiveFight,
    weekFlash, setWeekFlash,
    weeklySummary, setWeeklySummary,
    nego, setNego,
  };
}
