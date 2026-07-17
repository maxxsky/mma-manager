// Sponsor handlers — accept, reject sponsorship offers
export function registerSponsorHandlers(register) {
  register("sponsorAccept", ({ g, c }) => {
    const d = c.sponsorAccept;
    if (!g.sponsors) g.sponsors = [];
    if (g.sponsors.length >= 3) { g.log.unshift("📢 Sponsor penuh — maks 3."); return; }
    g.sponsors.push({ brand: d.brand, terms: d.terms, rate: d.rate, weeksLeft: d.weeksLeft });
    g.log.unshift(`📢 ${d.brand} sponsor camp.`);
  });

  register("sponsorReject", ({ g }) => {
    g.log.unshift("📢 Sponsor ditolak.");
  });

  register("sponsorRenew", ({ g, c }) => {
    const sp = g.sponsors?.find((s) => s.brand === c.sponsorRenew.brand);
    if (sp) {
      sp.weeksLeft = 48;
      g.log.unshift(`📋 Kontrak ${sp.brand} diperpanjang.`);
    }
  });
}
