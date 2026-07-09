import React, { useState } from "react";
import { R, clamp, fmt$ } from "../engine/rng.js";
import { ATTRS, ATTR_LABEL, WEIGHTS, ARCH_COLOR, TRAITS, AMBITIONS, TRAINING, INTENSITY, AGENT_TYPES } from "../engine/data.js";
import { avgSkill, tierOf } from "../engine/fighter.js";
import { rankOf, vacateTitle } from "../engine/rankings.js";
import { getRel } from "../engine/relationships.js";
import { T, Panel, Eyebrow, Tag, Btn, Ovr, Meter, AttrTele, Mono } from "./theme.jsx";

export default function FighterCard({ f, g, up }) {
  const [open, setOpen] = useState(false);
  const ac = ARCH_COLOR[f.archetype];
  const r = rankOf(g, f);
  const div = g.divisions && g.divisions[f.weightClass];
  const isChamp = div && div.champ.player && div.champ.fighterId === f.id;

  return (
    <Panel style={{ marginBottom: 10 }}>
      {/* Header row — click to expand */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <Mono name={f.name} color={ac} size={40} champ={isChamp || f.titles?.length > 0} />
        <Ovr f={f} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 17, letterSpacing: 1,
            textTransform: "uppercase", color: T.txt, whiteSpace: "nowrap", overflow: "hidden",
            textOverflow: "ellipsis" }}>
            {f.name} {f.titles.length > 0 && "♛"}
          </div>
          <div style={{ marginTop: 2 }}>
            <Tag color={ac} solid>{f.archetype}</Tag>
            <Tag color={T.txt2}>{f.weightClass}</Tag>
            <Tag color={T.txt2}>{f.age}y</Tag>
            {isChamp ? <Tag color={T.gold} solid>♛ Champ</Tag>
              : r ? <Tag color={T.gold}>Rank #{r}</Tag> : null}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: T.mono, fontSize: 13, color: T.txt2 }}>
            {f.record.w}-{f.record.l} · {f.record.ko}KO {f.record.sub}SUB
          </div>
          {f.injury ? (
            <div style={{ color: f.injury.tier >= 3 ? T.neg : T.warn, fontFamily: T.body,
              fontSize: 11, fontWeight: 600 }}>
              🚑 {f.injury.weeks}w</div>
          ) : f.booked ? (
            <div style={{ color: T.ember, fontFamily: T.mono, fontSize: 14, fontWeight: 700 }}>
              T-{f.booked.weeksLeft}</div>
          ) : (
            <div style={{ color: T.txt3, fontSize: 11 }}>{open ? "▲" : "▼"}</div>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {open && (
        <div style={{ marginTop: 14, borderTop: `1px solid ${T.line}`, paddingTop: 14 }}>
          {/* Attributes grid — AttrTele */}
          <Eyebrow>Attributes · value / ceiling</Eyebrow>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0 22px" }}>
            {ATTRS.map((k) => (
              <AttrTele key={k} label={ATTR_LABEL[k]} v={Math.round(f.attrs[k])} ceil={f.ceilings[k]} />
            ))}
          </div>

          {/* Condition meters */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginTop: 12 }}>
            <Meter label="Morale" v={f.morale} color={f.morale > 60 ? T.pos : T.warn} />
            <Meter label="Overtraining" v={f.overtraining} color={f.overtraining > 50 ? T.neg : T.warn} />
            <Meter label="Popularity" v={f.popularity} color={T.gold} />
          </div>

          {/* Traits */}
          {f.traits.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {f.traits.map((t) => (
                <Tag key={t} color={T.ember} solid>{t}</Tag>
              ))}
              <div style={{ fontFamily: T.body, fontSize: 10, color: T.txt3, marginTop: 4 }}>
                {f.traits.map((t) => `${t}: ${TRAITS[t]}`).join(" · ")}
              </div>
            </div>
          )}

          {/* Ambition */}
          <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3, marginTop: 8 }}>
            🎯 Ambition: {f.ambitionRevealed
              ? <span style={{ color: T.gold, fontWeight: 600 }}>{f.ambition} — {AMBITIONS[f.ambition]}</span>
              : <span>??? (revealed after ~2 months in camp)</span>}
          </div>

          {/* Bio */}
          {f.bio && (
            <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt2, marginTop: 6,
              fontStyle: "italic", lineHeight: 1.4, padding: "8px 12px",
              background: T.bg, borderRadius: T.r, borderLeft: `3px solid ${ac}` }}>
              {f.bio}
            </div>
          )}

          {/* Relationships */}
          {g.relationships && g.roster.length > 1 && (() => {
            const scores = g.roster.filter((x) => x.id !== f.id)
              .map((x) => ({ name: x.name, score: getRel(g, f.id, x.id) }))
              .sort((a, b) => b.score - a.score);
            if (!scores[0] || (scores[0].score <= 15 && scores[scores.length - 1].score >= -15)) return null;
            return (
              <div style={{ fontFamily: T.body, fontSize: 10, color: T.txt3, marginTop: 8 }}>
                {scores[0] && scores[0].score > 15 &&
                  <Tag color={T.pos}>🤝 {scores[0].name}: +{Math.round(scores[0].score)}</Tag>}
                {scores.length > 1 && scores[scores.length - 1].score < -15 &&
                  <Tag color={T.neg}>⚡ {scores[scores.length - 1].name}: {Math.round(scores[scores.length - 1].score)}</Tag>}
              </div>
            );
          })()}

          {/* Contract */}
          {f.contract && (
            <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt2, marginTop: 8 }}>
              📄 Contract: cut <b style={{ color: T.txt }}>{Math.round(f.contract.managerCut * 100)}%</b>
              {" · "}left <b style={{ color: f.contract.fightsLeft <= 1 ? T.neg : T.txt }}>{f.contract.fightsLeft}/{f.contract.fightsTotal}</b> fights
              {" · "}{f.contract.durationMo}mo · {AGENT_TYPES[f.agent || "none"].label}
            </div>
          )}

          {/* Weight class delta */}
          {f.weightClassDelta != null && f.weightClassDelta !== 0 && (
            <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3, marginTop: 6 }}>
              ⚖️ Class change: <b style={{ color: f.weightClassDelta > 0 ? T.neg : T.steel }}>
                {f.weightClassDelta > 0 ? `↑ +${f.weightClassDelta}` : `↓ ${Math.abs(f.weightClassDelta)}`}</b>
              {" "}— strength ±{Math.abs(f.weightClassDelta) * 2}% · footwork ∓{Math.abs(f.weightClassDelta) * 1.5}%
            </div>
          )}

          {/* Fight History */}
          {f.fightHistory && f.fightHistory.length > 0 && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${T.line}`, paddingTop: 10 }}>
              <Eyebrow>Fight History ({f.fightHistory.length})</Eyebrow>
              <div style={{ display: "grid", gap: 3 }}>
                {[...f.fightHistory].reverse().slice(0, 8).map((h, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between",
                    fontFamily: T.mono, fontSize: 10, padding: "2px 0",
                    color: h.result === "W" ? T.pos : h.result === "D" ? T.txt3 : T.neg }}>
                    <span>W{h.week} · vs <b>{h.opponent}</b></span>
                    <span>{h.result} · {h.method} R{h.round} {h.title ? "🏆" : ""} · {h.tier}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Training Progress */}
          {f.trainingHistory && f.trainingHistory.length >= 2 && (() => {
            const first = f.trainingHistory[0].attrs;
            const last = f.trainingHistory[f.trainingHistory.length - 1].attrs;
            const keys = ATTRS.filter(k => Math.abs(last[k] - first[k]) > 0.5);
            if (keys.length === 0) return null;
            return (
              <div style={{ marginTop: 10 }}>
                <Eyebrow>Progress ({f.trainingHistory.length} weeks)</Eyebrow>
                {keys.slice(0, 4).map(k => {
                  const delta = Math.round((last[k] - first[k]) * 10) / 10;
                  const pct = Math.round(f.attrs[k] / f.ceilings[k] * 100);
                  return (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between",
                      fontFamily: T.body, fontSize: 10, color: T.txt3, marginBottom: 2 }}>
                      <span>{ATTR_LABEL[k]}: <b style={{ color: delta > 0 ? T.pos : T.neg }}>
                        {delta > 0 ? "+" : ""}{delta}</b> → {Math.round(f.attrs[k])}/{f.ceilings[k]} ({pct}%)
                      </span>
                      {pct >= 90 && <span style={{ color: T.gold }}>⚠️ Plateau</span>}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Overtraining alert */}
          {f.overtraining >= 50 && (
            <div style={{ fontFamily: T.body, fontSize: 12, fontWeight: 600, marginTop: 8,
              padding: "6px 10px", background: `${T.neg}18`, borderRadius: T.r,
              color: f.overtraining >= 75 ? T.neg : T.warn }}>
              {f.overtraining >= 90 ? "💀 Breakdown risk!" : f.overtraining >= 75 ? "🔴 Severe overtraining — switch to Recovery" : "🟡 Overtraining building — caution"}
            </div>
          )}

          {/* Training controls */}
          {!f.booked && !f.injury && (
            <div style={{ marginTop: 14, borderTop: `1px solid ${T.line}`, paddingTop: 12 }}>
              <Eyebrow>Training · {fmt$(TRAINING[f.training.type].cost)}/week</Eyebrow>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {Object.entries(TRAINING).filter(([k]) => k !== "fightcamp").map(([k, t]) => (
                  <button key={k} onClick={() => up((g2) => { g2.roster.find((x) => x.id === f.id).training.type = k; })}
                    style={{ fontFamily: T.disp, fontWeight: 600, fontSize: 12, letterSpacing: .8,
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
                  <button key={k} onClick={() => up((g2) => { g2.roster.find((x) => x.id === f.id).training.intensity = k; })}
                    style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, padding: "4px 10px",
                      borderRadius: T.r, cursor: "pointer",
                      border: f.training.intensity === k ? "none" : `1px solid ${T.line}`,
                      background: f.training.intensity === k ? T.ember : "transparent",
                      color: f.training.intensity === k ? T.bg : T.txt3 }}>
                    {k.toUpperCase()}
                  </button>
                ))}
                <span style={{ fontFamily: T.body, fontSize: 10, color: T.txt3 }}>hard = gains↑ risk↑</span>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
