// Yearly domain — aging, retirement, fight inactivity
import { clamp, uid, random } from "../rng.js";
import { FAC_LABEL } from "../data.js";

export function tickYearly(g) {
  if (!g || !g.roster) return;
  if (g.week % 48 !== 0) return;

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

  g.roster.forEach((f) => {
    if (f.injury || f.booked || (f.contract && f.contract.fightsLeft <= 0)) return;
    const weeksSinceFight = g.week - (f.lastFightWeek || 0);
    if (weeksSinceFight > 24 && !g.inbox.some((m) => m.fightRequestId === f.id)) {
      g.inbox.unshift({
        id: uid(), type: "event", fightRequestId: f.id,
        title: `🗣️ ${f.name} — minta fight lagi`,
        body: `${f.name} sudah ${Math.floor(weeksSinceFight / 4)} bulan tanpa fight. Dia resah dan siap bertarung.`,
        choices: [
          { label: "Janji cari fight (morale +3)", fightPromise: f.id },
          { label: "Sabar — timing belum tepat", moraleTo: { id: f.id, amt: -3 } },
        ],
      });
    }
    const avgFac = Object.values(g.facilities).reduce((s, v) => s + v, 0) / 4;
    if (
      avgFac < 2 && f.morale > 30 && random() < 0.15 &&
      !g.inbox.some((m) => m.complainId === f.id)
    ) {
      const weak = Object.entries(g.facilities).sort((a, b) => a[1] - b[1])[0];
      g.inbox.unshift({
        id: uid(), type: "event", complainId: f.id,
        title: `😤 ${f.name} — komplain fasilitas`,
        body: `${f.name} mengeluh ${FAC_LABEL[weak[0]]} (level ${weak[1]}) kurang memadai. Dia minta upgrade.`,
        choices: [
          { label: "Janji upgrade (morale +4)", upgradePromise: { fighterId: f.id, fac: weak[0] } },
          { label: "Bilang bersabar dulu", moraleTo: { id: f.id, amt: -4 } },
        ],
      });
    }
  });
}
