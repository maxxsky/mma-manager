export const SPONSOR_BRANDS = [
  { type: "Apparel", name: "FightFist Gear", baseRate: 200, boostFight: 1.5, desc: "Royalti naik saat fighter menang", icon: "👕", repReq: 10 },
  { type: "Apparel", name: "Bloodline Wear", baseRate: 150, boostFight: 2.0, desc: "Bonus besar per kemenangan", icon: "👕", repReq: 20 },
  { type: "Supplement", name: "Titan Nutrition", baseRate: 300, boostFame: 1.3, desc: "Royalti +30% per popularitas fighter", icon: "💊", repReq: 15 },
  { type: "Supplement", name: "PureFuel Labs", baseRate: 250, boostFame: 1.5, desc: "Royalti +50% per popularitas fighter", icon: "💊", repReq: 25 },
  { type: "Tech", name: "HypeTracker Pro", baseRate: 400, boostFight: 1.2, boostFame: 1.2, desc: "Balanced — fight & fame bonus", icon: "⚡", repReq: 30 },
  { type: "Tech", name: "ArenaVision", baseRate: 350, boostFight: 2.0, desc: "Royalti ganda saat fighter main card", icon: "⚡", repReq: 40 },
];
export const SPONSOR_TERMS = {
  placement: { label: "Placement Fee", mult: 1.0, desc: "Bayaran tetap per bulan — stabil, tanpa bonus" },
  royalty: { label: "Royalty", mult: 0.6, desc: "Base lebih rendah (60%), tapi bonus tiap kemenangan fighter × boost" },
};
