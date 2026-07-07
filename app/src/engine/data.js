// ---------- data constants (zero imports — pure data) ----------

export const ATTRS = [
  "striking", "wrestling", "bjj", "footwork", "strength", "cardio", "chin", "fightIQ",
];
export const ATTR_LABEL = {
  striking: "Striking", wrestling: "Wrestling", bjj: "BJJ", footwork: "Footwork",
  strength: "Strength", cardio: "Cardio", chin: "Chin", fightIQ: "Fight IQ",
};

export const WEIGHTS = [
  { name: "Flyweight", limit: 125 }, { name: "Bantamweight", limit: 135 },
  { name: "Featherweight", limit: 145 }, { name: "Lightweight", limit: 155 },
  { name: "Welterweight", limit: 170 }, { name: "Middleweight", limit: 185 },
  { name: "Light Heavyweight", limit: 205 }, { name: "Heavyweight", limit: 265 },
];

export const ARCHETYPES = {
  Boxer: { striking: 1.22, footwork: 1.18, wrestling: 1.05, bjj: 0.80 },
  "Muay Thai": { striking: 1.08, bjj: 0.80, wrestling: 0.95, footwork: 1.00, clinch: 1.15, cardio: 0.90 },
  "Wrestler": { wrestling: 1.18, strength: 1.00, striking: 0.75, bjj: 0.90, footwork: 0.80, cardio: 0.97 },
  "BJJ Specialist": { bjj: 1.15, wrestling: 1.05, striking: 0.70, footwork: 0.80, fightIQ: 1.05 },
  "All-Rounder": { fightIQ: 1.10, striking: 1.00, wrestling: 1.00, bjj: 1.00 },
};
export const ARCH_COLOR = {
  Boxer: "#e14b44", "Muay Thai": "#e88a3a", Wrestler: "#3f8fd4",
  "BJJ Specialist": "#9a6ae0", "All-Rounder": "#57b56b",
};

export const REGIONS = {
  Brazil: { arch: "BJJ Specialist", first: ["Carlos", "Thiago", "Rafael", "Gilberto", "Marcio", "Renan"], last: ["Silva", "Oliveira", "Souza", "Costa", "Barbosa", "Lima"] },
  Russia: { arch: "Wrestler", first: ["Dmitri", "Islam", "Magomed", "Sergei", "Anatoly", "Zaur"], last: ["Volkov", "Petrov", "Nurmagov", "Ivanov", "Gadzhiev", "Orlov"] },
  USA: { arch: "Wrestler", first: ["Marcus", "Tyler", "Deshawn", "Cody", "Brandon", "Jake"], last: ["Johnson", "Miller", "Carter", "Reyes", "Brooks", "Hall"] },
  Netherlands: { arch: "Muay Thai", first: ["Rico", "Jasper", "Melvin", "Daan", "Sem", "Bram"], last: ["Verhoeven", "de Vries", "Bakker", "Visser", "Smit", "Mulder"] },
  Japan: { arch: "All-Rounder", first: ["Kenta", "Ryo", "Takeshi", "Yuki", "Shinya", "Kaito"], last: ["Sato", "Tanaka", "Yamamoto", "Kobayashi", "Aoki", "Mori"] },
  Nigeria: { arch: "All-Rounder", first: ["Kamaru", "Chidi", "Israel", "Emeka", "Tobi", "Sodiq"], last: ["Adesanya", "Okafor", "Usman", "Balogun", "Eze", "Ade"] },
  UK: { arch: "Boxer", first: ["Liam", "Callum", "Darren", "Owen", "Reece", "Kieran"], last: ["Edwards", "Till", "Pearson", "Aspinall", "Wood", "Hardy"] },
  Indonesia: { arch: "Boxer", first: ["Bima", "Raka", "Dimas", "Agus", "Yoga", "Rizky"], last: ["Saputra", "Wijaya", "Pratama", "Santoso", "Hidayat", "Nugroho"] },
};

export const TRAITS = {
  "Iron Will": "Morale tidak anjlok saat kalah",
  "Glass Jaw": "Chin efektif -10 di fight",
  "Iron Chin": "Chin efektif +8 di fight",
  "Natural Talent": "Training speed +15%",
  "Team Player": "Chemistry camp +1/bulan",
  Diva: "Chemistry camp -1/bulan",
  "Crowd Favorite": "Popularity naik 2x",
  Warrior: "Bonus damage saat tertinggal",
  Cautious: "Risiko cedera -15%, finish rate turun",
  Explosive: "R1 kuat, output R3 turun 15%",
  Grinder: "Gain training konsisten, tanpa plateau",
  Showboat: "Popularity +5 per finish, defense -5%",
};
export const TRAIT_KEYS = Object.keys(TRAITS);

// Trait exclusion — traits that conflict with each other (can't both be on same fighter)
export const TRAIT_CONFLICTS = {
  "Glass Jaw": ["Iron Chin"],
  "Iron Chin": ["Glass Jaw"],
  Cautious: ["Explosive"],
  Explosive: ["Cautious"],
  Diva: ["Team Player"],
  "Team Player": ["Diva"],
};

export const AMBITIONS = {
  "Belt Chaser": "Bahagia jika ranked; morale turun jika stuck unranked",
  Paycheck: "Morale naik setiap selesai fight (dibayar)",
  Legacy: "Morale naik ekstra saat mengalahkan lawan ranked",
  "Family Man": "Max 3 fight/tahun — lebih dari itu morale anjlok",
  Grinder: "Overtraining menumpuk 25% lebih lambat",
  "Star Power": "Popularity gain +50%; murung jika popularity rendah",
};
export const AMBITION_KEYS = Object.keys(AMBITIONS);

// ---------- kontrak & agent ----------
export const AGENT_TYPES = {
  none: { label: "Tanpa agent", cutFloor: 0.15, hardness: 0 },
  Budget: { label: "Budget Agent", cutFloor: 0.16, hardness: 0.4 },
  Standard: { label: "Standard Agent", cutFloor: 0.18, hardness: 0.7 },
  Power: { label: "Power Agent", cutFloor: 0.20, hardness: 1.0 },
};

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

export const COACH_SPECS = ["Striking", "Wrestling", "BJJ", "S&C", "Head"];
export const COACH_NAMES = [
  "R. Mendez", "T. Okoye", "V. Kadyrov", "J. Halvorsen", "B. Siregar",
  "M. Duarte", "K. Ferreira", "A. Blackwood", "S. Yoon", "G. Petrossian",
];
export const COACH_PERSONALITIES = {
  Motivator: { desc: "Morale recovery +20% setelah kalah", icon: "💪" },
  Technician: { desc: "Technical training (striking/bjj/footwork/fightIQ) +10%", icon: "🔧" },
  Disciplinarian: { desc: "Overtraining -25%, risiko cedera -15%", icon: "📏" },
  "Player's Coach": { desc: "Chemistry +2 per bulan, popularity gain +15%", icon: "🤝" },
};

// ---------- rival camps ----------
export const RIVAL_NAMES = [
  "Chimera Gym", "Blackthorn MMA", "Cerberus Camp", "Kruel Combat", "Apex Fight Team",
];
// Camp specialization tags (separate from rival traits)
export const CAMP_SPECS = {
  "Striking Focus": { spec: "striking", bonus: 1.06, desc: "Bonus training striking +6%" },
  "Grappling Academy": { spec: "wrestling", bonus: 1.06, desc: "Bonus training wrestling +6%" },
  "BJJ Lab": { spec: "bjj", bonus: 1.06, desc: "Bonus training BJJ +6%" },
  "Well-Rounded": { spec: null, bonus: 1.10, desc: "Semua training +10%" },
  "Conditioning Center": { spec: "strength", bonus: 1.06, desc: "Bonus training strength +6%" },
};

export const RIVAL_TRAITS = {
  "Striking Factory": { spec: "striking", bonus: 1.15 },
  "Wrestling Hub": { spec: "wrestling", bonus: 1.15 },
  "BJJ Academy": { spec: "bjj", bonus: 1.15 },
  "Prospect Mill": { spec: null, bonus: 1.10, desc: "regenerasi fighter cepat" },
  "Elite Stable": { spec: null, bonus: 1.0, desc: "fighter berkualitas tinggi, roster kecil" },
};

export const PROMO_TIERS = ["Local", "Regional", "National", "Major", "Premier"];

// ---------- camp tier ----------
export const CAMP_TIERS = [
  { name: "Local Gym",     rep: 0,   cost: 0,       rosterCap: 4, coachCap: 1, facMax: [2,2,2,2], trainBonus: 0,    desc: "Gym kecil lingkungan. Upgrade terbatas." },
  { name: "Regional Camp", rep: 15,  cost: 25000,   rosterCap: 6, coachCap: 2, facMax: [3,3,3,2], trainBonus: 0.05, desc: "Camp dikenal regional. Kapasitas & coach naik." },
  { name: "National Center", rep: 35, cost: 60000,  rosterCap: 8, coachCap: 3, facMax: [4,4,4,3], trainBonus: 0.10, desc: "Pusat latihan nasional. Fasilitas kelas atas." },
  { name: "Elite MMA Factory", rep: 55, cost: 120000, rosterCap: 10, coachCap: 4, facMax: [5,5,5,4], trainBonus: 0.15, desc: "Factory kelas dunia. Scout otomatis per bulan." },
  { name: "World-Class Institute", rep: 75, cost: 250000, rosterCap: 14, coachCap: 5, facMax: [6,6,6,5], trainBonus: 0.22, desc: "MMA Institute — puncak industri. Full facility unlock." },
];

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

export const FAC_LABEL = {
  mats: "Training Mats", ring: "Boxing Ring", weights: "Weight Room", medical: "Medical Room",
};

// Sparring archetype compatibility: 0=none, 0.5=ok, 1=great match
export const SPARRING_MATCH = {
  Boxer:         { Boxer: 0.8, "Muay Thai": 0.7, Wrestler: 0.4, "BJJ Specialist": 0.3, "All-Rounder": 0.6 },
  "Muay Thai":   { Boxer: 0.7, "Muay Thai": 1.0, Wrestler: 0.4, "BJJ Specialist": 0.3, "All-Rounder": 0.6 },
  Wrestler:      { Boxer: 0.3, "Muay Thai": 0.3, Wrestler: 1.0, "BJJ Specialist": 0.9, "All-Rounder": 0.5 },
  "BJJ Specialist": { Boxer: 0.2, "Muay Thai": 0.2, Wrestler: 0.9, "BJJ Specialist": 1.0, "All-Rounder": 0.5 },
  "All-Rounder":  { Boxer: 0.6, "Muay Thai": 0.6, Wrestler: 0.6, "BJJ Specialist": 0.6, "All-Rounder": 0.8 },
};

export const EXTERNAL_PARTNERS = {
  Local:   { label: "Local Partner", cost: 400,  levelRange: [30, 50], desc: "Pemula lokal — murah, gain kecil" },
  Regular: { label: "Regular Partner", cost: 900,  levelRange: [45, 70], desc: "Sparring selevel — harga wajar" },
  Pro:     { label: "Pro Partner", cost: 1600, levelRange: [60, 85], desc: "Sparring pro — mahal, gain besar" },
  Elite:   { label: "Elite Partner", cost: 2800, levelRange: [75, 95], desc: "Partner kelas dunia — premium" },
};

export const INVESTOR_TYPES = [
  {
    tier: "Angel", repReq: 15, maxInvestors: 2,
    offerRange: [20000, 35000], equityRange: [8, 15],
    desc: "Investor individu — dana kecil, equity rendah.",
  },
  {
    tier: "Venture", repReq: 35, maxInvestors: 2,
    offerRange: [60000, 100000], equityRange: [15, 25],
    desc: "Venture partner — dana menengah, equity moderat.",
  },
  {
    tier: "Private Equity", repReq: 55, maxInvestors: 1,
    offerRange: [150000, 250000], equityRange: [25, 40],
    desc: "Private equity — dana besar, equity signifikan.",
  },
];
