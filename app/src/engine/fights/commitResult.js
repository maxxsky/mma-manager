// Fight outcome persistence — moved from UI to career layer
import { clamp, uid } from "../rng.js";
import { processFightResult, processRivalry, updateRivalryResult, processTitleChange } from "../career.js";

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
      if (g.divisions?.[f.weightClass]) g.divisions[f.weightClass].champ = { name: f.name, player: true, fighterId: f.id };
    }
    g.legacy = (g.legacy || 0) + (fighter.booked?.title ? 2000 : 600);
    g.log.unshift(`🏆 ${f.name} menang via ${result.how} R${result.r}!`);

    const oppName = fighter.booked?.opponent?.name || "Unknown";
    const careerEvents = processFightResult(f, g, { won: true, how: result.how });
    const rivalryEvents = processRivalry(f, { name: oppName }, g);
    updateRivalryResult(f, { name: oppName, rivalries: {} }, g);
    if (fighter.booked?.title) {
      const titleEvents = processTitleChange(f, g, f.titleDefenses ? "defense" : "won");
      careerEvents.push(...titleEvents);
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
