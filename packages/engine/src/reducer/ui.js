// UI domain — inbox management, scouting, event dispatch
import { dispatchEvent } from "../dispatch.js";
import { runScout } from "../scouting.js";

export function reduceUI(g, action) {
  switch (action.type) {
    case "SCOUT": {
      // The engine generates the prospect, report and grade (scouting.js).
      runScout(g, action.methodId, { filterArch: action.filterArch, filterWC: action.filterWC });
      break;
    }
    case "INBOX_REMOVE": {
      g.inbox = g.inbox.filter((x) => x.id !== action.messageId);
      break;
    }
    case "INBOX_EVENT": {
      const m = g.inbox.find((x) => x.id === action.messageId);
      if (!m) break;
      // Use the choice stored on the message, not whatever the caller sends.
      const choice = Number.isInteger(action.choiceIndex) && m.choices?.[action.choiceIndex]
        || m.choices?.find((c) => c.label === action.choice?.label)
        || (m.choices?.length ? null : action.choice);
      if (!choice) break;
      g.inbox = g.inbox.filter((x) => x.id !== action.messageId);
      dispatchEvent(g, action, choice);
      break;
    }
  }
}
