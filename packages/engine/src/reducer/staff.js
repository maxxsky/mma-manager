import { clamp } from "../rng.js";

export function reduceStaff(g, action) {
  switch (action.type) {
    case "HIRE_STAFF": {
      const { role, staffId } = action;
      if (!g.staff) g.staff = {};
      const candidate = g.staffMarket?.[role]?.find((x) => x.id === staffId);
      if (candidate) {
        g.staff[role] = candidate;
        g.staffMarket[role] = g.staffMarket[role].filter((x) => x.id !== staffId);
        g.log.unshift(`✅ ${candidate.name} direkrut sebagai ${role} — gaji $${candidate.salary}/bln.`);
      }
      break;
    }
    case "FIRE_STAFF": {
      const { role } = action;
      if (g.staff?.[role]) {
        const name = g.staff[role].name;
        g.staff[role] = null;
        g.chemistry = clamp((g.chemistry || 0) - 3, 0, 100);
        g.log.unshift(`👋 ${name} (${role}) dipecat.`);
      }
      break;
    }
  }
}
