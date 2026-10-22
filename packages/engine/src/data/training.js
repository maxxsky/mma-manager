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
// Hard used to be a trap (P3 #41, FI1): 1.4x gain for 4x injury risk and
// +16 overtraining. Measured on one fighter from 40/90 attributes, 300 seeds:
// over 12 weeks it gained only 6% more than Medium with ~5x the injuries.
// Now it is a strong short burst (12 weeks: +41% gain, 1.6x injuries, same
// permanent-injury rate as Medium) that still loses to Medium if held for a
// year without a break, because overtraining builds up.
export const INTENSITY = {
  Light: { mult: 0.6, inj: 0.005, ot: 4 },
  Medium: { mult: 1.0, inj: 0.02, ot: 9 },
  Hard: { mult: 1.5, inj: 0.035, ot: 12 },
};
