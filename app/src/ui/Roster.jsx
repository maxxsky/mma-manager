import React, { useState, useEffect } from "react";
import { ARCH_COLOR, TRAINING, INTENSITY, ATTRS } from "@ironfist/engine/data.js";
import { avgSkill } from "@ironfist/engine/fighter.js";
import { rankOf } from "@ironfist/engine/rankings.js";
import { T, Panel, Tag, Ovr, Mono, heat, Btn } from "./theme.jsx";
import { t } from "../i18n/index.js";
import FighterDetail from "./FighterDetail.jsx";

// Bulk training assignment.
//
// Training could only be set from a fighter's own page: open Roster, click a
// fighter, pick a programme, pick an intensity, go back, repeat. At the roster
// caps this game now reaches — twenty-four fighters at the top tier — that is
// roughly a hundred clicks a week, and a long save runs the weekly loop over a
// thousand times. The arithmetic is what matters here, not taste.
//
// "Weakest area" is the important option. It is what a sensible manager does
// anyway, and doing it by hand means comparing eight attributes against eight
// ceilings for every fighter, every week.
function BulkTraining({ g, dispatch }) {
  const [program, setProgram] = React.useState("auto");
  const [intensity, setIntensity] = React.useState("Medium");

  // Injured fighters need recovery and booked fighters are in fight camp;
  // neither should have a general programme stamped over them.
  const eligible = g.roster.filter((f) => !f.injury && !f.booked);

  const weakestProgram = (f) => {
    let best = null, gap = -Infinity;
    for (const key of Object.keys(TRAINING)) {
      const gains = TRAINING[key].gains;
      if (!gains || !gains.length) continue;
      const room = gains.reduce((s, k) => s + ((f.ceilings?.[k] ?? 99) - f.attrs[k]), 0) / gains.length;
      if (room > gap) { gap = room; best = key; }
    }
    return best;
  };

  const apply = () => {
    for (const f of eligible) {
      const prog = program === "auto" ? weakestProgram(f) : program;
      if (!prog) continue;
      dispatch({ type: "SET_TRAINING", fighterId: f.id, program: prog, intensity });
    }
  };

  const programOptions = ["auto", ...Object.keys(TRAINING)];

  return (
    <Panel style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: T.disp, fontSize: 12, fontWeight: 700, letterSpacing: 1,
          textTransform: "uppercase", color: T.txt3, marginRight: 2 }}>
          {t("ROSTER.bulkTraining")}
        </span>

        <select
          value={program}
          onChange={(e) => setProgram(e.target.value)}
          aria-label={t("ROSTER.bulkProgram")}
          style={{ background: T.bg, color: T.txt, border: `1px solid ${T.line}`,
            borderRadius: T.r, padding: "6px 8px", fontFamily: T.body, fontSize: 12 }}
        >
          {programOptions.map((k) => (
            <option key={k} value={k}>
              {k === "auto" ? t("ROSTER.bulkAuto") : (TRAINING[k].label || k)}
            </option>
          ))}
        </select>

        <select
          value={intensity}
          onChange={(e) => setIntensity(e.target.value)}
          aria-label={t("ROSTER.bulkIntensity")}
          style={{ background: T.bg, color: T.txt, border: `1px solid ${T.line}`,
            borderRadius: T.r, padding: "6px 8px", fontFamily: T.body, fontSize: 12 }}
        >
          {Object.keys(INTENSITY).map((k) => <option key={k} value={k}>{k}</option>)}
        </select>

        <Btn sm onClick={apply} disabled={eligible.length === 0}>
          {t("ROSTER.bulkApply").replace("{0}", eligible.length)}
        </Btn>

        <span style={{ fontFamily: T.body, fontSize: 11, color: T.txt3 }}>
          {t("ROSTER.bulkSkips")}
        </span>
      </div>
    </Panel>
  );
}

export default function Roster({ g, setTab, dispatch }) {
  const [detailFighter, setDetailFighter] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (detailFighter) {
    const f = g.roster.find((x) => x.id === detailFighter.id);
    return f ? (
      <div>
        <Btn sm ghost onClick={() => setDetailFighter(null)} style={{ marginBottom: 14 }}>← {t("UI.back")}</Btn>
        <FighterDetail f={f} g={g} dispatch={dispatch} />
      </div>
    ) : null;
  }

  const cols = ["STR", "WRE", "BJJ", "FTW", "PWR", "CAR", "CHN", "IQ"];
  const keys = ["striking", "wrestling", "bjj", "footwork", "strength", "cardio", "chin", "fightIQ"];

  const bulk = <BulkTraining g={g} dispatch={dispatch} />;

  return isMobile ? (
    <div style={{ display: "grid", gap: 10 }}>
      {bulk}
      {g.roster.map((f) => {
        const ac = ARCH_COLOR[f.archetype];
        const r = rankOf(g, f);
        const div = g.divisions && g.divisions[f.weightClass];
        const isChamp = div && div.champ && div.champ.player && div.champ.fighterId === f.id;
        const top3 = ["striking","wrestling","bjj","footwork","strength","cardio","chin","fightIQ"]
          .map((k) => ({ k, v: f.attrs[k] }))
          .sort((a, b) => b.v - a.v)
          .slice(0, 3);
        return (
          <div key={f.id} onClick={() => { setDetailFighter(f); }}
            style={{ background: T.raised, borderRadius: T.r, padding: 12, cursor: "pointer",
              border: `1px solid ${T.line}`, borderLeft: isChamp ? `3px solid ${T.gold}` : `1px solid ${T.line}` }}>
            {/* Top row: mono + name/tags + OVR */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Mono name={f.name} color={ac} size={34} region={f.region} titleTier={isChamp || f.titles?.length > 0 ? (f.titles?.includes("Major World Champion") ? "Major" : "National") : null} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: T.body, fontSize: 14, fontWeight: 600, color: T.txt }}>{f.name}</span>
                  {isChamp ? <Tag color={T.gold} solid>{t("UI.champion")}</Tag>
                    : f.titles?.length > 0 ? <Tag color={T.gold}>🏆</Tag>
                    : r ? <Tag color={T.gold}>#{r}</Tag> : null}
                </div>
                <div style={{ fontSize: 11, color: T.txt3, marginTop: 1 }}>
                  <span style={{ color: ac }}>{f.archetype}</span> · {f.weightClass} · {f.age ?? "?"}y ·{" "}
                  <span style={{ fontFamily: T.mono }}>{f.record?.w ?? 0}-{f.record?.l ?? 0}</span>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: heat(Math.round(avgSkill(f))) }}>
                  {Math.round(avgSkill(f))}</span>
              </div>
            </div>
            {/* Top 3 attrs chips */}
            <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
              {top3.map(({ k, v }) => (
                <span key={k} style={{
                  fontFamily: T.mono, fontSize: 10, fontWeight: 700, padding: "2px 7px",
                  borderRadius: 4, background: `${heat(v)}22`, color: heat(v),
                }}>
                  {k === "striking" ? "STR" : k === "wrestling" ? "WRE" : k === "bjj" ? "BJJ"
                    : k === "footwork" ? "FTW" : k === "strength" ? "PWR" : k === "cardio" ? "CAR"
                    : k === "chin" ? "CHN" : "IQ"} {Math.round(v)}
                </span>
              ))}
            </div>
            {/* Bottom row: status tag + mini bars */}
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flexShrink: 0 }}>
                {isChamp ? <Tag color={T.gold}>{t("UI.champion")}</Tag>
                  : f.booked ? <Tag color={T.ember}>{t("UI.booked")}</Tag>
                  : f.injury ? <Tag color={T.neg}>{t("UI.injured")}</Tag>
                  : f.overtraining >= 50 ? <Tag color={T.warn}>{t("UI.fatigued")}</Tag>
                  : <span style={{ fontSize: 11, color: T.txt3 }}>{t("TRAIN." + (f.training?.type || "sparring"))}</span>}
              </div>
              <div style={{ flex: 1, display: "flex", gap: 6, alignItems: "center" }}>
                <div style={{ flex: 1, height: 4, background: T.bg, borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${f.morale}%`,
                    background: f.morale > 60 ? T.pos : T.warn, borderRadius: 2 }} />
                </div>
                <div style={{ flex: 1, height: 4, background: T.bg, borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${f.overtraining}%`,
                    background: f.overtraining > 50 ? T.neg : T.txt3, borderRadius: 2 }} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <div>
      {bulk}
      <Panel pad={0} style={{ overflow: "hidden" }} role="table" aria-label="Fighter roster table">
      <div style={{ overflowX: "auto" }}>
        <div role="row" style={{ display: "grid",
        gridTemplateColumns: "minmax(200px,1.4fr) 46px repeat(8, 40px) 90px 70px",
        alignItems: "center", padding: "0 16px", height: 40, background: T.raised,
        borderBottom: `1px solid ${T.line}` }}>
        {[t("UI.fighter"), t("UI.overall"), ...cols, t("UI.status"), t("UI.condition")].map((c, i) => (
          <span key={i} role="columnheader" style={{ fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 1,
            textTransform: "uppercase", color: T.txt3, textAlign: i === 0 ? "left" : "center" }}>{c}</span>
        ))}
      </div>
      {g.roster.map((f) => {
        const ac = ARCH_COLOR[f.archetype];
        const r = rankOf(g, f);
        const div = g.divisions && g.divisions[f.weightClass];
        const isChamp = div && div.champ && div.champ.player && div.champ.fighterId === f.id;
        return (
          <div key={f.id} className="row" onClick={() => { setDetailFighter(f); }}
            role="row" aria-label={`${f.name} - ${f.weightClass}`}
            style={{ display: "grid",
              gridTemplateColumns: "minmax(200px,1.4fr) 46px repeat(8, 40px) 90px 70px",
              alignItems: "center", padding: "0 16px", height: 52, cursor: "pointer",
              borderBottom: `1px solid ${T.line}` }}>
            <div role="cell" style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Mono name={f.name} color={ac} size={34} region={f.region} titleTier={isChamp || f.titles?.length > 0 ? (f.titles?.includes("Major World Champion") ? "Major" : "National") : null} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: T.body, fontSize: 14, fontWeight: 600, color: T.txt,
                  display: "flex", alignItems: "center", gap: 6 }}>
                  {f.name}
                  {isChamp ? <Tag color={T.gold} solid>{t("UI.champion")}</Tag>
                    : f.titles?.length > 0 ? <Tag color={T.gold}>🏆</Tag>
                    : r ? <Tag color={T.gold}>#{r}</Tag> : null}
                </div>
                <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3 }}>
                  <span style={{ color: ac }}>{f.archetype}</span> · {f.weightClass} · {f.age ?? "?"}y ·{" "}
                  <span style={{ fontFamily: T.mono }}>{f.record?.w ?? 0}-{f.record?.l ?? 0}</span>
                </div>
              </div>
            </div>
            <div role="cell" style={{ textAlign: "center" }}>
              <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: heat(Math.round(avgSkill(f))) }}>
                {Math.round(avgSkill(f))}</span>
            </div>
            {keys.map((k) => (
              <span key={k} role="cell" style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600,
                textAlign: "center", color: heat(f.attrs[k]) }}>{Math.round(f.attrs[k])}</span>
            ))}
            <div role="cell" style={{ textAlign: "center" }}>
              {isChamp ? <Tag color={T.gold}>{t("UI.champion")}</Tag>
                : f.booked ? <Tag color={T.ember}>{t("UI.booked")}</Tag>
                : f.injury ? <Tag color={T.neg}>{t("UI.injured")}</Tag>
                : f.overtraining >= 50 ? <Tag color={T.warn}>{t("UI.fatigued")}</Tag>
                : <span style={{ fontFamily: T.body, fontSize: 11, color: T.txt3 }}>{t("TRAIN." + (f.training?.type || "sparring"))}</span>}
            </div>
            <div role="cell" style={{ paddingLeft: 8 }}>
              <div style={{ height: 4, background: T.bg, borderRadius: 2, marginBottom: 3 }}>
                <div style={{ height: "100%", width: `${f.morale}%`,
                  background: f.morale > 60 ? T.pos : T.warn, borderRadius: 2 }} /></div>
              <div style={{ height: 4, background: T.bg, borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${f.overtraining}%`,
                  background: f.overtraining > 50 ? T.neg : T.txt3, borderRadius: 2 }} /></div>
            </div>
          </div>
        );
      })}
      </div>
      </Panel>
    </div>
  );
}
