import React from "react";
import { fmt$ } from "../engine/rng.js";
import { ARCH_COLOR } from "../engine/data.js";
import { avgSkill } from "../engine/fighter.js";
import { T, Panel, Eyebrow, Tag, Btn, Ovr, Mono, AttrTele, Meter, OctaRadar, Icon, ICONS, heat } from "./theme.jsx";

export default function FighterDetail({ f, g, onBack, up }) {
  const ac = ARCH_COLOR[f.archetype];
  const groups = [
    ["Striking", [["striking", "Striking"], ["footwork", "Footwork"]]],
    ["Grappling", [["wrestling", "Wrestling"], ["bjj", "BJJ"]]],
    ["Physical", [["strength", "Strength"], ["cardio", "Cardio"]]],
    ["Durability & Mind", [["chin", "Chin"], ["fightIQ", "Fight IQ"]]],
  ];

  return (
    <div>
      {onBack && <Btn sm ghost onClick={onBack} style={{ marginBottom: 14 }}>← Back to Roster</Btn>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* identity header spans full width */}
        <Panel style={{ gridColumn: "span 2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Mono name={f.name} color={ac} size={64} champ={f.titles?.length > 0} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 34, letterSpacing: .5,
                textTransform: "uppercase", color: T.txt, lineHeight: 1 }}>{f.name}</div>
              <div style={{ marginTop: 6 }}>
                <Tag color={ac} solid>{f.archetype}</Tag><Tag color={T.txt2}>{f.weightClass}</Tag>
                <Tag color={T.txt2}>{f.age}y</Tag><Tag color={T.txt2}>{f.reach}cm reach</Tag>
                {f.titles?.length > 0 ? <Tag color={T.gold} solid>♛ Champion</Tag> : f.rank ? <Tag color={T.gold}>Rank #{f.rank}</Tag> : null}
              </div>
            </div>
            <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: T.mono, fontSize: 26, fontWeight: 700, color: T.txt }}>
                  {f.record.w}-{f.record.l}</div>
                <div style={{ fontFamily: T.body, fontSize: 10, letterSpacing: 1, textTransform: "uppercase",
                  color: T.txt3 }}>{f.record.ko} KO · {f.record.sub} SUB</div>
              </div>
              <Ovr v={avgSkill(f)} size={56} />
            </div>
          </div>
        </Panel>

        {/* left: attribute telemetry grouped + octagon */}
        <Panel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 210px", gap: 24, alignItems: "start" }}>
            <div>
              <Eyebrow>Attributes · value / ceiling</Eyebrow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 22px" }}>
                {groups.map(([gn, rows]) => (
                  <div key={gn} style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
                      textTransform: "uppercase", color: ac, marginBottom: 6,
                      paddingBottom: 4, borderBottom: `1px solid ${T.line}` }}>{gn}</div>
                    {rows.map(([k, lb]) => <AttrTele key={k} label={lb} v={Math.round(f.attrs[k])} ceil={f.ceilings[k]} />)}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8 }}>
              <OctaRadar attrs={f.attrs} color={ac} />
              <div style={{ fontFamily: T.body, fontSize: 10, color: T.txt3, letterSpacing: 1,
                textTransform: "uppercase", marginTop: 4 }}>Fight profile</div>
            </div>
          </div>
        </Panel>

        {/* right: traits / ambition / contract / condition */}
        <Panel>
          <Eyebrow>Profile</Eyebrow>
          <div style={{ marginBottom: 14 }}>
            {f.traits?.map((t) => (
              <Tag key={t} color={t.includes("Glass") || t.includes("Chinny") ? T.neg : T.ember}>{t}</Tag>
            ))}
          </div>
          {f.ambition && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
              background: T.bg, borderRadius: T.r, marginBottom: 16 }}>
              <span style={{ color: T.gold, display: "flex" }}><Icon d={ICONS.rank} size={15} /></span>
              <span style={{ fontFamily: T.body, fontSize: 12, color: T.txt2 }}>
                Ambition: <b style={{ color: T.gold }}>{f.ambition}</b></span>
            </div>
          )}
          <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
            <Meter label="Morale" v={f.morale} color={f.morale > 60 ? T.pos : T.warn} />
            <Meter label="Overtraining" v={f.overtraining} color={f.overtraining > 50 ? T.neg : T.txt3} />
            <Meter label="Popularity" v={f.popularity} color={T.steel} />
          </div>
          {f.contract && (
            <>
              <Eyebrow>Contract</Eyebrow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[[`Manager cut`, Math.round(f.contract.managerCut * 100) + "%"],
                  [`Fights left`, `${f.contract.fightsLeft}/${f.contract.fightsTotal}`],
                  [`Duration`, f.contract.durationMo + " mo"],
                  [`Agent`, f.agent || "None"]].map(([l, v]) => (
                  <div key={l} style={{ background: T.bg, borderRadius: T.r, padding: "8px 10px" }}>
                    <div style={{ fontFamily: T.body, fontSize: 9, letterSpacing: 1, textTransform: "uppercase",
                      color: T.txt3 }}>{l}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700,
                      color: l === "Fights left" && f.contract.fightsLeft <= 1 ? T.neg : T.txt }}>{v}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Panel>

        {/* fight history table full width */}
        {f.fightHistory?.length > 0 && (
          <Panel style={{ gridColumn: "span 2" }}>
            <Eyebrow>Fight history</Eyebrow>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px 70px 90px 60px",
              padding: "0 4px 6px", borderBottom: `1px solid ${T.line}` }}>
              {["", "Opponent", "Method", "Round", "Tier", "Perf"].map((c, i) => (
                <span key={i} style={{ fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                  textTransform: "uppercase", color: T.txt3 }}>{c}</span>
              ))}
            </div>
            {[...f.fightHistory].reverse().slice(0, 10).map((h, i) => (
              <div key={i} className="row" style={{ display: "grid",
                gridTemplateColumns: "40px 1fr 90px 70px 90px 60px", alignItems: "center",
                padding: "8px 4px", borderBottom: `1px solid ${T.line}`, borderRadius: 4 }}>
                <span style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 15,
                  color: h.result === "W" ? T.pos : T.neg }}>{h.result}</span>
                <span style={{ fontFamily: T.body, fontSize: 13, color: T.txt }}>{h.opponent}</span>
                <span style={{ fontFamily: T.mono, fontSize: 12, color: T.txt2 }}>{h.method}</span>
                <span style={{ fontFamily: T.mono, fontSize: 12, color: T.txt2 }}>R{h.round}</span>
                <span style={{ fontFamily: T.body, fontSize: 12, color: T.txt3 }}>{h.tier}</span>
                <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.pos }}>{h.week}</span>
              </div>
            ))}
          </Panel>
        )}
      </div>
    </div>
  );
}
