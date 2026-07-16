// Corner — between rounds strategy with contextual options
import { Panel, Eyebrow, Btn } from "../../ui/theme.jsx";
import { T } from "../../ui/theme.jsx";
import { t } from "../../i18n/index.js";

// Baseline options (always available)
const BASELINE = [
  { k: "go",        title: "CORNER.baseline.go.title",        sub: "CORNER.baseline.go.sub",        trade: "CORNER.baseline.go.trade" },
  { k: "body",      title: "CORNER.baseline.body.title",      sub: "CORNER.baseline.body.sub",      trade: "CORNER.baseline.body.trade" },
  { k: "save",      title: "CORNER.baseline.save.title",      sub: "CORNER.baseline.save.sub",      trade: "CORNER.baseline.save.trade" },
];

// Contextual options (conditional)
export function getContextual(state, rnd, totalRounds) {
  const out = [];
  if (state?.cutB >= 4) out.push({ k: "target_cut",  title: "CORNER.context.target_cut.title",      sub: "CORNER.context.target_cut.sub",    trade: "CORNER.context.target_cut.trade" });
  if (state?.cutA >= 4) out.push({ k: "stop_bleed",  title: "CORNER.context.stop_bleed.title",      sub: "CORNER.context.stop_bleed.sub",    trade: "CORNER.context.stop_bleed.trade" });
  if (state?.staA < 40) out.push({ k: "clinch",      title: "CORNER.context.clinch.title",      sub: "CORNER.context.clinch.sub",         trade: "CORNER.context.clinch.trade" });
  if (rnd === totalRounds - 1) out.push({ k: "empty_tank", title: "CORNER.context.empty_tank.title", sub: "CORNER.context.empty_tank.sub",     trade: "CORNER.context.empty_tank.trade" });
  return out;
}

// Build final option list (max 4, narrative-aware)
export function buildOptions(state, rnd, totalRounds) {
  const contextual = getContextual(state, rnd, totalRounds);
  const hasEmptyTank = contextual.some(o => o.k === "empty_tank");
  const hasTargetCut = contextual.some(o => o.k === "target_cut");
  const hasStopBleed = contextual.some(o => o.k === "stop_bleed");

  // Start with baseline, filter narrative contradictions
  let opts = [...BASELINE];
  if (hasEmptyTank) {
    // Empty the tank vs Save your gas — contradictory
    opts = opts.filter(o => o.k !== "save");
  }

  // Add contextual
  opts.push(...contextual);

  // Enforce max 4 — drop body if target_cut is already covering offensive
  if (opts.length > 4 && hasTargetCut) {
    opts = opts.filter(o => o.k !== "body");
  }

  // Still over 4? Remove from end (contextual beyond 4th)
  while (opts.length > 4) opts.pop();

  return opts;
}

export default function Corner({ rnd, totalRounds, timer, state, runRound, processResult }) {
  if (rnd >= totalRounds) {
    return (
      <Panel style={{ border: `1px solid ${T.gold}44` }}>
        <Eyebrow color={T.gold}>{t("CORNER.headerFinal")}</Eyebrow>
        <div style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontFamily: T.body, fontSize: 13, color: T.txt2, marginBottom: 12 }}>{t("CORNER.waitingDecision")}</div>
          <Btn color={T.gold} onClick={processResult}>{t("CORNER.goDecision")}</Btn>
        </div>
      </Panel>
    );
  }

  const options = buildOptions(state, rnd, totalRounds);

  return (
    <Panel style={{ border: `1px solid ${T.gold}44` }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Eyebrow color={T.gold}>{t("CORNER.headerBetween")}</Eyebrow>
        <span style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, color: T.warn, marginBottom: 12 }}>0:{String(timer).padStart(2, "0")}</span>
      </div>
      <div style={{ padding: "8px 12px", background: T.bg, borderRadius: T.r, borderLeft: `3px solid ${T.gold}`, marginBottom: 14 }}>
        <span style={{ fontFamily: T.body, fontSize: 12.5, fontStyle: "italic", color: T.txt2 }}>
          {(state?.hpB < 50 ? t("CORNER.coachHurting") : t("CORNER.coachDangerous")).replace("{0}", rnd + 1)}</span>
      </div>
      {options.map(({ k, title, sub, trade }) => (
        <button key={k} className="chip" onClick={() => runRound(rnd + 1, state, k)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: T.r, cursor: "pointer", marginBottom: 6, border: `1px solid ${T.line}`, background: "transparent" }}>
          <span style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 14.5, letterSpacing: .4, textTransform: "uppercase", color: T.txt, width: 180 }}>{t(title)}</span>
          <span style={{ fontFamily: T.body, fontSize: 11.5, color: T.txt2, flex: 1 }}>{t(sub)}</span>
          <span style={{ fontFamily: T.body, fontSize: 10.5, color: T.txt3 }}>{t(trade)}</span>
        </button>
      ))}
    </Panel>
  );
}
