// ============================================================
//   FIGHT NIGHT — Orchestrator
//   Stage-based fight experience. Delegates to components/fight/.
// ============================================================

import React, { useState, useEffect, useRef } from "react";
import { clamp, random } from "../engine/rng.js";
import { ARCH_COLOR } from "../engine/data.js";
import { simRound } from "../engine/fight.js";
import { commitFightResult } from "../engine/fights/commitResult.js";
import { useFightSeed } from "../hooks/useFightSeed.js";
import { useFightPrep } from "../hooks/useFightPrep.js";
import { T, GlobalStyle } from "./theme.jsx";
import { t } from "../i18n/index.js";

import Staredown from "../components/fight/Staredown.jsx";
import WeighIn from "../components/fight/WeighIn.jsx";
import Entrance from "../components/fight/Entrance.jsx";
import RoundView from "../components/fight/RoundView.jsx";
import Corner from "../components/fight/Corner.jsx";
import DoctorCheck from "../components/fight/DoctorCheck.jsx";
import Knockdown from "../components/fight/Knockdown.jsx";
import ResultScreen from "../components/fight/ResultScreen.jsx";
import Scoreboard from "../components/fight/Scoreboard.jsx";

const STAGES = ["Staredown", "Weigh-in", "Fight", "Result"];
const STAGE_KEYS = { "Staredown": "STAGE.staredown", "Weigh-in": "STAGE.weighin", "Fight": "STAGE.fight", "Result": "STAGE.result" };
const IN_FIGHT = new Set(["round", "corner", "knockdown", "entrance"]);

export default function FightNight({ fighter, done, staff }) {
  const opp = fighter.booked.opponent;
  const totalRounds = fighter.booked.title === true ? 5 : 3;
  const ca = ARCH_COLOR[fighter.archetype] || T.steel;
  const cb = ARCH_COLOR[opp.archetype] || T.steel;

  // Stage state machine
  const [stage, setStage] = useState("staredown");
  const [attitude, setAttitude] = useState(null);
  const [plan, setPlan] = useState(null);
  const [viewMode, setViewMode] = useState("summary");
  const [rnd, setRnd] = useState(1);
  const [state, setState] = useState(null);
  const [roundLog, setRoundLog] = useState(null);
  const [tickIdx, setTickIdx] = useState(0);
  const [timer, setTimer] = useState(60);
  const [cutA, setCutA] = useState(0);
  const [cutB, setCutB] = useState(0);
  const [docCheck, setDocCheck] = useState(false);
  const [weighinIssue, setWeighinIssue] = useState(null);
  const [result, setResult] = useState(null);
  const [totalLandA, setTotalLandA] = useState(0);
  const [totalLandB, setTotalLandB] = useState(0);
  const [totalTdA, setTotalTdA] = useState(0);
  const [totalTdB, setTotalTdB] = useState(0);

  // Hooks
  useFightSeed(fighter.id, fighter.booked.seed);
  const { A, B, cutInfo, cutPct, missedWeight } = useFightPrep(fighter, opp, attitude, staff);

  // Run round
  const runRound = (rn, st0, corner) => {
    const cA = corner;
    const res = simRound(rn, A, B, st0?.staA ?? 100, st0?.staB ?? 100, plan || "Keep It Standing", cA, st0?.momentum ?? 0, st0?.cutA ?? 0, st0?.cutB ?? 0);
    setRoundLog(res);
    const prevDmgA = st0?.totalDmgA || 0;
    const prevDmgB = st0?.totalDmgB || 0;
    const totalDmgA = prevDmgA + res.dmgA;
    const totalDmgB = prevDmgB + res.dmgB;
    setState({
      ...(st0 || {}),
      staA: res.staA, staB: res.staB,
      hpA: Math.max(0, 100 - totalDmgA / 1.5),
      hpB: Math.max(0, 100 - totalDmgB / 1.5),
      totalDmgA, totalDmgB,
      momentum: res.momentum,
      cutA: res.cutA, cutB: res.cutB,
    });
    setCutA(res.cutA);
    setCutB(res.cutB);
    setTickIdx(0);
    setRnd(rn);
    setStage("round");
  };

  const startFight = () => {
    if (weighinIssue === "cancelled") {
      done((g2) => { g2.log.unshift("🚫 Fight dibatalkan. Rep -4."); g2.rep = clamp(g2.rep - 4, 2, 100); });
      return;
    }
    setStage("entrance");
    const initMomentum = fighter.booked?.pressChoice === "trashTalk" ? 5 : 0;
    const initState = initMomentum > 0 ? { momentum: initMomentum } : null;
    setTimeout(() => runRound(1, initState, "go"), 500);
  };

  const nextRound = () => {
    if (!state) return;
    const nr = rnd + 1;
    if (docCheck) { setDocCheck(false); setStage("result"); return; }
    if (nr > totalRounds) { processResult(); return; }
    if ((cutA >= 6 || cutB >= 6) && nr <= totalRounds && !docCheck && random() < 0.3) {
      setDocCheck(true); setStage("corner"); setTimer(60); return;
    }
    runRound(nr, state, "go");
  };

  const processResult = () => {
    if (!roundLog) return;
    const res = roundLog;
    const won = res.winner === "A";
    const how = res.finish ? res.finish.how : "Decision";
    const r = res.finish ? res.finish.duringRound : totalRounds;
    setResult({ won, how, r, totalDmgA: state?.totalDmgA || 0, totalDmgB: state?.totalDmgB || 0, attitude });
    setStage("result");
  };

  const commitResult = () => {
    if (!result) { done((g) => {}); return; }
    done((g) => { commitFightResult(g, fighter, result); });
  };

  // Corner countdown timer
  useEffect(() => {
    if (stage !== "corner") return;
    const iv = setInterval(() => setTimer((t) => { if (t <= 1) { nextRound(); return 0; } return t - 1; }), 1000);
    return () => clearInterval(iv);
  }, [stage, rnd]);

  // Tick auto-advance
  useEffect(() => {
    if (viewMode !== "tick" || stage !== "round" || !roundLog) return;
    const displayLog = roundLog.log || [];
    if (tickIdx >= displayLog.length) return;
    const iv = setInterval(() => setTickIdx((p) => p + 1), 1200);
    return () => clearInterval(iv);
  }, [viewMode, stage, roundLog]);

  // Tick finish detection
  useEffect(() => {
    if (!roundLog || viewMode !== "tick" || stage !== "round" || !state) return;
    const displayLog = roundLog.log || [];
    if (tickIdx >= displayLog.length) {
      if (roundLog.finish) {
        setStage(roundLog.finish.how === "KO" || roundLog.finish.how === "TKO" ? "knockdown" : "result");
      } else if (roundLog.knockdown) {
        setStage("knockdown");
      } else {
        setStage("result");
      }
    }
  }, [tickIdx]);

  const stepIdx = stage === "staredown" ? 0 : stage === "weighin" || stage === "entrance" ? 1 : stage === "result" ? 3 : 2;
  const inFight = IN_FIGHT.has(stage);
  const displayLog = roundLog?.log || [];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, overflowY: "auto",
      background: `radial-gradient(ellipse 90% 55% at 50% -5%, ${T.raised} 0%, ${T.bg} 60%)` }}>
      <GlobalStyle />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: 14, position: "relative" }}>

        {/* Stage progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          {STAGES.map((st, i) => (
            <React.Fragment key={st}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 20, height: 20, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.mono, fontSize: 10, fontWeight: 700, background: i <= stepIdx ? T.ember : T.raised, color: i <= stepIdx ? T.bg : T.txt3 }}>{i + 1}</span>
                <span style={{ fontFamily: T.body, fontSize: 11.5, fontWeight: i === stepIdx ? 700 : 500, color: i === stepIdx ? T.txt : T.txt3 }}>{t(STAGE_KEYS[st])}</span>
              </div>
              {i < 3 && <div style={{ flex: 1, height: 1, background: i < stepIdx ? T.ember : T.line }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Scoreboard */}
        {inFight && state && (
          <Scoreboard fighter={fighter} opp={opp} state={state} rnd={rnd} totalRounds={totalRounds}
            totalLandA={totalLandA} totalLandB={totalLandB} totalTdA={totalTdA} totalTdB={totalTdB} />
        )}

        {/* Stage content */}
        {stage === "staredown" && <Staredown fighter={fighter} attitude={attitude} setAttitude={setAttitude} onContinue={() => setStage("weighin")} />}
        {stage === "weighin" && <WeighIn fighter={fighter} opp={opp} cutInfo={cutInfo} cutPct={cutPct} missedWeight={missedWeight} weighinIssue={weighinIssue} setWeighinIssue={setWeighinIssue} plan={plan} setPlan={setPlan} viewMode={viewMode} setViewMode={setViewMode} onStart={startFight} ca={ca} cb={cb} />}
        {stage === "entrance" && <Entrance fighter={fighter} opp={opp} ca={ca} cb={cb} />}
        {stage === "round" && roundLog && <RoundView rnd={rnd} roundLog={roundLog} viewMode={viewMode} tickIdx={tickIdx} displayLog={displayLog} onEndRound={() => { setStage("corner"); setTimer(60); }} onSeeFinish={() => { setStage(roundLog.finish.how === "KO" || roundLog.finish.how === "TKO" ? "knockdown" : "result"); if (roundLog.finish.how !== "KO" && roundLog.finish.how !== "TKO") processResult(); }} hasFinish={!!roundLog.finish} />}
        {stage === "corner" && !docCheck && <Corner rnd={rnd} totalRounds={totalRounds} timer={timer} state={state} runRound={runRound} processResult={processResult} />}
        {stage === "corner" && docCheck && <DoctorCheck fighter={fighter} opp={opp} cutA={cutA} cutB={cutB} onContinue={() => { setDocCheck(false); setStage("corner"); }} onRetire={() => { const isPlayerCut = cutA >= 6; setResult({ won: !isPlayerCut, how: "Doctor Stoppage", r: rnd }); setStage("result"); }} />}
        {stage === "knockdown" && <Knockdown roundLog={roundLog} rnd={rnd} onSeeResult={() => { processResult(); }} />}
        {stage === "result" && result && <ResultScreen fighter={fighter} opp={opp} roundLog={roundLog} result={result} totalRounds={totalRounds} onCommit={commitResult} />}
      </div>
    </div>
  );
}
