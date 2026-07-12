import { fmt$ } from "../engine/rng.js";
import React from "react";
import { T, Panel, Eyebrow, Tag, Btn } from "./theme.jsx";
import { ARCH_COLOR, RIVAL_TRAITS, CAMP_TIERS } from "../engine/data.js";
import { getCampLifecycleLabel } from "../engine/shadow-ai.js";
import { avgSkill, tierOf } from "../engine/fighter.js";
import { clamp } from "../engine/rng.js";

/* =============================================================================
   RIVALS SCREEN — Ironfist Edition
   Rivalry cards: head-to-head, story, top fighters, poach.
============================================================================= */

export default function RivalsScreen({ g, dispatch }) {
  if (!g.rivals || g.rivals.length === 0) {
    return (
      <Panel style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.6 }}>⚔️</div>
        <Eyebrow>No Rivals</Eyebrow>
        <div style={{ fontSize: 13, color: T.txt3 }}>
          The MMA scene is quiet. Advance the week for rival camps to emerge.
        </div>
      </Panel>
    );
  }

  return (
    <div>
      <Eyebrow color={T.gold}>⚔️ Rival Camps · MMA Landscape</Eyebrow>
      <div style={{ color: T.txt3, fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
        Rival camps recruit, fight, and can threaten your camp's stability through
        poaching. Monitor their growth and strike when the time is right.
      </div>

      {g.rivals.map((rc) => (
        <RivalCard key={rc.id} rc={rc} g={g} dispatch={dispatch} />
      ))}
    </div>
  );
}

function RivalCard({ rc, g, dispatch }) {
  const traitData = RIVAL_TRAITS[rc.trait] || {};
  const rivalryLevel =
    rc.rivalry > 60 ? "hostile" : rc.rivalry > 30 ? "heated" : rc.rivalry > 10 ? "cool" : "cold";

  const rivalryColors = {
    hostile: T.neg,
    heated: T.warn,
    cool: T.steel,
    cold: T.txt3,
  };

  const rivalryLabels = {
    hostile: "Hostile",
    heated: "Heated",
    cool: "Cool",
    cold: "Neutral",
  };

  const accentColor = rivalryColors[rivalryLevel];

  // Top fighters sorted by skill
  const topFighters = [...rc.fighters]
    .sort((a, b) => avgSkill(b) - avgSkill(a))
    .slice(0, 3);

  // Poachable targets
  const poachTargets = rc.fighters.filter((f) => !f.injury && !f.booked);
  const tier = CAMP_TIERS[g.campTier || 0];
  const rosterCap = tier ? tier.rosterCap : 8;

  return (
    <Panel style={{ marginBottom: 14, borderColor: accentColor }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: T.disp,
              color: T.txt,
              fontSize: 18,
              letterSpacing: 1,
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            {rc.name}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Tag color={T.steel}>{rc.trait}</Tag>
            {traitData.desc && (
              <span style={{ fontSize: 10, color: T.txt3, alignSelf: "center" }}>
                {traitData.desc}
              </span>
            )}
          </div>
        </div>

        {/* Rivalry meter */}
        <div style={{ textAlign: "right", minWidth: 100 }}>
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 13,
              fontWeight: 700,
              color: accentColor,
              marginBottom: 4,
            }}
          >
            {rivalryLabels[rivalryLevel]}
          </div>
          <RivalryMeter value={rc.rivalry} color={accentColor} />
        </div>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 6,
          marginBottom: 12,
          padding: "8px 0",
          borderTop: `1px solid ${T.line}33`,
          borderBottom: `1px solid ${T.line}33`,
        }}
      >
        <MiniStat label="Rep" value={Math.round(rc.rep)} color={T.txt} />
        <MiniStat label="Fighters" value={rc.fighters.length} color={T.txt} />
        <MiniStat label="Coaches" value={rc.coaches.length} color={T.txt} />
        <MiniStat label="Chemistry" value={Math.round(rc.chemistry)} color={T.steel} />
        {(() => { const life = getCampLifecycleLabel(rc); return <div style={{ marginTop: 6 }}><Tag color={life.color}>{life.icon} {life.label}</Tag></div>; })()}
      </div>

      {/* Rivalry story snippet */}
      {rc.rivalry > 0 && (
        <div
          style={{
            background: `${accentColor}0d`,
            borderLeft: `3px solid ${accentColor}`,
            padding: "8px 10px",
            marginBottom: 12,
            borderRadius: `0 ${T.r}px ${T.r}px 0`,
            fontSize: 11,
            color: T.txt2,
            lineHeight: 1.5,
            fontStyle: "italic",
          }}
        >
          {rc.rivalry > 60
            ? `🔥 ${rc.name} is a sworn enemy. Their fighters target yours and they actively try to poach talent. Every interaction escalates the conflict.`
            : rc.rivalry > 30
              ? `⚠ Tensions are rising with ${rc.name}. Failed poach attempts and fight results have strained relations.`
              : rc.rivalry > 10
                ? `There's a competitive edge with ${rc.name}. Nothing serious yet, but worth watching.`
                : `${rc.name} is a neutral camp. No significant history between you.`}
        </div>
      )}

      {/* Top fighters */}
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: T.txt3,
            marginBottom: 6,
          }}
        >
          Top Fighters
        </div>
        {topFighters.length === 0 ? (
          <div style={{ color: T.txt3, fontSize: 11 }}>No fighters in camp.</div>
        ) : (
          topFighters.map((f) => {
            const archColor = ARCH_COLOR[f.archetype] || T.steel;
            return (
              <div
                key={f.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "5px 8px",
                  borderBottom: `1px solid ${T.line}22`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: T.txt, fontSize: 13, fontWeight: 600 }}>
                    {f.name}
                  </span>
                  <Tag color={archColor}>{f.archetype}</Tag>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11 }}>
                  <span style={{ color: T.txt2 }}>
                    {f.record?.w ?? 0}-{f.record?.l ?? 0}
                  </span>
                  <span style={{ color: T.txt3 }}>{tierOf(f)}</span>
                  <span style={{ color: T.txt3 }}>{f.weightClass}</span>
                  {f.injury && <span style={{ color: T.neg }}>🚑</span>}
                  <span
                    style={{
                      fontFamily: T.mono,
                      fontWeight: 700,
                      color: T.gold,
                    }}
                  >
                    {Math.round(avgSkill(f))}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Full roster count if more than 3 */}
      {rc.fighters.length > 3 && (
        <div style={{ fontSize: 10, color: T.txt3, marginBottom: 12 }}>
          +{rc.fighters.length - 3} more fighter
          {rc.fighters.length - 3 !== 1 ? "s" : ""} in camp
        </div>
      )}

      {/* Poach section */}
      <div
        style={{
          borderTop: `1px solid ${T.line}44`,
          paddingTop: 10,
          marginTop: 4,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: T.txt3,
            marginBottom: 8,
          }}
        >
          🦅 Poach Fighter
        </div>

        {poachTargets.length === 0 ? (
          <div style={{ color: T.txt3, fontSize: 11 }}>
            No viable targets — all fighters are injured or booked.
          </div>
        ) : (
          poachTargets
            .sort((a, b) => avgSkill(b) - avgSkill(a))
            .map((target) => {
              const cost = Math.round(
                target.asking * 1.8 * (1 + rc.rivalry / 100)
              );
              const failCost = Math.round(cost * 0.2);
              const successChance = clamp(
                55 - rc.rivalry * 0.4 - Math.round(avgSkill(target) - 50) * 0.3,
                10,
                85
              );
              const canAfford = g.cash >= cost;
              const hasSpace = g.roster.length < rosterCap;

              return (
                <div
                  key={target.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: `1px solid ${T.line}22`,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: T.txt, fontSize: 12, fontWeight: 600 }}>
                        {target.name}
                      </span>
                      <span style={{ fontSize: 10, color: T.txt3 }}>
                        {target.archetype} · {tierOf(target)} · {target.weightClass}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: T.txt3, marginTop: 2 }}>
                      OVR {Math.round(avgSkill(target))} · Chance:{" "}
                      <span
                        style={{
                          color:
                            successChance >= 60
                              ? T.pos
                              : successChance >= 35
                                ? T.warn
                                : T.neg,
                          fontWeight: 600,
                        }}
                      >
                        {Math.round(successChance)}%
                      </span>
                      {" · "}Success: {fmt$(cost)} · Fail: -{fmt$(failCost)}
                    </div>
                  </div>
                  <Btn
                    sm
                    color={T.ember}
                    disabled={!canAfford || !hasSpace}
                    onClick={() =>
                      dispatch({ type: "POACH_FIGHTER", rivalId: rc.id, targetId: target.id, cost, failCost, successChance })
                    }
                    title={
                      !hasSpace
                        ? "Roster full"
                        : !canAfford
                          ? `Need ${fmt$(cost)}`
                          : `Success: ${fmt$(cost)} · Fail: -${fmt$(failCost)} (20%) · Chance: ${Math.round(successChance)}%`
                    }
                  >
                    🦅 {fmt$(cost)}
                  </Btn>
                </div>
              );
            })
        )}
      </div>
    </Panel>
  );
}

/* ---- Helpers ---- */

function RivalryMeter({ value, color }) {
  return (
    <div
      style={{
        position: "relative",
        width: 80,
        height: 6,
        background: T.bg,
        borderRadius: 3,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${value}%`,
          background: color,
          borderRadius: 3,
        }}
      />
    </div>
  );
}

function MiniStat({ label, value, color = T.txt }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 9,
          color: T.txt3,
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color }}>
        {value}
      </div>
    </div>
  );
}
