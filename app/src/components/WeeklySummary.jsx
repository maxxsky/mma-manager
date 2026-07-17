// Weekly summary overlay
import { fmt$ } from "@ironfist/engine/rng.js";
import { T, Btn, cut } from "../ui/theme.jsx";

export default function WeeklySummary({ summary, onClose, t }) {
  if (!summary) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(6,9,14,.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, width: "100%", background: `linear-gradient(160deg, ${T.raised}, ${T.surface})`, border: `1px solid ${T.gold}`, padding: 18, ...cut(14), animation: "rise .35s ease both" }}>
        <div style={{ fontFamily: T.disp, fontSize: 20, letterSpacing: 3, color: T.gold, textTransform: "uppercase", marginBottom: 4 }}>{t("UI.week")} {summary.week}</div>
        <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 10, color: T.txt3 }}>
          <span>{fmt$(summary.cash)} · Rep {Math.round(summary.rep)} · {summary.rosterCount} fighters · {summary.inboxCount} inbox</span>
        </div>
        {summary.achievements && summary.achievements.length > 0 && (
          <div style={{ marginBottom: 10, padding: "8px 12px", background: `${T.gold}15`, border: `1px solid ${T.gold}44`, borderRadius: 8 }}>
            <div style={{ fontFamily: T.disp, fontSize: 11, color: T.gold, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>🏆 Achievement Unlocked</div>
            {summary.achievements.map((a, i) => (
              <div key={i} style={{ fontSize: 12, color: T.gold, fontWeight: 600 }}>{a}</div>
            ))}
          </div>
        )}
        {summary.highlights.length > 0 && (
          <div style={{ maxHeight: 200, overflowY: "auto", marginBottom: 10 }}>
            {summary.highlights.map((l, i) => (
              <div key={i} style={{ fontSize: 12, color: i === 0 ? T.txt : T.txt3, marginBottom: 5, paddingBottom: 4, borderBottom: `1px solid ${T.line}44`, lineHeight: 1.4 }}>{l}</div>
            ))}
          </div>
        )}
        {summary.injuredCount > 0 && (
          <div style={{ color: T.neg, fontSize: 11, marginBottom: 8 }}>🚑 {summary.injuredCount} cedera: {summary.injuredNames.join(", ")}</div>
        )}
        <div style={{ textAlign: "center" }}>
          <Btn small onClick={onClose}>OK</Btn>
        </div>
      </div>
    </div>
  );
}
