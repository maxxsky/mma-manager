import React, { useState, useEffect, useRef, useMemo } from "react";
import { R, RI, clamp, pick, fmt$, random, setRNG, resetRNG, mulberry32 } from "../engine/rng.js";
import { ATTRS, ATTR_LABEL, WEIGHTS, GAME_PLANS } from "../engine/data.js";
import { prepFighter, simRound } from "../engine/fight.js";
import { C, DISPLAY, GlobalStyle, cut, Card, H, Btn, Tag, Bar } from "./theme.jsx";

export default function FightNight({ fighter, done }) {
  const [stage, setStage] = useState("staredown");
  const [plan, setPlan] = useState("Keep It Standing");
  const [viewMode, setViewMode] = useState("summary");
  const [attitude, setAttitude] = useState(null);
  const [rnd, setRnd] = useState(1);
  const [state, setSt] = useState(null);
  const [roundLog, setRoundLog] = useState(null);
  const [tickIdx, setTickIdx] = useState(0);
  const [corner, setCornerState] = useState("plan");
  const cornerRef = useRef("plan");
  const setCorner = (k) => { cornerRef.current = k; setCornerState(k); };
  const [result, setResult] = useState(null);
  const [timer, setTimer] = useState(20);
  const [cutA, setCutA] = useState(0);
  const [cutB, setCutB] = useState(0);
  const [docCheck, setDocCheck] = useState(false);
  const [weighinIssue, setWeighinIssue] = useState(null);
  const [fightSeed, setFightSeed] = useState(null);
  const tickDataRef = useRef({ roundLog: null, state: null, rnd: 1, totalRounds: 3, cutA: 0, cutB: 0, docCheck: false });
  // Cumulative fight stats for HUD
  const [totalLandA, setTotalLandA] = useState(0);
  const [totalLandB, setTotalLandB] = useState(0);
  const [totalTdA, setTotalTdA] = useState(0);
  const [totalTdB, setTotalTdB] = useState(0);

  // Seed RNG for this fight, reset on unmount
  // useRef guards against double-init in React Strict Mode
  const seedRef = useRef(null);
  useEffect(() => {
    if (seedRef.current) return; // already seeded — Strict Mode guard
    const seed = fighter.booked?.fightSeed || Math.floor(random() * 2147483647);
    seedRef.current = seed;
    setFightSeed(seed);
    setRNG(mulberry32(seed));
    return () => { seedRef.current = null; resetRNG(); };
  }, []);
  const opp = fighter.booked.opponent;
  // useMemo: compute fighters once (attitude changes re-trigger, but renders don't mutate in-place)
  const { A, B, attMod } = useMemo(() => {
    const baseA = prepFighter(fighter);
    const baseB = prepFighter(opp);
    const A = { ...baseA, attrs: { ...baseA.attrs } };
    const B = { ...baseB, attrs: { ...baseB.attrs } };
    // Staredown attitude effects
    const getAttitudeMod = () => {
      if (attitude === "Respectful") return { a: { footwork: 1.05 }, b: {}, desc: "Focused & respectful" };
      if (attitude === "Trash Talk") return { a: { striking: 1.08 }, b: { striking: 1.05 }, desc: "Heated trashtalk" };
      return { a: {}, b: {}, desc: "Professional" };
    };
    const mod = getAttitudeMod();
    Object.entries(mod.a).forEach(([k, v]) => A.attrs[k] = clamp(A.attrs[k] * v, 5, 99));
    Object.entries(mod.b).forEach(([k, v]) => B.attrs[k] = clamp(B.attrs[k] * v, 5, 99));
    return { A, B, attMod: mod };
  }, [fighter, opp, attitude]);
  const totalRounds = fighter.booked.title ? 5 : 3;

  // Sync volatile values to ref (prevents stale closure in auto-advance)
  useEffect(() => { tickDataRef.current = { ...tickDataRef.current, roundLog, state, rnd, totalRounds, cutA, cutB, docCheck }; });
  // Guard: missing weightClass / natWeight → default safe values
  const wc = WEIGHTS.find((w) => w.name === fighter.weightClass);
  const limit = wc ? wc.limit : 155;
  const hasWeight = fighter.natWeight != null && !isNaN(fighter.natWeight);
  const cutPct = hasWeight ? (fighter.natWeight - limit) / fighter.natWeight : 0;
  const cutInfo =
    cutPct < 0.03
      ? { label: "Easy Cut", pen: 0 }
      : cutPct < 0.06
        ? { label: "Moderate Cut · -5% stamina", pen: 5 }
        : { label: "Hard Cut · -10% stamina", pen: 10 };
  const missWeightChance = cutPct > 0.08 ? 0.20 : cutPct > 0.05 ? 0.08 : 0.02;
  // useMemo prevents re-roll on every render (would flicker weigh-in status)
  const missedWeight = useMemo(() => random() < missWeightChance, [fighter.id]);

  const runRound = (r, st, cornerChoice) => {
    const res = simRound(r, A, B, st.staA, st.staB, plan, cornerChoice, cutInfo.pen > 5, st.mom || 0);
    const newSt = {
      staA: res.staA, staB: res.staB,
      dmgA: st.dmgA + res.dmgA, dmgB: st.dmgB + res.dmgB,
      scores: [...st.scores, { a: res.scoreA, b: res.scoreB }],
      mom: res.momentum != null ? res.momentum : 0,
    };
    const newCutA = cutA + (res.dmgA > 20 ? RI(0, 2) : res.dmgA > 10 ? RI(0, 1) : 0);
    const newCutB = cutB + (res.dmgB > 20 ? RI(0, 2) : res.dmgB > 10 ? RI(0, 1) : 0);
    setCutA(newCutA); setCutB(newCutB);
    setSt(newSt); setRoundLog(res); setTickIdx(0);
    // Accumulate fight stats for HUD
    setTotalLandA((prev) => prev + (res.landA || 0));
    setTotalLandB((prev) => prev + (res.landB || 0));
    if (res.tdA) setTotalTdA((prev) => prev + 1);
    if (res.tdB) setTotalTdB((prev) => prev + 1);
    if (res.finish) {
      setResult({ won: res.finish.by === "A", how: res.finish.how, r });
      setStage("result");
    } else if (res.knockdown) {
      setStage("knockdown");
    } else if (r >= totalRounds) {
      const winsA = newSt.scores.filter((s) => s.a > s.b).length;
      const winsB = newSt.scores.filter((s) => s.b > s.a).length;
      if (winsA === winsB) {
        setResult({ won: false, how: "Draw", r, draw: true });
      } else {
        setResult({ won: winsA > winsB, how: "Decision", r });
      }
      setStage("result");
    } else {
      // Tick mode: stay in "round" — auto-advance effect handles transition after ticks finish
      if (viewMode === "tick") return; // keep stage as "round", ticks will auto-advance
      if ((newCutA >= 4 || newCutB >= 4) && !docCheck) {
        setDocCheck(true); setStage("corner");
      } else setStage("corner");
    }
  };

  const startFight = () => {
    const st0 = { staA: 100 - cutInfo.pen, staB: 100, dmgA: 0, dmgB: 0, scores: [], mom: 0 };
    setSt(st0);
    if (viewMode === "skip") {
      let st = { ...st0 };
      const rounds = [];
      for (let r = 1; r <= totalRounds; r++) {
        const res = simRound(r, A, B, st.staA, st.staB, plan, "plan", cutInfo.pen > 5, st.mom || 0);
        st = {
          staA: res.staA, staB: res.staB,
          dmgA: st.dmgA + res.dmgA, dmgB: st.dmgB + res.dmgB,
          scores: [...st.scores, { a: res.scoreA, b: res.scoreB }],
          mom: res.momentum != null ? res.momentum : 0,
        };
        rounds.push(res);
        if (res.finish) { 
          setSt(st); setRoundLog(res); setResult({ won: res.finish.by === "A", how: res.finish.how, r }); 
          setStage("skipSummary"); return; 
        }
      }
      setSt(st);
      const winsA = st.scores.filter((s) => s.a > s.b).length;
      const winsB = st.scores.filter((s) => s.b > s.a).length;
      if (winsA === winsB) {
        setResult({ won: false, how: "Draw", r: totalRounds, draw: true });
      } else {
        setResult({ won: winsA > winsB, how: "Decision", r: totalRounds });
      }
      // Build combined round summary
      const summaryLog = [];
      rounds.forEach((res, i) => {
        summaryLog.push(`Round ${i + 1}: ${res.finish ? `Fight ended via ${res.finish.how}` : `10-9 ${res.scoreA > res.scoreB ? fighter.name : opp.name}`}`);
      });
      setRoundLog({ log: summaryLog });
      setStage("skipSummary");
    } else {
      setStage("entrance");
      setTimeout(() => { setStage("round"); runRound(1, st0, "plan"); }, 2500);
    }
  };

  const nextRound = () => {
    const nr = rnd + 1;
    if (nr > totalRounds) {
      const winsA = state?.scores?.filter((s) => s.a > s.b).length || 0;
      const winsB = state?.scores?.filter((s) => s.b > s.a).length || 0;
      if (winsA === winsB) {
        setResult({ won: false, how: "Draw", r: rnd, draw: true });
      } else {
        setResult({ won: winsA > winsB, how: "Decision", r: rnd });
      }
      setStage("result");
      return;
    }
    setRnd(nr); setStage("round");
    runRound(nr, state, cornerRef.current);
  };

  useEffect(() => {
    if (stage !== "corner") return;
    setTimer(20);
    const iv = setInterval(() => setTimer((t) => t > 0 ? t - 1 : 0), 1000);
    return () => clearInterval(iv);
  }, [stage, rnd]);
  useEffect(() => { if (stage === "corner" && timer <= 0) nextRound(); }, [timer]);
  // Tick-by-Tick: reveal log lines one by one
  // tickIdx NOT in dep array — interval is closure-safe via functional setTickIdx(prev=>).
  // Putting tickIdx as dep forces interval re-create ON EVERY TICK (flicker + lost updates).
  useEffect(() => {
    if (viewMode !== "tick" || stage !== "round" || !roundLog) return;
    const displayLog = roundLog.tickLog || roundLog.log;
    if (displayLog.length === 0) return;
    const iv = setInterval(() => {
      setTickIdx((prev) => {
        const next = prev + 1;
        if (next >= displayLog.length) return prev;
        return next;
      });
    }, 500);
    return () => clearInterval(iv);
  }, [viewMode, stage, roundLog]);
  // Auto-advance to corner when tick-by-tick finishes
  // tickIdx caps at displayLog.length-1 (interval stop prevents reaching length),
  // so check >= displayLog.length - 1 instead of >= displayLog.length.
  useEffect(() => {
    if (viewMode !== "tick" || stage !== "round" || !roundLog || !state) return;
    const displayLog = roundLog.tickLog || roundLog.log;
    if (displayLog.length === 0) return;
    if (tickIdx >= displayLog.length - 1) {
      const d = tickDataRef.current;
      if (d.roundLog?.finish) {
        setResult({ won: d.roundLog.finish.by === "A", how: d.roundLog.finish.how, r: d.rnd });
        setStage("result");
      } else if (d.roundLog?.knockdown) {
        setStage("knockdown");
      } else if (d.rnd >= d.totalRounds) {
        const winsA = d.state.scores.filter((s) => s.a > s.b).length;
        const winsB = d.state.scores.filter((s) => s.b > s.a).length;
        if (winsA === winsB) {
          setResult({ won: false, how: "Draw", r: d.rnd, draw: true });
        } else {
          setResult({ won: winsA > winsB, how: "Decision", r: d.rnd });
        }
        setStage("result");
      } else {
        setTimeout(() => {
          if ((d.cutA >= 4 || d.cutB >= 4) && !d.docCheck) {
            setDocCheck(true); setStage("corner");
          } else setStage("corner");
        }, 300);
      }
    }
  }, [tickIdx, viewMode]);

  const doctorRetire = () => {
    setResult({ won: false, how: "Doctor Stoppage", r: rnd }); setStage("result");
  };

  const addHistory = (f, week, type, text) => {
    if (!f.careerHistory) f.careerHistory = [];
    f.careerHistory.push({ week, type, text });
  };

  const applyResult = () => {
    const fightCtx = {
      fightResult: { won: result.won, how: result.how, draw: result.draw || false },
      titleWon: result.won && (fighter.booked.titleTier === "Major" || fighter.booked.titleTier === "Premier" || fighter.booked.titleTier === "Interim" || fighter.booked.titleTier === "Minor" || fighter.booked.titleTier === "National" || fighter.booked.titleTier === "Regional"),
      signedSProspect: false,
      koStreak: result.won && (result.how === "KO/TKO" || result.how === "Doctor Stoppage") ? (fighter.koStreak || 0) + 1 : 0,
    };
    done((g2) => {
      const f = g2.roster.find((x) => x.id === fighter.id);
      const b = f.booked; f.booked = null;
      let purse = b.show + (result.won ? b.winBonus : 0);
      const cutRate = (f.contract && f.contract.managerCut) || 0.18;
      if (weighinIssue === "catchweight") {
        purse = Math.round(purse * 0.7);
        if (g2.promoterRel) g2.promoterRel[b.tier] = clamp((g2.promoterRel[b.tier] || 30) - 5, 0, 100);
      }
      if (weighinIssue === "cancelled") {
        f.booked = null; g2.rep = clamp(g2.rep - 3, 2, 100); // floor 2 biar gak death spiral
        if (g2.promoterRel) g2.promoterRel[b.tier] = clamp((g2.promoterRel[b.tier] || 30) - 15, 0, 100);
        g2.log.unshift(`🚫 Fight ${f.name} dibatalkan (miss weight). Rep -4, relasi turun.`);
        return;
      }
      const cutC = Math.round(purse * cutRate);
      g2.cash += cutC;
      f.lastFightWeek = g2.week;
      f.fightsThisYear = (f.fightsThisYear || 0) + 1;
      if (f.contract) { f.contract.fightsLeft = Math.max(0, (f.contract.fightsLeft || 0) - 1); }
      // Record fight history
      if (!f.fightHistory) f.fightHistory = [];
      f.fightHistory.push({
        week: g2.week, opponent: opp.name, result: result.won ? "W" : result.draw ? "D" : "L",
        method: result.how, round: result.r, title: b.title || false, tier: b.tier,
      });
      if (attitude === "Respectful") f.popularity = clamp(f.popularity + 2, 0, 100);
      else if (attitude === "Trash Talk") {
        f.popularity = clamp(f.popularity + 5, 0, 100);
        if (!result.won) f.morale = clamp(f.morale - 8, 0, 100);
      }
      if (attitude === "Professional" && result.won) g2.rep = clamp(g2.rep + 2, 0, 100);
      const div = g2.divisions[f.weightClass];
      if (result.won) {
        f.record.w++; f.streakL = 0;
        if (result.how === "KO/TKO" || result.how === "Doctor Stoppage") f.record.ko++;
        else if (result.how === "Submission") f.record.sub++;
        else f.record.dec++;
        // Career history
        addHistory(f, g2.week, "win", `W vs ${b.opponent.name} via ${result.how} (R${result.r})`);
        f.morale = clamp(f.morale + 12, 0, 100);
        const popMult = (f.traits.includes("Crowd Favorite") ? 2 : 1) * (f.ambition === "Star Power" ? 1.5 : 1);
        f.popularity = clamp(f.popularity + (result.how === "Decision" ? 3 : 7) * popMult * (g2.coaches.some((c) => c.personality === "Player's Coach") ? 1.15 : 1), 0, 100);
        const tierBonus = { Local: 1, Regional: 2, National: 4, Major: 7 }[b.tier] || 1;
        g2.rep = clamp(g2.rep + tierBonus, 0, 100);
        g2.chemistry = clamp(g2.chemistry + 1, 0, 100);
        g2.legacy += { Local: 50, Regional: 120, National: 300, Major: 600 }[b.tier] || 50;
        let pts = b.oppRank != null ? 8 + Math.max(0, 16 - b.oppRank) : 3;
        if (result.how !== "Decision") pts += 3;
        f.rankPoints = (f.rankPoints || 0) + pts;
        if (b.contenderId && div) { const c = div.list.find((x) => x.id === b.contenderId); if (c) c.points = Math.round(c.points * 0.75); }
        if (f.ambition === "Legacy" && b.oppRank != null) f.morale = clamp(f.morale + 5, 0, 100);
        g2.log.unshift(`🏆 ${f.name} MENANG via ${result.how} (R${result.r})! +${pts} ranking pts · camp cut ${fmt$(cutC)}.`);
        if (b.titleTier === "Major") {
          if (!f.titles.includes("Major World Champion")) f.titles.push("Major World Champion");
          if (div) div.champ = { name: f.name, player: true, fighterId: f.id };
          g2.rep = clamp(g2.rep + 20, 0, 100); g2.legacy += 2000; g2.won = true; g2.log.unshift("⭐ Milestone: Legacy mencapai " + Math.round(g2.legacy).toLocaleString() + " pts!");
          g2.log.unshift(`👑 ${f.name} adalah MAJOR WORLD CHAMPION ${f.weightClass}!`);
        } else if (b.titleTier === "Premier") {
          if (!f.titles.includes("Premier World Champion")) f.titles.push("Premier World Champion");
          if (div) div.champ = { name: f.name, player: true, fighterId: f.id };
          g2.rep = clamp(g2.rep + 30, 0, 100); g2.legacy += 5000; g2.won = true;
          g2.log.unshift(`🌟 ${f.name} adalah PREMIER WORLD CHAMPION ${f.weightClass}!`);
        } else if (b.titleTier === "Interim") {
          if (!f.titles.includes("Interim Champion")) f.titles.push("Interim Champion");
          g2.rep = clamp(g2.rep + 10, 0, 100); g2.legacy += 800;
          g2.log.unshift(`⏳ ${f.name} merebut INTERIM TITLE ${f.weightClass}! Akan unified dengan juara utama.`);
        } else if (b.titleTier === "Minor") {
          if (!f.titles.includes("Minor World Champion")) f.titles.push("Minor World Champion");
          if (div) div.champ = { name: f.name, player: true, fighterId: f.id };
          g2.rep = clamp(g2.rep + 14, 0, 100); g2.legacy += 1200;
          g2.log.unshift(`🌍 ${f.name} merebut MINOR WORLD TITLE ${f.weightClass}!`);
        } else if (b.titleTier === "National") {
          f.titles.push("National Champion"); g2.rep = clamp(g2.rep + 10, 0, 100); g2.legacy += 800;
          g2.log.unshift(`🥇 ${f.name} merebut NATIONAL TITLE!`);
        } else if (b.titleTier === "Regional") {
          f.titles.push("Regional Champion"); g2.rep = clamp(g2.rep + 6, 0, 100); g2.legacy += 300;
          g2.log.unshift(`🥇 ${f.name} merebut REGIONAL TITLE!`);
        } else if (b.titleTier === "Super Fight" || b.doubleChamp) {
          f.titles.push("Double Champion"); g2.rep = clamp(g2.rep + 50, 0, 100); g2.legacy += 10000;
          g2.log.unshift(`👑👑 ${f.name} adalah DOUBLE CHAMPION! ${f.weightClass} & ${b.doubleChamp || b.superFight || "adjacent"}!`);
        }
        // Career title record
        if (b.titleTier) addHistory(f, g2.week, "title", `🏆 Won ${b.titleTier} Title`);
      } else {
        addHistory(f, g2.week, "loss", `L vs ${b.opponent.name} via ${result.how} (R${result.r})`);
        f.record.l++; f.streakL = (f.streakL || 0) + 1;
        f.rankPoints = Math.floor((f.rankPoints || 0) * 0.70);
        if (!f.traits.includes("Iron Will")) f.morale = clamp(f.morale - 14, 0, 100);
        g2.chemistry = clamp(g2.chemistry - (result.how === "KO/TKO" || result.how === "Doctor Stoppage" ? 5 : 2), 0, 100);
        g2.rep = clamp(g2.rep - (result.how === "KO/TKO" ? 3 : 1), 2, 100); // kalah turun 1-3 rep, floor 2
        g2.log.unshift(`❌ ${f.name} kalah via ${result.how} (R${result.r}). Ranking pts berkurang 30%. Camp cut ${fmt$(cutC)}.`);
        if (b.defense) {
          if (div) div.champ = { name: b.opponent.name, player: false };
          f.titles = f.titles.filter((t) => t !== "Major World Champion");
          g2.log.unshift(`👑 Title ${f.weightClass} lepas ke ${b.opponent.name}.`);
        }
      }
      if (f.ambition === "Paycheck") f.morale = clamp(f.morale + 5, 0, 100);
      if (f.ambition === "Family Man" && f.fightsThisYear > 3) {
        f.morale = clamp(f.morale - 10, 0, 100);
        g2.log.unshift(`🏠 ${f.name} (Family Man): lebih dari 3 fight tahun ini — morale anjlok.`);
      }
      const injRoll = random();
      if (injRoll < (result.won ? 0.10 : 0.25)) {
        f.injury = { weeks: RI(2, 4), label: "🚑 Minor", tier: 0 };
        f.injuryCount = (f.injuryCount || 0) + 1;
        g2.log.unshift(`🚑 Post-fight: ${f.name} cedera minor, ${f.injury.weeks} minggu.`);
      } else if (injRoll < (result.won ? 0.12 : 0.28)) {
        f.injury = { weeks: RI(4, 8), label: "⚕️ Moderate", tier: 1 };
        f.injuryCount = (f.injuryCount || 0) + 1;
        g2.log.unshift(`⚕️ Post-fight: ${f.name} cedera moderate, ${f.injury.weeks} minggu.`);
      } else if (injRoll < (result.won ? 0.14 : 0.33)) {
        f.injury = { weeks: RI(6, 12), label: "🆘 Serious", tier: 2 };
        f.injuryCount = (f.injuryCount || 0) + 1; f.seriousInjuries = (f.seriousInjuries || 0) + 1;
        addHistory(f, g2.week, "injury", `🆘 Post-fight serious injury — ${f.injury.weeks}w recovery`);
        g2.log.unshift(`🆘 Post-fight: ${f.name} cedera SERIUS, ${f.injury.weeks} minggu.`);
        if (f.seriousInjuries >= 4 && !f.traits.includes("Injury Prone")) {
          f.traits.push("Injury Prone");
          g2.log.unshift(`⚠️ ${f.name} kini memiliki trait "Injury Prone" — 4+ cedera serius.`);
        }
      } else if (injRoll < (result.won ? 0.15 : 0.36)) {
        const attr = pick(ATTRS.filter((k) => k !== "chin"));
        const reduction = RI(3, 6);
        f.injury = { weeks: RI(16, 30), label: "💀 Career-Threatening", tier: 3, permanent: true };
        f.injuryCount = (f.injuryCount || 0) + 1; f.seriousInjuries = (f.seriousInjuries || 0) + 1;
        f.attrs[attr] = clamp(f.attrs[attr] - reduction, 5, 99);
        f.ceilings[attr] = clamp(f.ceilings[attr] - reduction, f.attrs[attr], 99);
        addHistory(f, g2.week, "injury", `💀 Career-threatening — ${ATTR_LABEL[attr]} -${reduction} permanent`);
        g2.log.unshift(`💀 Post-fight: ${f.name} cedera PARAH — ${ATTR_LABEL[attr]} -${reduction} permanen. ${f.injury.weeks} minggu.`);
      }
      if (f.seriousInjuries >= 6 && f.age >= 30 && random() < 0.25) {
        g2.inbox.unshift({
          id: uid(), type: "event", retireFighterId: f.id,
          title: `${f.name} — dokter rekomendasi pensiun`,
          body: `Setelah ${f.seriousInjuries} cedera serius di usia ${f.age}, tim medis sangat menyarankan ${f.name} pensiun demi kesehatan jangka panjang.`,
          choices: [
            { label: "Hormati rekomendasi dokter", retire: f.id },
            { label: "Bujuk terus (morale check)", convince: f.id },
          ],
        });
      }
    }, fightCtx);
  };

  const cornerOpts = [
    { k: "tdd",   label: "Jaga Jarak",    desc: "+takedown defense",  trade: "↟ defense ↡ striking" },
    { k: "body",  label: "Serang Badan",   desc: "+body damage",       trade: "↟ akumulasi ↡ poin instan" },
    { k: "go",    label: "Habisi Dia!",    desc: "+agresi +finish",    trade: "↟ KO chance ↡ stamina terkuras" },
    { k: "save",  label: "Hemat Tenaga",   desc: "+stamina recovery",  trade: "↟ defense ↡ output striking" },
    { k: "plan",  label: "Sesuai Rencana", desc: "seimbang, aman",     trade: "↔ netral — tanpa risiko" },
  ];
  const hpA = state ? clamp(100 - state.dmgA, 0, 100) : 100;
  const hpB = state ? clamp(100 - state.dmgB, 0, 100) : 100;

  const StatVs = ({ label, a, b }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <div style={{ flex: 1 }}><Bar v={a} color={C.red} mirror /></div>
      <div style={{ width: 76, textAlign: "center", fontSize: 9, letterSpacing: 1.5, color: C.dim, textTransform: "uppercase" }}>{label}<div style={{ color: C.chalk, fontSize: 11, fontFamily: DISPLAY }}>{Math.round(a)} · {Math.round(b)}</div></div>
      <div style={{ flex: 1 }}><Bar v={b} color={C.blue} /></div>
    </div>
  );

  // uid imported from rng.js

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, overflowY: "auto", background: `radial-gradient(ellipse 90% 55% at 50% -5%, ${C.spot} 0%, ${C.bg} 60%)` }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", background: "linear-gradient(115deg, transparent 42%, rgba(230,182,76,.05) 47%, transparent 53%), linear-gradient(65deg, transparent 42%, rgba(63,143,212,.05) 47%, transparent 53%)" }} />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: 14, position: "relative" }}>
        {/* MARQUEE */}
        <div style={{ textAlign: "center", margin: "10px 0 14px" }}>
          <div style={{ fontFamily: DISPLAY, fontSize: 11, letterSpacing: 5, color: C.goldDim }}>{fighter.booked.tier.toUpperCase()} EVENT · {fighter.weightClass.toUpperCase()}</div>
          {fighter.booked.titleTier && <div style={{ fontFamily: DISPLAY, color: C.gold, fontSize: 16, letterSpacing: 3, animation: "goldglow 2s infinite" }}>★ {fighter.booked.defense ? "TITLE DEFENSE" : `${fighter.booked.titleTier.toUpperCase()} TITLE FIGHT`} ★</div>}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 4 }}>
            <div style={{ flex: 1, textAlign: "right" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 22, color: C.red, lineHeight: 1, textTransform: "uppercase" }}>{fighter.name}</div>
              <div style={{ color: C.dim, fontSize: 11 }}>{fighter.record.w}-{fighter.record.l} · {fighter.archetype}</div>
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 26, color: C.gold, transform: "skewX(-10deg)", textShadow: "0 0 14px rgba(230,182,76,.5)" }}>VS</div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 22, color: C.blue, lineHeight: 1, textTransform: "uppercase" }}>{opp.name}</div>
              <div style={{ color: C.dim, fontSize: 11 }}>{(opp.record?.w ?? 0)}-{(opp.record?.l ?? 0)} · {opp.archetype}</div>
            </div>
          </div>
        </div>

        {/* HUD */}
        {state && stage !== "weighin" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ flex: 1 }}><Bar v={hpA} color={hpA > 40 ? C.red : "#ff2216"} h={14} skew mirror /></div>
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: totalRounds }).map((_, i) => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: 4, background: i < state.scores.length ? (state.scores[i].a > state.scores[i].b ? C.red : state.scores[i].b > state.scores[i].a ? C.blue : C.dim) : i === state.scores.length && stage !== "result" ? C.gold : C.panel2, boxShadow: i === state.scores.length && stage !== "result" ? `0 0 6px ${C.gold}` : "none" }} />
                ))}
              </div>
              <div style={{ flex: 1 }}><Bar v={hpB} color={C.blue} h={14} skew /></div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
              <div style={{ flex: 1 }}><Bar v={state.staA} color={C.green} h={5} skew mirror /></div>
              <div style={{ width: 56, textAlign: "center", fontSize: 8, letterSpacing: 1.5, color: C.dim }}>HP / STA</div>
              <div style={{ flex: 1 }}><Bar v={state.staB} color={C.green} h={5} skew /></div>
            </div>
            {/* Live Stats */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 9, color: C.dim }}>
              <span>👊 Strikes: <b style={{ color: C.red }}>{totalLandA}</b></span>
              <span>🎯 Takedowns: <b style={{ color: C.gold }}>{totalTdA}</b></span>
              <span style={{ flex: 1, textAlign: "center" }}>|</span>
              <span>🎯 Takedowns: <b style={{ color: C.gold }}>{totalTdB}</b></span>
              <span>👊 Strikes: <b style={{ color: C.blue }}>{totalLandB}</b></span>
            </div>
          </div>
        )}

        {/* STAREDOWN */}
        {stage === "staredown" && (
          <Card accent={C.gold} style={{ textAlign: "center" }}>
            <H>🔥 Staredown · Press Conference</H>
            <div style={{ color: C.chalk, fontSize: 14, marginBottom: 14 }}>
              Kedua fighter saling berhadapan. Pilih sikap yang akan <b style={{ color: C.gold }}>{fighter.name}</b> tunjukkan.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
              {[
                { k: "Respectful", icon: "🤝", desc: "Footwork +5% · Pop +2 · Aman", color: C.green },
                { k: "Professional", icon: "😐", desc: "Netral · Rep +2 jika menang", color: C.blue },
                { k: "Trash Talk", icon: "🗣️", desc: "Striking +8% (lawan +5%) · Pop +5 · Kalah = morale -8", color: C.red },
              ].map((a) => (
                <div key={a.k} onClick={() => setAttitude(a.k)} style={{ border: `2px solid ${attitude === a.k ? a.color : C.line}`, background: attitude === a.k ? `${a.color}11` : "transparent", padding: 12, cursor: "pointer", ...cut(8) }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{a.icon}</div>
                  <div style={{ fontFamily: DISPLAY, color: a.color, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>{a.k}</div>
                  <div style={{ color: C.dim, fontSize: 9, marginTop: 4, lineHeight: 1.3 }}>{a.desc}</div>
                </div>
              ))}
            </div>
            {attitude && <Btn wide color={C.gold} onClick={() => setStage("weighin")}>Lanjut ke Weigh-in</Btn>}
          </Card>
        )}

        {/* WEIGH-IN */}
        {stage === "weighin" && (
          <>
            <Card accent={C.gold}>
              <H>Tale of the Tape</H>
              <StatVs label="Striking" a={fighter.attrs.striking} b={opp.attrs.striking} />
              <StatVs label="Wrestling" a={fighter.attrs.wrestling} b={opp.attrs.wrestling} />
              <StatVs label="BJJ" a={fighter.attrs.bjj} b={opp.attrs.bjj} />
              <StatVs label="Footwork" a={fighter.attrs.footwork} b={opp.attrs.footwork} />
              <StatVs label="Strength" a={fighter.attrs.strength} b={opp.attrs.strength} />
              <StatVs label="Cardio" a={fighter.attrs.cardio} b={opp.attrs.cardio} />
              <StatVs label="Chin" a={fighter.attrs.chin} b={opp.attrs.chin} />
              <StatVs label="Fight IQ" a={fighter.attrs.fightIQ} b={opp.attrs.fightIQ} />
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: cutInfo.pen ? C.red : C.green }}>
                ⚖️ Weigh-in: {fighter.natWeight} → {limit} lbs · <b>{cutInfo.label}</b>
                {missedWeight && !weighinIssue && (
                  <div style={{ marginTop: 8, padding: 10, background: "rgba(225,75,68,.12)", border: "1px solid #e14b4466", ...cut(6) }}>
                    <div style={{ color: C.red, fontSize: 13, fontFamily: DISPLAY, letterSpacing: 1 }}>⚠️ MISS WEIGHT — {fighter.natWeight} lbs!</div>
                    <div style={{ color: C.dim, fontSize: 11, margin: "6px 0" }}>{fighter.name} gagal mencapai {limit} lbs. Pilih tindakan:</div>
                    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                      <Btn small color={C.red} onClick={() => setWeighinIssue("catchweight")}>Catchweight (purse -30%)</Btn>
                      <Btn small color={C.dim} onClick={() => setWeighinIssue("cancelled")}>Batalkan Fight</Btn>
                    </div>
                  </div>
                )}
                {weighinIssue === "catchweight" && <div style={{ color: C.red, marginTop: 4 }}>Catchweight disetujui — purse dipotong 30%.</div>}
                {weighinIssue === "cancelled" && <div style={{ color: C.red, marginTop: 4 }}>Fight dibatalkan — rep & relasi turun.</div>}
              </div>
            </Card>
            <Card>
              <H>Game Plan</H>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {Object.entries(GAME_PLANS).map(([k, d]) => (
                  <div key={k} onClick={() => setPlan(k)} style={{ border: `1px solid ${plan === k ? C.gold : C.line}`, background: plan === k ? "rgba(230,182,76,.08)" : "transparent", padding: 10, cursor: "pointer", ...cut(8) }}>
                    <div style={{ fontFamily: DISPLAY, color: plan === k ? C.gold : C.chalk, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>{k}</div>
                    <div style={{ color: C.dim, fontSize: 10, marginTop: 3 }}>{d}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                <span style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: 1 }}>View:</span>
                {[{ k: "tick", label: "Tick-by-Tick" }, { k: "summary", label: "Round Summary" }, { k: "skip", label: "Skip to Result" }].map((m) => (
                  <button key={m.k} onClick={() => setViewMode(m.k)} style={{ background: viewMode === m.k ? C.gold : C.panel2, color: viewMode === m.k ? "#0a0d14" : C.dim, border: `1px solid ${C.line}`, padding: "3px 8px", fontSize: 10, cursor: "pointer", fontFamily: DISPLAY, letterSpacing: 1, ...cut(4) }}>{m.label}</button>
                ))}
              </div>
              <div style={{ marginTop: 12 }}><Btn wide color={C.red} onClick={startFight}>🔔 Bunyikan Bel</Btn></div>
            </Card>
          </>
        )}

        {/* FIGHTER ENTRANCE */}
        {stage === "entrance" && (
          <Card accent={C.gold} style={{ textAlign: "center", padding: 30 }}>
            <div style={{ fontSize: 48, marginBottom: 4, animation: "koflash .8s ease both" }}>🚶</div>
            <H color={C.gold}>Fighter Entrance</H>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 14 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: DISPLAY, color: C.red, fontSize: 20, textTransform: "uppercase" }}>{fighter.name}</div>
                <div style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>{fighter.record.w}-{fighter.record.l} · {fighter.archetype}</div>
                <div style={{ color: C.dim, fontSize: 10, marginTop: 1 }}>{fighter.weightClass}</div>
              </div>
              <div style={{ fontFamily: DISPLAY, fontSize: 26, color: C.gold, alignSelf: "center" }}>VS</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: DISPLAY, color: C.blue, fontSize: 20, textTransform: "uppercase" }}>{opp.name}</div>
                <div style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>{(opp.record?.w ?? 0)}-{(opp.record?.l ?? 0)} · {opp.archetype}</div>
                <div style={{ color: C.dim, fontSize: 10, marginTop: 1 }}>{opp.weightClass || ""}</div>
              </div>
            </div>
            <div style={{ color: C.dim, fontSize: 11, marginTop: 16, animation: "goldglow 1.5s infinite" }}>
              {fighter.booked.tier.toUpperCase()} EVENT · {fighter.booked.title ? "TITLE FIGHT" : "FIGHT NIGHT"}
            </div>
          </Card>
        )}

        {/* ROUND LOG */}
        {(stage === "round" || stage === "corner" || stage === "skipSummary") && roundLog && (() => {
          const displayLog = viewMode === "tick" ? (roundLog.tickLog || roundLog.log) : (roundLog.log || []);
          return (
          <Card accent={C.line}>
            <H color={C.chalk}>Round {rnd} · Commentary</H>
            {displayLog.map((l, i) => {
              const showLine = viewMode !== "tick" ? true : i <= tickIdx;
              if (!showLine) return null;
              return (
              <div key={i} className="rise" style={{ animationDelay: `${i * 0.12}s`, color: l.includes("KO") || l.includes("SUB") ? C.gold : C.chalk, fontSize: 13, marginBottom: 6, paddingLeft: 10, borderLeft: `2px solid ${l.includes("KO") || l.includes("SUB") ? C.gold : C.line}` }}>{l}</div>
              );
            })}
            {viewMode === "tick" && stage === "round" && tickIdx < displayLog.length && (
              <div className="rise" style={{ color: C.dim, fontSize: 10, marginTop: 4 }}>▌ Play-by-play · tick {tickIdx + 1}/{displayLog.length}</div>
            )}
          </Card>)})()}
        {stage === "skipSummary" && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Btn onClick={() => setStage("result")}>Lihat Hasil</Btn>
          </div>
        )}

        {/* CORNER DECISION */}
        {stage === "corner" && !docCheck && (
          <Card accent={C.gold} style={{ boxShadow: "0 0 30px rgba(230,182,76,.12)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontFamily: DISPLAY, color: C.gold, fontSize: 15, letterSpacing: 2 }}>🪑 CORNER — 60 DETIK</div>
              <div style={{ fontFamily: DISPLAY, fontSize: 22, color: timer <= 5 ? C.red : C.chalk, minWidth: 40, textAlign: "right", animation: timer <= 5 ? "goldglow 1s infinite" : "none" }}>0:{String(Math.max(timer, 0)).padStart(2, "0")}</div>
            </div>
            <div style={{ background: "#0a0e17", padding: 10, marginBottom: 10, ...cut(8) }}>
              <div style={{ display: "flex", gap: 12, fontSize: 10, marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.dim, textTransform: "uppercase", fontSize: 8, marginBottom: 2 }}>{fighter.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Bar v={state?.staA || 100} color={state?.staA > 50 ? C.green : state?.staA > 25 ? C.gold : C.red} h={6} />
                    <span style={{ color: C.chalk, fontSize: 11, fontFamily: DISPLAY, width: 30 }}>{Math.round(state?.staA || 100)}%</span>
                  </div>
                  <div style={{ color: C.dim, fontSize: 8, marginTop: 1 }}>HP: {Math.round(100 - (state?.dmgA || 0))}% {state?.bodyDmgA > 20 ? "· Body hurt" : ""} {state?.legDmgA > 15 ? "· Legs hurt" : ""}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: C.dim, textTransform: "uppercase", fontSize: 8, marginBottom: 2 }}>{opp.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Bar v={state?.staB || 100} color={state?.staB > 50 ? C.green : state?.staB > 25 ? C.gold : C.red} h={6} />
                    <span style={{ color: C.chalk, fontSize: 11, fontFamily: DISPLAY, width: 30 }}>{Math.round(state?.staB || 100)}%</span>
                  </div>
                  <div style={{ color: C.dim, fontSize: 8, marginTop: 1 }}>HP: {Math.round(100 - (state?.dmgB || 0))}% {state?.bodyDmgB > 20 ? "· Body hurt" : ""} {state?.legDmgB > 15 ? "· Legs hurt" : ""}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 3, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 8, color: C.dim, textTransform: "uppercase", marginRight: 4 }}>Score:</span>
                {state?.scores?.map((s, i) => (<span key={i} style={{ fontSize: 9, color: s.a > s.b ? C.red : s.b > s.a ? C.blue : C.dim, fontFamily: DISPLAY }}>{s.a > s.b ? "A" : s.b > s.a ? "B" : "D"}</span>))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <span style={{ fontSize: 8, color: C.dim, textTransform: "uppercase" }}>Momentum:</span>
                <div style={{ flex: 1, height: 4, background: "#141a28", position: "relative" }}>
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: `${Math.abs(state?.mom || 0) * 0.5}%`, background: (state?.mom || 0) > 0 ? C.red : C.blue, transform: (state?.mom || 0) > 0 ? undefined : "translateX(-104%)" }} />
                  <div style={{ position: "absolute", top: "50%", left: "50%", width: 2, height: 4, background: C.dim, transform: "translate(-50%, -50%)" }} />
                </div>
                <span style={{ fontSize: 8, color: (state?.mom || 0) >= 0 ? C.red : C.blue, fontFamily: DISPLAY, width: 16, textAlign: "center" }}>{(state?.mom || 0) >= 0 ? `${Math.round(state?.mom || 0)}%` : `${Math.round(Math.abs(state?.mom || 0))}%`}</span>
              </div>
              <div style={{ fontSize: 10, color: C.gold, fontStyle: "italic" }}>
                💡 {(() => { const staA = state?.staA || 100, staB = state?.staB || 100; const lead = state?.scores?.filter(s => s.a >= s.b).length || 0; const behind = (state?.scores?.length || 0) - lead; const mom = state?.mom || 0; if (staB < 35 && mom > 20) return 'Dia kehabisan bensin dan momentum kita — habiskan sekarang!'; if (staB < 35) return 'Dia kehabisan bensin — bisa kamu habisi ronde ini!'; if (staA < 35) return 'Jaga stamina, bertahan dulu. Ambil nafas.'; if (mom < -40) return 'Dia di atas angin — bikin grappling, potong momentumnya!'; if (behind > 0 && mom > 30) return 'Kita momentum bagus meski skor kurang — teruskan tekanan!'; if (behind > 0) return 'Kita butuh ronde ini. Ambil risiko — go!'; if (lead >= 2) return 'Kita unggul jauh. Tenang, jaga jarak.'; if (staA > staB + 20) return 'Kamu lebih segar — tingkatkan output sekarang.'; return 'Seimbang. Jalanin strategi aja, jangan serakah.'; })()}
              </div>
            </div>
            {cornerOpts.map((o) => (
              <div key={o.k} onClick={() => setCorner(o.k)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: `1px solid ${corner === o.k ? C.gold : C.line}`, background: corner === o.k ? "rgba(230,182,76,.08)" : "transparent", padding: "8px 10px", marginBottom: 6, cursor: "pointer", ...cut(7) }}>
                <div>
                  <span style={{ fontFamily: DISPLAY, color: corner === o.k ? C.gold : C.chalk, fontSize: 13, letterSpacing: 1, textTransform: "uppercase" }}>{o.label}</span>
                  <div style={{ fontSize: 8, color: corner === o.k ? C.gold : C.dim }}>{o.trade}</div>
                </div>
                <span style={{ color: C.dim, fontSize: 10 }}>{o.desc}</span>
              </div>
            ))}
            <Btn wide color={C.red} onClick={nextRound}>🔔 Round {rnd + 1}</Btn>
          </Card>
        )}

        {/* KNOCKDOWN */}
        {stage === "knockdown" && roundLog?.knockdown && (
          <Card accent={C.red} style={{ textAlign: "center", boxShadow: "0 0 40px rgba(225,75,68,.25)" }}>
            <div style={{ fontSize: 56, marginBottom: 4, animation: "koflash .8s ease both" }}>💥</div>
            <H color={C.red}>DOWN! {roundLog.knockdown.name} TERJATUH!</H>
            <div style={{ color: C.chalk, fontSize: 14, marginBottom: 12 }}>
              Wasit langsung menghentikan pertarungan!
            </div>
            <Btn color={C.red} onClick={() => {
              const won = roundLog.knockdown.fighter !== "A";
              setResult({ won, how: "KO/TKO", r: rnd });
              setStage("result");
            }}>Lihat Hasil</Btn>
          </Card>
        )}

        {/* DOCTOR STOPPAGE */}
        {stage === "corner" && docCheck && (
          <Card accent={C.red} style={{ textAlign: "center", boxShadow: "0 0 30px rgba(225,75,68,.18)" }}>
            <H color={C.red}>🚑 Doctor Check — Cuts & Injury</H>
            <div style={{ color: C.chalk, fontSize: 13, marginBottom: 8 }}>Dokter memasuki ring untuk memeriksa kondisi fighter.</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 20, marginBottom: 14, fontSize: 11 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: DISPLAY, color: C.red, fontSize: 14 }}>{fighter.name}</div>
                <div style={{ color: cutA >= 6 ? C.red : cutA >= 4 ? C.gold : C.dim }}>🩸 Cut level: {cutA}/10</div>
              </div>
              <div style={{ color: C.dim, alignSelf: "center" }}>VS</div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: DISPLAY, color: C.blue, fontSize: 14 }}>{opp.name}</div>
                <div style={{ color: cutB >= 6 ? C.red : cutB >= 4 ? C.gold : C.dim }}>🩸 Cut level: {cutB}/10</div>
              </div>
            </div>
            <div style={{ color: C.dim, fontSize: 10, marginBottom: 12 }}>Cut tinggi = risiko cedera permanen. Dokter bisa menghentikan fight.</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Btn small color={C.green} onClick={() => { setDocCheck(false); nextRound(); }}>Lanjutkan Fight</Btn>
              <Btn small color={C.red} onClick={doctorRetire}>Hentikan (TKO Loss)</Btn>
            </div>
          </Card>
        )}

        {/* RESULT */}
        {stage === "result" && result && (
          <div style={{ position: "relative" }}>
            {(result.how === "KO/TKO" || result.how === "Doctor Stoppage") && <div style={{ position: "fixed", inset: 0, background: "#fff", pointerEvents: "none", animation: "koflash .9s ease both" }} />}
            <Card accent={result.won ? C.gold : C.red} style={{ textAlign: "center", paddingTop: 26, paddingBottom: 22 }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 46, letterSpacing: 4, color: result.draw ? C.dim : result.won ? C.gold : C.red, display: "inline-block", padding: "2px 18px", border: `3px solid ${result.draw ? C.dim : result.won ? C.gold : C.red}`, animation: "belldrop .6s cubic-bezier(.2,1.4,.4,1) both", textTransform: "uppercase", ...cut(10) }}>
                {result.draw ? "Draw" : result.won ? "Victory" : "Defeat"}
              </div>
              <div style={{ color: C.chalk, fontSize: 14, margin: "14px 0 4px" }}>
                {result.draw ? <b style={{ color: C.dim }}>{result.how}</b> : <b style={{ color: result.won ? C.red : C.blue }}>{result.won ? fighter.name : opp.name}</b>}{result.draw ? " — " : " menang via "}{result.how} · Round {result.r}
              </div>
              {result.won && fighter.booked.title && <div style={{ fontFamily: DISPLAY, color: C.gold, fontSize: 18, letterSpacing: 2, animation: "goldglow 2s infinite" }}>👑 AND {fighter.booked.defense ? "STILL" : "NEW"} {fighter.booked.titleTier ? fighter.booked.titleTier.toUpperCase() : ""} CHAMPION</div>}
              <div style={{ color: C.dim, fontSize: 12, margin: "8px 0 14px" }}>
                Purse {fmt$(fighter.booked.show + (result.won ? fighter.booked.winBonus : 0))} → camp cut {Math.round(((fighter.contract && fighter.contract.managerCut) || 0.18) * 100)}% = <b style={{ color: C.green }}>{fmt$((fighter.booked.show + (result.won ? fighter.booked.winBonus : 0)) * ((fighter.contract && fighter.contract.managerCut) || 0.18))}</b>
              </div>
              <Btn onClick={applyResult}>Kembali ke Camp</Btn>
              <button onClick={() => {
                const text = [
                  `═══ FIGHT REPORT ═══`,
                  `${fighter.name} vs ${opp.name}`,
                  `${fighter.weightClass} · ${fighter.booked.tier} Event`,
                  `Result: ${result.draw ? 'Draw' : result.won ? fighter.name + ' wins' : opp.name + ' wins'} via ${result.how} (R${result.r})`,
                  ``,
                  `--- Round-by-Round ---`,
                  ...(roundLog?.log || ['No log available']),
                ].join('\n');
                navigator.clipboard.writeText(text).then(() => {
                  alert('📋 Fight report copied to clipboard!');
                }).catch(() => {
                  // Fallback
                  const ta = document.createElement('textarea');
                  ta.value = text; document.body.appendChild(ta);
                  ta.select(); document.execCommand('copy'); ta.remove();
                });
              }} style={{ marginLeft: 8, background: C.panel2, color: C.dim, border: `1px solid ${C.line}`, padding: '8px 14px', fontSize: 10, cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 1, borderRadius: 6 }}>📋 Copy Fight Report</button>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
