import { useState } from "react";
import { fmt$ } from "../engine/rng.js";
import React from "react";
import { T, Panel, Eyebrow, Tag, Btn, Meter, Mono, heat } from "./theme.jsx";
import { t } from "../i18n/index.js";
import { CAMP_TIERS, COACH_PERSONALITIES } from "../engine/data.js";
import { FACILITY_MAINT_RATE } from "../engine/economy.js";

export default function Facility({ g, dispatch, coachCap, rosterCap }) {
  const [showingMarket, setShowingMarket] = useState(false);
  const facLabels = { mats: "Mats", ring: "Ring", weights: "Weights", medical: "Medical" };
  const facCost = (lvl) => Math.round(lvl * 30000 * FACILITY_MAINT_RATE);
  const tier = CAMP_TIERS[g.campTier || 0] || CAMP_TIERS[0];

  const coachSpecLabel = (spec) => ({ Striking: "Striking", Wrestling: "Wrestling", BJJ: "BJJ", "S&C": "S&C", Head: "Head" }[spec] || spec);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
      {/* LEFT — Coaching staff */}
      <Panel pad={0} style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px 10px" }}>
          <Eyebrow>{t("UI.coachingStaff")} · {g.coaches.length} / {coachCap} slots</Eyebrow>
        </div>
        {g.coaches.map((c, i, arr) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 18px",
            borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : "none" }}>
            <Mono name={c.name} color={COACH_PERSONALITIES[c.personality]?.color || T.steel} size={32} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.body, fontSize: 13.5, fontWeight: 600, color: T.txt,
                display: "flex", alignItems: "center", gap: 7 }}>
                {c.name} <Tag color={T.steel}>{coachSpecLabel(c.spec)}</Tag>
              </div>
              <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3 }}>{c.personality}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color: heat(c.skill * 10 + 10) }}>{c.skill}</div>
              <div style={{ fontFamily: T.body, fontSize: 8, letterSpacing: 1, textTransform: "uppercase",
                color: T.txt3 }}>skill</div>
            </div>
            <span style={{ fontFamily: T.mono, fontSize: 12, color: T.txt2, width: 70, textAlign: "right" }}>
              {fmt$(c.salary)}/mo</span>
          </div>
        ))}
        {g.coaches.length < coachCap && (
          <div style={{ padding: 14, textAlign: "center" }}>
            <Btn color={T.pos} sm onClick={() => setShowingMarket(!showingMarket)}>
              {showingMarket ? t("UI.close") || "Close" : t("UI.hireCoach")}
            </Btn>
          </div>
        )}

        {/* Coach market — available for hire */}
        {showingMarket && (
          <div style={{ borderTop: `1px solid ${T.line}`, padding: "10px 14px" }}>
            <div style={{ fontFamily: T.body, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.pos, marginBottom: 8 }}>
              {t("UI.availableCoaches") || "Available Coaches"} · {g.coachMarket?.length || 0}
            </div>
            {(!g.coachMarket || g.coachMarket.length === 0) ? (
              <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, padding: "10px 0", textAlign: "center" }}>
                No coaches available. Market refreshes monthly.
              </div>
            ) : (
              g.coachMarket.map((c, i) => (
                <div key={c.id || i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0",
                  borderBottom: i < g.coachMarket.length - 1 ? `1px solid ${T.line}33` : "none" }}>
                  <Mono name={c.name} color={COACH_PERSONALITIES[c.personality]?.color || T.steel} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: T.body, fontSize: 12, fontWeight: 600, color: T.txt }}>
                      {c.name} <Tag color={T.steel} style={{ fontSize: 9 }}>{coachSpecLabel(c.spec)}</Tag>
                    </div>
                    <div style={{ fontFamily: T.body, fontSize: 10, color: T.txt3 }}>
                      {c.personality} · Skill {c.skill}
                    </div>
                  </div>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: T.txt2, whiteSpace: "nowrap" }}>
                    {fmt$(c.salary)}/mo
                  </span>
                  <Btn sm color={T.pos} onClick={() => {
                    dispatch({ type: "HIRE_COACH", coachId: c.id, coachName: c.name, coachSpec: c.spec, coachSalary: c.salary });
                    setShowingMarket(false);
                  }}>Hire</Btn>
                </div>
              ))
            )}
          </div>
        )}
      </Panel>

      {/* RIGHT — Camp tier + Facilities */}
      <div style={{ display: "grid", gap: 16 }}>
        <Panel>
          <Eyebrow color={T.gold}>{t("UI.campStatus")} · {tier.name || `Tier ${g.campTier || 0}`}</Eyebrow>
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt2, marginBottom: 12, lineHeight: 1.5 }}>
            {tier.desc || ""}
          </div>
          <Meter label={`Rep to next tier`} v={Math.round((g.rep / (tier.rep || 80)) * 100)} color={T.gold} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, margin: "14px 0" }}>
            {[[t("UI.roster"), `${g.roster.length}/${rosterCap}`],
              [t("UI.coachingStaff"), `${g.coaches.length}/${coachCap}`],
              ["Train bonus", `+${Math.round((tier.trainBonus || 0) * 100)}%`],
            ].map(([l, v]) => (
              <div key={l} style={{ background: T.bg, borderRadius: T.r, padding: "8px 10px", textAlign: "center" }}>
                <div style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: T.txt }}>{v}</div>
                <div style={{ fontFamily: T.body, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: T.txt3 }}>{l}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <Eyebrow>{t("UI.facilityUpgrades")}</Eyebrow>
          {Object.entries(g.facilities).map(([k, lvl], i, arr) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
              borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : "none" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: T.body, fontSize: 13, fontWeight: 600, color: T.txt, marginBottom: 5 }}>
                  {facLabels[k]}</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} style={{ width: 22, height: 5, borderRadius: 2,
                      background: j < lvl ? T.steel : T.bg,
                      border: `1px solid ${j < lvl ? T.steel : T.line}` }} />
                  ))}
                </div>
              </div>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.txt3 }}>L{lvl}</span>
              <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: T.txt2 }}>
                {fmt$(facCost(lvl))}/mo</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}
