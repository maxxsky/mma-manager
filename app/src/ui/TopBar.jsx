import React, { useRef, useEffect, useState } from "react";
import { T, Icon, ICONS } from "./theme.jsx";

/** Determine flash direction from raw numeric comparison */
export function flashDirection(prev, current) {
  if (prev === current) return null;
  return current > prev ? "up" : "down";
}

const Chip = ({ label, val, color, flashOnChange, rawValue }) => {
  const prevRef = useRef(rawValue);
  const [flash, setFlash] = useState(null);

  useEffect(() => {
    if (!flashOnChange) { prevRef.current = rawValue; return; }
    if (prevRef.current !== rawValue) {
      setFlash(flashDirection(prevRef.current, rawValue));
      const t = setTimeout(() => setFlash(null), 600);
      prevRef.current = rawValue;
      return () => clearTimeout(t);
    }
    prevRef.current = rawValue;
  }, [rawValue, flashOnChange]);

  const flashColor = flash === "up" ? "#2ecc71" : flash === "down" ? "#e74c3c" : null;

  return (
    <div style={{ textAlign: "right" }}>
      <div style={{ fontFamily: T.body, fontSize: 9, fontWeight: 600, letterSpacing: 1.2,
        textTransform: "uppercase", color: T.txt3 }}>{label}</div>
      <div key={flash ? `${rawValue}-${flash}` : rawValue}
        style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: flashColor || color,
          lineHeight: 1.1, transition: "color .4s, text-shadow .4s",
          textShadow: flashColor ? `0 0 10px ${flashColor}66` : "none",
          animation: flash ? "cashFlash .6s ease" : "none" }}>
        {val}
      </div>
      {flash && <style>{flash === "up"
        ? `@keyframes cashFlash{0%{background:rgba(46,204,113,.15)}100%{background:transparent}}`
        : `@keyframes cashFlash{0%{background:rgba(231,76,60,.15)}100%{background:transparent}}`
      }</style>}
    </div>
  );
};

export default function TopBar({ title, crumb, cash, rep, chem, legacy, week,
  saveSlot, onSaveSlotChange, slotInfo, lang, onLangChange, onNewGame, version, extraRight, dispatch, onToggleMenu }) {
  const year = Math.floor((week || 1) / 48) + 1;
  const month = Math.floor(((week || 1) % 48) / 4) + 1;
  const wk = ((week || 1) % 4) + 1;
  const cashVal = cash != null && !isNaN(cash) ? `$${(cash / 1000).toFixed(1)}K` : "—";
  const legacyVal = legacy != null ? `★${(legacy / 1000).toFixed(1)}K` : "—";
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <header aria-label="Main header" style={{ height: 60, display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "0 24px",
      borderBottom: `1px solid ${T.line}`, background: `${T.bg}cc`,
      backdropFilter: "blur(6px)", position: "sticky", top: 0, zIndex: 5,
      flexShrink: 0 }}>
      {/* Hamburger — mobile only */}
      {onToggleMenu && (
        <button onClick={onToggleMenu} aria-label="Open menu"
          className="mobile-hamburger"
          style={{ display: "none", background: "none", border: "none", color: T.txt3, cursor: "pointer", padding: "4px 8px 4px 0", fontSize: 22, lineHeight: 1 }}>
          ☰
        </button>
      )}
      <div>
        <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 22,
          letterSpacing: .5, textTransform: "uppercase", color: T.txt,
          lineHeight: 1 }}>{title || "Dashboard"}</div>
        {crumb && <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3 }}>{crumb}</div>}
        {version && <div style={{ fontFamily: T.mono, fontSize: 9, color: T.txt3, marginTop: 2, letterSpacing: 1 }}>{version}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        {/* Date — Year · Month · Week */}
        {!isMobile && <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.txt3 }}>
          <Icon d={ICONS.cal} size={15} />
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.txt2 }}>
            Y{year} · M{month} · W{wk}
          </span>
        </div>}
        {!isMobile && <div style={{ width: 1, height: 26, background: T.line }} />}
        <Chip label="Bank" val={cashVal} color={T.txt} flashOnChange={true} rawValue={cash} />
        <Chip label="Rep" val={rep != null ? rep : "—"} color={T.gold} />
        {!isMobile && <Chip label="Chem" val={chem != null ? chem : "—"} color={chem >= 60 ? T.pos : T.warn} />}
        {!isMobile && <Chip label="Legacy" val={legacyVal} color={T.steel} />}
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
                      S{s}{slotInfo && slotInfo[s - 1]?.week != null ? ` W${slotInfo[s - 1].week}` : ""}
                    </option>
                  ))}
                </select>
              )}
              {!isMobile && onLangChange && (
                <button onClick={onLangChange} aria-label="Toggle language"
                  style={{ fontFamily: T.mono, fontSize: 10, background: "transparent",
                    border: `1px solid ${T.line}`, borderRadius: T.r, color: T.txt3,
                    padding: "3px 6px", cursor: "pointer" }}>
                  {lang.toUpperCase()}
                </button>
              )}
              {!isMobile && dispatch && (
                <button onClick={() => dispatch({ type: "UNDO" })} aria-label="Undo"
                  style={{ fontFamily: T.mono, fontSize: 10, background: "transparent",
                    border: `1px solid ${T.line}`, borderRadius: T.r, color: T.txt3,
                    padding: "3px 8px", cursor: "pointer" }}>
                  ↩ Undo
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
