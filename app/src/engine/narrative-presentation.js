// ============================================================
//   NARRATIVE PRESENTATION — Stories from simulation data.
//   Orchestration layer — delegates to narrative/ generators.
//   Every narrative derived from actual simulation history.
// ============================================================

import { uid } from "./rng.js";
import { createNarrativeContext } from "./narrative/context.js";
import { generateChampionshipStory } from "./narrative/generators/champion.js";
import { generateRetirementStory } from "./narrative/generators/retirement.js";
import { generateUpsetStory } from "./narrative/generators/upset.js";
import { generateCampMilestoneStory } from "./narrative/generators/camp.js";
import { generateComparisonNews, getHistoricalContext } from "./narrative/generators/comparison.js";
import { generateWorldNews } from "./narrative/generators/world-news.js";
import {
  getCampaignTimeline, addTimelineEvent, checkTimelineEvents,
} from "./narrative/timeline.js";

// Re-export for backward compatibility
export {
  generateChampionshipStory, generateRetirementStory, generateUpsetStory,
  generateCampMilestoneStory, generateComparisonNews, getHistoricalContext,
  generateWorldNews, getCampaignTimeline, addTimelineEvent, checkTimelineEvents,
};

// ── INTEGRATION: master narrative tick ──

export function narrativeTick(g) {
  const events = [];
  const ctx = createNarrativeContext(g);

  // Timeline events
  const timelineEvents = checkTimelineEvents(g, ctx);
  events.push(...timelineEvents);

  // Camp milestones
  const campStories = generateCampMilestoneStory(ctx);
  if (campStories) events.push(...campStories);

  // World news
  const worldNews = generateWorldNews(ctx);
  events.push(...worldNews);

  // Legacy comparisons (every 12 weeks)
  if (g.week % 12 === 0) {
    const comparisons = generateComparisonNews(ctx);
    events.push(...comparisons);
  }

  // Push to inbox
  events.forEach(ev => {
    if (!g.inbox) g.inbox = [];
    if (g.inbox.some(m => m.title === ev.title && m.body === ev.body)) return;
    g.inbox.unshift({
      id: uid(), type: "event",
      title: ev.title, body: ev.body,
      choices: [{ label: "OK", chem: 0 }],
    });
  });

  return events.length;
}
