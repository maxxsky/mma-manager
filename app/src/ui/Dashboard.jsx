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
        {kpis.map(([l, v, c, d, to], idx) => {
          const isHero = idx === 0;
          // Format fight matchup for hero card
          const fighterName = nextFight?.name;
          const oppName = nextFight?.booked?.opponent?.name;
          const showMatchup = isHero && nextFight && fighterName && oppName;
          return (
          <Panel key={l} pad={0} style={isHero ? { borderColor: c, boxShadow: `0 0 0 1px ${c}22, 0 4px 20px rgba(0,0,0,.3)`, background: `linear-gradient(160deg, ${T.surface} 0%, ${T.raised} 100%)` } : {}}>
            <button className="row" onClick={() => setTab(to)} aria-label={`${l} - ${v}`} style={{ display: "block", width: "100%", textAlign: "left", padding: isHero ? 24 : 18, border: "none", background: "transparent", cursor: "pointer", borderRadius: T.r2 }}>
              <div style={{ fontFamily: T.body, fontSize: 11, fontWeight: 700, letterSpacing: isHero ? 2 : 1.5, textTransform: "uppercase", color: T.txt3, opacity: isHero ? 0.6 : 1, marginBottom: isHero ? 12 : 8 }}>{l}</div>
              <div style={{ fontFamily: T.mono, fontSize: isHero ? 40 : 30, fontWeight: 800, color: c, lineHeight: 1 }}>{v}</div>
              {showMatchup ? (
                <div style={{ fontFamily: T.body, fontSize: 13, fontWeight: 600, color: T.txt2, lineHeight: 1.5, marginTop: 12 }}>
                  <span style={{ color: T.txt }}>{fighterName}</span>
                  <span style={{ display: "block", color: T.txt3, fontSize: 11, fontWeight: 500, margin: "2px 0" }}>vs</span>
                  <span style={{ color: T.txt }}>{oppName}</span>
                </div>
              ) : (
              <div style={{ fontFamily: T.body, fontSize: 11, lineHeight: 1.4, opacity: 0.8, color: T.txt3, marginTop: 8 }}>{d}</div>
              )}
              {isHero && nextFight && (
                <div style={{ marginTop: 16, textAlign: "right" }}>
                  <span style={{ fontFamily: T.body, fontSize: 11.5, fontWeight: 600, color: c, cursor: "pointer", borderBottom: `1px solid transparent` }}
                    onMouseEnter={e => e.target.style.borderBottomColor = c}
                    onMouseLeave={e => e.target.style.borderBottomColor = "transparent"}>
                    View Fight →
                  </span>
                </div>
              )}
            </button>
          </Panel>
          );
        })}
      </div>

      {/* FTUE Objectives */}
      {(() => {
        const objectives = getObjectives(g);
        const allObjectives = 7; // OBJECTIVES.length in onboarding.js
        const completedCount = allObjectives - objectives.length;
        if (objectives.length === 0) return null;
        return (
          <Panel pad={0} style={{ borderColor: T.gold, border: `1px solid ${T.gold}44`, background: `${T.gold}08` }}>
            <div style={{ padding: "14px 20px 4px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <Eyebrow color={T.gold}>📋 Getting Started</Eyebrow>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: T.gold, opacity: 0.7 }}>{completedCount} / {allObjectives} Completed</span>
              </div>
            </div>
            <div style={{ padding: "10px 20px 14px" }}>
              {objectives.slice(0, 4).map((o, i) => {
                const isFirst = i === 0;
                return (
                <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontFamily: T.body, fontSize: 13, color: T.txt2, lineHeight: 1.3 }}>
                  <span style={{ width: 18, height: 18, borderRadius: 9, background: isFirst ? `${T.gold}33` : `${T.gold}18`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.mono, fontSize: 10, color: isFirst ? T.gold : `${T.gold}aa`, flexShrink: 0 }}>{i + 1}</span>
                  <span style={{ color: isFirst ? T.txt : T.txt2, fontWeight: isFirst ? 600 : 400 }}>{o.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 9, color: T.txt3, opacity: 0.5, whiteSpace: "nowrap" }}>{o.hint}</span>
                </div>
              )})}
            </div>
           </Panel>
        );
      })()}
      {/* PRIORITIES THIS WEEK */}
      <Panel pad={0}>
        <div style={{ padding: "18px 20px 6px" }}><Eyebrow color={T.ember}>{t("UI.priorities")}</Eyebrow></div>
        {topPriorities.length === 0 && (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, padding: "18px 20px" }}>{t("UI.allClearHint")}</div>
        )}
        {topPriorities.map(([txt, to, c], i, arr) => {
          // Parse priority text into structured parts
          const nameMatch = txt.match(/^(?:Set game plan|Fight offer) for (.+?)(?: —| expires)/);
          const nameMatch2 = txt.match(/^(Low morale: )(.+?) \(/);
          const nameMatch3 = txt.match(/^(.+?)(?: (?:overtraining|injured|has \d fight))/);
          const dashSplit = txt.split(' — ');
          const prefix = dashSplit.length > 1 ? dashSplit[0] : '';
          const status = dashSplit.length > 1 ? dashSplit[1] : txt;
          let action = '';
          let fighterName = '';
          if (nameMatch) {
            action = txt.startsWith('Set game plan') ? 'Game Plan' : 'Fight Offer';
            fighterName = nameMatch[1];
          } else if (nameMatch2) {
            action = 'Low Morale';
            fighterName = nameMatch2[2];
          } else if (nameMatch3) {
            if (txt.includes('overtraining')) action = 'Overtraining';
            else if (txt.includes('injured')) action = 'Injury';
            else if (txt.includes('contract')) action = 'Contract';
            else action = 'Action Needed';
            fighterName = nameMatch3[1];
          } else {
            action = 'Action Needed';
            fighterName = '';
          }
          return (
          <button key={i} className="row" onClick={() => setTab(to)} aria-label={`Priority ${i+1}: ${txt}`} style={{ display: "flex", alignItems: "center", gap: 16, width: "100%", textAlign: "left", padding: "14px 20px", border: "none", borderBottom: i < arr.length - 1 ? `1px solid ${T.line}44` : "none", background: "transparent", cursor: "pointer", minHeight: 68 }}>
            <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color: c, width: 22, flexShrink: 0, lineHeight: 1 }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.body, fontSize: 14, fontWeight: 700, color: c, marginBottom: 2 }}>{action}</div>
              {fighterName && <div style={{ fontFamily: T.body, fontSize: 13, fontWeight: 600, color: T.txt, marginBottom: 1 }}>{fighterName}</div>}
              <div style={{ fontFamily: T.body, fontSize: 11, fontWeight: 400, color: T.txt3, opacity: 0.75, lineHeight: 1.3 }}>{status}</div>
            </div>
            <span style={{ color: `${c}99`, flexShrink: 0 }}><Icon d={ICONS.chevR} size={16} /></span>
          </button>
          );
        })}
      </Panel>

      {/* UPCOMING FIGHTS TABLE */}
      <Panel pad={0} style={{ overflow: "hidden" }}>
        <div style={{ padding: "18px 20px 6px" }}><Eyebrow>{t("UI.upcomingFights")}</Eyebrow></div>
        {fights.length === 0 && (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, padding: "18px 20px" }}>
            {t("UI.noFightsHint")}
          </div>
        )}
        {fights.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(180px,1.2fr) minmax(160px,1fr) 1fr 90px 130px 60px 30px", alignItems: "center", padding: "0 18px", height: 32, background: T.raised, borderTop: `1px solid ${T.line}`, borderBottom: `1px solid ${T.line}` }}>
              {[t("UI.fighter"), t("UI.opponent"), t("UI.event"), t("UI.tier"), t("UI.purse"), t("UI.weeksIn"), ""].map((col, i) => (
                <span key={i} style={{ fontFamily: T.body, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: T.txt3, textAlign: i === 4 || i === 5 ? "right" : "left" }}>{col}</span>
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
                      <div style={{ fontFamily: T.body, fontSize: 15, fontWeight: 700, color: T.txt }}>{f.name}</div>
                      <div style={{ fontFamily: T.body, fontSize: 11.5, color: T.txt3 }}>{f.weightClass}</div>
                    </div>
                  </div>
                  <span style={{ fontFamily: T.body, fontSize: 13, color: T.txt2 }}>{oppName}{oppRank ? " " : ""}<span style={{ fontFamily: T.mono, fontSize: 11, color: T.gold }}>{oppRank}</span></span>
                  <span style={{ fontFamily: T.body, fontSize: 12, color: T.txt3 }}>{event}</span>
                  <span>{bk.title ? <Tag color={T.gold} solid>{t("UI.title")}</Tag> : <Tag color={T.steel}>{bk.tier}</Tag>}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 12.5, color: T.txt2, textAlign: "right" }}>{purseStr}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 17, fontWeight: 800, color: T.ember, textAlign: "right" }}>{weeks}w</span>
                  <span style={{ color: T.txt3, display: "flex", justifyContent: "flex-end" }}><Icon d={ICONS.chevR} size={14} /></span>
                </div>
              );
            })}
          </>
        )}
      </Panel>

      {/* CAMP FEED */}
      <Panel pad={0}>
        <div style={{ padding: "18px 20px 6px" }}><Eyebrow>{t("UI.campFeed")}</Eyebrow></div>
        {dedupedFeed.length === 0 && (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, padding: "18px 20px" }}>{t("UI.noEventsHint")}</div>
        )}
        {dedupedFeed.map(([wk, who, txt, c], i, arr) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : "none" }}>
            <span style={{ fontFamily: T.mono, fontSize: 10.5, color: T.txt3, width: 32, flexShrink: 0 }}>W{String(wk).padStart(2, "0")}</span>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: c, flexShrink: 0 }} />
            <span style={{ fontFamily: T.body, fontSize: 13, color: T.txt2 }}><b style={{ color: T.txt }}>{who}</b> — {txt}</span>
          </div>
        ))}
      </Panel>
      {dispatch && (
        <Panel style={{ marginTop: 16 }}>
          <div style={{ padding: "0 0 6px" }}>
            <Eyebrow>Quick Actions</Eyebrow>
          </div>
          <Btn onClick={() => dispatch({ type: "TEAM_BONDING" })} style={{ width: "100%" }}>
            🤝 Team Bonding ($2K) — Chemistry +8
          </Btn>
          <div style={{ fontFamily: T.body, fontSize: 10, color: T.txt3, marginTop: 8, textAlign: "center" }}>
            Cooldown: 12 weeks · Current chemistry: {Math.round(g.chemistry)}
          </div>
        </Panel>
      )}
    </div>
  );
}
