import React from "react";
import { ARCH_COLOR, ATTRS, ATTR_LABEL, TRAITS, AMBITIONS, TRAINING, INTENSITY } from "../engine/data.js";
import { avgSkill, tierOf } from "../engine/fighter.js";
import { T, Panel, Eyebrow, Tag, Btn, Ovr, Mono, AttrTele, Meter, OctaRadar } from "./theme.jsx";

const groups = [
  ["Striking", [["striking", "Striking"], ["footwork", "Footwork"]]],
  ["Grappling", [["wrestling", "Wrestling"], ["bjj", "BJJ"]]],
  ["Physical", [["strength", "Strength"], ["cardio", "Cardio"]]],
  ["Durability", [["chin", "Chin"], ["fightIQ", "Fight IQ"]]],
];

export default function FighterDetail({ f, g, onBack, up }) {
  const ac = ARCH_COLOR[f.archetype];
  const div = g.divisions && g.divisions[f.weightClass];
  const isChamp = div && div.champ.player && div.champ.fighterId === f.id;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Back button */}
      <div>
        <Btn sm ghost onClick={onBack}>← Back to Roster</Btn>
      </div>

      {/* Identity header */}
      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Mono name={f.name} color={ac} size={64} champ={isChamp || f.titles?.length > 0} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 34, letterSpacing: .5,
              textTransform: "uppercase", color: T.txt, lineHeight: 1 }}>{f.name}</div>
            <div style={{ marginTop: 6 }}>
              <Tag color={ac} solid>{f.archetype}</Tag>
              <Tag color={T.txt2}>{f.weightClass}</Tag>
              <Tag color={T.txt2}>{f.age}y</Tag>
              <Tag color={T.txt2}>{f.reach}cm reach</Tag>
              {isChamp ? <Tag color={T.gold} solid>♛ Champion</Tag>
                : f.titles?.length > 0 ? <Tag color={T.gold}>♛ {f.titles.length}x</Tag>
                : null}
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

      {/* Attributes + Octagon */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", gap: 16, alignItems: "start" }}>
        <Panel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 210px", gap: 24, alignItems: "start" }}>
            <div>
              <Eyebrow>Attributes · value / ceiling</Eyebrow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 22px" }}>
                {groups.map(([gname, rows]) => (
                  <div key={gname} style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
                      textTransform: "uppercase", color: ac, marginBottom: 6,
                      paddingBottom: 4, borderBottom: `1px solid ${T.line}` }}>{gname}</div>
                    {rows.map(([k, lb]) => (
                      <AttrTele key={k} label={lb} v={Math.round(f.attrs[k])} ceil={f.ceilings[k]} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <OctaRadar attrs={f.attrs} color={ac} size={190} />
          </div>
        </Panel>

        {/* Right column: condition + traits + contract */}
        <div style={{ display: "grid", gap: 16 }}>
          <Panel>
            <Eyebrow>Condition</Eyebrow>
            <Meter label="Morale" v={f.morale} color={f.morale > 60 ? T.pos : T.warn} />
            <Meter label="Overtraining" v={f.overtraining} color={f.overtraining > 50 ? T.neg : T.warn} />
            <Meter label="Popularity" v={f.popularity} color={T.gold} />
          </Panel>

          {f.traits?.length > 0 && (
            <Panel>
              <Eyebrow>Traits</Eyebrow>
              {f.traits.map((t) => (
                <div key={t} style={{ marginBottom: 4 }}>
                  <Tag color={T.ember} solid>{t}</Tag>
                  <div style={{ fontFamily: T.body, fontSize: 10, color: T.txt3, marginTop: 2 }}>
                    {TRAITS[t]}</div>
                </div>
              ))}
            </Panel>
          )}

          {f.ambitionRevealed && (
            <Panel>
              <Eyebrow>Ambition</Eyebrow>
              <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt2 }}>
                <span style={{ color: T.gold, fontWeight: 600 }}>{f.ambition}</span>
                <div style={{ color: T.txt3, fontSize: 10, marginTop: 2 }}>{AMBITIONS[f.ambition]}</div>
              </div>
            </Panel>
          )}

          {f.contract && (
            <Panel>
              <Eyebrow>Contract</Eyebrow>
              <div style={{ fontFamily: T.mono, fontSize: 11, color: T.txt2, display: "grid", gap: 3 }}>
                <div>Cut: <span style={{ color: T.txt }}>{Math.round(f.contract.managerCut * 100)}%</span></div>
                <div>Fights: <span style={{ color: T.txt }}>{f.contract.fightsLeft}/{f.contract.fightsTotal}</span></div>
                <div>Duration: <span style={{ color: T.txt }}>{f.contract.durationMo}mo</span></div>
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* Training controls — only if not booked and not injured */}
      {!f.booked && !f.injury && up && (
        <Panel>
          <Eyebrow>Training Program</Eyebrow>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {Object.entries(TRAINING).filter(([k]) => k !== "fightcamp").map(([k, t]) => (
              <button key={k} onClick={() => up((g2) => {
                const fx = g2.roster.find((x) => x.id === f.id);
                if (fx) fx.training.type = k;
              })} style={{
                fontFamily: T.disp, fontWeight: 600, fontSize: 12, letterSpacing: .8,
                textTransform: "uppercase", padding: "5px 10px", borderRadius: T.r, cursor: "pointer",
                border: f.training.type === k ? "none" : `1px solid ${T.line}`,
                background: f.training.type === k ? T.gold : "transparent",
                color: f.training.type === k ? T.bg : T.txt2 }}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            {Object.keys(INTENSITY).map((k) => (
              <button key={k} onClick={() => up((g2) => {
                const fx = g2.roster.find((x) => x.id === f.id);
                if (fx) fx.training.intensity = k;
              })} style={{
                fontFamily: T.mono, fontSize: 11, fontWeight: 600, padding: "4px 10px",
                borderRadius: T.r, cursor: "pointer",
                border: f.training.intensity === k ? "none" : `1px solid ${T.line}`,
                background: f.training.intensity === k ? T.ember : "transparent",
                color: f.training.intensity === k ? T.bg : T.txt3 }}>
                {k.toUpperCase()}
              </button>
            ))}
          </div>
        </Panel>
      )}

      {/* Fight History */}
      {f.fightHistory?.length > 0 && (
        <Panel pad={0} style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px 2px" }}>
            <Eyebrow>Fight History ({f.fightHistory.length})</Eyebrow>
          </div>
          {[...f.fightHistory].reverse().slice(0, 10).map((h, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 18px",
              fontFamily: T.mono, fontSize: 10, borderBottom: `1px solid ${T.line}33`,
              color: h.result === "W" ? T.pos : h.result === "D" ? T.txt3 : T.neg }}>
              <span>W{h.week} · vs {h.opponent}</span>
              <span>{h.result} · {h.method} R{h.round} {h.title ? "🏆" : ""} · {h.tier}</span>
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
