// ============================================================
//   SAVE SERVICE — localStorage persistence for game state
//   App.jsx should only call this, never access localStorage directly.
// ============================================================

const SAVE_PREFIX = "mma-manager-save-v4";

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
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveGame(slot, state) {
  try {
    localStorage.setItem(saveKey(slot), JSON.stringify(state));
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
