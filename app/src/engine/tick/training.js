// Training domain — fighter growth, overtraining, injury, recovery, history
import { clamp, R, RI, random, pick, fmt$, uid } from "../rng.js";
import { ATTRS, ATTR_LABEL, TRAINING, INTENSITY, CAMP_TIERS, SPARRING_MATCH } from "../data.js";
import { coachBonus, facBonus } from "../economy.js";
import { calcMentorBonus } from "../career.js";
import { getRel } from "../relationships.js";

function calcSparringMult(f, g) {
  if (!g.roster || g.roster.length <= 1) return 1;
  const partners = g.roster.filter(x => x.id !== f.id && !x.injury && !x.booked);
  if (partners.length === 0) return 1;
  let best = 0;
  partners.forEach(p => {
    const m = (SPARRING_MATCH[f.archetype] || {})[p.archetype] || 0.3;
    if (m > best) best = m;
  });
  return clamp(1 + best * 0.1, 0.9, 1.15);
}

export function tickTraining(g) {
  if (!g || !g.roster) return;
  const chemMult = g.chemistry >= 80 ? 1.15 : g.chemistry < 40 ? 0.9 : 1;

  g.roster.forEach((f) => {
    // Morale drift toward 60
    if (!f.injury && !f.booked) {
      f.morale = clamp(f.morale + (f.morale < 60 ? 2 : f.morale > 60 ? -2 : 0), 0, 100);
    }

    // Injury recovery
    if (f.injury) {
      f.injury.weeks--;
      if (f.injury.weeks <= 0) {
        f.injury = null;
        // Medical facility: small morale boost on recovery
        const medMorale = (g.facilities.medical - 1) * 2;
        if (medMorale > 0) f.morale = clamp(f.morale + medMorale, 0, 100);
        g.log.unshift(`✅ ${f.name} pulih dari cedera.`);
      }
      if (f.injury && f.injury.costPerWeek) {
        const medMult = 1 - (g.facilities.medical - 1) * 0.05;
        g.cash -= Math.round(f.injury.costPerWeek * medMult);
      }
      if (f.injury && f.injury.weeks > 4) {
        const decayAttr = f.injury.tier >= 2
          ? ["striking","wrestling","bjj","footwork","strength","cardio"]
          : ["cardio"];
        decayAttr.forEach((k) => f.attrs[k] = clamp(f.attrs[k] - 0.15, 5, f.ceilings[k]));
      }
      return; // injured fighters don't train
    }

    // Inactivity morale penalty
    if (!f.booked && g.week - (f.lastFightWeek || 0) > 16) {
      f.morale = clamp(f.morale - 0.5, 0, 100);
    }

    // Training
    const t = f.booked && f.booked.weeksLeft <= 2 ? TRAINING.fightcamp : (TRAINING[f.training.type] || TRAINING.conditioning);
    const inten = INTENSITY[f.training.intensity] || INTENSITY.Medium;
    g.cash -= t.cost;

    // Training attention constraint
    const activeFighters = g.roster.filter(x => !x.injury && x.training?.type !== "recovery").length;
    const availableCoaches = g.coaches.filter(c => !c.freeUntil || g.week > c.freeUntil).length;
    const attentionMult = activeFighters > 0 ? clamp(availableCoaches / Math.max(activeFighters, 1), 0.7, 1.0) : 1.0;

    if (f.training.type === "recovery" && !f.booked) {
      f.overtraining = clamp(f.overtraining - 30, 0, 100);
      f.morale = clamp(f.morale + 4, 0, 100);
    } else {
      const ageMult = f.age <= 21 ? 1.3 : f.age <= 26 ? 1.15 : f.age <= 30 ? 1.0 : f.age <= 33 ? 0.90 : f.age <= 36 ? 0.75 : 0.55;
      const otMult = f.overtraining < 25 ? 1 : f.overtraining < 50 ? 0.9 : f.overtraining < 75 ? 0.75 : 0.5;
      const traitMult = f.traits?.includes("Natural Talent") ? 1.15 : 1;
      const moraleMult = f.morale >= 75 ? 1.1 : f.morale < 40 ? 0.85 : 1;
      const sparringMult = calcSparringMult(f, g);
      const relAvg = g.relationships && g.roster.length > 1
        ? g.roster.reduce((s, other) => other.id !== f.id ? s + getRel(g, f.id, other.id) : s, 0) / (g.roster.length - 1) / 100 : 0;
      const relMult = clamp(1 + relAvg * 0.15, 0.85, 1.1);
      const mentorMult = calcMentorBonus(g, f);

      let totalGain = 0;
      let bestGain = 0;
      let bestAttr = "";
      t.gains.forEach((k) => {
        const cap = f.ceilings[k];
        const prog = f.attrs[k] / cap;
        const capMult = f.traits?.includes("Grinder") ? 0.9 : prog < 0.7 ? 1 : prog < 0.9 ? 0.6 : 0.3;
        const gain = R(0.5, 1.4) * inten.mult * ageMult * otMult * traitMult * moraleMult * capMult
          * chemMult * coachBonus(g, [k]) * facBonus(g, [k]) * mentorMult * sparringMult * relMult * attentionMult;
        f.attrs[k] = clamp(f.attrs[k] + gain, 0, cap);
        totalGain += gain;
        if (gain > bestGain) { bestGain = gain; bestAttr = k; }
      });
      // Training feedback: log meaningful growth
      if (totalGain > 0.5 && bestAttr) {
        g.log.unshift(`🥊 ${f.name} +${totalGain.toFixed(1)} attr (best: ${bestAttr} +${bestGain.toFixed(1)}) — ${t.label}`);
      }

      // Overtraining
      const discMult = g.coaches.some((c) => c.personality === "Disciplinarian") ? 0.75 : 1;
      f.overtraining = clamp(f.overtraining + inten.ot * (f.ambition === "Grinder" ? 0.75 : 1) * discMult - 8, 0, 100);
      if (f.overtraining >= 90) {
        f.injury = { weeks: 2, label: "Breakdown (overtraining)", costPerWeek: 0 };
      }
    }

    // Injury risk
    let injP = inten.inj + (f.overtraining > 50 ? 0.05 : 0) + (f.overtraining > 75 ? 0.08 : 0);
    if (f.traits?.includes("Cautious")) injP *= 0.85;
    if (f.traits?.includes("Injury Prone")) injP *= 2.0;
    if (g.coaches.some((c) => c.personality === "Disciplinarian")) injP *= 0.85;
    injP *= 1 - (g.facilities.medical - 1) * 0.05;

    if (random() < injP) {
      const roll = random();
      let sev;
      if (roll < 0.5) sev = { weeks: RI(1, 2), label: "🚑 Minor", cost: RI(500, 2000), tier: 0 };
      else if (roll < 0.8) sev = { weeks: RI(3, 6), label: "⚕️ Moderate", cost: RI(2000, 8000), tier: 1 };
      else if (roll < 0.95) sev = { weeks: RI(8, 16), label: "🆘 Serious", cost: RI(8000, 20000), tier: 2 };
      else sev = { weeks: RI(20, 36), label: "💀 Career-Threatening", cost: RI(15000, 40000), tier: 3, permanent: true };
      sev.costPerWeek = Math.round(sev.cost / sev.weeks);
      f.injury = sev;
      f.injuryCount = (f.injuryCount || 0) + 1;
      if (sev.tier >= 2) f.seriousInjuries = (f.seriousInjuries || 0) + 1;
      if (sev.tier >= 2) {
        if (!f.careerHistory) f.careerHistory = [];
        f.careerHistory.push({ week: g.week, type: "injury", text: `${sev.label} — ${sev.weeks}w recovery${sev.permanent ? ", permanent damage" : ""}` });
      }
      if (sev.permanent) {
        const attr = pick(ATTRS.filter((k) => k !== "chin"));
        const reduction = RI(3, 8);
        f.attrs[attr] = clamp(f.attrs[attr] - reduction, 5, 99);
        f.ceilings[attr] = clamp(f.ceilings[attr] - reduction, f.attrs[attr], 99);
        g.log.unshift(`💀 ${f.name} mengalami kerusakan permanen: ${ATTR_LABEL[attr]} -${reduction} (sekarang ${Math.round(f.attrs[attr])}).`);
      }
      if (f.seriousInjuries >= 4 && !f.traits?.includes("Injury Prone")) {
        f.traits.push("Injury Prone");
        g.log.unshift(`⚠️ ${f.name} kini memiliki trait "Injury Prone" — 4+ cedera serius. Risiko cedera naik permanen.`);
      }
      f.morale = clamp(f.morale - (sev.tier >= 2 ? 14 : 8), 0, 100);
      g.log.unshift(`🚑 ${f.name}: ${sev.label} (${sev.weeks} minggu, biaya ${fmt$(sev.cost)}).`);
    }

    // Training history
    if (!f.trainingHistory) f.trainingHistory = [];
    f.trainingHistory.push({ week: g.week, attrs: { ...f.attrs } });
    if (f.trainingHistory.length > 8) f.trainingHistory.shift();

    // Popularity decay
    if (!f.booked && !f.injury) {
      f.popularity = clamp(f.popularity - 0.5, 0, 100);
    }
    if (f.booked) f.booked.weeksLeft--;
  });
}
