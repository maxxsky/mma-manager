// Tension event generator — internal conflict events
import { random, pick } from "../../rng.js";
import { PROB_TENSION } from "../config.js";

export function generateTensionEvents(ctx) {
  const events = [];
  if (!ctx.isInternalTension || random() >= PROB_TENSION || ctx.rosterSize < 2) return events;
  if (ctx.checkCooldown("tension")) return events;

  const [a, b] = ctx.pickRandomPair();
  if (a && b) {
    events.push({
      title: "Ketegangan memuncak",
      body: `Situasi di camp sudah tegang selama berminggu-minggu. ${a.name} dan ${b.name} nyaris berkelahi di ruang ganti.`,
      choices: [
        { label: "Mediasi darurat ($1,000)", cash: -1000, chem: 3 },
        { label: "Pisahkan mereka", chem: 1, moraleTo: { id: a.id, amt: -3 } },
      ],
    });
    ctx.markCooldown("tension");
  }
  return events;
}
