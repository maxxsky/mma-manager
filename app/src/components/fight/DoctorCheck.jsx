// DoctorCheck — cut severity assessment
import { Panel, Eyebrow, Btn } from "../../ui/theme.jsx";
import { T } from "../../ui/theme.jsx";

const CORNER_RED = "#f5623c";
const CORNER_BLUE = "#3ea6ff";

export default function DoctorCheck({ fighter, opp, cutA, cutB, onContinue, onRetire }) {
  return (
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
        <Btn color={T.pos} onClick={onContinue}>Continue fight</Btn>
        <Btn ghost color={T.neg} sm onClick={onRetire}>{cutA >= 6 ? "Retire (TKO loss)" : "Stop the fight (TKO win)"}</Btn>
      </div>
    </Panel>
  );
}
