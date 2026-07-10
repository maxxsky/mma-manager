// Corner — between rounds strategy
import { Panel, Eyebrow, Btn } from "../../ui/theme.jsx";
import { T } from "../../ui/theme.jsx";

export default function Corner({ rnd, totalRounds, timer, state, runRound, processResult }) {
  if (rnd >= totalRounds) {
    return (
      <Panel style={{ border: `1px solid ${T.gold}44` }}>
        <Eyebrow color={T.gold}>Corner · final round complete</Eyebrow>
        <div style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontFamily: T.body, fontSize: 13, color: T.txt2, marginBottom: 12 }}>Final round complete — waiting for decision...</div>
          <Btn color={T.gold} onClick={processResult}>Go to decision</Btn>
        </div>
      </Panel>
    );
  }

  return (
    <Panel style={{ border: `1px solid ${T.gold}44` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Eyebrow color={T.gold}>Corner · between rounds</Eyebrow>
        <span style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, color: T.warn, marginBottom: 12 }}>0:{String(timer).padStart(2, "0")}</span>
      </div>
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
    </Panel>
  );
}
