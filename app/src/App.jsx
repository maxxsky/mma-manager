import React, { useState, useEffect, useRef } from "react";
import { useLang } from "./ui/LangContext.jsx";
import { getActiveSlot, setActiveSlot, loadGame, saveGame, deleteGame, getSlotInfo } from "./services/saveService.js";

// ===== ENGINE: pure JS, zero React — bisa di-import oleh server Node nanti =====
import { R, RI, clamp, pick, fmt$, uid, random } from "./engine/rng.js";
import {
  ATTRS, ATTR_LABEL, WEIGHTS, ARCH_COLOR, TRAITS, AMBITIONS, AMBITION_KEYS,
  AGENT_TYPES, GAME_PLANS, INTENSITY, COACH_PERSONALITIES,
  CAMP_TIERS, SPONSOR_BRANDS, FAC_LABEL, RIVAL_TRAITS, PROMO_TIERS,
  ACHIEVEMENTS,
} from "./engine/data.js";
import { genFighter, assignAgent, agentFor, avgSkill, tierOf, scoutGrade, makeReport, genCoach, genBio } from "./engine/fighter.js";
import { genDivisions, rankOf, vacateTitle, stripTitle, initPromoterRel } from "./engine/rankings.js";
import { genRivalCamp } from "./engine/rivals.js";
import { facilityCost } from "./engine/economy.js";
import {newGame, tick} from "./engine/state.js";
import { reducer } from "./engine/reducer.js";
import { checkAchievements } from "./engine/achievements.js";

// ===== UI: React components =====
import { C, DISPLAY, T, GlobalStyle, cut, Card, H, Btn, Tag, Bar, OVR, Meter } from "./ui/theme.jsx";
import FightNight from "./ui/FightNight.jsx";
import NegotiateModal from "./ui/NegotiateModal.jsx";
import Sidebar from "./ui/Sidebar.jsx";
import TopBar from "./ui/TopBar.jsx";
import Dashboard from "./ui/Dashboard.jsx";
import Rankings from "./ui/Rankings.jsx";
import Scout from "./ui/Scout.jsx";
import Inbox from "./ui/Inbox.jsx";
import Finance from "./ui/Finance.jsx";
import Facility from "./ui/Facility.jsx";
import RivalsScreen from "./ui/RivalsScreen.jsx";
import Roster from "./ui/Roster.jsx";

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
  const [saveSlot, setSaveSlotState] = useState(getActiveSlot());
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [scoutFilterArch, setScoutFilterArch] = useState(null);
  const [scoutFilterWC, setScoutFilterWC] = useState(null);
  const [slotInfo, setSlotInfo] = useState([]);
  const { t, lang, setLang } = useLang();

  const refreshSlotInfo = () => setSlotInfo(getSlotInfo());

  useEffect(() => {
    (async () => {
      try {
        const raw = loadGame(saveSlot);
        if (raw) {
          const s = JSON.parse(raw);
          if (s.week == null || !s.roster || s.cash == null || isNaN(s.cash)) {
            s.week = 1; s.cash = 100000; s.roster = []; s.log = ["Save rusak — dimulai ulang."];
          }
          if (!s.divisions) s.divisions = genDivisions();
          if (!s.rivals) s.rivals = [genRivalCamp(0), genRivalCamp(1), genRivalCamp(2)];
          if (!s.promoterRel) s.promoterRel = initPromoterRel();
          if (s.campTier == null) s.campTier = 0;
          if (!s.relationships) s.relationships = {};
          if (s.rep == null || isNaN(s.rep) || s.rep <= 0) s.rep = 8;
          if (!s.sponsors) {
            s.sponsors = s.sponsor ? [{ brand: s.sponsor.brand, terms: "placement", rate: s.sponsor.rate, weeksLeft: null }] : [];
          }
          delete s.sponsor;
          s.roster.forEach((f) => {
            if (!f.ambition) f.ambition = pick(AMBITION_KEYS);
            if (!f.agent) f.agent = agentFor(f);
            if (!f.contract) f.contract = { managerCut: 0.18, fightsLeft: 4, fightsTotal: 4, durationMo: 24, signedWeek: f.joinedWeek || 0, renegoFlagged: false };
            if (!f.training) f.training = { type: "conditioning", intensity: "Medium" };
            if (!f.ceilings) {
              f.ceilings = {};
              ATTRS.forEach((k) => (f.ceilings[k] = clamp(f.attrs[k] + RI(8, 30), f.attrs[k], 99)));
            }
            f.injuryCount = f.injuryCount || 0;
            f.seriousInjuries = f.seriousInjuries || 0;
            if (!f.fightHistory) f.fightHistory = [];
            if (!f.trainingHistory) f.trainingHistory = [];
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
    // Strip undo/redo before clone — they bloat state and cause JSON errors
    const clean = Object.assign({}, old);
    delete clean._undoStack;
    delete clean._redoStack;
    const n = structuredClone(clean);
    fn(n);
    // Throttle localStorage saves
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveGame(saveSlot, n);
    }, 1000);
    return n;
  });

  const dispatch = (action) => {
    if (action.type === "SIGN_CONTRACT_PRE") {
      setNego({ fighter: action.fighter, mode: action.mode || "sign", prospectId: action.prospectId, fighterId: action.fighterId });
      return;
    }
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
  // Wrapper for Scout component: (cost, level, label, filterArch, filterWC)
  const scoutFighter = (cost, level, label, filterArch, filterWC) => {
    scout(cost, level, label, filterArch, filterWC);
  };

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
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, color: T.txt, fontFamily: T.body }}>
      <GlobalStyle />

      {/* week flash */}
      {weekFlash > 0 && (
        <div key={weekFlash} style={{ position: "fixed", top: "40%", left: "50%", zIndex: 40, pointerEvents: "none", fontFamily: DISPLAY, fontSize: 40, letterSpacing: 6, color: T.gold, textShadow: "0 0 30px rgba(255,209,92,.6)", animation: "weekpop 1.1s ease both", textTransform: "uppercase" }}>
          Week {g.week}
        </div>
      )}

      {/* SIDEBAR */}
      <Sidebar
        view={tab}
        setView={setTab}
        onAdvance={advance}
        inboxCount={g.inbox ? g.inbox.length : 0}
      />

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: "100vh" }}>
        <TopBar
          title={(tabs.find(([k]) => k === tab) || [])[2] || "Dashboard"}
          cash={g.cash}
          rep={g.rep}
          chem={g.chemistry}
          legacy={g.legacy || 0}
          week={g.week}
          saveSlot={saveSlot}
          onSaveSlotChange={(s) => { setSaveSlotState(s); setActiveSlot(s); setTimeout(refreshSlotInfo, 100); }}
          slotInfo={slotInfo}
          lang={lang}
          onLangChange={() => setLang(lang === "id" ? "en" : "id")}
          onNewGame={() => { setG(newGame()); deleteGame(saveSlot); }}
        />

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

        {/* Win Condition Display */}
        {(g.legacy || 0) > 0 && (() => {
          const wcLegacy = g.legacy;
          const wc = wcLegacy >= 100000 ? { tier: "GOAT", icon: "🐐", color: "#ff4488", label: "Greatest of All Time", unlocked: true, total: 5 }
            : wcLegacy >= 50000 ? { tier: "Platinum", icon: "💎", color: "#b5e4ff", label: "MMA Empire", unlocked: true, total: 5 }
            : wcLegacy >= 25000 ? { tier: "Gold", icon: "👑", color: T.gold, label: "World Class Camp", unlocked: true, total: 5 }
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
          <Dashboard g={g} setTab={setTab} setActiveFight={setActiveFight} t={t} fmt$={fmt$} />
        )}

        {/* ===== ROSTER ===== */}
        {tab === "roster" && <Roster g={g} setTab={setTab} up={up} />}

        {/* ===== RANKINGS ===== */}
        {tab === "rank" && <Rankings g={g} t={t} rankDiv={rankDiv} setRankDiv={setRankDiv} />}

        {/* ===== SCOUT ===== */}
        {tab === "scout" && (
          <Scout g={g} dispatch={dispatch} t={t} fmt$={fmt$}
            scoutFilterArch={scoutFilterArch} setScoutFilterArch={setScoutFilterArch}
            scoutFilterWC={scoutFilterWC} setScoutFilterWC={setScoutFilterWC}
            scoutFighter={scoutFighter} tier={tier} />
        )}

        {/* ===== INBOX ===== */}
        {tab === "inbox" && (
          <Inbox g={g} dispatch={dispatch} setTab={setTab} />
        )}

        {/* ===== RIVALS ===== */}
        {tab === "rivals" && (
          <RivalsScreen g={g} up={up} />
        )}

        {/* ===== MGMT / FACILITY ===== */}
        {tab === "mgmt" && (
          <Facility g={g} dispatch={dispatch} coachCap={coachCap} rosterCap={rosterCap} />
        )}

        {/* ===== FINANCE ===== */}
        {tab === "finance" && (
          <Finance g={g} />
        )}
      {/* Weekly Summary overlay */}
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
        </div>{/* close content padding div */}

      </div>{/* close main area */}

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
            const n = structuredClone(old);
            fx(n);
            if (fightCtx) checkAchievements(n, fightCtx);
            saveGame(saveSlot, n);
            return n;
          });
          setActiveFight(null);
        }} />
      )}
    </div>
  );
}
