import React, { useState, useEffect, useRef, useMemo } from "react";
import { R, RI, clamp, pick, fmt$, random, setRNG, resetRNG, mulberry32, uid } from "../engine/rng.js";
import { ATTRS, ATTR_LABEL, WEIGHTS, GAME_PLANS } from "../engine/data.js";
import { prepFighter, simRound } from "../engine/fight.js";
import { processFightResult, processRivalry, updateRivalryResult, processTitleChange } from "../engine/career.js";
import { T, C, DISPLAY, GlobalStyle, Card, H, Btn, Tag, Bar, CompareBar, Mono, ARCH_COLOR, Panel, Eyebrow } from "./theme.jsx";

/* =============================================================================
   FIGHT NIGHT — Ironfist Redesign
   Fullscreen staged experience. Real engine + redesign visuals.
============================================================================= */

export default function FightNight({ fighter, done }) {
  const [stage, setStage] = useState("staredown");
  const [attitude, setAttitude] = useState(null);
  const [plan, setPlan] = useState(null);
  const [viewMode, setViewMode] = useState("summary");
  const [rnd, setRnd] = useState(1);
  const [state, setState] = useState(null);
  const [roundLog, setRoundLog] = useState(null);
  const [tickIdx, setTickIdx] = useState(0);
  const [cornerState, setCornerState] = useState(null);
  const [result, setResult] = useState(null);
  const [timer, setTimer] = useState(60);
  const [cutA, setCutA] = useState(0);
  const [cutB, setCutB] = useState(0);
  const [docCheck, setDocCheck] = useState(false);
  const [weighinIssue, setWeighinIssue] = useState(null);
  const [fightSeed, setFightSeed] = useState(null);
  const [totalLandA, setTotalLandA] = useState(0);
  const [totalLandB, setTotalLandB] = useState(0);
  const [totalTdA, setTotalTdA] = useState(0);
  const [totalTdB, setTotalTdB] = useState(0);
  const [scores, setScores] = useState([]);

  const cornerRef = useRef(null);
  const tickDataRef = useRef({});
  const seedRef = useRef(null);

  const opp = fighter.booked.opponent;
  const totalRounds = fighter.booked.title === true ? 5 : 3;
  const CORNER_RED = "#f5623c", CORNER_BLUE = "#3ea6ff";

  // Seed RNG
  useEffect(() => {
    const s = fighter.booked.seed || Date.now();
    seedRef.current = s;
    setFightSeed(s);
    setRNG(mulberry32(s));
    return () => { seedRef.current = null; resetRNG(); };
  }, [fighter.id]);

  // Prep fighters
  const { A, B, attMod } = useMemo(() => {
    const fa = prepFighter({ ...fighter });
    const fo = prepFighter({ ...opp, attrs: { ...(opp.attrs || {}) } });
    const mod = { a: {}, b: {} };
    if (attitude === "Trash talk") { mod.a.striking = 1.08; mod.b.striking = 1.05; }
    else if (attitude === "Respectful") { mod.a.footwork = 1.05; }
    Object.entries(mod.a).forEach(([k, v]) => fa.attrs[k] = clamp(fa.attrs[k] * v, 5, 99));
    Object.entries(mod.b).forEach(([k, v]) => fo.attrs[k] = clamp(fo.attrs[k] * v, 5, 99));
    return { A: fa, B: fo, attMod: mod };
  }, [fighter, opp, attitude]);

  // Weight cut
  const wc = WEIGHTS.find((w) => w.name === fighter.weightClass);
  const limit = wc ? wc.limit : 155;
  const hasWeight = fighter.natWeight != null && !isNaN(fighter.natWeight);
  const cutPct = hasWeight ? (fighter.natWeight - limit) / fighter.natWeight : 0;
  const cutInfo = { label: cutPct > 0.07 ? "Big cut" : cutPct > 0.03 ? "Moderate cut" : "On weight", pen: cutPct > 0.07 ? 10 : cutPct > 0.03 ? 5 : 0 };
  const missWeightChance = cutPct > 0.08 ? 0.20 : cutPct > 0.05 ? 0.08 : 0.02;
  const missedWeight = useMemo(() => random() < missWeightChance, [fighter.id]);

  // Sync ref
  useEffect(() => { tickDataRef.current = { roundLog, state, rnd, totalRounds, cutA, cutB, docCheck }; });

  // Run round
  const runRound = (rn, st0, corner) => {
    const cA = corner === "go" ? "go" : corner === "save" ? "save" : corner === "body" ? "body" : "go";
    const res = simRound(rn, A, B, st0?.staA ?? 100, st0?.staB ?? 100, plan || "Keep It Standing", cA, st0?.momentum ?? 0);
    setRoundLog(res);
    setState(st0 ? { ...st0, staA: res.staA, staB: res.staB, hpA: res.hpA, hpB: res.hpB } : { staA: 100, staB: 100, hpA: 100, hpB: 100 });
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
    setTimeout(() => { runRound(1, null, "go"); }, 2500);
  };

  const nextRound = () => {
    const d = tickDataRef.current;
    if (!d.state) return;
    const nr = d.rnd + 1;

    if (d.docCheck) { setDocCheck(false); setStage("result"); return; }
    if (nr > totalRounds) { processResult(); return; }
    if (d.cutB >= 6 && nr <= totalRounds && !d.docCheck && random() < 0.3) {
      setDocCheck(true); setStage("corner"); setTimer(60); return;
    }
    // Auto-advance with default corner if timer expires
    runRound(nr, d.state, "go");
  };

  // Corner timer
  useEffect(() => {
    if (stage !== "corner") return;
    const iv = setInterval(() => setTimer((t) => { if (t <= 1) { nextRound(); return 0; } return t - 1; }), 1000);
    return () => clearInterval(iv);
  }, [stage, rnd]);

  // Tick log auto-advance
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

  // Result processing
  const processResult = () => {
    if (!roundLog) return;
    const res = roundLog;
    const won = res.winner === "A";
    const how = res.finish ? res.finish.how : "Decision";
    const r = res.finish ? res.finish.duringRound : totalRounds;
    setResult({ won, how, r });
    setStage("result");
  };

  // Commit result — called from "Back to camp" button
  const commitResult = () => {
    if (!result) { done((g2) => {}); return; }
    done((g2) => {
      const f = g2.roster.find((x) => x.id === fighter.id);
      if (!f) return;
      f.booked = null;
      if (result.won) {
        f.record.w++; f.streakW = (f.streakW || 0) + 1; f.streakL = 0;
        if (result.how === "KO/TKO" || result.how === "Doctor Stoppage") f.record.ko++;
        else if (result.how === "Submission") f.record.sub++;
        else f.record.dec++;
        f.morale = clamp(f.morale + 12, 0, 100);
        // Personality traits: popularity
        const popBase = result.how === "Decision" ? 3 : 7;
        const crowdMult = f.traits?.includes("Crowd Favorite") ? 2 : 1;
        const showboatBonus = f.traits?.includes("Showboat") && result.how !== "Decision" ? 5 : 0;
        f.popularity = clamp(f.popularity + popBase * crowdMult + showboatBonus, 0, 100);
        g2.rep = clamp(g2.rep + 7, 0, 100);
        if (fighter.booked.title) {
          if (!f.titles.includes("Major World Champion")) f.titles.push("Major World Champion");
          if (g2.divisions[f.weightClass]) g2.divisions[f.weightClass].champ = { name: f.name, player: true, fighterId: f.id };
        }
        g2.legacy = (g2.legacy || 0) + (fighter.booked.title ? 2000 : 600);
        g2.log.unshift(`🏆 ${f.name} menang via ${result.how} R${result.r}!`);
        // Career identity: milestones + rivalry
        const oppName = fighter.booked.opponent?.name || "Unknown";
        const careerEvents = processFightResult(f, g2, { won: true, how: result.how });
        const rivalryEvents = processRivalry(f, { name: oppName }, g2);
        updateRivalryResult(f, { name: oppName, rivalries: {} }, g2);
        if (fighter.booked.title) {
          const titleEvents = processTitleChange(f, g2, f.titleDefenses ? "defense" : "won");
          careerEvents.push(...titleEvents);
        }
        // Push milestone events to inbox
        [...careerEvents, ...rivalryEvents].forEach((ev) => {
          g2.inbox.unshift({ id: uid(), type: "event", title: ev.title, body: ev.body, choices: [{ label: "OK", chem: 0 }] });
        });
        // Track giant kills (beating higher-ranked opponent)
        if (fighter.booked.oppRank != null && fighter.booked.oppRank <= 5) {
          f.giantKills = (f.giantKills || 0) + 1;
        }
      } else {
        f.record.l++; f.streakL = (f.streakL || 0) + 1; f.streakW = 0;
        // Development trait: Iron Will — reduced morale loss
        const moraleLoss = f.traits?.includes("Iron Will") ? -4 : -14;
        f.morale = clamp(f.morale + moraleLoss, 0, 100);
        g2.rep = clamp(g2.rep - 3, 2, 100);
        g2.chemistry = clamp(g2.chemistry - 2, 0, 100);
        g2.log.unshift(`❌ ${f.name} kalah via ${result.how} R${result.r}.`);
        // Career identity: milestones + rivalry (loss)
        const oppName = fighter.booked.opponent?.name || "Unknown";
        const careerEvents = processFightResult(f, g2, { won: false, how: result.how });
        updateRivalryResult({ name: oppName, rivalries: {} }, f, g2);
        careerEvents.forEach((ev) => {
          g2.inbox.unshift({ id: uid(), type: "event", title: ev.title, body: ev.body, choices: [{ label: "OK", chem: 0 }] });
        });
      }
    });
  };

  const STAGES = ["Staredown", "Weigh-in", "Fight", "Result"];
  const stepIdx = stage === "staredown" ? 0 : stage === "weighin" || stage === "entrance" ? 1 : stage === "result" ? 3 : 2;
  const inFight = ["round", "corner", "knockdown", "entrance"].includes(stage);

  const displayLog = roundLog?.log || [];
  const ca = ARCH_COLOR[fighter.archetype] || T.steel;
  const cb = ARCH_COLOR[opp.archetype] || T.steel;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, overflowY: "auto",
      background: `radial-gradient(ellipse 90% 55% at 50% -5%, ${T.raised} 0%, ${C.bg} 60%)` }}>
      <GlobalStyle />
      <div style={{ maxWidth: 860, margin: "0 auto", padding: 14, position: "relative" }}>

        {/* Stage progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          {STAGES.map((st, i) => (
            <React.Fragment key={st}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 20, height: 20, borderRadius: 10, display: "flex",
                  alignItems: "center", justifyContent: "center", fontFamily: T.mono, fontSize: 10,
                  fontWeight: 700, background: i <= stepIdx ? T.ember : T.raised,
                  color: i <= stepIdx ? T.bg : T.txt3 }}>{i + 1}</span>
                <span style={{ fontFamily: T.body, fontSize: 11.5, fontWeight: i === stepIdx ? 700 : 500,
                  color: i === stepIdx ? T.txt : T.txt3 }}>{st}</span>
              </div>
              {i < 3 && <div style={{ flex: 1, height: 1, background: i < stepIdx ? T.ember : T.line }} />}
            </React.Fragment>
          ))}
        </div>

        {/* Scoreboard */}
        {inFight && state && (
          <Panel pad={14} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 16, textTransform: "uppercase", color: T.txt }}>{fighter.name}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: CORNER_RED }}>HP {Math.round(state.hpA || 100)}</span>
                </div>
                <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: "hidden", transform: "scaleX(-1)" }}>
                  <div style={{ height: "100%", width: `${state.hpA || 100}%`, background: CORNER_RED, borderRadius: 4 }} />
                </div>
                <div style={{ height: 4, background: T.bg, borderRadius: 2, marginTop: 3, overflow: "hidden", transform: "scaleX(-1)" }}>
                  <div style={{ height: "100%", width: `${state.staA || 100}%`, background: T.pos, borderRadius: 2 }} />
                </div>
              </div>
              <div style={{ textAlign: "center", flexShrink: 0 }}>
                <div style={{ fontFamily: T.body, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: T.txt3 }}>Round</div>
                <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: T.txt, lineHeight: 1 }}>{rnd}<span style={{ fontSize: 12, color: T.txt3 }}>/{totalRounds}</span></div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: CORNER_BLUE }}>HP {Math.round(state.hpB || 100)}</span>
                  <span style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 16, textTransform: "uppercase", color: T.txt }}>{opp.name}</span>
                </div>
                <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${state.hpB || 100}%`, background: CORNER_BLUE, borderRadius: 4 }} />
                </div>
                <div style={{ height: 4, background: T.bg, borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${state.staB || 100}%`, background: T.pos, borderRadius: 2 }} />
                </div>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: T.mono, fontSize: 11, color: T.txt3 }}>
              <span>STR <b style={{ color: CORNER_RED }}>{totalLandA}</b> · TD <b style={{ color: CORNER_RED }}>{totalTdA}</b></span>
              <span>TD <b style={{ color: CORNER_BLUE }}>{totalTdB}</b> · STR <b style={{ color: CORNER_BLUE }}>{totalLandB}</b></span>
            </div>
          </Panel>
        )}

        {/* STAREDOWN */}
        {stage === "staredown" && (
          <Panel>
            <Eyebrow color={T.ember}>Staredown · press conference</Eyebrow>
            <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.txt2, marginBottom: 14 }}>
              Both fighters face off. Choose the attitude <b style={{ color: T.txt }}>{fighter.name}</b> shows the cameras.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
              {[["Respectful", T.pos, "+5% footwork · +2 popularity", "safe — no downside"],
                ["Professional", T.steel, "neutral · +2 rep on a win", "no bonus, no risk"],
                ["Trash talk", T.neg, "+8% striking (his +5%) · +5 pop", "lose = morale −8, rep −5"]].map(([k, c, fx, risk]) => (
                <button key={k} className="chip" onClick={() => setAttitude(k)} style={{
                  textAlign: "left", padding: "12px 14px", borderRadius: T.r, cursor: "pointer",
                  border: `1px solid ${attitude === k ? c : T.line}`,
                  background: attitude === k ? `${c}14` : T.bg }}>
                  <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 16, letterSpacing: .5, textTransform: "uppercase", color: attitude === k ? c : T.txt }}>{k}</div>
                  <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt2, marginTop: 5 }}>{fx}</div>
                  <div style={{ fontFamily: T.body, fontSize: 10.5, color: T.txt3, marginTop: 2 }}>{risk}</div>
                </button>
              ))}
            </div>
            <Btn color={T.ember} onClick={() => { setStage("weighin"); }} style={{ opacity: attitude ? 1 : .4, pointerEvents: attitude ? "auto" : "none" }}>Continue to weigh-in</Btn>
          </Panel>
        )}

        {/* WEIGH-IN + GAME PLAN */}
        {stage === "weighin" && (
          <>
            <Panel>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Eyebrow>Weigh-in</Eyebrow>
                {missedWeight && !weighinIssue ? <Tag color={T.neg}>Missed weight</Tag> : <Tag color={T.pos}>Made weight</Tag>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, color: T.txt }}>
                  {fighter.natWeight || limit} <span style={{ fontSize: 13, color: T.txt3 }}>→ {limit} lbs</span></span>
                <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt2 }}>
                  {cutInfo.label} ({Math.round(cutPct * 100)}%) — <span style={{ color: cutInfo.pen > 0 ? T.warn : T.pos }}>−{cutInfo.pen}% stamina cap</span>.
                </div>
              </div>
              {missedWeight && !weighinIssue && (
                <div style={{ marginTop: 10, padding: 10, background: `${T.neg}15`, border: `1px solid ${T.neg}44`, borderRadius: T.r }}>
                  <div style={{ color: T.neg, fontSize: 13, fontFamily: T.disp, letterSpacing: 1 }}>MISS WEIGHT — {fighter.natWeight} lbs!</div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "center" }}>
                    <Btn sm color={T.neg} onClick={() => setWeighinIssue("catchweight")}>Catchweight (purse -30%)</Btn>
                    <Btn sm color={T.txt3} ghost onClick={() => setWeighinIssue("cancelled")}>Cancel Fight</Btn>
                  </div>
                </div>
              )}
            </Panel>

            {/* Tale of the Tape */}
            <Panel>
              <div style={{ textAlign: "center", fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.txt3, marginBottom: 12 }}>Tale of the Tape</div>
              <CompareBar label="Age" a={fighter.age} b={opp.age || 28} ca={ca} cb={cb} />
              <div style={{ height: 1, background: T.line, margin: "8px 0" }} />
              {[["Striking","striking"],["Wrestling","wrestling"],["BJJ","bjj"],["Footwork","footwork"],["Strength","strength"],["Cardio","cardio"],["Chin","chin"],["Fight IQ","fightIQ"]].map(([lb,k]) => (
                <CompareBar key={k} label={lb} a={Math.round(fighter.attrs[k])} b={Math.round(opp.attrs?.[k] || 50)} ca={ca} cb={cb} />
              ))}
            </Panel>

            {/* Game Plan */}
            <Panel>
              <Eyebrow color={T.ember}>Game plan · pick one</Eyebrow>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {Object.entries(GAME_PLANS).map(([k, d]) => (
                  <button key={k} className="chip" onClick={() => setPlan(k)} style={{
                    textAlign: "left", padding: "11px 13px", borderRadius: T.r, cursor: "pointer",
                    border: `1px solid ${plan === k ? T.ember : T.line}`,
                    background: plan === k ? `${T.ember}12` : T.bg }}>
                    <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 14.5, letterSpacing: .4, textTransform: "uppercase", color: plan === k ? T.ember : T.txt }}>{k}</div>
                    <div style={{ fontFamily: T.body, fontSize: 10.5, color: T.txt2, marginTop: 4 }}>{d}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
                <span style={{ fontFamily: T.body, fontSize: 11, color: T.txt3, flex: 1 }}>
                  Viewing: <b style={{ color: T.txt2 }}>{viewMode === "tick" ? "Tick-by-tick" : "Round summary"}</b></span>
                {[{ k: "tick", label: "Tick-by-Tick" }, { k: "summary", label: "Round Summary" }].map((m) => (
                  <button key={m.k} onClick={() => setViewMode(m.k)} style={{ fontFamily: T.body, fontSize: 10, background: viewMode === m.k ? T.ember : T.raised, color: viewMode === m.k ? T.bg : T.txt3, border: `1px solid ${T.line}`, padding: "4px 10px", borderRadius: T.r, cursor: "pointer" }}>{m.label}</button>
                ))}
              </div>
              <div style={{ marginTop: 14 }}>
                <Btn color={T.ember} onClick={startFight} style={{ opacity: plan ? 1 : .4, pointerEvents: plan ? "auto" : "none" }}>🔔 Ring the Bell</Btn>
              </div>
            </Panel>
          </>
        )}

        {/* ENTRANCE */}
        {stage === "entrance" && (
          <Panel style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontSize: 48, marginBottom: 4 }}>🚶</div>
            <Eyebrow color={T.gold}>Fighter Entrance</Eyebrow>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 14 }}>
              <div style={{ textAlign: "center" }}><Mono name={fighter.name} color={ca} size={56} champ={fighter.titles?.length > 0} />
                <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 16, textTransform: "uppercase", color: T.txt, marginTop: 6 }}>{fighter.name}</div>
                <div style={{ color: T.txt3, fontSize: 10, marginTop: 1 }}>{fighter.weightClass}</div></div>
              <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 22, color: T.ember, alignSelf: "center" }}>VS</div>
              <div style={{ textAlign: "center" }}><Mono name={opp.name} color={cb} size={56} />
                <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 16, textTransform: "uppercase", color: T.txt, marginTop: 6 }}>{opp.name}</div>
                <div style={{ color: T.txt3, fontSize: 10, marginTop: 1 }}>{opp.weightClass || fighter.weightClass}</div></div>
            </div>
          </Panel>
        )}

        {/* ROUND — commentary */}
        {(stage === "round") && roundLog && (
          <Panel>
            <Eyebrow>Round {rnd} · commentary</Eyebrow>
            {viewMode === "tick" ? (
              displayLog.slice(0, tickIdx).map((l, i) => (
                <div key={i} style={{ fontFamily: T.body, fontSize: 13.5, color: l.includes("DOWN") ? T.gold : l.includes("MISS") ? T.txt3 : T.txt2, fontWeight: l.includes("DOWN") ? 700 : 400, padding: "6px 0 6px 12px", borderLeft: `2px solid ${l.includes("DOWN") ? T.gold : T.line}`, marginBottom: 4, lineHeight: 1.45 }}>{l}</div>
              ))
            ) : (
              displayLog.map((l, i) => (
                <div key={i} style={{ fontFamily: T.body, fontSize: 13.5, color: l.includes("DOWN") ? T.gold : l.includes("MISS") ? T.txt3 : T.txt2, fontWeight: l.includes("DOWN") ? 700 : 400, padding: "6px 0 6px 12px", borderLeft: `2px solid ${l.includes("DOWN") ? T.gold : T.line}`, marginBottom: 4, lineHeight: 1.45 }}>{l}</div>
              ))
            )}
            {stage === "round" && !roundLog.finish && <Btn color={T.ember} onClick={() => { setStage("corner"); setTimer(60); }} style={{ marginTop: 10 }}>End of round {rnd}</Btn>}
            {stage === "round" && roundLog.finish && <Btn color={T.gold} onClick={() => { setStage(roundLog.finish.how === "KO" || roundLog.finish.how === "TKO" ? "knockdown" : "result"); if (roundLog.finish.how !== "KO" && roundLog.finish.how !== "TKO") processResult(); }} style={{ marginTop: 10 }}>See the finish</Btn>}
          </Panel>
        )}

        {/* CORNER */}
        {stage === "corner" && !docCheck && (
          <Panel style={{ border: `1px solid ${T.gold}44` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Eyebrow color={T.gold}>Corner · between rounds</Eyebrow>
              <span style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, color: T.warn, marginBottom: 12 }}>0:{String(timer).padStart(2, "0")}</span>
            </div>
            {rnd < totalRounds ? (
              <>
                <div style={{ padding: "8px 12px", background: T.bg, borderRadius: T.r, borderLeft: `3px solid ${T.gold}`, marginBottom: 14 }}>
                  <span style={{ fontFamily: T.body, fontSize: 12.5, fontStyle: "italic", color: T.txt2 }}>
                    Coach: "Pick your strategy for round {rnd + 1} — he's {state?.hpB < 50 ? "hurting" : "still dangerous"}."</span>
                </div>
                {[["go", "Keep pushing — finish him", "+aggression +finish rate", "↑ KO chance · ↓ stamina"],
                  ["body", "Work the body", "+body damage accumulation", "↑ late-round payoff · ↓ instant points"],
                  ["save", "Save your gas", "+stamina recovery", "↑ defense · ↓ output"]].map(([k, fx, trade]) => (
                  <button key={k} className="chip" onClick={() => runRound(rnd + 1, state, k)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: T.r, cursor: "pointer", marginBottom: 6, border: `1px solid ${T.line}`, background: "transparent" }}>
                    <span style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 14.5, letterSpacing: .4, textTransform: "uppercase", color: T.txt, width: 180 }}>{k === "go" ? "Finish him" : k === "body" ? "Work the body" : "Save your gas"}</span>
                    <span style={{ fontFamily: T.body, fontSize: 11.5, color: T.txt2, flex: 1 }}>{fx}</span>
                    <span style={{ fontFamily: T.body, fontSize: 10.5, color: T.txt3 }}>{trade}</span>
                  </button>
                ))}
              </>
            ) : (
              <div style={{ textAlign: "center", padding: 20 }}>
                <div style={{ fontFamily: T.body, fontSize: 13, color: T.txt2, marginBottom: 12 }}>Final round complete — waiting for decision...</div>
                <Btn color={T.gold} onClick={() => processResult()}>Go to decision</Btn>
              </div>
            )}
          </Panel>
        )}

        {/* KNOCKDOWN */}
        {stage === "knockdown" && (roundLog?.knockdown || roundLog?.finish) && (
          <Panel style={{ textAlign: "center", padding: 32, border: `1px solid ${T.gold}66`, boxShadow: `0 0 40px ${T.gold}22` }}>
            <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 44, letterSpacing: 2, textTransform: "uppercase", color: T.gold, lineHeight: 1 }}>It's over!</div>
            <div style={{ fontFamily: T.body, fontSize: 14, color: T.txt2, margin: "10px 0 18px" }}>
              {roundLog.finish ? `${roundLog.finish.how} at round ${rnd}!` : `${roundLog.knockdown.fighter} goes down!`}
            </div>
            <Btn color={T.gold} onClick={() => { processResult(); }}>See the result</Btn>
          </Panel>
        )}

        {/* DOCTOR STOPPAGE */}
        {stage === "corner" && docCheck && (
          <Panel style={{ border: `1px solid ${T.neg}55` }}>
            <Eyebrow color={T.neg}>Doctor check · cuts & damage</Eyebrow>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              {[[fighter.name, cutA, CORNER_RED], [opp.name, cutB, CORNER_BLUE]].map(([n, cut, c]) => (
                <div key={n} style={{ background: T.bg, borderRadius: T.r, padding: "10px 14px" }}>
                  <div style={{ fontFamily: T.body, fontSize: 12.5, fontWeight: 600, color: c }}>{n}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <span style={{ fontFamily: T.body, fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: T.txt3 }}>Cut severity</span>
                    <div style={{ flex: 1, height: 5, background: T.surface, borderRadius: 3 }}>
                      <div style={{ height: "100%", width: `${cut * 10}%`, borderRadius: 3, background: cut >= 6 ? T.neg : cut >= 4 ? T.warn : T.txt3 }} /></div>
                    <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: cut >= 6 ? T.neg : T.txt2 }}>{cut}/10</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: T.body, fontSize: 12.5, color: T.txt2, marginBottom: 14 }}>The cut needs attention. Continue or retire?</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn color={T.pos} onClick={() => { setDocCheck(false); setStage("corner"); }}>Continue fight</Btn>
              <Btn ghost color={T.neg} sm onClick={() => { setResult({ won: false, how: "Doctor Stoppage", r: rnd }); setStage("result"); }}>Retire (TKO loss)</Btn>
            </div>
          </Panel>
        )}

        {/* RESULT */}
        {stage === "result" && result && (
          <Panel style={{ textAlign: "center", padding: "36px 24px", border: `1px solid ${result.won ? T.gold : T.neg}55` }}>
            <div style={{ display: "inline-block", fontFamily: T.disp, fontWeight: 700, fontSize: 48, letterSpacing: 3, textTransform: "uppercase", color: result.won ? T.gold : T.neg, lineHeight: 1, padding: "6px 26px", border: `3px solid ${result.won ? T.gold : T.neg}`, borderRadius: T.r }}>{result.won ? "Victory" : "Defeat"}</div>
            <div style={{ fontFamily: T.body, fontSize: 15, color: T.txt, marginTop: 16 }}>
              <b>{fighter.name}</b> {result.won ? "wins" : "loses"} via <b>{result.how}</b> · Round {result.r}
            </div>
            {fighter.booked.title && result.won && (
              <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 17, letterSpacing: 1.5, textTransform: "uppercase", color: T.gold, marginTop: 8 }}>♛ And still {fighter.weightClass} champion</div>
            )}
            <div style={{ display: "inline-grid", gridTemplateColumns: "auto auto", gap: "6px 24px", margin: "20px 0", padding: "14px 22px", background: T.bg, borderRadius: T.r, textAlign: "left" }}>
              {[["Show money", fmt$(fighter.booked.show || 0)], ["Win bonus", fmt$(result.won ? (fighter.booked.winBonus || 0) : 0)], ["Camp cut", fmt$(Math.round(((fighter.contract?.managerCut || 0.18) * (fighter.booked.show + (result.won ? fighter.booked.winBonus : 0)))))], ["Fight of the Night", result.won ? "$50K" : "—"]].map(([l, v], i, arr) => (
                <React.Fragment key={l}>
                  <span style={{ fontFamily: T.body, fontSize: 12, color: i === arr.length - 1 ? T.txt : T.txt3, fontWeight: i === arr.length - 1 ? 700 : 400 }}>{l}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 13.5, fontWeight: 700, color: i === arr.length - 1 ? T.pos : T.txt2, textAlign: "right" }}>{v}</span>
                </React.Fragment>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Btn color={T.ember} onClick={commitResult}>Back to camp</Btn>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}
