import { localizeTree } from "./i18n/presentation.jsx";
// ============================================================
//   MMA MANAGER — Application Shell
//   Composition only — state in hooks, UI in components,
//   engine in pure JS modules.
// ============================================================

import React, { useState } from "react";
import { useLang } from "./ui/LangContext.jsx";
import { useGameState } from "./hooks/useGameState.js";
import { useSaveLoad } from "./hooks/useSaveLoad.js";
import { useKeyboard } from "./hooks/useKeyboard.js";

// Engine
import { fmt$, getWorldRNGState } from "@ironfist/engine/rng.js";
import { newGame } from "@ironfist/engine/state.js";
import { CAMP_TIERS } from "@ironfist/engine/data.js";
import { ACHIEVEMENTS } from "@ironfist/engine/data.js";

// UI
import { GlobalStyle, T } from "./ui/theme.jsx";
import ToastContainer from "./ui/Toast.jsx";
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
import Promoters from "./ui/Promoters.jsx";
import Roster from "./ui/Roster.jsx";
import WinConditionBanner from "./components/WinConditionBanner.jsx";
import GameOverBanner from "./components/GameOverBanner.jsx";
import WeeklySummary from "./components/WeeklySummary.jsx";
import FightCard from "./components/FightCard.jsx";
import Achievements from "./ui/Achievements.jsx";
import WorldNews from "./ui/WorldNews.jsx";
import Dynasty from "./ui/Dynasty.jsx";
import { rememberTab, getLastTab } from "./ui/ui-utils.js";
import { saveGame } from "./services/saveService.js";
import { applyFightCompletion } from "./services/fightCompletion.js";
import { getPrestige } from "@ironfist/engine/prestige.js";

// ── MAIN APP ──

export default function App() {
  const { t, lang } = useLang();

  // Tab state
  const [tab, setTabRaw] = useState(getLastTab());
  const setTab = (t) => { rememberTab(t); setTabRaw(t); };
  const [rankDiv, setRankDiv] = useState(null);
  const [scoutFilterArch, setScoutFilterArch] = useState(null);
  const [scoutFilterWC, setScoutFilterWC] = useState(null);
  const [showFightCard, setShowFightCard] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Save/load hook
  const [g, setG] = useState(() => newGame());
  const { loaded, saveSlot, setSaveSlot, slotInfo, newGame: startNew } = useSaveLoad(setG);

  // Game state hook
  const {
    up, dispatch, advance,
    activeFight, setActiveFight,
    weekFlash, weeklySummary, setWeeklySummary,
    nego, setNego,
  } = useGameState(g, setG, saveSlot);

  // Keyboard shortcuts
  useKeyboard({
    advance,
    dispatch,
    disabled: g.over || !!activeFight || !!nego || !!weeklySummary,

  });

  // Toast dismiss
  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  // Scout action — the engine generates the prospect (scouting.js)
  const scoutFighter = (methodId, filterArch, filterWC) => {
    dispatch({ type: "SCOUT", methodId, filterArch, filterWC });
  };

  const tabLabel = { dashboard: t("UI.camp"), roster: t("UI.roster"), rank: t("UI.rank"), scout: t("UI.scout"), inbox: `${t("UI.inbox")}${g.inbox?.length ? ` ${g.inbox.length}` : ""}`, finance: t("UI.finance"), promoters: t("UI.promoters"), mgmt: t("UI.facility"), achievements: t("UI.achievements"), dynasty: t("UI.dynasty"), world: t("UI.world") }[tab] || t("UI.camp");

  const tier = CAMP_TIERS[g.campTier || 0];
  const fightFighter = activeFight ? g.roster?.find((f) => f.id === activeFight) : null;

  // ── LOADING ──
  if (!loaded) {
    return (
      localizeTree(<div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <GlobalStyle />
        <div style={{ fontFamily: T.disp, color: T.gold, letterSpacing: 4, fontSize: 18, animation: "goldglow 1.5s infinite" }}>LOADING CAMP…</div>
      </div>)
    );
  }

  // ── MAIN RENDER ──
  return (
    localizeTree(<div style={{ display: "flex", minHeight: "100vh", background: "#0a0e14", color: "#c8ccd4", fontFamily: "Inter, sans-serif" }}>
      <GlobalStyle />

      {/* Week flash */}
      {weekFlash > 0 && (
        <>
          <style>{`@keyframes weekpop{0%{opacity:0;transform:scale(0.5)}17%{opacity:1;transform:scale(1)}55%{opacity:1}100%{opacity:0}}`}</style>
          <div key={weekFlash} style={{ position: "fixed", top: "40%", left: "50%", zIndex: 40, pointerEvents: "none", fontFamily: T.disp, fontSize: 40, letterSpacing: 6, color: "#ffd15c", textShadow: "0 0 30px rgba(255,209,92,.6)", animation: "weekpop 1.1s ease both", textTransform: "uppercase" }}>
            Week {g.week}
          </div>
        </>
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Sidebar */}
      <Sidebar view={tab} setView={(t) => { setTab(t); setMobileMenuOpen(false); }} onAdvance={advance} inboxCount={g.inbox?.length || 0}
        mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      <style>{`
        .mobile-week-action { display: none; }
        @media (max-width: 767px) {
          .mobile-week-action { display: block; position: fixed; bottom: 0; left: 0; right: 0;
            z-index: 30; padding: 10px 12px calc(10px + env(safe-area-inset-bottom)); background: ${T.surface}; border-top: 1px solid ${T.line}; }
          .app-content { padding: 14px 12px 100px !important; }
        }
      `}</style>
      <div className="mobile-week-action">
        <button type="button" data-action="advance-week-mobile" onClick={advance}
          disabled={g.over || !!activeFight || !!nego || !!weeklySummary || mobileMenuOpen}
          style={{ width: "100%", minHeight: 44, border: 0, borderRadius: T.r, background: T.ember,
            color: T.bg, fontFamily: T.body, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {t("UI.advanceWeek")}
        </button>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: "100vh" }}>
        <TopBar
          title={tabLabel}
          cash={g.cash} rep={g.rep} chem={g.chemistry} prestige={getPrestige(g)}
          week={g.week}
          saveSlot={saveSlot}
          onSaveSlotChange={setSaveSlot}
          slotInfo={slotInfo}
          lang={lang}
          onNewGame={() => startNew(newGame())}
          dispatch={dispatch}
          version="v1.0.0-ea"
          onToggleMenu={() => setMobileMenuOpen(p => !p)}
        />

        <div className="app-content" style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          <style>{`@keyframes tabIn{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}`}</style>
          <div key={tab} style={{ animation: "tabIn .18s ease both" }}>
          {/* Win condition */}
          <WinConditionBanner prestige={getPrestige(g)} />
          {g.over && <GameOverBanner message={g.over} onRestart={() => startNew(newGame())} />}

          {/* Tab content */}
          {tab === "dashboard" && !g.over && <Dashboard g={g} setTab={setTab} setActiveFight={setActiveFight} dispatch={dispatch} t={t} fmt$={fmt$} />}
          {tab === "roster" && <Roster g={g} setTab={setTab} dispatch={dispatch} />}
          {tab === "rank" && <Rankings g={g} t={t} rankDiv={rankDiv} setRankDiv={setRankDiv} />}
          {tab === "scout" && <Scout g={g} dispatch={dispatch} t={t} fmt$={fmt$} scoutFilterArch={scoutFilterArch} setScoutFilterArch={setScoutFilterArch} scoutFilterWC={scoutFilterWC} setScoutFilterWC={setScoutFilterWC} scoutFighter={scoutFighter} tier={tier} />}
          {tab === "inbox" && <Inbox g={g} dispatch={dispatch} setTab={setTab} />}
          {tab === "promoters" && <Promoters g={g} />}
          {tab === "mgmt" && <Facility g={g} dispatch={dispatch} coachCap={tier.coachCap} rosterCap={tier.rosterCap} />}
          {tab === "finance" && <Finance g={g} />}
          {tab === "achievements" && <Achievements g={g} />}
          {tab === "world" && <WorldNews g={g} />}
          {tab === "dynasty" && <Dynasty g={g} dispatch={dispatch} />}

          </div> {/* end tab transition wrapper */}
        </div>
      </div>

      {/* Modals */}
      <WeeklySummary summary={weeklySummary} onClose={() => setWeeklySummary(null)} t={t} />
      {nego && (
        <NegotiateModal
          fighter={nego.fighter} mode={nego.mode} cash={g.cash}
          rosterCap={tier.rosterCap} rosterSize={g.roster.length} negotiation={g.negotiation}
          onNegotiate={(offer) => dispatch({ type: "NEGOTIATE_CONTRACT", mode: nego.mode, prospectId: nego.prospectId, fighterId: nego.fighterId || nego.fighter?.id, offer })}
          onAcceptCounter={() => dispatch({ type: "ACCEPT_COUNTER_OFFER" })}
          onClose={() => { setNego(null); if (g.negotiation) dispatch({ type: "CLEAR_NEGOTIATION" }); }}
        />
      )}

      {fightFighter?.booked && showFightCard && (
        <FightCard key={fightFighter.id} fighter={fightFighter} g={g}
          onProceed={() => setShowFightCard(false)} />
      )}

      {fightFighter?.booked && !showFightCard && (
        <FightNight key={fightFighter.id} fighter={fightFighter} staff={g.staff} done={(fx, fightCtx) => {
          setG((old) => {
            const { state: n, newly } = applyFightCompletion(old, fx, fightCtx);
            if (newly.length > 0) {
              const newToasts = newly.map((id) => {
                const a = ACHIEVEMENTS.find((x) => x.id === id);
                return a ? { id: a.id + "_" + Date.now(), icon: a.icon, title: a.title, desc: a.desc } : null;
              }).filter(Boolean);
              setToasts((prev) => [...prev, ...newToasts]);
            }
            n.worldRngState = getWorldRNGState();
            saveGame(saveSlot, n);
            return n;
          });
          setActiveFight(null);
          setShowFightCard(false);
        }} />
      )}
    </div>)
  );
}
