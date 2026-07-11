// Momentum event generator — winning streak → sponsorship interest
import { random } from "../../rng.js";
import { PROB_MOMENTUM_SPONSOR } from "../config.js";

export function generateMomentumEvents(ctx) {
  const events = [];
  if (!ctx.isWinningMomentum || random() >= PROB_MOMENTUM_SPONSOR) return events;
  if (ctx.checkCooldown("momentum")) return events;

  events.push({
    title: "Sponsor tertarik",
    body: "Rentetan kemenangan camp ini menarik perhatian brand besar. Mereka ingin meeting.",
    choices: [
      { label: "Jadwalkan meeting (chemistry boost)", chem: 3 },
      { label: "Fokus ke pertarungan dulu", chem: 1 },
    ],
  });
  ctx.markCooldown("momentum");
  return events;
}
