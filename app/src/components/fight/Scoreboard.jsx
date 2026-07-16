// Scoreboard — HP/STA bars shared between fight stages
import { Panel } from "../../ui/theme.jsx";
import { T } from "../../ui/theme.jsx";
import { t } from "../../i18n/index.js";

const CORNER_RED = "#f5623c";
const CORNER_BLUE = "#3ea6ff";

export default function Scoreboard({ fighter, opp, state, rnd, totalRounds, totalLandA, totalLandB, totalTdA, totalTdB }) {
  return (
    <Panel pad={14} style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
            <span style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 16, textTransform: "uppercase", color: T.txt }}>{fighter.name}</span>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: CORNER_RED }}>{t("SCORE.hp")} {Math.round(state.hpA || 100)}</span>
          </div>
          <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: "hidden", transform: "scaleX(-1)" }}>
            <div style={{ height: "100%", width: `${state.hpA || 100}%`, background: CORNER_RED, borderRadius: 4 }} />
          </div>
          <div style={{ height: 4, background: T.bg, borderRadius: 2, marginTop: 3, overflow: "hidden", transform: "scaleX(-1)" }}>
            <div style={{ height: "100%", width: `${state.staA || 100}%`, background: T.pos, borderRadius: 2 }} />
          </div>
        </div>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div style={{ fontFamily: T.body, fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: T.txt3 }}>{t("SCORE.round")}</div>
          <div style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: T.txt, lineHeight: 1 }}>{rnd}<span style={{ fontSize: 12, color: T.txt3 }}>/{totalRounds}</span></div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 8, marginBottom: 5 }}>
            <span style={{ fontFamily: T.mono, fontSize: 11, color: CORNER_BLUE }}>{t("SCORE.hp")} {Math.round(state.hpB || 100)}</span>
            <span style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 16, textTransform: "uppercase", color: T.txt }}>{opp.name}</span>
          </div>
          <div style={{ height: 8, background: T.bg, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${state.hpB || 100}%`, background: CORNER_BLUE, borderRadius: 4 }} />
          </div>
          <div style={{ height: 4, background: T.bg, borderRadius: 2, marginTop: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${state.staB || 100}%`, background: T.pos, borderRadius: 2 }} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: T.mono, fontSize: 11, color: T.txt3 }}>
        <span>{t("SCORE.str")} <b style={{ color: CORNER_RED }}>{totalLandA}</b> · {t("SCORE.td")} <b style={{ color: CORNER_RED }}>{totalTdA}</b></span>
        <span>{t("SCORE.td")} <b style={{ color: CORNER_BLUE }}>{totalTdB}</b> · {t("SCORE.str")} <b style={{ color: CORNER_BLUE }}>{totalLandB}</b></span>
      </div>
    </Panel>
  );
}
