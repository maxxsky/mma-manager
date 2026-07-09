export const TRAITS = {
  "Iron Will": "Morale tidak anjlok saat kalah",
  "Glass Jaw": "Chin efektif -10 di fight",
  "Iron Chin": "Chin efektif +8 di fight",
  "Natural Talent": "Training speed +15%",
  "Team Player": "Chemistry camp +1/bulan",
  Diva: "Chemistry camp -1/bulan",
  "Crowd Favorite": "Popularity naik 2x",
  Warrior: "Bonus damage saat tertinggal",
  Cautious: "Risiko cedera -15%, finish rate turun",
  Explosive: "R1 kuat, output R3 turun 15%",
  Grinder: "Gain training konsisten, tanpa plateau",
  Showboat: "Popularity +5 per finish, defense -5%",
};
export const TRAIT_KEYS = Object.keys(TRAITS);
export const TRAIT_CONFLICTS = {
  "Glass Jaw": ["Iron Chin"], "Iron Chin": ["Glass Jaw"],
  Cautious: ["Explosive"], Explosive: ["Cautious"],
  Diva: ["Team Player"], "Team Player": ["Diva"],
};

export const AMBITIONS = {
  "Belt Chaser": "Bahagia jika ranked; morale turun jika stuck unranked",
  Paycheck: "Morale naik setiap selesai fight (dibayar)",
  Legacy: "Morale naik ekstra saat mengalahkan lawan ranked",
  "Family Man": "Max 3 fight/tahun — lebih dari itu morale anjlok",
  Grinder: "Overtraining menumpuk 25% lebih lambat",
  "Star Power": "Popularity gain +50%; murung jika popularity rendah",
};
export const AMBITION_KEYS = Object.keys(AMBITIONS);
