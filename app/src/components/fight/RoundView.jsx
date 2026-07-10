// RoundView — round commentary (tick-by-tick or summary)
import { Panel, Eyebrow, Btn } from "../../ui/theme.jsx";
import { T } from "../../ui/theme.jsx";

export default function RoundView({ rnd, roundLog, viewMode, tickIdx, displayLog, onEndRound, onSeeFinish, hasFinish }) {
  return (
    <Panel>
      <Eyebrow>Round {rnd} · commentary</Eyebrow>
      {viewMode === "tick"
        ? displayLog.slice(0, tickIdx).map((l, i) => (
            <div key={i} style={{ fontFamily: T.body, fontSize: 13.5, color: l.includes("DOWN") ? T.gold : l.includes("MISS") ? T.txt3 : T.txt2, fontWeight: l.includes("DOWN") ? 700 : 400, padding: "6px 0 6px 12px", borderLeft: `2px solid ${l.includes("DOWN") ? T.gold : T.line}`, marginBottom: 4, lineHeight: 1.45 }}>{l}</div>
          ))
        : displayLog.map((l, i) => (
            <div key={i} style={{ fontFamily: T.body, fontSize: 13.5, color: l.includes("DOWN") ? T.gold : l.includes("MISS") ? T.txt3 : T.txt2, fontWeight: l.includes("DOWN") ? 700 : 400, padding: "6px 0 6px 12px", borderLeft: `2px solid ${l.includes("DOWN") ? T.gold : T.line}`, marginBottom: 4, lineHeight: 1.45 }}>{l}</div>
          ))
      }
      {!hasFinish && <Btn color={T.ember} onClick={onEndRound} style={{ marginTop: 10 }}>End of round {rnd}</Btn>}
      {hasFinish && <Btn color={T.gold} onClick={onSeeFinish} style={{ marginTop: 10 }}>See the finish</Btn>}
    </Panel>
  );
}
