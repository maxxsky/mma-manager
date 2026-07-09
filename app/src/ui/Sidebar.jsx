import React from "react";
import { T, Icon, ICONS, Btn } from "./theme.jsx";

// Maps app tab keys to sidebar nav items
const NAV = [
  ["dashboard", "Dashboard", ICONS.dash],
  ["roster", "Roster", ICONS.roster],
  ["rank", "Rankings", ICONS.rank],
  ["scout", "Scout", ICONS.scout],
  ["inbox", "Inbox", ICONS.inbox],
  ["finance", "Finance", ICONS.money],
  ["mgmt", "Facility", ICONS.facility],
  ["rivals", "Rivals", ICONS.rivals],
];

export default function Sidebar({ view, setView, onAdvance, inboxCount }) {
  // Map some view states to nav keys
  const map = { fighter: "roster", card: "inbox", fightnight: "roster" };
  const active = map[view] || view;
  return (
    <aside style={{ width: 220, flexShrink: 0, background: T.surface,
      borderRight: `1px solid ${T.line}`, display: "flex", flexDirection: "column",
      height: "100vh", position: "sticky", top: 0, overflowY: "auto" }}>
      {/* Brand */}
      <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${T.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: T.ember,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: T.bg, boxShadow: `0 2px 12px ${T.ember}55` }}>
            <Icon d={ICONS.bolt} size={17} />
          </div>
          <div>
            <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 19,
              letterSpacing: .5, color: T.txt, lineHeight: 1 }}>IRONFIST</div>
            <div style={{ fontFamily: T.body, fontSize: 9, letterSpacing: 2,
              color: T.txt3, textTransform: "uppercase" }}>Fight Management</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: 10, flex: 1 }}>
        {NAV.map(([k, label, icon]) => {
          const on = active === k;
          return (
            <button key={k} className="nav-item" onClick={() => setView(k === "roster" ? "roster" : k)}
              style={{ display: "flex", alignItems: "center", gap: 11, width: "100%",
                textAlign: "left", padding: "9px 12px", marginBottom: 2, borderRadius: T.r,
                border: "none", background: on ? T.raised : "transparent", cursor: "pointer",
                color: on ? T.txt : T.txt2, position: "relative" }}>
              {on && <div style={{ position: "absolute", left: 0, top: 8, bottom: 8,
                width: 3, background: T.ember, borderRadius: 2 }} />}
              <span style={{ color: on ? T.ember : T.txt3, display: "flex" }}>
                <Icon d={icon} />
              </span>
              <span style={{ fontFamily: T.body, fontSize: 13.5, fontWeight: on ? 600 : 500,
                letterSpacing: .3 }}>{label}</span>
              {k === "inbox" && (inboxCount || 0) > 0 && (
                <span style={{ marginLeft: "auto", fontFamily: T.mono, fontSize: 10,
                  fontWeight: 700, color: T.bg, background: T.ember, borderRadius: 10,
                  padding: "1px 7px" }}>{inboxCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom CTA */}
      <div style={{ padding: 12, borderTop: `1px solid ${T.line}` }}>
        <Btn onClick={onAdvance} wide color={T.ember}
          style={{ boxShadow: `0 3px 14px ${T.ember}44`, justifyContent: "center", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon d={ICONS.chevR} size={16} /> Advance Week
        </Btn>
      </div>
    </aside>
  );
}
