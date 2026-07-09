// ============================================================
//   NARRATIVE PRESENTATION — Stories from simulation data
//   No scripted events. Every narrative from actual history.
// ============================================================

import { clamp, pick, uid } from "./rng.js";

// ── NARRATIVE PRESENTATION ──

export function generateChampionshipStory(fighter, g) {
  if (!fighter?.milestoneFirstTitle) return null;
  const history = g._worldHistory?.titleChanges || [];
  const fighterChanges = history.filter(h => h.newChamp === fighter.name || h.oldChamp === fighter.name);

  const stories = [];
  if (fighter.titleDefenses === 1) {
    stories.push({
      title: `👑 First Defense`,
      body: `${fighter.name} successfully defended the ${fighter.weightClass} title for the first time. The reign begins.`
    });
  }
  if (fighter.titleDefenses === 5) {
    stories.push({
      title: `👑👑 Dominant Reign`,
      body: `${fighter.name} has now defended the title 5 times. This is one of the great championship reigns in ${fighter.weightClass} history.`
    });
  }
  if (fighter.titleDefenses === 10) {
    stories.push({
      title: `🏛️ Historic Dynasty`,
      body: `10 title defenses. ${fighter.name} has transcended the sport. The ${fighter.weightClass} division will forever be measured against this reign.`
    });
  }
  return stories.length > 0 ? stories : null;
}

export function generateRetirementStory(fighter, g) {
  if (!fighter) return null;
  const wins = fighter.record?.w || 0;
  const losses = fighter.record?.l || 0;
  const kos = fighter.record?.ko || 0;
  const subs = fighter.record?.sub || 0;
  const defenses = fighter.titleDefenses || 0;
  const hof = g._hallOfFame?.some(h => h.id === fighter.id);

  let story = `${fighter.name} retires with a record of ${wins}-${losses}. `;
  if (defenses > 0) story += `${defenses} title defenses. `;
  if (kos >= 10) story += `A devastating knockout artist. `;
  if (subs >= 8) story += `A submission specialist. `;
  if (hof) story += `Hall of Fame inductee. `;
  if (fighter.milestoneFirstTitle) story += `Former world champion. `;
  story += `A career that defined an era.`;

  return { title: `🎗️ ${fighter.name} Retires`, body: story };
}

export function generateUpsetStory(fighter, opponent, g) {
  if (!fighter || !opponent) return null;
  const oppRank = fighter?.booked?.oppRank;
  if (oppRank == null || oppRank > 3) return null;

  return {
    title: `🌊 Massive Upset!`,
    body: `${fighter.name} shocked the world by defeating #${oppRank} ranked ${opponent.name || "the champion"}! This will be remembered as one of the greatest upsets in ${fighter.weightClass} history.`
  };
}

export function generateCampMilestoneStory(g) {
  const d = g._dynasty;
  if (!d) return null;
  const stories = [];

  if (d.championsProduced >= 5 && !d._milestone5champs) {
    d._milestone5champs = true;
    stories.push({
      title: `🏛️ Five Champions`,
      body: `This camp has now produced 5 world champions — a testament to its development system and coaching staff.`
    });
  }
  if (d.totalWins >= 100 && !d._milestone100wins) {
    d._milestone100wins = true;
    stories.push({
      title: `💯 100 Wins`,
      body: `The camp has reached 100 total victories. From the first win to the hundredth — every one built this legacy.`
    });
  }
  if (d.hallOfFamers?.length >= 3 && !d._milestone3hof) {
    d._milestone3hof = true;
    stories.push({
      title: `🏛️ Three Hall of Famers`,
      body: `Three fighters from this camp have been inducted into the Hall of Fame. Few institutions can claim such a legacy.`
    });
  }
  return stories.length > 0 ? stories : null;
}

// ── HISTORICAL TIMELINE ──

export function getCampaignTimeline(g) {
  if (!g._timeline) g._timeline = [];
  return g._timeline;
}

export function addTimelineEvent(g, event) {
  if (!g._timeline) g._timeline = [];
  // Avoid duplicates
  if (g._timeline.some(e => e.week === event.week && e.type === event.type && e.title === event.title)) return;
  g._timeline.push({ ...event, week: g.week });
  // Keep last 100 entries
  if (g._timeline.length > 100) g._timeline = g._timeline.slice(-100);
}

export function checkTimelineEvents(g) {
  const events = [];

  // Check Hall of Fame inductions
  const hof = g._hallOfFame || [];
  const recentHof = hof.filter(h => h.week === g.week);
  recentHof.forEach(h => {
    const exists = g._timeline?.some(e => e.type === "hall_of_fame" && e.title?.includes(h.name));
    if (!exists) {
      addTimelineEvent(g, { type: "hall_of_fame", title: `🏛️ ${h.name} inducted into Hall of Fame`, detail: `Record: ${h.record} · ${h.defenses} title defenses` });
      events.push({ title: `🏛️ Hall of Fame`, body: `${h.name} has been inducted into the Hall of Fame with a record of ${h.record} and ${h.defenses} title defenses.` });
    }
  });

  // Championship milestones
  g.roster?.forEach(f => {
    if (f.titleDefenses === 1 && !f._timelineDef1) {
      f._timelineDef1 = true;
      addTimelineEvent(g, { type: "title_defense", title: `🛡️ ${f.name} — First Title Defense`, detail: `${f.weightClass} champion` });
      events.push({ title: `🛡️ First Defense`, body: `${f.name} successfully defended the ${f.weightClass} title for the first time.` });
    }
    if (f.titleDefenses === 5 && !f._timelineDef5) {
      f._timelineDef5 = true;
      addTimelineEvent(g, { type: "title_defense", title: `👑 ${f.name} — 5 Title Defenses`, detail: `Dominant ${f.weightClass} reign` });
      events.push({ title: `👑 Dominant Reign`, body: `${f.name} has defended the ${f.weightClass} title 5 times. A historic reign.` });
    }
    if ((f.record?.w || 0) + (f.record?.l || 0) === 20 && !f._timeline20fights) {
      f._timeline20fights = true;
      addTimelineEvent(g, { type: "milestone", title: `💎 ${f.name} — 20 Career Fights`, detail: `Ironman milestone` });
    }
  });

  // Camp milestones
  const d = g._dynasty;
  if (d) {
    if (d.championsProduced >= 3 && !d._timeline3champs) {
      d._timeline3champs = true;
      addTimelineEvent(g, { type: "camp", title: `🏆 3 Champions Produced`, detail: `Camp dynasty milestone` });
    }
    if (d.totalWins >= 50 && !d._timeline50wins) {
      d._timeline50wins = true;
      addTimelineEvent(g, { type: "camp", title: `🎉 50 Total Wins`, detail: `Camp milestone` });
    }
    if (d.totalWins >= 100 && !d._timeline100wins) {
      d._timeline100wins = true;
      addTimelineEvent(g, { type: "camp", title: `💯 100 Total Wins`, detail: `Century milestone` });
    }
  }

  return events;
}

// ── LIVING MEMORY ──

export function getHistoricalContext(fighter, g) {
  const context = [];
  const hof = g._hallOfFame || [];
  const records = g._worldRecords || {};

  // Compare to Hall of Famers
  if (fighter?.milestoneFirstTitle && hof.length > 0) {
    const similarHof = hof.find(h => h.titles?.some(t => fighter.titles?.includes(t)));
    if (similarHof) {
      context.push(`${fighter.name} follows in the footsteps of Hall of Famer ${similarHof.name}, who also held ${fighter.weightClass} gold.`);
    }
  }

  // Compare to records
  if (fighter?.titleDefenses >= 3 && records?.mostTitleDefenses?.value > 0) {
    const record = records.mostTitleDefenses;
    if (fighter.titleDefenses < record.value) {
      context.push(`Chasing history: ${fighter.name} needs ${record.value - fighter.titleDefenses} more defenses to tie ${record.holder}'s record of ${record.value}.`);
    }
  }

  // Unbeaten streak context
  if ((fighter?.streakW || 0) >= 5) {
    context.push(`${fighter.name} is on a ${fighter.streakW}-fight win streak — the longest active streak in ${fighter.weightClass}.`);
  }

  return context;
}

export function generateComparisonNews(g) {
  const events = [];
  const hof = g._hallOfFame || [];
  const records = g._worldRecords || {};

  g.roster?.forEach(f => {
    // Young champion comparison
    if (f.milestoneFirstTitle && f.age <= 25 && records?.youngestChamp?.value > 0) {
      if (f.age <= records.youngestChamp.value) {
        events.push({
          title: `⭐ Youngest Champion!`,
          body: `At just ${f.age}, ${f.name} becomes the youngest champion in camp history, surpassing ${records.youngestChamp.holder} who won at ${records.youngestChamp.value}.`
        });
      }
    }

    // Approaching KO record
    const koRecord = records?.mostKOs?.value || 0;
    if ((f.record?.ko || 0) >= koRecord - 2 && koRecord > 0 && f.record.ko < koRecord) {
      events.push({
        title: `💥 Closing In`,
        body: `${f.name} has ${f.record.ko} KOs — just ${koRecord - f.record.ko} away from tying ${records.mostKOs.holder}'s record.`
      });
    }
  });

  return events;
}

// ── DYNAMIC NEWS ──

export function generateWorldNews(g) {
  const events = [];

  // Title changes in world
  const titleChanges = g._worldHistory?.titleChanges || [];
  const recentChanges = titleChanges.filter(tc => g.week - tc.week <= 4);
  recentChanges.forEach(tc => {
    events.push({
      title: `📰 ${tc.division} Shake-up`,
      body: `${tc.newChamp} defeated ${tc.oldChamp} to claim the ${tc.division} championship. A new era begins in this division.`
    });
  });

  // Prospect breakthroughs
  Object.values(g.divisions || {}).forEach(d => {
    const top3 = d.list?.slice(0, 3) || [];
    top3.forEach(c => {
      if (c.age <= 23 && c.points >= 75) {
        events.push({
          title: `🌟 Rising Star: ${c.name}`,
          body: `At just ${c.age}, ${c.name} has cracked the top 3. Scouts are calling this fighter a future champion.`
        });
      }
    });
  });

  return events;
}

// ── INTEGRATION: master narrative tick ──

export function narrativeTick(g) {
  const events = [];

  // Timeline events
  const timelineEvents = checkTimelineEvents(g);
  events.push(...timelineEvents);

  // Camp milestones
  const campStories = generateCampMilestoneStory(g);
  if (campStories) events.push(...campStories);

  // World news
  const worldNews = generateWorldNews(g);
  events.push(...worldNews);

  // Legacy comparisons (every 12 weeks)
  if (g.week % 12 === 0) {
    const comparisons = generateComparisonNews(g);
    events.push(...comparisons);
  }

  // Push to inbox
  events.forEach(ev => {
    if (!g.inbox) g.inbox = [];
    // Avoid exact duplicates
    if (g.inbox.some(m => m.title === ev.title && m.body === ev.body)) return;
    g.inbox.unshift({
      id: uid(), type: "event",
      title: ev.title, body: ev.body,
      choices: [{ label: "OK", chem: 0 }],
    });
  });

  return events.length;
}
