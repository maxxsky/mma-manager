// Prosperity event generator — camp finansial sehat, kesempatan investasi
import { random } from "../../rng.js";
import { PROB_PROSPERITY } from "../config.js";

export function generateProsperityEvents(ctx) {
  const events = [];
  if (!ctx.isProsperous || random() >= PROB_PROSPERITY || ctx.checkCooldown("prosperity")) return events;

  events.push({
    title: "💰 Camp Sedang Berjaya",
    body: "Keuangan camp sehat. Pertahankan cadangan atau rencanakan upgrade fasilitas yang bisa dibiayai operasional camp.",
    choices: [
      { label: "Investasi ulang ke fasilitas (chemistry +3)", chem: 3 },
      { label: "Simpan sebagai cadangan", chem: 0 },
    ],
  });
  ctx.markCooldown("prosperity");
  return events;
}
