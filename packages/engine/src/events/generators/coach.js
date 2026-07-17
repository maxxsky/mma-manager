// Coach event generator — delayed consequence: coach ultimatum
import { getMemory, setFlag, hasFlag } from "../../events.js";
import { COACH_RAISE_DENIED_MAX } from "../config.js";

export function generateCoachEvents(g, ctx) {
  const events = [];
  ctx.coaches?.forEach((c) => {
    if (getMemory(c, "raise_denied") >= COACH_RAISE_DENIED_MAX && !hasFlag(c, "coach_upset")) {
      setFlag(c, "coach_upset");
      events.push({
        title: `${c.name} ultimatum`,
        body: `${c.name} sudah 3 kali ditolak kenaikan gaji. Dia memberi ultimatum: naikkan atau dia pergi.`,
        choices: [
          { label: `Naikkan gaji (+40%)`, coachSalary: { id: c.id, amt: Math.round(c.salary * 1.4) } },
          { label: "Lepas", coachLeave: c.id },
        ],
      });
    }
  });
  return events;
}
