import React, { useState } from "react";
import { R, clamp, fmt$ } from "../engine/rng.js";
import { ATTRS, ATTR_LABEL, WEIGHTS, ARCH_COLOR, TRAITS, AMBITIONS, TRAINING, INTENSITY, AGENT_TYPES, EXTERNAL_PARTNERS } from "../engine/data.js";
import { avgSkill, tierOf } from "../engine/fighter.js";
import { rankOf, vacateTitle } from "../engine/rankings.js";
import { getRel } from "../engine/relationships.js";
import { C, DISPLAY, cut, Card, H, Btn, Tag, Bar, OVR } from "./theme.jsx";

export default function FighterCard({ f, g, up }) {
  const [open, setOpen] = useState(false);
  const ac = ARCH_COLOR[f.archetype];
  const r = rankOf(g, f);
  const div = g.divisions && g.divisions[f.weightClass];
  const isChamp = div && div.champ.player && div.champ.fighterId === f.id;

  return (
    <Card accent={ac}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", cursor: "pointer" }} onClick={() => setOpen(!open)}>
        <OVR f={f} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: DISPLAY, color: C.chalk, fontSize: 17, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {f.name} {f.titles.length > 0 && "👑"}
          </div>
          <div style={{ marginTop: 2 }}>
            <Tag color={ac}>{f.archetype}</Tag><Tag color={C.dim}>{f.weightClass}</Tag><Tag color={C.dim}>{f.age} th</Tag>{isChamp ? <Tag color={C.gold}>👑 Champ</Tag> : r ? <Tag color={C.gold}>Rank #{r}</Tag> : null}
          </div>
          <div style={{ color: C.dim, fontSize: 11, marginTop: 3 }}>
            {f.record.w}-{f.record.l} ({f.record.ko} KO · {f.record.sub} SUB) · {tierOf(f)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          {f.injury ? <div style={{ color: f.injury.tier >= 3 ? "#ff2216" : f.injury.tier >= 2 ? C.red : f.injury.tier >= 1 ? C.gold : C.dim, fontFamily: DISPLAY, fontSize: 12, letterSpacing: 1 }}>{f.injury.label || "🚑"} {f.injury.weeks} MGG{f.injury.tier >= 3 ? " ⚠️" : ""}</div>
            : f.booked ? <div style={{ color: C.gold, fontFamily: DISPLAY, fontSize: 12, letterSpacing: 1 }}>🥊 T-{f.booked.weeksLeft}</div>
            : <div style={{ color: C.dim, fontSize: 11 }}>{TRAINING[f.training.type].label}</div>}
          <div style={{ color: C.dim, fontSize: 12, marginTop: 4 }}>{open ? "▲" : "▼"}</div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 14px" }}>
            {ATTRS.map((k) => (
              <div key={k}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: 1 }}>
                  <span>{ATTR_LABEL[k]}</span>
                  <span style={{ color: C.chalk, fontFamily: DISPLAY, fontSize: 12 }}>{Math.round(f.attrs[k])}<span style={{ color: "#42506a" }}>/{f.ceilings[k]}</span></span>
                </div>
                <Bar v={f.attrs[k]} color={f.attrs[k] / f.ceilings[k] > 0.9 ? C.gold : ac} h={6} />
              </div>
            ))}
          </div>
          {g.relationships && g.roster.length > 1 && (() => {
            const scores = g.roster.filter((x) => x.id !== f.id).map((x) => ({ name: x.name, score: getRel(g, f.id, x.id) })).sort((a, b) => b.score - a.score);
            return <div style={{ color: C.dim, fontSize: 10, marginTop: 5 }}>
              {scores[0] && scores[0].score > 15 && <span style={{ marginRight: 8 }}>🟢 {scores[0].name}: <b style={{ color: C.green }}>+{Math.round(scores[0].score)}</b></span>}
              {scores.length > 1 && scores[scores.length - 1].score < -15 && <span>🔴 {scores[scores.length - 1].name}: <b style={{ color: C.red }}>{Math.round(scores[scores.length - 1].score)}</b></span>}
            </div>;
          })()}
          <div style={{ marginTop: 10 }}>{f.traits.map((t) => <Tag key={t} color={C.red}>{t}</Tag>)}</div>
          <div style={{ color: C.dim, fontSize: 10, marginTop: 3 }}>{f.traits.map((t) => `${t}: ${TRAITS[t]}`).join(" · ")}</div>
          <div style={{ color: C.dim, fontSize: 10, marginTop: 4 }}>
            🎯 Ambisi: {f.ambitionRevealed ? <span style={{ color: C.gold }}>{f.ambition} — {AMBITIONS[f.ambition]}</span> : <span>??? (terungkap setelah ±2 bulan di camp, atau lewat scout grade S)</span>}
          </div>
          {f.bio && (
            <div style={{ color: C.dim, fontSize: 9, marginTop: 3, fontStyle: "italic", lineHeight: 1.3 }}>
              📖 {f.bio}
            </div>
          )}
          {f.contract && (
            <div style={{ color: C.dim, fontSize: 10, marginTop: 4 }}>
              📄 Kontrak: cut <b style={{ color: C.chalk }}>{Math.round(f.contract.managerCut * 100)}%</b> · sisa <b style={{ color: f.contract.fightsLeft <= 1 ? C.red : C.chalk }}>{f.contract.fightsLeft}/{f.contract.fightsTotal}</b> fight · {f.contract.durationMo} bln · 🤝 {AGENT_TYPES[f.agent || "none"].label}
            </div>
          )}
          {f.weightClassDelta != null && f.weightClassDelta !== 0 && (
            <div style={{ color: C.dim, fontSize: 10, marginTop: 2 }}>
              ⚖️ Perubahan kelas: <b style={{ color: f.weightClassDelta > 0 ? C.red : C.blue }}>{f.weightClassDelta > 0 ? `↑ Naik ${f.weightClassDelta} kelas` : `↓ Turun ${Math.abs(f.weightClassDelta)} kelas`}</b> — strength ±{Math.abs(f.weightClassDelta) * 2}% · footwork ∓{Math.abs(f.weightClassDelta) * 1.5}%
            </div>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 9, color: C.dim, textTransform: "uppercase", letterSpacing: 1 }}>
            <div style={{ flex: 1 }}>Morale<Bar v={f.morale} color={f.morale > 60 ? C.green : C.red} h={6} /></div>
            <div style={{ flex: 1 }}>Overtraining<Bar v={f.overtraining} color={f.overtraining > 50 ? C.red : C.gold} h={6} /></div>
            <div style={{ flex: 1 }}>Popularity<Bar v={f.popularity} color={C.gold} h={6} /></div>
          </div>
          {!f.injury && !f.booked && (
            <div style={{ marginTop: 10, color: C.dim, fontSize: 10, fontStyle: "italic" }}>
              ⚖️ Pindah kelas sekarang berdasarkan permintaan fighter — cek inbox untuk request pindah divisi. 
              Dipicu oleh performa (lose streak, win streak, age) dan ambisi fighter.
            </div>
          )}
          {!f.booked && !f.injury && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Program minggu ini · {fmt$(TRAINING[f.training.type].cost)}/mgg</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {Object.entries(TRAINING).filter(([k]) => k !== "fightcamp").map(([k, t]) => (
                  <button key={k} onClick={() => up((g2) => { g2.roster.find((x) => x.id === f.id).training.type = k; })}
                    style={{ background: f.training.type === k ? C.gold : C.panel2, color: f.training.type === k ? "#0a0d14" : C.chalk, border: `1px solid ${C.line}`, padding: "4px 9px", fontSize: 11, cursor: "pointer", fontFamily: DISPLAY, letterSpacing: 1, textTransform: "uppercase", ...cut(5) }}>
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 5, marginTop: 6, alignItems: "center" }}>
                {Object.keys(INTENSITY).map((k) => (
                  <button key={k} onClick={() => up((g2) => { g2.roster.find((x) => x.id === f.id).training.intensity = k; })}
                    style={{ background: f.training.intensity === k ? C.red : C.panel2, color: f.training.intensity === k ? "#fff" : C.dim, border: `1px solid ${C.line}`, padding: "4px 9px", fontSize: 11, cursor: "pointer", fontFamily: DISPLAY, letterSpacing: 1, ...cut(5) }}>
                    {k.toUpperCase()}
                  </button>
                ))}
                <span style={{ color: C.dim, fontSize: 9 }}>keras = gain↑ risiko↑</span>
              </div>
              {/* External sparring partner */}
              {f.training.type === "sparring" && (
                <div style={{ marginTop: 8, borderTop: `1px solid ${C.line}44`, paddingTop: 8 }}>
                  <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>
                    {f.externalPartner ? `🤝 External: ${f.externalPartner.archetype} (level ${f.externalPartner.level}) · ${f.externalPartner.weeksLeft} mgg` : "🤝 Hire External Sparring Partner"}
                  </div>
                  {!f.externalPartner ? (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {Object.entries(EXTERNAL_PARTNERS).map(([k, p]) => (
                        <button key={k} onClick={() => up((g2) => {
                          const nf = g2.roster.find((x) => x.id === f.id);
                          if (!nf || g2.cash < p.cost) return;
                          g2.cash -= p.cost;
                          const archs = Object.keys(ARCH_COLOR);
                          nf.externalPartner = {
                            archetype: archs[Math.floor(Math.random() * archs.length)],
                            level: Math.round(p.levelRange[0] + Math.random() * (p.levelRange[1] - p.levelRange[0])),
                            weeksLeft: 4, cost: p.cost, tier: k,
                          };
                          g2.log.unshift(`🤝 ${nf.name} hire ${k.toLowerCase()} — ${nf.externalPartner.archetype} (level ${nf.externalPartner.level}), 4 minggu.`);
                        })}
                          style={{ background: C.panel2, color: C.chalk, border: `1px solid ${C.line}`, padding: "4px 8px", fontSize: 9, cursor: "pointer", ...cut(4) }}
                          title={p.desc}>
                          {k} · {fmt$(p.cost)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button onClick={() => up((g2) => {
                      const nf = g2.roster.find((x) => x.id === f.id);
                      if (nf) nf.externalPartner = null;
                    })} style={{ background: "none", border: `1px solid ${C.red}44`, color: C.red, padding: "3px 8px", fontSize: 9, cursor: "pointer", ...cut(4) }}>Akhiri kontrak</button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
