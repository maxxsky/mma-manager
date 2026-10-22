// WeighIn — weigh-in, tale of the tape, game plan selection
import { Panel, Eyebrow, Tag, Btn } from "../../ui/theme.jsx";
import { T } from "../../ui/theme.jsx";
import { t } from "../../i18n/index.js";
import { GAME_PLANS } from "@ironfist/engine/data.js";

export default function WeighIn({ fighter, opp, limit, cutInfo, oppCutInfo, cutPct, missedWeight, weighinIssue, setWeighinIssue, plan, setPlan, oppPlan, viewMode, setViewMode, onStart, ca, cb }) {
  const cancelled = weighinIssue === "cancelled";
  const canStart = cancelled || (plan && (!missedWeight || weighinIssue === "catchweight"));
  return (
    <>
      <Panel>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Eyebrow>{t("WEIGH.header")}</Eyebrow>
          <Tag color={missedWeight ? T.neg : T.pos}>{cancelled ? t("WEIGH.cancel") : missedWeight ? t("WEIGH.missed") : t("WEIGH.made")}</Tag>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontFamily: T.mono, fontSize: 24, fontWeight: 700, color: T.txt }}>
            {fighter.natWeight ?? limit} <span style={{ fontSize: 13, color: T.txt3 }}>→ {limit} lbs</span></span>
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt2 }}>
            {cutInfo.label} ({Math.round(cutPct * 100)}%) — <span style={{ color: cutInfo.pen > 0 ? T.warn : T.pos }}>−{cutInfo.pen}% stamina cap</span>.
          </div>
        </div>
        <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt2, marginTop: 8 }}>
          {opp.name}: {oppCutInfo.label} ({Math.round(oppCutInfo.cutPct * 100)}%) — −{oppCutInfo.pen}% stamina cap.
        </div>
        {weighinIssue === "catchweight" && (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.warn, marginTop: 10 }}>{t("WEIGH.catchweightAccepted")}</div>
        )}
        {missedWeight && !weighinIssue && (
          <div style={{ marginTop: 10, padding: 10, background: `${T.neg}15`, border: `1px solid ${T.neg}44`, borderRadius: T.r }}>
            <div style={{ color: T.neg, fontSize: 13, fontFamily: T.disp, letterSpacing: 1 }}>{t("WEIGH.missMessage")}</div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, justifyContent: "center" }}>
              <Btn sm color={T.neg} onClick={() => setWeighinIssue("catchweight")}>{t("WEIGH.catchweight")}</Btn>
              <Btn sm color={T.txt3} ghost onClick={() => setWeighinIssue("cancelled")}>{t("WEIGH.cancel")}</Btn>
            </div>
          </div>
        )}
      </Panel>

      {/* Game Plan */}
      <Panel>
        <Eyebrow color={T.ember}>{t("WEIGH.gamePlan")}</Eyebrow>
        {oppPlan && (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt2, marginBottom: 10 }}>
            {t("WEIGH.oppPlan").replace("{0}", opp.name)} <b style={{ color: cb || T.txt }}>{oppPlan}</b>
          </div>
        )}
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
            {t("WEIGH.viewing")} <b style={{ color: T.txt2 }}>{viewMode === "tick" ? t("WEIGH.viewStatusTick") : t("WEIGH.viewStatusSummary")}</b></span>
          {[{ k: "tick", label: "WEIGH.viewBtnTick" }, { k: "summary", label: "WEIGH.viewBtnSummary" }].map((m) => (
            <button key={m.k} onClick={() => setViewMode(m.k)} style={{ fontFamily: T.body, fontSize: 10, background: viewMode === m.k ? T.ember : T.raised, color: viewMode === m.k ? T.bg : T.txt3, border: `1px solid ${T.line}`, padding: "4px 10px", borderRadius: T.r, cursor: "pointer" }}>{t(m.label)}</button>
          ))}
        </div>
        <div style={{ marginTop: 14 }}>
          <Btn color={T.ember} onClick={onStart} disabled={!canStart}>{cancelled ? t("WEIGH.confirmCancel") : t("WEIGH.ringBell")}</Btn>
        </div>
      </Panel>
    </>
  );
}
