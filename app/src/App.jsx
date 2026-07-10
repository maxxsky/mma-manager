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

// UI
import { GlobalStyle, C, DISPLAY } from "./ui/theme.jsx";
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
import WinConditionBanner from "./components/WinConditionBanner.jsx";
import GameOverBanner from "./components/GameOverBanner.jsx";
import WeeklySummary from "./components/WeeklySummary.jsx";
import FightCard from "./components/FightCard.jsx";
import Achievements from "./ui/Achievements.jsx";
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

  // Scout action
  const scoutFighter = (cost, level, label, filterArch, filterWC) => {
    const grade = scoutGrade(g.rep);
    let f = assignAgent(genFighter(R(level[0], level[1])));
    if (filterArch || filterWC) {
      for (let attempt = 0; attempt < 5; attempt++) {
        if ((!filterArch || f.archetype === filterArch) && (!filterWC || f.weightClass === filterWC)) break;
        f = assignAgent(genFighter(R(level[0], level[1])));
      }
    }
    dispatch({ type: "SCOUT", cost, fighter: f, report: makeReport(f, grade), grade, method: label });
  };

  const tabLabel = { dashboard: t("UI.camp"), roster: t("UI.roster"), rank: t("UI.rank"), scout: t("UI.scout"), inbox: `Inbox${g.inbox?.length ? ` ${g.inbox.length}` : ""}`, finance: "KEUANGAN", mgmt: t("UI.staff"), rivals: t("UI.rival"), achievements: "ACHIEVEMENTS", dynasty: "DYNASTY" }[tab] || "Dashboard";

  const tier = CAMP_TIERS[g.campTier || 0];
  const fightFighter = activeFight ? g.roster?.find((f) => f.id === activeFight) : null;

  // ── LOADING ──
  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <GlobalStyle />
        <div style={{ fontFamily: DISPLAY, color: C.gold, letterSpacing: 4, fontSize: 18, animation: "goldglow 1.5s infinite" }}>LOADING CAMP…</div>
      </div>
    );
  }

  // ── MAIN RENDER ──
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0a0e14", color: "#c8ccd4", fontFamily: "Inter, sans-serif" }}>
      <GlobalStyle />

      {/* Week flash */}
      {weekFlash > 0 && (
        <div key={weekFlash} style={{ position: "fixed", top: "40%", left: "50%", zIndex: 40, pointerEvents: "none", fontFamily: DISPLAY, fontSize: 40, letterSpacing: 6, color: "#ffd15c", textShadow: "0 0 30px rgba(255,209,92,.6)", animation: "weekpop 1.1s ease both", textTransform: "uppercase" }}>
          Week {g.week}
        </div>
      )}

      {/* Sidebar */}
      <Sidebar view={tab} setView={setTab} onAdvance={advance} inboxCount={g.inbox?.length || 0} />

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
        />

        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
          {/* Win condition */}
          <WinConditionBanner legacy={g.legacy} />
          {g.over && <GameOverBanner message={g.over} onRestart={() => startNew(newGame())} />}

          {/* Tab content */}
          {tab === "dashboard" && !g.over && <Dashboard g={g} setTab={setTab} setActiveFight={setActiveFight} dispatch={dispatch} t={t} fmt$={fmt$} />}
          {tab === "roster" && <Roster g={g} setTab={setTab} up={up} dispatch={dispatch} />}
          {tab === "rank" && <Rankings g={g} t={t} rankDiv={rankDiv} setRankDiv={setRankDiv} />}
          {tab === "scout" && <Scout g={g} dispatch={dispatch} t={t} fmt$={fmt$} scoutFilterArch={scoutFilterArch} setScoutFilterArch={setScoutFilterArch} scoutFilterWC={scoutFilterWC} setScoutFilterWC={setScoutFilterWC} scoutFighter={scoutFighter} tier={tier} />}
          {tab === "inbox" && <Inbox g={g} dispatch={dispatch} setTab={setTab} />}
          {tab === "rivals" && <RivalsScreen g={g} up={up} />}
          {tab === "mgmt" && <Facility g={g} dispatch={dispatch} coachCap={tier.coachCap} rosterCap={tier.rosterCap} />}
          {tab === "finance" && <Finance g={g} />}
          {tab === "achievements" && <Achievements g={g} />}
          {tab === "dynasty" && <Dynasty g={g} />}

          {/* Weekly summary overlay */}
          <WeeklySummary summary={weeklySummary} onClose={() => setWeeklySummary(null)} t={t} />
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
          setG((old) => { const n = structuredClone(old); fx(n); if (fightCtx) checkAchievements(n, fightCtx); saveGame(saveSlot, n); return n; });
          setActiveFight(null);
          setShowFightCard(false);
        }} />
      )}
    </div>
  );
}
