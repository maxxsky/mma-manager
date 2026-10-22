// ============================================================
//   SAVE SERVICE — localStorage persistence for game state
//   App.jsx should only call this, never access localStorage directly.
// ============================================================

import { getWorldRNGState, restoreWorldRNGState, resetRNG } from "@ironfist/engine/rng.js";

const SAVE_PREFIX = "mma-manager-save-v4";

// Legacy saves have no RNG checkpoint. Hash their contents so reloading the
// same old save gives the same migration rolls, rather than a clock seed.
function legacyRNGState(raw, state) {
  let seed = 2166136261;
  for (let i = 0; i < raw.length; i++) seed = Math.imul(seed ^ raw.charCodeAt(i), 16777619);
  let maxId = 0;
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    if (Number.isSafeInteger(value.id) && value.id > maxId) maxId = value.id;
    Object.values(value).forEach(walk);
  }
  walk(state);
  return { state: seed >>> 0, nextUID: maxId + 1 };
}

function saveKey(slot) {
  return `${SAVE_PREFIX}-slot${slot}`;
}

// --- Slot management ---

export function getActiveSlot() {
  try {
    return parseInt(localStorage.getItem(`${SAVE_PREFIX}-active`)) || 1;
  } catch {
    return 1;
  }
}

export function setActiveSlot(slot) {
  try {
    localStorage.setItem(`${SAVE_PREFIX}-active`, String(slot));
  } catch { /* ignore */ }
}

// --- Save / Load ---

export function loadGame(slot) {
  try {
    const raw = localStorage.getItem(saveKey(slot));
    if (!raw) return null;
    const state = JSON.parse(raw);
    if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
    if (!restoreWorldRNGState(state.worldRngState)) {
      state.worldRngState = legacyRNGState(raw, state);
      restoreWorldRNGState(state.worldRngState);
    }
    resetRNG();
    return state;
  } catch {
    return null;
  }
}

export function saveGame(slot, state, worldRngState = getWorldRNGState()) {
  try {
    // Hook updates capture this before the autosave delay. Do not replace an
    // older queued state's checkpoint with a later point in the global RNG.
    const saved = { ...state, worldRngState };
    localStorage.setItem(saveKey(slot), JSON.stringify(saved));
    return true;
  } catch (e) {
    console.error("Save failed:", e);
    return false;
  }
}

export function deleteGame(slot) {
  try {
    localStorage.removeItem(saveKey(slot));
  } catch { /* ignore */ }
}

// --- Slot info (for save slot selector) ---

export function getSlotInfo() {
  const info = [];
  for (let i = 1; i <= 3; i++) {
    try {
      const raw = localStorage.getItem(saveKey(i));
      if (raw) {
        const s = JSON.parse(raw);
        info.push({
          slot: i,
          exists: true,
          week: s.week || "?",
          cash: s.cash,
          rep: s.rep,
          roster: s.roster?.length || 0,
        });
      } else {
        info.push({ slot: i, exists: false });
      }
    } catch {
      info.push({ slot: i, exists: false });
    }
  }
  return info;
}
