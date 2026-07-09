// ============================================================
//   EVENT STATE SYSTEM — Connected events, flags, memory, camp states
//   State-driven, emergent, no scripted campaigns.
// ============================================================

import { clamp, random, pick, uid, fmt$ } from "./rng.js";

// ── EVENT FLAGS ──

const FLAG_DURATIONS = {
  "recent_conflict": 8,        // 8 weeks
  "coach_upset": 12,           // 12 weeks
  "fighter_frustrated": 8,
  "team_momentum": 6,
  "camp_under_pressure": 10,
  "chemistry_shaken": 8,
  "morale_boost": 6,
  "public_attention": 6,
  "rebuilding": 24,            // 24 weeks
};

export function setFlag(obj, flag) {
  if (!obj._flags) obj._flags = {};
  obj._flags[flag] = (obj._flags[flag] || 0) + FLAG_DURATIONS[flag];
}

export function hasFlag(obj, flag) {
  return obj?._flags?.[flag] > 0;
}

export function decayFlags(g) {
  // Decay fighter flags
  g.roster?.forEach((f) => {
    if (f._flags) {
      Object.keys(f._flags).forEach((k) => {
        f._flags[k] = Math.max(0, f._flags[k] - 1);
        if (f._flags[k] <= 0) delete f._flags[k];
      });
    }
  });
  // Decay coach flags
  g.coaches?.forEach((c) => {
    if (c._flags) {
      Object.keys(c._flags).forEach((k) => {
        c._flags[k] = Math.max(0, c._flags[k] - 1);
        if (c._flags[k] <= 0) delete c._flags[k];
      });
    }
  });
  // Decay camp flags
  if (g._campFlags) {
    Object.keys(g._campFlags).forEach((k) => {
      g._campFlags[k] = Math.max(0, g._campFlags[k] - 1);
      if (g._campFlags[k] <= 0) delete g._campFlags[k];
    });
  }
}

// ── EVENT MEMORY ──

export function recordMemory(obj, key) {
  if (!obj._memory) obj._memory = {};
  obj._memory[key] = (obj._memory[key] || 0) + 1;
}

export function getMemory(obj, key) {
  return obj?._memory?.[key] || 0;
}

// ── CAMP STATE ──

export function computeCampState(g) {
  if (!g._campState) g._campState = {};

  const moraleAvg = g.roster?.length > 0
    ? g.roster.reduce((s, f) => s + (f.morale || 50), 0) / g.roster.length
    : 50;
  const winStreak = g.roster?.some((f) => (f.streakW || 0) >= 3);

  // High Morale
  if (moraleAvg >= 75 && g.chemistry >= 60) {
    g._campState.high_morale = true;
  } else {
    delete g._campState.high_morale;
  }

  // Internal Tension
  if (hasFlag(g, "chemistry_shaken") || (g.chemistry < 30)) {
    g._campState.internal_tension = true;
  } else if (g.chemistry >= 50) {
    delete g._campState.internal_tension;
  }

  // Winning Momentum
  if (winStreak && g.chemistry >= 50) {
    g._campState.winning_momentum = true;
  } else if (moraleAvg < 40) {
    delete g._campState.winning_momentum;
  }

  // Rebuilding Phase
  const rookieCount = g.roster?.filter((f) => (f.record?.w || 0) + (f.record?.l || 0) <= 3).length || 0;
  if (rookieCount >= g.roster?.length * 0.5 && g.roster?.length > 2) {
    g._campState.rebuilding = true;
  } else if (rookieCount <= 1) {
    delete g._campState.rebuilding;
  }

  // Under Pressure
  if (g.cash < 10000 || (g.rep < 10 && g.week > 50)) {
    g._campState.under_pressure = true;
  } else if (g.cash >= 50000) {
    delete g._campState.under_pressure;
  }
}

export function hasCampState(g, state) {
  return g?._campState?.[state] === true;
}

// ── DELAYED CONSEQUENCES ──

export function queueDelayedEvent(g, event, triggerWeek) {
  if (!g._delayedEvents) g._delayedEvents = [];
  g._delayedEvents.push({ ...event, triggerWeek: g.week + triggerWeek });
}

export function processDelayedEvents(g) {
  if (!g._delayedEvents) return [];
  const events = [];
  g._delayedEvents = g._delayedEvents.filter((e) => {
    if (g.week >= e.triggerWeek) {
      events.push(e);
      return false;
    }
    return true;
  });
  return events;
}

// ── TIER-BASED EVENT POOLS ──

// Existing events + tier-specific additions
const TIER_EVENTS = {
  // Local Gym (tier 0) — operational struggles
  0: [
    { title: "Peralatan rusak", body: "Matras latihan sobek — butuh perbaikan darurat.", 
      choices: [{ label: "Perbaiki ($2,000)", cash: -2000, chem: 1 }, { label: "Tunda dulu", chem: -1 }] },
    { title: "Listrik padam", body: "Pemadaman bergilir — latihan malam ini terganggu.",
      choices: [{ label: "Sewa genset ($500)", cash: -500 }, { label: "Latihan pagi saja", chem: -2 }] },
  ],
  // Regional Camp (tier 1)
  1: [
    { title: "Media lokal", body: "Koran daerah mau wawancara — kesempatan exposure.",
      choices: [{ label: "Terima (popularity camp)", chem: -1, viralPop: null }, { label: "Tolak — fokus latihan", chem: 1 }] },
  ],
  // National Center (tier 2)
  2: [
    { title: "Tawaran kolaborasi", body: "Brand lokal tawarkan sponsorship jangka pendek.",
      choices: [{ label: "Terima ($3,000)", cash: 3000 }, { label: "Tolak", chem: 1 }] },
  ],
  // Elite Factory (tier 3)
  3: [
    { title: "Prospect walk-in", body: "Seorang petarung muda datang langsung ke camp minta trial.",
      choices: [{ label: "Beri kesempatan (scout gratis)", chem: 1 }, { label: "Tolak — roster penuh" }] },
  ],
  // World-Class (tier 4)
  4: [
    { title: "Media nasional", body: "ESPN minta akses eksklusif ke camp — exposure besar.",
      choices: [{ label: "Buka pintu (rep +3)", rep: 3, chem: -2 }, { label: "Privasi dulu", chem: 2 }] },
    { title: "Tawaran ekspansi", body: "Investor tawarkan modal untuk buka cabang kedua.",
      choices: [{ label: "Pertimbangkan", cash: 50000 }, { label: "Fokus ke camp utama", rep: 2, chem: 3 }] },
  ],
};

export function getTierEvents(tier) {
  const tierLevel = tier?.rosterCap ? CAMP_TIERS.findIndex(t => t.rosterCap === tier.rosterCap) : (typeof tier === 'number' ? tier : 0);
  const validTier = clamp(tierLevel, 0, 4);
  return TIER_EVENTS[validTier] || [];
}

// Import needed at bottom to avoid circular
import { CAMP_TIERS } from "./data.js";

// ── EVENT ENHANCEMENT — wraps existing events with state context ──

export function enhanceEvents(g) {
  const events = [];
  if (g.week % 8 !== 0) return events; // every 8 weeks

  const tier = CAMP_TIERS[g.campTier || 0] || CAMP_TIERS[0];

  // --- Tier-based events ---
  const tierPool = getTierEvents(tier);
  if (tierPool.length > 0 && random() < 0.3) {
    const ev = pick(tierPool);
    events.push(ev);
  }

  // --- State-driven events ---

  // Internal tension → fighter conflict
  if (hasCampState(g, "internal_tension") && random() < 0.4 && g.roster?.length >= 2) {
    const a = pick(g.roster);
    const b = pick(g.roster.filter(x => x.id !== a.id));
    if (a && b) {
      events.push({
        title: "Ketegangan memuncak",
        body: `Situasi di camp sudah tegang selama berminggu-minggu. ${a.name} dan ${b.name} nyaris berkelahi di ruang ganti.`,
        choices: [
          { label: "Mediasi darurat ($1,000)", cash: -1000, chem: 3 },
          { label: "Pisahkan mereka", chem: 1, moraleTo: { id: a.id, amt: -3 } },
        ],
      });
    }
  }

  // Winning momentum → sponsorship interest
  if (hasCampState(g, "winning_momentum") && random() < 0.35) {
    events.push({
      title: "Sponsor tertarik",
      body: "Rentetan kemenangan camp ini menarik perhatian brand besar. Mereka ingin meeting.",
      choices: [
        { label: "Jadwalkan meeting (chemistry booast)", chem: 3 },
        { label: "Fokus ke pertarungan dulu", chem: 1 },
      ],
    });
  }

  // Rebuilding phase → veteran mentorship opportunity
  if (hasCampState(g, "rebuilding") && g.roster?.some(f => (f.age || 0) >= 30) && random() < 0.3) {
    const vet = pick(g.roster.filter(f => (f.age || 0) >= 30));
    const rook = pick(g.roster.filter(f => (f.age || 0) <= 24 && f.id !== vet?.id));
    if (vet && rook) {
      events.push({
        title: `${vet.name} mentors ${rook.name}`,
        body: `${vet.name} terlihat melatih ${rook.name} ekstra setelah jam latihan. Chemistry camp membaik.`,
        choices: [
          { label: "Dorong mentorship", chem: 4 },
          { label: "Biarkan alami", chem: 2 },
        ],
      });
    }
  }

  // Under pressure → desperate measures
  if (hasCampState(g, "under_pressure") && random() < 0.35) {
    events.push({
      title: "Di bawah tekanan",
      body: "Situasi keuangan menekan — staf mulai gelisah. Beberapa coach mempertimbangkan tawaran dari luar.",
      choices: [
        { label: "Tenangkan tim (chemistry)", chem: 2, moraleTo: null },
        { label: "Jujur soal kondisi", chem: -1, cash: 0 },
      ],
    });
  }

  // --- Delayed consequence checks ---

  // Coach denied raise 3+ times → guaranteed resign event
  g.coaches?.forEach((c) => {
    if (getMemory(c, "raise_denied") >= 3 && !hasFlag(c, "coach_upset")) {
      setFlag(c, "coach_upset");
      events.push({
        title: `${c.name} ultimatum`,
        body: `${c.name} sudah 3 kali ditolak kenaikan gaji. Dia memberi ultimatum: naikkan atau dia pergi.`,
        choices: [
          { label: `Naikkan gaji (+40%)`, coachSalary: { id: c.id, amt: Math.round(c.salary * 1.4) } },
          { label: "Lepas", coachLeave: c.id },
        ],
      });
    }
  });

  // Fighter complaints ignored 3+ times → release request
  g.roster?.forEach((f) => {
    if (getMemory(f, "complaint_ignored") >= 3 && f.morale < 40 && !hasFlag(f, "fighter_frustrated")) {
      setFlag(f, "fighter_frustrated");
      events.push({
        title: `${f.name} frustrasi`,
        body: `${f.name} merasa diabaikan setelah 3 kali komplain. Dia mulai bicara dengan camp lain.`,
        choices: [
          { label: "Minta maaf + bonus ($3,000)", cash: -3000, moraleTo: { id: f.id, amt: 20 } },
          { label: "Lepas", release: f.id },
        ],
      });
    }
  });

  return events;
}

// ── INTEGRATION: process all event enhancements ──

export function processEventSystem(g) {
  decayFlags(g);
  computeCampState(g);
  
  const delayed = processDelayedEvents(g);
  const enhanced = enhanceEvents(g);
  
  const all = [...delayed, ...enhanced];
  
  all.forEach((ev) => {
    if (!g.inbox) g.inbox = [];
    g.inbox.unshift({
      id: uid(), type: "event",
      title: ev.title, body: ev.body,
      choices: ev.choices || [{ label: "OK", chem: 0 }],
    });
  });

  return all.length;
}

// ── HOOKS: call these from existing event handlers ──

export function onCoachRaiseDenied(g, coach) {
  recordMemory(coach, "raise_denied");
  setFlag(g, "chemistry_shaken");
}

export function onFightComplaintIgnored(g, fighter) {
  recordMemory(fighter, "complaint_ignored");
  setFlag(fighter, "fighter_frustrated");
}

export function onConflictMediated(g) {
  setFlag(g, "team_momentum");
}

export function onWinningStreak(g) {
  setFlag(g, "team_momentum");
}

export function onRetentionBonusPaid(g, fighter) {
  recordMemory(fighter, "retention_bonus");
  setFlag(fighter, "morale_boost");
}
