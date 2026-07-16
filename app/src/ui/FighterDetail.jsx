import React, { useState, useEffect } from "react";
import { fmt$ } from "../engine/rng.js";
import { ARCH_COLOR, TRAINING, INTENSITY, TRAITS } from "../engine/data.js";
import { avgSkill } from "../engine/fighter.js";
import { reducer } from "../engine/reducer.js";
import { getStoryTags, getLifecyclePhase } from "../engine/career.js";
import { generateFighterNickname } from "../engine/identity.js";
import { getPublicOpinion } from "../engine/publicOpinion.js";
import { getTrainingCycle, getCoachRecommendation, getDevelopmentPhilosophy, getTrainingIdentity, saveLastTraining } from "../engine/training-philosophy.js";
import { getCoachArchetypeSynergy, getFightStyleSummary, getArchetypeBehavior } from "../engine/archetype-expression.js";
import { T, Panel, Eyebrow, Tag, Btn, Ovr, Mono, AttrTele, Meter, OctaRadar, Icon, ICONS, heat } from "./theme.jsx";
import { t } from "../i18n/index.js";

export default function FighterDetail({ f, g, onBack, up, dispatch }) {
  const ac = ARCH_COLOR[f.archetype];
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const groups = [
    ["ATTR.striking", [["striking", "ATTR.striking"], ["footwork", "ATTR.footwork"]]],
    ["FIGHTER.groupGrappling", [["wrestling", "ATTR.wrestling"], ["bjj", "ATTR.bjj"]]],
    ["FIGHTER.groupPhysical", [["strength", "ATTR.strength"], ["cardio", "ATTR.cardio"]]],
    ["FIGHTER.groupDurability", [["chin", "ATTR.chin"], ["fightIQ", "ATTR.fightIQ"]]],
  ];

  return (
    <div>
      {onBack && <Btn sm ghost onClick={onBack} style={{ marginBottom: 14 }}>{t("FIGHTER.backRoster")}</Btn>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>
        {/* identity header spans full width */}
        <Panel style={{ gridColumn: "span 2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Mono name={f.name} color={ac} size={64} region={f.region} titleTier={f.titles?.length > 0 ? (f.titles?.includes("Major World Champion") ? "Major" : "National") : null} />
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
              <Eyebrow>{t("FIGHTER.attrsHeader")}</Eyebrow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 22px" }}>
                {groups.map(([gn, rows]) => (
                  <div key={gn} style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
                      textTransform: "uppercase", color: ac, marginBottom: 6,
                      paddingBottom: 4, borderBottom: `1px solid ${T.line}` }}>{t(gn)}</div>
                    {rows.map(([k, lb]) => <AttrTele key={k} label={t(lb)} v={Math.round(f.attrs[k])} ceil={f.ceilings[k]} />)}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8 }}>
              <OctaRadar attrs={f.attrs} color={ac} />
              <div style={{ fontFamily: T.body, fontSize: 10, color: T.txt3, letterSpacing: 1,
                textTransform: "uppercase", marginTop: 4 }}>{t("FIGHTER.fightProfile")}</div>
            </div>
          </div>
        </Panel>

        {/* right: traits / ambition / contract / condition */}
        <Panel>
          <Eyebrow>{t("FIGHTER.profile")}</Eyebrow>
          <div style={{ marginBottom: 14 }}>
            {f.traits?.map((t) => (
              <Tag key={t} color={t.includes("Glass") || t.includes("Chinny") ? T.neg : T.ember} title={TRAITS[t] || ""}>{t}</Tag>
            ))}
          </div>
          {f.ambition && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
              background: T.bg, borderRadius: T.r, marginBottom: 16 }}>
              <span style={{ color: T.gold, display: "flex" }}><Icon d={ICONS.rank} size={15} /></span>
              <span style={{ fontFamily: T.body, fontSize: 12, color: T.txt2 }}>
                {t("FIGHTER.ambition")} <b style={{ color: T.gold }}>{f.ambition}</b></span>
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
              <div style={{ fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.gold, marginBottom: 4 }}>{t("FIGHTER.titleReigns")}</div>
              {f.reignHistory.map((r, i) => (
                <div key={i} style={{ fontFamily: T.body, fontSize: 11, color: T.txt2, marginBottom: 2 }}>
                  {t("FIGHTER.reignLine").replace("{0}", r.weightClass).replace("{1}", r.wonWeek)}
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
            {(() => {
              const po = getPublicOpinion(f);
              const opinionColor = po.sentiment === "positive" ? T.pos : po.sentiment === "negative" ? T.neg : T.txt2;
              return (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 8px", background: `${opinionColor}10`, borderRadius: T.r, border: `1px solid ${opinionColor}33` }}>
                  <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: opinionColor }}>{po.label}</span>
                  <span style={{ fontFamily: T.body, fontSize: 9, color: T.txt3 }}>{po.description}</span>
                </div>
              );
            })()}
            <Meter label="Loyalty" v={f.loyalty ?? 50} color={f.loyalty >= 60 ? T.pos : T.warn} />
          </div>
          {f.contract && (
            <>
              <Eyebrow>{t("FIGHTER.contract")}</Eyebrow>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[[t("FIGHTER.managerCut"), Math.round(f.contract.managerCut * 100) + "%"],
                  [t("FIGHTER.fightsLeft"), `${f.contract.fightsLeft}/${f.contract.fightsTotal}`],
                  [t("FIGHTER.duration"), f.contract.durationMo + " mo"],
                  [t("FIGHTER.agent"), f.agent || t("FIGHTER.agentNone")]].map(([l, v], i) => (
                  <div key={l} style={{ background: T.bg, borderRadius: T.r, padding: "8px 10px" }}>
                    <div style={{ fontFamily: T.body, fontSize: 9, letterSpacing: 1, textTransform: "uppercase",
                      color: T.txt3 }}>{l}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700,
                      color: i === 1 && f.contract.fightsLeft <= 1 ? T.neg : T.txt }}>{v}</div>
                  </div>
                ))}
              </div>
              {dispatch && (
                <Btn sm ghost style={{ marginTop: 8, width: "100%" }}
                  onClick={() => dispatch({ type: "SIGN_CONTRACT_PRE", mode: "extend", fighterId: f.id, fighter: f })}>
                  {t("FIGHTER.extendContract")}
                </Btn>
              )}
              {f.titles?.includes("Major World Champion") && g.divisions?.[f.weightClass]?.champ?.fighterId === f.id && (
                <Btn sm ghost color={T.neg} style={{ marginTop: 8, width: "100%" }}
                  onClick={() => {
                    if (window.confirm(t("FIGHTER.vacateConfirm").replace("{0}", f.weightClass).replace("{1}", f.name))) {
                      dispatch({ type: "VACATE_TITLE", fighterId: f.id });
                    }
                  }}>
                  {t("FIGHTER.vacateTitle")}
                </Btn>
              )}
              {f.promotionContract && f.promotionContract.fightsLeft > 0 && (() => {
                const prom = g.promotions?.find((p) => p.id === f.promotionContract.promotionId);
                if (!prom) return null;
                return (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: T.bg, borderRadius: T.r, border: `1px solid ${T.steel}44` }}>
                    <div style={{ fontFamily: T.body, fontSize: 9, letterSpacing: 1, textTransform: "uppercase", color: T.steel }}>{t("FIGHTER.exclusiveTo")}</div>
                    <div style={{ fontFamily: T.body, fontSize: 13, fontWeight: 600, color: T.txt }}>{prom.name}</div>
                    <div style={{ fontFamily: T.mono, fontSize: 11, color: T.txt3 }}>{t("FIGHTER.fightsRemaining").replace("{0}", f.promotionContract.fightsLeft).replace("{1}", f.promotionContract.fightsTotal)}</div>
                  </div>
                );
              })()}
            </>          )}
          {/* ── Rivalries ── */}
          {f.rivalries && Object.keys(f.rivalries).length > 0 && (() => {
            const sorted = Object.entries(f.rivalries).sort((a, b) => b[1].count - a[1].count || (b[1].wins + b[1].losses) - (a[1].wins + a[1].losses));
            const top = sorted[0];
            return (
              <div style={{ marginTop: 12 }}>
                <Eyebrow>{t("FIGHTER.rivalries")}</Eyebrow>
                <div style={{ display: "grid", gap: 6 }}>
                  {sorted.slice(0, 5).map(([name, r]) => {
                    const isCareerRival = top && name === top[0] && sorted.length > 1 && r.count >= 2;
                    const intensity = r.count >= 5 ? 3 : r.count >= 3 ? 2 : r.count >= 1 ? 1 : 0;
                    return (
                      <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: T.bg, borderRadius: T.r }}>
                        <span style={{ fontFamily: T.body, fontSize: 11, color: T.txt, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</span>
                        <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: r.wins > r.losses ? T.pos : r.losses > r.wins ? T.neg : T.txt2 }}>{r.wins}-{r.losses}</span>
                        <span style={{ fontFamily: T.mono, fontSize: 11, color: T.txt3 }}>{"🔥".repeat(intensity)}{"💧".repeat(3 - intensity)}</span>
                        {isCareerRival && <span style={{ fontFamily: T.mono, fontSize: 8, fontWeight: 700, letterSpacing: 0.5, color: T.ember, padding: "1px 5px", borderRadius: T.r, border: `1px solid ${T.ember}44`, background: `${T.ember}10` }}>{t("FIGHTER.careerRival")}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </Panel>

        {/* Training assignment */}
        <Panel style={{ gridColumn: "span 2" }}>
          <Eyebrow color={T.ember}>{t("FIGHTER.training")}</Eyebrow>
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
                  {style.isFinisher && <Tag color={T.ember}>{t("FIGHTER.finisher")}</Tag>}
                  {style.isGrinder && <Tag color={T.steel}>{t("FIGHTER.decisionMachine")}</Tag>}
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
                textTransform: "uppercase", color: T.txt3, marginBottom: 8 }}>{t("FIGHTER.program")}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {Object.entries(TRAINING).map(([k, v]) => {
                  const active = f.booked ? k === "fightcamp" : f.training?.type === k;
                  return (
                    <button key={k} className="chip" disabled={!!f.booked}
                            onClick={() => { saveLastTraining(f, k, f.training?.intensity || "Medium"); dispatch({ type: "SET_TRAINING", fighterId: f.id, program: k, intensity: f.training?.intensity || "Medium" }); }}
                      aria-label={`Select training program: ${v.label}`}
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
                textTransform: "uppercase", color: T.txt3, marginBottom: 8 }}>{t("FIGHTER.intensity")}</div>
              <div style={{ display: "flex", gap: 4 }}>
                {Object.entries(INTENSITY).map(([k, v]) => {
                  const active = f.training?.intensity === k;
                  return (
                    <button key={k} className="chip" disabled={!!f.booked}
                      onClick={() => { const type = f.booked ? "fightcamp" : f.training?.type || "striking"; dispatch({ type: "SET_TRAINING", fighterId: f.id, program: type, intensity: k }); }}
                      aria-label={`Select intensity: ${k}`}
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
            <Eyebrow>{t("FIGHTER.fightHistory")}</Eyebrow>
            {isMobile ? (
              <div style={{ display: "grid", gap: 2 }}>
                {[...f.fightHistory].reverse().slice(0, 10).map((h, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 4px", borderBottom: `1px solid ${T.line}22`,
                  }}>
                    <span style={{
                      fontFamily: T.disp, fontWeight: 700, fontSize: 13,
                      color: h.result === "W" ? T.pos : T.neg, minWidth: 16,
                    }}>
                      {h.result === "W" ? "W" : "L"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {h.opponent} · {h.method} R{h.round}
                      </div>
                      <div style={{ fontFamily: T.body, fontSize: 10, color: T.txt3, marginTop: 1 }}>
                        {h.tier} · {t("UI.week")} {h.week}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <>
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px 70px 90px 60px",
              padding: "0 4px 6px", borderBottom: `1px solid ${T.line}` }}>
              {["", t("UI.opponent"), t("FIGHTER.method"), t("SCORE.round"), t("UI.tier"), t("UI.week")].map((c, i) => (
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
            </>
            )}
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
          const labels = { striking: t("ATTR.striking"), wrestling: t("ATTR.wrestling"), bjj: t("ATTR.bjj"), footwork: t("ATTR.footwork"), strength: t("ATTR.strength"), cardio: t("ATTR.cardio"), chin: t("ATTR.chin"), fightIQ: t("ATTR.fightIQ") };
          return (
            <Panel style={{ gridColumn: "span 2" }}>
              <Eyebrow color={T.pos}>{t("FIGHTER.progress").replace("{0}", weeks)}</Eyebrow>
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
                      {plateau && <Tag color={T.warn}>{t("FIGHTER.plateau")}</Tag>}
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
