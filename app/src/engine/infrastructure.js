// ============================================================
//   ENGINE INFRASTRUCTURE — Scheduler, Registry, Pipeline, Tools
//   Coordinates modules without containing business logic.
// ============================================================

// ── TICK SCHEDULER ──

const tickHandlers = [];

export function registerTickHandler(name, handler, priority = 50) {
  tickHandlers.push({ name, handler, priority });
  tickHandlers.sort((a, b) => a.priority - b.priority);
}

export function runTick(g) {
  tickHandlers.forEach(h => {
    try { h.handler(g); }
    catch (e) { console.error(`Tick handler '${h.name}' failed:`, e); }
  });
}

export function getTickHandlers() { return [...tickHandlers]; }

// ── FEATURE REGISTRY ──

const features = [];

export function registerFeature(config) {
  const feature = {
    name: config.name,
    version: config.version || 1,
    tick: config.tick,
    tickPriority: config.tickPriority || 50,
    reducer: config.reducer,
    migrate: config.migrate,
    init: config.init,
    narrative: config.narrative,
    enabled: true,
  };

  if (feature.tick) registerTickHandler(feature.name, feature.tick, feature.tickPriority);

  features.push(feature);
  return feature;
}

export function getFeatures() { return [...features]; }

export function getFeature(name) { return features.find(f => f.name === name); }

// ── MODULAR REDUCER ──

const reducerHandlers = {};

export function registerReducer(domain, handlers) {
  reducerHandlers[domain] = { ...reducerHandlers[domain], ...handlers };
}

export function dispatchAction(g, action, domain) {
  // Try domain-specific first
  if (domain && reducerHandlers[domain]?.[action.type]) {
    reducerHandlers[domain][action.type](g, action);
    return true;
  }
  // Fall back to global
  for (const [dom, handlers] of Object.entries(reducerHandlers)) {
    if (handlers[action.type]) {
      handlers[action.type](g, action);
      return true;
    }
  }
  return false; // unhandled
}

export function getReducerDomains() { return Object.keys(reducerHandlers); }

// ── MIGRATION PIPELINE ──

const migrations = [];

export function registerMigration(version, name, fn) {
  migrations.push({ version, name, fn });
  migrations.sort((a, b) => a.version - b.version);
}

export function migrateSave(save, fromVersion, toVersion) {
  let current = { ...save };
  for (const m of migrations) {
    if (m.version > fromVersion && m.version <= toVersion) {
      try {
        current = m.fn(current);
      } catch (e) {
        console.error(`Migration v${m.version} '${m.name}' failed:`, e);
      }
    }
  }
  return current;
}

export function getMigrations() { return [...migrations]; }

// ── DEVELOPER TOOLS ──

const PROFILES = {};
const IS_DEV = typeof window !== 'undefined' && window.location?.hostname === 'localhost';

export function profileStart(name) {
  if (!IS_DEV) return;
  PROFILES[name] = performance.now();
}

export function profileEnd(name) {
  if (!IS_DEV) return 0;
  const elapsed = performance.now() - (PROFILES[name] || 0);
  delete PROFILES[name];
  return elapsed;
}

export function getProfileData() {
  return { ...PROFILES };
}

export function inspectState(g, path) {
  if (!IS_DEV) return null;
  try {
    const keys = path.split('.');
    let val = g;
    for (const k of keys) val = val?.[k];
    return val;
  } catch { return null; }
}

export function getStateKeys(g) {
  if (!IS_DEV) return [];
  return Object.keys(g || {}).filter(k => !k.startsWith('_'));
}

export function getSaveVersion(save) {
  return save?._saveVersion || save?._exportVersion || 0;
}

export function isDev() { return IS_DEV; }

// ── INITIALIZATION ──

// Register core tick handlers
registerTickHandler("core.week", (g) => { g.week++; }, 1);
registerTickHandler("core.bankruptcy", (g) => {
  if (g.cash < -50000) g.over = "BANGKRUT — kas di bawah -$50,000. Camp ditutup.";
}, 999);

// Register core migration (seed migration for save version)
registerMigration(1, "seed", (s) => {
  s._saveVersion = 1;
  return s;
});

console.log("[Engine] Infrastructure ready. Scheduler, registry, reducer, migration pipeline loaded.");
