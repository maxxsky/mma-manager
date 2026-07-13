// Talent handlers — accept/reject discovered internal prospects
import { pushInboxEvent } from "../../events.js";
import { defaultContract } from "../../fighter.js";
import { rosterHasSpace, rosterFullMessage } from "../../talentPool.js";

export function registerTalentHandlers(register) {
  register("talentAccept", ({ g, c }) => {
    const fighter = c.talentFighter;
    if (!fighter) return;

    // Check roster cap
    if (!rosterHasSpace(g)) {
      const msg = rosterFullMessage(g);
      g.log.unshift(`🚫 Tidak bisa terima ${fighter.name}: ${msg}`);
      pushInboxEvent(g, {
        type: "event",
        title: `🚫 Roster Penuh — ${fighter.name}`,
        body: `Tidak bisa menambahkan ${fighter.name} ke roster. ${msg}`,
        choices: [{ label: "OK", chem: 0 }],
      });
      return;
    }

    // Add fighter to roster — NO sign bonus (they're already part of the gym)
    fighter.contract = defaultContract();
    fighter.joinedWeek = g.week;
    g.roster.push(fighter);
    g.log.unshift(`🏋️ ${fighter.name} (${fighter.archetype}) bergabung ke roster dari kelas reguler.`);
  });

  register("talentReject", ({ g, c }) => {
    // Entry is already removed from talentPool by rollDiscoverTalent,
    // so nothing left in pool. Just log.
    const name = c.talentReject === "unknown" ? "prospek" : "";
    g.log.unshift(`👋 Talenta dari kelas reguler ditolak — tetap jadi member biasa.`);
  });
}
