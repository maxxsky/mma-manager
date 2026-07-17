import React, { useState } from "react";
import { R, RI, fmt$, clamp, random } from "@ironfist/engine/rng.js";
import { AGENT_TYPES } from "@ironfist/engine/data.js";
import { T, Panel, Eyebrow as H, Btn, Tag, Bar } from "./theme.jsx";
import { t } from "../i18n/index.js";

const NegoRow = ({ label, children, hint }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
      <span style={{ fontFamily: T.body, fontSize: 11, fontWeight: 600, letterSpacing: 1, color: T.txt3, textTransform: "uppercase" }}>{label}</span>
      {hint && <span style={{ fontFamily: T.body, fontSize: 10, color: T.txt3 }}>{hint}</span>}
    </div>
    {children}
  </div>
);

const NegoOpt = ({ v, set, val, children }) => (
  <button onClick={() => set(val)} style={{ background: v === val ? T.gold : T.raised, color: v === val ? T.bg : T.txt2, border: `1px solid ${T.line}`, padding: "6px 10px", fontSize: 12, cursor: "pointer", fontFamily: T.disp, fontWeight: 600, letterSpacing: 1, borderRadius: T.r }}>{children}</button>
);

export default function NegotiateModal({ fighter, mode, cash, onClose, onCommit }) {
  const ag = AGENT_TYPES[fighter?.agent || "none"];
  const baseAsking = fighter?.asking || 3000;

  // Step: "form" | "result-success" | "counter"
  const [step, setStep] = useState("form");
  const [resultMsg, setResultMsg] = useState("");
  const [counterDeal, setCounterDeal] = useState(null);

  const [signBonus, setSignBonus] = useState(mode === "extend" ? 0 : baseAsking);
  const [cutPct, setCutPct] = useState(mode === "extend" && fighter?.contract ? Math.round(fighter.contract.managerCut * 100) : Math.round(ag.cutFloor * 100));
  const [fights, setFights] = useState(4);
  const [duration, setDuration] = useState(24);
  const [exclusive, setExclusive] = useState(true);
  const [rematch, setRematch] = useState(false);
  const [medical, setMedical] = useState("camp");
  const [equity, setEquity] = useState(0);

  const cutPenalty = Math.max(0, cutPct / 100 - ag.cutFloor) * 100 * (2 + ag.hardness * 3);
  const bonusBoost = mode === "sign" ? (signBonus / baseAsking - 1) * 22 : signBonus / 1000 * 1.2;
  const fightsBoost = (fights >= 6 ? 6 : fights >= 4 ? 2 : -4) * (1 - ag.hardness * 0.3);
  const hardnessDrag = ag.hardness * 10;
  const exclusiveMod = exclusive ? 0 : -8;
  const rematchMod = rematch ? -4 : 0;
  const medicalMod = medical === "camp" ? 0 : medical === "split" ? -3 : -6;
  const equityMod = equity * 1.5;
  const accept = clamp(Math.round(70 + bonusBoost + fightsBoost - cutPenalty - hardnessDrag + exclusiveMod + rematchMod + medicalMod + equityMod), 3, 97);
  const tooPoor = signBonus > cash;

  const buildDeal = (overrides = {}) => ({
    signBonus, cut: cutPct / 100, fights, duration, accept, exclusive, rematch, medical, equity,
    ...overrides,
  });

  const doCommit = (deal) => {
    onCommit(deal);
    setResultMsg(t("NEGO.signedMsg").replace("{0}", fighter.name).replace("{1}", Math.round(deal.cut * 100)).replace("{2}", deal.fights).replace("{3}", fmt$(deal.signBonus)));
    setStep("result-success");
  };

  const handleSubmit = () => {
    if (tooPoor) return;
    const success = random() * 100 < accept;
    if (success) {
      doCommit(buildDeal());
    } else {
      // Counter only if offer is below agent's floor
      const belowFloor = (cutPct / 100) < ag.cutFloor || signBonus < baseAsking * 0.85;
      if (!belowFloor) {
        // Offer is at or above floor — second chance roll
        if (random() < 0.5) { doCommit(buildDeal()); return; }
      }
      // Generate counter — never below what player offered, slightly better for agent
      const cCut = Math.max(Math.round(ag.cutFloor * 100), cutPct + RI(1, 3));
      const cBonus = Math.max(baseAsking, signBonus + RI(0, Math.round(baseAsking * 0.2)));
      const cFights = ag.hardness > 0.5 ? 3 : RI(2, 4);
      const cDuration = RI(12, 18);
      const cAccept = clamp(85 + RI(0, 10), 80, 97);
      setCounterDeal({
        signBonus: cBonus, cut: cCut / 100, fights: cFights, duration: cDuration,
        accept: cAccept, exclusive: true, rematch: false, medical: "camp", equity: 0,
        _isCounter: true,
      });
      setStep("counter");
    }
  };

  const handleCounterAccept = () => {
    if (counterDeal) doCommit(counterDeal);
  };

  const wrap = { position: "fixed", inset: 0, zIndex: 70, background: "rgba(6,9,14,.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 };

  // ===== HASIL: SUCCESS =====
  if (step === "result-success") {
    return (
      <div style={wrap} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: "100%", background: `linear-gradient(160deg, ${T.raised}, ${T.surface})`, border: `2px solid ${T.pos}`, padding: 20, textAlign: "center", ...{ borderRadius: T.r } }}>
          <div style={{ fontSize: 48, marginBottom: 6 }}>✅</div>
          <H color={T.pos}>{t("NEGO.signed")}</H>
          <div style={{ color: T.txt, fontSize: 14, margin: "10px 0" }}>{resultMsg}</div>
          <Btn color={T.pos} onClick={onClose}>{t("NEGO.close")}</Btn>
        </div>
      </div>
    );
  }

  // ===== COUNTER OFFER =====
  if (step === "counter" && counterDeal) {
    return (
      <div style={wrap} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: "100%", background: `linear-gradient(160deg, ${T.raised}, ${T.surface})`, border: `2px solid ${T.gold}`, padding: 16, ...{ borderRadius: T.r } }}>
          <H color={T.gold}>{t("NEGO.counterHeader").replace("{0}", ag.label)}</H>
          <div style={{ color: T.txt, fontSize: 13, marginBottom: 10 }}>
            {t("NEGO.counterIntro").replace("{0}", fighter?.name)}
          </div>
          <div style={{ background: "#0a0e17", padding: 12, marginBottom: 12, ...{ borderRadius: T.r } }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: 12, color: T.txt3 }}>
              <span>{t("NEGO.counter.cutLabel")}</span><span style={{ color: T.gold, fontFamily: T.disp }}>{Math.round(counterDeal.cut * 100)}%</span>
              <span>{t("NEGO.counter.bonusLabel")}</span><span style={{ color: T.gold, fontFamily: T.disp }}>{fmt$(counterDeal.signBonus)}</span>
              <span>{t("NEGO.counter.fightsLabel")}</span><span style={{ color: T.gold, fontFamily: T.disp }}>{t("NEGO.counter.fightsVal").replace("{0}", counterDeal.fights)}</span>
              <span>{t("NEGO.counter.durationLabel")}</span><span style={{ color: T.gold, fontFamily: T.disp }}>{t("NEGO.counter.durationVal").replace("{0}", counterDeal.duration)}</span>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: T.txt3 }}>{t("NEGO.counter.estLabel")} <b style={{ color: T.pos, fontFamily: T.disp }}>{counterDeal.accept}%</b></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small onClick={handleCounterAccept}>{t("NEGO.counterAccept")}</Btn>
            <Btn small color={T.neg} onClick={onClose}>{t("NEGO.counterReject")}</Btn>
          </div>
        </div>
      </div>
    );
  }

  // ===== FORM NEGOSIASI =====
  return (
    <div style={wrap} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: "100%", background: `linear-gradient(160deg, ${T.raised}, ${T.surface})`, border: `1px solid ${T.gold}`, padding: 16, maxHeight: "90vh", overflowY: "auto", ...{ borderRadius: T.r } }}>
        <H>{mode === "extend" ? t("NEGO.form.headerExtend") : t("NEGO.form.headerSign")}</H>
        <div style={{ fontFamily: T.disp, color: T.txt, fontSize: 18, letterSpacing: 1, textTransform: "uppercase" }}>{fighter?.name}</div>
        <div style={{ color: T.txt3, fontSize: 11, marginBottom: 12 }}>
          {ag.label}{fighter?.agent !== "none" && t("NEGO.form.agentInfoCut").replace("{0}", Math.round(ag.cutFloor * 100))}
          {fighter?.agent === "Power" && t("NEGO.form.agentInfoAgg")}
        </div>
        <NegoRow label={t("NEGO.form.managerCut")} hint={t("NEGO.form.floorHint").replace("{0}", Math.round(ag.cutFloor * 100))}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[15, 16, 18, 20, 22, 25].map((v) => <NegoOpt key={v} v={cutPct} set={setCutPct} val={v}>{v}%</NegoOpt>)}
          </div>
        </NegoRow>
        <NegoRow label={mode === "extend" ? t("NEGO.form.bonusExtend") : t("NEGO.form.bonusSign")} hint={t("NEGO.form.askingHint").replace("{0}", fmt$(baseAsking))}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(mode === "extend" ? [0, 2000, 5000, 10000, 20000] : [Math.round(baseAsking * 0.6), baseAsking, Math.round(baseAsking * 1.4), Math.round(baseAsking * 2)]).map((v) => (
              <NegoOpt key={v} v={signBonus} set={setSignBonus} val={v}>{fmt$(v)}</NegoOpt>
            ))}
          </div>
        </NegoRow>
        <NegoRow label={t("NEGO.form.fightCommitment")}>
          <div style={{ display: "flex", gap: 6 }}>{[2, 4, 6, 8].map((v) => <NegoOpt key={v} v={fights} set={setFights} val={v}>{t("NEGO.form.fightsVal").replace("{0}", v)}</NegoOpt>)}</div>
        </NegoRow>
        <NegoRow label={t("NEGO.form.duration")}>
          <div style={{ display: "flex", gap: 6 }}>{[12, 18, 24, 36].map((v) => <NegoOpt key={v} v={duration} set={setDuration} val={v}>{t("NEGO.form.durationVal").replace("{0}", v)}</NegoOpt>)}</div>
        </NegoRow>
        <div style={{ borderTop: `1px solid ${T.line}44`, paddingTop: 10, marginTop: 10 }}>
          <div style={{ fontSize: 10, color: T.txt3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{t("NEGO.form.clauses")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div style={{ background: T.surface, padding: "6px 8px", ...{ borderRadius: T.r } }}>
              <div style={{ fontSize: 9, color: T.txt3 }}>{t("NEGO.form.exclusivity")}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <button onClick={() => setExclusive(true)} style={{ flex: 1, background: exclusive ? T.gold : T.raised, color: exclusive ? "#0a0d14" : T.txt, border: "none", padding: "3px 6px", fontSize: 10, cursor: "pointer", ...{ borderRadius: T.r } }}>{t("NEGO.form.yes")}</button>
                <button onClick={() => setExclusive(false)} style={{ flex: 1, background: !exclusive ? T.gold : T.raised, color: !exclusive ? "#0a0d14" : T.txt, border: "none", padding: "3px 6px", fontSize: 10, cursor: "pointer", ...{ borderRadius: T.r } }}>{t("NEGO.form.multi")}</button>
              </div>
            </div>
            <div style={{ background: T.surface, padding: "6px 8px", ...{ borderRadius: T.r } }}>
              <div style={{ fontSize: 9, color: T.txt3 }}>{t("NEGO.form.rematch")}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                <button onClick={() => setRematch(false)} style={{ flex: 1, background: !rematch ? T.gold : T.raised, color: !rematch ? "#0a0d14" : T.txt, border: "none", padding: "3px 6px", fontSize: 10, cursor: "pointer", ...{ borderRadius: T.r } }}>{t("NEGO.form.no")}</button>
                <button onClick={() => setRematch(true)} style={{ flex: 1, background: rematch ? T.gold : T.raised, color: rematch ? "#0a0d14" : T.txt, border: "none", padding: "3px 6px", fontSize: 10, cursor: "pointer", ...{ borderRadius: T.r } }}>{t("NEGO.form.include")}</button>
              </div>
            </div>
            <div style={{ background: T.surface, padding: "6px 8px", ...{ borderRadius: T.r } }}>
              <div style={{ fontSize: 9, color: T.txt3 }}>{t("NEGO.form.medical")}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                {[{ k: "camp", l: "NEGO.form.camp" }, { k: "split", l: "NEGO.form.split" }, { k: "fighter", l: "NEGO.form.fighter" }].map((m) => (
                  <button key={m.k} onClick={() => setMedical(m.k)} style={{ flex: 1, background: medical === m.k ? T.gold : T.raised, color: medical === m.k ? "#0a0d14" : T.txt, border: "none", padding: "3px 4px", fontSize: 9, cursor: "pointer", ...{ borderRadius: T.r } }}>{t(m.l)}</button>
                ))}
              </div>
            </div>
            <div style={{ background: T.surface, padding: "6px 8px", ...{ borderRadius: T.r } }}>
              <div style={{ fontSize: 9, color: T.txt3 }}>{t("NEGO.form.campEquity")}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                {[0, 5, 10, 15, 20].map((v) => (
                  <button key={v} onClick={() => setEquity(v)} style={{ flex: 1, background: equity === v ? T.gold : T.raised, color: equity === v ? "#0a0d14" : T.txt, border: "none", padding: "3px 4px", fontSize: 9, cursor: "pointer", ...{ borderRadius: T.r } }}>{v}%</button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div style={{ background: "#0a0e17", padding: 10, margin: "6px 0 12px", ...{ borderRadius: T.r } }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: T.txt3 }}>{t("NEGO.form.estAccept")}</span>
            <span style={{ fontFamily: T.disp, fontSize: 20, color: accept >= 60 ? T.pos : accept >= 35 ? T.gold : T.neg }}>{accept}%</span>
          </div>
          <Bar v={accept} color={accept >= 60 ? T.pos : accept >= 35 ? T.gold : T.neg} h={6} />
          {accept < 35 && <div style={{ fontSize: 10, color: T.txt3, marginTop: 4 }}>{t("NEGO.form.lowAccept")}</div>}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn small disabled={tooPoor} onClick={handleSubmit}>
            {tooPoor ? t("NEGO.form.noCash") : mode === "extend" ? t("NEGO.form.submitExtend") : t("NEGO.form.submitSign")}
          </Btn>
          <Btn small color={T.txt3} onClick={onClose}>{t("NEGO.form.cancel")}</Btn>
        </div>
      </div>
    </div>
  );
}
