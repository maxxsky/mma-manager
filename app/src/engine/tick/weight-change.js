// Weight class change domain — fighter-driven weight class movement
import { uid, random } from "../rng.js";
import { WEIGHTS } from "../data.js";
import { rankOf } from "../rankings.js";

export function tickWeightChange(g) {
  if (g.week % 12 !== 0) return;

  g.roster.forEach((f) => {
    if (f.injury || f.booked) return;
    if (f.lastClassChange && g.week - f.lastClassChange < 48) return;

    const div = g.divisions[f.weightClass];
    const wcIdx = WEIGHTS.findIndex((w) => w.name === f.weightClass);
    const streakW = f.record.w > 0 && f.streakL === 0 ? f.record.w : 0;
    const r = rankOf(g, f);
    const isChamp = div && div.champ.player && div.champ.fighterId === f.id;

    let direction = null;
    let reason = "";
    let chance = 0;

    // Move DOWN triggers
    if (f.streakL >= 3 && wcIdx > 0) {
      direction = "down";
      reason = `${f.streakL} kekalahan beruntun`;
      chance = 25;
      if (f.ambition === "Family Man") chance = 50;
      if (f.ambition === "Paycheck") chance = 35;
    }
    if (f.age >= 34 && (f.streakL >= 1 || (r && r > 10)) && wcIdx > 0 && !direction) {
      direction = "down";
      reason = `usia ${f.age} + performa menurun`;
      chance = 30;
    }

    // Move UP triggers
    if (!isChamp && streakW >= 4 && wcIdx < WEIGHTS.length - 1 && !direction) {
      direction = "up";
      reason = `${streakW} kemenangan beruntun`;
      chance = 20;
      if (f.ambition === "Belt Chaser") chance = 50;
      if (f.ambition === "Legacy") chance = 45;
    }
    if (isChamp && f.titles.filter((t) => t.includes("Champion")).length >= 3 && wcIdx < WEIGHTS.length - 1 && !direction) {
      direction = "up";
      reason = "sudah mendominasi divisi — cari tantangan baru";
      chance = 35;
      if (f.ambition === "Legacy") chance = 70;
    }
    if (!isChamp && r && r <= 3 && div && div.champ.fighterId && wcIdx < WEIGHTS.length - 1 && !direction) {
      const champ = g.roster.find((x) => x.id === div.champ.fighterId);
      if (champ && champ.injury && champ.injury.weeks >= 12) {
        direction = "up";
        reason = `juara ${f.weightClass} cedera panjang — cari peluang di atas`;
        chance = 30;
        if (f.ambition === "Belt Chaser") chance = 55;
      }
    }

    if (direction && random() * 100 < chance) {
      const targetIdx = direction === "down" ? wcIdx - 1 : wcIdx + 1;
      const targetClass = WEIGHTS[targetIdx].name;
      const isUp = direction === "up";
      const moraleEffect = isUp ? 8 : -5;

      g.inbox.unshift({
        id: uid(), type: "event", expires: 4, classChange: { fighterId: f.id, targetClass, targetIdx, isUp, moraleEffect },
        title: `⚖️ ${f.name} minta pindah ke ${targetClass}`,
        body: `${f.name} ingin ${isUp ? "naik" : "turun"} ke ${targetClass}. Alasan: ${reason}. ${isUp ? "Dia percaya diri menghadapi tantangan lebih besar." : "Dia merasa perlu lawan yang lebih ringan untuk bangkit."}`,
        choices: [
          { label: `${isUp ? "⬆ Naik" : "⬇ Turun"} ke ${targetClass}`, classChangeAccept: { fighterId: f.id, targetClass, targetIdx, oldClass: f.weightClass, isUp, moraleEffect } },
          { label: "Tolak — tetap di kelas saat ini", classChangeReject: { fighterId: f.id, moralePenalty: isUp ? -10 : -5 } },
        ],
      });
    }
  });
}
