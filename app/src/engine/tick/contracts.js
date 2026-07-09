// Contracts domain — expiry, renegotiation, release, retirement, weight class change
import { clamp, RI, R, random, pick, fmt$, uid } from "../rng.js";
import { rankOf, vacateTitle } from "../rankings.js";
import { WEIGHTS, AMBITIONS } from "../data.js";
import { avgSkill } from "../fighter.js";

export function tickContracts(g) {
  g.roster.forEach((f) => {
    // Ambition effects
    const r = rankOf(g, f);
    if (f.ambition === "Belt Chaser") {
      if (r) f.morale = clamp(f.morale + 3, 0, 100);
      else if (f.record.w >= 4) f.morale = clamp(f.morale - 3, 0, 100);
    }
    if (f.ambition === "Star Power" && f.popularity < 30) {
      f.morale = clamp(f.morale - 2, 0, 100);
    }

    if (!f.contract) return;

    // Duration expiry
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

    // Fight commitment expiry
    if (f.contract.fightsLeft <= 0 && !g.inbox.some((m) => m.extendFighterId === f.id)) {
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

    // Renegotiation demand
    if (!f.contract.renegoFlagged && f.contract.fightsLeft > 0 && ((r != null && r <= 10) || f.traits?.includes("Diva"))) {
      f.contract.renegoFlagged = true;
      const why = r != null && r <= 10 ? `masuk Top 10 (rank #${r})` : "trait Diva";
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

    // Low morale release
    if (f.morale < 20 && !g.inbox.some((m) => m.releaseFighterId === f.id)) {
      const fee = (f.contract.managerCut || 0.18) * 50000;
      const bonus = Math.round(Math.max(2000, fee * 0.1));
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
  });

  // Yearly: age, retirement, chin decay
  if (g.week % 48 === 0) {
    g.roster.forEach((f) => {
      f.age++;
      f.fightsThisYear = 0;
      if (f.age >= 37) f.attrs.chin = clamp(f.attrs.chin - 3, 10, 99);
      else if (f.age >= 34) f.attrs.chin = clamp(f.attrs.chin - 2, 10, 99);
      else if (f.age >= 31) f.attrs.chin = clamp(f.attrs.chin - 1, 10, 99);

      if (f.age >= 36 && !g.inbox.some((m) => m.retireFighterId === f.id)) {
        const p = (f.age - 35) * 0.15 + ((f.streakL || 0) >= 3 ? 0.3 : 0);
        if (random() < p) {
          g.inbox.unshift({
            id: uid(), type: "event", retireFighterId: f.id,
            title: `${f.name} mempertimbangkan pensiun`,
            body: `Usia ${f.age}, ${f.streakL || 0} kekalahan beruntun. Dia datang ke kantormu untuk bicara soal masa depannya.`,
            choices: [
              { label: "Hormati pensiun (rep +3)", retire: f.id },
              { label: "Bujuk satu run lagi", convince: f.id },
              { label: "Jadikan coach", toCoach: f.id },
            ],
          });
        }
      }
    });
  }
}
