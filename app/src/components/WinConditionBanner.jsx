import { localizeTree } from "../i18n/presentation.jsx";
import React from "react";
import { Panel, T } from "../ui/theme.jsx";
import { t } from "../i18n/index.js";

// Recognition follows the same prestige score used for camp progression.
export default function WinConditionBanner({ prestige = 0 }) {
  if (prestige < 80) return null;
  return (
    localizeTree(<Panel style={{ marginBottom: 12, textAlign: "center", borderColor: T.gold }}>
      <div style={{ color: T.gold, fontFamily: T.disp, fontSize: 20 }}>🏆 {t("PRES.tier.legendary")}</div>
      <div style={{ color: T.txt2, fontSize: 12 }}>{t("PRES.title")} {prestige}/100</div>
    </Panel>)
  );
}
