// Fighter event generator — delayed consequence: fighter frustration
import { getMemory, setFlag, hasFlag } from "../../events.js";
import { FIGHTER_COMPLAINT_MAX, FIGHTER_COMPLAINT_MORALE_MAX } from "../config.js";

export function generateFighterEvents(g, ctx) {
  const events = [];
  ctx.roster?.forEach((f) => {
    if (getMemory(f, "complaint_ignored") >= FIGHTER_COMPLAINT_MAX && f.morale < FIGHTER_COMPLAINT_MORALE_MAX && !hasFlag(f, "fighter_frustrated")) {
      setFlag(f, "fighter_frustrated");
      events.push({
        title: `${f.name} frustrasi`,
        body: `${f.name} merasa diabaikan setelah 3 kali komplain. Dia mulai bicara dengan camp lain.`,
        choices: [
          { label: "Minta maaf + bonus ($3,000)", cash: -3000, moraleTo: { id: f.id, amt: 20 } },
          { label: "Lepas", release: f.id },
        ],
      });
    }
  });
  return events;
}
