import { fmt$ } from "../engine/rng.js";
import React, { useState } from "react";
import { WEIGHTS, ARCH_COLOR as DATA_ARCH_COLOR } from "../engine/data.js";
import { avgSkill, tierOf } from "../engine/fighter.js";
import { T, Panel, Eyebrow, Tag, Btn, Ovr, heat, ARCH_COLOR, Mono } from "./theme.jsx";

// Merge ARCH_COLOR from data.js to ensure full mapping (theme.jsx might differ)
const AC = { ...ARCH_COLOR, ...DATA_ARCH_COLOR };

export default function Rankings({ g, t }) {
  // Default to first division where the player has a fighter, else Lightweight
  const playerDivs = g.roster.map((f) => f.weightClass);
  const defaultDiv = playerDivs.find((wc) => wc) || "Lightweight";
  const [selDiv, setSelDiv] = useState(defaultDiv);

  const div = g.divisions?.[selDiv];
  if (!div) {
    return (
      <Panel>
        <Eyebrow>{t("UI.divRankings")}</Eyebrow>
        <div style={{ color: T.txt3, fontSize: 13 }}>No ranking data available.</div>
      </Panel>
    );
  }

  // ── build combined ranking list ──
  const champ = div.champ;
  const playerNames = new Set(
    g.roster.filter((f) => f.weightClass === selDiv).map((f) => f.name)
  );

  // AI fighters (exclude champion and player fighters)
  const aiFighters = div.list
    .filter((c) => !playerNames.has(c.name) && c.name !== champ?.name)
    .map((c) => ({
      name: c.name,
      archetype: c.archetype,
      points: c.points,
      record: c.record,
      player: false,
      ovr: Math.round(c.level * 60),
      streak: null,
      change: null,
    }));

  // Player fighters with rank points (not the champion)
  const playerFighters = g.roster
    .filter(
      (f) =>
        f.weightClass === selDiv &&
        (f.rankPoints || 0) > 0 &&
        !(champ.player && champ.fighterId === f.id)
    )
    .map((f) => ({
      name: f.name,
      archetype: f.archetype,
      points: f.rankPoints,
      record: f.record,
      player: true,
      ovr: Math.round(avgSkill(f)),
      streak: f.streakL || 0,
      change: f.lastRankChange || 0,
      fighterId: f.id,
      titles: f.titles || [],
    }));

  // Combine & sort by points descending
  const combined = [...aiFighters, ...playerFighters].sort(
    (a, b) => b.points - a.points
  );
  const top15 = combined.slice(0, 15);
  const outsideTop15 = combined.slice(15).filter((x) => x.player);

  // Unranked player fighters (no rank points) in this division (excluding champ)
  const unranked = g.roster.filter(
    (f) =>
      f.weightClass === selDiv &&
      !(f.rankPoints > 0) &&
      !(champ.player && champ.fighterId === f.id)
  );

  // ── P4P Top 10 (cross-division) ──
  const p4p = (() => {
    const allFighters = [];
    Object.values(g.divisions).forEach((d) => {
      d.list.forEach((c) =>
        allFighters.push({
          name: c.name,
          arch: c.archetype,
          wc: "",
          skill: c.level * 60,
          record: c.record?.w || 0,
        })
      );
    });
    g.roster.forEach((f) =>
      allFighters.push({
        name: f.name,
        arch: f.archetype,
        wc: f.weightClass,
        skill: avgSkill(f),
        record: f.record.w,
        player: true,
      })
    );
    allFighters.sort(
      (a, b) => b.skill * 0.6 + b.record * 2 - (a.skill * 0.6 + a.record * 2)
    );
    return allFighters.slice(0, 10);
  })();

  // ── streak indicator ──
  const streakBadge = (f) => {
    if (f.streak == null) return null;
    if (f.streak >= 3)
      return (
        <span
          style={{
            color: T.pos,
            fontFamily: T.mono,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          W{f.streak}
        </span>
      );
    if (f.streak > 0)
      return (
        <span
          style={{
            color: "#8fd06a",
            fontFamily: T.mono,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          W{f.streak}
        </span>
      );
    if (f.streak === 0) return null;
    // negative streak = lose streak
    const ls = Math.abs(f.streak);
    return (
      <span
        style={{
          color: T.neg,
          fontFamily: T.mono,
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        L{ls}
      </span>
    );
  };

  // ── change indicator ──
  const changeBadge = (c) => {
    if (!c || c === 0) return null;
    if (c > 0)
      return (
        <span style={{ color: T.pos, fontSize: 12, fontWeight: 700 }}>
          ▲{c}
        </span>
      );
    return (
      <span style={{ color: T.neg, fontSize: 12, fontWeight: 700 }}>
        ▼{Math.abs(c)}
      </span>
    );
  };

  return (
    <>
      {/* ── Division Chip Selector ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {WEIGHTS.map((w) => {
          const has = g.roster.some((f) => f.weightClass === w.name);
          const active = selDiv === w.name;
          return (
            <button
              key={w.name}
              onClick={() => setSelDiv(w.name)}
              className="chip"
              aria-label={`${w.name} division${has ? " - has fighters" : ""}`}
              aria-pressed={active}
              style={{
                fontFamily: T.body, fontSize: 12, fontWeight: 600, padding: "6px 13px",
                borderRadius: 20, cursor: "pointer", letterSpacing: .3,
                border: `1px solid ${active ? T.ember : has ? `${T.steel}55` : T.line}`,
                background: active ? `${T.ember}22` : T.surface,
                color: active ? T.ember : has ? T.txt : T.txt3,
              }}
            >
              {w.name}
              {has && <span style={{ color: active ? T.ember : T.steel, marginLeft: 5 }}>●</span>}
            </button>
          );
        })}
      </div>

      {/* ── Champion Banner ── */}
      <Panel
        pad={14}
        style={{
          marginTop: 12,
          borderColor: T.gold,
          background: `${T.gold}0a`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Mono
              name={champ.name}
              color={T.gold}
              size={40}
              champ
            />
            <div>
              <div
                style={{
                  fontFamily: T.disp,
                  color: T.gold,
                  fontSize: 16,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                }}
              >
                👑 {champ.name}
              </div>
              <div style={{ fontSize: 10, color: T.txt3, marginTop: 1 }}>
                {selDiv} Champion
              </div>
            </div>
          </div>
          <Tag color={champ.player ? T.pos : T.txt3} solid>
            {champ.player ? t("UI.yourCamp") : t("UI.champion")}
          </Tag>
        </div>
      </Panel>

      {/* ── Ranking Table ── */}
      <Panel pad={0} style={{ marginTop: 12, overflow: "hidden" }} role="table" aria-label={`${selDiv} ranking table`}>
        {/* Table header */}
        <div
          role="row"
          style={{
            display: "flex",
            alignItems: "center",
            padding: "8px 14px",
            borderBottom: `1px solid ${T.line2}`,
            background: T.raised,
          }}
        >
          <div
            role="columnheader"
            style={{
              width: 36,
              fontFamily: T.body,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: T.txt3,
            }}
          >
            #
          </div>
          <div
            role="columnheader"
            style={{
              flex: 1,
              fontFamily: T.body,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: T.txt3,
            }}
          >
            Fighter
          </div>
          <div
            role="columnheader"
            style={{
              width: 42,
              textAlign: "center",
              fontFamily: T.body,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: T.txt3,
            }}
          >
            OVR
          </div>
          <div
            role="columnheader"
            style={{
              width: 62,
              textAlign: "center",
              fontFamily: T.body,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: T.txt3,
            }}
          >
            REC
          </div>
          <div
            role="columnheader"
            style={{
              width: 46,
              textAlign: "center",
              fontFamily: T.body,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: T.txt3,
            }}
          >
            STRK
          </div>
          <div
            role="columnheader"
            style={{
              width: 38,
              textAlign: "center",
              fontFamily: T.body,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: T.txt3,
            }}
          >
            ±
          </div>
          <div
            role="columnheader"
            style={{
              width: 44,
              textAlign: "right",
              fontFamily: T.body,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: T.txt3,
            }}
          >
            PTS
          </div>
        </div>

        {/* Table rows */}
        {top15.length === 0 && (
          <div
            style={{
              padding: 20,
              textAlign: "center",
              color: T.txt3,
              fontSize: 12,
            }}
          >
            No ranked fighters in this division.
          </div>
        )}
        {top15.map((f, i) => (
          <div
            key={f.player ? `p-${f.fighterId || i}` : `ai-${i}`}
            className="row"
            role="row"
            style={{
              display: "flex",
              alignItems: "center",
              padding: "7px 14px",
              borderBottom: `1px solid ${T.line}44`,
              background: f.player ? `${T.gold}0d` : "transparent",
            }}
          >
            {/* Rank number */}
            <div
              role="cell"
              style={{
                width: 36,
                fontFamily: T.disp,
                fontSize: 14,
                fontWeight: 700,
                color: f.player ? T.gold : T.txt3,
              }}
            >
              #{i + 1}
            </div>

            {/* Name + archetype */}
            <div role="cell" style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: T.disp,
                    fontSize: 13,
                    fontWeight: f.player ? 700 : 500,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    color: f.player ? T.gold : T.txt,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {f.name}
                  {f.player ? " ★" : ""}
                </span>
                {f.titles?.length > 0 && (
                  <span style={{ fontSize: 11 }}>👑</span>
                )}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: T.txt3,
                  marginTop: 1,
                }}
              >
                {f.archetype}
              </div>
            </div>

            {/* OVR */}
            <div
              role="cell"
              style={{
                width: 42,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  fontFamily: T.mono,
                  fontSize: 13,
                  fontWeight: 700,
                  color: heat(f.ovr),
                }}
              >
                {f.ovr}
              </div>
            </div>

            {/* Record */}
            <div
              role="cell"
              style={{
                width: 62,
                textAlign: "center",
                fontFamily: T.mono,
                fontSize: 12,
                fontWeight: 600,
                color: T.txt2,
              }}
            >
              {f.record?.w ?? "?"}-{f.record?.l ?? "?"}
            </div>

            {/* Streak */}
            <div
              role="cell"
              style={{
                width: 46,
                textAlign: "center",
              }}
            >
              {streakBadge(f) ?? (
                <span style={{ color: T.txt3, fontSize: 11 }}>—</span>
              )}
            </div>

            {/* Change */}
            <div
              style={{
                width: 38,
                textAlign: "center",
              }}
            >
              {changeBadge(f.change) ?? (
                <span style={{ color: T.txt3, fontSize: 11 }}>—</span>
              )}
            </div>

            {/* Points */}
            <div
              style={{
                width: 44,
                textAlign: "right",
                fontFamily: T.mono,
                fontSize: 12,
                fontWeight: 600,
                color: T.txt2,
              }}
            >
              {f.points}
            </div>
          </div>
        ))}
      </Panel>

      {/* ── Outside Top 15 (player only) ── */}
      {outsideTop15.length > 0 && (
        <Panel pad={12} style={{ marginTop: 12, borderColor: T.warn }}>
          <Eyebrow color={T.warn}>{t("UI.outsideTop15")}</Eyebrow>
          {outsideTop15.map((f, i) => (
            <div
              key={`out-${i}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
                fontSize: 12,
                color: T.txt3,
              }}
            >
              <span>
                <b style={{ color: T.txt }}>{f.name}</b>
                <span style={{ marginLeft: 6, fontSize: 10 }}>
                  {f.archetype}
                </span>
              </span>
              <span
                style={{ fontFamily: T.mono, fontSize: 11, color: T.txt2 }}
              >
                {f.points} pts
              </span>
            </div>
          ))}
        </Panel>
      )}

      {/* ── Unranked (no rank points) ── */}
      {unranked.length > 0 && (
        <Panel pad={12} style={{ marginTop: 12, borderColor: T.txt3 }}>
          <Eyebrow>{t("UI.unranked")}</Eyebrow>
          {unranked.map((f) => (
            <div
              key={f.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "4px 0",
                fontSize: 12,
                color: T.txt3,
              }}
            >
              <span>
                <b style={{ color: T.txt }}>{f.name}</b>
                <span style={{ marginLeft: 6, fontSize: 10 }}>
                  {f.archetype} · {tierOf(f)}
                </span>
              </span>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.txt2 }}>
                {f.record?.w ?? 0}-{f.record?.l ?? 0}
              </span>
            </div>
          ))}
        </Panel>
      )}

      {/* ── P4P — Pound-for-Pound Top 10 ── */}
      <Panel
        pad={14}
        style={{
          marginTop: 14,
          borderColor: T.gold,
          background: `${T.gold}06`,
        }}
      >
        <Eyebrow color={T.gold}>🌍 P4P — Pound-for-Pound Top 10</Eyebrow>
        {p4p.map((f, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "5px 0",
              borderBottom:
                i < p4p.length - 1 ? `1px solid ${T.line}33` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontFamily: T.disp,
                  fontSize: 13,
                  fontWeight: 700,
                  color: T.txt3,
                  width: 22,
                }}
              >
                #{i + 1}
              </span>
              <span
                style={{
                  fontFamily: T.disp,
                  fontSize: 12,
                  fontWeight: f.player ? 700 : 500,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  color: f.player ? T.gold : T.txt,
                }}
              >
                {f.name}
                {f.wc ? ` (${f.wc})` : ""}
                {f.player ? " ★" : ""}
              </span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: T.txt3,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <span>{f.arch}</span>
              <span
                style={{
                  fontFamily: T.mono,
                  fontSize: 12,
                  fontWeight: 700,
                  color: heat(f.skill),
                }}
              >
                {Math.round(f.skill)}
              </span>
              <span style={{ fontFamily: T.mono, fontSize: 11, color: T.txt2 }}>
                {f.record}W
              </span>
            </div>
          </div>
        ))}
      </Panel>
    </>
  );
}
