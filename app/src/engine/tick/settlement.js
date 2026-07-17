// Settlement domain — monthly finances, coach growth, sponsor offers, fighter requests
import { RI, clamp, fmt$, uid, random } from "../rng.js";
import { SPONSOR_BRANDS, TRAINING } from "../data.js";
import { genCoach, weeklyFee } from "../fighter.js";
import { rankOf } from "../rankings.js";
import { tickRankings } from "./rankings.js";
import { computeMonthlyIncome, computeMonthlyExpense, FACILITY_MAINT_RATE } from "../economy.js";
import { pushInboxEvent } from "../events.js";
import { rollAddTalent, rollDiscoverTalent, pushTalentDiscoveryEvent } from "../talentPool.js";
import { getTrainingCycle, getDevelopmentPhilosophy } from "../training-philosophy.js";
import { genStaffCandidate } from "../data/staff.js";

const SPONSOR_RENEWAL_WINDOW = 4; // settlement cycle tersisa sebelum kontrak berakhir, saat tawaran perpanjangan muncul

export function tickSettlement(g) {
  if (!g || !g.roster) return;
  if (g.week % 4 !== 0) return;

  // ---------- monthly settlement ----------
  const { sponsorAmt, fSponsor, championBonus, merchRevenue, membershipRevenue } = computeMonthlyIncome(g);
  const { coachSal, maint, training, opCost, fighterSupport, total: monthlyExpense } = computeMonthlyExpense(g);
  g.cash += sponsorAmt + fSponsor + championBonus + merchRevenue + membershipRevenue - monthlyExpense;

  // Sponsor lifecycle: weeksLeft countdown, renewal window, expiry cleanup
  if (g.sponsors && g.sponsors.length > 0) {
    g.sponsors.forEach((sp) => {
      if (sp.weeksLeft != null) {
        sp.weeksLeft--;
        if (sp.weeksLeft === SPONSOR_RENEWAL_WINDOW) {
          g.inbox.unshift({
            id: uid(), type: "sponsor",
            title: `📋 Kontrak ${sp.brand} Segera Berakhir`,
            body: `Kontrak sponsor dengan ${sp.brand} akan berakhir sebentar lagi. Mereka menawarkan perpanjangan.`,
            choices: [
              { label: `Perpanjang (${fmt$(sp.rate)}/bln, sama seperti sekarang)`, sponsorRenew: { brand: sp.brand } },
              { label: "Biarkan berakhir", chem: 0 },
            ],
          });
        }
        if (sp.weeksLeft <= 0) {
          g.log.unshift(`📢 Kontrak ${sp.brand} berakhir — cari sponsor baru.`);
        }
      }
    });
    g.sponsors = g.sponsors.filter((sp) => sp.weeksLeft == null || sp.weeksLeft > 0);
  }
  // Chemistry shifts monthly: Team Player fighters boost it, Divas drain it,
  // Player's Coach personality gives flat +2 bonus.
  g.chemistry = clamp(
    g.chemistry +
      g.roster.filter((f) => f.traits.includes("Team Player")).length -
      g.roster.filter((f) => f.traits.includes("Diva")).length +
      (g.coaches.some((c) => c.personality === "Player's Coach") ? 2 : 0),
    0, 100,
  );
  g.log.unshift(
    `📊 Settlement bulanan: sponsor +${fmt$(sponsorAmt + fSponsor)}, merchandise +${fmt$(merchRevenue)}, membership +${fmt$(membershipRevenue)}, gaji coach -${fmt$(coachSal)}, maintenance -${fmt$(maint)}, biaya operasional -${fmt$(opCost + fighterSupport)}${championBonus > 0 ? `, champion bonus +${fmt$(championBonus)}` : ""}.`,
  );

  // Fighter equity deduction (fighters with camp equity %)
  g.roster.forEach((f) => {
    if (f.contract?.equity && f.contract.equity > 0) {
      const fighterCut = Math.round((sponsorAmt + fSponsor) * (f.contract.equity / 100));
      if (fighterCut > 0) {
        g.cash -= fighterCut;
        f.morale = clamp(f.morale + 2, 0, 100); // equity partner = happier
      }
    }
  });

  // Promoter relationship: natural decay + tier spillover
  if (g.promoterRel) {
    const tiers = ["Local", "Regional", "National", "Major", "Premier"];
    tiers.forEach((t) => {
      // Decay: lose 1-2 points if no fight in this tier for 12+ weeks
      const hasRecentFight = g.roster.some((f) => f.lastFightWeek && g.week - f.lastFightWeek <= 12 && g.log.some((l) => l.includes(t)));
      if (!hasRecentFight && g.promoterRel[t] > 15) {
        g.promoterRel[t] = clamp(g.promoterRel[t] - RI(1, 2), 5, 100);
      }
    });
    // Spillover: high rel at tier N helps tier N+1 slightly
    for (let i = 0; i < tiers.length - 1; i++) {
      if (g.promoterRel[tiers[i]] >= 70) {
        g.promoterRel[tiers[i + 1]] = clamp(g.promoterRel[tiers[i + 1]] + 0.5, 5, 100);
      }
    }
  }

  // Rivalry decay: reduce count for rivalries not seen in 52+ weeks
  g.roster.forEach((f) => {
    if (!f.rivalries) return;
    Object.keys(f.rivalries).forEach((key) => {
      const r = f.rivalries[key];
      if (g.week - (r.lastMeetingWeek || 0) >= 52) {
        r.count = Math.max(0, (r.count || 0) - 1);
        if (r.count <= 0) delete f.rivalries[key];
      }
    });
  });

  if (g.investors && g.investors.length > 0) {
    const totalEquity = g.investors.reduce((s, inv) => s + inv.equity, 0);
    const equityCut = Math.round((sponsorAmt + fSponsor) * (totalEquity / 100));
    if (equityCut > 0) {
      g.cash -= equityCut;
      g.log.unshift(`💰 ${totalEquity}% equity — investor potong ${fmt$(equityCut)} dari income.`);
    }
  }

  // Auto-expiry: remove informational messages (event/world/milestone) older than 8 weeks
  // with only a single "OK" choice (no consequences), but keep actionable messages intact.
  if (g.inbox) {
    g.inbox = g.inbox.filter((m) => {
      if (!m.createdWeek) return true; // legacy, no timestamp
      if (g.week - m.createdWeek < 8) return true; // not old enough
      if (m.type !== "event" && m.type !== "world" && m.type !== "milestone") return true;
      // Keep if it has actionable choices (more than 1, or non-OK choices)
      if (!m.choices || m.choices.length !== 1) return true;
      if (m.choices[0].label !== "OK") return true;
      // Has side effects (rep/cash/chem changes) — keep
      if (m.choices[0].rep || m.choices[0].cash || m.choices[0].chem) return true;
      return false; // remove
    });
  }

  // Coach market refresh: regenerated from scratch every month.
  // Previously listed coaches are lost — hire before month end.
  const marketSize = clamp(2 + Math.floor(g.rep / 15), 2, 7);
  const market = [];
  const alumniBonus = g.investments?.alumniNetwork ? 15 : 0;
  for (let i = 0; i < marketSize; i++) market.push(genCoach((g.rep || 0) + alumniBonus));
  g.coachMarket = market;

  // ── Staff market — refresh tiap settlement, mirror coachMarket ──
  if (!g.staffMarket) g.staffMarket = { cutman: [], nutritionist: [], sportsPsych: [] };
  ["cutman", "nutritionist", "sportsPsych"].forEach((role) => {
    const size = clamp(1 + Math.floor((g.rep || 0) / 20), 1, 3);
    g.staffMarket[role] = Array.from({ length: size }, () => genStaffCandidate(role, g.rep));
  });

  // Coach skill growth: +0.5/year for coaches with active fighters
  g.coaches.forEach((c) => {
    if (c.skill < 10 && g.roster.some((f) => !f.injury)) {
      c.skill = clamp(c.skill + 0.5, 1, 10);
      if (c.skill === Math.round(c.skill)) {
        c.salary = Math.round(c.salary * 1.05); // 5% raise per skill point
        g.log.unshift(`📈 ${c.name} naik ke skill ${Math.round(c.skill)} — gaji jadi ${fmt$(c.salary)}/bln.`);
      }
    }
  });

  // Sponsor offer generation
  const activeBrands = (g.sponsors || []).map((s) => s.brand);
  SPONSOR_BRANDS.forEach((brand) => {
    if (g.rep < brand.repReq) return;
    if (activeBrands.includes(brand.name)) return;
    if (g.sponsors && g.sponsors.length >= 3) return;
    const hasPending = g.inbox.some((m) => m.type === "sponsor" && m.sponsorBrand === brand.name);
    if (hasPending || random() > 0.08) return;
    g.inbox.unshift({
      id: uid(), type: "sponsor", expires: 4,
      sponsorBrand: brand.name,
      title: `📢 Tawaran Sponsor: ${brand.name}`,
      body: `${brand.icon} ${brand.name} (${brand.type}) tertarik bekerja sama dengan camp-mu. Pilih skema pembayaran:`,
      terms: ["placement", "royalty"],
      choices: [
        { label: `Placement: ${fmt$(brand.baseRate)}/bln`, sponsorAccept: { brand: brand.name, terms: "placement", rate: brand.baseRate, weeksLeft: 48 } },
        { label: `Royalty ~${fmt$(Math.round(brand.baseRate * 0.6))}/bln + bonus`, sponsorAccept: { brand: brand.name, terms: "royalty", rate: Math.round(brand.baseRate * 0.6), weeksLeft: 48 } },
        { label: "Tolak", sponsorReject: true },
      ],
    });
  });

  // ── Exclusivity contract offers ──
  g.roster.forEach((f) => {
    if (f.promotionContract) return;
    if (!f.promotionFightCounts) return;
    const eligiblePromo = g.promotions?.find((p) => {
      const count = f.promotionFightCounts[p.id] || 0;
      return count >= 2 && (g.promoterRel?.[p.tier] || 0) >= 60;
    });
    if (eligiblePromo && !g.inbox.some((m) => m.promotionContractOffer === eligiblePromo.id && m.fighterId === f.id)) {
      const fights = RI(3, 5);
      const bonus = 0.15 + RI(0, 10) * 0.01;
      g.inbox.unshift({
        id: uid(), type: "offer", fighterId: f.id, expires: 6,
        promotionContractOffer: eligiblePromo.id,
        promotionName: eligiblePromo.name,
        tier: eligiblePromo.tier,
        title: `📝 Exclusive Contract Offer — ${eligiblePromo.name}`,
        body: `${eligiblePromo.name} menawarkan kontrak eksklusif ${fights} fight dengan bonus purse ${Math.round(bonus * 100)}% per fight.`,
        choices: [
          { label: `Terima (${fights} fights, +${Math.round(bonus * 100)}% purse)`, promotionSign: { promotionId: eligiblePromo.id, fightsTotal: fights, purseBonus: bonus } },
          { label: "Tolak", chem: 0 },
        ],
      });
    }
  });

  tickRankings(g);

  // ---------- monthly ambition + fighter requests ----------
  // Ambition strings are AMBITION_KEYS from data/traits.js (Belt Chaser, Paycheck, Legacy, Family Man, Grinder, Star Power)
  g.roster.forEach((f) => {
    const r = rankOf(g, f);
    if (f.ambition === "Belt Chaser") {
      if (r) {
        f.morale = clamp(f.morale + 3, 0, 100);
      } else if (f.record.w >= 4) {
        f.morale = clamp(f.morale - 3, 0, 100);
        if (!g.inbox.some((m) => m.beltChaserMsg === f.id)) {
          pushInboxEvent(g, { type: "event", beltChaserMsg: f.id, title: `${f.name} frustrasi`, body: `${f.name} sudah ${f.record.w} menang tapi belum dapat kesempatan title — morale turun.`, choices: [{ label: "Janji cari title shot", chem: 0 }] });
        }
      }
    }
    if (f.ambition === "Star Power" && f.popularity < 30) {
      f.morale = clamp(f.morale - 2, 0, 100);
      if (!g.inbox.some((m) => m.starPowerMsg === f.id)) {
        pushInboxEvent(g, { type: "event", starPowerMsg: f.id, title: `${f.name} kurang sorotan`, body: `${f.name} ingin jadi bintang tapi popularitas masih ${Math.round(f.popularity)}.`, choices: [{ label: "Cari exposure", chem: 0 }] });
      }
    }

    if (f.contract) {
      // Duration expiry: contract time runs out regardless of fights left
      const contractAge = g.week - (f.contract.signedWeek || f.joinedWeek || 0);
      if (contractAge >= f.contract.durationMo * 4 && !g.inbox.some((m) => m.durationExpiredId === f.id)) {
        g.inbox.unshift({
          id: uid(), type: "event", durationExpiredId: f.id,
          title: `${f.name} — kontrak habis (durasi)`,
          body: `Kontrak ${f.name} sudah berjalan ${f.contract.durationMo} bulan. Dia kini free agent — perpanjang atau lepas.`,
          choices: [
            { label: "Negosiasi perpanjangan", openExtend: f.id },
            { label: "Lepas (jadi free agent)", release: f.id },
          ],
        });
      }
    }

    if (
      f.contract && f.contract.fightsLeft <= 0 &&
      !g.inbox.some((m) => m.extendFighterId === f.id)
    ) {
      g.inbox.unshift({
        id: uid(), type: "event", extendFighterId: f.id,
        title: `${f.name} — kontrak habis`,
        body: `Fight commitment ${f.name} sudah terpenuhi. Dia kini free agent — perpanjang kontrak atau lepas.`,
        choices: [
          { label: "Negosiasi perpanjangan", openExtend: f.id },
          { label: "Lepas (jadi free agent)", release: f.id },
        ],
      });
    }

    const rr = rankOf(g, f);
    if (
      f.contract && !f.contract.renegoFlagged && f.contract.fightsLeft > 0 &&
      ((rr != null && rr <= 10) || f.traits.includes("Diva"))
    ) {
      f.contract.renegoFlagged = true;
      const why = rr != null && rr <= 10 ? `masuk Top 10 (rank #${rr})` : "trait Diva";
      g.inbox.unshift({
        id: uid(), type: "event", extendFighterId: f.id,
        title: `${f.name} minta renegosiasi`,
        body: `${f.name} menuntut kontrak baru karena ${why}. Kalau diabaikan, morale-nya turun.`,
        choices: [
          { label: "Buka renegosiasi", openExtend: f.id },
          { label: "Tolak (morale -8)", moraleTo: { id: f.id, amt: -8 } },
        ],
      });
    }

    if (f.morale < 20 && !g.inbox.some((m) => m.releaseFighterId === f.id)) {
      // Retention bonus scales with fighter's weekly fee (more valuable = more expensive to retain)
      const fee = weeklyFee(f);
      const bonus = Math.round(fee * RI(4, 10));
      g.inbox.unshift({
        id: uid(), type: "event", releaseFighterId: f.id,
        title: `${f.name} minta release`,
        body: `Morale sangat rendah (${Math.round(f.morale)}). Dia merasa tidak berkembang dan ingin keluar dari camp.`,
        choices: [
          { label: "Kabulkan release", release: f.id },
          { label: `Bonus retensi ${fmt$(bonus)}`, cash: -bonus, moraleTo: { id: f.id, amt: 30 } },
          { label: "Abaikan", chem: -5 },
        ],
      });
    }

    // ── Training Review — nudge saat fase training berubah ke sesuatu actionable ──
    if (!f.injury && !(f.booked && f.booked.weeksLeft <= 2)) {
      const cycle = getTrainingCycle(f);
      const actionablePhases = ["warning", "recovery", "refinement", "maintenance", "veteran"];
      if (actionablePhases.includes(cycle.phase) && f.lastReviewedPhase !== cycle.phase) {
        f.lastReviewedPhase = cycle.phase;
        const philosophies = getDevelopmentPhilosophy(f);
        const rec = (cycle.phase === "warning" || cycle.phase === "recovery")
          ? "recovery"
          : philosophies[0]?.rec;
        const reason = philosophies[0]?.desc || cycle.desc;
        const choices = [];
        if (rec && rec !== f.training?.type) {
          const recLabel = TRAINING[rec]?.label || rec;
          choices.push({ label: `Ganti ke ${recLabel}`, applyTrainingRec: { fighterId: f.id, program: rec } });
        }
        choices.push({ label: "Pertahankan training sekarang", chem: 0 });
        g.inbox.unshift({
          id: uid(), type: "event",
          title: `${cycle.icon} ${f.name}: ${cycle.label}`,
          body: reason,
          choices,
        });
      }
    }
  }); // closes g.roster.forEach

  // ── Hidden talent pool — generate from membership, discover by coach ──
  if (!g.talentPool) g.talentPool = [];
  rollAddTalent(g);
  const discovered = rollDiscoverTalent(g);
  if (discovered) {
    pushTalentDiscoveryEvent(g, discovered);
    g.log.unshift(`🏋️ ${discovered.name} ditemukan coach di kelas reguler.`);
  }
}
