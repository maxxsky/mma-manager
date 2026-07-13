// UI domain — inbox management, scouting, event dispatch
import { uid } from "../rng.js";
import { dispatchEvent } from "../dispatch.js";
import { MAX_PROSPECTS } from "./constants.js";

export function reduceUI(g, action) {
  switch (action.type) {
    case "SCOUT": {
      if (!g.prospects) g.prospects = [];
      g.cash -= action.cost;
      g.prospects.unshift({
        id: uid(), fighter: action.fighter, report: action.report,
        grade: action.grade, method: action.method, scoutedWeek: g.week,
        transferReason: action.transferReason,
      });
      if (g.prospects.length > MAX_PROSPECTS) {
        const dropped = g.prospects[g.prospects.length - 1];
        g.log.unshift("📋 " + dropped.fighter.name + " (prospect) di-drop — slot scouting penuh.");
      }
      g.prospects = g.prospects.slice(0, MAX_PROSPECTS);
      g.log.unshift("🔍 Scout report baru (" + action.method + ", grade " + action.grade + ").");
      break;
    }
    case "INBOX_REMOVE": {
      g.inbox = g.inbox.filter((x) => x.id !== action.messageId);
      break;
    }
    case "INBOX_EVENT": {
      const m = g.inbox.find((x) => x.id === action.messageId);
      if (!m) break;
      g.inbox = g.inbox.filter((x) => x.id !== action.messageId);
      dispatchEvent(g, action);
      break;
    }
  }
}
