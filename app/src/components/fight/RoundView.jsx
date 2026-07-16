// RoundView — round commentary (tick-by-tick or summary)
import { Panel, Eyebrow, Btn } from "../../ui/theme.jsx";
import { T } from "../../ui/theme.jsx";
import { t } from "../../i18n/index.js";

export default function RoundView({ rnd, roundLog, viewMode, tickIdx, displayLog, onEndRound, onSeeFinish, hasFinish }) {
  return (
    <Panel>
      <Eyebrow>{t("ROUND.commentary").replace("{0}", rnd)}</Eyebrow>
      {viewMode === "tick"
        ? displayLog.slice(0, tickIdx).map((l, i) => (
            <div key={i} style={{ fontFamily: T.body, fontSize: 13.5, color: l.includes("DOWN") ? T.gold : l.includes("MISS") ? T.txt3 : T.txt2, fontWeight: l.includes("DOWN") ? 700 : 400, padding: "6px 0 6px 12px", borderLeft: `2px solid ${l.includes("DOWN") ? T.gold : T.line}`, marginBottom: 4, lineHeight: 1.45 }}>{l}</div>
          ))
        : displayLog.map((l, i) => (
            <div key={i} style={{ fontFamily: T.body, fontSize: 13.5, color: l.includes("DOWN") ? T.gold : l.includes("MISS") ? T.txt3 : T.txt2, fontWeight: l.includes("DOWN") ? 700 : 400, padding: "6px 0 6px 12px", borderLeft: `2px solid ${l.includes("DOWN") ? T.gold : T.line}`, marginBottom: 4, lineHeight: 1.45 }}>{l}</div>
          ))
      }
      {!hasFinish && <Btn color={T.ember} onClick={onEndRound} style={{ marginTop: 10 }}>{t("ROUND.end").replace("{0}", rnd)}</Btn>}
      {hasFinish && <Btn color={T.gold} onClick={onSeeFinish} style={{ marginTop: 10 }}>{t("ROUND.seeFinish")}</Btn>}
    </Panel>
  );
}
