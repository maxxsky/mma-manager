import { fmt$ } from "@ironfist/engine/rng.js";
import React from "react";
import {
  ATTRS,
  ATTR_LABEL,
  WEIGHTS,
  ARCH_COLOR as DATA_ARCH_COLOR,
  AGENT_TYPES,
} from "@ironfist/engine/data.js";
import { scoutGrade } from "@ironfist/engine/fighter.js";
import {
  T,
  Panel,
  Eyebrow,
  Tag,
  Btn,
  Ovr,
  heat,
  ARCH_COLOR,
  Mono,
} from "./theme.jsx";

// Merge ARCH_COLOR from data.js and theme.jsx
const AC = { ...ARCH_COLOR, ...DATA_ARCH_COLOR };

export default function Scout({
  g,
  dispatch,
  t,
  fmt$,
  scoutFilterArch,
  setScoutFilterArch,
  scoutFilterWC,
  setScoutFilterWC,
  scoutFighter,
  tier,
}) {
  const grade = scoutGrade(g.rep);

  // tier may be a camp tier object (with .rosterCap) or a plain number
  const rosterCap =
    tier != null && typeof tier === "object" ? tier.rosterCap : tier ?? 8;

  const isRosterFull = g.roster.length >= rosterCap;

  // ── Diamond eligibility ──
  const facLevels = g.facilities ? Object.values(g.facilities) : [];
  const avgFacLevel = facLevels.length > 0 ? facLevels.reduce((s, v) => s + v, 0) / facLevels.length : 0;
  const diamondEligible = g.rep >= 20 && avgFacLevel >= 2;
  const diamondBlockReason = !diamondEligible
    ? `Fighter established belum melirik camp-mu — butuh reputasi (≥20) & fasilitas rata-rata ≥2. (Saat ini: rep ${g.rep}, fasilitas ${avgFacLevel.toFixed(1)})`
    : null;

  // ── scout methods ──
  const amateurMethods = [
    {
      label: "Local Amateur Circuit",
      cost: 75,
      level: [0.30, 0.45],
      desc: "Sirkuit amatir lokal — jangkauan sempit, cocok cari bakat kampung.",
    },
    {
      label: "Regional Tryouts",
      cost: 400,
      level: [0.35, 0.55],
      desc: "Tryout lintas daerah — jangkauan lebih luas, tetap di level amatir.",
    },
    {
      label: "National Scouting Trip",
      cost: 1200,
      level: [0.40, 0.60],
      desc: "Pencarian nasional — jangkauan terluas untuk level amatir.",
    },
  ];

  const diamondMethod = {
    label: "Diamond in the Rough",
    cost: 10000 + Math.floor(g.rep * 150),
    level: [1.0, 1.45],
    desc: "Fighter established kadang mempertimbangkan pindah camp — tapi cuma kalau reputasi & fasilitasmu meyakinkan.",
  };

  return (
    <>
      {/* ── Scouting Network Panel ── */}
      <Panel>
        <Eyebrow>{t("UI.scoutNetwork")} · {t("UI.grade")} {grade}</Eyebrow>
        <div
          style={{
            color: T.txt3,
            fontSize: 11,
            marginBottom: 12,
            lineHeight: 1.5,
          }}
        >
          Report accuracy improves with camp reputation. Low-grade reports can
          miss significantly. Use filters below to narrow your search.
        </div>

        {/* ── Archetype Filter ── */}
        <div
          style={{
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: T.txt3,
            }}
          >
            {t("UI.selectClass")}
          </span>
          <button
            onClick={() => setScoutFilterArch(null)}
            className="chip"
            style={{
              background: !scoutFilterArch ? T.gold : T.raised,
              color: !scoutFilterArch ? T.bg : T.txt3,
              border: `1px solid ${!scoutFilterArch ? T.gold : T.line}`,
              padding: "3px 8px",
              fontSize: 10,
              cursor: "pointer",
              borderRadius: T.r,
              fontFamily: T.body,
              fontWeight: 600,
            }}
          >
            All
          </button>
          {Object.keys(AC).map((arch) => {
            const active = scoutFilterArch === arch;
            return (
              <button
                key={arch}
                onClick={() =>
                  setScoutFilterArch(active ? null : arch)
                }
                className="chip"
                style={{
                  background: active ? AC[arch] : T.raised,
                  color: active ? "#fff" : T.txt3,
                  border: `1px solid ${active ? AC[arch] : T.line}`,
                  padding: "3px 8px",
                  fontSize: 10,
                  cursor: "pointer",
                  borderRadius: T.r,
                  fontFamily: T.body,
                  fontWeight: 600,
                }}
              >
                {arch}
                {active ? " ✓" : ""}
              </button>
            );
          })}
        </div>

        {/* ── Weight Class Filter ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: T.txt3,
            }}
          >
            {t("UI.division")}:
          </span>
          <button
            onClick={() => setScoutFilterWC(null)}
            className="chip"
            style={{
              background: !scoutFilterWC ? T.gold : T.raised,
              color: !scoutFilterWC ? T.bg : T.txt3,
              border: `1px solid ${!scoutFilterWC ? T.gold : T.line}`,
              padding: "3px 8px",
              fontSize: 10,
              cursor: "pointer",
              borderRadius: T.r,
              fontFamily: T.body,
              fontWeight: 600,
            }}
          >
            All
          </button>
          {WEIGHTS.map((w) => {
            const active = scoutFilterWC === w.name;
            return (
              <button
                key={w.name}
                onClick={() =>
                  setScoutFilterWC(active ? null : w.name)
                }
                className="chip"
                style={{
                  background: active ? T.gold : T.raised,
                  color: active ? T.bg : T.txt3,
                  border: `1px solid ${active ? T.gold : T.line}`,
                  padding: "3px 8px",
                  fontSize: 10,
                  cursor: "pointer",
                  borderRadius: T.r,
                  fontFamily: T.body,
                  fontWeight: 600,
                }}
              >
                {w.name}
                {active ? " ✓" : ""}
              </button>
            );
          })}
        </div>

        {/* ── Scout Options ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
            gap: 10,
          }}
        >
          {amateurMethods.map((m) => {
            const canAfford = g.cash >= m.cost;
            const canScout = canAfford && !isRosterFull;
            return (
              <div
                key={m.label}
                style={{
                  background: T.raised,
                  border: `1px solid ${
                    canScout ? T.steel : T.line
                  }`,
                  borderRadius: T.r2,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontFamily: T.disp,
                        fontSize: 14,
                        fontWeight: 700,
                        letterSpacing: 0.8,
                        textTransform: "uppercase",
                        color: T.txt,
                      }}
                    >
                      {m.label}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: T.txt3,
                        marginTop: 2,
                      }}
                    >
                      {m.desc}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    fontSize: 11,
                    color: T.txt3,
                  }}
                >
                  <span
                    style={{
                      fontFamily: T.mono,
                      fontWeight: 700,
                      color: canAfford ? T.gold : T.neg,
                    }}
                  >
                    {fmt$(m.cost)}
                  </span>
                </div>

                <Btn
                  sm
                  wide
                  disabled={!canScout}
                  color={T.steel}
                  onClick={() =>
                    scoutFighter(
                      m.cost,
                      m.level,
                      m.label,
                      scoutFilterArch,
                      scoutFilterWC
                    )
                  }
                >
                  {!canAfford
                    ? t("UI.notEnoughCash")
                    : isRosterFull
                    ? t("UI.rosterFull")
                    : t("UI.sendScout")}
                </Btn>
              </div>
            );
          })}
        </div>

        {/* ── Diamond in the Rough — separate section ── */}
        <div
          style={{
            marginTop: 20,
            padding: 14,
            background: `linear-gradient(135deg, ${T.raised}, ${T.steel}15)`,
            border: `1.5px solid ${T.steel}`,
            borderRadius: T.r2,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              fontFamily: T.disp,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: T.txt,
            }}
          >
            💎 {diamondMethod.label}
          </div>
          <div
            style={{
              fontSize: 10,
              color: T.txt3,
              lineHeight: 1.5,
            }}
          >
            {diamondMethod.desc}
          </div>
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "center",
              fontSize: 11,
              color: T.txt3,
            }}
          >
            <span
              style={{
                fontFamily: T.mono,
                fontWeight: 700,
                color: g.cash >= diamondMethod.cost ? T.gold : T.neg,
              }}
            >
              {fmt$(diamondMethod.cost)}
            </span>
          </div>
          <Btn
            sm
            wide
            disabled={!diamondEligible || g.cash < diamondMethod.cost || isRosterFull}
            color={T.steel}
            onClick={() =>
              scoutFighter(
                diamondMethod.cost,
                diamondMethod.level,
                diamondMethod.label,
                scoutFilterArch,
                scoutFilterWC
              )
            }
          >
            {!diamondEligible
              ? "🔒 Belum tersedia"
              : g.cash < diamondMethod.cost
              ? t("UI.notEnoughCash")
              : isRosterFull
              ? t("UI.rosterFull")
              : t("UI.sendScout")}
          </Btn>
          {diamondBlockReason && (
            <div
              style={{
                fontSize: 10,
                color: T.warn,
                lineHeight: 1.4,
                marginTop: 2,
              }}
            >
              {diamondBlockReason}
            </div>
          )}
        </div>

        {isRosterFull && (
          <div
            style={{
              color: T.neg,
              fontSize: 11,
              marginTop: 10,
              textAlign: "center",
            }}
          >
            {t("UI.rosterFull")} ({rosterCap} fighters).
          </div>
        )}
      </Panel>

      {/* ── Prospects List ── */}
      {g.prospects && g.prospects.length > 0 && (
        <>
          <Eyebrow
            color={T.gold}
            style={{ marginTop: 18, marginBottom: 8 }}
          >
            📋 {t("UI.prospects")} · {g.prospects.length}
          </Eyebrow>

          {g.prospects.map((p) => {
            const archColor = AC[p.fighter.archetype] || T.txt3;
            return (
              <Panel
                key={p.id}
                pad={14}
                style={{
                  marginBottom: 12,
                  borderColor: archColor,
                }}
              >
                {/* ── Header: Mono + Name + Grade ── */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 10,
                  }}
                >
                  <Mono
                    name={p.fighter.name}
                    color={archColor}
                    size={44}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: T.disp,
                        fontSize: 17,
                        fontWeight: 700,
                        letterSpacing: 1,
                        textTransform: "uppercase",
                        color: T.txt,
                      }}
                    >
                      {p.fighter.name}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 3,
                        flexWrap: "wrap",
                      }}
                    >
                      <Tag color={archColor}>
                        {p.fighter.archetype}
                      </Tag>
                      <Tag color={T.txt3}>{p.fighter.weightClass}</Tag>
                      <Tag color={T.txt3}>{p.fighter.age ?? "?"}y</Tag>
                      <Tag color={T.txt3}>{p.fighter.region}</Tag>
                    </div>
                  </div>
                  <div
                    style={{
                      textAlign: "center",
                      minWidth: 40,
                    }}
                  >
                    <Ovr
                      v={Math.round(
                        ATTRS.reduce(
                          (s, k) => s + p.fighter.attrs[k],
                          0
                        ) / ATTRS.length
                      )}
                    />
                  </div>
                </div>

                {/* ── Grade badge ── */}
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "3px 10px",
                    borderRadius: T.r,
                    background: `${T.gold}15`,
                    border: `1px solid ${T.gold}44`,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontFamily: T.mono,
                      fontSize: 12,
                      fontWeight: 700,
                      color: T.gold,
                    }}
                  >
                    {t("UI.grade")} {p.grade}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      color: T.txt3,
                    }}
                  >
                    via {p.method}
                  </span>
                </div>
                {p.transferReason && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "3px 10px",
                      borderRadius: T.r,
                      background: `${T.steel}15`,
                      border: `1px solid ${T.steel}44`,
                      marginBottom: 10,
                      fontSize: 10,
                      color: T.txt3,
                      lineHeight: 1.4,
                    }}
                  >
                    💬 {p.transferReason}
                  </div>
                )}

                {/* ── Attribute estimates grid ── */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(75px, 1fr))",
                    gap: 5,
                    marginBottom: 10,
                  }}
                >
                  {ATTRS.map((k) => {
                    const val = p.report.est[k];
                    return (
                      <div
                        key={k}
                        style={{
                          background: T.bg,
                          padding: "5px 6px",
                          textAlign: "center",
                          borderRadius: T.r,
                          border: `1px solid ${T.line}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 8,
                            color: T.txt3,
                            letterSpacing: 0.8,
                            textTransform: "uppercase",
                            marginBottom: 2,
                          }}
                        >
                          {ATTR_LABEL[k]}
                        </div>
                        <div
                          style={{
                            fontFamily: T.mono,
                            fontSize: 14,
                            fontWeight: 700,
                            color:
                              val === "?"
                                ? T.txt3
                                : heat(
                                    p.fighter.attrs?.[k] || 50
                                  ),
                          }}
                        >
                          {val}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Potential + Traits + Ambition ── */}
                <div
                  style={{
                    fontSize: 11,
                    color: T.txt3,
                    marginBottom: 6,
                    lineHeight: 1.6,
                  }}
                >
                  <div>
                    ⭐ {t("UI.potential")}:{" "}
                    <span style={{ color: T.gold, fontFamily: T.mono, fontWeight: 700 }}>
                      {p.report.pot}
                    </span>
                  </div>
                  {p.report.traits?.length > 0 && (
                    <div style={{ marginTop: 3 }}>
                      {t("TRAIT.sparring")}:{" "}
                      {p.report.traits.map((tr, i) => (
                        <Tag key={i} color={T.neg}>
                          {tr}
                        </Tag>
                      ))}
                    </div>
                  )}
                  {p.report.ambition && (
                    <div style={{ marginTop: 3 }}>
                      🎯 {p.report.ambition}
                    </div>
                  )}
                  {p.report.bestCeiling && (
                    <div style={{ marginTop: 3 }}>
                      📈 {t("UI.condition")}:{" "}
                      <span style={{ color: T.gold }}>
                        {ATTR_LABEL[p.report.bestCeiling.attr]}{" "}
                        {p.report.bestCeiling.val}
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Agent + Asking ── */}
                <div
                  style={{
                    fontSize: 11,
                    color: T.txt3,
                    marginBottom: 10,
                  }}
                >
                  🤝{" "}
                  {AGENT_TYPES[p.fighter.agent || "none"]?.label ||
                    t("AGENT.none")}{" "}
                  · asking ~{fmt$(p.fighter.asking)}
                </div>

                {/* ── Actions ── */}
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn
                    sm
                    disabled={isRosterFull}
                    color={T.pos}
                    onClick={() =>
                      dispatch({
                        type: "SIGN_CONTRACT_PRE",
                        prospectId: p.id,
                        fighter: p.fighter,
                      })
                    }
                  >
                    {t("UI.negotiate")}
                  </Btn>
                  <Btn
                    sm
                    ghost
                    color={T.txt3}
                    onClick={() =>
                      dispatch({
                        type: "DISMISS_PROSPECT",
                        prospectId: p.id,
                      })
                    }
                  >
                    {t("UI.pass")}
                  </Btn>
                </div>
              </Panel>
            );
          })}
        </>
      )}

      {/* ── Empty State ── */}
      {(!g.prospects || g.prospects.length === 0) && (
        <Panel pad={20} style={{ marginTop: 14, textAlign: "center" }}>
          <div
            style={{
              fontSize: 28,
              marginBottom: 8,
              opacity: 0.4,
            }}
          >
            🔍
          </div>
          <div
            style={{
              fontFamily: T.disp,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: T.txt3,
              marginBottom: 4,
            }}
          >
            {t("UI.noScouts")}
          </div>
          <div style={{ fontSize: 12, color: T.txt3, lineHeight: 1.5 }}>
            Send scouts to discover new talent. Higher-grade scouting
            reveals more accurate stats and potential. Up to 5 prospects
            can be tracked at once — sign the best ones to your camp.
          </div>
        </Panel>
      )}
    </>
  );
}
