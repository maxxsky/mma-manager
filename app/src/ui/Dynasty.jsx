import React from "react";
import { T, Panel, Eyebrow, Tag, Btn } from "./theme.jsx";
import { t } from "../i18n/index.js";
import { fmt$ } from "@ironfist/engine/rng.js";
import { getCampDynasty, getCampIdentity, getWorldRecords, getGenerationalLinks } from "@ironfist/engine/dynasty.js";
import { getPrestigeBreakdown, PRESTIGE_MAX } from "@ironfist/engine/prestige.js";
import { INVESTMENTS } from "@ironfist/engine/data/investments.js";

export default function Dynasty({ g, dispatch }) {
  const dyn = getCampDynasty(g);
  const identity = getCampIdentity(g);
  const records = getWorldRecords(g);
  const links = getGenerationalLinks(g);
  const prestige = getPrestigeBreakdown(g);
  const hof = g._hallOfFame || [];
  // Fighters who have left. The hall of fame only admits the exceptional —
  // a camp that produced thirteen champions kept records for three of them —
  // so this is where the rest of the camp's history lives.
  const alumni = [...(g._dynasty?.alumni || [])].sort((a, b) => {
    const rank = (x) => (x.titles?.length || 0) * 100 + (x.titleDefenses || 0) * 10 + (x.record?.w || 0);
    return rank(b) - rank(a);
  });

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Camp Identity */}
      <Panel>
        <Eyebrow color={T.gold}>{t("DYN.identity")}</Eyebrow>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {identity.length > 0 ? identity.map(id => (
            <Tag key={id.id} color={T.gold} solid>{id.label}</Tag>
          )) : (
            <span style={{ fontFamily: T.body, fontSize: 12, color: T.txt3 }}>{t("DYN.identityPlaceholder")}</span>
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

      {/* Camp Prestige — the long arc. Everything the camp has ever done feeds
          the calibre of talent that walks through the door. Shown with its
          sources and the next threshold, because a bare score is a statistic
          while a score with a visible cause and a visible target is a goal. */}
      <Panel>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
          <Eyebrow color={T.gold}>{t("PRES.title")}</Eyebrow>
          <Tag color={T.gold} solid>{t("PRES.tier." + prestige.tier.id)}</Tag>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 8 }}>
          <span style={{ fontFamily: T.disp, fontSize: 42, fontWeight: 700, lineHeight: 1, color: T.gold }}>
            {prestige.prestige}
          </span>
          <span style={{ fontFamily: T.mono, fontSize: 12, color: T.txt3, paddingBottom: 6 }}>
            / {PRESTIGE_MAX}
          </span>
        </div>

        {/* Progress toward the next tier */}
        <div style={{ height: 6, background: T.bg, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
          <div style={{ width: `${Math.min(100, (prestige.prestige / PRESTIGE_MAX) * 100)}%`, height: "100%", background: T.gold }} />
        </div>
        <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt2, marginBottom: 14 }}>
          {prestige.nextTier
            ? t("PRES.toNext").replace("{0}", prestige.toNextTier).replace("{1}", t("PRES.tier." + prestige.nextTier.id))
            : prestige.prestige < PRESTIGE_MAX
              ? t("PRES.topTier").replace("{0}", PRESTIGE_MAX - prestige.prestige)
              : t("PRES.atPeak")}
        </div>

        {/* What the history has actually bought */}
        <div style={{ padding: "10px 12px", background: T.bg, borderRadius: T.r, marginBottom: 12 }}>
          <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3, marginBottom: 4 }}>
            {t("PRES.effect")}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 700, color: T.steel }}>
              {prestige.specialChance}%
            </span>
            {prestige.specialChanceAtNextTier != null && (
              <span style={{ fontFamily: T.body, fontSize: 11, color: T.txt3 }}>
                {t("PRES.effectNext").replace("{0}", prestige.specialChanceAtNextTier)}
              </span>
            )}
          </div>
        </div>

        {/* Where the score came from */}
        {prestige.sources.length > 0 ? (
          <div style={{ display: "grid", gap: 4 }}>
            {prestige.sources.map((src) => (
              <div key={src.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0" }}>
                <span style={{ fontFamily: T.body, fontSize: 12, color: T.txt2 }}>
                  {t("PRES.src." + src.id).replace("{0}", src.count)}
                </span>
                <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.gold }}>
                  +{src.points}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, fontStyle: "italic" }}>
            {t("PRES.empty")}
          </div>
        )}
      </Panel>

      {/* Camp Dynasty Stats */}
      <Panel>
        <Eyebrow color={T.gold}>{t("DYN.founded").replace("{0}", dyn.foundedWeek)}</Eyebrow>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
          {[
            [t("DYN.stat.fightersDev"), dyn.totalFightersEver],
            [t("DYN.stat.champsProd"), dyn.championsProduced],
            [t("DYN.stat.worldChamps"), dyn.worldChampionsProduced],
            [t("DYN.stat.titleDef"), dyn.totalTitleDefenses],
            [t("DYN.stat.totalWins"), dyn.totalWins],
            [t("DYN.stat.totalLosses"), dyn.totalLosses],
            [t("DYN.stat.totalKOs"), dyn.totalKOs],
            [t("DYN.stat.totalSubs"), dyn.totalSubs],
            [t("DYN.stat.peakRep"), dyn.peakRep],
            [t("DYN.stat.peakLegacy"), fmt$(dyn.peakLegacy)],
            [t("DYN.stat.hallOfFamers"), dyn.hallOfFamers?.length || 0],
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
        <Eyebrow color={T.ember}>{t("DYN.worldRecords")}</Eyebrow>
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
      {/* Alumni — everyone who has passed through the camp */}
      <Panel>
        <Eyebrow color={T.steel}>{t("DYN.alumni").replace("{0}", alumni.length)}</Eyebrow>
        {alumni.length === 0 ? (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, textAlign: "center", padding: 20 }}>
            {t("DYN.alumniEmpty")}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 4 }}>
            {alumni.slice(0, 15).map((a) => {
              const years = Math.max(0, Math.round((a.leftWeek - a.joinedWeek) / 48 * 10) / 10);
              const rec = a.record || {};
              return (
                <div key={a.id} style={{ display: "grid",
                  gridTemplateColumns: "minmax(140px,1.4fr) 1fr 90px 70px 110px",
                  alignItems: "center", gap: 8, padding: "8px 10px",
                  background: T.bg, borderRadius: T.r,
                  border: `1px solid ${(a.titles?.length || 0) > 0 ? `${T.gold}33` : T.line}` }}>
                  <div>
                    <div style={{ fontFamily: T.disp, fontSize: 13, fontWeight: 700, color: T.txt }}>{a.name}</div>
                    <div style={{ fontFamily: T.body, fontSize: 10.5, color: T.txt3 }}>
                      {a.archetype} · {a.weightClass}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(a.titles || []).map((ti) => (
                      <Tag key={ti} color={T.gold}>{ti}</Tag>
                    ))}
                  </div>
                  <span style={{ fontFamily: T.mono, fontSize: 12, color: T.txt2, textAlign: "center" }}>
                    {rec.w || 0}-{rec.l || 0}
                  </span>
                  <span style={{ fontFamily: T.mono, fontSize: 11, color: T.txt3, textAlign: "center" }}>
                    {years}y
                  </span>
                  <span style={{ fontFamily: T.body, fontSize: 10.5, color: T.txt3, textAlign: "right" }}>
                    {t("DYN.alumniLeft").replace("{0}", a.ageAtExit ?? "?")}
                  </span>
                </div>
              );
            })}
            {alumni.length > 15 && (
              <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3, textAlign: "center", paddingTop: 6 }}>
                {t("DYN.alumniMore").replace("{0}", alumni.length - 15)}
              </div>
            )}
          </div>
        )}
      </Panel>

      <Panel>
        <Eyebrow color={T.gold}>{t("DYN.hallOfFame").replace("{0}", hof.length)}</Eyebrow>
        {hof.length === 0 ? (
          <div style={{ fontFamily: T.body, fontSize: 12, color: T.txt3, textAlign: "center", padding: 20 }}>
            {t("DYN.hofEmpty")}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {[...hof].reverse().map(h => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: `${T.gold}08`, borderRadius: T.r, border: `1px solid ${T.gold}33` }}>
                <span style={{ fontSize: 24 }}>🏆</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: T.disp, fontSize: 16, fontWeight: 700, color: T.gold, textTransform: "uppercase", letterSpacing: 1 }}>{h.name}</div>
                  <div style={{ fontFamily: T.mono, fontSize: 12, color: T.txt2 }}>{h.record} · {t("DYN.titleDefenses").replace("{0}", h.defenses)}</div>
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
          <Eyebrow color={T.steel}>{t("DYN.generationalLegacy")}</Eyebrow>
          {links.map((l, i) => (
            <div key={i} style={{ fontFamily: T.body, fontSize: 13, color: T.txt2, padding: "6px 0", fontStyle: "italic", borderBottom: i < links.length - 1 ? `1px solid ${T.line}33` : "none" }}>
              {l.text}
            </div>
          ))}
        </Panel>
      )}

      {/* Regional Power Rankings */}
      {(() => {
        const rs = g._worldHistory?.regionStats;
        if (!rs) return null;
        const ranked = Object.entries(rs)
          .filter(([, v]) => v.totalFighters > 0)
          .sort((a, b) => b[1].championsProduced - a[1].championsProduced || b[1].totalFighters - a[1].totalFighters);
        if (ranked.length === 0) return null;
        return (
          <Panel>
            <Eyebrow color={T.ember}>{t("DYN.regionalPower")}</Eyebrow>
            <div style={{ display: "grid", gap: 6 }}>
              {ranked.map(([region, stats], i) => (
                <div key={region} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: T.bg, borderRadius: T.r }}>
                  <span style={{ fontFamily: T.disp, fontSize: 14, fontWeight: 700, color: T.txt3, minWidth: 24 }}>#{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: T.disp, fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, color: T.txt }}>{region}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: T.gold }}>{stats.championsProduced} 👑</div>
                    <div style={{ fontFamily: T.mono, fontSize: 10, color: T.txt3 }}>{t("DYN.fighters").replace("{0}", stats.totalFighters)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        );
      })()}

      {/* Legacy Investments */}
      <Panel>
        <Eyebrow color={T.gold}>Legacy Investments</Eyebrow>
        <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3, marginBottom: 12 }}>
          Investasi one-time pakai cash surplus — efek permanen ke talent pool, membership, atau coach market.
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {INVESTMENTS.map((inv) => {
            const owned = g.investments?.[inv.id];
            const tierOk = !inv.tierReq || (g.campTier || 0) >= inv.tierReq;
            const legacyOk = !inv.legacyReq || (g.legacy || 0) >= inv.legacyReq;
            const affordable = g.cash >= inv.cost;
            const locked = !tierOk || !legacyOk;
            return (
              <div key={inv.id} style={{ padding: "10px 12px", background: T.bg, borderRadius: T.r, border: `1px solid ${owned ? T.pos : T.line}`, opacity: locked ? 0.5 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 13, color: T.txt }}>{inv.name}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 12, color: owned ? T.pos : T.gold }}>{owned ? "OWNED" : fmt$(inv.cost)}</span>
                </div>
                <div style={{ fontFamily: T.body, fontSize: 11, color: T.txt3, marginBottom: 6 }}>{inv.desc}</div>
                {!owned && (
                  <Btn
                    color={T.gold}
                    disabled={locked || !affordable}
                    onClick={() => dispatch({ type: "PURCHASE_INVESTMENT", investmentId: inv.id })}
                  >
                    {locked ? (inv.tierReq ? `Butuh Tier ${inv.tierReq}` : `Butuh Legacy ${inv.legacyReq}`) : !affordable ? "Cash Kurang" : "Beli"}
                  </Btn>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
