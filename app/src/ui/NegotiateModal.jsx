import { localizeTree } from "../i18n/presentation.jsx";
import React, { useState } from "react";
import { fmt$ } from "@ironfist/engine/rng.js";
import {
  agentOf, baseAskingOf, defaultOffer, bonusOptions, acceptChance,
  NEGO_CUT_OPTIONS, NEGO_FIGHT_OPTIONS, NEGO_DURATION_OPTIONS, NEGO_EQUITY_OPTIONS,
} from "@ironfist/engine/contracts/negotiation.js";
import { T, Panel, Eyebrow as H, Btn, Tag, Bar } from "./theme.jsx";
import { t } from "../i18n/index.js";

const NegoRow = ({ label, children, hint }) => (
  localizeTree(<div style={{ marginBottom: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
      <span style={{ fontFamily: T.body, fontSize: 11, fontWeight: 600, letterSpacing: 1, color: T.txt3, textTransform: "uppercase" }}>{label}</span>
      {hint && <span style={{ fontFamily: T.body, fontSize: 10, color: T.txt3 }}>{hint}</span>}
    </div>
    {children}
  </div>)
);

const NegoOpt = ({ v, set, val, children }) => (
  localizeTree(<button onClick={() => set(val)} style={{ background: v === val ? T.gold : T.raised, color: v === val ? T.bg : T.txt2, border: `1px solid ${T.line}`, padding: "6px 10px", fontSize: 12, cursor: "pointer", fontFamily: T.disp, fontWeight: 600, letterSpacing: 1, borderRadius: T.r }}>{children}</button>)
);

export default function NegotiateModal({ fighter, mode, cash, rosterCap, rosterSize, negotiation, onNegotiate, onAcceptCounter, onClose }) {
  const ag = agentOf(fighter);
  const baseAsking = baseAskingOf(fighter);
  const start = defaultOffer(fighter, mode);

  const [signBonus, setSignBonus] = useState(start.signBonus);
  const [cutPct, setCutPct] = useState(Math.round(start.cut * 100));
  const [fights, setFights] = useState(start.fights);
  const [duration, setDuration] = useState(start.duration);
  const [equity, setEquity] = useState(start.equity);
  // Only show engine results produced by this modal session, never a stale one from a save.
  const [submitted, setSubmitted] = useState(false);

  const offer = { signBonus, cut: cutPct / 100, fights, duration, equity };
  const accept = acceptChance(fighter, mode, offer);
  const tooPoor = signBonus > cash;
  const rosterFull = mode === "sign" && rosterSize >= rosterCap;

  const sameSubject = negotiation && negotiation.mode === mode &&
    (mode === "sign" ? negotiation.prospectId != null : negotiation.fighterId === fighter?.id);
  const result = submitted && sameSubject ? negotiation : null;
  const counterDeal = result?.status === "counter" ? result.counter : null;

  const handleSubmit = () => {
    if (tooPoor || rosterFull) return;
    setSubmitted(true);
    onNegotiate(offer);
  };

  const wrap = { position: "fixed", inset: 0, zIndex: 70, background: "rgba(6,9,14,.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 };

  // ===== HASIL: SUCCESS =====
  if (result?.status === "signed") {
    const d = result.deal;
    const resultMsg = t("NEGO.signedMsg").replace("{0}", fighter.name).replace("{1}", Math.round(d.cut * 100)).replace("{2}", d.fights).replace("{3}", fmt$(d.signBonus));
    return (
      localizeTree(<div style={wrap} onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: "100%", background: `linear-gradient(160deg, ${T.raised}, ${T.surface})`, border: `2px solid ${T.pos}`, padding: 20, textAlign: "center", ...{ borderRadius: T.r } }}>
          <div style={{ fontSize: 48, marginBottom: 6 }}>✅</div>
          <H color={T.pos}>{t("NEGO.signed")}</H>
          <div style={{ color: T.txt, fontSize: 14, margin: "10px 0" }}>{resultMsg}</div>
          <Btn color={T.pos} onClick={onClose}>{t("NEGO.close")}</Btn>
        </div>
      </div>)
    );
  }

  // ===== COUNTER OFFER =====
  if (counterDeal) {
    return (
      localizeTree(<div style={wrap} onClick={onClose}>
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
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn small disabled={counterDeal.signBonus > cash} onClick={onAcceptCounter}>{counterDeal.signBonus > cash ? t("NEGO.form.noCash") : t("NEGO.counterAccept")}</Btn>
            <Btn small color={T.neg} onClick={onClose}>{t("NEGO.counterReject")}</Btn>
          </div>
        </div>
      </div>)
    );
  }

  // ===== FORM NEGOSIASI =====
  return (
    localizeTree(<div style={wrap} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, width: "100%", background: `linear-gradient(160deg, ${T.raised}, ${T.surface})`, border: `1px solid ${T.gold}`, padding: 16, maxHeight: "90vh", overflowY: "auto", ...{ borderRadius: T.r } }}>
        <H>{mode === "extend" ? t("NEGO.form.headerExtend") : t("NEGO.form.headerSign")}</H>
        <div style={{ fontFamily: T.disp, color: T.txt, fontSize: 18, letterSpacing: 1, textTransform: "uppercase" }}>{fighter?.name}</div>
        <div style={{ color: T.txt3, fontSize: 11, marginBottom: 12 }}>
          {ag.label}{fighter?.agent !== "none" && t("NEGO.form.agentInfoCut").replace("{0}", Math.round(ag.cutFloor * 100))}
          {fighter?.agent === "Power" && t("NEGO.form.agentInfoAgg")}
        </div>
        <NegoRow label={t("NEGO.form.managerCut")} hint={t("NEGO.form.floorHint").replace("{0}", Math.round(ag.cutFloor * 100))}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {NEGO_CUT_OPTIONS.map((v) => localizeTree(<NegoOpt key={v} v={cutPct} set={setCutPct} val={v}>{v}%</NegoOpt>))}
          </div>
        </NegoRow>
        <NegoRow label={mode === "extend" ? t("NEGO.form.bonusExtend") : t("NEGO.form.bonusSign")} hint={t("NEGO.form.askingHint").replace("{0}", fmt$(baseAsking))}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {bonusOptions(fighter, mode).map((v) => (
              localizeTree(<NegoOpt key={v} v={signBonus} set={setSignBonus} val={v}>{fmt$(v)}</NegoOpt>)
            ))}
          </div>
        </NegoRow>
        <NegoRow label={t("NEGO.form.fightCommitment")}>
          <div style={{ display: "flex", gap: 6 }}>{NEGO_FIGHT_OPTIONS.map((v) => localizeTree(<NegoOpt key={v} v={fights} set={setFights} val={v}>{t("NEGO.form.fightsVal").replace("{0}", v)}</NegoOpt>))}</div>
        </NegoRow>
        <NegoRow label={t("NEGO.form.duration")}>
          <div style={{ display: "flex", gap: 6 }}>{NEGO_DURATION_OPTIONS.map((v) => localizeTree(<NegoOpt key={v} v={duration} set={setDuration} val={v}>{t("NEGO.form.durationVal").replace("{0}", v)}</NegoOpt>))}</div>
        </NegoRow>
        <div style={{ borderTop: `1px solid ${T.line}44`, paddingTop: 10, marginTop: 10 }}>
          <div style={{ fontSize: 10, color: T.txt3, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{t("NEGO.form.clauses")}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
            <div style={{ background: T.surface, padding: "6px 8px", ...{ borderRadius: T.r } }}>
              <div style={{ fontSize: 9, color: T.txt3 }}>{t("NEGO.form.campEquity")}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                {NEGO_EQUITY_OPTIONS.map((v) => (
                  localizeTree(<button key={v} onClick={() => setEquity(v)} style={{ flex: 1, background: equity === v ? T.gold : T.raised, color: equity === v ? "#0a0d14" : T.txt, border: "none", padding: "3px 4px", fontSize: 9, cursor: "pointer", ...{ borderRadius: T.r } }}>{v}%</button>)
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
          <Btn small disabled={tooPoor || rosterFull} onClick={handleSubmit}>
            {rosterFull ? t("UI.rosterFull") : tooPoor ? t("NEGO.form.noCash") : mode === "extend" ? t("NEGO.form.submitExtend") : t("NEGO.form.submitSign")}
          </Btn>
          <Btn small color={T.txt3} onClick={onClose}>{t("NEGO.form.cancel")}</Btn>
        </div>
      </div>
    </div>)
  );
}
