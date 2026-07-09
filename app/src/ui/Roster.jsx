import React, { useState } from "react";
import { ARCH_COLOR } from "../engine/data.js";
import { avgSkill } from "../engine/fighter.js";
import { rankOf } from "../engine/rankings.js";
import { T, Panel, Tag, Ovr, Mono, heat, Btn } from "./theme.jsx";
import FighterDetail from "./FighterDetail.jsx";

export default function Roster({ g, setTab, up }) {
  const [detailFighter, setDetailFighter] = useState(null);

  if (detailFighter) {
    const f = g.roster.find((x) => x.id === detailFighter.id);
    return f ? (
      <div>
        <Btn sm ghost onClick={() => setDetailFighter(null)} style={{ marginBottom: 14 }}>← Back to Roster</Btn>
        <FighterDetail f={f} g={g} up={up} />
      </div>
    ) : null;
  }

  const cols = ["STR", "WRE", "BJJ", "FTW", "PWR", "CAR", "CHN", "IQ"];
  const keys = ["striking", "wrestling", "bjj", "footwork", "strength", "cardio", "chin", "fightIQ"];

  return (
    <Panel pad={0} style={{ overflow: "hidden" }}>
      <div style={{ display: "grid",
        gridTemplateColumns: "minmax(200px,1.4fr) 46px repeat(8, 40px) 90px 70px",
        alignItems: "center", padding: "0 16px", height: 40, background: T.raised,
        borderBottom: `1px solid ${T.line}` }}>
        {["Fighter", "OVR", ...cols, "Status", "Cond"].map((c, i) => (
          <span key={i} style={{ fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 1,
            textTransform: "uppercase", color: T.txt3, textAlign: i === 0 ? "left" : "center" }}>{c}</span>
        ))}
      </div>
      {g.roster.map((f) => {
        const ac = ARCH_COLOR[f.archetype];
        const r = rankOf(g, f);
        const div = g.divisions && g.divisions[f.weightClass];
        const isChamp = div && div.champ.player && div.champ.fighterId === f.id;
        return (
          <div key={f.id} className="row" onClick={() => { setDetailFighter(f); }}
            style={{ display: "grid",
              gridTemplateColumns: "minmax(200px,1.4fr) 46px repeat(8, 40px) 90px 70px",
              alignItems: "center", padding: "0 16px", height: 52, cursor: "pointer",
              borderBottom: `1px solid ${T.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <Mono name={f.name} color={ac} size={34} champ={isChamp || f.titles?.length > 0} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: T.body, fontSize: 14, fontWeight: 600, color: T.txt,
                  display: "flex", alignItems: "center", gap: 6 }}>
                  {f.name}
                  {isChamp ? <Tag color={T.gold} solid>Champ</Tag>
                    : f.titles?.length > 0 ? <Tag color={T.gold}>🏆</Tag>
                    : r ? <Tag color={T.gold}>#{r}</Tag> : null}
                </div>
                <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3 }}>
                  <span style={{ color: ac }}>{f.archetype}</span> · {f.weightClass} · {f.age}y ·{" "}
                  <span style={{ fontFamily: T.mono }}>{f.record.w}-{f.record.l}</span>
                </div>
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: heat(avgSkill(f)) }}>
                {avgSkill(f)}</span>
            </div>
            {keys.map((k) => (
              <span key={k} style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 600,
                textAlign: "center", color: heat(f.attrs[k]) }}>{Math.round(f.attrs[k])}</span>
            ))}
            <div style={{ textAlign: "center" }}>
              {isChamp ? <Tag color={T.gold}>Champ</Tag>
                : f.booked ? <Tag color={T.ember}>Booked</Tag>
                : f.injury ? <Tag color={T.neg}>Injured</Tag>
                : f.overtraining >= 50 ? <Tag color={T.warn}>Fatigued</Tag>
                : <span style={{ fontFamily: T.body, fontSize: 11, color: T.txt3 }}>Training</span>}
            </div>
            <div style={{ paddingLeft: 8 }}>
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
    </Panel>
  );
}
