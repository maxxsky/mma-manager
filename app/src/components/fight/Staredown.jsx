// Staredown — attitude selection
import { Panel, Eyebrow, Btn } from "../../ui/theme.jsx";
import { T } from "../../ui/theme.jsx";
import { t } from "../../i18n/index.js";

const ATTITUDES = [
  ["STARE.respectful.title", T.pos, "STARE.respectful.fx", "STARE.respectful.risk"],
  ["STARE.professional.title", T.steel, "STARE.professional.fx", "STARE.professional.risk"],
  ["STARE.trash.title", T.neg, "STARE.trash.fx", "STARE.trash.risk"],
];

export default function Staredown({ fighter, attitude, setAttitude, onContinue }) {
  return (
    <Panel>
      <Eyebrow color={T.ember}>{t("STARE.header")}</Eyebrow>
      <div style={{ fontFamily: T.body, fontSize: 13.5, color: T.txt2, marginBottom: 14 }}>
        {t("STARE.intro").replace("{0}", fighter.name)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        {ATTITUDES.map(([k, c, fx, risk]) => (
          <button key={k} className="chip" onClick={() => setAttitude(k)} style={{
            textAlign: "left", padding: "12px 14px", borderRadius: T.r, cursor: "pointer",
            border: `1px solid ${attitude === k ? c : T.line}`,
            background: attitude === k ? `${c}14` : T.bg }}>
            <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 16, letterSpacing: .5, textTransform: "uppercase", color: attitude === k ? c : T.txt }}>{t(k)}</div>
            <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt2, marginTop: 5 }}>{t(fx)}</div>
            <div style={{ fontFamily: T.body, fontSize: 10.5, color: T.txt3, marginTop: 2 }}>{t(risk)}</div>
          </button>
        ))}
      </div>
      <Btn color={T.ember} onClick={onContinue} style={{ opacity: attitude ? 1 : .4, pointerEvents: attitude ? "auto" : "none" }}>{t("STARE.continue")}</Btn>
    </Panel>
  );
}
