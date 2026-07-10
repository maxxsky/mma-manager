// Rivals domain — rival camp simulation, growth, poaching
import { R, RI, clamp, pick, fmt$, uid, random } from "../rng.js";
import { ATTRS } from "../data.js";
import { genFighter, assignAgent, genCoach } from "../fighter.js";

export function tickRivals(g) {
  if (!g || !g.rivals) return;
  if (!g.rivals) return;

  // Rival fight simulation: random matchups between rival camps every 12 weeks
  if (g.week % 12 === 0) {
    for (let i = 0; i < g.rivals.length; i++) {
      for (let j = i + 1; j < g.rivals.length; j++) {
        const a = g.rivals[i], b = g.rivals[j];
        const aF = a.fighters.filter(function(f) { return !f.injury; });
        const bF = b.fighters.filter(function(f) { return !f.injury; });
        if (aF.length > 0 && bF.length > 0 && random() < 0.6) {
          const fA = pick(aF), fB = pick(bF);
          const aWins = random() < 0.5;
          const winner = aWins ? fA : fB;
          const loser = aWins ? fB : fA;
          winner.record.w = (winner.record.w || 0) + 1;
          loser.record.l = (loser.record.l || 0) + 1;
          const winCamp = aWins ? a : b;
          const loseCamp = aWins ? b : a;
          winCamp.rep = clamp(winCamp.rep + 1, 2, 90);
          loseCamp.rep = clamp(loseCamp.rep - 1, 2, 90);
          if (random() < 0.3) {
            g.log.unshift("🥊 " + fA.name + " (" + a.name + ") vs " + fB.name + " (" + b.name + ") — " + winner.name + " menang!");
          }
        }
      }
    }
  }

  g.rivals.forEach((rc) => {
    rc.fighters.forEach((f) => {
      if (f.injury) { f.injury.weeks--; if (f.injury.weeks <= 0) f.injury = null; return; }
      ATTRS.forEach((k) => {
        const cap = f.ceilings[k];
        const gain =
          R(0.2, 0.7) * (f.age <= 26 ? 1.15 : 1) *
          (rc.traitData.spec === k ? rc.traitData.bonus : 1) * (1 + rc.rivalry * 0.003);
        f.attrs[k] = clamp(f.attrs[k] + gain, 0, cap);
      });
    });
    const scoutInterval = rc.trait === "Prospect Mill" ? 6 : 12;
    if (g.week - rc.lastScoutWeek >= scoutInterval && rc.fighters.length < 8) {
      const newF = assignAgent(genFighter(R(0.3, 0.7)));
      rc.fighters.push(newF);
      rc.lastScoutWeek = g.week;
      g.log.unshift(`👀 ${rc.name} merekrut ${newF.name} (${newF.archetype}, ${newF.weightClass}).`);
    }
    rc.fighters = rc.fighters.filter((f) => f.age < 40);
    rc.rivalry = clamp(rc.rivalry - 0.5, 0, 100);
    rc.rep = clamp(rc.rep + R(-1, 2), 2, 90);
    rc.cash += RI(5000, 20000);
    // Rivals spend accumulated cash on upgrades
    if (rc.cash > 80000 && random() < 0.15 && rc.coaches.length < 2) {
      rc.coaches.push(genCoach());
      rc.cash -= RI(20000, 40000);
      if (random() < 0.2) g.log.unshift("🏗️ " + rc.name + " hire coach baru.");
    } else if (rc.cash > 120000 && random() < 0.08) {
      rc.rep = clamp(rc.rep + RI(3, 7), 2, 90);
      rc.cash -= RI(50000, 80000);
      if (random() < 0.2) g.log.unshift("📈 " + rc.name + " upgrade fasilitas — rep naik.");
    }
    // Rival activity visible in log
    if (rc.rep > g.rep + 10 && g.week % 12 === 0) g.log.unshift(`📈 ${rc.name} rep ${Math.round(rc.rep)} — melewati camp kita!`);
    // Milestone: rival enters championship contention
    if (rc.rep >= 70 && !rc._milestoneChampNotified) {
      rc._milestoneChampNotified = true;
      g.inbox.unshift({ id: uid(), type: "event", title: `⭐ ${rc.name} — Championship Contender`, body: `${rc.name} has reached ${Math.round(rc.rep)} reputation. They are now a legitimate championship-level camp. Watch your back.`, choices: [{ label: "Noted", chem: 0 }] });
    }
    // Milestone: rival produces top-tier rep
    if (rc.rep >= 85 && !rc._milestoneEliteNotified) {
      rc._milestoneEliteNotified = true;
      g.inbox.unshift({ id: uid(), type: "event", title: `👑 ${rc.name} — Elite Camp`, body: `${rc.name} has reached elite status at ${Math.round(rc.rep)} reputation. They are now one of the top camps in the world.`, choices: [{ label: "Impressive", chem: 0 }] });
    }
  });

  // poaching
  if (g.week % 8 === 0 && g.roster.length > 0) {
    const r = pick(g.rivals);
    const available = g.roster.filter(
      (f) => !f.booked && !f.injury && f.morale < 70 &&
        f.contract && f.contract.fightsLeft > 0,
    );
    if (available.length > 0 && r.rivalry > 15) {
      const target = pick(available);
      const offerBonus = Math.round(target.asking * (1 + r.rivalry / 100));
      g.inbox.unshift({
        id: uid(), type: "event",
        title: `🚨 ${r.name} coba poach ${target.name}`,
        body: `${r.name} (rivalry ${Math.round(r.rivalry)}) mengirim tawaran ke ${target.name}: signing bonus ${fmt$(offerBonus)}, cut lebih kecil. Morale-nya rendah — dia mempertimbangkan.`,
        choices: [
          { label: "Tingkatkan bonus + naikkan cut 2%", counter: { fighterId: target.id, cost: offerBonus } },
          { label: "Biarkan dia pergi", letGo: target.id },
          { label: "Bicara langsung (chemistry check)", talk: target.id },
        ],
      });
      r.rivalry = clamp(r.rivalry - 5, 0, 100);
    }
  }

  if (g.week % 12 === 0 && g.coaches.length > 1) {
    const r = pick(g.rivals);
    if (r.rivalry > 50) {
      const nonFree = g.coaches.filter((c) => !c.freeUntil || g.week > c.freeUntil);
      if (nonFree.length > 0) {
        const tc = pick(nonFree);
        g.inbox.unshift({
          id: uid(), type: "event",
          title: `🦊 ${r.name} coba poach ${tc.name}`,
          body: `${tc.name} ditawari gaji ${fmt$(tc.salary * 2)} oleh ${r.name}. Kalau counter, harus naikkan gaji ke level itu.`,
          choices: [
            { label: `Naikkan gaji (${fmt$(tc.salary * 2)})`, coachPoach: { id: tc.id, newSalary: tc.salary * 2, rivalId: r.id } },
            { label: "Lepas — rekrut pengganti", coachLeave: tc.id },
          ],
        });
        r.rivalry = clamp(r.rivalry - 8, 0, 100);
      }
    }
  }
}
