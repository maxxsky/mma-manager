import { RI, pick, uid } from "../rng.js";

export const STAFF_ROLES = {
  cutman: { id: "cutman", label: "Cutman", icon: "🩹", desc: "Kurangi risiko cut & knockdown lewat penanganan yang lebih baik." },
  nutritionist: { id: "nutritionist", label: "Nutritionist", icon: "🥗", desc: "Kurangi risiko gagal timbang & penalti cutting berat badan." },
  sportsPsych: { id: "sportsPsych", label: "Sports Psychologist", icon: "🧠", desc: "Redam morale loss abis kalah & overtraining." },
};

const STAFF_NAMES = [
  "L. Fontaine", "D. Osei", "R. Vasquez", "N. Lindqvist", "H. Tanaka",
  "C. Moreau", "P. Adeyemi", "E. Novak", "W. Santos", "I. Kowalski",
];

// skill 2-9, gated sesuai rep camp — sama pola kayak genCoach()
export function genStaffCandidate(role, rep) {
  const maxSkill = rep != null ? Math.min(Math.max(3 + Math.floor(rep / 10), 3), 9) : 9;
  const skill = RI(2, maxSkill);
  return {
    id: uid(), role, name: pick(STAFF_NAMES),
    skill, salary: skill * RI(1000, 1600),
  };
}
