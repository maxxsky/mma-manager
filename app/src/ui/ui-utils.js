// ============================================================
//   UI UTILITIES — Memory, focus, shortcuts, loading
//   No visual redesign. Workflow optimization only.
// ============================================================

// ── UI MEMORY ──

const MEMORY_KEY = "mma-ui-state";

function loadMemory() {
  try { return JSON.parse(localStorage.getItem(MEMORY_KEY) || "{}"); }
  catch { return {}; }
}

function saveMemory(state) {
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify({ ...loadMemory(), ...state })); }
  catch { /* ignore */ }
}

export function rememberTab(tab) {
  saveMemory({ lastTab: tab });
}

export function getLastTab() {
  return loadMemory().lastTab || "dashboard";
}

export function rememberDivision(division) {
  saveMemory({ lastDivision: division });
}

export function getLastDivision() {
  return loadMemory().lastDivision || null;
}

export function rememberScoutFilter(arch, wc) {
  saveMemory({ scoutArch: arch, scoutWC: wc });
}

export function getLastScoutFilters() {
  const m = loadMemory();
  return { arch: m.scoutArch || null, wc: m.scoutWC || null };
}

export function rememberCollapsed(sectionId, collapsed) {
  const m = loadMemory();
  if (!m.collapsed) m.collapsed = {};
  m.collapsed[sectionId] = collapsed;
  saveMemory({ collapsed: m.collapsed });
}

export function isCollapsed(sectionId) {
  return loadMemory().collapsed?.[sectionId] || false;
}

// ── KEYBOARD SHORTCUTS ──

export function getShortcutHints() {
  return [
    { key: "Space", action: "Advance Week" },
    { key: "Ctrl+Z", action: "Undo" },
    { key: "Ctrl+Y", action: "Redo" },
    { key: "1-8", action: "Switch tabs" },
    { key: "Esc", action: "Close modals" },
  ];
}

// ── FOCUS MANAGEMENT ──

export const FOCUS_STYLES = `
  :focus-visible {
    outline: 2px solid #3ea6ff;
    outline-offset: 2px;
    border-radius: 2px;
  }
  button:focus-visible, a:focus-visible, [tabindex]:focus-visible {
    outline: 2px solid #ffd15c;
    outline-offset: 1px;
  }
  input:focus-visible, select:focus-visible, textarea:focus-visible {
    outline: 2px solid #3ea6ff;
    outline-offset: 0;
  }
`;

// ── LOADING STATES ──

export function getLoadingHTML() {
  return `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0e1116;color:#eef2f7;font-family:'Barlow',sans-serif">
      <div style="text-align:center">
        <div style="font-family:'Barlow Condensed',sans-serif;font-size:48px;font-weight:700;letter-spacing:4px;color:#f5623c;margin-bottom:16px">IRONFIST</div>
        <div style="font-size:14px;color:#64717f;letter-spacing:2px;text-transform:uppercase">MMA Manager</div>
        <div style="margin-top:24px;width:200px;height:3px;background:#1e2530;border-radius:2px;overflow:hidden;margin:24px auto 0">
          <div style="width:30%;height:100%;background:#f5623c;border-radius:2px;animation:loading 1.5s ease infinite"></div>
        </div>
      </div>
      <style>
        @keyframes loading { 0%{width:10%;margin-left:0} 50%{width:40%;margin-left:30%} 100%{width:10%;margin-left:90%} }
        @import url('https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Barlow+Condensed:wght@500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
      </style>
    </div>
  `;
}

// ── EMPTY STATE HELPERS ──

export function getEmptyState(icon, title, description, action) {
  return { icon, title, description, action };
}

// ── CONFIRMATION ──

export function needsConfirm(action) {
  const destructive = ["release", "fire_coach", "reject_title", "delete_save", "reset_game"];
  return destructive.includes(action);
}
