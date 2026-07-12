export const CAMP_TIERS = [
  { name: "Local Gym",     rep: 0,   cost: 0,       rosterCap: 4, coachCap: 1, facMax: [2,2,2,2], trainBonus: 0,    desc: "Gym kecil lingkungan. Upgrade terbatas." },
  { name: "Regional Camp", rep: 15,  cost: 25000,   rosterCap: 6, coachCap: 2, facMax: [3,3,3,2], trainBonus: 0.05, desc: "Camp dikenal regional. Kapasitas & coach naik." },
  { name: "National Center", rep: 35, cost: 60000,  rosterCap: 8, coachCap: 3, facMax: [4,4,4,3], trainBonus: 0.10, desc: "Pusat latihan nasional. Fasilitas kelas atas." },
  { name: "Elite MMA Factory", rep: 55, cost: 120000, rosterCap: 10, coachCap: 4, facMax: [5,5,5,4], trainBonus: 0.15, desc: "Factory kelas dunia. Scout otomatis per bulan." },
  { name: "World-Class Institute", rep: 75, cost: 250000, rosterCap: 14, coachCap: 5, facMax: [6,6,6,5], trainBonus: 0.22, desc: "MMA Institute — puncak industri. Full facility unlock." },
];
export const MEMBER_FEE = [110, 130, 150, 175, 200];
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
