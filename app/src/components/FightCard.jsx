// FightCard — pre-fight Tale of the Tape
// Visual layout from FightCardFull, simplified API for current flow.
import { fmt$ } from "../engine/rng.js";
import React from "react";
import { ARCH_COLOR } from "../engine/data.js";
import { T, Panel, Eyebrow, Tag, Btn, Mono, CompareBar } from "../ui/theme.jsx";

export default function FightCard({ fighter, g, onProceed }) {
  const f = fighter;
  const m = f?.booked;
  if (!f || !m) return null;

  const ca = ARCH_COLOR[f.archetype] || T.steel;
  const cb = ARCH_COLOR[m.opponent?.archetype] || T.steel;
  const rows = [
    ["Striking", "striking"], ["Footwork", "footwork"], ["Wrestling", "wrestling"],
    ["BJJ", "bjj"], ["Strength", "strength"], ["Cardio", "cardio"],
    ["Chin", "chin"], ["Fight IQ", "fightIQ"],
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 55, background: "rgba(6,9,14,.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14, overflowY: "auto" }}>
      <div style={{ maxWidth: 860, width: "100%", maxHeight: "95vh", overflowY: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16, alignItems: "start" }}>
          {/* LEFT — Event banner + Fighters + Tale of the Tape */}
          <Panel pad={0} style={{ overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", background: `linear-gradient(120deg, ${T.raised}, ${T.surface})`,
              borderBottom: `1px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {m.isMainEvent && <Tag color={T.ember} solid>Main Event</Tag>}
                  {m.title && <Tag color={T.gold}>{m.titleTier || "Title"}</Tag>}
                  <Tag color={T.steel}>{m.tier}</Tag>
                </div>
                <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 22, textTransform: "uppercase", color: T.txt, marginTop: 6, letterSpacing: .5 }}>
                  {m.titleText ? m.titleText.replace(/^[🏆🌟🥇🌍⚡👑\s]+/, "") : `${m.tier} Fight Night`}
                </div>
                <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3 }}>
                  {m.opponent?.name} · {m.opponent?.archetype} · {m.weeks ? `T-${m.weeks}w` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: T.body, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.txt3 }}>Notice</div>
                <div style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, color: T.ember }}>T-{m.weeks || "?"}w</div>
              </div>
            </div>

            {/* Fighters */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", padding: "20px 20px 8px", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <Mono name={f.name} color={ca} size={58} champ={f.titles?.length > 0} />
                <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 19, textTransform: "uppercase", color: T.txt, marginTop: 8 }}>{f.name}</div>
                <div style={{ fontFamily: T.mono, fontSize: 12, color: T.txt2 }}>{f.record?.w ?? 0}-{f.record?.l ?? 0}</div>
                <Tag color={ca}>{f.archetype}</Tag>
              </div>
              <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 30, color: T.ember, textShadow: `0 0 20px ${T.ember}44` }}>VS</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <Mono name={m.opponent?.name} color={cb} size={58} />
                <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 19, textTransform: "uppercase", color: T.txt, marginTop: 8 }}>{m.opponent?.name}</div>
                <div style={{ fontFamily: T.mono, fontSize: 12, color: T.txt2 }}>
                  {m.opponent?.record?.w ?? "?"}-{m.opponent?.record?.l ?? "?"}
                  {m.oppRank != null && <span style={{ color: T.gold }}> · #{m.oppRank}</span>}
                </div>
                <Tag color={cb}>{m.opponent?.archetype}</Tag>
              </div>
            </div>

            {m.story && (
              <div style={{ margin: "4px 20px 12px", padding: "8px 12px", background: T.bg, borderRadius: T.r, borderLeft: `3px solid ${T.steel}` }}>
                <span style={{ fontFamily: T.body, fontSize: 12, fontStyle: "italic", color: T.txt2 }}>"{m.story}"</span>
              </div>
            )}

            <div style={{ padding: "8px 20px 18px" }}>
              <div style={{ textAlign: "center", fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.txt3, margin: "6px 0 10px" }}>Tale of the Tape</div>
              <CompareBar label="Age" a={f.age ?? 0} b={m.opponent?.age || 28} ca={ca} cb={cb} />
              <div style={{ height: 1, background: T.line, margin: "8px 0" }} />
              {rows.map(([lb, k]) => (
                <CompareBar key={k} label={lb} a={Math.round(f.attrs[k])} b={Math.round(m.opponent?.attrs?.[k] || 50)} ca={ca} cb={cb} />
              ))}
            </div>
          </Panel>

          {/* RIGHT — Purse & actions */}
          <Panel>
            <Eyebrow>Purse & terms</Eyebrow>
            <div style={{ display: "grid", gap: 8 }}>
              {[["Show money", fmt$(m.show || 0), T.txt],
                ["Win bonus", fmt$(m.winBonus || 0), T.pos],
                ["Your cut", Math.round(((f.contract?.managerCut) || 0.18) * 100) + "%", T.txt2],
              ].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: T.bg, borderRadius: T.r }}>
                  <span style={{ fontFamily: T.body, fontSize: 12, color: T.txt2 }}>{l}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: c }}>{v}</span>
                </div>
              ))}
            </div>
            {m.defense && (
              <div style={{ padding: "8px 10px", background: `${T.neg}15`, border: `1px solid ${T.neg}44`, borderRadius: T.r, marginTop: 12, marginBottom: 12, textAlign: "center", fontFamily: T.body, fontSize: 11, color: T.neg, fontWeight: 600 }}>
                ⚠ MANDATORY — decline strips the belt
              </div>
            )}
            <div style={{ marginTop: 16 }}>
              <Btn color={T.ember} style={{ width: "100%" }} onClick={onProceed}>🔔 Enter the Cage</Btn>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
