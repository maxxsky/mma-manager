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
import { R, fmt$ } from "./engine/rng.js";
import { genFighter, assignAgent, scoutGrade, makeReport } from "./engine/fighter.js";
import { newGame } from "./engine/state.js";
import { checkAchievements } from "./engine/achievements.js";
import { CAMP_TIERS } from "./engine/data.js";
import { ACHIEVEMENTS } from "./engine/data.js";
import { generateTransferReason } from "./engine/narrative/generators/transfer.js";

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
import RivalsScreen from "./ui/RivalsScreen.jsx";
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

// ── MAIN APP ──

export default function App() {
  const { t, lang, setLang } = useLang();

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

  // Scout action
  const scoutFighter = (cost, level, label, filterArch, filterWC) => {
    const grade = scoutGrade(g.rep);
    const existingNames = new Set([
      ...(g.roster || []).map((x) => x.name),
      ...(g.prospects || []).map((x) => x.fighter?.name),
    ]);
    let f = assignAgent(genFighter(R(level[0], level[1])));
    for (let attempt = 0; attempt < 10; attempt++) {
      const matchesFilter = (!filterArch || f.archetype === filterArch) && (!filterWC || f.weightClass === filterWC);
      const nameOk = !existingNames.has(f.name);
      if (matchesFilter && nameOk) break;
      f = assignAgent(genFighter(R(level[0], level[1])));
    }
    dispatch({ type: "SCOUT", cost, fighter: f, report: makeReport(f, grade), grade, method: label, transferReason: label === "Diamond in the Rough" ? generateTransferReason(f) : undefined });
  };

  const tabLabel = { dashboard: t("UI.camp"), roster: t("UI.roster"), rank: t("UI.rank"), scout: t("UI.scout"), inbox: `${t("UI.inbox")}${g.inbox?.length ? ` ${g.inbox.length}` : ""}`, finance: t("UI.finance"), promoters: t("UI.promoters"), mgmt: t("UI.staff"), rivals: t("UI.rival"), achievements: t("UI.achievements"), dynasty: t("UI.dynasty"), world: t("UI.world") }[tab] || t("UI.camp");

  const tier = CAMP_TIERS[g.campTier || 0];
  const fightFighter = activeFight ? g.roster?.find((f) => f.id === activeFight) : null;

  // ── LOADING ──
  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <GlobalStyle />
        <div style={{ fontFamily: T.disp, color: T.gold, letterSpacing: 4, fontSize: 18, animation: "goldglow 1.5s infinite" }}>LOADING CAMP…</div>
      </div>
    );
  }

  // ── MAIN RENDER ──
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0e14", color: "#c8ccd4", fontFamily: "Inter, sans-serif" }}>
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

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: "100vh" }}>
        <TopBar
          title={tabLabel}
          cash={g.cash} rep={g.rep} chem={g.chemistry} legacy={g.legacy || 0}
          week={g.week}
          saveSlot={saveSlot}
          onSaveSlotChange={setSaveSlot}
          slotInfo={slotInfo}
          lang={lang}
          onLangChange={() => setLang(lang === "id" ? "en" : "id")}
          onNewGame={() => startNew(newGame())}
          dispatch={dispatch}
          version="v1.0.0-ea"
          onToggleMenu={() => setMobileMenuOpen(p => !p)}
        />

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          <style>{`@keyframes tabIn{0%{opacity:0;transform:translateY(6px)}100%{opacity:1;transform:translateY(0)}}`}</style>
          <div key={tab} style={{ animation: "tabIn .18s ease both" }}>
          {/* Win condition */}
          <WinConditionBanner legacy={g.legacy} />
          {g.over && <GameOverBanner message={g.over} onRestart={() => startNew(newGame())} />}

          {/* Tab content */}
          {tab === "dashboard" && !g.over && <Dashboard g={g} setTab={setTab} setActiveFight={setActiveFight} dispatch={dispatch} t={t} fmt$={fmt$} />}
          {tab === "roster" && <Roster g={g} setTab={setTab} dispatch={dispatch} />}
          {tab === "rank" && <Rankings g={g} t={t} rankDiv={rankDiv} setRankDiv={setRankDiv} />}
          {tab === "scout" && <Scout g={g} dispatch={dispatch} t={t} fmt$={fmt$} scoutFilterArch={scoutFilterArch} setScoutFilterArch={setScoutFilterArch} scoutFilterWC={scoutFilterWC} setScoutFilterWC={setScoutFilterWC} scoutFighter={scoutFighter} tier={tier} />}
          {tab === "inbox" && <Inbox g={g} dispatch={dispatch} setTab={setTab} />}
          {tab === "rivals" && <RivalsScreen g={g} dispatch={dispatch} />}
          {tab === "promoters" && <Promoters g={g} />}
          {tab === "mgmt" && <Facility g={g} dispatch={dispatch} coachCap={tier.coachCap} rosterCap={tier.rosterCap} />}
          {tab === "finance" && <Finance g={g} />}
          {tab === "achievements" && <Achievements g={g} />}
          {tab === "world" && <WorldNews g={g} />}
          {tab === "dynasty" && <Dynasty g={g} />}

          {/* Weekly summary overlay */}
          <WeeklySummary summary={weeklySummary} onClose={() => setWeeklySummary(null)} t={t} />
          </div> {/* end tab transition wrapper */}
        </div>
      </div>

      {/* Modals */}
      {nego && (
        <NegotiateModal
          fighter={nego.fighter} mode={nego.mode} cash={g.cash}
          onClose={() => setNego(null)}
          onCommit={(deal) => dispatch({ type: "SIGN_CONTRACT", mode: nego.mode, prospectId: nego.prospectId, fighterId: nego.fighter?.id, deal })}
        />
      )}

      {fightFighter?.booked && showFightCard && (
        <FightCard key={fightFighter.id} fighter={fightFighter} g={g}
          onProceed={() => setShowFightCard(false)} />
      )}

      {fightFighter?.booked && !showFightCard && (
        <FightNight key={fightFighter.id} fighter={fightFighter} done={(fx, fightCtx) => {
          setG((old) => {
            const n = structuredClone(old);
            fx(n);
            let newly = [];
            if (fightCtx) {
              newly = checkAchievements(n, fightCtx);
              if (newly.length > 0) {
                const newToasts = newly.map((id) => {
                  const a = ACHIEVEMENTS.find((x) => x.id === id);
                  return a ? { id: a.id + "_" + Date.now(), icon: a.icon, title: a.title, desc: a.desc } : null;
                }).filter(Boolean);
                setToasts((prev) => [...prev, ...newToasts]);
              }
            }
            saveGame(saveSlot, n);
            return n;
          });
          setActiveFight(null);
          setShowFightCard(false);
        }} />
      )}
    </div>
  );
}
