export const GAME_PLANS = {
  "Take It Down": "Fokus takedown & top control",
  "Keep It Standing": "Jaga jarak, sprawl, volume striking",
  "Finish It": "Cari finish — stamina terbakar cepat",
  "Survive & Outpoint": "Defense & manajemen stamina",
};
export const TRAINING = {
  striking: { label: "Striking", cost: 500, gains: ["striking", "footwork"] },
  grappling: { label: "Grappling", cost: 500, gains: ["wrestling", "bjj"] },
  conditioning: { label: "S&C", cost: 300, gains: ["strength", "cardio"] },
  sparring: { label: "Sparring", cost: 800, gains: ["fightIQ", "striking", "wrestling"] },
  recovery: { label: "Recovery", cost: 100, gains: [] },
  fightcamp: { label: "Fight Camp", cost: 1000, gains: ["fightIQ", "cardio", "striking", "wrestling"] },
};
export const INTENSITY = {
  Light: { mult: 0.6, inj: 0.005, ot: 4 },
  Medium: { mult: 1.0, inj: 0.02, ot: 9 },
  Hard: { mult: 1.4, inj: 0.08, ot: 16 },
};
