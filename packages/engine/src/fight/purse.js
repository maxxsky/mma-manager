// Catchweight forfeits 30% of show money and any earned win bonus. Keep the
// booking intact; presentation and persistence use the same payout calculation.
export function fightPurse(booked, result) {
  const show = booked?.show || 0;
  const winBonus = result.won ? (booked?.winBonus || 0) : 0;
  const gross = show + winBonus;
  const forfeit = result.weighinIssue === "catchweight" ? gross * 0.30 : 0;
  return { show, winBonus, forfeit, purse: gross - forfeit };
}
