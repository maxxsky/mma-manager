// Fight offers domain — champion defenses, title fights, matchmaking
import { R, RI, clamp, uid, random } from "../rng.js";
import { WEIGHTS } from "../data.js";
import { genFighter, avgSkill } from "../fighter.js";
import { worldOpponent, championFighter } from "../world/fighter-profile.js";
import { championAt } from "../championships.js";
import { rankOf, stripTitle, divisionRankings, rankedAIContenders } from "../rankings.js";
import { pickPromotion, promotionOfferTerms } from "../data/promotions.js";

// Skill thresholds for each rung of the title ladder.
//
// Originally 45/55/65/72/80. Measured against real play: a fighter developed
// with rotated training peaks around 45-58 avgSkill, so the ladder started
// above where most careers end and every rung above it was unreachable, since
// each rung requires holding the one below. Retuned so the bottom rung opens
// to a competent fighter in their second or third year and the top stays the
// preserve of genuinely exceptional talent.
export const SKILL_GATE = {
  regional: 38,
  national: 45,
  minor: 52,
  major: 60,
  premier: 70,
};

// Helper: attach promotion to an offer object based on its tier, then apply
// that promotion's personality to the offer terms (P2 #35).
function attachPromotion(offer, tier, g, ctx) {
  // If fighter has an active exclusivity contract, force that promotion
  const fighter = ctx?.fighter;
  const forced = fighter?.promotionContract?.fightsLeft > 0
    && g.promotions?.find((p) => p.id === fighter.promotionContract.promotionId);
  const prom = forced || pickPromotion(tier, ctx);
  if (!prom) return;
  offer.promotionId = prom.id;
  offer.promotionName = prom.name;
  if (!offer.opponent) return; // not a fight offer
  const div = fighter && g.divisions?.[fighter.weightClass];
  const champion = !!div && [div.champ, ...Object.values(div.tierChamps || {})].some((c) => c?.player && c.fighterId === fighter.id);
  const terms = promotionOfferTerms(prom, { ranked: fighter ? rankOf(g, fighter) != null : false, champion });
  if (terms.purseMult !== 1) {
    offer.show = Math.round(offer.show * terms.purseMult);
    offer.winBonus = Math.round(offer.winBonus * terms.purseMult);
    offer.promotionNote = `${prom.personality.label}: purse +${Math.round((terms.purseMult - 1) * 100)}%`;
  }
  if (terms.expires != null && offer.expires != null && !offer.defense) offer.expires = Math.min(offer.expires, terms.expires);
}

export function tickFightOffers(g) {
  if (!g || !g.roster) return;
  g.roster.forEach((f) => {
    // ── Title safety net: auto-strip at 32 weeks regardless of injury/booked ──
    const div = g.divisions[f.weightClass];
    const contenders = rankedAIContenders(g, f.weightClass);
    const opponents = contenders.filter(c => c.rank <= 15);
    const isChamp = div && div.champ && div.champ.player && div.champ.fighterId === f.id;
    if (isChamp) {
      const lastDef = div.champ.lastDefenseWeek || f.lastFightWeek || 0;
      if (g.week - lastDef >= 32) {
        stripTitle(g, f.id);
      }
    }
    if (f.injury || f.booked) return;

    // ── Vacant title: fighter rank #1/#2 gets title shot ──
    if (div && div.champ === null) {
      const r = rankOf(g, f);
      if (r != null && r <= 2 && !g.inbox.some((m) => m.type === "offer" && m.vacantTitle && m.fighterId === f.id && m.weightClass === f.weightClass)) {
        const candidate = contenders[0];
        const opponent = candidate ? worldOpponent(candidate.fighter, f.weightClass) : genFighter(0.9);
        const oppName = opponent.name || "Unknown";
        g.inbox.unshift({
          id: uid(), type: "offer", fighterId: f.id, expires: 4,
          tier: "Major", show: RI(80, 150) * 1000, winBonus: RI(80, 150) * 1000,
          opponent: opponent, title: true, defense: false,
          oppRank: candidate?.rank ?? null, contenderId: candidate?.fighter.id ?? null,
          titleTier: "Major", vacantTitle: true, weightClass: f.weightClass,
          titleText: `👑 VACANT TITLE FIGHT — ${f.weightClass} belt up for grabs!`,
          weeks: RI(4, 6),
        });
        g.log.unshift(`🥊 ${f.name} ditawari perebutan gelar ${f.weightClass} yang kosong.`);
      }
    }

    // isChamp is computed before the auto-strip above, which can vacate the
    // belt and set div.champ to null. Re-checking div.champ here prevents a
    // TypeError on the next line. This path was unreachable until title wins
    // actually started working, so the crash had never been triggered.
    if (isChamp && div.champ) {
    // Mandatory defense — create offer + escalation warning simultaneously
    if (
      g.week - (div.champ.lastDefenseWeek || f.lastFightWeek || 0) >= 24 &&
      !g.inbox.some((m) => m.type === "offer" && m.defense && m.fighterId === f.id)
    ) {
      const defenseExpireWeeks = 3;
      const candidate = contenders[0];
      const c0 = candidate?.fighter;
      if (!c0) return;
      const opp = worldOpponent(c0, f.weightClass);
      g.inbox.unshift({
        id: uid(), type: "offer", fighterId: f.id, expires: defenseExpireWeeks,
        tier: "Major", show: RI(100, 220) * 1000, winBonus: RI(100, 220) * 1000,
        opponent: opp, title: true, defense: true, oppRank: candidate.rank, contenderId: c0.id,
        titleTier: "Major", titleText: "🛡️ MANDATORY TITLE DEFENSE", weeks: RI(4, 6),
      });
      // Push escalation warning at the same time — must appear before the offer expires
      g.inbox.unshift({
        id: uid(), type: "event", fighterId: f.id, expires: null,
        defenseEscalation: true,
        tier: "Major",
        title: `⚠️ MANDATORY DEFENSE — ${f.name} harus terima tawaran dalam ${defenseExpireWeeks} minggu atau gelar dicopot`,
        body: `Gelar juara ${f.weightClass} terancam! ${f.name} sudah ${Math.floor((g.week - (div.champ.lastDefenseWeek || f.lastFightWeek || 0)) / 4)} bulan tanpa pertahanan gelar. Tawaran mandatory defense ada di inbox — tolak atau expire dalam ${defenseExpireWeeks} minggu, gelar otomatis dicopot.`,
        titleTier: "Major",
        weeks: 0,
      });
      attachPromotion(g.inbox[1], "Major", g, { fighter: f, r: rankOf(g, f), streakW: f.streakW, streakL: f.streakL });
      g.log.unshift(
        `🛡️ Mandatory defense untuk ${f.name} tiba — tolak atau biarkan expire = title dicopot.`,
      );
      return;
    }
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
              opponent: structuredClone(currentChamp),
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
        rep >= 80 && r != null && r <= 3 && sk >= SKILL_GATE.premier &&
        has("Major World Champion") && !has("Premier World Champion") && random() < 0.25
      ) {
        titleTier = "Premier";
        titleReason = `rank #${r} + juara Major + rep ${Math.round(rep)} + skill ${Math.round(sk)}`;
      } else if (
        rep >= 60 && r != null && r <= 5 && sk >= SKILL_GATE.major &&
        has("National Champion") && !has("Major World Champion") && random() < 0.35
      ) {
        titleTier = "Major";
        titleReason = `rank #${r} + juara Nasional + rep ${Math.round(rep)} + skill ${Math.round(sk)}`;
      } else if (
        rep >= 50 && r != null && r <= 8 && sk >= SKILL_GATE.minor &&
        has("National Champion") && !has("Minor World Champion") &&
        f.record.w >= 7 && random() < 0.3
      ) {
        titleTier = "Minor";
        titleReason = `rank #${r} + juara Nasional + ${f.record.w} menang + skill ${Math.round(sk)}`;
      } else if (
        rep >= 40 && r != null && r <= 10 && sk >= SKILL_GATE.national &&
        has("Regional Champion") && !has("National Champion") &&
        f.record.w >= 5 && random() < 0.3
      ) {
        titleTier = "National";
        titleReason = `rank #${r} + juara Regional + ${f.record.w} menang + skill ${Math.round(sk)}`;
      } else if (
        rep >= 20 && f.record.w >= 3 && sk >= SKILL_GATE.regional &&
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
      const maxOppIdx = Math.max(0, opponents.length - 1);
      const targetRank = r != null ? r - 1 + RI(-1, 1) : RI(12, 15);
      let oppIdx = opponents.findIndex(c => c.rank >= targetRank);
      if (oppIdx < 0) oppIdx = maxOppIdx;
      if (f.streakL >= 2) oppIdx = clamp(oppIdx - RI(2, 4), 0, maxOppIdx);
      else if (f.streakW >= 3) oppIdx = clamp(oppIdx + RI(1, 2), 0, maxOppIdx);
      // Rivalry nudge: if a past opponent (count >= 2) is near oppIdx, nudge toward them
      if (f.rivalries && div) {
        for (let i = Math.max(0, oppIdx - 3); i <= Math.min(maxOppIdx, oppIdx + 3); i++) {
          const c = opponents[i]?.fighter;
          if (c && f.rivalries[c.name]?.count >= 2) {
            if (i > oppIdx) oppIdx = clamp(oppIdx + RI(1, 2), 0, maxOppIdx);
            else oppIdx = clamp(oppIdx - RI(1, 2), 0, maxOppIdx);
            break;
          }
        }
      }

      let opp, oppRank = null, contenderId = null;
      const titleHolder = titleTier && championAt(div, titleTier);
      if (titleHolder && titleHolder.fighterId !== f.id) {
        const holder = championFighter(div, titleHolder, f.weightClass, g.roster);
        opp = worldOpponent(holder, f.weightClass);
        contenderId = holder.id ?? null;
        oppRank = titleTier === "Major" ? 0
          : divisionRankings(g, f.weightClass).find(c => c.fighter.name === titleHolder.name)?.rank ?? null;
      } else if (div && (r != null || (f.record.w >= 2 && rep >= 20 && random() < 0.35))) {
        const candidate = opponents[oppIdx];
        const c = candidate?.fighter;
        if (c) {
          opp = worldOpponent(c, f.weightClass);
          oppRank = candidate.rank; contenderId = c.id;
        } else {
          opp = genFighter(clamp(avgSkill(f) / 60 + R(-0.08, 0.1), 0.3, 1.5));
        }
      } else {
        opp = genFighter(clamp(avgSkill(f) / 60 + R(-0.08, 0.1), 0.3, 1.5));
      }
      opp.weightClass = f.weightClass;
      if (!titleHolder && contenderId == null && !opp.record.w) opp.record = { w: RI(2, 14), l: RI(0, 5), ko: 0, sub: 0, dec: 0 };

      // Grudge match hype bonus: fighter rivalry → +25% purse
      const isGrudgeMatch = f.rivalries?.[opp.name]?.count >= 2;
      if (isGrudgeMatch) {
        const hypeBonus = 1.25;
        show = Math.round(show * hypeBonus);
      }

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
        // Every rung of the ladder is a real title fight.
        //
        // This flag used to be true only for Major and Premier. The lower
        // three rungs were announced to the player as title fights and then
        // resolved as ordinary bouts, so winning one granted nothing — while
        // Major and Premier each require already holding a lower belt. The
        // ladder was a closed loop with no entry: no camp could ever win a
        // championship at all, which is why a ten-year run produced 46
        // "Regional title" offers and zero titles.
        title: !!titleTier,
        titleTier, oppRank, contenderId,
        titleText, story, shortNotice, isMainEvent, isTitleEliminator, isGrudgeMatch,
        weeks: shortNotice ? RI(1, 2) : RI(4, 6),
      });
    }
  });

  // Attach promotion to any offer that doesn't have one yet
  g.inbox.forEach((m) => {
    if (m.type === "offer" && !m.promotionId) {
      const fighter = g.roster?.find((x) => x.id === m.fighterId);
      const ctx = { fighter, r: fighter ? rankOf(g, fighter) : null, streakW: fighter?.streakW, streakL: fighter?.streakL };
      attachPromotion(m, m.tier, g, ctx);
    }
  });

  // Inbox expiry: offers, investors, sponsors
  g.inbox = g.inbox.filter((m) => {
    if (m.type !== "offer" && m.type !== "investor" && m.type !== "sponsor" && !m.promotionContractOffer) return true;
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
