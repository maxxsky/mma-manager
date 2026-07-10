// WeighIn — weigh-in, tale of the tape, game plan selection
import { Panel, Eyebrow, Tag, Btn, CompareBar } from "../../ui/theme.jsx";
import { T, ARCH_COLOR } from "../../ui/theme.jsx";
import { GAME_PLANS } from "../../engine/data.js";

export default function WeighIn({ fighter, opp, cutInfo, cutPct, missedWeight, weighinIssue, setWeighinIssue, plan, setPlan, viewMode, setViewMode, onStart, ca, cb }) {
  const limit = fighter.natWeight || 155; // fallback
  return (
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
        <CompareBar label="Age" a={fighter.age ?? 0} b={opp.age || 28} ca={ca} cb={cb} />
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
          <Btn color={T.ember} onClick={onStart} style={{ opacity: plan ? 1 : .4, pointerEvents: plan ? "auto" : "none" }}>🔔 Ring the Bell</Btn>
        </div>
      </Panel>
    </>
  );
}
