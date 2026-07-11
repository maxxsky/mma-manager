import React from "react";
import { fmt$ } from "../engine/rng.js";
import { ARCH_COLOR, TRAINING, INTENSITY } from "../engine/data.js";
import { avgSkill } from "../engine/fighter.js";
import { reducer } from "../engine/reducer.js";
import { getStoryTags, getLifecyclePhase } from "../engine/career.js";
import { generateFighterNickname } from "../engine/identity.js";
import { getTrainingCycle, getCoachRecommendation, getDevelopmentPhilosophy, getTrainingIdentity, saveLastTraining } from "../engine/training-philosophy.js";
import { getCoachArchetypeSynergy, getFightStyleSummary, getArchetypeBehavior } from "../engine/archetype-expression.js";
import { T, Panel, Eyebrow, Tag, Btn, Ovr, Mono, AttrTele, Meter, OctaRadar, Icon, ICONS, heat } from "./theme.jsx";

export default function FighterDetail({ f, g, onBack, up, dispatch }) {
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
                {(() => { const nick = generateFighterNickname(f); return nick ? <div style={{ fontFamily: T.body, fontSize: 12, color: T.gold, fontStyle: "italic", letterSpacing: .5 }}>"{nick}"</div> : null; })()}
              <div style={{ marginTop: 6 }}>
                <Tag color={ac} solid>{f.archetype}</Tag><Tag color={T.txt2}>{f.weightClass}</Tag>
                <Tag color={T.txt2}>{f.age ?? "?"}y</Tag><Tag color={T.txt2}>{f.reach ?? "?"}cm reach</Tag>
                {f.titles?.length > 0 ? <Tag color={T.gold} solid>♛ Champion</Tag> : f.rank ? <Tag color={T.gold}>Rank #{f.rank}</Tag> : null}
              </div>
            </div>
            <div style={{ display: "flex", gap: 22, alignItems: "center" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: T.mono, fontSize: 26, fontWeight: 700, color: T.txt }}>
                  {f.record?.w ?? 0}-{f.record?.l ?? 0}</div>
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
          {/* Lifecycle phase */}
          {(() => {
            const lc = getLifecyclePhase(f);
            return (
              <div style={{ marginBottom: 8 }}>
                <Tag color={T.steel} title={lc.desc}>{lc.label}</Tag>
              </div>
            );
          })()}
          {/* Reign history */}
          {f.reignHistory && f.reignHistory.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.gold, marginBottom: 4 }}>Title Reigns</div>
              {f.reignHistory.map((r, i) => (
                <div key={i} style={{ fontFamily: T.body, fontSize: 11, color: T.txt2, marginBottom: 2 }}>
                  👑 {r.weightClass} — sejak minggu {r.wonWeek}
                </div>
              ))}
            </div>
          )}
          {/* Career story tags */}
          {(() => {
            const tags = getStoryTags(f);
            if (tags.length === 0) return null;
            return (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                {tags.map((t) => (
                  <Tag key={t.tag} color={t.color} title={t.desc}>{t.tag}</Tag>
                ))}
              </div>
            );
          })()}
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
              {dispatch && (
                <Btn sm ghost style={{ marginTop: 8, width: "100%" }}
                  onClick={() => dispatch({ type: "SIGN_CONTRACT_PRE", mode: "extend", fighterId: f.id, fighter: f })}>
                  Perpanjang Kontrak
                </Btn>
              )}
              {f.titles?.includes("Major World Champion") && g.divisions?.[f.weightClass]?.champ?.fighterId === f.id && (
                <Btn sm ghost color={T.neg} style={{ marginTop: 8, width: "100%" }}
                  onClick={() => {
                    if (window.confirm(`Yakin mau vacate title ${f.weightClass}? ${f.name} akan kehilangan gelar juara.`)) {
                      dispatch({ type: "VACATE_TITLE", fighterId: f.id });
                    }
                  }}>
                  Vacate Title
                </Btn>
              )}
              {f.promotionContract && f.promotionContract.fightsLeft > 0 && (() => {
                const prom = g.promotions?.find((p) => p.id === f.promotionContract.promotionId);
                if (!prom) return null;
                return (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: T.bg, borderRadius: T.r, border: `1px solid ${T.steel}44` }}>
                    <div style={{ fontFamily: T.body, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: T.steel }}>Exclusive to</div>
                    <div style={{ fontFamily: T.body, fontSize: 13, fontWeight: 600, color: T.txt }}>{prom.name}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 11, color: T.txt3 }}>{f.promotionContract.fightsLeft}/{f.promotionContract.fightsTotal} fights remaining</div>
                  </div>
                );
              })()}
            </>
          )}
        </Panel>

        {/* Training assignment */}
        <Panel style={{ gridColumn: "span 2" }}>
          <Eyebrow color={T.ember}>Training</Eyebrow>
            {/* Training Cycle */}
            {(() => {
              const cycle = getTrainingCycle(f);
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 16 }}>{cycle.icon}</span>
                  <span style={{ fontFamily: T.disp, fontSize: 14, fontWeight: 700, color: cycle.phase === 'recovery' || cycle.phase === 'warning' ? T.warn : T.steel, textTransform: 'uppercase', letterSpacing: 1 }}>{cycle.label}</span>
                  <span style={{ fontFamily: T.body, fontSize: 11, color: T.txt3 }}>{cycle.desc}</span>
                </div>
              );
            })()}
            {/* Development Philosophy */}
            {(() => {
              const philosophies = getDevelopmentPhilosophy(f);
              if (!philosophies || philosophies.length === 0) return null;
              return (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {philosophies.slice(0, 2).map(p => (
                    <Tag key={p.id} color={T.steel}>{p.label}</Tag>
                  ))}
                </div>
              );
            })()}
            {/* Fighting Style */}
            {(() => {
              const style = getFightStyleSummary(f);
              if (!style) return null;
              return (
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                  <Tag color={ac} solid>{style.style}</Tag>
                  {style.isFinisher && <Tag color={T.ember}>Finisher</Tag>}
                  {style.isGrinder && <Tag color={T.steel}>Decision Machine</Tag>}
                </div>
              );
            })()}
            {/* Coach Recommendation */}
            {(() => {
              const coach = g.coaches?.[0];
              if (!coach) return null;
              const recs = getCoachRecommendation(coach, f);
              const synergy = coach ? getCoachArchetypeSynergy(coach, f) : null;
              if (!recs || recs.length === 0) {
                if (synergy) {
                  return (
                    <div style={{ padding: '6px 10px', background: T.bg, borderRadius: T.r, marginBottom: 8, fontFamily: T.body, fontSize: 11, color: T.txt3, fontStyle: 'italic', borderLeft: '2px solid ' + T.steel }}>
                      {coach.name} ({coach.specialty}) · {synergy.label}: {synergy.rating === 'perfect' ? '⭐ Ideal synergy with ' + f.archetype : synergy.rating === 'good' ? 'Good fit' : 'Adequate'}
                    </div>
                  );
                }
                return null;
              }
              return (
                <div style={{ padding: '6px 10px', background: T.bg, borderRadius: T.r, marginBottom: 8, fontFamily: T.body, fontSize: 11, color: T.txt3, fontStyle: 'italic', borderLeft: '2px solid ' + T.steel }}>
                  {recs[0].reason}
                  {synergy && <span style={{ display: 'block', marginTop: 2, color: synergy.rating === 'perfect' ? T.pos : T.txt3, fontSize: 10 }}>Synergy: {synergy.label}</span>}
                </div>
              );
            })()}
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <div style={{ fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                textTransform: "uppercase", color: T.txt3, marginBottom: 8 }}>Program</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(TRAINING).map(([k, v]) => {
                  const active = f.booked ? k === "fightcamp" : f.training?.type === k;
                  return (
                    <button key={k} className="chip" disabled={!!f.booked}
                            onClick={() => { saveLastTraining(f, k, f.training?.intensity || "Medium"); dispatch({ type: "SET_TRAINING", fighterId: f.id, program: k, intensity: f.training?.intensity || "Medium" }); }}
                      style={{ fontFamily: T.body, fontSize: 11, fontWeight: 600, padding: "6px 12px",
                        borderRadius: 8, cursor: f.booked ? "default" : "pointer", border: `1px solid ${active ? T.ember : T.line}`,
                        background: active ? `${T.ember}22` : "transparent", color: active ? T.ember : T.txt3,
                        opacity: f.booked && k !== "fightcamp" ? 0.4 : 1 }}>
                      {v.label} {k === "fightcamp" ? "🔒" : `$${v.cost}/wk`}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ minWidth: 140 }}>
              <div style={{ fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                textTransform: "uppercase", color: T.txt3, marginBottom: 8 }}>Intensity</div>
              <div style={{ display: "flex", gap: 4 }}>
                {Object.entries(INTENSITY).map(([k, v]) => {
                  const active = f.training?.intensity === k;
                  return (
                    <button key={k} className="chip" disabled={!!f.booked}
                      onClick={() => { const type = f.booked ? "fightcamp" : f.training?.type || "striking"; dispatch({ type: "SET_TRAINING", fighterId: f.id, program: type, intensity: k }); }}
                      style={{ fontFamily: T.body, fontSize: 11, fontWeight: 600, padding: "5px 10px",
                        borderRadius: 6, cursor: f.booked ? "default" : "pointer", border: `1px solid ${active ? T.gold : T.line}`,
                        background: active ? `${T.gold}22` : "transparent", color: active ? T.gold : T.txt3 }}>
                      {k} <span style={{ fontSize: 9, color: T.txt3 }}>{Math.round(v.mult * 100)}%</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
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

        {/* Training Progress — delta from trainingHistory */}
        {f.trainingHistory && f.trainingHistory.length >= 2 && (() => {
          const first = f.trainingHistory[0].attrs;
          const last = f.trainingHistory[f.trainingHistory.length - 1].attrs;
          const weeks = f.trainingHistory.length;
          const deltas = [];
          for (const k of ["striking","wrestling","bjj","footwork","strength","cardio","chin","fightIQ"]) {
            const d = (last[k] || 0) - (first[k] || 0);
            if (Math.abs(d) > 0.5) deltas.push({ key: k, delta: d, now: Math.round(f.attrs[k] || 0), ceil: f.ceilings?.[k] || 99 });
          }
          if (deltas.length === 0) return null;
          const labels = { striking: "Striking", wrestling: "Wrestling", bjj: "BJJ", footwork: "Footwork", strength: "Strength", cardio: "Cardio", chin: "Chin", fightIQ: "Fight IQ" };
          return (
            <Panel style={{ gridColumn: "span 2" }}>
              <Eyebrow color={T.pos}>Progress ({weeks} weeks)</Eyebrow>
              <div style={{ display: "grid", gap: 6 }}>
                {deltas.map(({ key, delta, now, ceil }) => {
                  const pct = Math.round((now / ceil) * 100);
                  const plateau = pct >= 90;
                  return (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: T.body, fontSize: 11, color: T.txt3, width: 72, textAlign: "right" }}>{labels[key]}</span>
                      <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: delta > 0 ? T.pos : T.neg, minWidth: 50 }}>
                        {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                      </span>
                      <div style={{ flex: 1, height: 6, background: T.bg, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: pct >= 90 ? T.gold : pct >= 70 ? T.pos : T.steel, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontFamily: T.mono, fontSize: 11, color: T.txt2, minWidth: 44 }}>{now}/{ceil}</span>
                      {plateau && <Tag color={T.warn}>Plateau</Tag>}
                    </div>
                  );
                })}
              </div>
            </Panel>
          );
        })()}
      </div>
    </div>
  );
}
