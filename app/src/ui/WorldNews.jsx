// World News — tab dedicated to simulation world events (title changes, streaks, retirements)
import React from "react";
import { T, Panel, Eyebrow } from "./theme.jsx";

export default function WorldNews({ g }) {
  const worldEvents = g.inbox?.filter((m) => m.type === "world") || [];
  if (worldEvents.length === 0) {
    return (
      <Panel style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.6 }}>🌍</div>
        <Eyebrow>World News</Eyebrow>
        <div style={{ fontSize: 13, color: T.txt3 }}>
          No world events yet. Advance the week to see simulation news.
        </div>
      </Panel>
    );
  }

  const sorted = [...worldEvents].reverse(); // oldest first → newest last
  const firstMajor = sorted.findIndex((m) => m.severity === "major");

  return (
    <div>
      <Eyebrow color={T.gold}>🌍 World News</Eyebrow>
      <div style={{ display: "grid", gap: 8 }}>
        {sorted.map((m, i) => {
          const isMajor = m.severity === "major";
          // Check if this is the first major — highlight its position
          const isHighlighted = isMajor && sorted.slice(0, i).every((x) => x.severity !== "major");
          return (
            <Panel
              key={m.id || i}
              style={{
                borderColor: isMajor ? T.gold : T.line,
                background: isHighlighted ? `${T.gold}0a` : isMajor ? `${T.steel}08` : "transparent",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ fontSize: isMajor ? 13 : 10, marginTop: isMajor ? 0 : 2, opacity: isMajor ? 1 : 0.6 }}>
                  {isMajor ? "👑" : "📰"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: T.body,
                      fontSize: isMajor ? 14 : 12,
                      fontWeight: isMajor ? 600 : 500,
                      color: isMajor ? T.gold : T.txt2,
                      marginBottom: 2,
                    }}
                  >
                    {m.title}
                  </div>
                  <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3, lineHeight: 1.4 }}>
                    {m.body}
                  </div>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
