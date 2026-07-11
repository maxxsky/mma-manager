// Fight outcome persistence — moved from UI to career layer
import { clamp, uid } from "../rng.js";
import { processFightResult, processRivalry, updateRivalryResult, processTitleChange } from "../career.js";
import { queueDelayedEvent } from "../events.js";
import { TITLE_CELEBRATION_DELAY_WEEKS, TITLE_SPONSOR_DELAY_WEEKS } from "../events/config.js";

/** Commit fight result to game state. Called from FightNight done() callback. */
export function commitFightResult(g, fighter, result) {
  const f = g.roster?.find((x) => x.id === fighter.id);
  if (!f) return;

  f.booked = null;

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
          div.champ.lastDefenseWeek = g.week;
        } else {
          // New reign — create fresh champ object
          div.champ = { name: f.name, player: true, fighterId: f.id, wonWeek: g.week, lastDefenseWeek: g.week, titleDefenses: 0 };
          if (!f.reignHistory) f.reignHistory = [];
          f.reignHistory.push({ wonWeek: g.week, weightClass: f.weightClass });
        }
      }
    }
    g.legacy = (g.legacy || 0) + (fighter.booked?.title ? 2000 : 600);
    g.log.unshift(`🏆 ${f.name} menang via ${result.how} R${result.r}!`);

    const oppName = fighter.booked?.opponent?.name || "Unknown";
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
      g.inbox.unshift({ id: uid(), type: "event", title: ev.title, body: ev.body, choices: [{ label: "OK", chem: 0 }] });
    });

    if (fighter.booked?.oppRank != null && fighter.booked.oppRank <= 5) {
      f.giantKills = (f.giantKills || 0) + 1;
    }
  } else {
    f.record.l++; f.streakL = (f.streakL || 0) + 1; f.streakW = 0;
    const moraleLoss = f.traits?.includes("Iron Will") ? -4 : -14;
    f.morale = clamp(f.morale + moraleLoss, 0, 100);
    g.rep = clamp(g.rep - 3, 2, 100);
    g.chemistry = clamp(g.chemistry - 2, 0, 100);
    g.log.unshift(`❌ ${f.name} kalah via ${result.how} R${result.r}.`);

    const oppName = fighter.booked?.opponent?.name || "Unknown";
    const careerEvents = processFightResult(f, g, { won: false, how: result.how });
    updateRivalryResult({ name: oppName, rivalries: {} }, f, g);
    careerEvents.forEach((ev) => {
      g.inbox.unshift({ id: uid(), type: "event", title: ev.title, body: ev.body, choices: [{ label: "OK", chem: 0 }] });
    });
  }
}
