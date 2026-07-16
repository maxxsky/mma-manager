// Fight outcome persistence — moved from UI to career layer
import { clamp, RI, uid } from "../rng.js";
import { processFightResult, processRivalry, updateRivalryResult, processTitleChange } from "../career.js";
import { queueDelayedEvent, pushInboxEvent } from "../events.js";
import { TITLE_CELEBRATION_DELAY_WEEKS, TITLE_SPONSOR_DELAY_WEEKS } from "../events/config.js";
import { recordEra } from "../world/history.js";
import { avgSkill } from "../fighter.js";

/** Commit fight result to game state. Called from FightNight done() callback. */
export function commitFightResult(g, fighter, result) {
  const f = g.roster?.find((x) => x.id === fighter.id);
  if (!f) return;

  // ── Purse payout (show money always, win bonus only on win) ──
  const purse = (fighter.booked?.show || 0) + (result.won ? (fighter.booked?.winBonus || 0) : 0);
  const campCut = Math.round((f.contract?.managerCut || 0.18) * purse);
  g.cash = (g.cash || 0) + campCut;

  // ── PPV revenue (title fights only) ──
  if (fighter.booked?.titleTier === "Major" || fighter.booked?.titleTier === "Premier") {
    const opp = fighter.booked?.opponent;
    const oppPop = typeof opp?.popularity === "number" ? opp.popularity : (opp?.level ? Math.round(opp.level * 60) : 30);
    const ppvRevenue = Math.round((f.popularity + oppPop) * 200 * (fighter.booked.titleTier === "Premier" ? 1.5 : 1));
    g.cash = (g.cash || 0) + ppvRevenue;
  }

  f.booked = null;

  // ── Promotion tracking ──
  const promId = fighter.booked?.promotionId;
  if (promId) {
    if (!f.promotionFightCounts) f.promotionFightCounts = {};
    f.promotionFightCounts[promId] = (f.promotionFightCounts[promId] || 0) + 1;
  }
  // Decrement exclusivity contract if active
  if (f.promotionContract && f.promotionContract.fightsLeft > 0) {
    f.promotionContract.fightsLeft--;
    if (f.promotionContract.fightsLeft <= 0) f.promotionContract = null;
  }

  if (result.won) {
    f.record.w++; f.streakW = (f.streakW || 0) + 1; f.streakL = 0;
    if (result.how === "KO/TKO" || result.how === "Doctor Stoppage") f.record.ko++;
    else if (result.how === "Submission") f.record.sub++;
    else f.record.dec++;

    f.morale = clamp(f.morale + 12, 0, 100);
    const popBase = result.how === "Decision" ? 3 : 7;
    const crowdMult = f.traits?.includes("Crowd Favorite") ? 2 : 1;
    const showboatBonus = f.traits?.includes("Showboat") && result.how !== "Decision" ? 5 : 0;
    f.popularity = clamp(f.popularity + popBase * crowdMult + showboatBonus, 0, 100);
    g.rep = clamp(g.rep + 7, 0, 100);

    if (fighter.booked?.title) {
      if (!f.titles.includes("Major World Champion")) f.titles.push("Major World Champion");
      const div = g.divisions?.[f.weightClass];
      if (div) {
        const wasAlreadyChamp = div.champ?.fighterId === f.id;
        if (wasAlreadyChamp) {
          // Defense — update in-place, preserve wonWeek
          div.champ.titleDefenses = (div.champ.titleDefenses || 0) + 1;
          // ── Era progression: start on 3rd defense, update thereafter ──
          if (div.champ.titleDefenses === 3 && !div.era) {
            div.era = { championName: f.name, startedWeek: g.week, defenses: 3 };
          } else if (div.era) {
            div.era.defenses = div.champ.titleDefenses;
          }
          div.champ.lastDefenseWeek = g.week;
          if (!div.champ.promotionId) div.champ.promotionId = fighter.booked?.promotionId || null;
          g.log.unshift(`🛡️ ${f.name} berhasil pertahankan gelar ${f.weightClass}.`);
        } else {
          // ── Era ends if active (previous champion loses title) ──
          if (div.era) {
            g.inbox.unshift({ id: uid(), type: "world", severity: "major", title: `The ${div.era.championName} Era Ends`, body: `${div.era.championName}'s era of dominance in ${f.weightClass} has come to an end after ${div.era.defenses} title defenses.` });
            recordEra(g, div.era.championName, f.weightClass, div.era.startedWeek, g.week, div.era.defenses);
            div.era = null;
          }
          // New reign — create fresh champ object
          div.champ = { name: f.name, player: true, fighterId: f.id, wonWeek: g.week, lastDefenseWeek: g.week, titleDefenses: 0, promotionId: fighter.booked?.promotionId || null, campId: null, campName: null };
          if (!f.reignHistory) f.reignHistory = [];
          f.reignHistory.push({ wonWeek: g.week, weightClass: f.weightClass });
        }
      }
    }
    g.legacy = (g.legacy || 0) + (fighter.booked?.title ? 2000 : 600);
    g.log.unshift(`🏆 ${f.name} menang via ${result.how} R${result.r}!`);

    const oppName = fighter.booked?.opponent?.name || "Unknown";
    if (!f.fightHistory) f.fightHistory = [];
    f.fightHistory.push({ result: "W", opponent: oppName, method: result.how, round: result.r, tier: fighter.booked?.tier || "Local", week: g.week });
    if (f.fightHistory.length > 30) f.fightHistory.shift();
    const careerEvents = processFightResult(f, g, { won: true, how: result.how });
    const rivalryEvents = processRivalry(f, { name: oppName }, g);
    updateRivalryResult(f, { name: oppName, rivalries: {} }, g);
    if (fighter.booked?.title) {
      const titleAction = f.titleDefenses ? "defense" : "won";
      const titleEvents = processTitleChange(f, g, titleAction);
      careerEvents.push(...titleEvents);

      if (titleAction === "won") {
        queueDelayedEvent(g, {
          title: "🎉 Camp Celebration",
          body: `Camp merayakan gelar juara ${f.name}. Suasana positif menyelimuti gym.`,
          choices: [
            { label: "Pesta besar ($5,000, chemistry +8)", cash: -5000, chem: 8 },
            { label: "Syukuran sederhana (chemistry +3)", chem: 3 },
          ],
        }, TITLE_CELEBRATION_DELAY_WEEKS);

        queueDelayedEvent(g, {
          title: "📢 Sponsor Tertarik",
          body: `Gelar juara ${f.name} menarik perhatian brand besar. Mereka ingin diskusi kerja sama.`,
          choices: [
            { label: "Buka negosiasi (rep +5)", rep: 5 },
            { label: "Fokus pertahankan gelar dulu", chem: 1 },
          ],
        }, TITLE_SPONSOR_DELAY_WEEKS);
      }
    }
    [...careerEvents, ...rivalryEvents].forEach((ev) => {
      pushInboxEvent(g, { type: "event", title: ev.title, body: ev.body, choices: [{ label: "OK", chem: 0 }] });
    });

    if (fighter.booked?.oppRank != null && fighter.booked.oppRank <= 5) {
      f.giantKills = (f.giantKills || 0) + 1;
    }

    // ── Trash talk resolution ──
    if (fighter.booked?.pressChoice === "trashTalk") {
      f.popularity = clamp((f.popularity || 0) + 5, 0, 100);
      g.log.unshift("💬 " + f.name + " trash talk berhasil! Popularity +5.");
    }

    // ── Rivalry nudge: beating a camp-affiliated fighter ──
    const oppData = fighter.booked?.opponent;
    if (oppData?.campId && g.rivals) {
      const camp = g.rivals.find((r) => r.id === oppData.campId);
      if (camp) {
        const nudge = RI(3, 6);
        camp.rivalry = clamp((camp.rivalry || 0) + nudge, 0, 100);
        g.log.unshift(`⚔️ ${f.name} mengalahkan fighter ${camp.name} — rivalry +${nudge}.`);
      }
    }

    // ── Fan reactions ──
    const opp = fighter.booked?.opponent;
    const totalDmg = (result.totalDmgA || 0) + (result.totalDmgB || 0);
    if (opp) {
      // Upset: player fighter has significantly lower skill but still won
      const fSkill = avgSkill(f);
      const oppSkill = opp.attrs ? avgSkill(opp) : (opp.level || 0.5) * 60;
      if (fSkill < oppSkill - 20) {
        g.inbox.unshift({ id: uid(), type: "world", severity: "minor",
          title: "😲 Upset! " + f.name + " beats " + opp.name,
          body: `The fans are shocked — ${f.name} (${fSkill}) dominated the higher-rated ${opp.name} (${Math.round(oppSkill)}). What a performance!`,
          choices: [{ label: "OK", chem: 0 }],
        });
      }
      // KO brutal: finish by KO/TKO with significant damage
      if (result.how === "KO/TKO" && (result.totalDmgA || 0) > 40) {
        g.inbox.unshift({ id: uid(), type: "world", severity: "minor",
          title: "💥 " + f.name + " delivers brutal KO",
          body: `The crowd erupts as ${f.name} lands a devastating knockout at R${result.r}. This will be on highlight reels for weeks.`,
          choices: [{ label: "OK", chem: 0 }],
        });
      }
      // Boring decision: went the distance with low total damage
      if (result.how === "Decision" && totalDmg < 40) {
        g.inbox.unshift({ id: uid(), type: "world", severity: "minor",
          title: "😴 " + f.name + " wins boring decision",
          body: `Fans boo as ${f.name} takes a lackluster decision. Minimal action, maximum disappointment.`,
          choices: [{ label: "OK", chem: 0 }],
        });
      }
    }
  } else {
    f.record.l++; f.streakL = (f.streakL || 0) + 1; f.streakW = 0;
    const moraleLoss = f.traits?.includes("Iron Will") ? -4 : -14;
    f.morale = clamp(f.morale + moraleLoss, 0, 100);
    g.rep = clamp(g.rep - 3, 2, 100);
    g.chemistry = clamp(g.chemistry - 2, 0, 100);
    g.log.unshift(`❌ ${f.name} kalah via ${result.how} R${result.r}.`);

    const oppName = fighter.booked?.opponent?.name || "Unknown";
    if (!f.fightHistory) f.fightHistory = [];
    f.fightHistory.push({ result: "L", opponent: oppName, method: result.how, round: result.r, tier: fighter.booked?.tier || "Local", week: g.week });
    if (f.fightHistory.length > 30) f.fightHistory.shift();
    const careerEvents = processFightResult(f, g, { won: false, how: result.how });
    updateRivalryResult({ name: oppName, rivalries: {} }, f, g);
    careerEvents.forEach((ev) => {
      pushInboxEvent(g, { type: "event", title: ev.title, body: ev.body, choices: [{ label: "OK", chem: 0 }] });
    });

    // ── Trash talk backfires on loss ──
    if (fighter.booked?.pressChoice === "trashTalk") {
      f.popularity = clamp((f.popularity || 0) - 5, 0, 100);
      g.log.unshift("💬 " + f.name + " trash talk backfires! Popularity -5.");
    }
  }

  // ── Staredown attitude effects ──
  if (result.attitude === "Respectful") {
    f.popularity = clamp((f.popularity || 0) + 2, 0, 100);
  } else if (result.attitude === "Professional" && result.won) {
    g.rep = clamp((g.rep || 0) + 2, 2, 100);
  } else if (result.attitude === "Trash talk") {
    f.popularity = clamp((f.popularity || 0) + 5, 0, 100);
    if (!result.won) {
      f.morale = clamp((f.morale || 0) - 8, 0, 100);
      g.rep = clamp((g.rep || 0) - 5, 2, 100);
    }
  }
}
