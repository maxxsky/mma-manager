// Fight offers domain — champion defenses, title fights, matchmaking
import { R, RI, clamp, uid, random } from "../rng.js";
import { WEIGHTS } from "../data.js";
import { genFighter, avgSkill } from "../fighter.js";
import { rankOf, stripTitle } from "../rankings.js";
import { pickPromotion } from "../data/promotions.js";

// Helper: attach promotion to an offer object based on its tier
function attachPromotion(offer, tier, g, ctx) {
  // If fighter has an active exclusivity contract, force that promotion
  const fighter = ctx?.fighter;
  if (fighter?.promotionContract?.fightsLeft > 0) {
    const forced = g.promotions?.find((p) => p.id === fighter.promotionContract.promotionId);
    if (forced) {
      offer.promotionId = forced.id;
      offer.promotionName = forced.name;
      return;
    }
  }
  const prom = pickPromotion(tier, ctx);
  if (prom) {
    offer.promotionId = prom.id;
    offer.promotionName = prom.name;
  }
}

export function tickFightOffers(g) {
  if (!g || !g.roster) return;
  g.roster.forEach((f) => {
    // ── Defense escalation (sebelum guard injury/booked — strip tetap jalan walau cedera) ──
    const div = g.divisions[f.weightClass];
    const isChamp = div && div.champ && div.champ.player && div.champ.fighterId === f.id;
    if (isChamp) {
      const lastDef = div.champ.lastDefenseWeek || f.lastFightWeek || 0;
      // Escalation warning: 28 minggu tanpa defense (tidak perlu < 32 — chemistry bisa skip fight-offers)
      if (g.week - lastDef >= 28) {
        const warned = g.inbox.some((m) => m.defenseEscalation && m.fighterId === f.id);
        if (!warned) {
          g.inbox.unshift({
            id: uid(), type: "event", fighterId: f.id, expires: null,
            defenseEscalation: true,
            tier: "Major", show: 0, winBonus: 0,
            title: true, defense: false, oppRank: 0, contenderId: null,
            titleTier: "Major",
            titleText: `⚠️ DEFENSE OVERDUE — ${f.name} akan dicopot dalam 4 minggu`,
            weeks: 0,
          });
          g.log.unshift(`⚠️ ${f.name} — defense overdue. Title otomatis dicopot minggu ke-${g.week + (32 - (g.week - lastDef))}.`);
        }
      }
      // Auto-strip: 32 minggu tanpa defense
      if (g.week - lastDef >= 32) {
        stripTitle(g, f.id);
      }
    }
    if (f.injury || f.booked) return;

    // ── Vacant title: fighter rank #1/#2 gets title shot ──
    if (div && div.champ === null) {
      const r = rankOf(g, f);
      if (r != null && r <= 2 && !g.inbox.some((m) => m.type === "offer" && m.vacantTitle && m.fighterId === f.id && m.weightClass === f.weightClass)) {
        const opp = div.list[0] || genFighter(0.9);
        const isPlayerRank1 = r === 1;
        const opponent = isPlayerRank1 ? opp : (div.list[1] || div.list[0] || genFighter(0.9));
        const oppName = opponent.name || "Unknown";
        g.inbox.unshift({
          id: uid(), type: "offer", fighterId: f.id, expires: 4,
          tier: "Major", show: RI(80, 150) * 1000, winBonus: RI(80, 150) * 1000,
          opponent: opponent, title: true, defense: false,
          oppRank: isPlayerRank1 ? 2 : 1, contenderId: opponent.id,
          titleTier: "Major", vacantTitle: true, weightClass: f.weightClass,
          titleText: `👑 VACANT TITLE FIGHT — ${f.weightClass} belt up for grabs!`,
          weeks: RI(4, 6),
        });
        g.log.unshift(`🥊 ${f.name} ditawari perebutan gelar ${f.weightClass} yang kosong.`);
      }
    }

    if (isChamp) {
    // Mandatory defense
    if (
      g.week - (div.champ.lastDefenseWeek || f.lastFightWeek || 0) >= 24 &&
      !g.inbox.some((m) => m.type === "offer" && m.defense && m.fighterId === f.id)
    ) {
      const c0 = div.list[0];
      const opp = genFighter(clamp((c0.level || 1.3) + 0.05, 0.8, 1.5));
      opp.name = c0.name; opp.archetype = c0.archetype; opp.weightClass = f.weightClass;
      opp.record = { w: RI(10, 18), l: RI(0, 3), ko: 0, sub: 0, dec: 0 };
      g.inbox.unshift({
        id: uid(), type: "offer", fighterId: f.id, expires: 3,
        tier: "Major", show: RI(100, 220) * 1000, winBonus: RI(100, 220) * 1000,
        opponent: opp, title: true, defense: true, oppRank: 1, contenderId: c0.id,
        titleTier: "Major", titleText: "🛡️ MANDATORY TITLE DEFENSE", weeks: RI(4, 6),
      });
      attachPromotion(g.inbox[0], "Major", g, { r: rankOf(g, f), streakW: f.streakW, streakL: f.streakL });
      g.log.unshift(
        `🛡️ Mandatory defense untuk ${f.name} tiba — tolak atau biarkan expire = title dicopot.`,
      );
    }
    return;
    }

    // FTUE: guarantee fight offer in first 2 weeks
    const isFirstWeeks = g.week <= 2 && !f.booked && f.record.w === 0 && f.record.l === 0;
    const offerChance = isFirstWeeks ? 1.0 : 0.35;
    if (random() < offerChance) {
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
              tier: "Major", show: RI(150, 350) * 1000, winBonus: RI(150, 350) * 1000,
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
      if (rep >= 80 && f.record.w >= 8) { tier = "Premier"; show = RI(150, 350) * 1000; }
      else if (rep >= 60 && f.record.w >= 6) { tier = "Major"; show = RI(40, 140) * 1000; }
      else if (rep >= 40 && f.record.w >= 4) { tier = "National"; show = RI(12, 60) * 1000; }
      else if (rep >= 20 && f.record.w >= 2) { tier = "Regional"; show = RI(3, 12) * 1000; }
      else { tier = "Local"; show = RI(8, 30) * 100; }
      if (titleTier) show = Math.round(show * 1.5);

      // Streak-based purse adjustment
      let streakBonus = 1;
      if (f.streakL >= 2) streakBonus = 0.7;
      else if (f.streakL >= 1) streakBonus = 0.85;
      if (f.streakW >= 4) streakBonus = 1.3;
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
      if (f.streakL >= 2) oppIdx = clamp(oppIdx - RI(2, 4), 0, 14);
      else if (f.streakW >= 3) oppIdx = clamp(oppIdx + RI(1, 2), 0, 14);

      let opp, oppRank = null, contenderId = null;
      if (titleTier === "Major" && div && div.champ) {
        const worldYear = Math.floor(g.week / 48);
        const aiScale = worldYear > 5 ? clamp(1.45 + (worldYear - 5) * 0.02, 1.45, 1.7) : 1.45;
        opp = genFighter(aiScale); opp.name = div.champ.name; oppRank = 0;
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
        title: (r != null && r <= 5) && (f.streakW >= 2 || f.streakW == null) && (titleTier === "Major" || titleTier === "Premier"),
        titleTier, oppRank, contenderId,
        titleText, story, shortNotice, isMainEvent, isTitleEliminator,
        weeks: shortNotice ? RI(1, 2) : RI(4, 6),
      });
    }
  });

  // Attach promotion to any offer that doesn't have one yet
  g.inbox.forEach((m) => {
    if (m.type === "offer" && !m.promotionId) {
      const ctx = { fighter: g.roster?.find((x) => x.id === m.fighterId) };
      attachPromotion(m, m.tier, g, ctx);
    }
  });

  // Inbox expiry: offers, investors, sponsors
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
}
