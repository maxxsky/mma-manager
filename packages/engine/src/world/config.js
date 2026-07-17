// World simulation constants — intervals, thresholds, age limits
export const TICK_YEARLY = 48;        // weeks per year
export const TICK_TITLE_DEFENSE = 24; // weeks between AI title defenses
export const TICK_MONTHLY = 4;        // weeks per month
export const TICK_QUARTERLY = 12;     // weeks per quarter

export const MIN_DIVISION_SIZE = 15;  // minimum fighters per division
export const MAX_FIGHTER_AGE = 40;    // forced retirement age
export const RETIREMENT_AGE = 38;     // retirement check starts
export const RETIREMENT_CHANCE = 0.3; // yearly retirement probability

export const UPSET_BASE_CHANCE = 0.25; // base chance of title change
export const UPSET_MAX = 0.5;
export const UPSET_MIN = 0.1;

export const STREAK_THRESHOLD = 5;    // win streak for news event
export const STREAK_MAX = 8;
export const STREAK_MIN = -3;

export const BREAKTHROUGH_AGE = 24;   // max age for prospect breakthrough
export const BREAKTHROUGH_POINTS = 80; // min points for breakthrough

export const CHAMP_AGE_DECLINE = 33;  // age where champ skill declines
export const PEAK_AGE = 26;           // age where growth stops
export const DECLINE_AGE = 34;        // age where decline starts

export const SKILL_MIN = 0.3;
export const SKILL_MAX = 1.5;
export const POINTS_MIN = 5;
export const POINTS_MAX = 120;
export const POINTS_MAX_CHAMP_DROP = 100;
