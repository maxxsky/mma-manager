import React from "react";
import { T, Panel, Eyebrow, Tag, Btn, Ovr, heat, ARCH_COLOR, Icon, ICONS, Mono, Meter } from "./theme.jsx";
import { TRAINING } from "../engine/data.js";
import { weeklyFee } from "../engine/fighter.js";

/* =============================================================================
   IRONFIST DASHBOARD
   Ported from ironfist-redesign.jsx prototype (lines 370-494).
   Wired to real game state `g`.
============================================================================= */

// ---- Priority color dots ---------------------------------------------------
const PRIO_DOT = {
  urgent: T.neg,
  warning: T.warn,
  info: T.steel,
};

// ---- Generate a smart priority list from game state -----------------------
function getPriorities(g) {
  const list = [];

  // 1) Booked fighters without a game plan
  g.roster.filter(f => f.booked && !f.gamePlan).forEach(f => {
    list.push({ label: `No game plan: ${f.name}`, dot: PRIO_DOT.urgent, action: "roster" });
  });

  // 2) Expiring fight offers
  const urgentOffers = g.inbox.filter(m => m.type === "offer" && m.expires != null && m.expires <= 2);
  if (urgentOffers.length > 0) {
    list.push({ label: `${urgentOffers.length} fight offer${urgentOffers.length > 1 ? "s" : ""} expiring soon`, dot: PRIO_DOT.urgent, action: "inbox" });
  }

  // 3) Overtraining
  const overtrained = g.roster.filter(f => f.overtraining > 60);
  if (overtrained.length > 0) {
    overtrained.forEach(f => {
      list.push({ label: `${f.name} overtrained (${Math.round(f.overtraining)}%)`, dot: PRIO_DOT.warning, action: "roster" });
    });
  }

  // 4) Low morale fighters
  const lowMorale = g.roster.filter(f => f.morale < 25);
  lowMorale.forEach(f => {
    list.push({ label: `Low morale: ${f.name} (${Math.round(f.morale || 0)}%)`, dot: PRIO_DOT.warning, action: "roster" });
  });

  // 5) Injured fighters
  const injured = g.roster.filter(f => f.injury);
  injured.forEach(f => {
    list.push({ label: `Injured: ${f.name} — ${f.injury.label || "recovering"} ${f.injury.weeks}wk`, dot: PRIO_DOT.info, action: "roster" });
  });

  // 6) Contracts expiring (1 fight left)
  const contractExpiring = g.roster.filter(f => f.contract && f.contract.fightsLeft <= 1 && f.contract.fightsLeft > 0);
  contractExpiring.forEach(f => {
    list.push({ label: `Contract running out: ${f.name} (${f.contract.fightsLeft} fight left)`, dot: PRIO_DOT.warning, action: "roster" });
  });

  return list;
}

// ---- KPI Card --------------------------------------------------------------
function KPICard({ label, value, sub, color, onClick }) {
  return (
    <div className="row" onClick={onClick} style={{
      background: T.raised, border: `1px solid ${T.line}`, borderRadius: T.r2,
      padding: "14px 16px", cursor: onClick ? "pointer" : "default",
    }}>
      <div style={{ fontFamily: T.body, fontSize: 10, fontWeight: 600, letterSpacing: 1,
        textTransform: "uppercase", color: T.txt3, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: color || T.txt,
        letterSpacing: .5, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3, marginTop: 4,
        lineHeight: 1.3 }}>{sub}</div>}
    </div>
  );
}

/* ---- MAIN COMPONENT ------------------------------------------------------- */
export default function Dashboard({ g, setTab, setActiveFight, t, fmt$ }) {
  // ---- Financials (same formulas as App.jsx) -------------------------------
  const monthlyBurn = g.coaches.reduce((s, c) => s + ((!c.freeUntil || g.week > c.freeUntil) ? c.salary : 0), 0)
    + Math.round(Object.values(g.facilities).reduce((s, l) => s + l * 30000, 0) * 0.05)
    + g.roster.reduce((s, f) => s + (f.injury ? 0 : TRAINING[f.booked ? "fightcamp" : f.training.type].cost * 4), 0);
  const monthlyIn = g.roster.reduce((s, f) => s + weeklyFee(f) * 4, 0) + g.rep * 500 + g.roster.reduce((s, f) => s + f.popularity * 150, 0);
  const netMonthly = monthlyIn - monthlyBurn;

  // ---- Derived counts ------------------------------------------------------
  const bookedFighters = g.roster.filter(f => f.booked);
  const pendingOffers = g.inbox.filter(m => m.type === "offer").length;
  const injured = g.roster.filter(f => f.injury).length;
  const overtrained = g.roster.filter(f => f.overtraining > 60).length;
  const priorities = getPriorities(g);

  // ---- Next fight info -----------------------------------------------------
  const nextFight = bookedFighters.length > 0
    ? [...bookedFighters].sort((a, b) => a.booked.weeksLeft - b.booked.weeksLeft)[0]
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* =====================================================================
          KPI STRIP — 4 cards, 4-col grid
          ===================================================================== */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        {/* 1. Next Fight */}
        <KPICard
          label="Next Fight"
          value={nextFight ? `T-${nextFight.booked.weeksLeft}w` : "—"}
          sub={nextFight
            ? `${nextFight.name} vs ${nextFight.booked.opponent.name}`
            : "No fights booked"}
          color={nextFight ? nextFight.booked.weeksLeft <= 2 ? T.ember : T.steel : T.txt3}
          onClick={nextFight ? () => setActiveFight(nextFight.id) : undefined}
        />

        {/* 2. Pending Offers */}
        <KPICard
          label="Pending Offers"
          value={pendingOffers}
          sub={pendingOffers > 0 ? `${pendingOffers} fight offer${pendingOffers > 1 ? "s" : ""} in inbox` : "Inbox is clear"}
          color={pendingOffers > 0 ? T.gold : T.txt3}
          onClick={() => setTab("inbox")}
        />

        {/* 3. Net / Month */}
        <KPICard
          label="Net / Month"
          value={`${netMonthly >= 0 ? "+" : ""}${fmt$(netMonthly)}`}
          sub={`In ${fmt$(monthlyIn)} · Out ${fmt$(monthlyBurn)}`}
          color={netMonthly >= 0 ? T.pos : T.neg}
          onClick={() => setTab("finance")}
        />

        {/* 4. Roster */}
        <KPICard
          label="Roster"
          value={g.roster.length}
          sub={`${injured > 0 ? `🚑 ${injured} injured` : ""}${injured > 0 && overtrained > 0 ? " · " : ""}${overtrained > 0 ? `⚠️ ${overtrained} overtrained` : ""}${injured === 0 && overtrained === 0 ? "All fighters healthy" : ""}`}
          color={injured > 0 ? T.warn : T.pos}
          onClick={() => setTab("roster")}
        />
      </div>

      {/* =====================================================================
          TWO-COLUMN LAYOUT: Priorities + Upcoming Fights
          ===================================================================== */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 18 }}>

        {/* ---- PRIORITIES PANEL ------------------------------------------- */}
        <Panel pad={16}>
          <Eyebrow>⚡ Priorities</Eyebrow>
          {priorities.length === 0 && (
            <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, padding: "12px 0" }}>
              All clear — nothing needs attention right now.
            </div>
          )}
          {priorities.slice(0, 8).map((p, i) => (
            <div key={i} className="row" onClick={() => setTab(p.action)} style={{
              display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px",
              borderRadius: T.r, marginBottom: 2, cursor: "pointer",
            }}>
              <span style={{
                display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                background: p.dot, marginTop: 4, flexShrink: 0,
              }} />
              <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 600, color: T.txt3,
                minWidth: 18, flexShrink: 0 }}>{i + 1}</span>
              <span style={{ fontFamily: T.body, fontSize: 12, color: T.txt2, lineHeight: 1.4,
                flex: 1 }}>{p.label}</span>
              <Icon d={ICONS.chevR} size={14} />
            </div>
          ))}
          {priorities.length > 8 && (
            <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3, textAlign: "center",
              padding: "6px 0" }}>+{priorities.length - 8} more</div>
          )}
        </Panel>

        {/* ---- UPCOMING FIGHTS TABLE --------------------------------------- */}
        <Panel pad={16}>
          <Eyebrow>🥊 Upcoming Fights</Eyebrow>
          {bookedFighters.length === 0 && (
            <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, padding: "12px 0" }}>
              No fights scheduled. Check <span style={{ color: T.steel, cursor: "pointer", fontWeight: 600 }}
                onClick={() => setTab("inbox")}>Inbox</span> for fight offers.
            </div>
          )}
          {bookedFighters.sort((a, b) => a.booked.weeksLeft - b.booked.weeksLeft).map((f) => {
            const ac = ARCH_COLOR[f.archetype] || T.steel;
            const bk = f.booked;
            return (
              <div key={f.id} className="row" onClick={() => setActiveFight(f.id)} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
                borderBottom: `1px solid ${T.line}`, cursor: "pointer",
              }}>
                {/* Fighter avatar + name */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1.2, minWidth: 0 }}>
                  <Mono name={f.name} color={ac} size={36} champ={f.champ} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: T.disp, fontSize: 13, fontWeight: 600, color: T.txt,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      textTransform: "uppercase", letterSpacing: .5 }}>{f.name}</div>
                    <div style={{ fontFamily: T.body, fontSize: 10, color: T.txt3 }}>{f.weightClass}</div>
                  </div>
                </div>

                {/* Opponent */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.disp, fontSize: 13, fontWeight: 600, color: T.txt2,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    textTransform: "uppercase", letterSpacing: .5 }}>
                    {bk.opponent.name}{bk.title ? " 🏆" : ""}
                  </div>
                </div>

                {/* Event / Tier */}
                <div style={{ flex: 0.7, minWidth: 0 }}>
                  <Tag color={ac} solid>{bk.tier}</Tag>
                </div>

                {/* Purse */}
                <div style={{ flex: 0.6, textAlign: "right" }}>
                  <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 600, color: T.txt2 }}>
                    {fmt$(bk.show)}
                  </div>
                </div>

                {/* Countdown */}
                <div style={{ flex: 0.5, textAlign: "center" }}>
                  <span style={{
                    fontFamily: T.mono, fontSize: 13, fontWeight: 700,
                    color: bk.weeksLeft <= 1 ? T.ember : bk.weeksLeft <= 3 ? T.gold : T.txt2,
                    background: `${bk.weeksLeft <= 1 ? T.ember : bk.weeksLeft <= 3 ? T.gold : T.txt2}18`,
                    padding: "2px 8px", borderRadius: 4,
                  }}>In {bk.weeksLeft}w</span>
                </div>

                {/* Chevron */}
                <Icon d={ICONS.chevR} size={15} />
              </div>
            );
          })}
        </Panel>
      </div>

      {/* =====================================================================
          NEWS FEED — event log
          ===================================================================== */}
      <Panel pad={16}>
        <Eyebrow>📰 Camp Feed</Eyebrow>

        {/* Combine fight history from all fighters into a unified feed */}
        {(() => {
          // Build feed from fightHistory entries across all fighters
          const feed = [];
          g.roster.forEach(f => {
            if (f.fightHistory) {
              f.fightHistory.forEach(h => {
                feed.push({
                  week: h.week,
                  fighter: f.name,
                  desc: `vs ${h.opponent} — ${h.result} ${h.method} R${h.round}${h.title ? " 🏆" : ""}`,
                  result: h.result,
                  color: h.result === "W" ? T.pos : h.result === "D" ? T.txt3 : T.neg,
                });
              });
            }
          });

          // Add recent log entries as feed items
          g.log.forEach(l => {
            // Parse common log patterns for better display
            const fightMatch = l.match(/^(.+?) (?:kalah|menang|defeats|loses|wins|draws) (?:vs|melawan) (.+?) (?:lewat|via|by) (.+)$/i);
            const wMatch = l.match(/^W(\d+):/);
            feed.push({
              week: wMatch ? parseInt(wMatch[1]) : g.week,
              fighter: fightMatch ? fightMatch[1] : "",
              desc: l,
              result: null,
              color: l.includes("🏆") || l.includes("menang") || l.includes("defeats") || l.includes("wins") ? T.pos
                : l.includes("kalah") || l.includes("loses") ? T.neg
                : l.includes("cedera") || l.includes("injury") ? T.warn
                : T.txt2,
            });
          });

          // Deduplicate and sort by week descending
          const seen = new Set();
          const deduped = feed.filter(item => {
            const key = `${item.week}|${item.fighter || ""}|${item.desc.slice(0, 40)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).sort((a, b) => b.week - a.week).slice(0, 20);

          if (deduped.length === 0) {
            return (
              <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, padding: "12px 0" }}>
                No events yet. Advance a week to start the journey.
              </div>
            );
          }

          return (
            <div style={{ maxHeight: 340, overflowY: "auto" }}>
              {deduped.map((item, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 10, padding: "7px 6px",
                  borderBottom: `1px solid ${T.line}55`,
                }}>
                  {/* Week badge */}
                  <span style={{
                    fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.txt3,
                    background: T.raised, padding: "1px 6px", borderRadius: 3,
                    minWidth: 38, textAlign: "center", flexShrink: 0,
                  }}>W{String(item.week).padStart(3, "0")}</span>

                  {/* Color dot */}
                  <span style={{
                    display: "inline-block", width: 7, height: 7, borderRadius: "50%",
                    background: item.color, marginTop: 3, flexShrink: 0,
                  }} />

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {item.fighter ? (
                      <span style={{ fontFamily: T.disp, fontSize: 12, fontWeight: 600,
                        color: item.color, textTransform: "uppercase", letterSpacing: .5 }}>
                        {item.fighter}
                      </span>
                    ) : null}
                    <span style={{ fontFamily: T.body, fontSize: 11, color: T.txt2,
                      marginLeft: item.fighter ? 6 : 0, lineHeight: 1.4 }}>
                      {item.desc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
      </Panel>
    </div>
  );
}
