// Coach handlers — salary, resign chance, leave
import { clamp, random } from "../../rng.js";
import { onCoachRaiseDenied } from "../../events.js";

export function registerCoachHandlers(register) {
  register("coachSalary", ({ g, c }) => {
    const coach = g.coaches.find((x) => x.id === c.coachSalary.id);
    if (!coach) return;
    coach.salary = c.coachSalary.amt;
    coach.lastRaiseWeek = g.week;
    g.log.unshift("💰 Coach dinaikkan gajinya.");
  });

  register("coachResignChance", ({ g, c }) => {
    const coach = g.coaches.find((x) => x.id === c.coachResignChance.id);
    if (coach) {
      const c2 = c.coachResignChance;
      onCoachRaiseDenied(g, coach);
      if (random() < c2.chance) {
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
