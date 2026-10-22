// Fight → injury constants — tunable post-playtest
// All values provisional; named exports for easy adjustment
//
// PROVISIONAL numbers — Brahma akan adjust setelah playtest.
// Tujuan desain: injury dari fight kadang terjadi, cukup jarang
// buat berarti pas kejadian, bukan tiap fight.

// ── Base injury chance per outcome ──
// how keys: KO, Doctor, Submission, Decision. The fight engine has a single
// "KO/TKO" finish (a knockdown that ends the fight); there is no separate
// referee stoppage, so there is no TKO key.
export const FIGHT_INJURY_CHANCE = {
  loser_KO: 0.35,           // KO'd — 35%
  loser_Doctor: 0.25,       // Doctor stoppage — 25%
  loser_Submission: 0.18,   // Submitted — 18%
  loser_Decision: 0.06,     // Lost decision — 6%

  winner_KO: 0.06,          // Won by KO — throw hard punches, risk too
  winner_Doctor: 0.03,      // Won via doctor stoppage
  winner_Submission: 0.03,  // Won by submission
  winner_Decision: 0.01,    // Won by decision — clean fight, low risk
};

// ── Damage scaling ──
// The base chance applies at typical damage for that outcome. Reference values
// are the median damage taken per outcome, measured on 6,000 engine fights
// (OVR 36/51/66, 3 and 5 rounds). Doctor stoppages are rare; 50 is a guess.
// Multiplier = 0.5 + 0.5 × (damage / reference), clamped to 0.5–2.0, so an
// untouched fighter carries half the risk and a beaten-up one up to double.
export const FIGHT_INJURY_DMG_REF = {
  loser_KO: 40, loser_Doctor: 50, loser_Submission: 20, loser_Decision: 66,
  winner_KO: 25, winner_Doctor: 50, winner_Submission: 23, winner_Decision: 44,
};
export const FIGHT_INJURY_DMG_MULT_MIN = 0.5;
export const FIGHT_INJURY_DMG_MULT_MAX = 2.0;

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
  Doctor: [
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
