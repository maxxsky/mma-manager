// General handlers — viral popularity, cash, openExtend (UI-only)
import { clamp } from "../../rng.js";

export function registerGeneralHandlers(register) {
  register("openExtend", () => {
    // Handled in App.jsx — setNego modal
  });

  register("viralPop", ({ g, c }) => {
    const f = g.roster.find((x) => x.id === c.viralPop);
    if (f) f.popularity = clamp(f.popularity + 8, 0, 100);
  });

  register("cash", ({ g, c }) => {
    if (c.cash) g.cash += c.cash;
  });

  register("emergencyCostCut", ({ g }) => {
    g.cash += 25000;
    g.chemistry = clamp(g.chemistry - 10, 0, 100);
    g.log.unshift("💸 Jual aset darurat: +$25,000, chemistry -10.");
  });
}
