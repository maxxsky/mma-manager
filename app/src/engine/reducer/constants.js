// Shared constants for reducer modules
// Extracted from magic values in the original monolithic reducer

// Undo/redo
export const MAX_UNDO_STACK = 20;
export const MAX_ACTION_LOG = 500;

// Camp limits
export const MAX_PROSPECTS = 5;

// Chemistry modifiers
export const CHEM_PENALTY_FIRE_COACH = 5;
export const CHEM_PENALTY_TALK_POACH = 5;
export const CHEM_BOOST_UPGRADE = 5;

// Promoter relationship
export const PROMOTER_REL_GAIN_ACCEPT = 5;
export const PROMOTER_REL_LOSS_COUNTER = 3;
export const PROMOTER_REL_LOSS_REJECT = 8;

// Morale
export const MORALE_BOOST_COUNTER_POACH = 20;
export const MORALE_BOOST_TALK = 15;
export const MORALE_BOOST_SIGN_EXTEND = 8;

// Contract
export const MANAGER_CUT_INCREMENT = 0.02;
export const MANAGER_CUT_MAX = 0.35;
export const DEFAULT_MANAGER_CUT = 0.18;

// Chemistry thresholds
export const CHEM_MIN_TALK_POACH = 50;

// Team bonding
export const TEAM_BONDING_COST = 2000;
export const TEAM_BONDING_CHEM = 8;
export const TEAM_BONDING_COOLDOWN = 12; // weeks

// Game state
export const BANKRUPT_THRESHOLD = -50000;
export const CASH_WARNING_THRESHOLD = 15000;
export const CASH_WARNING_RESET_BUFFER = 5000; // hysteresis, biar gak flapping

// Coach
export const DEFAULT_COACH_CAP = 5;
