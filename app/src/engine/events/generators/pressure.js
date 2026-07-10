// Pressure event generator — under financial/rep pressure → desperate measures
import { random } from "../../rng.js";
import { PROB_PRESSURE } from "../config.js";

export function generatePressureEvents(ctx) {
  const events = [];
  if (!ctx.isUnderPressure || random() >= PROB_PRESSURE) return events;

  events.push({
    title: "Di bawah tekanan",
    body: "Situasi keuangan menekan — staf mulai gelisah. Beberapa coach mempertimbangkan tawaran dari luar.",
    choices: [
      { label: "Tenangkan tim (chemistry)", chem: 2, moraleTo: null },
      { label: "Jujur soal kondisi", chem: -1, cash: 0 },
    ],
  });
  return events;
}
