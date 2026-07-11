// Event system config — thresholds, probabilities, flag durations, tier pools

// ── Flag durations (weeks) ──
export const FLAG_DURATIONS = {
  "recent_conflict": 8,
  "coach_upset": 12,
  "fighter_frustrated": 8,
  "team_momentum": 6,
  "camp_under_pressure": 10,
  "chemistry_shaken": 8,
  "morale_boost": 6,
  "public_attention": 6,
  "rebuilding": 24,
};

// ── Event timing ──
export const EVENT_INTERVAL = 8; // weeks between event generation cycles

// ── Camp state thresholds ──
export const HIGH_MORALE_MIN = 75;
export const HIGH_MORALE_CHEM_MIN = 60;
export const TENSION_CHEM_MAX = 30;
export const TENSION_CHEM_CLEAR = 50;
export const WIN_STREAK_MIN = 3;
export const WIN_MOMENTUM_CHEM_MIN = 50;
export const WIN_MOMENTUM_MORALE_MAX = 40;
export const REBUILDING_MAX_FIGHTS = 3;
export const REBUILDING_RATIO = 0.5;
export const REBUILDING_MIN_ROSTER = 2;
export const REBUILDING_CLEAR = 1;
export const PRESSURE_CASH_MAX = 10000;
export const PRESSURE_REP_MAX = 10;
export const PRESSURE_MIN_WEEK = 50;
export const PRESSURE_CASH_CLEAR = 50000;

// ── Event probabilities ──
export const PROB_TIER_EVENT = 0.3;
export const PROB_TENSION = 0.4;
export const PROB_MOMENTUM_SPONSOR = 0.35;
export const PROB_REBUILD_MENTOR = 0.3;
export const PROB_PRESSURE = 0.35;

// ── Delayed consequence thresholds ──
export const COACH_RAISE_DENIED_MAX = 3;
export const FIGHTER_COMPLAINT_MAX = 3;
export const FIGHTER_COMPLAINT_MORALE_MAX = 40;

// ── Delayed event costs ──
export const COACH_ULTIMATUM_RAISE = 1.4; // 40% raise
export const FIGHTER_FRUSTRATION_COST = 3000;
export const FIGHTER_FRUSTRATION_MORALE = 20;

// ── Title event chain delays ──
export const TITLE_CELEBRATION_DELAY_WEEKS = 2;
export const TITLE_SPONSOR_DELAY_WEEKS = 4;

// ── Tier-based event pools ──
export const TIER_EVENTS = {
  // Local Gym (tier 0) — operational struggles
  0: [
    {
      title: "Peralatan rusak", body: "Matras latihan sobek — butuh perbaikan darurat.",
      choices: [{ label: "Perbaiki ($2,000)", cash: -2000, chem: 1 }, { label: "Tunda dulu", chem: -1 }],
    },
    {
      title: "Listrik padam", body: "Pemadaman bergilir — latihan malam ini terganggu.",
      choices: [{ label: "Sewa genset ($500)", cash: -500 }, { label: "Latihan pagi saja", chem: -2 }],
    },
  ],
  // Regional Camp (tier 1)
  1: [
    {
      title: "Media lokal", body: "Koran daerah mau wawancara — kesempatan exposure.",
      choices: [{ label: "Terima (popularity camp)", chem: -1, viralPop: null }, { label: "Tolak — fokus latihan", chem: 1 }],
    },
  ],
  // National Center (tier 2)
  2: [
    {
      title: "Tawaran kolaborasi", body: "Brand lokal tawarkan sponsorship jangka pendek.",
      choices: [{ label: "Terima ($3,000)", cash: 3000 }, { label: "Tolak", chem: 1 }],
    },
  ],
  // Elite Factory (tier 3)
  3: [
    {
      title: "Prospect walk-in", body: "Seorang petarung muda datang langsung ke camp minta trial.",
      choices: [{ label: "Beri kesempatan (scout gratis)", chem: 1 }, { label: "Tolak — roster penuh" }],
    },
  ],
  // World-Class (tier 4)
  4: [
    {
      title: "Media nasional", body: "ESPN minta akses eksklusif ke camp — exposure besar.",
      choices: [{ label: "Buka pintu (rep +3)", rep: 3, chem: -2 }, { label: "Privasi dulu", chem: 2 }],
    },
    {
      title: "Tawaran ekspansi", body: "Investor tawarkan modal untuk buka cabang kedua.",
      choices: [{ label: "Pertimbangkan", cash: 50000 }, { label: "Fokus ke camp utama", rep: 2, chem: 3 }],
    },
  ],
};

// ── State-driven event templates ──
export const EVENTS = {
  internalTension: {
    title: "Ketegangan memuncak",
    bodyFn: (a, b) => `Situasi di camp sudah tegang selama berminggu-minggu. ${a.name} dan ${b.name} nyaris berkelahi di ruang ganti.`,
    choices: [
      { label: "Mediasi darurat ($1,000)", cash: -1000, chem: 3 },
      { label: "Pisahkan mereka", chem: 1, moraleToFn: (a) => ({ id: a.id, amt: -3 }) },
    ],
  },
  sponsorshipInterest: {
    title: "Sponsor tertarik",
    body: "Rentetan kemenangan camp ini menarik perhatian brand besar. Mereka ingin meeting.",
    choices: [
      { label: "Jadwalkan meeting (chemistry boost)", chem: 3 },
      { label: "Fokus ke pertarungan dulu", chem: 1 },
    ],
  },
  veteranMentorship: {
    titleFn: (vet, rook) => `${vet.name} mentors ${rook.name}`,
    bodyFn: (vet, rook) => `${vet.name} terlihat melatih ${rook.name} ekstra setelah jam latihan. Chemistry camp membaik.`,
    choices: [
      { label: "Dorong mentorship", chem: 4 },
      { label: "Biarkan alami", chem: 2 },
    ],
  },
  underPressure: {
    title: "Di bawah tekanan",
    body: "Situasi keuangan menekan — staf mulai gelisah. Beberapa coach mempertimbangkan tawaran dari luar.",
    choices: [
      { label: "Tenangkan tim (chemistry)", chem: 2, moraleTo: null },
      { label: "Jujur soal kondisi", chem: -1, cash: 0 },
    ],
  },
  coachUltimatum: {
    titleFn: (c) => `${c.name} ultimatum`,
    bodyFn: (c) => `${c.name} sudah 3 kali ditolak kenaikan gaji. Dia memberi ultimatum: naikkan atau dia pergi.`,
    choicesFn: (c) => [
      { label: `Naikkan gaji (+40%)`, coachSalary: { id: c.id, amt: Math.round(c.salary * 1.4) } },
      { label: "Lepas", coachLeave: c.id },
    ],
  },
  fighterFrustration: {
    titleFn: (f) => `${f.name} frustrasi`,
    bodyFn: (f) => `${f.name} merasa diabaikan setelah 3 kali komplain. Dia mulai bicara dengan camp lain.`,
    choicesFn: (f) => [
      { label: "Minta maaf + bonus ($3,000)", cash: -3000, moraleTo: { id: f.id, amt: 20 } },
      { label: "Lepas", release: f.id },
    ],
  },
};
