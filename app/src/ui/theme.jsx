import React from "react";
import { clamp } from "@ironfist/engine/rng.js";
import { REGION_COLOR } from "@ironfist/engine/data/archetypes.js";

/* =============================================================================
   IRONFIST DESIGN SYSTEM — theme.jsx
   Ported from ironfist-redesign.jsx prototype.
   Replaces pre-Ironfist theme (Impact, cut, skew, Card/H/Bar primitives).
============================================================================= */

/* ---- DESIGN TOKENS --------------------------------------------------------- */
export const T = {
  bg: "#0e1116", surface: "#161b23", raised: "#1e2530", raisedHi: "#252d3a",
  line: "#2a323f", line2: "#384556",
  txt: "#eef2f7", txt2: "#9aa7b8", txt3: "#8996a5",
  ember: "#f5623c", steel: "#3ea6ff", gold: "#ffd15c",
  pos: "#35c98a", warn: "#f5b942", neg: "#ef4d5a",
  disp: "'Barlow Condensed','Arial Narrow',sans-serif",
  body: "'Barlow','Segoe UI',system-ui,sans-serif",
  mono: "'JetBrains Mono',ui-monospace,'SF Mono',monospace",
  r: 6, r2: 10,
};

// ---- Archetype colors ----
export const ARCH_COLOR = {
  Boxer: "#ef5b52",
  "Muay Thai": "#f0932b",
  Wrestler: "#4a9fe0",
  "BJJ Specialist": "#a678f0",
  "All-Rounder": "#4fc07a",
};

// Heat scale — scannable across the roster (FM-style)
export function heat(v) {
  if (v >= 90) return T.gold;
  if (v >= 78) return T.pos;
  if (v >= 62) return "#8fd06a";
  if (v >= 45) return T.warn;
  return T.neg;
}

/* ---- GLOBAL CSS ------------------------------------------------------------ */
export const GlobalStyle = () => (
  <style>{`
* { box-sizing: border-box; }
body { margin: 0; background: ${T.bg}; color: ${T.txt}; font-family: ${T.body}; }
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: ${T.line2}; border-radius: 4px; }
.nav-item { transition: background .12s, color .12s; cursor: pointer; }
.nav-item:hover { background: ${T.raised}; color: ${T.txt}; }
.row { transition: background .1s; cursor: pointer; }
.row:hover { background: ${T.raised}; }
.btn { transition: filter .12s, transform .05s; cursor: pointer; }
.btn:hover { filter: brightness(1.08); }
.btn:active { transform: translateY(1px); }
.chip { transition: background .12s; }
.tabx:hover { color: ${T.txt}; }
:focus-visible { outline: 2px solid ${T.steel}; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`}</style>
);

/* ---- SVG ICON SET ---------------------------------------------------------- */
const Icon = ({ d, size = 18, stroke = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);
const ICONS = {
  dash: <><path d="M3 12l9-8 9 8" /><path d="M5 10v10h14V10" /></>,
  roster: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20a5.5 5.5 0 0 1 11 0" /><path d="M16 6.5a3 3 0 0 1 0 5.8" /><path d="M18 20a5 5 0 0 0-3-4.6" /></>,
  rank: <><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M9 15h6l1 5H8z" /><path d="M4 5h3M17 5h3" /></>,
  scout: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4" /></>,
  inbox: <><path d="M3 13l3-8h12l3 8" /><path d="M3 13v6h18v-6" /><path d="M3 13h5l1.5 3h5L15 13h5" /></>,
  money: <><rect x="3" y="6" width="18" height="12" rx="1.5" /><circle cx="12" cy="12" r="2.6" /></>,
  facility: <><path d="M4 21V9l8-5 8 5v12" /><path d="M9 21v-6h6v6" /></>,
  rivals: <><path d="M14.5 4.5l5 5-9 9-5-5z" /><path d="M4 20l3-3M17 4l3 3-2 2" /></>,
  bolt: <><path d="M13 2 4 14h6l-1 8 9-12h-6z" /></>,
  cal: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>,
  chevR: <><path d="M9 6l6 6-6 6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.7l-.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.7-.3 1.7 1.7 0 0 0-1 2.2v.1a2 2 0 0 1-4 0v-.1A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.7.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15h-.1a2 2 0 0 1 0-4h.1A1.7 1.7 0 0 0 5 9.4a1.7 1.7 0 0 0-.3-1.7l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6h.1a2 2 0 0 1 4 0h.1a1.7 1.7 0 0 0 1.7-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.7v.1a2 2 0 0 1 4 0v.1Z" /></>,
  trophy: <><path d="M12 2l3 6h6l-5 4 2 6-6-4-6 4 2-6-5-4h6z"/></>,
  crown: <><path d="M2 6l4 10h12l4-10-4 4-4-8-4 8-4-4z"/><path d="M4 18h16v2H4z"/></>,
  promoter: <><path d="M3 11v3a1 1 0 0 0 1 1h3l5 4V6l-5 4H4a1 1 0 0 0-1 1z"/><path d="M17 8a4 4 0 0 1 0 8"/><path d="M19 5a8 8 0 0 1 0 14"/></>,
};

/* ---- PRIMITIVES ------------------------------------------------------------ */
export const Panel = ({ children, style, pad = 16 }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: T.r2,
    boxShadow: "0 1px 0 rgba(255,255,255,.02) inset", padding: pad, ...style }}>{children}</div>
);

export const Eyebrow = ({ children, color = T.txt3 }) => (
  <div style={{ fontFamily: T.body, fontSize: 11, fontWeight: 600, letterSpacing: 1.4,
    textTransform: "uppercase", color, marginBottom: 12 }}>{children}</div>
);

export const Tag = ({ children, color = T.txt2, solid, title, style }) => (
  <span title={title} style={{ display: "inline-flex", alignItems: "center", fontFamily: T.body, fontSize: 11,
    fontWeight: 600, letterSpacing: .5, padding: "2px 8px", borderRadius: 4, marginRight: 6,
    color: solid ? T.bg : color, background: solid ? color : `${color}1f`,
    border: `1px solid ${color}${solid ? "" : "44"}`, ...style }}>{children}</span>
);

export const Btn = ({ children, color = T.ember, onClick, ghost, sm, style, disabled, wide }) => (
  <button className="btn" onClick={onClick} disabled={disabled} style={{
    fontFamily: T.disp, fontWeight: 600, fontSize: sm ? 13 : 15, letterSpacing: .8,
    textTransform: "uppercase", padding: sm ? "6px 14px" : "9px 18px", borderRadius: T.r,
    border: `1px solid ${color}${ghost ? "66" : ""}`, color: ghost ? color : T.bg,
    background: disabled ? T.raised : ghost ? "transparent" : color,
    cursor: disabled ? "default" : "pointer", width: wide ? "100%" : undefined,
    opacity: disabled ? 0.5 : 1, ...style }}>{children}</button>
);

// initials monogram — per-fighter identity, archetype-colored, no image asset
export const Mono = ({ name, color, size = 44, champ, region, titleTier }) => {
  const init = name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const rc = region ? REGION_COLOR[region] : null;
  // Crown color by title tier (Feature 4)
  const crownColor = titleTier === "Premier" ? T.gold
    : titleTier === "Major" ? "#f0b840"
    : titleTier === "National" ? "#d4a030"
    : titleTier === "Regional" ? "#b88728"
    : titleTier === "Local" ? "#8a6f2e"
    : champ ? T.gold : null;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0, borderRadius: 8,
      background: `linear-gradient(150deg, ${color}, ${color}88)`, display: "flex",
      alignItems: "center", justifyContent: "center", border: `1px solid ${color}`,
      boxShadow: `0 2px 10px ${color}33` }}>
      <span style={{ fontFamily: T.disp, fontWeight: 700, fontSize: size * 0.42, color: "#0b0e13",
        letterSpacing: .5 }}>{init}</span>
      {rc && <div style={{ position: "absolute", bottom: -2, right: -2, width: 8, height: 8,
        borderRadius: "50%", background: rc, border: `2px solid ${T.surface}`,
        boxShadow: `0 0 4px ${rc}88` }} />}
      {crownColor && <div style={{ position: "absolute", top: -6, right: -6, fontSize: 13 }}>
        <span style={{ color: crownColor, filter: titleTier ? `drop-shadow(0 0 4px ${crownColor}88)` : "none" }}>♛</span></div>}
    </div>
  );
};

// OVR badge — synced with fighter avgSkill
export const OVR = ({ f, size = 40 }) => {
  const avg = f.attrs ? Math.round(Object.values(f.attrs).reduce((s, v) => s + v, 0) / Object.keys(f.attrs).length) : 0;
  return <Ovr v={avg} size={size} />;
};
export const Ovr = ({ v, size = 40 }) => (
  <div style={{ width: size, height: size, borderRadius: 8, flexShrink: 0,
    background: T.raised, border: `1px solid ${heat(v)}66`, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center" }}>
    <div style={{ fontFamily: T.mono, fontWeight: 700, fontSize: size * 0.4, color: heat(v), lineHeight: 1 }}>{v}</div>
    <div style={{ fontFamily: T.body, fontSize: 7, fontWeight: 700, letterSpacing: 1.5, color: T.txt3 }}>OVR</div>
  </div>
);

// SIGNATURE 1 — telemetry attribute readout: mono value + baseline + ceiling tick
export const AttrTele = ({ label, v, ceil }) => (
  <div style={{ marginBottom: 9 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
      <span style={{ fontFamily: T.body, fontSize: 11, fontWeight: 600, letterSpacing: .8,
        textTransform: "uppercase", color: T.txt2 }}>{label}</span>
      <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: heat(v) }}>
        {v}<span style={{ color: T.txt3, fontWeight: 400, fontSize: 11 }}>/{ceil}</span>
      </span>
    </div>
    <div style={{ position: "relative", height: 5, background: T.bg, borderRadius: 3 }}>
      <div style={{ position: "absolute", inset: 0, width: `${v}%`, background: heat(v), borderRadius: 3 }} />
      <div style={{ position: "absolute", top: -2, height: 9, width: 2, left: `${ceil}%`,
        background: T.txt3, borderRadius: 1 }} />
    </div>
  </div>
);

// SIGNATURE 2 — center-meeting compare bar for tale of the tape
export const CompareBar = ({ label, a, b, ca, cb }) => {
  const lead = a === b ? null : a > b ? "a" : "b";
  return (
    <div style={{ display: "grid", gridTemplateColumns: "48px 1fr 90px 1fr 48px",
      alignItems: "center", gap: 8, padding: "5px 0" }}>
      <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, textAlign: "right",
        color: lead === "a" ? ca : T.txt2 }}>{a}</span>
      <div style={{ height: 6, background: T.bg, borderRadius: 3, position: "relative" }}>
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${a}%`,
          background: `linear-gradient(90deg, ${ca}55, ${ca})`, borderRadius: 3 }} />
      </div>
      <span style={{ fontFamily: T.body, fontSize: 10, fontWeight: 600, letterSpacing: 1,
        textTransform: "uppercase", color: T.txt3, textAlign: "center" }}>{label}</span>
      <div style={{ height: 6, background: T.bg, borderRadius: 3, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${b}%`,
          background: `linear-gradient(90deg, ${cb}, ${cb}55)`, borderRadius: 3 }} />
      </div>
      <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700,
        color: lead === "b" ? cb : T.txt2 }}>{b}</span>
    </div>
  );
};

// meter (condition / morale / etc rows)
export const Meter = ({ label, v, color }) => (
  <div style={{ marginBottom: 8 }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
      <span style={{ fontFamily: T.body, fontSize: 10, fontWeight: 600, letterSpacing: 1,
        textTransform: "uppercase", color: T.txt3 }}>{label}</span>
      <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color }}>{isNaN(v) ? "?" : Math.round(v)}</span>
    </div>
    <div style={{ height: 4, background: T.bg, borderRadius: 2 }}>
      <div style={{ height: "100%", width: `${clamp(v, 0, 100)}%`, background: color, borderRadius: 2 }} />
    </div>
  </div>
);

// SIGNATURE 3 — octagon radar (cage shape) for at-a-glance profile
export const OctaRadar = ({ attrs, color, size = 190 }) => {
  const keys = ["striking", "footwork", "wrestling", "bjj", "strength", "cardio", "chin", "fightIQ"];
  const labels = { striking: "STR", footwork: "FTW", wrestling: "WRE", bjj: "BJJ",
    strength: "PWR", cardio: "CAR", chin: "CHN", fightIQ: "IQ" };
  const cx = size / 2, cy = size / 2, R = size / 2 - 26;
  const pt = (i, r) => {
    const ang = (Math.PI * 2 * i) / 8 - Math.PI / 2;
    return [cx + Math.cos(ang) * r, cy + Math.sin(ang) * r];
  };
  const ring = (r) => keys.map((_, i) => pt(i, r).join(",")).join(" ");
  const shape = keys.map((k, i) => pt(i, (attrs[k] / 100) * R).join(",")).join(" ");
  return (
    <svg width={size} height={size}>
      {[0.25, 0.5, 0.75, 1].map((f, i) => (
        <polygon key={i} points={ring(R * f)} fill="none" stroke={T.line} strokeWidth={1} />
      ))}
      {keys.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={T.line} strokeWidth={1} />;
      })}
      <polygon points={shape} fill={`${color}33`} stroke={color} strokeWidth={2} />
      {keys.map((k, i) => {
        const [x, y] = pt(i, R + 14);
        return <text key={k} x={x} y={y} fill={T.txt3} fontSize={9} fontFamily={T.mono}
          fontWeight={700} textAnchor="middle" dominantBaseline="middle">{labels[k]}</text>;
      })}
    </svg>
  );
};

// ---- Layout exports for Phase 2+ (Sidebar, TopBar will import these) ----
export { Icon, ICONS };

/* ---- BACKWARD-COMPAT EXPORTS (Phase 1 bridge) --------------------------------
   These mimic the old API so existing callers (App, FighterCard, FightNight,
   NegotiateModal) don't break. They will be removed in Phase 2/3 when each
   caller is ported to the new primitives. */
export const cut = () => ({}); // no-op — Ironfist doesn't use clip-path

export const Card = ({ children, style, accent }) => (
  <Panel style={{ padding: 14, marginBottom: 12, borderColor: accent || T.line, ...style }}>
    {accent && <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: accent, borderRadius: "4px 0 0 4px" }} />}
    {children}
  </Panel>
);

export const H = ({ children, color = T.gold }) => (
  <Eyebrow color={color}>{children}</Eyebrow>
);

export const Bar = ({ v, max = 100, color, h = 8, skew, mirror }) => (
  <div style={{ position: "relative", background: T.bg, height: h, borderRadius: 3, overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 0, bottom: 0, [mirror ? "right" : "left"]: 0,
      width: isNaN(v) ? 0 : `${clamp((v / max) * 100, 0, 100)}%`,
      background: `linear-gradient(180deg, ${color}, ${color}88)`, borderRadius: 3 }} />
  </div>
);
