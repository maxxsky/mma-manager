// Promoters — tier relations + promoter directory
import React from "react";
import { T, Panel, Eyebrow, Tag } from "./theme.jsx";
import { t } from "../i18n/index.js";
import { PROMO_TIERS } from "@ironfist/engine/data/rivals.js";

export default function Promoters({ g }) {
  const rel = g.promoterRel || {};
  const promos = g.promotions || [];

  // Check if any fighter fought at a given tier in the last 12 weeks
  // Mirrors settlement.js decay logic: g.log contains tier references
  const hasRecentActivity = (tier) => {
    return g.roster?.some((f) =>
      f.lastFightWeek && g.week - f.lastFightWeek <= 12 && g.log?.some((l) => l.includes(tier))
    ) ?? false;
  };

  // Group promoters by tier (same order as PROMO_TIERS)
  const byTier = {};
  PROMO_TIERS.forEach((t) => { byTier[t] = []; });
  promos.forEach((p) => { if (byTier[p.tier]) byTier[p.tier].push(p); });

  // Get fighter name with exclusive contract to this promoter
  const exclusiveTo = (promId) => {
    const f = g.roster?.find((x) => x.promotionContract?.promotionId === promId);
    return f?.name || null;
  };

  const relColor = (v) => (v < 30 ? T.neg : v < 70 ? T.txt3 : T.pos);

  return (
    <div>
      <Eyebrow color={T.gold}>{t("PROMO.header")}</Eyebrow>
      <div style={{ color: T.txt3, fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
        {t("PROMO.intro")}
      </div>

      {/* ── Part 1: Tier Relations ── */}
      <Panel style={{ marginBottom: 16 }}>
        <Eyebrow color={T.ember}>{t("PROMO.tierRel")}</Eyebrow>
        <div style={{ display: "grid", gap: 14 }}>
          {PROMO_TIERS.map((tier) => {
            const v = rel[tier] ?? 30;
            const declining = !hasRecentActivity(tier);
            return (
              <div key={tier}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 14, letterSpacing: .5, textTransform: "uppercase", color: T.txt }}>{tier}</span>
                  <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: relColor(v) }}>{v}</span>
                </div>
                <div style={{ height: 7, background: T.bg, borderRadius: 4, overflow: "hidden", marginBottom: 2 }}>
                  <div style={{ height: "100%", width: `${v}%`, background: relColor(v), borderRadius: 4, transition: "width .3s" }} />
                </div>
                {declining && (
                  <div style={{ fontSize: 10.5, color: T.warn, marginTop: 2 }}>{t("PROMO.declining")}</div>
                )}
                {v >= 85 && (
                  <div style={{ fontSize: 10.5, color: T.pos, marginTop: 2 }}>{t("PROMO.effect.t85")}</div>
                )}
                {v >= 70 && v < 85 && (
                  <div style={{ fontSize: 10.5, color: T.pos, marginTop: 2 }}>{t("PROMO.effect.t70")}</div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ── Part 2: Promoters ── */}
      <Panel>
        <Eyebrow color={T.gold}>{t("PROMO.promoters")}</Eyebrow>
        {promos.length === 0 ? (
          <div style={{ textAlign: "center", padding: 20, color: T.txt3, fontSize: 12 }}>
            {t("PROMO.noPromo")}
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {PROMO_TIERS.map((tier) => {
              const tierPromos = byTier[tier];
              if (!tierPromos || tierPromos.length === 0) return null;
              return (
                <div key={tier}>
                  <div style={{
                    fontFamily: T.body, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                    textTransform: "uppercase", color: T.txt3, marginBottom: 6,
                    paddingTop: tier === PROMO_TIERS[0] ? 0 : 8,
                    borderTop: tier === PROMO_TIERS[0] ? "none" : `1px solid ${T.line}33`,
                  }}>
                    {tier}
                  </div>
                  {tierPromos.map((p) => {
                    const excl = exclusiveTo(p.id);
                    return (
                      <div key={p.id} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px", background: T.bg, borderRadius: T.r, marginBottom: 4,
                      }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 13, letterSpacing: .4, color: T.txt }}>
                            {p.name}
                          </div>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                            <Tag color={T.steel} title={p.personality.desc}>{p.personality.label}</Tag>
                            <span style={{ fontFamily: T.mono, fontSize: 10, color: T.txt3 }}>{p.prestige}pts</span>
                            {excl && (
                              <Tag color={T.ember} style={{ marginTop: 0 }}>
                                {t("PROMO.exclusive").replace("{0}", excl)}
                              </Tag>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
