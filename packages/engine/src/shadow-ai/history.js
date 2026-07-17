// Shadow AI history — centralized camp history mutation
import { ERA_QUALITY_THRESHOLD, ERA_REP_THRESHOLD, ERA_END_QUALITY } from "./config.js";

/** Record camp history event (championship era tracking) */
export function recordCampHistory(camp, quality, rep) {
  const s = camp._shadow;

  // Track championship eras
  if (quality >= ERA_QUALITY_THRESHOLD && rep >= ERA_REP_THRESHOLD && !s._eraFlagged) {
    s._eraFlagged = true;
    if (!camp._campHistory) camp._campHistory = [];
    camp._campHistory.push({
      type: "championship_era",
      week: 0,
      detail: `${camp.name} enters a championship era.`,
    });
  }
  if (quality < ERA_END_QUALITY && s._eraFlagged) {
    s._eraFlagged = false;
  }
}
