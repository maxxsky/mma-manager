import React, { useState, useEffect, useRef } from "react";
import { useLang } from "./ui/LangContext.jsx";

// ===== ENGINE: pure JS, zero React — bisa di-import oleh server Node nanti =====
import { R, RI, clamp, pick, fmt$, uid, random } from "./engine/rng.js";
import {
  ATTRS, ATTR_LABEL, WEIGHTS, ARCH_COLOR, TRAITS, AMBITIONS, AMBITION_KEYS,
  AGENT_TYPES, GAME_PLANS, TRAINING, INTENSITY, COACH_PERSONALITIES,
  CAMP_TIERS, CAMP_SPECS, SPONSOR_BRANDS, FAC_LABEL, RIVAL_TRAITS, PROMO_TIERS,
  ACHIEVEMENTS,
} from "./engine/data.js";
import { genFighter, assignAgent, agentFor, avgSkill, tierOf, weeklyFee, scoutGrade, makeReport, genCoach, genBio } from "./engine/fighter.js";
import { genDivisions, rankOf, vacateTitle, stripTitle, initPromoterRel } from "./engine/rankings.js";
import { genRivalCamp } from "./engine/rivals.js";
import { facilityCost } from "./engine/economy.js";
import {newGame, tick} from "./engine/state.js";
import { reducer } from "./engine/reducer.js";
import { checkAchievements } from "./engine/achievements.js";

// ===== UI: React components =====
import { C, DISPLAY, GlobalStyle, cut, Card, H, Btn, Tag, Bar, OVR, Meter } from "./ui/theme.jsx";
import FightNight from "./ui/FightNight.jsx";
import FighterCard from "./ui/FighterCard.jsx";
import NegotiateModal from "./ui/NegotiateModal.jsx";

// ============================================================
//   SAVE
// ============================================================
// Save version: bump when schema changes. Use migrationMap for backward compat.
// v3 → v4: added medical clause to default contracts (2026-07-07)
const SAVE_PREFIX = "mma-manager-save-v4";

function saveKey(slot) { return `${SAVE_PREFIX}-slot${slot}`; }
function getSaveSlot() { try { return parseInt(localStorage.getItem(`${SAVE_PREFIX}-active`)) || 1; } catch { return 1; } }
function setSaveSlot(s) { try { localStorage.setItem(`${SAVE_PREFIX}-active`, String(s)); } catch {} }

// ============================================================
//   MAIN APP
// ============================================================
export default function App() {
  const [g, setG] = useState(newGame);
  const [tab, setTab] = useState("dashboard");
  const [activeFight, setActiveFight] = useState(null);
  const [weekFlash, setWeekFlash] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [rankDiv, setRankDiv] = useState(null);
  const [resetArm, setResetArm] = useState(false);
  const [nego, setNego] = useState(null);
  const [saveSlot, setSaveSlotState] = useState(getSaveSlot());
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [scoutFilterArch, setScoutFilterArch] = useState(null);
  const [scoutFilterWC, setScoutFilterWC] = useState(null);
  const [slotInfo, setSlotInfo] = useState([]);
  const { t, lang, setLang } = useLang();

  const SAVE_KEY = saveKey(saveSlot);

  // Load slot previews
  const refreshSlotInfo = () => {
    const info = [];
    for (let i = 1; i <= 3; i++) {
      try {
        const raw = localStorage.getItem(saveKey(i));
        if (raw) {
          const s = JSON.parse(raw);
          info.push({ slot: i, exists: true, week: s.week || "?", cash: s.cash, rep: s.rep, roster: s.roster?.length || 0 });
        } else info.push({ slot: i, exists: false });
      } catch { info.push({ slot: i, exists: false }); }
    }
    setSlotInfo(info);
  };

  useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (raw) {
          const s = JSON.parse(raw);
          if (s.week == null || !s.roster || s.cash == null) {
            s.week = 1; s.cash = 100000; s.roster = []; s.log = ["Save rusak — dimulai ulang."];
          }
          if (!s.divisions) s.divisions = genDivisions();
          if (!s.rivals) s.rivals = [genRivalCamp(0), genRivalCamp(1), genRivalCamp(2)];
          if (!s.promoterRel) s.promoterRel = initPromoterRel();
          if (s.campTier == null) s.campTier = 0;
          if (s.loan == null) s.loan = null;
          if (!s.campTag) s.campTag = pick(Object.keys(RIVAL_TRAITS));
          if (!s.relationships) s.relationships = {};
          if (s.openGymActive == null) s.openGymActive = false;
          if (s.sponsor == null) s.sponsor = null;
          if (!s.investors) s.investors = [];
          if (s.rep == null || isNaN(s.rep) || s.rep <= 0) s.rep = 8;
          if (!s.sponsors) {
            s.sponsors = s.sponsor ? [{ brand: s.sponsor.brand, terms: "placement", rate: s.sponsor.rate, weeksLeft: null }] : [];
          }
          delete s.sponsor;
          s.roster.forEach((f) => {
            if (!f.ambition) f.ambition = pick(AMBITION_KEYS);
            if (!f.agent) f.agent = agentFor(f);
            if (!f.contract) f.contract = { managerCut: 0.18, fightsLeft: 4, fightsTotal: 4, durationMo: 24, signedWeek: f.joinedWeek || 0, renegoFlagged: false };
            f.injuryCount = f.injuryCount || 0;
            f.seriousInjuries = f.seriousInjuries || 0;
          });
          setG(s);
        }
      } catch (e) { /* belum ada save */ }
      setLoaded(true);
      refreshSlotInfo();
    })();
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e) => {
      // Don't fire when typing in inputs
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      // Space = advance week
      if (e.code === "Space" && !g.over && !activeFight && !nego && !weeklySummary) {
        e.preventDefault();
        advance();
      }
      // Ctrl+Z = undo
      if (e.ctrlKey && e.code === "KeyZ" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
      }
      // Ctrl+Y = redo
      if (e.ctrlKey && e.code === "KeyY") {
        e.preventDefault();
        dispatch({ type: "REDO" });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [g.over, activeFight, nego, weeklySummary]);

  const saveTimer = useRef(null);
  const up = (fn) => setG((old) => {
    const n = structuredClone(old);
    fn(n);
    // Throttle localStorage saves — avoid blocking on every click
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(n)); } catch (e) {}
    }, 1000);
    return n;
  });

  const dispatch = (action) => {
    up((n) => reducer(n, action));
  };

  const advance = () => {
    up((n) => { tick(n); n.log = n.log.slice(0, 30); checkAchievements(n); });
    setWeekFlash((x) => x + 1);
    // Weekly summary: capture changes after tick
    setTimeout(() => {
      setG((current) => {
        const highlights = current.log.slice(0, 5);
        const injured = current.roster.filter((f) => f.injury);
        setWeeklySummary({
          week: current.week,
          cash: current.cash,
          rep: current.rep,
          rosterCount: current.roster.length,
          inboxCount: current.inbox.length,
          injuredCount: injured.length,
          injuredNames: injured.map((f) => f.name).slice(0, 3),
          highlights,
        });
        return current;
      });
    }, 50);
  };

  useEffect(() => {
    const dueList = g.roster.filter((f) => f.booked && f.booked.weeksLeft <= 0 && !f.injury);
    if (dueList.length > 0 && !activeFight && !g.over) setActiveFight(dueList[0].id);
  }, [g.week, activeFight, g.roster.length]);

  const fightFighter = activeFight ? g.roster.find((f) => f.id === activeFight) : null;

  const scout = (cost, level, label, filterArch, filterWC) => {
    const grade = scoutGrade(g.rep);
    let f = assignAgent(genFighter(R(level[0], level[1])));
    if (filterArch || filterWC) {
      for (let attempt = 0; attempt < 5; attempt++) {
        if ((!filterArch || f.archetype === filterArch) && (!filterWC || f.weightClass === filterWC)) break;
        f = assignAgent(genFighter(R(level[0], level[1])));
      }
    }
    const report = makeReport(f, grade);
    dispatch({ type: "SCOUT", cost, fighter: f, report, grade, method: label });
  };

  const monthlyBurn = g.coaches.reduce((s, c) => s + ((!c.freeUntil || g.week > c.freeUntil) ? c.salary : 0), 0)
    + Math.round(Object.values(g.facilities).reduce((s, l) => s + l * 30000, 0) * 0.05)
    + g.roster.reduce((s, f) => s + (f.injury ? 0 : TRAINING[f.booked ? "fightcamp" : f.training.type].cost * 4), 0);
  const monthlyIn = g.roster.reduce((s, f) => s + weeklyFee(f) * 4, 0) + g.rep * 500 + g.roster.reduce((s, f) => s + f.popularity * 150, 0);

  const tier = CAMP_TIERS[g.campTier || 0];
  const coachCap = tier.coachCap;
  const rosterCap = tier.rosterCap;

  const tabs = [
    ["dashboard", "🏠", t("UI.camp")], ["roster", "👥", t("UI.roster")], ["rank", "🏆", t("UI.rank")],
    ["scout", "🔍", t("UI.scout")],
    ["inbox", "📨", `Inbox${g.inbox.length ? ` ${g.inbox.length}${g.inbox.some((m) => m.expires != null && m.expires <= 2) ? " ⚠️" : ""}` : ""}`],
    ["finance", "💰", "KEUANGAN"],
    ["mgmt", "🏗️", t("UI.staff")], ["rivals", "⚔️", t("UI.rival")],
  ];

  if (!loaded) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <GlobalStyle />
      <div style={{ fontFamily: DISPLAY, color: C.gold, letterSpacing: 4, fontSize: 18, animation: "goldglow 1.5s infinite" }}>LOADING CAMP…</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse 100% 40% at 50% 0%, ${C.spot} 0%, ${C.bg} 70%)`, fontFamily: "ui-sans-serif, system-ui, sans-serif", paddingBottom: 84 }}>
      <GlobalStyle />

      {/* week flash */}
      {weekFlash > 0 && (
        <div key={weekFlash} style={{ position: "fixed", top: "40%", left: "50%", zIndex: 40, pointerEvents: "none", fontFamily: DISPLAY, fontSize: 40, letterSpacing: 6, color: C.gold, textShadow: "0 0 30px rgba(230,182,76,.6)", animation: "weekpop 1.1s ease both", textTransform: "uppercase" }}>
          Week {g.week}
        </div>
      )}

      {/* HEADER */}
      <div style={{ borderBottom: `2px solid ${C.gold}`, background: "linear-gradient(180deg, #10151f, #07090f)", padding: "12px 14px 10px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontFamily: DISPLAY, fontSize: 22, letterSpacing: 3, textTransform: "uppercase", background: `linear-gradient(180deg, #f6d98a, ${C.gold} 55%, #a37c2c)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", lineHeight: 1 }}>
                Iron Path MMA
              </div>
              <div style={{ color: C.dim, fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginTop: 3 }}>
                Y{Math.floor((g.week - 1) / 48) + 1} · Bulan {Math.floor(((g.week - 1) % 48) / 4) + 1} · Minggu {((g.week - 1) % 4) + 1}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 8, letterSpacing: 2, color: C.dim, textTransform: "uppercase" }}>{t("UI.bank")}</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 20, color: g.cash < 0 ? C.red : C.chalk, lineHeight: 1 }}>{fmt$(g.cash)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 10 }}>
            <Meter label={t("UI.reputation")} v={g.rep} color={C.gold} />
            <Meter label={t("UI.chemistry")} v={g.chemistry} color={g.chemistry >= 60 ? C.green : C.red} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 8, letterSpacing: 1.5, color: C.dim, textTransform: "uppercase", marginBottom: 2 }}>{t("UI.legacy")}</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 14, color: C.gold, lineHeight: 1 }}>★ {(g.legacy || 0).toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: 12 }}>
        {/* Win Condition Display */}
        {(g.legacy || 0) > 0 && (() => {
          const wcLegacy = g.legacy;
          const wc = wcLegacy >= 100000 ? { tier: "GOAT", icon: "🐐", color: "#ff4488", label: "Greatest of All Time", unlocked: true, total: 5 }
            : wcLegacy >= 50000 ? { tier: "Platinum", icon: "💎", color: "#b5e4ff", label: "MMA Empire", unlocked: true, total: 5 }
            : wcLegacy >= 25000 ? { tier: "Gold", icon: "👑", color: C.gold, label: "World Class Camp", unlocked: true, total: 5 }
            : wcLegacy >= 12000 ? { tier: "Silver", icon: "🥈", color: "#b0b8c8", label: "Respected Camp", unlocked: true, total: 5 }
            : wcLegacy >= 5000 ? { tier: "Bronze", icon: "🥉", color: "#c48a4a", label: "Rising Camp", unlocked: true, total: 5 }
            : null;
          if (!wc) return null;
          return (
            <Card accent={wc.color} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28 }}>{wc.icon}</div>
              <div style={{ fontFamily: DISPLAY, color: wc.color, fontSize: 18, letterSpacing: 2, textTransform: "uppercase", animation: wc.unlocked ? "goldglow 2s infinite" : "none" }}>{wc.label}</div>
              <div style={{ color: C.dim, fontSize: 12, marginTop: 3 }}>{wc.tier} — Legacy {(g.legacy || 0).toLocaleString()} pts · Tier {wc.total} tiers</div>
              <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 6 }}>
                {[{ k: "Bronze", i: "🥉" }, { k: "Silver", i: "🥈" }, { k: "Gold", i: "👑" }, { k: "Platinum", i: "💎" }, { k: "GOAT", i: "🐐" }].map((t) => (
                  <div key={t.k} style={{ fontSize: 12, opacity: g.legacy >= ({ Bronze: 5000, Silver: 12000, Gold: 25000, Platinum: 50000, GOAT: 100000 })[t.k] ? 1 : 0.2 }}>{t.i}</div>
                ))}
              </div>
            </Card>
          );
        })()}

        {g.over && (
          <Card accent={C.red} style={{ textAlign: "center", padding: 24 }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 32, letterSpacing: 3, color: C.red, textTransform: "uppercase", display: "inline-block", border: `3px solid ${C.red}`, padding: "2px 16px", transform: "rotate(-6deg)", ...cut(8) }}>Game Over</div>
            <div style={{ color: C.chalk, fontSize: 13, margin: "14px 0" }}>{g.over}</div>
            <Btn onClick={() => setG(newGame())}>Mulai Ulang</Btn>
          </Card>
        )}

        {/* ===== DASHBOARD ===== */}
        {tab === "dashboard" && !g.over && (
          <>
            <Card>
              <H>{t("UI.cashflow")}</H>
              <div style={{ display: "flex", justifyContent: "space-between", color: C.chalk, fontSize: 13, marginBottom: 3 }}>
                <span>💵 {t("UI.income")} (estimasi /bln)</span><b style={{ color: C.green, fontFamily: DISPLAY }}>{fmt$(monthlyIn)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: C.chalk, fontSize: 13 }}>
                <span>💸 {t("UI.expense")} (estimasi /bln)</span><b style={{ color: C.red, fontFamily: DISPLAY }}>{fmt$(monthlyBurn)}</b>
              </div>
              <div style={{ color: C.dim, fontSize: 10, marginTop: 2 }}>📅 Training cost dipotong mingguan. Sponsor/gaji/maintenance tiap bulan.</div>
              <div style={{ color: C.dim, fontSize: 11, marginTop: 6 }}>
                {monthlyIn < monthlyBurn ? "⚠️ Negatif — kamu butuh purse dari fight untuk bertahan." : "✅ Positif."} Bangkrut jika kas &lt; -$50K.
              </div>
            </Card>
            <Card accent={(g.sponsors && g.sponsors.length > 0) ? C.green : C.dim}>
              <H color={(g.sponsors && g.sponsors.length > 0) ? C.green : C.dim}>📢 Sponsor {g.sponsors?.length > 0 ? `(${g.sponsors.length})` : ""}</H>
              {g.sponsors && g.sponsors.length > 0 ? (
                g.sponsors.map((sp, i) => {
                  const brand = SPONSOR_BRANDS.find((b) => b.name === sp.brand);
                  const terms = sp.terms === "royalty" ? "Royalty" : "Placement";
                  const est = sp.rate + (sp.terms === "royalty" ? Math.round(sp.rate * (brand?.boostFight || 0.5)) : 0);
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: i < g.sponsors.length - 1 ? `1px solid ${C.line}55` : "none" }}>
                      <div>
                        <div style={{ color: C.chalk, fontSize: 13, fontFamily: DISPLAY, letterSpacing: 1 }}>{brand?.icon || "📢"} {sp.brand}</div>
                        <div style={{ color: C.dim, fontSize: 10 }}>{sp.terms === "placement" ? `${fmt$(sp.rate)}/bln tetap` : `${fmt$(sp.rate)}/bln + bonus kemenangan`} · {sp.weeksLeft ? `sisa ${sp.weeksLeft} mgg` : ""}</div>
                      </div>
                      <button onClick={() => dispatch({ type: "TERMINATE_SPONSOR", brand: sp.brand })} style={{ background: "none", border: `1px solid ${C.red}44`, color: C.red, padding: "3px 8px", fontSize: 9, cursor: "pointer", ...cut(4) }}>akhiri</button>
                    </div>
                  );
                })
              ) : (
                <div style={{ color: C.dim, fontSize: 12, marginBottom: 8 }}>Belum ada sponsor — advance minggu untuk menerima tawaran dari brand (berdasarkan reputasi camp). Maks 3 sponsor aktif.</div>
              )}
            </Card>
            <Card>
              <H>{t("UI.fightSchedule")}</H>
              {(() => { const offerCount = g.inbox.filter(m => m.type === "offer").length; return offerCount > 0 ? <div style={{ background: `${C.gold}18`, border: `1px solid ${C.gold}44`, padding: 8, marginBottom: 8, ...cut(4) }}><div style={{ color: C.gold, fontSize: 13, fontFamily: DISPLAY, letterSpacing: 1 }}>📨 {offerCount} tawaran fight menunggu — cek Inbox!</div></div> : null; })()}
              {g.roster.filter((f) => f.booked).length === 0 && <div style={{ color: C.dim, fontSize: 13 }}>Belum ada fight terjadwal — cek Inbox untuk offer promotor.</div>}
              {g.roster.filter((f) => f.booked).map((f) => (
                <div key={f.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.line}` }}>
                  <div style={{ color: C.chalk, fontSize: 13 }}>
                    <b style={{ color: C.red }}>{f.name}</b> <span style={{ color: C.gold, fontFamily: DISPLAY }}>vs</span> <b style={{ color: C.blue }}>{f.booked.opponent.name}</b> {f.booked.title && "🏆"}
                    <div style={{ color: C.dim, fontSize: 10 }}>{f.booked.tier} · show {fmt$(f.booked.show)}</div>
                  </div>
                  <div style={{ fontFamily: DISPLAY, color: C.gold, fontSize: 16 }}>T-{f.booked.weeksLeft}</div>
                </div>
              ))}
            </Card>
            <Card>
              <H>Camp Feed</H>
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                {g.log.map((l, i) => <div key={i} style={{ color: i === 0 ? C.chalk : C.dim, fontSize: 12, marginBottom: 5, paddingBottom: 5, borderBottom: `1px solid ${C.line}55` }}>{l}</div>)}
              </div>
            </Card>
            {g._unlocked && g._unlocked.length > 0 && (
              <Card>
                <H>🏆 Achievements · {g._unlocked.length}</H>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {g._unlocked.map((id) => {
                    const ach = ACHIEVEMENTS?.find((a) => a.id === id);
                    if (!ach) return null;
                    return (
                      <div key={id} style={{ background: C.panel2, border: `1px solid ${C.gold}44`, padding: "6px 10px", ...cut(6), fontSize: 10, color: C.chalk }}>
                        <span style={{ fontSize: 14 }}>{ach.icon}</span> <b>{ach.title}</b>
                        <div style={{ color: C.dim, fontSize: 9 }}>{ach.desc}</div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        )}

        {/* ===== ROSTER ===== */}
        {tab === "roster" && g.roster.map((f) => <FighterCard key={f.id} f={f} g={g} up={up} />)}

        {/* ===== RANKINGS ===== */}
        {tab === "rank" && (() => {
          const wc = rankDiv || (g.roster[0] && g.roster[0].weightClass) || "Lightweight";
          const div = g.divisions[wc];
          const playerNames = new Set(g.roster.filter((f) => f.weightClass === wc).map((f) => f.name));
          const combined = [
            // AI fighters only (exclude names that match player fighters)
            ...div.list.filter((c) => !playerNames.has(c.name)).map((c) => ({ name: c.name, points: c.points, player: false, arch: c.archetype })),
            // Player fighters with rank points (not the champion)
            ...g.roster.filter((f) => f.weightClass === wc && (f.rankPoints || 0) > 0 && !(div.champ.player && div.champ.fighterId === f.id)).map((f) => ({ name: f.name, points: f.rankPoints, player: true, arch: f.archetype })),
          ].sort((a, b) => b.points - a.points);
          const top = combined.slice(0, 15);
          const outside = combined.slice(15).filter((x) => x.player);
          const unranked = g.roster.filter((f) => f.weightClass === wc && !(f.rankPoints > 0) && !(div.champ.player && div.champ.fighterId === f.id));
          return (
            <>
              <Card>
                <H>Rankings · Divisi</H>
                <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 4 }}>
                  {WEIGHTS.map((w) => {
                    const has = g.roster.some((f) => f.weightClass === w.name);
                    return (
                      <button key={w.name} onClick={() => setRankDiv(w.name)} style={{ background: wc === w.name ? C.gold : C.panel2, color: wc === w.name ? "#0a0d14" : has ? C.chalk : C.dim, border: `1px solid ${C.line}`, padding: "4px 9px", fontSize: 10, cursor: "pointer", whiteSpace: "nowrap", fontFamily: DISPLAY, letterSpacing: 1, textTransform: "uppercase", flexShrink: 0, ...cut(5) }}>
                        {w.name}{has ? " ●" : ""}
                      </button>
                    );
                  })}
                </div>
              </Card>
              <Card accent={C.gold}>
                <H>{wc} · Champion & Top 15</H>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", marginBottom: 8, background: "rgba(230,182,76,.08)", border: `1px solid ${C.gold}`, ...cut(8) }}>
                  <span style={{ fontFamily: DISPLAY, color: C.gold, fontSize: 14, letterSpacing: 1, textTransform: "uppercase" }}>👑 {div.champ.name}</span>
                  <span style={{ fontSize: 10, color: div.champ.player ? C.green : C.dim, letterSpacing: 1 }}>{div.champ.player ? "CAMP KAMU" : "CHAMPION"}</span>
                </div>
                {top.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 8px", borderBottom: `1px solid ${C.line}44`, background: c.player ? "rgba(230,182,76,.07)" : "transparent" }}>
                    <span style={{ fontFamily: DISPLAY, color: c.player ? C.gold : C.dim, width: 28, fontSize: 14 }}>#{i + 1}</span>
                    <span style={{ flex: 1, color: c.player ? C.gold : C.chalk, fontSize: 13, fontWeight: c.player ? 700 : 400 }}>{c.name}{c.player ? " ★" : ""}</span>
                    <span style={{ color: C.dim, fontSize: 10 }}>{c.arch}{c.record ? ` · ${c.record.w}-${c.record.l}` : ""}</span>
                    <span style={{ fontFamily: DISPLAY, color: C.dim, fontSize: 12, width: 34, textAlign: "right" }}>{c.points}</span>
                  </div>
                ))}
                {outside.map((c, i) => (
                  <div key={"o" + i} style={{ color: C.dim, fontSize: 11, padding: "6px 8px" }}>Di luar Top 15: <b style={{ color: C.chalk }}>{c.name}</b> ({c.points} pts)</div>
                ))}
                {unranked.map((f) => (
                  <div key={f.id} style={{ color: C.dim, fontSize: 11, padding: "6px 8px" }}>Belum masuk ranking: <b style={{ color: C.chalk }}>{f.name}</b></div>
                ))}
              </Card>
            </>
          );
        })()}

        {/* ===== SCOUT ===== */}
        {tab === "scout" && (
          <>
            <Card>
              <H>Scouting Network · Grade {scoutGrade(g.rep)}</H>
              <div style={{ color: C.dim, fontSize: 11, marginBottom: 8 }}>Grade laporan naik seiring reputasi camp — laporan grade rendah bisa meleset jauh. Filter opsional di bawah fokuskan pencarian.</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: C.dim, marginRight: 4 }}>Archetype:</span>
                <button onClick={() => setScoutFilterArch(null)} style={{ background: !scoutFilterArch ? C.gold : C.panel2, color: !scoutFilterArch ? "#0a0d14" : C.dim, border: `1px solid ${C.line}`, padding: "2px 6px", fontSize: 9, cursor: "pointer", ...cut(3) }}>All</button>
                {Object.keys(ARCH_COLOR).map((arch) => (
                  <button key={arch} onClick={() => setScoutFilterArch(scoutFilterArch === arch ? null : arch)} style={{ background: scoutFilterArch === arch ? ARCH_COLOR[arch] : C.panel2, color: scoutFilterArch === arch ? "#fff" : C.dim, border: `1px solid ${C.line}`, padding: "2px 6px", fontSize: 9, cursor: "pointer", ...cut(3) }}>{arch}{scoutFilterArch === arch ? " ✓" : ""}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, color: C.dim, marginRight: 4 }}>Divisi:</span>
                <button onClick={() => setScoutFilterWC(null)} style={{ background: !scoutFilterWC ? C.gold : C.panel2, color: !scoutFilterWC ? "#0a0d14" : C.dim, border: `1px solid ${C.line}`, padding: "2px 6px", fontSize: 9, cursor: "pointer", ...cut(3) }}>All</button>
                {WEIGHTS.map((w) => (
                  <button key={w.name} onClick={() => setScoutFilterWC(scoutFilterWC === w.name ? null : w.name)} style={{ background: scoutFilterWC === w.name ? C.gold : C.panel2, color: scoutFilterWC === w.name ? "#0a0d14" : C.dim, border: `1px solid ${C.line}`, padding: "2px 6px", fontSize: 9, cursor: "pointer", ...cut(3) }}>{w.name}{scoutFilterWC === w.name ? " ✓" : ""}</button>
                ))}
              </div>
              {[
                ["Local Amateur Circuit", 50, [0.35, 0.6]],
                ["Regional Tryouts", 500, [0.5, 0.9]],
                ["National Scouting Trip", 2000, [0.8, 1.2]],
                ["Diamond in the Rough", 10000, [1.0, 1.45]],
              ].map(([label, cost, lvl]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.line}55` }}>
                  <div>
                    <div style={{ color: C.chalk, fontSize: 13, fontFamily: DISPLAY, letterSpacing: 1, textTransform: "uppercase" }}>{label}</div>
                    <div style={{ color: C.dim, fontSize: 11 }}>{cost ? fmt$(cost) : "Gratis"}</div>
                  </div>
                  <Btn small disabled={g.cash < cost || g.roster.length >= rosterCap} onClick={() => scout(cost, lvl, label, scoutFilterArch, scoutFilterWC)}>Kirim</Btn>
                </div>
              ))}
              {g.roster.length >= rosterCap && <div style={{ color: C.red, fontSize: 11, marginTop: 6 }}>Kapasitas camp penuh ({rosterCap} fighter).</div>}
            </Card>
            {g.prospects.map((p) => (
              <Card key={p.id} accent={ARCH_COLOR[p.fighter.archetype]}>
                <H>Scouting Report · Grade {p.grade}</H>
                <div style={{ fontFamily: DISPLAY, color: C.chalk, fontSize: 16, letterSpacing: 1, textTransform: "uppercase" }}>{p.fighter.name}</div>
                <div style={{ margin: "4px 0" }}>
                  <Tag color={ARCH_COLOR[p.fighter.archetype]}>{p.fighter.archetype}</Tag>
                  <Tag color={C.dim}>{p.fighter.weightClass}</Tag><Tag color={C.dim}>{p.fighter.age} th</Tag><Tag color={C.dim}>{p.fighter.region}</Tag>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, margin: "10px 0" }}>
                  {ATTRS.map((k) => (
                    <div key={k} style={{ background: "#0a0e17", padding: "5px 6px", textAlign: "center", ...cut(5) }}>
                      <div style={{ fontSize: 8, color: C.dim, letterSpacing: 1, textTransform: "uppercase" }}>{ATTR_LABEL[k]}</div>
                      <div style={{ fontFamily: DISPLAY, fontSize: 15, color: p.report.est[k] === "?" ? C.dim : C.gold }}>{p.report.est[k]}</div>
                    </div>
                  ))}
                </div>
                <div style={{ color: C.dim, fontSize: 12 }}>
                  Potensi: <span style={{ color: C.gold }}>{p.report.pot}</span>
                  {p.report.traits.length > 0 && <> · {p.report.traits.map((t) => <Tag key={t} color={C.red}>{t}</Tag>)}</>}
                {p.report.ambition && <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>🎯 {p.report.ambition}</div>}
                {p.report.bestCeiling && <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>📈 Top potential: <span style={{ color: C.gold }}>{ATTR_LABEL[p.report.bestCeiling.attr]} {p.report.bestCeiling.val}</span></div>}
                </div>
                <div style={{ color: C.dim, fontSize: 11, marginTop: 4 }}>🤝 {AGENT_TYPES[p.fighter.agent || "none"].label} · asking ~{fmt$(p.fighter.asking)}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <Btn small disabled={g.roster.length >= rosterCap} onClick={() => setNego({ fighter: p.fighter, mode: "sign", prospectId: p.id })}>Negosiasi</Btn>
                  <Btn small color={C.dim} onClick={() => dispatch({ type: "DISMISS_PROSPECT", prospectId: p.id })}>Pass</Btn>
                </div>
              </Card>
            ))}
          </>
        )}

        {/* ===== INBOX ===== */}
        {tab === "inbox" && (
          <>
            {g.inbox.length === 0 && <Card><div style={{ color: C.dim, fontSize: 13 }}>Inbox kosong — advance minggu, offer & event akan datang.</div></Card>}
            {g.inbox.length > 0 && (() => { const sorted = [...g.inbox].sort((a, b) => { const urgentA = (a.defense ? 3 : 0) + (a.expires != null && a.expires <= 2 ? 2 : 0) + (a.type === "offer" ? 1 : 0); const urgentB = (b.defense ? 3 : 0) + (b.expires != null && b.expires <= 2 ? 2 : 0) + (b.type === "offer" ? 1 : 0); return urgentB - urgentA; });
            return sorted.map((m) => {
              if (m.type === "offer") {
                const f = g.roster.find((x) => x.id === m.fighterId);
                if (!f || f.booked || f.injury) return null;
                return (
                  <Card key={m.id} accent={m.title ? C.gold : C.blue}>
                    <H color={m.title ? C.gold : C.blue}>{m.titleText || `Fight Offer · ${m.tier}`}</H>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, margin: "4px 0 8px" }}>
                      <span style={{ fontFamily: DISPLAY, color: C.red, fontSize: 15, textTransform: "uppercase" }}>{f.name}</span>
                      <span style={{ fontFamily: DISPLAY, color: C.gold, fontSize: 13 }}>VS</span>
                      <span style={{ fontFamily: DISPLAY, color: C.blue, fontSize: 15, textTransform: "uppercase" }}>{m.opponent.name}</span>
                    </div>
                    <div style={{ color: C.dim, fontSize: 11, textAlign: "center", marginBottom: 8 }}>
                      Lawan {m.oppRank ? <b style={{ color: C.gold }}>#{m.oppRank} </b> : m.oppRank === 0 ? <b style={{ color: C.gold }}>👑 </b> : ""}{m.opponent.record.w}-{m.opponent.record.l} ({m.opponent.archetype}) · Show <b style={{ color: C.chalk }}>{fmt$(m.show)}</b> + Win <b style={{ color: C.chalk }}>{fmt$(m.winBonus)}</b> · cut camp {Math.round(((f.contract && f.contract.managerCut) || 0.18) * 100)}% · T-{m.weeks} mgg · expire {m.expires} {m.expires <= 2 ? <b style={{ color: C.red }}>⚠️ SEGERA!</b> : "mgg"}{m.defense && <b style={{ color: C.red }}> · WAJIB — tolak = title dicopot</b>}
                      {g.promoterRel && <div style={{ marginTop: 4, fontSize: 10, color: (g.promoterRel[m.tier] || 30) >= 60 ? C.green : (g.promoterRel[m.tier] || 30) < 30 ? C.red : C.dim }}>🤝 Hubungan {m.tier}: {Math.round(g.promoterRel[m.tier] || 30)}/100</div>}
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                      <Btn small color={C.green} onClick={() => dispatch({ type: "ACCEPT_FIGHT", fighterId: m.fighterId, opponent: m.opponent, weeks: m.weeks, show: m.show, winBonus: m.winBonus, tier: m.tier, title: m.title, titleTier: m.titleTier, defense: m.defense, oppRank: m.oppRank, contenderId: m.contenderId, messageId: m.id })}>Accept</Btn>
                      <Btn small color={C.gold} onClick={() => {
                        const rel = (g.promoterRel && g.promoterRel[m.tier]) || 30;
                        const counterChance = clamp(rel + 20, 10, 90);
                        if (random() * 100 < counterChance) {
                          const boosted = Math.round(m.show * (1.15 + rel / 200));
                          dispatch({ type: "COUNTER_FIGHT", fighterId: m.fighterId, opponent: m.opponent, weeks: m.weeks, boosted, boostedWin: Math.round(m.winBonus * (1.15 + rel / 200)), tier: m.tier, title: m.title, titleTier: m.titleTier, defense: m.defense, oppRank: m.oppRank, contenderId: m.contenderId, messageId: m.id, rel });
                        } else {
                          dispatch({ type: "REJECT_FIGHT", fighterId: m.fighterId, tier: m.tier, messageId: m.id, stripTitle: m.defense });
                        }
                      }}>Counter</Btn>
                      <Btn small color={C.dim} onClick={() => dispatch({ type: "REJECT_FIGHT", fighterId: m.fighterId, tier: m.tier, messageId: m.id, stripTitle: m.defense })}>Reject</Btn>
                    </div>
                  </Card>
                );
              }
              return (
                <Card key={m.id} accent={C.red}>
                  <H color={C.red}>⚡ {m.title}</H>
                  <div style={{ color: C.chalk, fontSize: 13, marginBottom: 10 }}>{m.body}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {m.choices.map((c, i) => (
                      <Btn key={i} small onClick={() => {
                        if (c.openExtend != null) {
                          const f = g.roster.find((x) => x.id === c.openExtend);
                          dispatch({ type: "INBOX_REMOVE", messageId: m.id });
                          if (f) setNego({ fighter: f, mode: "extend" });
                          return;
                        }
dispatch({ type: "INBOX_EVENT", choiceIndex: i, messageId: m.id, choice: c, gambleRoll: c.gamble ? random() : null });
                      }}>{c.label}</Btn>
                    ))}
                  </div>
                </Card>
              );
            })})()}
          </>
        )}

        {/* ===== RIVALS ===== */}
        {tab === "rivals" && (
          <Card>
            <H>Rival Camps · Lingkungan MMA</H>
            <div style={{ color: C.dim, fontSize: 11, marginBottom: 12 }}>Camp saingan di scene MMA. Mereka merekrut, bertarung, dan bisa mengancam stabilitas campmu lewat poaching.</div>
            {g.rivals && g.rivals.map((rc) => (
              <Card key={rc.id} style={{ marginBottom: 10, padding: 10, background: C.panel }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div>
                    <span style={{ fontFamily: DISPLAY, color: C.chalk, fontSize: 16, letterSpacing: 1, textTransform: "uppercase" }}>{rc.name}</span>
                    <Tag color={ARCH_COLOR[Object.keys(ARCH_COLOR)[0]]}>{rc.trait}</Tag>
                  </div>
                  <span style={{ fontSize: 11, color: rc.rivalry > 50 ? C.red : rc.rivalry > 25 ? C.gold : C.dim }}>⚔️ Rivalry: {Math.round(rc.rivalry)}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, fontSize: 10, color: C.dim }}>
                  <div>Rep: <b style={{ color: C.chalk }}>{Math.round(rc.rep)}</b></div>
                  <div>Fighter: <b style={{ color: C.chalk }}>{rc.fighters.length}</b></div>
                  <div>Coach: <b style={{ color: C.chalk }}>{rc.coaches.length}</b></div>
                  <div>Chem: <b style={{ color: C.chalk }}>{Math.round(rc.chemistry)}</b></div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: C.dim, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Top Fighters</div>
                  {[...rc.fighters].sort((a, b) => avgSkill(b) - avgSkill(a)).slice(0, 3).map((f) => (
                    <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 11, borderBottom: `1px solid ${C.line}33` }}>
                      <span style={{ color: C.chalk }}>{f.name}</span>
                      <span style={{ color: C.dim }}>{f.record.w}-{f.record.l} · {tierOf(f)} · {f.weightClass}{f.injury && <span style={{ color: C.red }}> · 🚑</span>}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, borderTop: `1px solid ${C.line}33`, paddingTop: 8 }}>
                  <div style={{ fontSize: 10, color: C.dim, marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>Poach Fighter (click each row)</div>
                  {(() => {
                    const targets = [...rc.fighters].filter(f => !f.injury && !f.booked);
                    if (targets.length === 0) return <div style={{ color: C.dim, fontSize: 10 }}>No viable targets.</div>;
                    return targets.sort((a, b) => avgSkill(b) - avgSkill(a)).map((best) => {
                      const cost = Math.round(best.asking * 1.8 * (1 + rc.rivalry / 100));
                      const failCost = Math.round(cost * 0.2);
                      const successChance = clamp(55 - rc.rivalry * 0.4 - Math.round(avgSkill(best) - 50) * 0.3, 10, 85);
                      return (
                        <div key={best.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", borderBottom: `1px solid ${C.line}22` }}>
                          <div>
                            <span style={{ color: C.chalk, fontSize: 11 }}>{best.name}</span>
                            <span style={{ color: C.dim, fontSize: 9, marginLeft: 4 }}>{best.archetype} · {tierOf(best)} · {best.weightClass} · {Math.round(successChance)}%</span>
                          </div>
                          <Btn small color={C.red} disabled={g.cash < cost || g.roster.length >= rosterCap} onClick={() => up((n) => {
                            const riv = n.rivals.find(x => x.id === rc.id);
                            if (!riv) return;
                            const tf = riv.fighters.find(x => x.id === best.id);
                            if (!tf) return;
                            if (random() * 100 < successChance) {
                              tf.contract = { managerCut: 0.15, fightsLeft: 3, fightsTotal: 3, durationMo: 18, signedWeek: n.week, renegoFlagged: false };
                              tf.morale = clamp(tf.morale + 15, 0, 100);
                              n.roster.push(tf);
                              riv.fighters = riv.fighters.filter(x => x.id !== best.id);
                              n.cash -= cost;
                              riv.rivalry = clamp(riv.rivalry + 20, 0, 100);
                              n.log.unshift(`🦅 POACH SUKSES: ${best.name} (${best.archetype}) dari ${rc.name}!`);
                            } else {
                              n.cash -= failCost;
                              riv.rivalry = clamp(riv.rivalry + 5, 0, 100);
                              n.log.unshift(`❌ Poach ${best.name} GAGAL (-${fmt$(failCost)}) — ${rc.name} sadar. Rivalry +5.`);
                            }
                          })} title={`Sukses: ${fmt$(cost)} · Gagal: -${fmt$(failCost)} (20%) · Chance: ${Math.round(successChance)}%`}>🦅 {fmt$(cost)}</Btn>
                        </div>
                      );
                    });
                  })()}
                </div>
              </Card>
            ))}
          </Card>
        )}

        {/* ===== MGMT ===== */}
        {tab === "mgmt" && (
          <>
            <Card>
              <H>Coach Aktif · {g.coaches.length}/{coachCap} slot</H>
              {g.coaches.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: C.chalk, fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${C.line}55` }}>
                  <span>{c.name} <Tag>{c.spec}</Tag><span style={{ fontFamily: DISPLAY, color: C.gold }}> {c.skill}</span>
                    {c.personality && <Tag color={C.green}>{COACH_PERSONALITIES[c.personality]?.icon} {c.personality}</Tag>}</span>
                  <span style={{ color: C.dim, fontSize: 11 }}>{c.freeUntil && g.week <= c.freeUntil ? "gratis (intro)" : fmt$(c.salary) + "/bln"}
                    {g.coaches.length > 1 && <button onClick={() => dispatch({ type: "FIRE_COACH", coachId: c.id, severance: c.salary, coachName: c.name })} style={{ marginLeft: 8, background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 11 }}>pecat</button>}
                  </span>
                </div>
              ))}
            </Card>
            <Card>
              <H>Pasar Coach</H>
              {g.coachMarket.map((c) => (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.line}55` }}>
                  <div>
                    <div style={{ color: C.chalk, fontSize: 13 }}>{c.name} <Tag>{c.spec}</Tag><span style={{ fontFamily: DISPLAY, color: C.gold }}> {c.skill}</span>{c.personality && <Tag color={C.green}>{c.personality}</Tag>}</div>
                    <div style={{ color: C.dim, fontSize: 11 }}>{fmt$(c.salary)}/bulan</div>
                  </div>
                  <Btn small disabled={g.coaches.length >= coachCap} onClick={() => dispatch({ type: "HIRE_COACH", coachId: c.id, coach: c, coachName: c.name, coachSpec: c.spec, coachSalary: c.salary })} title={`Gaji ${fmt$(c.salary)}/bln — ${monthlyIn > 0 ? Math.round(c.salary / Math.max(monthlyIn, 1) * 100) : '?'}% dari income bulanan`}>Hire</Btn>
                </div>
              ))}
            </Card>
            <Card>
              <H>Camp Tier · {tier.name}</H>
              <div style={{ color: C.chalk, fontSize: 14, marginBottom: 2 }}>{tier.name} <span style={{ color: C.dim, fontSize: 11 }}>— Tier {g.campTier + 1}/5</span></div>
              <div style={{ color: C.dim, fontSize: 11, marginBottom: 10 }}>{tier.desc}</div>
              <Bar v={g.rep} max={g.campTier < 4 ? CAMP_TIERS[g.campTier + 1].rep : 100} color={C.gold} h={8} skew />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, margin: "8px 0", fontSize: 10, color: C.dim }}>
                <div>👥 Roster: <b style={{ color: C.chalk }}>{g.roster.length}/{rosterCap}</b></div>
                <div>🧑‍🏫 Coach: <b style={{ color: C.chalk }}>{g.coaches.length}/{coachCap}</b></div>
                <div>📈 Train bonus: <b style={{ color: C.green }}>+{Math.round(tier.trainBonus * 100)}%</b></div>
              </div>
              {g.campTier < 4 && (
                <Btn small disabled={g.rep < CAMP_TIERS[g.campTier + 1].rep || g.cash < CAMP_TIERS[g.campTier + 1].cost} onClick={() => dispatch({ type: "UPGRADE_TIER" })}>Upgrade ke {CAMP_TIERS[g.campTier + 1].name} — butuh Rep ≥{CAMP_TIERS[g.campTier + 1].rep} · {fmt$(CAMP_TIERS[g.campTier + 1].cost)}</Btn>
              )}
            </Card>
            <Card>
              <H>🏷️ Spesialisasi Camp · {g.campTag || "Belum dipilih"}</H>
              <div style={{ color: C.dim, fontSize: 11, marginBottom: 8 }}>
                {g.campTag
                  ? CAMP_SPECS[g.campTag]?.desc || "Belum dipilih"
                  : "Pilih spesialisasi yang cocok dengan roster-mu."}
              </div>
              {g.rep >= 5 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {Object.entries(CAMP_SPECS).map(([k, v]) => (
                    <button key={k} onClick={() => dispatch({ type: "SET_CAMP_TAG", tag: k })}
                      style={{ background: g.campTag === k ? C.gold : C.panel2, color: g.campTag === k ? "#0a0d14" : C.chalk, border: `1px solid ${C.line}`, padding: "6px 9px", fontSize: 10, cursor: "pointer", flex: "0 0 calc(50% - 3px)", ...cut(6) }}>
                      <div style={{ fontFamily: DISPLAY, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>{k}</div>
                      <div style={{ fontSize: 8, color: g.campTag === k ? "#0a0d1488" : C.dim }}>{v.desc}</div>
                    </button>
                  ))}
                </div>
              )}
              {g.rep < 5 && <div style={{ color: C.red, fontSize: 10 }}>Rep 5+ untuk ganti spesialisasi.</div>}
            </Card>
            <Card>
              <H>Fasilitas · cap per tier</H>
              {(["mats","ring","weights","medical"]).map((k) => {
                const lvl = g.facilities[k] || 1;
                const idx = { mats:0, ring:1, weights:2, medical:3 }[k];
                const max = tier.facMax[idx];
                const cost = facilityCost(lvl, g.campTier);
                return (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.line}55` }}>
                    <div>
                      <div style={{ color: C.chalk, fontSize: 13 }}>{FAC_LABEL[k]}</div>
                      <div style={{ display: "flex", gap: 3, marginTop: 3 }}>
                        {Array.from({ length: max }).map((_, j) => <div key={j} style={{ width: 13, height: 5, background: j < lvl ? C.gold : "#1b2331", transform: "skewX(-16deg)" }} />)}
                      </div>
                    </div>
                    <Btn small disabled={lvl >= max || g.cash < cost} onClick={() => dispatch({ type: "UPGRADE_FACILITY", facility: k, facilityLabel: FAC_LABEL[k] })}>{lvl >= max ? "MAX" : `⬆ ${fmt$(cost)}`}</Btn>
                  </div>
                );
              })}
            </Card>
            {(g.investors && g.investors.length > 0) ? (
              <Card>
                <H>💼 Investors · {g.investors.reduce((s, i) => s + i.equity, 0)}% Equity</H>
                {g.investors.map((inv, i) => {
                  const estCut = Math.round((monthlyIn) * (inv.equity / 100));
                  return (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${C.line}55` }}>
                      <div>
                        <div style={{ color: C.chalk, fontSize: 13, fontFamily: DISPLAY, letterSpacing: 1 }}>{inv.tier}</div>
                        <div style={{ color: C.dim, fontSize: 10 }}>{inv.equity}% equity · invest ${(inv.investment / 1000).toFixed(0)}K · ~{fmt$(estCut)}/bln potongan</div>
                      </div>
                      <Btn small color={C.gold} disabled={g.cash < inv.investment * 3} onClick={() => dispatch({ type: "BUYBACK_INVESTOR", tier: inv.tier, weekAcquired: inv.weekAcquired, cost: Math.round(inv.investment * 3) })}>Buy-back {fmt$(inv.investment * 3)}</Btn>
                    </div>
                  );
                })}
              </Card>
            ) : null}
            <Card>
              <H>📊 Rep Unlock Milestones</H>
              <div style={{ fontSize: 10, color: C.dim, lineHeight: 1.6 }}>
                {[{ rep: 0, what: "Local Gym tier" }, { rep: 10, what: "Coach slot +1" }, { rep: 20, what: "Regional tier unlock" }, { rep: 35, what: "National tier unlock" }, { rep: 40, what: "Coach slot +1" }, { rep: 50, what: "Minor World Title unlock" }, { rep: 55, what: "Elite Factory tier unlock" }, { rep: 60, what: "Major World Title unlock" }, { rep: 75, what: "World-Class tier unlock" }].map((m) => (
                  <div key={m.rep} style={{ display: "flex", gap: 6, alignItems: "center", opacity: g.rep >= m.rep ? 1 : 0.4 }}>
                    <span style={{ color: g.rep >= m.rep ? C.green : C.dim }}>{g.rep >= m.rep ? "✅" : "🔒"}</span>
                    <span style={{ fontFamily: DISPLAY, fontSize: 13, color: C.gold, width: 28 }}>Rep {m.rep}</span>
                    <span style={{ color: C.chalk }}>{m.what}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <H>Save Game</H>
              <div style={{ color: C.dim, fontSize: 12, marginBottom: 10 }}>
                Progress tersimpan otomatis setiap aksi. Penyimpanan bergantung pada dukungan storage di environment artifact.
              </div>
              {!resetArm ? (
                <Btn small color={C.red} onClick={() => setResetArm(true)}>Hapus Save & Mulai Baru</Btn>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small color={C.red} onClick={() => { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} setResetArm(false); setG(newGame()); }}>Yakin — Hapus Semua</Btn>
                  <Btn small color={C.dim} onClick={() => setResetArm(false)}>Batal</Btn>
                </div>
              )}
            </Card>
            <Card>
              <H>🌐 Language / Bahasa</H>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn small onClick={() => setLang("en")} style={{ background: lang === "en" ? C.gold : C.panel2, color: lang === "en" ? "#0a0d14" : C.chalk, border: "none", padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: DISPLAY, letterSpacing: 1, textTransform: "uppercase", ...cut(5) }}>{t("LANG.en")}</Btn>
                <Btn small onClick={() => setLang("id")} style={{ background: lang === "id" ? C.gold : C.panel2, color: lang === "id" ? "#0a0d14" : C.chalk, border: "none", padding: "6px 12px", fontSize: 11, cursor: "pointer", fontFamily: DISPLAY, letterSpacing: 1, textTransform: "uppercase", ...cut(5) }}>{t("LANG.id")}</Btn>
              </div>
            </Card>
            <Card>
              <H>💾 Save Slots</H>
              <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                {slotInfo.map((si) => (
                  <div key={si.slot} onClick={() => {
                    if (si.slot !== saveSlot) {
                      setSaveSlotState(si.slot);
                      setSaveSlot(si.slot);
                      setG(newGame());
                      setLoaded(false);
                      setTimeout(() => window.location.reload(), 100);
                    }
                  }}
                    style={{ flex: 1, padding: 8, border: `1px solid ${si.slot === saveSlot ? C.gold : C.line}`, background: si.slot === saveSlot ? "rgba(230,182,76,.08)" : C.panel2, cursor: "pointer", ...cut(6) }}>
                    <div style={{ fontFamily: DISPLAY, fontSize: 13, color: si.slot === saveSlot ? C.gold : C.chalk, letterSpacing: 1 }}>Slot {si.slot}</div>
                    {si.exists ? (
                      <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>Week {si.week} · {fmt$(si.cash)} · Rep {Math.round(si.rep)} · {si.roster} fighters</div>
                    ) : <div style={{ fontSize: 9, color: C.dim, marginTop: 2 }}>— Kosong —</div>}
                    {si.slot === saveSlot && <div style={{ fontSize: 8, color: C.gold, marginTop: 2, letterSpacing: 1, textTransform: "uppercase" }}>Active</div>}
                  </div>
                ))}
              </div>
              <div style={{ color: C.dim, fontSize: 10 }}>Klik slot lain untuk beralih (permainan akan reload). Save otomatis per aksi.</div>
            </Card>
          </>
        )}
        {tab === "finance" && (() => {
          const feeTotal = g.roster.reduce((s, f) => s + weeklyFee(f) * 4, 0);
          const popTotal = g.roster.reduce((s, f) => s + f.popularity * 150, 0);
          const baseSponsor = Math.round(g.rep * 500);
          const sponsorIncome = g.sponsors && g.sponsors.length > 0
            ? g.sponsors.reduce((s, sp) => s + (sp.rate || 0), 0)
            : baseSponsor;
          const coachSal = g.coaches.reduce((s, c) => s + ((!c.freeUntil || g.week > c.freeUntil) ? c.salary : 0), 0);
          const facVal = Object.values(g.facilities).reduce((s, l) => s + l * 30000, 0);
          const maint = Math.round(facVal * 0.05);
          const equityPct = (g.investors || []).reduce((s, inv) => s + inv.equity, 0);
          const equityCut = Math.round((sponsorIncome + popTotal) * (equityPct / 100));
          const netMonthly = sponsorIncome + popTotal + feeTotal - coachSal - maint - equityCut;
          const Row = ({ label, value, color, detail }) => (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.line}33` }}>
              <span style={{ fontSize: 12, color: C.chalk }}>{label}</span>
              <span style={{ textAlign: "right" }}>
                <span style={{ fontFamily: DISPLAY, fontSize: 14, color: color || C.chalk }}>{fmt$(value)}</span>
                {detail && <div style={{ fontSize: 9, color: C.dim }}>{detail}</div>}
              </span>
            </div>
          );
          return (
            <>
              <Card><H>💵 Arus Kas Bulanan</H>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: C.dim, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>📥 Pemasukan</div>
                  <Row label="🏢 Sponsor" value={sponsorIncome} color={C.green} detail={g.sponsors && g.sponsors.length > 0 ? `${g.sponsors.length} sponsor aktif` : `base (rep ${g.rep})`} />
                  <Row label="👥 Popularitas Fighter" value={popTotal} color={C.green} detail={`${g.roster.length} fighter`} />
                  <Row label="💪 Training Fee" value={feeTotal} color={C.green} detail={`${g.roster.length} fighter mingguan`} />
                  <div style={{ padding: "4px 0", textAlign: "right", fontFamily: DISPLAY, fontSize: 16, color: C.green }}>+{fmt$(sponsorIncome + popTotal + feeTotal)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.dim, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>📤 Pengeluaran</div>
                  <Row label="👨‍🏫 Gaji Coach" value={coachSal} color={C.red} detail={`${g.coaches.length} coach`} />
                  <Row label="🏗️ Maintenance Fasilitas" value={maint} color={C.red} detail={`nilai aset ${fmt$(facVal)}`} />
                  {equityPct > 0 && <Row label={`💰 Potongan Investor (${equityPct}%)`} value={equityCut} color={C.red} />}
                  <div style={{ padding: "4px 0", textAlign: "right", fontFamily: DISPLAY, fontSize: 16, color: C.red }}>-{fmt$(coachSal + maint + equityCut)}</div>
                </div>
                <div style={{ marginTop: 10, padding: "8px 0", borderTop: `2px solid ${C.gold}44`, textAlign: "right" }}>
                  <span style={{ fontSize: 11, color: C.dim, letterSpacing: 1, textTransform: "uppercase" }}>Bersih / Bulan </span>
                  <span style={{ fontFamily: DISPLAY, fontSize: 20, color: netMonthly >= 0 ? C.green : C.red }}>{netMonthly >= 0 ? "+" : ""}{fmt$(netMonthly)}</span>
                </div>
              </Card>
              <Card><H>💎 Kas & Cadangan</H>
                <div style={{ fontFamily: DISPLAY, fontSize: 28, color: g.cash >= 0 ? C.gold : C.red, letterSpacing: 2 }}>{fmt$(g.cash)}</div>
                <div style={{ fontSize: 11, color: C.dim, marginTop: 4 }}>Bangkrut jika kas &lt; -$50,000</div>
                {g.loan && <Row label="🏦 Pinjaman Aktif" value={g.loan.remaining} color={C.red} detail={`cicilan ${fmt$(g.loan.weeklyPayment)}/minggu`} />}
              </Card>
              <Card><H>📋 Ringkasan</H>
                <div style={{ fontSize: 11, color: C.chalk, lineHeight: 1.7 }}>
                  <div>• <b style={{ color: C.green }}>Sponsor</b>: {g.sponsors && g.sponsors.length > 0 ? `${g.sponsors.length} brand aktif (${g.sponsors.map(s => s.brand).join(", ")})` : "rep-based, belum ada brand"}</div>
                  <div>• <b style={{ color: C.green }}>Fighter</b>: {g.roster.length} orang, ${feeTotal}/bln dari training fee + ${popTotal}/bln dari popularitas</div>
                  <div>• <b style={{ color: C.red }}>Coach</b>: {g.coaches.length} orang, ${coachSal}/bln</div>
                  <div>• <b style={{ color: C.red }}>Fasilitas</b>: level mats {g.facilities.mats}/ring {g.facilities.ring}/weights {g.facilities.weights}/medical {g.facilities.medical}, maintenance ${maint}/bln</div>
                </div>
              </Card>
            </>
          );
        })()}
      </div>

      {/* BOTTOM NAV */}
      {weeklySummary && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(6,9,14,.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }} onClick={() => setWeeklySummary(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, width: "100%", background: `linear-gradient(160deg, ${C.panel2}, ${C.panel})`, border: `1px solid ${C.gold}`, padding: 18, ...cut(14), animation: "rise .35s ease both" }}>
            <div style={{ fontFamily: DISPLAY, fontSize: 20, letterSpacing: 3, color: C.gold, textTransform: "uppercase", marginBottom: 4 }}>{t("UI.week")} {weeklySummary.week}</div>
            <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 10, color: C.dim }}>
              <span>{fmt$(weeklySummary.cash)} · Rep {Math.round(weeklySummary.rep)} · {weeklySummary.rosterCount} fighters · {weeklySummary.inboxCount} inbox</span>
            </div>
            {weeklySummary.highlights.length > 0 && (
              <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 10 }}>
                {weeklySummary.highlights.map((l, i) => (
                  <div key={i} style={{ fontSize: 12, color: i === 0 ? C.chalk : C.dim, marginBottom: 5, paddingBottom: 4, borderBottom: `1px solid ${C.line}44`, lineHeight: 1.4 }}>{l}</div>
                ))}
              </div>
            )}
            {weeklySummary.injuredCount > 0 && (
              <div style={{ color: C.red, fontSize: 11, marginBottom: 8 }}>🚑 {weeklySummary.injuredCount} cedera: {weeklySummary.injuredNames.join(", ")}</div>
            )}
            <div style={{ textAlign: "center" }}>
              <Btn small onClick={() => setWeeklySummary(null)}>OK</Btn>
            </div>
          </div>
        </div>
      )}
      {!g.over && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 30, background: "linear-gradient(0deg, #05070c, #0b101ae6)", borderTop: `1px solid ${C.line}`, padding: "8px 10px calc(8px + env(safe-area-inset-bottom))" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ display: "flex", flex: 1, justifyContent: "space-around" }}>
              {tabs.map(([k, icon, label]) => (
                <button key={k} onClick={() => setTab(k)} style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center", padding: "2px 4px", opacity: tab === k ? 1 : 0.55 }}>
                  <div style={{ fontSize: 18, filter: tab === k ? "drop-shadow(0 0 6px rgba(230,182,76,.7))" : "none" }}>{icon}</div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 9, letterSpacing: 1, color: tab === k ? C.gold : C.dim, textTransform: "uppercase" }}>{label}</div>
                  {tab === k && <div style={{ height: 2, background: C.gold, marginTop: 2, transform: "skewX(-20deg)" }} />}
                </button>
              ))}
            </div>
            <button onClick={advance} style={{ background: `linear-gradient(180deg, ${C.red}, #a3322c)`, border: "none", color: "#fff", fontFamily: DISPLAY, fontSize: 13, letterSpacing: 1.5, padding: "12px 16px", cursor: "pointer", animation: "pulsering 2s infinite", textTransform: "uppercase", ...cut(8) }}>
              {t("BTN.advance")}
            </button>
          </div>
        </div>
      )}

      {nego && (
        <NegotiateModal
          fighter={nego.fighter} mode={nego.mode} cash={g.cash}
          onClose={() => setNego(null)}
          onCommit={(deal) => {
            const neg = nego;
            if (!neg?.fighter) return;
            dispatch({ type: "SIGN_CONTRACT", mode: neg.mode, prospectId: neg.prospectId, fighterId: neg.fighter?.id, deal });
          }}
        />
      )}

      {fightFighter && fightFighter.booked && (
        <FightNight key={fightFighter.id} fighter={fightFighter} done={(fx, fightCtx) => {
          setG((old) => {
            const n = JSON.parse(JSON.stringify(old));
            fx(n);
            if (fightCtx) checkAchievements(n, fightCtx);
            try { localStorage.setItem(SAVE_KEY, JSON.stringify(n)); } catch (e) {}
            return n;
          });
          setActiveFight(null);
        }} />
      )}
    </div>
  );
}
