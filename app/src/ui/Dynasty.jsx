import React from "react";
import { T, Panel, Eyebrow, Tag, Btn } from "./theme.jsx";
import { fmt$ } from "../engine/rng.js";
import { getCampDynasty, getCampIdentity, getWorldRecords, getGenerationalLinks } from "../engine/dynasty.js";

export default function Dynasty({ g }) {
  const dyn = getCampDynasty(g);
  const identity = getCampIdentity(g);
  const records = getWorldRecords(g);
  const links = getGenerationalLinks(g);
  const hof = g._hallOfFame || [];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Camp Identity */}
      <Panel>
        <Eyebrow color={T.gold}>Camp Identity</Eyebrow>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {identity.length > 0 ? identity.map(id => (
            <Tag key={id.id} color={T.gold} solid>{id.label}</Tag>
          )) : (
            <span style={{ fontFamily: T.body, fontSize: 12, color: T.txt3 }}>Your camp's identity will emerge through results and achievements.</span>
          )}
        </div>
        {identity.length > 0 && (
          <div style={{ display: "grid", gap: 6 }}>
            {identity.map(id => (
              <div key={id.id} style={{ fontFamily: T.body, fontSize: 12, color: T.txt2, fontStyle: "italic" }}>{id.desc}</div>
            ))}
          </div>
        )}
      </Panel>

      {/* Camp Dynasty Stats */}
      <Panel>
        <Eyebrow color={T.gold}>Dynasty · Founded Week {dyn.foundedWeek}</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
          {[
            ["Fighters Developed", dyn.totalFightersEver],
            ["Champions Produced", dyn.championsProduced],
            ["World Champions", dyn.worldChampionsProduced],
            ["Title Defenses", dyn.totalTitleDefenses],
            ["Total Wins", dyn.totalWins],
            ["Total Losses", dyn.totalLosses],
            ["Total KOs", dyn.totalKOs],
            ["Total Submissions", dyn.totalSubs],
            ["Peak Reputation", dyn.peakRep],
            ["Peak Legacy", fmt$(dyn.peakLegacy)],
            ["Hall of Famers", dyn.hallOfFamers?.length || 0],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.line}33` }}>
              <span style={{ fontFamily: T.body, fontSize: 12, color: T.txt3 }}>{label}</span>
              <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: T.txt }}>{value}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* World Records */}
      <Panel>
        <Eyebrow color={T.ember}>World Records</Eyebrow>
        <div style={{ display: "grid", gap: 8 }}>
          {records.map(r => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "8px 10px", background: T.bg, borderRadius: T.r }}>
              <div>
                <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3 }}>{r.label}</div>
                <div style={{ fontFamily: T.disp, fontSize: 18, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: 1 }}>{r.value}</div>
              </div>
              <span style={{ fontFamily: T.body, fontSize: 11, color: T.txt2 }}>{r.holder}</span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Hall of Fame */}
      <Panel>
        <Eyebrow color={T.gold}>🏛️ Hall of Fame · {hof.length} Inductees</Eyebrow>
        {hof.length === 0 ? (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, textAlign: "center", padding: 20 }}>
            No fighters have been inducted yet. Legends are forged through extraordinary careers.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {[...hof].reverse().map(h => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: `${T.gold}08`, borderRadius: T.r, border: `1px solid ${T.gold}33` }}>
                <span style={{ fontSize: 24 }}>🏆</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.disp, fontSize: 16, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: 1 }}>{h.name}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 12, color: T.txt2 }}>{h.record} · {h.defenses} title defenses</div>
                  {h.highlights.length > 0 && (
                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      {h.highlights.map(hl => <Tag key={hl} color={T.ember}>{hl}</Tag>)}
                    </div>
                  )}
                </div>
                <span style={{ fontFamily: T.mono, fontSize: 10, color: T.txt3 }}>W{h.week}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Generational Links */}
      {links.length > 0 && (
        <Panel>
          <Eyebrow color={T.steel}>Generational Legacy</Eyebrow>
          {links.map((l, i) => (
            <div key={i} style={{ fontFamily: T.body, fontSize: 13, color: T.txt2, padding: "6px 0", fontStyle: "italic", borderBottom: i < links.length - 1 ? `1px solid ${T.line}33` : "none" }}>
              {l.text}
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
