import React from "react";
import { T, Icon, ICONS } from "./theme.jsx";

const Chip = ({ label, val, color }) => (
  <div style={{ textAlign: "right" }}>
    <div style={{ fontFamily: T.body, fontSize: 9, fontWeight: 600, letterSpacing: 1.2,
      textTransform: "uppercase", color: T.txt3 }}>{label}</div>
    <div style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color, lineHeight: 1.1 }}>{val}</div>
  </div>
);

export default function TopBar({ title, crumb, cash, rep, chem, legacy, week,
  saveSlot, onSaveSlotChange, slotInfo, lang, onLangChange, onNewGame, extraRight }) {
  const year = Math.floor((week || 1) / 48) + 1;
  const month = Math.floor(((week || 1) % 48) / 4) + 1;
  const wk = ((week || 1) % 4) + 1;
  const cashVal = cash != null && !isNaN(cash) ? `$${(cash / 1000).toFixed(1)}K` : "—";
  const legacyVal = legacy != null ? `★${(legacy / 1000).toFixed(1)}K` : "—";

  return (
    <header aria-label="Main header" style={{ height: 60, display: "flex", alignItems: "center",
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
        {/* Date — Year · Month · Week */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.txt3 }}>
          <Icon d={ICONS.cal} size={15} />
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.txt2 }}>
            Y{year} · M{month} · W{wk}
          </span>
        </div>
        <div style={{ width: 1, height: 26, background: T.line }} />
        <Chip label="Bank" val={cashVal} color={T.txt} />
        <Chip label="Rep" val={rep != null ? rep : "—"} color={T.gold} />
        <Chip label="Chem" val={chem != null ? chem : "—"} color={chem >= 60 ? T.pos : T.warn} />
        <Chip label="Legacy" val={legacyVal} color={T.steel} />
        {/* Utility row — save slot, lang, extras (kept compact) */}
        {(onSaveSlotChange || onLangChange || extraRight) && (
          <>
            <div style={{ width: 1, height: 26, background: T.line }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {onSaveSlotChange && (
                <select value={saveSlot} onChange={(e) => onSaveSlotChange(parseInt(e.target.value))}
                  aria-label="Select save slot"
                  style={{ fontFamily: T.mono, fontSize: 10, background: T.raised, color: T.txt3,
                    border: `1px solid ${T.line}`, borderRadius: T.r, padding: "3px 6px", cursor: "pointer" }}>
                  {[1, 2, 3].map((s) => (
                    <option key={s} value={s}>
                      S{s}{slotInfo && slotInfo[s - 1] ? ` W${slotInfo[s - 1].week}` : ""}
                    </option>
                  ))}
                </select>
              )}
              {onLangChange && (
                <button onClick={onLangChange} aria-label="Toggle language"
                  style={{ fontFamily: T.mono, fontSize: 10, background: "transparent",
                    border: `1px solid ${T.line}`, borderRadius: T.r, color: T.txt3,
                    padding: "3px 6px", cursor: "pointer" }}>
                  {lang.toUpperCase()}
                </button>
              )}
            {onNewGame && (
                <button onClick={onNewGame} aria-label="New game"
                  style={{ fontFamily: T.mono, fontSize: 10, background: "transparent",
                    border: `1px solid ${T.neg}44`, borderRadius: T.r, color: T.neg,
                    padding: "3px 6px", cursor: "pointer" }}>
                  +New
                </button>
              )}
              {extraRight}
            </div>
          </>
        )}
      </div>
    </header>
  );
}
