// Fight engine configuration — all balance constants and magic numbers.
// Tune these values without touching simulation logic.

// Round structure
export const EXCHANGES_PER_ROUND = { min: 8, max: 12 };
export const ROUND_LENGTH = { min: 5, sec: 0 }; // 5:00
export const ROUND_COMMENTARY_SECONDS = 270; // 4.5 menit — buffer sebelum bel di menit ke-5

// Stamina weights
export const STA_BASE_WEIGHT = 0.45;
export const STA_SCALE_WEIGHT = 0.55;
export const STA_DRAIN_MIN = 8;
export const STA_DRAIN_MAX = 13;
export const STA_MIN = 5;
export const STA_MAX = 100;

// Damage
export const BODY_DMG_MULTIPLIER = 0.004;
export const LEG_DMG_MULTIPLIER = 0.003;
export const LEG_MOD_MIN = 0.65;
export const CARDIO_DIVISOR_MIN = 30;
export const CARDIO_DIVISOR_MAX = 95;

// Knockdown
export const KD_EXCHANGE_THRESHOLD = 6;
export const KD_CHIN_MULT = 0.8;
export const KD_STR_MULT = 0.002;
export const KD_FATIGUE_MULT = 0.004;
export const KD_CHANCE_MAX = 0.40;
export const KD_FINISH_CHANCE = 0.25;

// Cut / doctor stoppage
export const CUT_EXCHANGE_THRESHOLD = 4;  // per-exchange damage minimum untuk eligible kena cut
export const CUT_CHANCE_PER_HIT = 0.12;   // peluang dasar kena cut per exchange
export const CUT_SEVERITY_PER_HIT = 1;    // akumulasi cut per hit

// Corner instructions. Every option gives something and costs something.
//   out:     own striking and clinch output.
//   exposed: strikes the opponent lands on this fighter. Pressing forward
//            opens you up; fighting safe tightens your guard.
//   drain:   own stamina drain this round. Stamina carries into later rounds
//            and scales every attribute, so a high drain is paid back later.
//   kd:      own chance to knock the opponent down.
// "neutral" is the baseline: no instruction (round 1, or the corner timer ran out).
export const CORNER_EFFECTS = {
  neutral:    { out: 1.00, exposed: 1.00, drain: 1.00, kd: 1.00 },
  go:         { out: 1.20, exposed: 1.16, drain: 1.40, kd: 1.15 },
  save:       { out: 0.80, exposed: 0.85, drain: 0.55, kd: 0.85 },
  body:       { out: 0.85, exposed: 1.00, drain: 1.00, kd: 0.60 },
  target_cut: { out: 1.10, exposed: 1.10, drain: 1.20, kd: 1.00 },
  stop_bleed: { out: 0.85, exposed: 0.85, drain: 0.70, kd: 0.85 },
  clinch:     { out: 0.80, exposed: 0.80, drain: 0.50, kd: 0.70 },
  empty_tank: { out: 1.35, exposed: 1.35, drain: 1.50, kd: 1.40 },
};
// "Work the body": share of striking damage that goes to the body and legs.
export const CORNER_BODY_SHARE = 0.7;
export const CORNER_BODY_LEG_SHARE = 0.5;
// "Work the body": extra stamina the opponent loses per strike landed this
// round (striking and clinch), scaled by the opponent's cardio like normal
// drain. This is the late payoff: the lost stamina stays for the rest of the fight.
export const CORNER_BODY_STA_PER_LAND = 0.25;
// "Clinch and recover": round points given up for the stamina saved.
export const CORNER_CLINCH_POINT_COST = 2;
export const CUT_TARGET_MULT = 1.5;
export const CUT_PROTECT_MULT = 0.5;

// Submissions
export const SUB_THRESHOLD_BASE = 50;
export const SUB_THRESHOLD_BJJ = 72;
export const SUB_ADV_MIN = -10;
export const SUB_ADV_MAX = 45;
export const SUB_DEFENSE_EASE_CHANCE = 0.15;
export const SUB_EASE_MIN = 10;
export const SUB_EASE_MAX = 20;
export const BJJ_GUARD_CHANCE = 0.08;
export const BJJ_GUARD_THRESHOLD = 45;
export const BJJ_GUARD_ADV_MIN = -3;
export const BJJ_GUARD_ADV_MAX = 25;
export const BACK_MOUNT_BONUS = 35;
export const MOUNT_BONUS = 20;
export const SIDE_CONTROL_BONUS = 10;
export const GUARD_BONUS = 5;
export const SUB_MOD_SCALE = 30;

// Striking
export const POWER_SHOT_MULT = 1.5;
export const LEG_DMG_DEF_MULT = 0.003;
export const DEF_MIN_CLAMP = 0.70;
// Same range for both sides. It used to be 3-7 for A (the player) and 2-6
// for B, which handed A about 25% more strikes. 2.5-6.5 keeps the old average.
export const STRIKE_LAND_MIN = 2.5;
export const STRIKE_LAND_MAX = 6.5;
export const STR_MULT = 50;
export const HIT_VAR_MIN = 0.8;
export const HIT_VAR_MAX = 1.3;
export const STRIKING_DEF_DIVISOR = 12;

// Clinch
export const CLINCH_DMG_MIN = 2;
export const CLINCH_DMG_MAX = 5;
export const CLINCH_THAI_MIN = 4;
export const CLINCH_THAI_MAX = 9;
export const CLINCH_STRIKE_MIN = 0.3;
export const CLINCH_STRIKE_MAX = 0.6;
export const CLINCH_TD_CHANCE = 0.25;
export const CLINCH_TD_WRESTLING = 40;

// Takedown
export const TD_BASE_CHANCE = 0.35;
export const TD_SKILL_DIVISOR = 60;
export const TD_MIN_CHANCE = 0.10;
export const TD_MAX_CHANCE = 0.90;
export const TD_DMG_MIN = 3;
export const TD_DMG_MAX = 8;
export const GUILLOTINE_CHANCE = 0.10;

// GNP
export const GNP_DMG_MIN = 2;
export const GNP_DMG_MAX = 8;
export const GNP_SCRAMBLE_CHANCE = 0.35;

// Sweep
export const SWEEP_BASE_CHANCE = 0.35;

// Scramble
export const SCRAMBLE_UP_CHANCE = 0.45;

// Momentum
export const MOMENTUM_STRIKE_MULT = 2;
export const MOMENTUM_CLINCH_THRESHOLD = 4;
export const MOMENTUM_CLINCH_BONUS = 8;
export const MOMENTUM_DECAY = 0.65;
export const MOMENTUM_MIN = -100;
export const MOMENTUM_MAX = 100;
export const MOMENTUM_DIVISOR_POS = 0.0006;
export const MOMENTUM_DIVISOR_NEG = 0.0003;
export const MOMENTUM_MULT_MIN = 0.90;
export const MOMENTUM_MULT_MAX = 1.10;

// Striker sub attempt
export const STRIKER_SUB_BJJ_MIN = 70;
export const STRIKER_SUB_CHANCE = 0.15;
export const MIN_BJJ_FOR_SUB = 50;

// Prep fighter
export const MORALE_HIGH = 75;
export const MORALE_LOW = 40;
export const MORALE_BOOST = 1.04;
export const MORALE_PENALTY = 0.94;
export const AGE_OLD = 37;
export const AGE_VETERAN = 34;
export const AGE_PEAK_LOW = 31;
export const AGE_YOUNG = 21;
export const AGE_OLD_MULT = 0.85;
export const AGE_VETERAN_MULT = 0.9;
export const AGE_PEAK_MULT = 0.95;
export const AGE_YOUNG_MULT = 0.9;
export const ATTR_MIN = 5;
export const ATTR_MAX = 99;

// Damage phase
export const PHASE_EARLY = 0.7;
export const PHASE_MID = 0.6;
export const PHASE_LATE = 0.5;
export const EARLY_EXCHANGES = 2;

// Judges' scoring (10-point must system)
// A round becomes 10-8 only when the round winner knocked the loser down AND
// scored at least this many times the loser's points. Knockdowns happen in
// about 30% of rounds, so a knockdown alone would make 10-8 far too common;
// with this rule about 6-7% of decision rounds are 10-8.
export const SCORE_10_8_POINT_RATIO = 2;
