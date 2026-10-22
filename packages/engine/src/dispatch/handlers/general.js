// General handlers — viral popularity, cash, openExtend (UI-only)
import { clamp, fmt$ } from "../../rng.js";
import { FAC_LABEL } from "../../data.js";
import { applyEmergencySale } from "../../finance.js";

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
    const { sales, total } = applyEmergencySale(g);
    if (!sales.length) {
      g.log.unshift("💸 Tidak ada aset yang bisa dijual — semua fasilitas sudah level 1.");
      return;
    }
    g.chemistry = clamp(g.chemistry - 10, 0, 100);
    const sold = sales.map((s) => `${FAC_LABEL[s.fac] || s.fac} L${s.fromLevel}→${s.fromLevel - 1}`).join(", ");
    g.log.unshift(`💸 Jual aset darurat: ${sold}. +${fmt$(total)}, chemistry -10.`);
  });
}
