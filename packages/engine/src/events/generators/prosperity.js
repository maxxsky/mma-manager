// Prosperity event generator — camp finansial sehat, kesempatan investasi
import { random } from "../../rng.js";
import { PROB_PROSPERITY } from "../config.js";

export function generateProsperityEvents(ctx) {
  const events = [];
  if (!ctx.isProsperous || random() >= PROB_PROSPERITY || ctx.checkCooldown("prosperity")) return events;

  events.push({
    title: "💰 Camp Sedang Berjaya",
    body: "Keuangan camp sehat dan reputasi tinggi — investor lokal mulai melirik untuk kerja sama jangka panjang.",
    choices: [
      { label: "Investasi ulang ke fasilitas (chemistry +3)", chem: 3 },
      { label: "Simpan sebagai cadangan", chem: 0 },
    ],
  });
  ctx.markCooldown("prosperity");
  return events;
}
