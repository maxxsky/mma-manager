import { fmt$ } from "../engine/rng.js";
import React from "react";
import { T, Panel, Eyebrow, Tag, Btn } from "./theme.jsx";
import { t } from "../i18n/index.js";
import { random } from "../engine/rng.js";

/* =============================================================================
   INBOX — Ironfist Edition
   Message list with type tags, expiration warnings, action buttons.
============================================================================= */

export default function Inbox({ g, dispatch, setTab }) {
  if (!g.inbox || g.inbox.length === 0) {
    return (
      <Panel style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.6 }}>✉</div>
        <Eyebrow>{t("UI.inboxClear")}</Eyebrow>
        <div style={{ fontSize: 13, color: T.txt3 }}>
          {t("UI.noEventsHint")}
        </div>
      </Panel>
    );
  }

  // Sort: urgent first — title defenses > expiring soon > fight offers > events
  const sorted = [...g.inbox].sort((a, b) => {
    const urgentA =
      (a.defense ? 3 : 0) +
      (a.expires != null && a.expires <= 2 ? 2 : 0) +
      (a.type === "offer" ? 1 : 0);
    const urgentB =
      (b.defense ? 3 : 0) +
      (b.expires != null && b.expires <= 2 ? 2 : 0) +
      (b.type === "offer" ? 1 : 0);
    return urgentB - urgentA;
  });

  const TYPE_META = {
    offer: { color: T.steel, label: t("UI.inbox") },
    event: { color: T.warn, label: t("UI.event") },
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Eyebrow color={T.gold}>
          {t("UI.inbox")} · {g.inbox.length} message{g.inbox.length !== 1 ? "s" : ""}
        </Eyebrow>
        {g.inbox.some((m) => m.expires != null && m.expires <= 2) && (
          <Tag color={T.neg} solid>{t("UI.expiresWeek")}</Tag>
        )}
      </div>

      {sorted.map((m) => {
        // ── FIGHT OFFER ──────────────────────────────────────────
        if (m.type === "offer") {
          const f = g.roster.find((x) => x.id === m.fighterId);
          if (!f || f.booked || f.injury) return null;

          const isUrgent = m.expires != null && m.expires <= 2;
          const isTitle = !!m.title;
          const accent = isTitle ? T.gold : isUrgent ? T.neg : T.steel;

          return (
            <Panel key={m.id} style={{ marginBottom: 12, borderColor: accent }}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {m.isMainEvent && <Tag color={T.gold} solid>{t("UI.upcomingFights")}</Tag>}
                  {m.title && <Tag color={T.gold}>{m.titleTier || t("UI.title")}</Tag>}
                  {m.defense && <Tag color={T.neg}>{t("UI.title") + " Defense"}</Tag>}
                  {m.vacantTitle && <Tag color={T.warn} solid>🏆 Vacant Title Shot</Tag>}
                  {m.isTitleEliminator && <Tag color={T.warn}>{t("UI.rankings") + " Eliminator"}</Tag>}
                  {m.shortNotice && <Tag color={T.neg}>{t("UI.expiresWeek")}</Tag>}
                  <Tag color={accent}>{m.tier}</Tag>
                  {m.promotionName && <span style={{ fontFamily: T.body, fontSize: 10, color: T.txt3, marginLeft: 4 }}>{m.promotionName}</span>}
                </div>
                {m.expires != null && (
                  <span style={{
                    fontFamily: T.mono, fontSize: 12, fontWeight: 700,
                    color: m.expires <= 2 ? T.neg : T.txt3,
                  }}>
                    Exp: {m.expires}w
                  </span>
                )}
              </div>

              {/* Fighter vs Opponent */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                margin: "8px 0 10px", padding: "10px 0",
                borderTop: `1px solid ${T.line}44`, borderBottom: `1px solid ${T.line}44`,
              }}>
                <span style={{ fontFamily: T.disp, color: T.ember, fontSize: 16, textTransform: "uppercase", flex: 1, textAlign: "right" }}>
                  {f.name}
                </span>
                <span style={{ fontFamily: T.disp, color: T.gold, fontSize: 15 }}>VS</span>
                <span style={{ fontFamily: T.disp, color: T.steel, fontSize: 16, textTransform: "uppercase", flex: 1 }}>
                  {m.opponent.name}
                </span>
              </div>

              {/* Story snippet */}
              {m.story && (
                <div style={{ color: T.txt3, fontSize: 11, textAlign: "center", marginBottom: 8, fontStyle: "italic" }}>
                  "{m.story}"
                </div>
              )}

              {/* Details grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px", marginBottom: 10 }}>
                <Detail label={t("UI.purse")} value={fmt$(m.show)} />
                <Detail label={t("UI.purse")} value={fmt$(m.winBonus)} color={T.pos} />
                <Detail label={t("UI.opponent")} value={`${m.opponent.record?.w ?? "?"}-${m.opponent.record?.l ?? "?"} · ${m.opponent.archetype}`} />
                <Detail label="Rank" value={m.oppRank != null ? `#${m.oppRank}` : m.oppRank === 0 ? "👑" : "—"} color={T.gold} />
                <Detail label="Camp Cut" value={`${Math.round(((f.contract && f.contract.managerCut) || 0.18) * 100)}%`} />
                <Detail label="Weeks Out" value={`T-${m.weeks}w`} color={m.weeks <= 3 ? T.warn : T.txt2} />
              </div>

              {/* Promoter relationship */}
              {g.promoterRel && (
                <div style={{ fontSize: 10, color: T.txt3, marginBottom: 10, textAlign: "center" }}>
                  {m.tier} Relationship:{" "}
                  <span style={{
                    color: (g.promoterRel[m.tier] || 30) >= 60 ? T.pos
                      : (g.promoterRel[m.tier] || 30) < 30 ? T.neg : T.txt2,
                    fontWeight: 700,
                  }}>
                    {Math.round(g.promoterRel[m.tier] || 30)}/100
                  </span>
                </div>
              )}

              {/* Warning for mandatory defense */}
              {m.defense && (
                <div style={{
                  background: `${T.neg}15`, border: `1px solid ${T.neg}44`,
                  padding: 6, borderRadius: T.r, marginBottom: 10, textAlign: "center",
                  fontSize: 11, color: T.neg, fontWeight: 600,
                }}>
                  MANDATORY — rejecting this fight will strip the title
                </div>
              )}

              {/* Expiration warning */}
              {isUrgent && (
                <div style={{
                  background: `${T.warn}15`, border: `1px solid ${T.warn}44`,
                  padding: 6, borderRadius: T.r, marginBottom: 10, textAlign: "center",
                  fontSize: 11, color: T.warn, fontWeight: 600,
                }}>
                  Expiring in {m.expires} week{m.expires !== 1 ? "s" : ""} — respond now!
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                <Btn
                  sm
                  color={T.pos}
                  onClick={() => dispatch({
                    type: "ACCEPT_FIGHT", fighterId: m.fighterId, opponent: m.opponent,
                    weeks: m.weeks, show: m.show, winBonus: m.winBonus, tier: m.tier,
                    title: m.title, titleTier: m.titleTier, defense: m.defense,
                    oppRank: m.oppRank, contenderId: m.contenderId, messageId: m.id,
                  })}
                >
                  {t("UI.accept")}
                </Btn>
                <Btn
                  sm
                  color={T.gold}
                  onClick={() => {
                    const rel = (g.promoterRel && g.promoterRel[m.tier]) || 30;
                    const counterChance = Math.max(10, Math.min(90, rel + 20));
                    if (random() * 100 < counterChance) {
                      const boosted = Math.round(m.show * (1.15 + rel / 200));
                      dispatch({
                        type: "COUNTER_FIGHT", fighterId: m.fighterId, opponent: m.opponent,
                        weeks: m.weeks, boosted, boostedWin: Math.round(m.winBonus * (1.15 + rel / 200)),
                        tier: m.tier, title: m.title, titleTier: m.titleTier, defense: m.defense,
                        oppRank: m.oppRank, contenderId: m.contenderId, messageId: m.id, rel,
                      });
                    } else {
                      dispatch({
                        type: "REJECT_FIGHT", fighterId: m.fighterId, tier: m.tier,
                        messageId: m.id, stripTitle: m.defense,
                      });
                    }
                  }}
                >
                  Counter
                </Btn>
                <Btn
                  sm
                  color={T.txt3}
                  ghost
                  onClick={() => dispatch({
                    type: "REJECT_FIGHT", fighterId: m.fighterId, tier: m.tier,
                    messageId: m.id, stripTitle: m.defense,
                  })}
                >
                  {t("UI.reject")}
                </Btn>
              </div>
            </Panel>
          );
        }

        // ── SPONSOR OFFER ────────────────────────────────────────
        if (m.type === "sponsor") {
          return (
            <Panel key={m.id} style={{ marginBottom: 12, borderColor: T.gold }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <Tag color={T.gold} solid>Sponsor</Tag>
                <span style={{ fontFamily: T.disp, fontWeight: 700, fontSize: 15, textTransform: "uppercase",
                  letterSpacing: .5, color: T.txt }}>{m.sponsorBrand || m.title}</span>
                {m.expires != null && (
                  <span style={{ marginLeft: "auto", fontFamily: T.mono, fontSize: 11, color: T.txt3 }}>
                    Exp: {m.expires}w
                  </span>
                )}
              </div>
              {m.body && (
                <div style={{ color: T.txt2, fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>{m.body}</div>
              )}
              {m.choices && m.choices.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {m.choices.map((c, i) => (
                    <Btn key={i} sm color={c.sponsorReject ? T.txt3 : T.pos}
                      ghost={!!c.sponsorReject}
                      onClick={() => dispatch({
                        type: "INBOX_EVENT", choiceIndex: i, messageId: m.id,
                        choice: c, gambleRoll: null,
                      })}>
                      {c.label}
                    </Btn>
                  ))}
                </div>
              )}
            </Panel>
          );
        }

        // ── EVENT / OTHER ────────────────────────────────────────
        const eventColor = m.type === "event" ? T.warn : T.steel;
        return (
          <Panel key={m.id} style={{ marginBottom: 12, borderColor: eventColor }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Tag color={eventColor}>{(TYPE_META[m.type] || TYPE_META.event).label}</Tag>
              </div>
              {m.expires != null && (
                <span style={{
                  fontFamily: T.mono, fontSize: 12, fontWeight: 700,
                  color: m.expires <= 2 ? T.neg : T.txt3,
                }}>
                  Exp: {m.expires}w
                </span>
              )}
            </div>

            <div style={{ fontFamily: T.disp, color: T.txt, fontSize: 15, letterSpacing: 0.5, marginBottom: 8, textTransform: "uppercase" }}>
              {m.title}
            </div>

            {m.body && (
              <div style={{ color: T.txt2, fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
                {m.body}
              </div>
            )}

            {/* Choice buttons */}
            {m.choices && m.choices.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {m.choices.map((c, i) => (
                  <Btn
                    key={i}
                    sm
                    onClick={() => {
                      if (c.openExtend != null) {
                        const f = g.roster.find((x) => x.id === c.openExtend);
                        dispatch({ type: "INBOX_REMOVE", messageId: m.id });
                        if (f) dispatch({ type: "SIGN_CONTRACT_PRE", fighter: f, mode: "extend", fighterId: f.id });
                        return;
                      }
                      dispatch({
                        type: "INBOX_EVENT", choiceIndex: i, messageId: m.id,
                        choice: c, gambleRoll: c.gamble ? random() : null,
                      });
                    }}
                  >
                    {c.label}
                  </Btn>
                ))}
              </div>
            )}
          </Panel>
        );
      })}
    </div>
  );
}

/* ---- Helper: single detail row ---- */
function Detail({ label, value, color = T.txt2 }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
      <span style={{ color: T.txt3 }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
