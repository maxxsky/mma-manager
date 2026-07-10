import { clamp, pick } from "../rng.js";
import { GROUND } from "./ground.js";
import { getArchetypeBehavior } from "../archetype-expression.js";

export const EXCHANGES = {
  strike:  { pos: ["standing"],                label: "Striking exchange" },
  power:   { pos: ["standing"],                label: "Power shot" },
  clinch:  { pos: ["standing"],                label: "Clinch" },
  td:      { pos: ["standing"],                label: "Takedown" },
  gnp:     { pos: ["ground"],                  label: "Ground & pound" },
  sub:     { pos: ["ground"],                  label: "Submission" },
  scramble:{ pos: ["ground"],                  label: "Scramble" },
  sweep:   { pos: ["ground"],                  label: "Sweep" },
  advance: { pos: ["ground"],                  label: "Position advance" },
};

export function pickExchange(pos, A, B, planA) {
  const pool = [];
  const isGround = pos && pos.type && pos.type !== "standing";
  const groundType = isGround ? pos.type : null;
  const behaviorA = getArchetypeBehavior(A);
  const behaviorB = getArchetypeBehavior(B);
  if (!isGround) {
    pool.push("strike", "strike", "strike", "strike");
    pool.push("power");
    pool.push("clinch", "clinch");
    const tdWeightA = A.attrs.wrestling > 55 || planA === "Take It Down" ? 4 : 1;
    const tdWeightB = B.attrs.wrestling > 55 ? 4 : 1;
        // Archetype expression: add behavior-weighted entries
    for (let i = 0; i < (behaviorA.strikeWeight || 0); i++) pool.push("strike");
    for (let i = 0; i < (behaviorB.strikeWeight || 0); i++) pool.push("strike");
    for (let i = 0; i < (behaviorA.clinchWeight || 0); i++) pool.push("clinch");
    for (let i = 0; i < (behaviorB.clinchWeight || 0); i++) pool.push("clinch");
    for (let i = 0; i < tdWeightA + (behaviorA.tdWeight || 0); i++) pool.push("td");
    for (let i = 0; i < tdWeightB; i++) pool.push("tdB");
  } else {
    const topFighter = pos.top === "A" ? A : B;
    const g = GROUND[groundType] || GROUND.guard;
    const gnpW = Math.round(g.topGNP * 8);
    const subFromTop = Math.round(clamp((topFighter.attrs.bjj - 20) / 15, 2, 6));
    const subFromBottom = Math.round(g.bottomSub * 4);
    const sweepW = Math.round(g.sweepChance * 6);
    const advW = Math.round(g.advanceChance * 4);
    for (let i = 0; i < gnpW + (behaviorA.topControlBonus ? 1 : 0); i++) pool.push("gnp");
    for (let i = 0; i < subFromTop; i++) pool.push("sub");
    for (let i = 0; i < subFromBottom; i++) pool.push("sub");
    for (let i = 0; i < sweepW + (behaviorA.sweepWeight || 0); i++) pool.push("sweep");
    for (let i = 0; i < advW; i++) pool.push("advance");
    pool.push("scramble", "scramble");
  }
  return pool.length > 0 ? pick(pool) : "strike";
}
