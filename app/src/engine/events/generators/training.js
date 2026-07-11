// Training event generator — camp-wide overtraining/injury crisis
import { random } from "../../rng.js";
import { PROB_TRAINING_CRISIS } from "../config.js";

export function generateTrainingEvents(ctx) {
  const events = [];
  if (!ctx.isTrainingCrisis || random() >= PROB_TRAINING_CRISIS) return events;
  if (ctx.checkCooldown("training_crisis")) return events;

  events.push({
    title: "⚠️ Overtraining Merajalela",
    body: "Banyak fighter kelelahan dan cedera bersamaan — jadwal latihan kelewat berat.",
    choices: [
      { label: "Kurangi intensitas seminggu (chemistry +2)", chem: 2 },
      { label: "Push terus — target lebih penting (chemistry -2)", chem: -2 },
    ],
  });
  ctx.markCooldown("training_crisis");
  return events;
}
