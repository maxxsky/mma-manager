// Rival camps were removed (P1 #21). Strip their leftovers from older saves:
// the camps themselves, camp tags on world fighters and champions, and pending
// coach-poach prompts whose handler no longer exists. Pending fighter-poach
// prompts stay: their counter/let go/talk choices still work without camps.
// Consumes no RNG and is safe to run on every load.
const stripCamp = (o) => { if (o && typeof o === "object") { delete o.campId; delete o.campName; } };

export function migrateRemovedRivalCamps(s) {
  if (!s) return s;
  delete s.rivals;
  Object.values(s.divisions || {}).forEach((d) => {
    (d.list || []).forEach(stripCamp);
    stripCamp(d.champ);
    Object.values(d.tierChamps || {}).forEach(stripCamp);
  });
  (s.roster || []).forEach((f) => stripCamp(f.booked?.opponent));
  if (Array.isArray(s.inbox)) {
    s.inbox = s.inbox.filter((m) => !m.choices?.some((c) => c.coachPoach));
    s.inbox.forEach((m) => stripCamp(m.opponent));
  }
  return s;
}
