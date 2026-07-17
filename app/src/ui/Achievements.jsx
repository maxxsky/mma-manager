import React from "react";
import { T, Panel, Eyebrow, Tag } from "./theme.jsx";
import { t } from "../i18n/index.js";
import { ACHIEVEMENTS } from "@ironfist/engine/data.js";

export default function Achievements({ g }) {
  const unlocked = g._unlocked || [];

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Panel>
        <Eyebrow color={T.gold}>{t("ACHV.header")}</Eyebrow>
        <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, marginBottom: 14 }}>
          {t("ACHV.progress").replace("{0}", unlocked.length).replace("{1}", ACHIEVEMENTS.length)}
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {ACHIEVEMENTS.map((a) => {
            const done = unlocked.includes(a.id);
            return (
              <div key={a.id} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
                background: done ? `${T.gold}0e` : T.bg, borderRadius: T.r,
                border: `1px solid ${done ? T.gold : T.line}44`,
                opacity: done ? 1 : 0.5,
              }}>
                <span style={{ fontSize: 24 }}>{done ? a.icon : "🔒"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.body, fontSize: 14, fontWeight: 600, color: done ? T.gold : T.txt2 }}>{a.title}</div>
                  <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3 }}>{a.desc}</div>
                </div>
                {done && <Tag color={T.pos}>✓</Tag>}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
