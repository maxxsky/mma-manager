import React from "react";
import { T, Icon, ICONS } from "./theme.jsx";

const chip = (label, val, color) => (
  <div style={{ textAlign: "right" }}>
    <div style={{ fontFamily: T.body, fontSize: 9, fontWeight: 600, letterSpacing: 1.2,
      textTransform: "uppercase", color: T.txt3 }}>{label}</div>
    <div style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color, lineHeight: 1.1 }}>{val}</div>
  </div>
);

export default function TopBar({ title, crumb, cash, rep, chem, legacy, week,
  saveSlot, onSaveSlotChange, slotInfo, lang, onLangChange,
  extraRight }) {
  return (
    <header style={{ height: 60, display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "0 24px",
      borderBottom: `1px solid ${T.line}`, background: `${T.bg}cc`,
      backdropFilter: "blur(6px)", position: "sticky", top: 0, zIndex: 5,
      flexShrink: 0 }}>
      <div>
        <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 22,
          letterSpacing: .5, textTransform: "uppercase", color: T.txt,
          lineHeight: 1 }}>{title || "Dashboard"}</div>
        {crumb && <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3 }}>{crumb}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        {/* Save slots */}
        {onSaveSlotChange && (
          <select value={saveSlot} onChange={(e) => onSaveSlotChange(parseInt(e.target.value))}
            style={{ fontFamily: T.mono, fontSize: 11, background: T.raised, color: T.txt2,
              border: `1px solid ${T.line}`, borderRadius: T.r, padding: "4px 8px", cursor: "pointer" }}>
            {[1, 2, 3].map((s) => (
              <option key={s} value={s}>
                Slot {s}{slotInfo && slotInfo[s - 1] ? ` · W${slotInfo[s - 1].week}` : ""}
              </option>
            ))}
          </select>
        )}
        {/* Language toggle */}
        {onLangChange && (
          <button onClick={onLangChange} style={{ fontFamily: T.mono, fontSize: 11,
            background: "transparent", border: `1px solid ${T.line}`, borderRadius: T.r,
            color: T.txt2, padding: "4px 8px", cursor: "pointer" }}>{lang.toUpperCase()}</button>
        )}
        {/* Date */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.txt3 }}>
          <Icon d={ICONS.cal} size={15} />
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.txt2 }}>
            W{week || 1}
          </span>
        </div>
        <div style={{ width: 1, height: 26, background: T.line }} />
        {chip("Bank", cash != null ? cash : "-", T.txt)}
        {chip("Rep", rep != null ? rep : "-", T.gold)}
        {chip("Chem", chem != null ? chem : "-", chem >= 60 ? T.pos : T.warn)}
        {chip("Legacy", legacy != null ? `★${(legacy / 1000).toFixed(1)}K` : "-", T.steel)}
        {extraRight}
      </div>
    </header>
  );
}
