// Timeline — historical timeline management
import { TEMPLATES } from "./templates.js";

export function getCampaignTimeline(g) {
  if (!g._timeline) g._timeline = [];
  return g._timeline;
}

export function addTimelineEvent(g, event) {
  if (!g._timeline) g._timeline = [];
  if (g._timeline.some(e => e.week === event.week && e.type === event.type && e.title === event.title)) return;
  g._timeline.push({ ...event, week: g.week });
  if (g._timeline.length > 100) g._timeline = g._timeline.slice(-100);
}

export function checkTimelineEvents(g, ctx) {
  const events = [];

  // Hall of Fame inductions
  ctx.recentHofInductions.forEach(h => {
    const exists = ctx.timeline.some(e => e.type === "hall_of_fame" && e.title?.includes(h.name));
    if (!exists) {
      addTimelineEvent(g, { type: "hall_of_fame", title: `🏛️ ${h.name} inducted into Hall of Fame`, detail: `Record: ${h.record} · ${h.defenses} title defenses` });
      events.push(TEMPLATES.hofInduction(h));
    }
  });

  // Championship milestones
  ctx.roster.forEach(f => {
    if (f.titleDefenses === 1 && !f._timelineDef1) {
      f._timelineDef1 = true;
      addTimelineEvent(g, { type: "title_defense", title: `🛡️ ${f.name} — First Title Defense`, detail: `${f.weightClass} champion` });
      events.push(TEMPLATES.firstDefenseTimeline(f));
    }
    if (f.titleDefenses === 5 && !f._timelineDef5) {
      f._timelineDef5 = true;
      addTimelineEvent(g, { type: "title_defense", title: `👑 ${f.name} — 5 Title Defenses`, detail: `Dominant ${f.weightClass} reign` });
      events.push(TEMPLATES.dominantReignTimeline(f));
    }
    if ((f.record?.w || 0) + (f.record?.l || 0) === 20 && !f._timeline20fights) {
      f._timeline20fights = true;
      addTimelineEvent(g, { type: "milestone", title: `💎 ${f.name} — 20 Career Fights`, detail: `Ironman milestone` });
    }
  });

  // Camp milestones
  const d = ctx.dynasty;
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
