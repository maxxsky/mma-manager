import { fmt$ } from "../engine/rng.js";
import React from "react";
import { T, Panel, Eyebrow, Tag } from "./theme.jsx";
import { t } from "../i18n/index.js";
import { weeklyFee } from "../engine/fighter.js";
import { TRAINING } from "../engine/data.js";

/* =============================================================================
   FINANCE — Ironfist Edition
   P&L summary: income breakdown, expense breakdown, net monthly, cash reserve.
============================================================================= */

export default function Finance({ g }) {
  // ── Income breakdown ──────────────────────────────────────────
  const feeTotal = g.roster.reduce((s, f) => s + weeklyFee(f) * 4, 0);
  const popTotal = g.roster.reduce((s, f) => s + f.popularity * 150, 0);
  const baseSponsor = Math.round(g.rep * 500);
  const sponsorIncome =
    g.sponsors && g.sponsors.length > 0
      ? g.sponsors.reduce((s, sp) => s + (sp.rate || 0), 0)
      : baseSponsor;
  const merchTotal = Math.round(g.roster.reduce((s, f) => s + f.popularity * 80, 0));

  const totalIncome = sponsorIncome + popTotal + feeTotal + merchTotal;

  // ── Expense breakdown ─────────────────────────────────────────
  const coachSal = g.coaches.reduce(
    (s, c) => s + (!c.freeUntil || g.week > c.freeUntil ? c.salary : 0),
    0
  );
  const facVal = Object.values(g.facilities).reduce((s, l) => s + l * 30000, 0);
  const maint = Math.round(facVal * 0.05);
  const trainingCost = g.roster.reduce(
    (s, f) =>
      s + (f.injury ? 0 : TRAINING[f.booked ? "fightcamp" : f.training.type].cost * 4),
    0
  );

  const totalExpense = coachSal + maint + trainingCost;
  const netMonthly = totalIncome - totalExpense;

  // ── Mini components (inline — not exported) ──
  const Row = ({ label, value, color, detail }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0",
      borderBottom: `1px solid ${T.line}33` }}>
      <span style={{ fontFamily: T.body, fontSize: 12, color: T.txt2 }}>{label}</span>
      <span style={{ textAlign: "right" }}>
        <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color: color || T.txt }}>{fmt$(value)}</span>
        {detail && <div style={{ fontFamily: T.body, fontSize: 9, color: T.txt3 }}>{detail}</div>}
      </span>
    </div>
  );
  const TotalRow = ({ label, value, color }) => (
    <div style={{ padding: "4px 0", textAlign: "right" }}>
      <span style={{ fontFamily: T.body, fontSize: 11, color: T.txt3 }}>{label} </span>
      <span style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color }}>{fmt$(value)}</span>
    </div>
  );

  // ── Runway calculation ────────────────────────────────────────
  const runway =
    netMonthly < 0 ? Math.floor(g.cash / Math.abs(netMonthly)) : null;
  const bankruptcyThreshold = -50000;

  return (
    <div>
      {/* ── P&L SUMMARY CARD ─────────────────────────────────── */}
      <Panel style={{ marginBottom: 14 }}>
        <Eyebrow color={T.gold}>{t("UI.monthlyCashFlow")}</Eyebrow>

        {/* Income section */}
        <SectionHeader label={t("UI.income")} color={T.pos} />
        <Row
          label={t("SPONSOR.placement")}
          value={sponsorIncome}
          color={T.pos}
          detail={
            g.sponsors && g.sponsors.length > 0
              ? `${g.sponsors.length} active brand${g.sponsors.length !== 1 ? "s" : ""}`
              : `rep-based (rep ${g.rep})`
          }
        />
        <Row
          label="Merchandise"
          value={merchTotal}
          color={T.pos}
          detail="fighter-branded merch sales"
        />
        <Row
          label="Fighter Popularity"
          value={popTotal}
          color={T.pos}
          detail={`${g.roster.length} fighter${g.roster.length !== 1 ? "s" : ""}`}
        />
        <Row
          label="Training Fees"
          value={feeTotal}
          color={T.pos}
          detail="weekly fighter contributions"
        />
        <TotalRow label={t("UI.income") + " Total"} value={totalIncome} color={T.pos} />

        <div style={{ marginTop: 4 }} />

        {/* Expense section */}
        <SectionHeader label={t("UI.expense")} color={T.neg} />
        <Row
          label="Coach Salaries"
          value={coachSal}
          color={T.neg}
          detail={`${g.coaches.length} coach${g.coaches.length !== 1 ? "es" : ""}`}
        />
        <Row
          label="Facility Maintenance"
          value={maint}
          color={T.neg}
          detail={`assets valued at ${fmt$(facVal)}`}
        />
        <Row
          label="Training Costs"
          value={trainingCost}
          color={T.neg}
          detail={`${g.roster.filter((f) => !f.injury).length} active fighter${g.roster.filter((f) => !f.injury).length !== 1 ? "s" : ""}`}
        />
        <TotalRow label={t("UI.expense") + " Total"} value={totalExpense} color={T.neg} />

        {/* Net */}
        <div
          style={{
            marginTop: 12,
            padding: "12px 0",
            borderTop: `2px solid ${T.gold}44`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span style={{ fontSize: 12, color: T.txt3, letterSpacing: 1, textTransform: "uppercase", fontWeight: 600 }}>
            {t("UI.netPerMonth")}
          </span>
          <span
            style={{
              fontFamily: T.mono,
              fontSize: 22,
              fontWeight: 700,
              color: netMonthly >= 0 ? T.pos : T.neg,
            }}
          >
            {netMonthly >= 0 ? "+" : ""}
            {fmt$(netMonthly)}
          </span>
        </div>
      </Panel>

      {/* ── CASH RESERVE CARD ────────────────────────────────── */}
      <Panel style={{ marginBottom: 14 }}>
        <Eyebrow color={T.gold}>{t("UI.cashReserve")}</Eyebrow>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span
            style={{
              fontFamily: T.mono,
              fontSize: 32,
              fontWeight: 700,
              color: g.cash >= 0 ? T.gold : T.neg,
              letterSpacing: 1,
            }}
          >
            {fmt$(g.cash)}
          </span>
          <div style={{ textAlign: "right" }}>
            {runway !== null && (
              <div style={{ fontSize: 12, color: T.warn }}>
                {t("UI.runway")}: {runway} month{runway !== 1 ? "s" : ""}
              </div>
            )}
            <div style={{ fontSize: 11, color: T.txt3 }}>
              {t("UI.bankruptAt")} &lt; {fmt$(bankruptcyThreshold)}
            </div>
          </div>
        </div>

        {/* Gauge: how close to bankruptcy */}
        <div style={{ marginTop: 10 }}>
          <div style={{ position: "relative", height: 6, background: T.bg, borderRadius: 3 }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${Math.max(0, Math.min(100, ((g.cash - bankruptcyThreshold) / (Math.abs(bankruptcyThreshold) + g.cash + 100000)) * 100))}%`,
                background: g.cash > 0 ? T.pos : g.cash > bankruptcyThreshold ? T.warn : T.neg,
                borderRadius: 3,
              }}
            />
            {/* Bankruptcy marker */}
            <div
              style={{
                position: "absolute",
                top: -2,
                height: 10,
                width: 2,
                left: "0%",
                background: T.neg,
                borderRadius: 1,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: T.txt3, marginTop: 3 }}>
            <span>{fmt$(bankruptcyThreshold)}</span>
            <span>Bankrupt</span>
            <span>$0</span>
          </div>
        </div>
      </Panel>

      {/* ── INCOME SPLIT VISUAL ───────────────────────────────── */}
      <Panel style={{ marginBottom: 14 }}>
        <Eyebrow color={T.txt2}>{t("UI.incomeSplit")}</Eyebrow>
        {totalIncome > 0 ? (
          <div>
            <SplitBar
              label={t("SPONSOR.placement")}
              value={sponsorIncome}
              total={totalIncome}
              color={T.steel}
            />
            <SplitBar
              label={t("UI.popularity")}
              value={popTotal}
              total={totalIncome}
              color={T.pos}
            />
            <SplitBar
              label="Training Fees"
              value={feeTotal}
              total={totalIncome}
              color={T.gold}
            />
          </div>
        ) : (
          <div style={{ color: T.txt3, fontSize: 12 }}>{t("UI.noEventsHint")}</div>
        )}
      </Panel>

      {/* ── EXPENSE SPLIT VISUAL ──────────────────────────────── */}
      <Panel>
        <Eyebrow color={T.txt2}>{t("UI.expenseSplit")}</Eyebrow>
        {totalExpense > 0 ? (
          <div>
            <SplitBar
              label="Coach Salaries"
              value={coachSal}
              total={totalExpense}
              color={T.neg}
            />
            <SplitBar
              label={t("FAC.mats") + " " + t("UI.upgrade")}
              value={maint}
              total={totalExpense}
              color={T.warn}
            />
            <SplitBar
              label="Training"
              value={trainingCost}
              total={totalExpense}
              color={T.ember}
            />
          </div>
        ) : (
          <div style={{ color: T.txt3, fontSize: 12 }}>{t("UI.noEventsHint")}</div>
        )}
      </Panel>
    </div>
  );
}

/* ---- Helpers ---- */

function SectionHeader({ label, color }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 1.2,
        textTransform: "uppercase",
        color,
        marginBottom: 8,
        marginTop: 4,
      }}
    >
      {label}
    </div>
  );
}

function Row({ label, value, color = T.txt, detail }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: `1px solid ${T.line}33`,
      }}
    >
      <span style={{ fontSize: 12, color: T.txt }}>
        {label}
        {detail && (
          <span style={{ fontSize: 10, color: T.txt3, marginLeft: 6 }}>{detail}</span>
        )}
      </span>
      <span style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 700, color }}>
        {fmt$(value)}
      </span>
    </div>
  );
}

function TotalRow({ label, value, color }) {
  return (
    <div style={{ padding: "4px 0", display: "flex", justifyContent: "flex-end" }}>
      <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 700, color }}>
        {fmt$(value)}
      </span>
    </div>
  );
}

function Detail({ label, value, color = T.txt2 }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
      <span style={{ color: T.txt3 }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function SplitBar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 11, color: T.txt2 }}>{label}</span>
        <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color }}>
          {fmt$(value)} · {pct}%
        </span>
      </div>
      <div style={{ position: "relative", height: 6, background: T.bg, borderRadius: 3 }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${pct}%`,
            background: color,
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
}
