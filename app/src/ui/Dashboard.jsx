import { fmt$ } from "../engine/rng.js";
import React from "react";
import { T, Panel, Eyebrow, Tag, Btn, Icon, ICONS, Mono, ARCH_COLOR } from "./theme.jsx";
import { t } from "../i18n/index.js";
import { monthlyBurn, monthlyIn } from "../engine/finance.js";
import { getObjectives } from "../engine/onboarding.js";

/* =============================================================================
   IRONFIST DASHBOARD — Verbatim from prototype, wired to real g state
============================================================================= */

export default function Dashboard({ g, setTab, setActiveFight, dispatch }) {
  // ---- Monthly financials (same formulas as App.jsx) -----------------------
  const burn = monthlyBurn(g);
  const inc = monthlyIn(g);
  const netMonthly = inc - burn;

  // ---- Booked fighters sorted -------------------------------------------------
  const bookedSorted = g.roster.filter(f => f.booked).sort((a, b) => a.booked.weeksLeft - b.booked.weeksLeft);
  const nextFight = bookedSorted[0] || null;

  // ---- Counts -----------------------------------------------------------------
  const pendingOffers = g.inbox.filter(m => m.type === "offer").length;
  const injuredCount = g.roster.filter(f => f.injury).length;
  const overtrainedCount = g.roster.filter(f => f.overtraining > 60).length;

  // ---- Helper: is champ -------------------------------------------------------
  const isChamp = (f) => f.titles && f.titles.some(t => t.includes("Champion"));

  // ---- KPI data ---------------------------------------------------------------
  const kpis = [
    [
      t("UI.nextFight"),
      nextFight ? `T-${nextFight.booked.weeksLeft}w` : "—",
      nextFight ? (nextFight.booked.weeksLeft <= 2 ? T.ember : T.steel) : T.txt3,
      nextFight
        ? `${nextFight.name} vs ${nextFight.booked.opponent.name}${nextFight.booked.title ? " · title defense" : ""}`
        : t("UI.noFightsBooked"),
      "card",
    ],
    [
      t("UI.pendingOffers"),
      String(pendingOffers),
      pendingOffers > 0 ? T.steel : T.txt3,
      pendingOffers > 0
        ? `${pendingOffers} ${pendingOffers === 1 ? t("UI.offer") : t("UI.offers")}${g.inbox.some(m => m.type === "offer" && m.expires != null && m.expires <= 1) ? " · 1 " + t("UI.expiresWeek") : ""}`
        : t("UI.inboxClear"),
      "inbox",
    ],
    [
      t("UI.netPerMonth"),
      `${netMonthly >= 0 ? "+" : ""}${fmt$(netMonthly)}`,
      netMonthly >= 0 ? T.pos : T.neg,
      `income ${fmt$(inc)} · expense ${fmt$(burn)}`,
      "finance",
    ],
    [
      t("UI.roster"),
      String(g.roster.length),
      T.txt,
      `${overtrainedCount > 0 ? `${overtrainedCount} overtrained` : ""}${overtrainedCount > 0 && injuredCount > 0 ? " · " : ""}${injuredCount > 0 ? `${injuredCount} injured` : injuredCount === 0 && overtrainedCount === 0 ? t("UI.allHealthy") : ""}`,
      "roster",
    ],
  ];

  // ---- Priorities generated from game state -----------------------------------
  const priorities = [];
  // 1) Booked fighters without a game plan
  g.roster.filter(f => f.booked && !f.gamePlan).forEach(f => {
    priorities.push([`Set game plan for ${f.name} — fight camp active, no plan chosen`, "roster", T.ember]);
  });
  // 2) Expiring fight offers
  g.inbox.filter(m => m.type === "offer" && m.expires != null && m.expires <= 3).forEach(m => {
    const f = g.roster.find(x => x.id === m.fighterId);
    const name = f ? f.name : "Fighter";
    const urgency = m.expires <= 1 ? `${m.expires} week` : `${m.expires} weeks`;
    priorities.push([`Fight offer for ${name} expires in ${urgency}${m.title ? " — declining strips the belt" : ""}`, "inbox", m.expires <= 2 ? T.neg : T.warn]);
  });
  // 3) Overtraining > 60
  g.roster.filter(f => f.overtraining > 60).forEach(f => {
    priorities.push([`${f.name} overtraining at ${Math.round(f.overtraining)}% — switch to recovery before injury risk climbs`, "roster", T.warn]);
  });
  // 4) Low morale
  g.roster.filter(f => f.morale < 25).forEach(f => {
    priorities.push([`Low morale: ${f.name} (${Math.round(f.morale)}%)`, "roster", T.warn]);
  });
  // 5) Injured
  g.roster.filter(f => f.injury).forEach(f => {
    priorities.push([`${f.name} injured — ${f.injury.label || "recovering"} (${f.injury?.weeks ?? "?"}w remaining)`, "roster", T.warn]);
  });
  // 6) Contract expiring (1 fight left)
  g.roster.filter(f => f.contract && f.contract.fightsLeft === 1).forEach(f => {
    priorities.push([`${f.name} has 1 fight left on contract — open renewal talks or let him walk`, "roster", T.warn]);
  });
  // Cap at 12
  const topPriorities = priorities.slice(0, 12);

  // ---- Upcoming fights ----------------------------------------------------------
  const fights = bookedSorted;

  // ---- Feed from g.log + fightHistory -------------------------------------------
  const feed = [];
  g.roster.forEach(f => {
    if (f.fightHistory) {
      f.fightHistory.forEach(h => {
        feed.push([h.week, f.name, `${h.result === "W" ? "def." : h.result === "L" ? "lost to" : "drew"} ${h.opponent} via ${h.method} R${h.round}${h.title ? " — retains title" : ""}`, h.result === "W" ? T.pos : h.result === "L" ? T.neg : T.txt3]);
      });
    }
  });
  g.log.forEach(l => {
    const wMatch = l.match(/^W(\d+):/);
    const wk = wMatch ? parseInt(wMatch[1]) : g.week;
    const c = l.includes("🏆") || l.includes("menang") || l.includes("def.") || l.includes("wins") ? T.pos
      : l.includes("kalah") || l.includes("loses") ? T.neg
      : l.includes("cedera") || l.includes("injury") || l.includes("overtraining") ? T.warn
      : l.includes("Scout") || l.includes("sponsor") || l.includes("Sponsor") ? T.steel
      : T.txt2;
    // Extract who and what from log entry
    const whoMatch = l.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/);
    const who = whoMatch ? whoMatch[1] : "";
    const txt = who ? l.slice(who.length).replace(/^[:\s—\-]+/, "").trim() : l;
    feed.push([wk, who || "Camp", txt, c]);
  });
  // Deduplicate and sort
  const seen = new Set();
  const dedupedFeed = feed.filter(item => {
    const key = `${item[0]}|${item[1]}|${item[2].slice(0, 40)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => b[0] - a[0]).slice(0, 18);

  // ---- RENDER -------------------------------------------------------------------
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* KPI STRIP — 4 cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {kpis.map(([l, v, c, d, to]) => (
          <Panel key={l} pad={0}>
            <button className="row" onClick={() => setTab(to)} aria-label={`${l} - ${v}`} style={{ display: "block", width: "100%", textAlign: "left", padding: 14, border: "none", background: "transparent", cursor: "pointer", borderRadius: T.r2 }}>
              <div style={{ fontFamily: T.body, fontSize: 10, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: T.txt3, marginBottom: 4 }}>{l}</div>
              <div style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
              <div style={{ fontFamily: T.body, fontSize: 10.5, color: T.txt3, marginTop: 5 }}>{d}</div>
            </button>
          </Panel>
        ))}
      </div>

      {/* FTUE Objectives */}
      {(() => {
        const objectives = getObjectives(g);
        if (objectives.length === 0) return null;
        return (
          <Panel pad={0} style={{ borderColor: T.gold, border: `1px solid ${T.gold}44`, background: `${T.gold}08` }}>
            <div style={{ padding: "12px 18px" }}>
              <Eyebrow color={T.gold}>📋 Getting Started</Eyebrow>
              {objectives.slice(0, 3).map((o, i) => (
                <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", fontFamily: T.body, fontSize: 13, color: T.txt2 }}>
                  <span style={{ width: 20, height: 20, borderRadius: 10, background: `${T.gold}22`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.mono, fontSize: 11, color: T.gold, flexShrink: 0 }}>{i + 1}</span>
                  <span>{o.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 10, color: T.txt3 }}>{o.hint}</span>
                </div>
              ))}
             </div>
           </Panel>
        );
      })()}
      {/* PRIORITIES THIS WEEK */}
      <Panel pad={0}>
        <div style={{ padding: "14px 18px 2px" }}><Eyebrow color={T.ember}>{t("UI.priorities")}</Eyebrow></div>
        {topPriorities.length === 0 && (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, padding: "11px 18px" }}>{t("UI.allClearHint")}</div>
        )}
        {topPriorities.map(([txt, to, c], i, arr) => (
          <button key={i} className="row" onClick={() => setTab(to)} aria-label={`Priority ${i+1}: ${txt}`} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "11px 18px", border: "none", borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : "none", background: "transparent", cursor: "pointer" }}>
            <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: c, width: 18 }}>{i + 1}</span>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: c, flexShrink: 0 }} />
            <span style={{ fontFamily: T.body, fontSize: 13, color: T.txt, flex: 1 }}>{txt}</span>
            <span style={{ color: T.txt3, display: "flex" }}><Icon d={ICONS.chevR} size={14} /></span>
          </button>
        ))}
      </Panel>

      {/* UPCOMING FIGHTS TABLE */}
      <Panel pad={0} style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 18px 2px" }}><Eyebrow>{t("UI.upcomingFights")}</Eyebrow></div>
        {fights.length === 0 && (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, padding: "11px 18px" }}>
            {t("UI.noFightsHint")}
          </div>
        )}
        {fights.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,1.2fr) minmax(160px,1fr) 1fr 90px 130px 60px 30px", alignItems: "center", padding: "0 18px", height: 32, background: T.raised, borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}` }}>
              {[t("UI.fighter"), t("UI.opponent"), t("UI.event"), t("UI.tier"), t("UI.purse"), t("UI.weeksIn"), ""].map((col, i) => (
                <span key={i} style={{ fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.txt3, textAlign: i === 4 || i === 5 ? "right" : "left" }}>{col}</span>
              ))}
            </div>
            {fights.map((f, i, arr) => {
              const bk = f.booked;
              const oppName = bk.opponent.name;
              const oppRank = bk.oppRank != null ? `#${bk.oppRank}` : "";
              const event = bk.title ? `${bk.tier} ${t("UI.championship")}` : `${bk.tier} ${t("UI.fightNight")}`;
              const purseStr = `${fmt$(bk.show)} + ${fmt$(bk.winBonus)}`;
              const weeks = bk.weeksLeft;
              const ac = ARCH_COLOR[f.archetype] || T.steel;
              return (
                <div key={f.id} className="row" onClick={() => setActiveFight(f.id)} style={{ display: "grid", gridTemplateColumns: "minmax(180px,1.2fr) minmax(160px,1fr) 1fr 90px 130px 60px 30px", alignItems: "center", padding: "0 18px", height: 52, cursor: "pointer", borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Mono name={f.name} color={ac} size={32} region={f.region} titleTier={isChamp(f) ? (f.titles?.includes("Major World Champion") ? "Major" : "National") : null} />
                    <div>
                      <div style={{ fontFamily: T.body, fontSize: 13.5, fontWeight: 600, color: T.txt }}>{f.name}</div>
                      <div style={{ fontFamily: T.body, fontSize: 10.5, color: T.txt3 }}>{f.weightClass}</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: T.body, fontSize: 13, color: T.txt2 }}>{oppName}{oppRank ? " " : ""}<span style={{ fontFamily: T.mono, fontSize: 11, color: T.gold }}>{oppRank}</span></span>
                  <span style={{ fontFamily: T.body, fontSize: 12, color: T.txt3 }}>{event}</span>
                  <span>{bk.title ? <Tag color={T.gold} solid>{t("UI.title")}</Tag> : <Tag color={T.steel}>{bk.tier}</Tag>}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 12.5, color: T.txt2, textAlign: "right" }}>{purseStr}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: T.ember, textAlign: "right" }}>{weeks}w</span>
                  <span style={{ color: T.txt3, display: "flex", justifyContent: "flex-end" }}><Icon d={ICONS.chevR} size={14} /></span>
                </div>
              );
            })}
          </>
        )}
      </Panel>

      {/* CAMP FEED */}
      <Panel pad={0}>
        <div style={{ padding: "14px 18px 2px" }}><Eyebrow>{t("UI.campFeed")}</Eyebrow></div>
        {dedupedFeed.length === 0 && (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, padding: "9px 18px" }}>{t("UI.noEventsHint")}</div>
        )}
        {dedupedFeed.map(([wk, who, txt, c], i, arr) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 18px", borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : "none" }}>
            <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.txt3, width: 32, flexShrink: 0 }}>W{String(wk).padStart(2, "0")}</span>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: c, flexShrink: 0 }} />
            <span style={{ fontFamily: T.body, fontSize: 13, color: T.txt2 }}><b style={{ color: T.txt }}>{who}</b> — {txt}</span>
          </div>
        ))}
      </Panel>
      {dispatch && (
        <Panel style={{ marginTop: 12 }}>
          <Eyebrow>Quick Actions</Eyebrow>
          <Btn onClick={() => dispatch({ type: "TEAM_BONDING" })} style={{ width: "100%" }}>
            🤝 Team Bonding ($2K) — Chemistry +8
          </Btn>
          <div style={{ fontFamily: T.body, fontSize: 10, color: T.txt3, marginTop: 4, textAlign: "center" }}>
            Cooldown: 12 weeks · Current chemistry: {Math.round(g.chemistry)}
          </div>
        </Panel>
      )}
    </div>
  );
}
