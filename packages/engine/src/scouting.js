// Scouting — methods, report grade and the scouting run itself.
// Moved out of App.jsx/Scout.jsx so the engine generates the prospect,
// charges the cost and decides the report grade (P3 #40).
//
// Report grade used to come from camp reputation alone, and reputation
// reaches 100 within 2–4 years, so every report soon became grade S (exact
// numbers). Now each method caps the grade: wider, pricier networks report
// more accurately. Reputation still sets the ceiling.
import { R, uid } from "./rng.js";
import { CAMP_TIERS } from "./data.js";
import { genFighter, assignAgent, makeReport } from "./fighter.js";
import { generateTransferReason } from "./narrative/generators/transfer.js";
import { MAX_PROSPECTS } from "./reducer/constants.js";

const GRADE_ORDER = ["C", "B", "A", "S"];

export const SCOUT_METHODS = [
  { id: "local",    label: "Local Amateur Circuit",  cost: () => 75,   level: [0.30, 0.45], gradeCap: "B",
    desc: "Sirkuit amatir lokal — jangkauan sempit, cocok cari bakat kampung." },
  { id: "regional", label: "Regional Tryouts",       cost: () => 400,  level: [0.35, 0.55], gradeCap: "A",
    desc: "Tryout lintas daerah — jangkauan lebih luas, tetap di level amatir." },
  { id: "national", label: "National Scouting Trip", cost: () => 1200, level: [0.40, 0.60], gradeCap: "S",
    desc: "Pencarian nasional — jangkauan terluas untuk level amatir." },
  { id: "diamond",  label: "Diamond in the Rough",   cost: (g) => 10000 + Math.floor((g.rep || 0) * 150), level: [1.0, 1.45], gradeCap: "A",
    desc: "Fighter established kadang mempertimbangkan pindah camp — tapi cuma kalau reputasi & fasilitasmu meyakinkan." },
];

export const scoutMethod = (id) => SCOUT_METHODS.find((m) => m.id === id || m.label === id) || null;

/** Grade from reputation alone (the ceiling). */
export function repScoutGrade(rep) {
  return rep >= 60 ? "S" : rep >= 40 ? "A" : rep >= 20 ? "B" : "C";
}

/** Report grade for a method: the lower of the reputation grade and the method's cap. */
export function scoutGradeFor(g, method) {
  const rep = repScoutGrade(g.rep || 0);
  const cap = method?.gradeCap || "S";
  return GRADE_ORDER[Math.min(GRADE_ORDER.indexOf(rep), GRADE_ORDER.indexOf(cap))];
}

export function diamondEligibility(g) {
  const levels = g.facilities ? Object.values(g.facilities) : [];
  const avgFac = levels.length ? levels.reduce((s, v) => s + v, 0) / levels.length : 0;
  return { eligible: (g.rep || 0) >= 20 && avgFac >= 2, avgFac };
}

/** Why a scouting run cannot happen now, or null. */
export function scoutBlocker(g, method) {
  if (!method) return "unknown";
  const cap = CAMP_TIERS[g.campTier || 0]?.rosterCap ?? 8;
  if ((g.roster || []).length >= cap) return "rosterFull";
  if (g.cash < method.cost(g)) return "cash";
  if (method.id === "diamond" && !diamondEligibility(g).eligible) return "diamondLocked";
  return null;
}

/** Run a scouting trip: charge, generate a prospect (honouring filters), file a report. */
export function runScout(g, methodId, { filterArch = null, filterWC = null } = {}) {
  const method = scoutMethod(methodId);
  const blocked = scoutBlocker(g, method);
  if (blocked) return { blocked };
  const cost = method.cost(g);
  const grade = scoutGradeFor(g, method);
  const existing = new Set([...(g.roster || []).map((x) => x.name), ...(g.prospects || []).map((x) => x.fighter?.name)]);
  let f = assignAgent(genFighter(R(method.level[0], method.level[1])));
  for (let attempt = 0; attempt < 10; attempt++) {
    const matches = (!filterArch || f.archetype === filterArch) && (!filterWC || f.weightClass === filterWC);
    if (matches && !existing.has(f.name)) break;
    f = assignAgent(genFighter(R(method.level[0], method.level[1])));
  }
  g.cash -= cost;
  if (!g.prospects) g.prospects = [];
  g.prospects.unshift({
    id: uid(), fighter: f, report: makeReport(f, grade), grade, method: method.label, scoutedWeek: g.week,
    transferReason: method.id === "diamond" ? generateTransferReason(f) : undefined,
  });
  if (g.prospects.length > MAX_PROSPECTS) {
    g.log.unshift("📋 " + g.prospects[g.prospects.length - 1].fighter.name + " (prospect) di-drop — slot scouting penuh.");
    g.prospects = g.prospects.slice(0, MAX_PROSPECTS);
  }
  g.log.unshift("🔍 Scout report baru (" + method.label + ", grade " + grade + ").");
  return { grade, cost };
}
