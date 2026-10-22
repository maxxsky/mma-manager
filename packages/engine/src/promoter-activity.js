// Promoter tier activity — has the camp worked with this tier recently?
// Read from structured fight data (bookings and fightHistory), not log text:
// log matching could hit unrelated lines ("Local Amateur Circuit") and depended
// on how many log lines the caller happened to keep (P1 #25, DU8).
export const PROMOTER_ACTIVE_WEEKS = 12;

export function promoterTierActive(g, tier) {
  return (g.roster || []).some((f) =>
    f.booked?.tier === tier ||
    (f.fightHistory || []).some((h) => h.tier === tier && typeof h.week === "number" && g.week - h.week <= PROMOTER_ACTIVE_WEEKS));
}
