// Shadow AI config — lifecycle thresholds, quality ranges, target sizes

// Update intervals
export const SHADOW_TICK_INTERVAL = 12; // weeks between shadow camp updates

// Age thresholds
export const DEV_AGE_YOUNG = 24;
export const DEV_AGE_PRIME = 28;
export const DEV_AGE_MATURE = 32;
export const DEV_AGE_VETERAN = 35;
export const DEV_AGE_STOP = 36;
export const RETIRE_AGE_CHECK = 38;
export const RETIRE_AGE_FORCE = 40;
export const COACH_RETIRE_AGE = 60;

// Age multipliers for fighter development
export const AGE_MULT_YOUNG = 1.3;
export const AGE_MULT_PRIME = 1.15;
export const AGE_MULT_MATURE = 1.0;
export const AGE_MULT_VETERAN = 0.7;
export const AGE_MULT_DECLINE = 0.4;

// Fighter level ranges
export const LEVEL_MIN = 0.3;
export const LEVEL_MAX = 1.5;

// Development
export const DEV_QUALITY_DIVISOR = 50;
export const DEV_GROWTH_MIN = 0.002;
export const DEV_GROWTH_MAX = 0.008;
export const DEV_DECLINE_MIN = 0.003;
export const DEV_DECLINE_MAX = 0.01;
export const DEV_CHAMPIONSHIP_BONUS = 1.2;

// Coach
export const COACH_SKILL_MAX = 10;
export const COACH_GROWTH_CHANCE = 0.3;
export const COACH_GROWTH_MIN = 0.2;
export const COACH_GROWTH_MAX = 0.5;
export const COACH_RETIRE_CHANCE = 0.2;

// Lifecycle thresholds
export const LC_CHAMPIONSHIP_QUALITY = 80;
export const LC_CHAMPIONSHIP_REP = 60;
export const LC_DECLINE_QUALITY = 30;
export const LC_DECLINE_REP = 20;
export const LC_REBUILD_QUALITY = 20;
export const LC_GROWTH_QUALITY = 50;
export const LC_GROWTH_REP = 30;
export const LC_EXPANSION_QUALITY = 35;
export const LC_EXPANSION_REP = 15;
export const LC_REBUILD_RECOVERY = 40;

// Roster
export const ELITE_TARGET_SIZE = 4;
export const DEFAULT_TARGET_MIN = 5;
export const DEFAULT_TARGET_MAX = 8;
export const ROSTER_OVERFLOW_PAD = 2;
export const ACQUIRE_MIN_BUDGET = 5000;

// Recruitment
export const RECRUIT_QUALITY_DIVISOR = 100;
export const ELITE_LEVEL_MIN = 0.65;
export const ELITE_LEVEL_MAX = 1.1;
export const ROOKIE_LEVEL_MIN = 0.3;
export const ROOKIE_LEVEL_MAX = 0.7;
export const RECRUIT_AGE_MIN = 19;
export const RECRUIT_AGE_MAX = 26;
export const RECRUIT_COST_MIN = 2000;
export const RECRUIT_COST_MAX = 8000;

// Reputation
export const REP_QUALITY_WEIGHT = 0.7;
export const REP_MOMENTUM_WEIGHT = 0.3;
export const REP_DRIFT_RATE = 0.05;

// Momentum
export const MOMENTUM_QUALITY_OFFSET = 40;
export const MOMENTUM_QUALITY_MULT = 0.3;
export const MOMENTUM_JITTER_MIN = -5;
export const MOMENTUM_JITTER_MAX = 5;
export const MOMENTUM_MIN = -50;
export const MOMENTUM_MAX = 50;

// Hall of Fame
export const HOF_MIN_WINS = 8;

// Era tracking
export const ERA_QUALITY_THRESHOLD = 80;
export const ERA_REP_THRESHOLD = 60;
export const ERA_END_QUALITY = 30;
