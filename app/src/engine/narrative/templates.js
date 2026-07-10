// Narrative templates — story text isolated for future localization.
// Every narrative is derived from simulation data, never scripted.

export const TEMPLATES = {
  // Championship
  firstDefense: (fighter) => ({
    title: `👑 First Defense`,
    body: `${fighter.name} successfully defended the ${fighter.weightClass} title for the first time. The reign begins.`,
  }),
  dominantReign: (fighter) => ({
    title: `👑👑 Dominant Reign`,
    body: `${fighter.name} has now defended the title 5 times. This is one of the great championship reigns in ${fighter.weightClass} history.`,
  }),
  historicDynasty: (fighter) => ({
    title: `🏛️ Historic Dynasty`,
    body: `10 title defenses. ${fighter.name} has transcended the sport. The ${fighter.weightClass} division will forever be measured against this reign.`,
  }),

  // Retirement
  retirement: (fighter, wins, losses, kos, subs, defenses, hof) => {
    let story = `${fighter.name} retires with a record of ${wins}-${losses}. `;
    if (defenses > 0) story += `${defenses} title defenses. `;
    if (kos >= 10) story += `A devastating knockout artist. `;
    if (subs >= 8) story += `A submission specialist. `;
    if (hof) story += `Hall of Fame inductee. `;
    if (fighter.milestoneFirstTitle) story += `Former world champion. `;
    story += `A career that defined an era.`;
    return { title: `🎗️ ${fighter.name} Retires`, body: story };
  },

  // Upset
  upset: (fighter, opponent, oppRank) => ({
    title: `🌊 Massive Upset!`,
    body: `${fighter.name} shocked the world by defeating #${oppRank} ranked ${opponent.name || "the champion"}! This will be remembered as one of the greatest upsets in ${fighter.weightClass} history.`,
  }),

  // Camp milestones
  fiveChampions: () => ({
    title: `🏛️ Five Champions`,
    body: `This camp has now produced 5 world champions — a testament to its development system and coaching staff.`,
  }),
  hundredWins: () => ({
    title: `💯 100 Wins`,
    body: `The camp has reached 100 total victories. From the first win to the hundredth — every one built this legacy.`,
  }),
  threeHof: () => ({
    title: `🏛️ Three Hall of Famers`,
    body: `Three fighters from this camp have been inducted into the Hall of Fame. Few institutions can claim such a legacy.`,
  }),

  // Comparisons
  youngestChamp: (fighter, record) => ({
    title: `⭐ Youngest Champion!`,
    body: `At just ${fighter.age}, ${fighter.name} becomes the youngest champion in camp history, surpassing ${record.holder} who won at ${record.value}.`,
  }),
  closingInKO: (fighter, record) => ({
    title: `💥 Closing In`,
    body: `${fighter.name} has ${fighter.record.ko} KOs — just ${record.value - fighter.record.ko} away from tying ${record.holder}'s record.`,
  }),

  // Historical context
  followingHofSteps: (fighter, similarHof) =>
    `${fighter.name} follows in the footsteps of Hall of Famer ${similarHof.name}, who also held ${fighter.weightClass} gold.`,
  chasingRecord: (fighter, record) =>
    `Chasing history: ${fighter.name} needs ${record.value - fighter.titleDefenses} more defenses to tie ${record.holder}'s record of ${record.value}.`,
  unbeatenStreak: (fighter) =>
    `${fighter.name} is on a ${fighter.streakW}-fight win streak — the longest active streak in ${fighter.weightClass}.`,

  // World news
  divisionShakeup: (tc) => ({
    title: `📰 ${tc.division} Shake-up`,
    body: `${tc.newChamp} defeated ${tc.oldChamp} to claim the ${tc.division} championship. A new era begins in this division.`,
  }),
  risingStar: (c) => ({
    title: `🌟 Rising Star: ${c.name}`,
    body: `At just ${c.age}, ${c.name} has cracked the top 3. Scouts are calling this fighter a future champion.`,
  }),

  // Timeline
  hofInduction: (h) => ({
    title: `🏛️ Hall of Fame`, body: `${h.name} has been inducted into the Hall of Fame with a record of ${h.record} and ${h.defenses} title defenses.`,
  }),
  firstDefenseTimeline: (f) => ({
    title: `🛡️ First Defense`, body: `${f.name} successfully defended the ${f.weightClass} title for the first time.`,
  }),
  dominantReignTimeline: (f) => ({
    title: `👑 Dominant Reign`, body: `${f.name} has defended the ${f.weightClass} title 5 times. A historic reign.`,
  }),
};
