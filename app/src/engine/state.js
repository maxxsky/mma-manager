import { R, RI, clamp, pick, fmt$, uid, random } from "./rng.js";
import {
  ATTRS, ATTR_LABEL, WEIGHTS, TRAITS, AMBITIONS, AMBITION_KEYS,
  TRAINING, INTENSITY, SPONSOR_BRANDS, CAMP_TIERS, FAC_LABEL,
  RIVAL_TRAITS, AGENT_TYPES, SPARRING_MATCH, SPONSOR_TERMS,
} from "./data.js";
import { genFighter, assignAgent, agentFor, avgSkill, weeklyFee, scoutGrade, genCoach } from "./fighter.js";
import { coachBonus, facBonus } from "./economy.js";
import { genDivisions, rankOf, vacateTitle, stripTitle, initPromoterRel } from "./rankings.js";
import { genRivalCamp } from "./rivals.js";
import { getRel } from "./relationships.js";

import { worldTick } from "./world.js";
import { processEventSystem, onCoachRaiseDenied, onConflictMediated, onWinningStreak } from "./events.js";
import { calcMentorBonus } from "./career.js";
// ---------- initial state ----------
export function newGame() {
  const freeCoach = genCoach();
  freeCoach.salary = Math.max(500, freeCoach.salary); // minimum salary biar gak $0
  freeCoach.freeUntil = 4;
  return {
    week: 1, cash: 35000, rep: 8, chemistry: 60,
    roster: [
      assignAgent(genFighter(0.55, "Indonesia")),
      assignAgent(genFighter(0.5)),
    ].map((f) => ({
      ...f,
      contract: {
        managerCut: 0.18, fightsLeft: 4, fightsTotal: 4,
        durationMo: 24, signedWeek: 0, renegoFlagged: false,
      },
    })),
    coaches: [{ ...freeCoach, name: "Coach Basic", skill: 3, spec: "Head" }],
    coachMarket: [genCoach(), genCoach(), genCoach()],
    facilities: { mats: 1, ring: 1, weights: 1, medical: 1 },
    campTier: 0,
    divisions: genDivisions(),
    inbox: [], log: ["Camp dibuka. Budget awal $35,000. Bertahan dan menangkan fight."],
    prospects: [], legacy: 0, over: null, won: false,
    rivals: [genRivalCamp(0), genRivalCamp(1), genRivalCamp(2)],
    promoterRel: initPromoterRel(),
    relationships: {},
    sponsors: [],
  };
}

// Sparring quality: archetype matching + external partner
function calcSparringMult(f, g) {
  let mult = clamp(1 + (g.roster.length - 2) * 0.02, 0.9, 1.1);
  if (g.roster.length > 1) {
    const matchScores = g.roster
      .filter((x) => x.id !== f.id && !x.injury && !x.booked)
      .map((x) => SPARRING_MATCH[f.archetype]?.[x.archetype] || 0.3);
    if (matchScores.length > 0) {
      const bestMatch = Math.max(...matchScores);
      mult += bestMatch * 0.08;
    }
  }
  return clamp(mult, 0.85, 1.2);
}

// ---------- tick logic ----------
export function tick(g) {
  g.week++;

  const chemMult = g.chemistry >= 80 ? 1.15 : g.chemistry < 40 ? 0.9 : 1;

  g.roster.forEach((f) => {
    if (!f.ambitionRevealed && g.week - (f.joinedWeek || 0) >= 8) {
      f.ambitionRevealed = true;
      g.log.unshift(`💭 Ambisi ${f.name} terungkap: ${f.ambition} — ${AMBITIONS[f.ambition]}.`);
    }
    f.morale = clamp(f.morale + (60 - f.morale) * 0.02, 0, 100);
    if (!f.booked && !f.injury && g.week - (f.lastFightWeek || 0) > 16) {
      f.morale = clamp(f.morale - 0.5, 0, 100);
    }
    if (g.coaches.some((c) => c.personality === "Motivator") && f.morale < 50) {
      f.morale = clamp(f.morale + 2, 0, 100);
    }

    if (f.injury) {
      f.injury.weeks--;
      if (f.injury.weeks <= 0) {
        f.injury = null;
        g.log.unshift(`✅ ${f.name} pulih dari cedera.`);
      }
      f.overtraining = clamp(f.overtraining - 10, 0, 100);
      if (f.injury && f.injury.costPerWeek) {
        // Medical clause affects camp cost: camp=100%, split=50%, fighter=0%
        const medMult = f.contract?.medical === "fighter" ? 0 : f.contract?.medical === "split" ? 0.5 : 1;
        g.cash -= Math.round(f.injury.costPerWeek * medMult);
      }
      // Slight attribute decay during long injuries (realistic ring rust)
      if (f.injury && f.injury.weeks > 4) {
        const decayAttr = f.injury.tier >= 2 ? ["striking","wrestling","bjj","footwork","strength","cardio"] : ["cardio"];
        decayAttr.forEach((k) => f.attrs[k] = clamp(f.attrs[k] - 0.15, 5, f.ceilings[k]));
      }
      return;
    }

    // During booking: fight camp only in last 2 weeks, otherwise player chooses
    const t = f.booked && f.booked.weeksLeft <= 2 ? TRAINING.fightcamp : TRAINING[f.training.type];
    const inten = INTENSITY[f.training.intensity];
    g.cash -= t.cost;

    if (f.training.type === "recovery" && !f.booked) {
      f.overtraining = clamp(f.overtraining - 30, 0, 100);
      f.morale = clamp(f.morale + 4, 0, 100);
    } else {
      const ageMult =
        f.age <= 21 ? 1.3 : f.age <= 26 ? 1.15 : f.age <= 30 ? 1.0 : f.age <= 33 ? 0.90 : f.age <= 36 ? 0.75 : 0.55;
      const otMult =
        f.overtraining < 25 ? 1 : f.overtraining < 50 ? 0.9 : f.overtraining < 75 ? 0.75 : 0.5;
      const traitMult = f.traits.includes("Natural Talent") ? 1.15 : 1;
      const moraleMult = f.morale >= 75 ? 1.1 : f.morale < 40 ? 0.85 : 1;
      const sparringMult = calcSparringMult(f, g);
      const relAvg =
        g.relationships && g.roster.length > 1
          ? g.roster.reduce((s, other) =>
              other.id !== f.id ? s + getRel(g, f.id, other.id) : s, 0) /
              (g.roster.length - 1) / 100
          : 0;
      const relMult = clamp(1 + relAvg * 0.15, 0.85, 1.1);
      const mentorMult = calcMentorBonus(g, f);

      t.gains.forEach((k) => {
        const cap = f.ceilings[k];
        const prog = f.attrs[k] / cap;
        const capMult = f.traits.includes("Grinder")
          ? 0.9
          : prog < 0.7 ? 1 : prog < 0.9 ? 0.6 : 0.3;
        const gain =
          R(0.5, 1.4) *
          inten.mult *
          ageMult *
          otMult *
          traitMult *
          moraleMult *
          capMult *
          chemMult *
          coachBonus(g, [k]) *
          facBonus(g, [k]) *
           mentorMult *
          sparringMult *
          relMult;
        f.attrs[k] = clamp(f.attrs[k] + gain, 0, cap);
      });


      const discMult = g.coaches.some((c) => c.personality === "Disciplinarian") ? 0.75 : 1;
      f.overtraining = clamp(
        f.overtraining + inten.ot * (f.ambition === "Grinder" ? 0.75 : 1) * discMult - 8,
        0, 100,
      );

      let injP =
        inten.inj + (f.overtraining > 50 ? 0.05 : 0) + (f.overtraining > 75 ? 0.08 : 0);
      if (f.traits.includes("Cautious")) injP *= 0.85;
      if (f.traits.includes("Injury Prone")) injP *= 2.0;
      if (g.coaches.some((c) => c.personality === "Disciplinarian")) injP *= 0.85;
      injP *= 1 - (g.facilities.medical - 1) * 0.05;

      if (random() < injP) {
        const roll = random();
        let sev;
        if (roll < 0.5)
          sev = { weeks: RI(1, 2), label: "🚑 Minor", cost: RI(500, 2000), tier: 0 };
        else if (roll < 0.8)
          sev = { weeks: RI(3, 6), label: "⚕️ Moderate", cost: RI(2000, 8000), tier: 1 };
        else if (roll < 0.95)
          sev = { weeks: RI(8, 16), label: "🆘 Serious", cost: RI(8000, 20000), tier: 2 };
        else
          sev = {
            weeks: RI(20, 36), label: "💀 Career-Threatening",
            cost: RI(15000, 40000), tier: 3, permanent: true,
          };
        sev.costPerWeek = Math.round(sev.cost / sev.weeks);
        f.injury = sev;
        f.injuryCount = (f.injuryCount || 0) + 1;
        if (sev.tier >= 2) f.seriousInjuries = (f.seriousInjuries || 0) + 1;
        // Career history for serious injuries
        if (sev.tier >= 2) {
          if (!f.careerHistory) f.careerHistory = [];
          f.careerHistory.push({ week: g.week, type: "injury", text: `${sev.label} — ${sev.weeks}w recovery${sev.permanent ? ", permanent damage" : ""}` });
        }
        if (sev.permanent) {
          const attr = pick(ATTRS.filter((k) => k !== "chin"));
          const reduction = RI(3, 8);
          f.attrs[attr] = clamp(f.attrs[attr] - reduction, 5, 99);
          f.ceilings[attr] = clamp(f.ceilings[attr] - reduction, f.attrs[attr], 99);
          g.log.unshift(
            `💀 ${f.name} mengalami kerusakan permanen: ${ATTR_LABEL[attr]} -${reduction} (sekarang ${Math.round(f.attrs[attr])}).`,
          );
        }
        if (f.seriousInjuries >= 4 && !f.traits.includes("Injury Prone")) {
          f.traits.push("Injury Prone");
          g.log.unshift(
            `⚠️ ${f.name} kini memiliki trait "Injury Prone" — 4+ cedera serius. Risiko cedera naik permanen.`,
          );
        }
        f.morale = clamp(f.morale - (sev.tier >= 2 ? 14 : 8), 0, 100);
        g.log.unshift(
          `🚑 ${f.name}: ${sev.label} (${sev.weeks} minggu, biaya ${fmt$(sev.cost)}).`,
        );
        if (f.booked) {
          g.log.unshift(
            `❌ Fight ${f.name} DIBATALKAN karena cedera. Relasi promotor turun.`,
          );
          f.booked = null;
          g.rep = clamp(g.rep - 2, 0, 100);
        }
      }

      if (f.overtraining >= 90) {
        f.injury = { weeks: 2, label: "Breakdown (overtraining)" };
        f.morale = clamp(f.morale - 10, 0, 100);
        g.log.unshift(
          `⚠️ ${f.name} breakdown karena overtraining — istirahat paksa 2 minggu.`,
        );
      }
    }

    g.cash += weeklyFee(f);
    // Record training history (last 8 weeks snapshot)
    if (!f.trainingHistory) f.trainingHistory = [];
    f.trainingHistory.push({ week: g.week, attrs: { ...f.attrs } });
    if (f.trainingHistory.length > 8) f.trainingHistory.shift();
    // Popularity decay: fighters lose 0.5 pop/week when not booked or doing content
    if (!f.booked && !f.injury) {
      f.popularity = clamp(f.popularity - 0.5, 0, 100);
    }
    if (f.booked) f.booked.weeksLeft--;
  });

  // ---------- chemistry events ----------
  if (random() < 0.30 && g.roster.length >= 2) {
    const roll = random();
    const fa = pick(g.roster);
    const fb = pick(g.roster.filter((x) => x.id !== fa.id));
    const coachTarget = pick(g.coaches.filter((c) => !c.freeUntil || g.week > c.freeUntil));

    if (roll < 0.25 && fa && fb) {
      g.inbox.unshift({
        id: uid(), type: "event", title: "Konflik sparring",
        body: `${fa.name} dan ${fb.name} clash saat sparring — suasana camp tegang.`,
        choices: [
          { label: "Pisahkan jadwal", chem: 2 },
          { label: "Biarkan — bisa akur (+6) atau makin parah (-8)", gamble: [6, -8] },
          { label: "Mediasi", chem: 5 },
        ],
      });
    } else if (roll < 0.45 && coachTarget) {
      // Coach asks for fair raise based on skill + tenure. No more double-charge or 0% raises.
      const tenureWeeks = g.week - (coachTarget.hiredWeek || 0);
      const tenureYears = Math.floor(tenureWeeks / 48);
      const raisePct = clamp(0.10 + tenureYears * 0.03 + (coachTarget.skill - 3) * 0.02, 0.08, 0.50);
      const raiseAmt = Math.round(coachTarget.salary * raisePct);
      const newSalary = coachTarget.salary + raiseAmt;
      const hasRaisedRecently = coachTarget.lastRaiseWeek && g.week - coachTarget.lastRaiseWeek < 48;
      if (hasRaisedRecently || raiseAmt < 200) return; // skip if raised recently or amount too small
      g.inbox.unshift({
        id: uid(), type: "event", title: `${coachTarget.name} minta naik gaji`,
        body: `${coachTarget.name} sudah ${tenureYears > 0 ? tenureYears + " tahun" : Math.floor(tenureWeeks / 4) + " bulan"} di camp (skill ${coachTarget.skill}). Dia minta kenaikan ${Math.round(raisePct * 100)}%: dari ${fmt$(coachTarget.salary)} → ${fmt$(newSalary)}/bulan.`,
        choices: [
          {
            label: `Naikkan ke ${fmt$(newSalary)} (+${Math.round(raisePct * 100)}%)`,
            coachSalary: { id: coachTarget.id, amt: newSalary },
          },
          { label: "Tolak — risiko resign", chem: -5, coachResignChance: { id: coachTarget.id, chance: clamp(raisePct * 1.5, 0.15, 0.60) } },
        ],
      });
    } else if (roll < 0.65 && fa && fb) {
      const bigger = fa.popularity > fb.popularity ? fa : fb;
      const jealous = bigger.id === fa.id ? fb : fa;
      g.inbox.unshift({
        id: uid(), type: "event", title: `${jealous.name} cemburu`,
        body: `${jealous.name} melihat ${bigger.name} dapat lebih banyak sorotan. Dia merasa tidak dihargai.`,
        choices: [
          { label: "Beri perhatian khusus", chem: 3, moraleTo: { id: jealous.id, amt: 6 } },
          { label: "Acuhkan — hasil gak pasti (+2 atau -6)", gamble: [2, -6] },
        ],
      });
    } else if (roll < 0.80 && fa && fb) {
      const viral = pick([fa, fb]);
      g.inbox.unshift({
        id: uid(), type: "event", title: `${viral.name} viral!`,
        body: `Video latihan ${viral.name} menyebar — popularity naik, tapi chemistry camp terganggu karena perhatian terbagi.`,
        choices: [
          { label: "Manfaatkan momentum", chem: -3, viralPop: viral.id },
          { label: "Redam — fokus ke tim", chem: 3 },
        ],
      });
    } else {
      g.inbox.unshift({
        id: uid(), type: "event", title: "Team bonding",
        body: `${fa.name} dan ${fb.name} akur akhir-akhir ini. ${pick(["Mereka pergi makan bersama", "Mereka latihan bareng di luar jadwal", "Mereka saling support di sesi sparring"])}.`,
        choices: [
          { label: "Biarkan saja", chem: 3 },
          { label: "Kasih bonus kegiatan tim", chem: 6, cash: -5000 },
        ],
      });
    }
  }

  // ---------- fighter relationships ----------
  if (g.relationships) {
    const keys = Object.keys(g.relationships);
    keys.forEach((k) => {
      const v = g.relationships[k];
      if (v > 0) g.relationships[k] = clamp(v - 0.3, -100, 100);
      else if (v < 0) g.relationships[k] = clamp(v + 0.2, -100, 100);
    });
  }

  // ---------- fight offers ----------
  g.roster.forEach((f) => {
    if (f.injury || f.booked) return;
    const div = g.divisions[f.weightClass];
    const isChamp = div && div.champ.player && div.champ.fighterId === f.id;

    if (isChamp) {
    // Mandatory defense
    if (
      g.week - (f.lastFightWeek || 0) >= 24 &&
      !g.inbox.some((m) => m.type === "offer" && m.defense && m.fighterId === f.id)
    ) {
      const c0 = div.list[0];
      const opp = genFighter(clamp((c0.level || 1.3) + 0.05, 0.8, 1.5));
      opp.name = c0.name; opp.archetype = c0.archetype; opp.weightClass = f.weightClass;
      opp.record = { w: RI(10, 18), l: RI(0, 3), ko: 0, sub: 0, dec: 0 };
      g.inbox.unshift({
        id: uid(), type: "offer", fighterId: f.id, expires: 3,
        tier: "Major", show: RI(150, 300) * 1000, winBonus: RI(150, 300) * 1000,
        opponent: opp, title: true, defense: true, oppRank: 1, contenderId: c0.id,
        titleTier: "Major", titleText: "🛡️ MANDATORY TITLE DEFENSE", weeks: RI(4, 6),
      });
      g.log.unshift(
        `🛡️ Mandatory defense untuk ${f.name} tiba — tolak atau biarkan expire = title dicopot.`,
      );
    }
    // Double Champ attempt: champion can challenge adjacent division champion
    const wcIdx = WEIGHTS.findIndex((w) => w.name === f.weightClass);
    if (wcIdx >= 0 && g.week % 12 === 0 && random() < 0.20) {
      const targets = [];
      if (wcIdx > 0) targets.push(wcIdx - 1); // weight class below
      if (wcIdx < WEIGHTS.length - 1) targets.push(wcIdx + 1); // weight class above
      for (const t of targets) {
        const tDiv = g.divisions[WEIGHTS[t].name];
        if (tDiv && tDiv.champ && !tDiv.champ.player && !f.titles.includes("Double Champion")) {
          const superOpp = genFighter(1.45);
          superOpp.name = tDiv.champ.name; superOpp.archetype = tDiv.champ.archetype;
          superOpp.weightClass = WEIGHTS[t].name;
          superOpp.record = { w: RI(15, 22), l: RI(0, 2), ko: 0, sub: 0, dec: 0 };
          g.inbox.unshift({
            id: uid(), type: "offer", fighterId: f.id, expires: 4,
            tier: "Premier", show: RI(500, 1000) * 1000, winBonus: RI(500, 1000) * 1000,
            opponent: superOpp, title: true, defense: false, oppRank: 0,
            titleTier: "Major", titleText: "👑👑 DOUBLE CHAMP ATTEMPT — " + f.weightClass + " vs " + WEIGHTS[t].name,
            weeks: RI(6, 8), doubleChamp: WEIGHTS[t].name,
          });
          g.log.unshift("🌟 DOUBLE CHAMP: " + f.name + " (" + f.weightClass + " champ) challenges " + superOpp.name + " (" + WEIGHTS[t].name + " champ)!");
          return;
        }
      }
    }
    return;
    }

    if (random() < 0.35) {
      const rep = g.rep;
      const r = rankOf(g, f);

      // Interim title unification: champion recovered, create unification fight
      const wcDiv = g.divisions[f.weightClass];
      if (wcDiv && wcDiv.champ && wcDiv.champ.fighterId) {
        const currentChamp = g.roster.find((x) => x.id === wcDiv.champ.fighterId);
        if (currentChamp && !currentChamp.injury && !currentChamp.booked) {
          const interimChamp = g.roster.find((x) =>
            x.weightClass === f.weightClass && x.id !== currentChamp.id &&
            x.titles.includes("Interim Champion")
          );
          if (interimChamp && !interimChamp.booked && !interimChamp.injury && !g.inbox.some((m) => m.type === "offer" && m.unificationFor === interimChamp.id)) {
            g.inbox.unshift({
              id: uid(), type: "offer", fighterId: interimChamp.id, expires: 4,
              tier: "Major", show: RI(250, 500) * 1000, winBonus: RI(250, 500) * 1000,
              opponent: { name: currentChamp.name, archetype: currentChamp.archetype, record: currentChamp.record, weightClass: interimChamp.weightClass },
              title: true, defense: false, oppRank: 0, contenderId: null,
              titleTier: "Major", titleText: "🤝 INTERIM TITLE UNIFICATION", weeks: RI(4, 6),
              unificationFor: interimChamp.id,
            });
            g.log.unshift("🤝 UNIFICATION: " + interimChamp.name + " (interim) vs " + currentChamp.name + " (juara)!");
            return;
          }
        }
      }

      // Interim title
      // (original check below)
      if (
        wcDiv && wcDiv.champ && wcDiv.champ.fighterId &&
        wcDiv.champ.fighterId !== f.id
      ) {
        const champ = g.roster.find((x) => x.id === wcDiv.champ.fighterId);
        if (
          champ && champ.injury && champ.injury.weeks >= 8 &&
          !f.titles.includes("Interim Champion") && r != null && r <= 5 &&
          !g.inbox.some((m) => m.interimDiv === f.weightClass)
        ) {
          g.inbox.unshift({
            id: uid(), type: "offer", fighterId: f.id, expires: 3,
            interimDiv: f.weightClass,
            tier: "Major", show: RI(80, 150) * 1000, winBonus: RI(80, 150) * 1000,
            opponent: genFighter(1.3), title: true, defense: false,
            oppRank: 1, contenderId: null,
            titleTier: "Interim", titleText: "⏳ INTERIM TITLE FIGHT",
            weeks: RI(4, 6),
          });
          return;
        }
      }

      const has = (t) => f.titles.includes(t);
      const sk = avgSkill(f);
      let titleTier = null;
      let titleReason = "";

      if (
        rep >= 80 && r != null && r <= 3 && sk >= 80 &&
        has("Major World Champion") && random() < 0.25
      ) {
        titleTier = "Premier";
        titleReason = `rank #${r} + juara Major + rep ${Math.round(rep)} + skill ${Math.round(sk)}`;
      } else if (
        rep >= 60 && r != null && r <= 5 && sk >= 72 &&
        has("National Champion") && !has("Major World Champion") && random() < 0.35
      ) {
        titleTier = "Major";
        titleReason = `rank #${r} + juara Nasional + rep ${Math.round(rep)} + skill ${Math.round(sk)}`;
      } else if (
        rep >= 50 && r != null && r <= 8 && sk >= 65 &&
        has("National Champion") && !has("Minor World Champion") &&
        f.record.w >= 7 && random() < 0.3
      ) {
        titleTier = "Minor";
        titleReason = `rank #${r} + juara Nasional + ${f.record.w} menang + skill ${Math.round(sk)}`;
      } else if (
        rep >= 40 && r != null && r <= 10 && sk >= 55 &&
        has("Regional Champion") && !has("National Champion") &&
        f.record.w >= 5 && random() < 0.3
      ) {
        titleTier = "National";
        titleReason = `rank #${r} + juara Regional + ${f.record.w} menang + skill ${Math.round(sk)}`;
      } else if (
        rep >= 20 && f.record.w >= 3 && sk >= 45 &&
        !has("Regional Champion") && random() < 0.3
      ) {
        titleTier = "Regional";
        titleReason = `${f.record.w} menang + rep ${Math.round(rep)} + skill ${Math.round(sk)}`;
      }

      let tier, show;
      if (rep >= 80 && f.record.w >= 8) { tier = "Premier"; show = RI(300, 600) * 1000; }
      else if (rep >= 60 && f.record.w >= 6) { tier = "Major"; show = RI(60, 200) * 1000; }
      else if (rep >= 40 && f.record.w >= 4) { tier = "National"; show = RI(12, 60) * 1000; }
      else if (rep >= 20 && f.record.w >= 2) { tier = "Regional"; show = RI(3, 12) * 1000; }
      else { tier = "Local"; show = RI(8, 30) * 100; }
      if (titleTier) show = Math.round(show * 1.5);

      // Streak-based purse adjustment
      let streakBonus = 1;
      if (f.streakL >= 2) streakBonus = 0.7; // lose streak → purse lebih rendah, lawan lebih mudah
      else if (f.streakL >= 1) streakBonus = 0.85;
      if (f.streakW >= 4) streakBonus = 1.3; // win streak → purse naik
      else if (f.streakW >= 2) streakBonus = 1.15;
      show = Math.round(show * streakBonus);

      // Promoter relationship bonus: high rel = better purse + main event
      const rel = g.promoterRel?.[tier] || 30;
      if (rel >= 85) show = Math.round(show * 1.4);
      else if (rel >= 70) show = Math.round(show * 1.2);
      let isMainEvent = rel >= 70 && random() < 0.4;
      let isTitleEliminator = rel >= 85 && r != null && r <= 3 && random() < 0.25;

      // Short notice: random chance for urgent replacement fight
      let shortNotice = false;
      if (random() < 0.08) { shortNotice = true; show = Math.round(show * RI(15, 20) / 10); }

      // Streak-based opponent selection
      let oppIdx = r != null ? clamp(r - 2 + RI(-1, 1), 0, 14) : RI(11, 14);
      if (f.streakL >= 2) oppIdx = clamp(oppIdx - RI(2, 4), 0, 14); // lose streak → easier opponent
      else if (f.streakW >= 3) oppIdx = clamp(oppIdx + RI(1, 2), 0, 14); // win streak → harder opponent

      let opp, oppRank = null, contenderId = null;
      if (titleTier === "Major") {
        opp = genFighter(1.45); opp.name = div.champ.name; oppRank = 0;
      } else if (div && (r != null || (f.record.w >= 2 && rep >= 20 && random() < 0.35))) {
        const c = div.list[oppIdx];
        opp = genFighter(clamp(c.level || 1, 0.5, 1.5));
        opp.name = c.name; opp.archetype = c.archetype;
        oppRank = oppIdx + 1; contenderId = c.id;
      } else {
        opp = genFighter(clamp(avgSkill(f) / 60 + R(-0.08, 0.1), 0.3, 1.5));
      }
      opp.weightClass = f.weightClass;
      if (!opp.record.w) opp.record = { w: RI(2, 14), l: RI(0, 5), ko: 0, sub: 0, dec: 0 };

      // Matchup storytelling
      const archA = f.archetype;
      const archB = opp.archetype;
      let story = "";
      const strikerH = {Boxer:1,"Muay Thai":1,Wrestler:0,"BJJ Specialist":0,"All-Rounder":1};
      const isStrikerA = strikerH[archA] === 1;
      const isStrikerB = strikerH[archB] === 1;
      if (isStrikerA && isStrikerB) story = "🔥 Firefight! Two strikers — guaranteed KO threat in every exchange.";
      else if (!isStrikerA && !isStrikerB) story = "🛌 Grind session — both grapplers, this could go to the canvas early.";
      else if (isStrikerA && !isStrikerB) story = "🎯 Striker vs Grappler — can " + opp.name + " survive the ground?";
      else story = "🎯 Grappler vs Striker — classic clash of styles!";

      let titleText = "";
      if (titleTier === "Premier") titleText = "🏆 PREMIER WORLD TITLE FIGHT";
      else if (titleTier === "Major") titleText = "🏆 MAJOR WORLD TITLE FIGHT";
      else if (titleTier === "Minor") titleText = "🌍 MINOR WORLD TITLE FIGHT";
      else if (titleTier === "National") titleText = "🥇 NATIONAL TITLE FIGHT";
      else if (titleTier === "Regional") titleText = "🥇 REGIONAL TITLE FIGHT";
      else if (isMainEvent) titleText = "🌟 MAIN EVENT";
      else if (isTitleEliminator) titleText = "🥇 TITLE ELIMINATOR — winner faces champion";
      else if (shortNotice) titleText = "⚡ SHORT NOTICE REPLACEMENT — purse boosted!";
      else if (tier !== "Local") titleText = "Fight Offer — " + tier;

      g.inbox.unshift({
        id: uid(), type: "offer", fighterId: f.id, expires: shortNotice ? 2 : 3,
        tier, show, winBonus: show, opponent: opp,
        title: titleTier === "Major" || titleTier === "Premier",
        titleTier, oppRank, contenderId,
        titleText, story, shortNotice, isMainEvent, isTitleEliminator,
        weeks: shortNotice ? RI(1, 2) : RI(4, 6),
      });
    }
  });

  g.inbox = g.inbox.filter((m) => {
    if (m.type !== "offer" && m.type !== "investor" && m.type !== "sponsor") return true;
    m.expires--;
    if (m.expires <= 0 && m.defense) stripTitle(g, m.fighterId);
    return m.expires > 0;
  });

  // Prospect expiry: prospects that stay >12 weeks get signed by other camps
  if (g.prospects && g.prospects.length > 0 && g.week % 4 === 0) {
    const expired = g.prospects.filter((p) => g.week - (p.scoutedWeek || 0) > 12);
    if (expired.length > 0) {
      expired.forEach((p) => g.log.unshift("👋 " + p.fighter.name + " — prospect diambil camp lain (12+ minggu di pool)."));
    }
    g.prospects = g.prospects.filter((p) => g.week - (p.scoutedWeek || 0) <= 12);
  }

  // ---------- monthly settlement ----------
  if (g.week % 4 === 0) {
    let sal = 0;
    g.coaches.forEach((c) => {
      if (!c.freeUntil || g.week > c.freeUntil) sal += c.salary;
    });
    const facVal = Object.values(g.facilities).reduce((s, l) => s + l * 30000, 0);
    const maint = Math.round(facVal * 0.05);
    let sponsorAmt = Math.round(g.rep * 500); // base sponsor

    // Multi-sponsor settlement
    if (g.sponsors && g.sponsors.length > 0) {
      sponsorAmt = 0;
      g.sponsors.forEach((sp) => {
        const brand = SPONSOR_BRANDS.find((b) => b.name === sp.brand);
        if (!brand) return;
        let rate = sp.rate || brand.baseRate;
        if (sp.terms === "royalty") {
          // royalty: hitung bonus dari kemenangan bulan ini + boost
          const wins = g.roster.filter((f) => f.lastFightWeek && g.week - f.lastFightWeek <= 4 && f.record.w > 0).length;
          if (brand.boostFame) rate = Math.round(rate * (1 + (g.roster.reduce((s, f) => s + f.popularity, 0) / g.roster.length / 100) * (brand.boostFame - 1)));
          if (brand.boostFight) rate = Math.round(rate * (1 + wins * (brand.boostFight - 1)));
        }
        sponsorAmt += rate;
        // Countdown weeksLeft if set
        if (sp.weeksLeft != null) {
          sp.weeksLeft--;
          if (sp.weeksLeft <= 0) {
            g.log.unshift(`📢 Kontrak ${sp.brand} berakhir — cari sponsor baru.`);
          }
        }
      });
      g.sponsors = g.sponsors.filter((sp) => sp.weeksLeft == null || sp.weeksLeft > 0);
    }

    const fSponsor = g.roster.reduce((s, f) => s + f.popularity * 150, 0);
    g.cash += sponsorAmt + fSponsor - sal - maint;
    g.chemistry = clamp(
      g.chemistry +
        g.roster.filter((f) => f.traits.includes("Team Player")).length -
        g.roster.filter((f) => f.traits.includes("Diva")).length +
        (g.coaches.some((c) => c.personality === "Player's Coach") ? 2 : 0),
      0, 100,
    );
    g.log.unshift(
      `📊 Settlement bulanan: sponsor +${fmt$(sponsorAmt + fSponsor)}, gaji coach -${fmt$(sal)}, maintenance -${fmt$(maint)}.`,
    );

    // Equity deduction (investor)
    // Fighter equity deduction (fighters with camp equity %)
    g.roster.forEach((f) => {
      if (f.contract?.equity && f.contract.equity > 0) {
        const fighterCut = Math.round((sponsorAmt + fSponsor) * (f.contract.equity / 100));
        if (fighterCut > 0) {
          g.cash -= fighterCut;
          f.morale = clamp(f.morale + 2, 0, 100); // equity partner = happier
        }
      }
    });

    // Promoter relationship: natural decay + tier spillover
    if (g.promoterRel) {
      const tiers = ["Local", "Regional", "National", "Major", "Premier"];
      tiers.forEach((t) => {
        // Decay: lose 1-2 points if no fight in this tier for 12+ weeks
        const hasRecentFight = g.roster.some((f) => f.lastFightWeek && g.week - f.lastFightWeek <= 12 && g.log.some((l) => l.includes(t)));
        if (!hasRecentFight && g.promoterRel[t] > 15) {
          g.promoterRel[t] = clamp(g.promoterRel[t] - RI(1, 2), 5, 100);
        }
      });
      // Spillover: high rel at tier N helps tier N+1 slightly
      for (let i = 0; i < tiers.length - 1; i++) {
        if (g.promoterRel[tiers[i]] >= 70) {
          g.promoterRel[tiers[i + 1]] = clamp(g.promoterRel[tiers[i + 1]] + 0.5, 5, 100);
        }
      }
    }

    if (g.investors && g.investors.length > 0) {
      const totalEquity = g.investors.reduce((s, inv) => s + inv.equity, 0);
      const equityCut = Math.round((sponsorAmt + fSponsor) * (totalEquity / 100));
      if (equityCut > 0) {
        g.cash -= equityCut;
        g.log.unshift(`💰 ${totalEquity}% equity — investor potong ${fmt$(equityCut)} dari income.`);
      }
    }

    // Coach market refresh: size scales with rep (2-7 coaches)
    const marketSize = clamp(2 + Math.floor(g.rep / 15), 2, 7);
    const market = [];
    for (let i = 0; i < marketSize; i++) market.push(genCoach());
    g.coachMarket = market;

    // Coach skill growth: +0.5/year for coaches with active fighters
    g.coaches.forEach((c) => {
      if (c.skill < 10 && g.roster.some((f) => !f.injury)) {
        c.skill = clamp(c.skill + 0.5, 1, 10);
        if (c.skill === Math.round(c.skill)) {
          c.salary = Math.round(c.salary * 1.05); // 5% raise per skill point
          g.log.unshift(`📈 ${c.name} naik ke skill ${Math.round(c.skill)} — gaji jadi ${fmt$(c.salary)}/bln.`);
        }
      }
    });

    // Investor system removed — stub

    // Sponsor offer generation
    const activeBrands = (g.sponsors || []).map((s) => s.brand);
    SPONSOR_BRANDS.forEach((brand) => {
      if (g.rep < brand.repReq) return;
      if (activeBrands.includes(brand.name)) return;
      if (g.sponsors && g.sponsors.length >= 3) return;
      const hasPending = g.inbox.some((m) => m.type === "sponsor" && m.sponsorBrand === brand.name);
      if (hasPending || random() > 0.08) return;
      g.inbox.unshift({
        id: uid(), type: "sponsor", expires: 4,
        sponsorBrand: brand.name,
        title: `📢 Tawaran Sponsor: ${brand.name}`,
        body: `${brand.icon} ${brand.name} (${brand.type}) tertarik bekerja sama dengan camp-mu. Pilih skema pembayaran:`,
        terms: ["placement", "royalty"],
        choices: [
          { label: `Placement: ${fmt$(brand.baseRate)}/bln`, sponsorAccept: { brand: brand.name, terms: "placement", rate: brand.baseRate, weeksLeft: 48 } },
          { label: `Royalty ~${fmt$(Math.round(brand.baseRate * 0.6))}/bln + bonus`, sponsorAccept: { brand: brand.name, terms: "royalty", rate: Math.round(brand.baseRate * 0.6), weeksLeft: 48 } },
          { label: "Tolak", sponsorReject: true },
        ],
      });
    });

        // AI ranking movement — more dynamic (was ±3-4)
    Object.values(g.divisions).forEach((d) =>
      d.list.forEach((c) => { c.points = clamp(c.points + RI(-8, 12), 5, 120); }),
    );

    // AI fighter rotation: every 48 weeks, retire bottom 3, 3 new prospects enter
    if (g.week % 48 === 0) {
      Object.values(g.divisions).forEach((d) => {
        // Retire fighters with simulated aging
        const retireCount = 3;
        const retired = d.list.splice(d.list.length - retireCount, retireCount);
        const retiredNames = retired.map((x) => x.name).join(", ");
        // Generate 3 new prospects at the bottom
        for (let i = 0; i < retireCount; i++) {
          const lvl = R(0.5, 0.85);
          const nf = genFighter(lvl);
          d.list.push({
            id: uid(), name: nf.name, archetype: nf.archetype,
            points: Math.round(R(10, 25)), level: lvl,
            record: { w: RI(0, 3), l: RI(0, 2), ko: 0, sub: 0, dec: 0 },
          });
        }
        g.log.unshift(`🔄 ${d.list[0]?.archetype ? d.list[0].archetype + " " : ""}Divisi — 3 fighter pensiun diganti prospect baru. (${retiredNames})`);
      });
    }

    // ---------- rank decay for inactivity ----------
    g.roster.forEach((f) => {
      if (f.injury || f.booked) return;
      if (!f.rankPoints || f.rankPoints <= 0) return;
      const weeksSinceFight = g.week - (f.lastFightWeek || 0);
      if (weeksSinceFight > 24) {
        f.rankPoints = Math.max(1, f.rankPoints - 1);
        if (weeksSinceFight > 36 && g.week % 4 === 0) {
          g.log.unshift(`📉 ${f.name}: rank pts -1 karena ${Math.floor(weeksSinceFight / 4)} bulan tanpa fight.`);
        }
      }
    });

    // ---------- monthly ambition + fighter requests ----------
    g.roster.forEach((f) => {
      const r = rankOf(g, f);
      if (f.ambition === "Belt Chaser") {
        if (r) f.morale = clamp(f.morale + 3, 0, 100);
        else if (f.record.w >= 4) f.morale = clamp(f.morale - 3, 0, 100);
      }
      if (f.ambition === "Star Power" && f.popularity < 30) {
        f.morale = clamp(f.morale - 2, 0, 100);
      }

      if (f.contract) {
        // Duration expiry: contract time runs out regardless of fights left
        const contractAge = g.week - (f.contract.signedWeek || f.joinedWeek || 0);
        if (contractAge >= f.contract.durationMo * 4 && !g.inbox.some((m) => m.durationExpiredId === f.id)) {
          g.inbox.unshift({
            id: uid(), type: "event", durationExpiredId: f.id,
            title: `${f.name} — kontrak habis (durasi)`,
            body: `Kontrak ${f.name} sudah berjalan ${f.contract.durationMo} bulan. Dia kini free agent — perpanjang atau lepas.`,
            choices: [
              { label: "Negosiasi perpanjangan", openExtend: f.id },
              { label: "Lepas (jadi free agent)", release: f.id },
            ],
          });
        }
      }

      if (
        f.contract && f.contract.fightsLeft <= 0 &&
        !g.inbox.some((m) => m.extendFighterId === f.id)
      ) {
        g.inbox.unshift({
          id: uid(), type: "event", extendFighterId: f.id,
          title: `${f.name} — kontrak habis`,
          body: `Fight commitment ${f.name} sudah terpenuhi. Dia kini free agent — perpanjang kontrak atau lepas.`,
          choices: [
            { label: "Negosiasi perpanjangan", openExtend: f.id },
            { label: "Lepas (jadi free agent)", release: f.id },
          ],
        });
      }

      const rr = rankOf(g, f);
      if (
        f.contract && !f.contract.renegoFlagged && f.contract.fightsLeft > 0 &&
        ((rr != null && rr <= 10) || f.traits.includes("Diva"))
      ) {
        f.contract.renegoFlagged = true;
        const why = rr != null && rr <= 10 ? `masuk Top 10 (rank #${rr})` : "trait Diva";
        g.inbox.unshift({
          id: uid(), type: "event", extendFighterId: f.id,
          title: `${f.name} minta renegosiasi`,
          body: `${f.name} menuntut kontrak baru karena ${why}. Kalau diabaikan, morale-nya turun.`,
          choices: [
            { label: "Buka renegosiasi", openExtend: f.id },
            { label: "Tolak (morale -8)", moraleTo: { id: f.id, amt: -8 } },
          ],
        });
      }

      if (f.morale < 20 && !g.inbox.some((m) => m.releaseFighterId === f.id)) {
        const bonus = RI(3, 8) * 1000;
        g.inbox.unshift({
          id: uid(), type: "event", releaseFighterId: f.id,
          title: `${f.name} minta release`,
          body: `Morale sangat rendah (${Math.round(f.morale)}). Dia merasa tidak berkembang dan ingin keluar dari camp.`,
          choices: [
            { label: "Kabulkan release", release: f.id },
            { label: `Bonus retensi ${fmt$(bonus)}`, cash: -bonus, moraleTo: { id: f.id, amt: 30 } },
            { label: "Abaikan", chem: -5 },
          ],
        });
      }
    });

    // ---------- yearly ----------
    if (g.week % 48 === 0) {
      g.roster.forEach((f) => {
        f.age++;
        f.fightsThisYear = 0;
        if (f.age >= 37) f.attrs.chin = clamp(f.attrs.chin - 3, 10, 99);
        else if (f.age >= 34) f.attrs.chin = clamp(f.attrs.chin - 2, 10, 99);
        else if (f.age >= 31) f.attrs.chin = clamp(f.attrs.chin - 1, 10, 99);

        if (f.age >= 36 && !g.inbox.some((m) => m.retireFighterId === f.id)) {
          const p = (f.age - 35) * 0.15 + ((f.streakL || 0) >= 3 ? 0.3 : 0);
          if (random() < p) {
            g.inbox.unshift({
              id: uid(), type: "event", retireFighterId: f.id,
              title: `${f.name} mempertimbangkan pensiun`,
              body: `Usia ${f.age}, ${f.streakL || 0} kekalahan beruntun. Dia datang ke kantormu untuk bicara soal masa depannya.`,
              choices: [
                { label: "Hormati pensiun (rep +3)", retire: f.id },
                { label: "Bujuk satu run lagi", convince: f.id },
                { label: "Jadikan coach", toCoach: f.id },
              ],
            });
          }
        }
      });

      g.roster.forEach((f) => {
        if (f.injury || f.booked || (f.contract && f.contract.fightsLeft <= 0)) return;
        const weeksSinceFight = g.week - (f.lastFightWeek || 0);
        if (weeksSinceFight > 24 && !g.inbox.some((m) => m.fightRequestId === f.id)) {
          g.inbox.unshift({
            id: uid(), type: "event", fightRequestId: f.id,
            title: `🗣️ ${f.name} — minta fight lagi`,
            body: `${f.name} sudah ${Math.floor(weeksSinceFight / 4)} bulan tanpa fight. Dia resah dan siap bertarung.`,
            choices: [
              { label: "Janji cari fight (morale +3)", fightPromise: f.id },
              { label: "Sabar — timing belum tepat", moraleTo: { id: f.id, amt: -3 } },
            ],
          });
        }
        const avgFac = Object.values(g.facilities).reduce((s, v) => s + v, 0) / 4;
        if (
          avgFac < 2 && f.morale > 30 && random() < 0.15 &&
          !g.inbox.some((m) => m.complainId === f.id)
        ) {
          const weak = Object.entries(g.facilities).sort((a, b) => a[1] - b[1])[0];
          g.inbox.unshift({
            id: uid(), type: "event", complainId: f.id,
            title: `😤 ${f.name} — komplain fasilitas`,
            body: `${f.name} mengeluh ${FAC_LABEL[weak[0]]} (level ${weak[1]}) kurang memadai. Dia minta upgrade.`,
            choices: [
              { label: "Janji upgrade (morale +4)", upgradePromise: { fighterId: f.id, fac: weak[0] } },
              { label: "Bilang bersabar dulu", moraleTo: { id: f.id, amt: -4 } },
            ],
          });
        }
      });
    }
  }

  // ---------- weight class change requests (fighter-driven) ----------
  // Check every 12 weeks, max 1 request per fighter per 48 weeks
  if (g.week % 12 === 0) {
    g.roster.forEach((f) => {
      if (f.injury || f.booked) return;
      if (f.lastClassChange && g.week - f.lastClassChange < 48) return;

      const div = g.divisions[f.weightClass];
      const wcIdx = WEIGHTS.findIndex((w) => w.name === f.weightClass);
      const streakW = f.record.w > 0 && f.streakL === 0 ? f.record.w : 0;
      const r = rankOf(g, f);
      const isChamp = div && div.champ.player && div.champ.fighterId === f.id;

      let direction = null;
      let reason = "";
      let chance = 0;

      // Move DOWN triggers
      if (f.streakL >= 3 && wcIdx > 0) {
        direction = "down";
        reason = `${f.streakL} kekalahan beruntun`;
        chance = 25;
        if (f.ambition === "Family Man") chance = 50;
        if (f.ambition === "Paycheck") chance = 35;
      }
      if (f.age >= 34 && (f.streakL >= 1 || (r && r > 10)) && wcIdx > 0 && !direction) {
        direction = "down";
        reason = `usia ${f.age} + performa menurun`;
        chance = 30;
      }

      // Move UP triggers
      if (!isChamp && streakW >= 4 && wcIdx < WEIGHTS.length - 1 && !direction) {
        direction = "up";
        reason = `${streakW} kemenangan beruntun`;
        chance = 20;
        if (f.ambition === "Belt Chaser") chance = 50;
        if (f.ambition === "Legacy") chance = 45;
      }
      if (isChamp && f.titles.filter((t) => t.includes("Champion")).length >= 3 && wcIdx < WEIGHTS.length - 1 && !direction) {
        direction = "up";
        reason = "sudah mendominasi divisi — cari tantangan baru";
        chance = 35;
        if (f.ambition === "Legacy") chance = 70;
      }
      if (!isChamp && r && r <= 3 && div && div.champ.fighterId && wcIdx < WEIGHTS.length - 1 && !direction) {
        const champ = g.roster.find((x) => x.id === div.champ.fighterId);
        if (champ && champ.injury && champ.injury.weeks >= 12) {
          direction = "up";
          reason = `juara ${f.weightClass} cedera panjang — cari peluang di atas`;
          chance = 30;
          if (f.ambition === "Belt Chaser") chance = 55;
        }
      }

      if (direction && random() * 100 < chance) {
        const targetIdx = direction === "down" ? wcIdx - 1 : wcIdx + 1;
        const targetClass = WEIGHTS[targetIdx].name;
        const isUp = direction === "up";
        const moraleEffect = isUp ? 8 : -5;

        g.inbox.unshift({
          id: uid(), type: "event", expires: 4, classChange: { fighterId: f.id, targetClass, targetIdx, isUp, moraleEffect },
          title: `⚖️ ${f.name} minta pindah ke ${targetClass}`,
          body: `${f.name} ingin ${isUp ? "naik" : "turun"} ke ${targetClass}. Alasan: ${reason}. ${isUp ? "Dia percaya diri menghadapi tantangan lebih besar." : "Dia merasa perlu lawan yang lebih ringan untuk bangkit."}`,
          choices: [
            { label: `${isUp ? "⬆ Naik" : "⬇ Turun"} ke ${targetClass}`, classChangeAccept: { fighterId: f.id, targetClass, targetIdx, oldClass: f.weightClass, isUp, moraleEffect } },
            { label: "Tolak — tetap di kelas saat ini", classChangeReject: { fighterId: f.id, moralePenalty: isUp ? -10 : -5 } },
          ],
        });
      }
    });
  }

  // ---------- rival camp simulation ----------
  if (g.rivals) {
    // Rival fight simulation: random matchups between rival camps every 12 weeks
    if (g.week % 12 === 0) {
      for (let i = 0; i < g.rivals.length; i++) {
        for (let j = i + 1; j < g.rivals.length; j++) {
          const a = g.rivals[i], b = g.rivals[j];
          const aF = a.fighters.filter(function(f) { return !f.injury; });
          const bF = b.fighters.filter(function(f) { return !f.injury; });
          if (aF.length > 0 && bF.length > 0 && random() < 0.6) {
            const fA = pick(aF), fB = pick(bF);
            const aWins = random() < 0.5;
            const winner = aWins ? fA : fB;
            const loser = aWins ? fB : fA;
            winner.record.w = (winner.record.w || 0) + 1;
            loser.record.l = (loser.record.l || 0) + 1;
            const winCamp = aWins ? a : b;
            const loseCamp = aWins ? b : a;
            winCamp.rep = clamp(winCamp.rep + 1, 2, 90);
            loseCamp.rep = clamp(loseCamp.rep - 1, 2, 90);
            if (random() < 0.3) {
              g.log.unshift("🥊 " + fA.name + " (" + a.name + ") vs " + fB.name + " (" + b.name + ") — " + winner.name + " menang!");
            }
          }
        }
      }
    }

    g.rivals.forEach((rc) => {
      rc.fighters.forEach((f) => {
        if (f.injury) { f.injury.weeks--; if (f.injury.weeks <= 0) f.injury = null; return; }
        ATTRS.forEach((k) => {
          const cap = f.ceilings[k];
          const gain =
            R(0.2, 0.7) * (f.age <= 26 ? 1.15 : 1) *
            (rc.traitData.spec === k ? rc.traitData.bonus : 1) * (1 + rc.rivalry * 0.003);
          f.attrs[k] = clamp(f.attrs[k] + gain, 0, cap);
        });
      });
      const scoutInterval = rc.trait === "Prospect Mill" ? 6 : 12;
      if (g.week - rc.lastScoutWeek >= scoutInterval && rc.fighters.length < 8) {
        const newF = assignAgent(genFighter(R(0.3, 0.7)));
        rc.fighters.push(newF);
        rc.lastScoutWeek = g.week;
        g.log.unshift(`👀 ${rc.name} merekrut ${newF.name} (${newF.archetype}, ${newF.weightClass}).`);
      }
      rc.fighters = rc.fighters.filter((f) => f.age < 40);
      rc.rivalry = clamp(rc.rivalry - 0.5, 0, 100);
      rc.rep = clamp(rc.rep + R(-1, 2), 2, 90);
      rc.cash += RI(5000, 20000);
      // Rivals spend accumulated cash on upgrades
      if (rc.cash > 80000 && random() < 0.15 && rc.coaches.length < 2) {
        rc.coaches.push(genCoach());
        rc.cash -= RI(20000, 40000);
        if (random() < 0.2) g.log.unshift("🏗️ " + rc.name + " hire coach baru.");
      } else if (rc.cash > 120000 && random() < 0.08) {
        rc.rep = clamp(rc.rep + RI(3, 7), 2, 90);
        rc.cash -= RI(50000, 80000);
        if (random() < 0.2) g.log.unshift("📈 " + rc.name + " upgrade fasilitas — rep naik.");
      }
      // Rival activity visible in log
      if (rc.rep > g.rep + 10 && g.week % 12 === 0) g.log.unshift(`📈 ${rc.name} rep ${Math.round(rc.rep)} — melewati camp kita!`);
    });

    // poaching
    if (g.week % 8 === 0 && g.roster.length > 0) {
      const r = pick(g.rivals);
      const available = g.roster.filter(
        (f) => !f.booked && !f.injury && f.morale < 70 &&
          f.contract && f.contract.fightsLeft > 0,
      );
      if (available.length > 0 && r.rivalry > 15) {
        const target = pick(available);
        const offerBonus = Math.round(target.asking * (1 + r.rivalry / 100));
        g.inbox.unshift({
          id: uid(), type: "event",
          title: `🚨 ${r.name} coba poach ${target.name}`,
          body: `${r.name} (rivalry ${Math.round(r.rivalry)}) mengirim tawaran ke ${target.name}: signing bonus ${fmt$(offerBonus)}, cut lebih kecil. Morale-nya rendah — dia mempertimbangkan.`,
          choices: [
            { label: "Tingkatkan bonus + naikkan cut 2%", counter: { fighterId: target.id, cost: offerBonus } },
            { label: "Biarkan dia pergi", letGo: target.id },
            { label: "Bicara langsung (chemistry check)", talk: target.id },
          ],
        });
        r.rivalry = clamp(r.rivalry - 5, 0, 100);
      }
    }

    if (g.week % 12 === 0 && g.coaches.length > 1) {
      const r = pick(g.rivals);
      if (r.rivalry > 50) {
        const nonFree = g.coaches.filter((c) => !c.freeUntil || g.week > c.freeUntil);
        if (nonFree.length > 0) {
          const tc = pick(nonFree);
          g.inbox.unshift({
            id: uid(), type: "event",
            title: `🦊 ${r.name} coba poach ${tc.name}`,
            body: `${tc.name} ditawari gaji ${fmt$(tc.salary * 2)} oleh ${r.name}. Kalau counter, harus naikkan gaji ke level itu.`,
            choices: [
              { label: `Naikkan gaji (${fmt$(tc.salary * 2)})`, coachPoach: { id: tc.id, newSalary: tc.salary * 2, rivalId: r.id } },
              { label: "Lepas — rekrut pengganti", coachLeave: tc.id },
            ],
          });
          r.rivalry = clamp(r.rivalry - 8, 0, 100);
        }
      }
    }
  }

  
  // World simulation — AI title defenses, career progression, monthly events
  worldTick(g);
  processEventSystem(g);
  // Cap log at 200 entries to prevent unbounded growth
  if (g.log.length > 200) g.log.length = 200;

  if (g.cash < -50000) g.over = "BANGKRUT — kas di bawah -$50,000. Camp ditutup.";
}
