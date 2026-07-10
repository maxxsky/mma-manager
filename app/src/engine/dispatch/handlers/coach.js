// Coach handlers — salary, poach counter, resign chance, leave
import { clamp } from "../../rng.js";
import { onCoachRaiseDenied } from "../../events.js";

export function registerCoachHandlers(register) {
  register("coachSalary", ({ g, c }) => {
    const coach = g.coaches.find((x) => x.id === c.coachSalary.id);
    if (!coach) return;
    coach.salary = c.coachSalary.amt;
    coach.lastRaiseWeek = g.week;
    g.log.unshift("💰 Coach dinaikkan gajinya.");
  });

  register("coachPoach", ({ g, c }) => {
    const coach = g.coaches.find((x) => x.id === c.coachPoach.id);
    if (!coach) return;
    if (g.cash >= c.coachPoach.newSalary * 4) {
      coach.hiredWeek = g.week;
      coach.salary = c.coachPoach.newSalary;
      g.cash -= c.coachPoach.newSalary * 4;
      if (g.rivals) { const riv = g.rivals.find((x) => x.id === c.coachPoach.rivalId); if (riv) riv.rivalry = clamp(riv.rivalry + 10, 0, 100); }
      g.log.unshift(`🛡️ ${coach.name} dipertahankan — gaji naik.`);
    } else {
      g.coaches = g.coaches.filter((x) => x.id !== c.coachPoach.id);
      g.chemistry = clamp(g.chemistry - 8, 0, 100);
      g.log.unshift("🦊 Coach pergi ke rival.");
    }
  });

  register("coachResignChance", ({ g, c }) => {
    const coach = g.coaches.find((x) => x.id === c.coachResignChance.id);
    if (coach) {
      const c2 = c.coachResignChance;
      onCoachRaiseDenied(g, coach);
      if (Math.random() < c2.chance) {
        g.coaches = g.coaches.filter((x) => x.id !== coach.id);
        g.chemistry = clamp(g.chemistry - 8, 0, 100);
        g.log.unshift(`👋 ${coach.name} resign.`);
      }
    }
  });

  register("coachLeave", ({ g, c }) => {
    g.coaches = g.coaches.filter((x) => x.id !== c.coachLeave);
    g.chemistry = clamp(g.chemistry - 8, 0, 100);
  });
}
