// Fight → injury constants — tunable post-playtest
// All values provisional; named exports for easy adjustment
//
// PROVISIONAL numbers — Brahma akan adjust setelah playtest.
// Tujuan desain: injury dari fight kadang terjadi, cukup jarang
// buat berarti pas kejadian, bukan tiap fight.

// ── Base injury chance per outcome ──
// how keys: KO, TKO, Submission, Decision
// Doctor Stoppage maps to TKO chance
export const FIGHT_INJURY_CHANCE = {
  loser_KO: 0.35,           // KO'd — 35%
  loser_TKO: 0.28,          // TKO'd — 28%
  loser_Doctor: 0.25,       // Doctor stoppage — 25%
  loser_Submission: 0.18,   // Submitted — 18%
  loser_Decision: 0.06,     // Lost decision — 6%

  winner_KO: 0.06,          // Won by KO — throw hard punches, risk too
  winner_TKO: 0.04,         // Won by TKO
  winner_Doctor: 0.03,      // Won via doctor stoppage
  winner_Submission: 0.03,  // Won by submission
  winner_Decision: 0.01,    // Won by decision — clean fight, low risk
};

// ── Severity tier roll thresholds & ranges ──
// Same {tier, totalCost, weeksMin, weeksMax, label} shape as training injuries
// Roll 0-1, compare against threshold to pick tier.
export const FIGHT_INJURY_TIERS = [
  { threshold: 0.50, tier: 0, weeksMin: 2,  weeksMax: 4,  totalCost: 1500,  label: "Ringan" },
  { threshold: 0.80, tier: 1, weeksMin: 5,  weeksMax: 10, totalCost: 6000,  label: "Sedang" },
  { threshold: 0.95, tier: 2, weeksMin: 12, weeksMax: 20, totalCost: 18000, label: "Serius" },
  // Remaining 5%: severe
  { threshold: 1.00, tier: 3, weeksMin: 24, weeksMax: 40, totalCost: 40000, label: "Berat" },
];

// ── Descriptive labels per fight method ──
export const FIGHT_INJURY_LABELS = {
  KO: [
    "Cedera Kepala (KO/TKO)",
    "Cedera Rahang (KO/TKO)",
    "Concussion (KO/TKO)",
    "Robekan Otot Dada (KO/TKO)",
    "Cedera Tulang Rusuk (KO/TKO)",
    "Cedera Bahu (KO/TKO)",
    "Memar Dalam (KO/TKO)",
  ],
  "Doctor Stoppage": [
    "Luka Robek Wajah (Doctor Stoppage)",
    "Cedera Alis (Doctor Stoppage)",
    "Hematoma (Doctor Stoppage)",
  ],
  Submission: [
    "Cedera Bahu (Submission)",
    "Cedera Siku (Submission)",
    "Robekan Ligamen (Submission)",
    "Cedera Lutut (Submission)",
  ],
  Decision: [
    "Ketegangan Otot (Decision)",
    "Memar Akumulasi (Decision)",
    "Cedera Tulang Kering (Decision)",
    "Nyeri Sendi (Decision)",
  ],
};
