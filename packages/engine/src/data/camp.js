export const CAMP_TIERS = [
  { name: "Local Gym",     rep: 0,   cost: 0,       rosterCap: 4, coachCap: 1, facMax: [2,2,2,2], trainBonus: 0,    desc: "Gym kecil lingkungan. Upgrade terbatas." },
  { name: "Regional Camp", rep: 15,  cost: 25000,   rosterCap: 6, coachCap: 2, facMax: [3,3,3,2], trainBonus: 0.05, desc: "Camp dikenal regional. Kapasitas & coach naik." },
  { name: "National Center", rep: 35, cost: 60000,  rosterCap: 8, coachCap: 3, facMax: [4,4,4,3], trainBonus: 0.10, desc: "Pusat latihan nasional. Fasilitas kelas atas." },
  { name: "Elite MMA Factory", rep: 55, cost: 120000, rosterCap: 10, coachCap: 4, facMax: [5,5,5,4], trainBonus: 0.15, desc: "Factory kelas dunia. Scout otomatis per bulan." },
  { name: "World-Class Institute", rep: 75, cost: 250000, rosterCap: 14, coachCap: 5, facMax: [6,6,6,5], trainBonus: 0.22, desc: "MMA Institute — puncak industri. Full facility unlock." },

  // The two tiers above are gated on camp prestige rather than reputation.
  //
  // Reputation caps at 100 and a competent camp reaches it inside the first
  // in-game year, so every rep-gated milestone was spent by year four while
  // income kept compounding — a measured run held 92 million by year twenty
  // against a total lifetime spend of 455,000 across the whole tier ladder.
  // Prestige is the only axis that still grows after a decade, so hanging the
  // late tiers on it gives the money somewhere to go and gives a camp's
  // history a concrete payoff beyond better prospects.
  { name: "Global Fight Academy", rep: 85, prestige: 45, cost: 4000000, upkeep: 200000, rosterCap: 18, coachCap: 6, facMax: [7,7,7,6], trainBonus: 0.28, desc: "Akademi lintas benua. Roster & staf jauh lebih besar." },
  { name: "Dynasty Institution",  rep: 95, prestige: 75, cost: 20000000, upkeep: 520000, rosterCap: 24, coachCap: 8, facMax: [8,8,8,7], trainBonus: 0.35, desc: "Institusi warisan. Hanya untuk camp dengan sejarah panjang." },
];
export const MEMBER_FEE = [110, 130, 150, 175, 200, 260, 340];
export const FAC_LABEL = {
  mats: "Training Mats", ring: "Boxing Ring", weights: "Weight Room", medical: "Medical Room",
};
export const SPARRING_MATCH = {
  Boxer:         { Boxer: 0.8, "Muay Thai": 0.7, Wrestler: 0.4, "BJJ Specialist": 0.3, "All-Rounder": 0.6 },
  "Muay Thai":   { Boxer: 0.7, "Muay Thai": 1.0, Wrestler: 0.4, "BJJ Specialist": 0.3, "All-Rounder": 0.6 },
  Wrestler:      { Boxer: 0.3, "Muay Thai": 0.3, Wrestler: 1.0, "BJJ Specialist": 0.9, "All-Rounder": 0.5 },
  "BJJ Specialist": { Boxer: 0.2, "Muay Thai": 0.2, Wrestler: 0.9, "BJJ Specialist": 1.0, "All-Rounder": 0.5 },
  "All-Rounder":  { Boxer: 0.6, "Muay Thai": 0.6, Wrestler: 0.6, "BJJ Specialist": 0.6, "All-Rounder": 0.8 },
};
