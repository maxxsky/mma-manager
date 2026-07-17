// Promotion handlers — sign exclusivity contract with a promotion
export function registerPromotionHandlers(register) {
  register("promotionSign", ({ g, c }) => {
    const d = c.promotionSign;
    // The fighterId comes from the inbox message context
    // Need to find which fighter this offer was for
    // The offer is in the inbox with promotionContractOffer
    const msg = g.inbox.find((m) => m.promotionContractOffer === d.promotionId);
    if (!msg) return;
    const f = g.roster.find((x) => x.id === msg.fighterId);
    if (!f) return;
    f.promotionContract = {
      promotionId: d.promotionId,
      fightsLeft: d.fightsTotal,
      fightsTotal: d.fightsTotal,
      signedWeek: g.week,
      purseBonus: d.purseBonus,
    };
    g.inbox = g.inbox.filter((m) => m.id !== msg.id);
    g.log.unshift(`📝 ${f.name} tanda tangan kontrak eksklusif — ${d.fightsTotal} fight.`);
  });
}
