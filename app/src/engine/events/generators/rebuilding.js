// Rebuilding event generator — veteran mentoring rookies
import { random, pick } from "../../rng.js";
import { PROB_REBUILD_MENTOR } from "../config.js";

export function generateRebuildingEvents(ctx) {
  const events = [];
  if (!ctx.isRebuilding || !ctx.anyVeteran || random() >= PROB_REBUILD_MENTOR) return events;

  const vet = ctx.pickVeteran();
  const rook = ctx.pickRookie(vet?.id);
  if (vet && rook) {
    events.push({
      title: `${vet.name} mentors ${rook.name}`,
      body: `${vet.name} terlihat melatih ${rook.name} ekstra setelah jam latihan. Chemistry camp membaik.`,
      choices: [
        { label: "Dorong mentorship", chem: 4 },
        { label: "Biarkan alami", chem: 2 },
      ],
    });
  }
  return events;
}
