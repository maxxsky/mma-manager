// Staredown — attitude selection
import { Panel, Eyebrow, Btn } from "../../ui/theme.jsx";
import { T } from "../../ui/theme.jsx";

const ATTITUDES = [
  ["Respectful", T.pos, "+5% footwork · +2 popularity", "safe — no downside"],
  ["Professional", T.steel, "neutral · +2 rep on a win", "no bonus, no risk"],
  ["Trash talk", T.neg, "+8% striking (his +5%) · +5 pop", "lose = morale −8, rep −5"],
];

export default function Staredown({ fighter, attitude, setAttitude, onContinue }) {
  return (
    <Panel>
      <Eyebrow color={T.ember}>Staredown · press conference</Eyebrow>
      <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.txt2, marginBottom: 14 }}>
        Both fighters face off. Choose the attitude <b style={{ color: T.txt }}>{fighter.name}</b> shows the cameras.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        {ATTITUDES.map(([k, c, fx, risk]) => (
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
      <Btn color={T.ember} onClick={onContinue} style={{ opacity: attitude ? 1 : .4, pointerEvents: attitude ? "auto" : "none" }}>Continue to weigh-in</Btn>
    </Panel>
  );
}
