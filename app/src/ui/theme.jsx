import React from "react";
import { clamp } from "../engine/rng.js";

export const C = {
  bg: "#07090f", spot: "#141a28", panel: "#10151f", panel2: "#1a2130",
  line: "#26314a", gold: "#e6b64c", goldDim: "#8a6f2e",
  red: "#e14b44", blue: "#3f8fd4", green: "#57b56b",
  chalk: "#f2ead8", dim: "#8b97ad",
};
export const DISPLAY = "'Impact','Haettenschweiler','Arial Narrow Bold',sans-serif";

export const GlobalStyle = () => (
  <style>{`
    @keyframes rise { from { opacity:0; transform:translateY(8px);} to {opacity:1; transform:none;} }
    @keyframes belldrop { 0% {opacity:0; transform:scale(2.6) rotate(-14deg);} 60% {opacity:1; transform:scale(.95) rotate(-8deg);} 100% {transform:scale(1) rotate(-8deg);} }
    @keyframes pulsering { 0% { box-shadow:0 0 0 0 rgba(225,75,68,.55);} 100% { box-shadow:0 0 0 14px rgba(225,75,68,0);} }
    @keyframes goldglow { 0%,100% { text-shadow:0 0 8px rgba(230,182,76,.35);} 50% { text-shadow:0 0 22px rgba(230,182,76,.75);} }
    @keyframes weekpop { 0% {opacity:0; transform:translate(-50%,-40%) scale(.6);} 25% {opacity:1; transform:translate(-50%,-50%) scale(1.05);} 70% {opacity:1;} 100% {opacity:0; transform:translate(-50%,-58%) scale(1);} }
    @keyframes koflash { 0%,100% { opacity:0;} 15%,45% {opacity:.85;} }
    .rise { animation: rise .35s ease both; }
    button { -webkit-tap-highlight-color: transparent; }
    ::-webkit-scrollbar { width:6px; height:6px; } ::-webkit-scrollbar-thumb { background:#26314a; border-radius:3px; }
  `}</style>
);

export const cut = (s = 12) => ({
  clipPath: `polygon(0 0, calc(100% - ${s}px) 0, 100% ${s}px, 100% 100%, ${s}px 100%, 0 calc(100% - ${s}px))`,
});

export const Card = ({ children, style, accent }) => (
  <div className="rise" style={{ position: "relative", background: `linear-gradient(160deg, ${C.panel2}, ${C.panel})`, padding: 14, marginBottom: 12, border: `1px solid ${accent || C.line}`, ...cut(12), ...style }}>
    {accent && <div style={{ position: "absolute", top: 0, left: 0, width: 4, height: "100%", background: accent }} />}
    {children}
  </div>
);

export const H = ({ children, color = C.gold }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
    <div style={{ width: 14, height: 3, background: color, transform: "skewX(-20deg)" }} />
    <div style={{ fontFamily: DISPLAY, fontSize: 14, letterSpacing: 2.5, textTransform: "uppercase", color }}>{children}</div>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${C.line}, transparent)` }} />
  </div>
);

export const Btn = ({ children, onClick, color = C.gold, disabled, small, wide }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: disabled ? "#1b2331" : `linear-gradient(180deg, ${color}, ${color}cc)`,
    color: disabled ? "#4d5a70" : "#0a0d14",
    border: "none", padding: small ? "6px 12px" : "10px 18px",
    fontFamily: DISPLAY, fontSize: small ? 12 : 15, letterSpacing: 1.5, textTransform: "uppercase",
    cursor: disabled ? "default" : "pointer", width: wide ? "100%" : undefined,
    boxShadow: disabled ? "none" : `0 3px 0 #00000088`,
    ...cut(7),
  }}>{children}</button>
);

export const Tag = ({ children, color = C.gold }) => (
  <span style={{ display: "inline-block", border: `1px solid ${color}66`, background: `${color}14`, color, fontSize: 10, padding: "1px 7px", letterSpacing: 1, textTransform: "uppercase", marginRight: 4, marginBottom: 2, transform: "skewX(-8deg)" }}>{children}</span>
);

export const Bar = ({ v, max = 100, color, h = 8, skew, mirror }) => (
  <div style={{ position: "relative", background: "#04060b", height: h, overflow: "hidden", border: "1px solid #00000066", transform: skew ? "skewX(-16deg)" : undefined }}>
    <div style={{ position: "absolute", top: 0, bottom: 0, [mirror ? "right" : "left"]: 0, width: `${clamp((v / max) * 100, 0, 100)}%`, background: `linear-gradient(180deg, ${color}, ${color}99)`, transition: "width .5s cubic-bezier(.2,.8,.2,1)" }} />
    <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(90deg, transparent 0 10px, rgba(0,0,0,.4) 10px 11px)" }} />
  </div>
);

export const OVR = ({ f, size = 44 }) => {
  const avgSkill = f.attrs ? Object.values(f.attrs).reduce((s, v) => s + v, 0) / Object.keys(f.attrs).length : 0;
  return (
    <div style={{ width: size, height: size + 8, background: `linear-gradient(180deg, ${C.gold}, #b8892f)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", ...cut(8), flexShrink: 0 }}>
      <div style={{ fontFamily: DISPLAY, fontSize: size * 0.48, color: "#0a0d14", lineHeight: 1 }}>{Math.round(avgSkill)}</div>
      <div style={{ fontSize: 8, fontWeight: 800, color: "#0a0d14aa", letterSpacing: 1 }}>OVR</div>
    </div>
  );
};

export const Meter = ({ label, v, color }) => (
  <div style={{ flex: 1 }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, letterSpacing: 1.5, color: C.dim, textTransform: "uppercase", marginBottom: 2 }}>
      <span>{label}</span><span style={{ color, fontFamily: DISPLAY, fontSize: 11 }}>{isNaN(v) ? "?" : Math.round(v)}</span>
    </div>
    <Bar v={v} color={color} h={4} skew />
  </div>
);
