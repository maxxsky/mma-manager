import React from "react";
import { T, Panel, Eyebrow, Tag, Btn, Meter } from "./theme.jsx";

export default function Facility({ g, dispatch, t, fmt$, coachCap, rosterCap }) {
  const facLabels = { mats: "Mats", ring: "Ring", weights: "Weights", medical: "Medical" };
  const facCost = (lvl) => Math.round(lvl * 30000 * 0.05);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Camp Tier */}
      <Panel>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Eyebrow>Camp Status</Eyebrow>
            <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 24, textTransform: "uppercase",
              letterSpacing: .5, color: T.gold }}>Tier {g.campTier || 0}</div>
          </div>
          <div style={{ display: "flex", gap: 22 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: T.body, fontSize: 9, fontWeight: 600, letterSpacing: 1,
                color: T.txt3, textTransform: "uppercase" }}>Coaches</div>
              <div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, color: g.coaches.length > coachCap ? T.neg : T.txt }}>
                {g.coaches.length}/{coachCap}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: T.body, fontSize: 9, fontWeight: 600, letterSpacing: 1,
                color: T.txt3, textTransform: "uppercase" }}>Roster</div>
              <div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, color: g.roster.length > rosterCap ? T.neg : T.txt }}>
                {g.roster.length}/{rosterCap}</div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Coaches */}
      <Panel pad={0} style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px 2px" }}>
          <Eyebrow>Coaching Staff</Eyebrow>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 90px 90px", alignItems: "center",
          padding: "0 18px", height: 32, background: T.raised, borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}` }}>
          {["Coach", "Specialty", "Salary/mo", "Status"].map((c) => (
            <span key={c} style={{ fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 1,
              textTransform: "uppercase", color: T.txt3 }}>{c}</span>
          ))}
        </div>
        {g.coaches.map((c, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 90px 90px",
            alignItems: "center", padding: "10px 18px", borderBottom: `1px solid ${T.line}` }}>
            <div>
              <div style={{ fontFamily: T.body, fontSize: 13, fontWeight: 600, color: T.txt }}>{c.name}</div>
              <div style={{ fontFamily: T.body, fontSize: 10, color: T.txt3 }}>{c.personality}</div>
            </div>
            <span style={{ fontFamily: T.body, fontSize: 12, color: T.txt2 }}>{c.specialty}</span>
            <span style={{ fontFamily: T.mono, fontSize: 12, color: T.txt2 }}>{fmt$(c.salary)}</span>
            <span><Tag color={c.freeUntil && g.week <= c.freeUntil ? T.pos : T.txt3}>
              {c.freeUntil && g.week <= c.freeUntil ? "Free" : "Active"}</Tag></span>
          </div>
        ))}
        {g.coaches.length < coachCap && (
          <div style={{ padding: 14, textAlign: "center" }}>
            <Btn color={T.steel} ghost sm>Hire Coach</Btn>
          </div>
        )}
      </Panel>

      {/* Facilities */}
      <Panel>
        <Eyebrow>Facility Upgrades</Eyebrow>
        <div style={{ display: "grid", gap: 10 }}>
          {Object.entries(g.facilities).map(([k, lvl]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.body, fontSize: 13, fontWeight: 600, color: T.txt }}>{facLabels[k]}</div>
                <Meter label={`Level ${lvl}`} v={lvl * 10} color={T.steel} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: T.mono, fontSize: 11, color: T.txt3 }}>Maint.</div>
                <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: T.txt2 }}>{fmt$(facCost(lvl))}/mo</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
