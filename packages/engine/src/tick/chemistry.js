// Chemistry domain — camp events, fighter relationships
import { clamp, pick, fmt$, uid, random } from "../rng.js";
import { CAMP_TIERS } from "../data.js";
import { COACH_SALARY_CEILING } from "../economy.js";

export function tickChemistry(g) {
  if (!g || !g.roster) return true;
  // ---------- chemistry events ----------
  if (random() < 0.30 && g.roster.length >= 2) {
    const roll = random();
    const fa = pick(g.roster);
    const fb = pick(g.roster.filter((x) => x.id !== fa.id));
    const coachTarget = pick(g.coaches.filter((c) => !c.freeUntil || g.week > c.freeUntil));

    if (roll < 0.25 && fa && fb) {
      // Context-dependent: risk gamble viable at high chemistry
      const highChem = g.chemistry >= 70;
      const gambleUp = highChem ? 8 : 6;
      const gambleDown = highChem ? -4 : -8;
      const gambleLabel = highChem ? "Biarkan — chemistry kuat, risiko rendah" : "Biarkan — bisa akur (+6) atau makin parah (-8)";
      g.inbox.unshift({
        id: uid(), type: "event", title: "Konflik sparring",
        body: `${fa.name} dan ${fb.name} clash saat sparring — suasana camp tegang.${highChem ? " Tapi chemistry camp solid — mungkin reda sendiri." : ""}`,
        choices: [
          { label: "Pisahkan jadwal", chem: 2 },
          { label: gambleLabel, gamble: [gambleUp, gambleDown] },
          { label: "Mediasi", chem: 5 },
        ],
      });
    } else if (roll < 0.45 && coachTarget) {
      // Coach asks for fair raise based on skill + tenure. No more double-charge or 0% raises.
      const tenureWeeks = g.week - (coachTarget.hiredWeek || 0);
      const tenureYears = Math.floor(tenureWeeks / 48);
      const raisePct = clamp(0.10 + tenureYears * 0.03 + (coachTarget.skill - 3) * 0.02, 0.08, 0.50);
      const raiseAmt = Math.round(coachTarget.salary * raisePct);
      let newSalary = coachTarget.salary + raiseAmt;
      // Apply salary ceiling — cap at max derived value
      if (newSalary > COACH_SALARY_CEILING) {
        newSalary = COACH_SALARY_CEILING;
      }
      const hasRaisedRecently = coachTarget.lastRaiseWeek && g.week - coachTarget.lastRaiseWeek < 48;
      if (hasRaisedRecently || raiseAmt < 200) return false; // preserved: original returned from tick(), skipping rest of cycle
      g.inbox.unshift({
        id: uid(), type: "event", title: `${coachTarget.name} minta naik gaji`,
        body: `${coachTarget.name} sudah ${tenureYears > 0 ? tenureYears + " tahun" : Math.floor(tenureWeeks / 4) + " bulan"} di camp (skill ${coachTarget.skill}). Dia minta kenaikan ${Math.round(raisePct * 100)}%: dari ${fmt$(coachTarget.salary)} → ${fmt$(newSalary)}/bulan.`,
        choices: [
          {
            label: `Naikkan ke ${fmt$(newSalary)} (+${Math.round(raisePct * 100)}%)`,
            coachSalary: { id: coachTarget.id, amt: newSalary },
          },
          { label: "Tolak — risiko resign", chem: -5, coachResignChance: { id: coachTarget.id, chance: clamp(raisePct * 1.5, 0.15, 0.60) } },
        ],
      });
    } else if (roll < 0.65 && fa && fb) {
      const bigger = fa.popularity > fb.popularity ? fa : fb;
      const jealous = bigger.id === fa.id ? fb : fa;
      g.inbox.unshift({
        id: uid(), type: "event", title: `${jealous.name} cemburu`,
        body: `${jealous.name} melihat ${bigger.name} dapat lebih banyak sorotan. Dia merasa tidak dihargai.`,
        choices: [
          { label: "Beri perhatian khusus", chem: 3, moraleTo: { id: jealous.id, amt: 6 } },
          { label: "Acuhkan — hasil gak pasti (+2 atau -6)", gamble: [2, -6] },
        ],
      });
    } else if (roll < 0.80 && fa && fb) {
      const viral = pick([fa, fb]);
      g.inbox.unshift({
        id: uid(), type: "event", title: `${viral.name} viral!`,
        body: `Video latihan ${viral.name} menyebar — popularity naik, tapi chemistry camp terganggu karena perhatian terbagi.`,
        choices: [
          { label: "Manfaatkan momentum", chem: -3, viralPop: viral.id },
          { label: "Redam — fokus ke tim", chem: 3 },
        ],
      });
    } else {
      // Team bonding cost scales with camp tier
      const tierCost = (CAMP_TIERS[g.campTier || 0]?.rosterCap || 4) * 750;
      g.inbox.unshift({
        id: uid(), type: "event", title: "Team bonding",
        body: `${fa.name} dan ${fb.name} akur akhir-akhir ini. ${pick(["Mereka pergi makan bersama", "Mereka latihan bareng di luar jadwal", "Mereka saling support di sesi sparring"])}.`,
        choices: [
          { label: "Biarkan saja", chem: 3 },
          { label: `Kasih bonus kegiatan tim (${fmt$(tierCost)})`, chem: 6, cash: -tierCost },
        ],
      });
    }
  }

  // ---------- fighter relationships ----------
  if (g.relationships) {
    const keys = Object.keys(g.relationships);
    keys.forEach((k) => {
      const v = g.relationships[k];
      if (v > 0) g.relationships[k] = clamp(v - 0.3, -100, 100);
      else if (v < 0) g.relationships[k] = clamp(v + 0.2, -100, 100);
    });
  }

  return true;
}
