// Knockdown — finish moment presentation
import { Panel, Btn } from "../../ui/theme.jsx";
import { T } from "../../ui/theme.jsx";
import { t } from "../../i18n/index.js";

export default function Knockdown({ roundLog, rnd, onSeeResult }) {
  return (
    <Panel style={{ textAlign: "center", padding: 32, border: `1px solid ${T.gold}66`, boxShadow: `0 0 40px ${T.gold}22` }}>
      <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 44, letterSpacing: 2, textTransform: "uppercase", color: T.gold, lineHeight: 1 }}>{t("KO.overText")}</div>
      <div style={{ fontFamily: T.body, fontSize: 14, color: T.txt2, margin: "10px 0 18px" }}>
        {roundLog.finish
          ? t("KO.finishAt").replace("{0}", t("RESULT.how." + roundLog.finish.how.replace(/[/ ]/g, ''))).replace("{1}", rnd)
          : t("KO.goesDown").replace("{0}", roundLog.knockdown?.fighter ?? "Fighter")}
      </div>
      <Btn color={T.gold} onClick={onSeeResult}>{t("KO.seeResult")}</Btn>
    </Panel>
  );
}
