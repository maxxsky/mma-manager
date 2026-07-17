// Engine barrel — single import point for the entire game engine.
// All existing file-level imports continue to work; this is additive.

export { R, RI, clamp, pick, fmt$, uid, random, setRNG, resetRNG, mulberry32, snapshot } from "./rng.js";
export * from "./data.js";
export { genFighter, assignAgent, agentFor, avgSkill, tierOf, weeklyFee, scoutGrade, makeReport, genCoach, genBio, gradeOf, defaultContract } from "./fighter.js";
export { simRound, prepFighter, effAttr, autoGamePlan } from "./fight.js";
export { newGame, tick } from "./state.js";
export { reducer } from "./reducer.js";
export { genDivisions, rankOf, vacateTitle, stripTitle, initPromoterRel } from "./rankings.js";
export { genRivalCamp } from "./rivals.js";
export { facilityCost, coachBonus, facBonus } from "./economy.js";
export { checkAchievements } from "./achievements.js";
export { relKey, getRel, addRel } from "./relationships.js";
export { monthlyBurn, monthlyIn } from "./finance.js";
