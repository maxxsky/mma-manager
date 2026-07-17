// Composed reducer — delegates to domain reducers while managing undo/redo and action logging.
// Pattern: dispatch({ type, payload }) → pure state transformation.
// Mutates `g` in place for performance (not a Redux-style immutable reducer).
//
// Domain reducers (engine/reducer/):
//   camp.js     — UPGRADE_FACILITY, UPGRADE_TIER, SET_SPONSOR, TERMINATE_SPONSOR
//   fighter.js  — SET_TRAINING, CLASS_CHANGE, COUNTER_POACH, TALK_POACH, DISMISS_PROSPECT
//   coach.js    — HIRE_COACH, FIRE_COACH
//   contract.js — SIGN_CONTRACT
//   fight.js    — ACCEPT_FIGHT, COUNTER_FIGHT, REJECT_FIGHT
//   ui.js       — SCOUT, INBOX_REMOVE, INBOX_EVENT

import { snapshot } from "./rng.js";
import { MAX_UNDO_STACK, MAX_ACTION_LOG } from "./reducer/constants.js";
import { reduceCamp } from "./reducer/camp.js";
import { reduceFighter } from "./reducer/fighter.js";
import { reduceCoach } from "./reducer/coach.js";
import { reduceContract } from "./reducer/contract.js";
import { reduceFight } from "./reducer/fight.js";
import { reduceUI } from "./reducer/ui.js";
import { reduceStaff } from "./reducer/staff.js";

export function reducer(g, action) {
  // Ignore undo/redo in the action log itself
  const isMetaAction = action.type === "UNDO" || action.type === "REDO";

  // Snapshot before every non-meta action (undo/redo stack)
  if (!isMetaAction && action.type !== "INIT") {
    if (!g._undoStack) g._undoStack = [];
    if (!g._redoStack) g._redoStack = [];
    g._undoStack.push({ snapshot: snapshot(g) });
    if (g._undoStack.length > MAX_UNDO_STACK) g._undoStack.shift();
    g._redoStack = []; // new action clears redo
  }

  // Log every action for multiplayer replay (skip meta + init)
  if (!isMetaAction) {
    if (!g.actionLog) g.actionLog = [];
    g.actionLog.push({ ...action, week: g.week, ts: Date.now() });
    if (g.actionLog.length > MAX_ACTION_LOG) g.actionLog = g.actionLog.slice(-MAX_ACTION_LOG);
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

  // ── Domain reducers ──
  reduceCamp(g, action);
  reduceFighter(g, action);
  reduceCoach(g, action);
  reduceContract(g, action);
  reduceFight(g, action);
  reduceUI(g, action);
  reduceStaff(g, action);

  return g;
}
