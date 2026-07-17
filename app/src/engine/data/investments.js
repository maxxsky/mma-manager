// Legacy Investments — one-time cash sinks, efek nempel ke sistem mekanis yang udah ada.
// Harga PERKIRAAN AWAL — perlu playtest sebelum di-lock final.
export const INVESTMENTS = [
  {
    id: "youthAcademy",
    name: "Youth Academy",
    cost: 250000,
    tierReq: 2,
    desc: "Investasi ke program pembinaan usia muda. +15% peluang menemukan talenta baru dari membership.",
    effect: "+15% talent discovery chance",
  },
  {
    id: "communityOutreach",
    name: "Community Outreach Program",
    cost: 400000,
    tierReq: 2,
    desc: "Bangun hubungan komunitas lokal. +10% revenue membership permanen.",
    effect: "+10% membership revenue",
  },
  {
    id: "alumniNetwork",
    name: "Alumni Coaching Network",
    cost: 600000,
    tierReq: 3,
    desc: "Jaringan alumni fighter jadi rujukan coach berkualitas. Coach market seolah reputasi +15.",
    effect: "Coach market rep+15",
  },
  {
    id: "legacyMuseum",
    name: "Fight Legacy Museum",
    cost: 800000,
    legacyReq: 5000,
    desc: "Museum yang merayakan sejarah camp. Murni kosmetik — tidak menambah legacy score.",
    effect: "Kosmetik — banner Dynasty tab",
  },
];
