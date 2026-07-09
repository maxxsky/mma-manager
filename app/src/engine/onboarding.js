// ============================================================
//   ONBOARDING — Lightweight FTUE without tutorials
//   Objectives auto-complete, tips appear once, no gating.
// ============================================================

// ── OBJECTIVE SYSTEM ──

const OBJECTIVES = [
  { id: "assign_training", label: "Assign training to a fighter", hint: "Click a fighter in Roster, then pick a training program.", check: (g) => g.roster?.some(f => f.training?.type && f.training.type !== "conditioning") },
  { id: "advance_week", label: "Advance the first week", hint: "Click 'Advance Week' in the sidebar.", check: (g) => g.week > 1 },
  { id: "accept_fight", label: "Accept your first fight", hint: "Check your Inbox for fight offers.", check: (g) => g.roster?.some(f => f.booked) },
  { id: "complete_fight", label: "Complete your first fight", hint: "Click the fight card in Dashboard to start FightNight.", check: (g) => g.roster?.some(f => (f.record?.w || 0) + (f.record?.l || 0) > 0) },
  { id: "scout_prospect", label: "Scout your first prospect", hint: "Go to the Scout tab and send a scout.", check: (g) => g.prospects?.length > 0 },
  { id: "sign_prospect", label: "Sign your first prospect", hint: "Click Negotiate on a prospect in the Scout tab.", check: (g) => g.roster?.length >= 3 },
  { id: "upgrade_facility", label: "Upgrade a facility", hint: "Go to the Facility tab and upgrade any facility.", check: (g) => Object.values(g.facilities || {}).some(l => l >= 2) },
];

export function getObjectives(g) {
  if (!g._completedObjectives) g._completedObjectives = [];
  return OBJECTIVES.filter(o => !g._completedObjectives.includes(o.id));
}

export function completeObjective(g, id) {
  if (!g._completedObjectives) g._completedObjectives = [];
  if (!g._completedObjectives.includes(id)) {
    g._completedObjectives.push(id);
  }
}

export function checkObjectives(g) {
  const remaining = getObjectives(g);
  remaining.forEach(o => {
    if (o.check(g)) {
      completeObjective(g, o.id);
    }
  });
}

// ── CONTEXTUAL TIPS ──

const TIPS = [
  { id: "first_chemistry", trigger: (g) => g.chemistry < 50 && g.week > 4, title: "💡 Chemistry", body: "Low chemistry reduces training efficiency. Mediate conflicts and build team bonding to raise it." },
  { id: "first_rep_gate", trigger: (g) => g.rep >= 12 && g.rep < 15 && g.campTier === 0, title: "💡 Reputation", body: "Reach 15 reputation to upgrade your camp to Regional tier. Win more fights to raise it." },
  { id: "first_injury", trigger: (g) => g.roster?.some(f => f.injury), title: "💡 Injuries", body: "Fighters heal automatically. Upgrade Medical Room to speed recovery and reduce future injury risk." },
  { id: "first_sponsor", trigger: (g) => g.sponsors?.length > 0 && g.sponsors.length === 1, title: "💡 Sponsors", body: "Sponsors provide monthly income. You can have up to 3 active sponsors. Accept offers in your Inbox." },
  { id: "first_overtraining", trigger: (g) => g.roster?.some(f => f.overtraining > 60), title: "💡 Overtraining", body: "A fighter is overtraining. Switch them to Recovery to prevent injuries and burnout." },
  { id: "first_low_morale", trigger: (g) => g.roster?.some(f => f.morale < 30), title: "💡 Low Morale", body: "A fighter has very low morale. This reduces training gains. Winning fights and giving attention raises morale." },
  { id: "first_contract_expiry", trigger: (g) => g.inbox?.some(m => m.durationExpiredId || m.extendFighterId), title: "💡 Contracts", body: "A fighter's contract is expiring. Negotiate a new contract or they'll become a free agent." },
  { id: "free_coach_expiring", trigger: (g) => g.week === 3 && g.coaches?.some(c => c.freeUntil === 4), title: "💡 Coach Salary", body: "Your starting coach's free period ends soon. You'll need to pay their salary starting week 5." },
];

export function getTip(g) {
  if (!g._shownTips) g._shownTips = [];
  for (const tip of TIPS) {
    if (!g._shownTips.includes(tip.id) && tip.trigger(g)) {
      g._shownTips.push(tip.id);
      return tip;
    }
  }
  return null;
}

// ── PROGRESS SUMMARY ──

export function getProgressSummary(g, prevState) {
  if (!prevState) return null;
  const changes = [];

  // Cash
  const cashDiff = g.cash - (prevState.cash || g.cash);
  if (Math.abs(cashDiff) >= 500) {
    changes.push({ icon: "💰", text: `Cash ${cashDiff >= 0 ? '+' : ''}${Math.round(cashDiff).toLocaleString()}` });
  }

  // Reputation
  const repDiff = g.rep - (prevState.rep || g.rep);
  if (repDiff !== 0) {
    changes.push({ icon: "⭐", text: `Rep ${repDiff >= 0 ? '+' : ''}${repDiff}` });
  }

  // Chemistry
  const chemDiff = g.chemistry - (prevState.chemistry || g.chemistry);
  if (Math.abs(chemDiff) >= 3) {
    changes.push({ icon: "🧪", text: `Chem ${chemDiff >= 0 ? '+' : ''}${chemDiff}` });
  }

  // Fighter changes
  g.roster?.forEach(f => {
    const prev = prevState.roster?.find(p => p.id === f.id);
    if (!prev) return;

    // Attribute gains
    const gains = [];
    if (f.attrs && prev.attrs) {
      Object.keys(f.attrs).forEach(k => {
        const diff = Math.round(f.attrs[k]) - Math.round((prev.attrs?.[k] || 0));
        if (diff > 0) gains.push(`${k}+${diff}`);
      });
    }
    if (gains.length > 0) {
      changes.push({ icon: "📈", text: `${f.name}: ${gains.slice(0, 3).join(', ')}${gains.length > 3 ? '...' : ''}` });
    }

    // Popularity
    const popDiff = (f.popularity || 0) - (prev.popularity || 0);
    if (Math.abs(popDiff) >= 3) {
      changes.push({ icon: "🎤", text: `${f.name} popularity ${popDiff >= 0 ? '+' : ''}${popDiff}` });
    }
  });

  // New inbox items
  const newMessages = (g.inbox?.length || 0) - (prevState.inbox?.length || 0);
  if (newMessages > 0) {
    changes.push({ icon: "📨", text: `${newMessages} new message${newMessages > 1 ? 's' : ''}` });
  }

  return changes.length > 0 ? changes : null;
}
