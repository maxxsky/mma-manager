// Fighter archetypes and regions
export const ARCHETYPES = {
  Boxer: { striking: 1.22, footwork: 1.18, wrestling: 1.05, bjj: 0.80 },
  "Muay Thai": { striking: 1.08, bjj: 0.80, wrestling: 0.95, footwork: 1.00, clinch: 1.15, cardio: 0.90 },
  "Wrestler": { wrestling: 1.18, strength: 1.00, striking: 0.75, bjj: 0.90, footwork: 0.80, cardio: 0.97 },
  "BJJ Specialist": { bjj: 1.15, wrestling: 1.05, striking: 0.70, footwork: 0.80, fightIQ: 1.05 },
  "All-Rounder": { fightIQ: 1.10, striking: 1.00, wrestling: 1.00, bjj: 1.00 },
};
export const ARCH_COLOR = {
  Boxer: "#e14b44", "Muay Thai": "#e88a3a", Wrestler: "#3f8fd4",
  "BJJ Specialist": "#9a6ae0", "All-Rounder": "#57b56b",
};
// Region accent colors — used for Mono monogram dot
export const REGION_COLOR = {
  Brazil: "#4ecdc4", Russia: "#e74c3c", USA: "#3498db",
  Netherlands: "#f39c12", Japan: "#e91e63", Nigeria: "#2ecc71",
  UK: "#9b59b6", Indonesia: "#f1c40f",
};
export const REGIONS = {
  Brazil: { arch: "BJJ Specialist", first: ["Carlos","Thiago","Rafael","Gilberto","Marcio","Renan","Fabio","Lucas","Pedro","Andre","Diego","Bruno"], last: ["Silva","Oliveira","Souza","Costa","Barbosa","Lima","Ferreira","Pereira","Almeida","Santos","Carvalho","Nascimento"] },
  Russia: { arch: "Wrestler", first: ["Dmitri","Islam","Magomed","Sergei","Anatoly","Zaur","Alexei","Viktor","Nikolai","Artem","Yuri","Ruslan"], last: ["Volkov","Petrov","Nurmagov","Ivanov","Gadzhiev","Orlov","Fedorov","Morozov","Sokolov","Kovalev","Kozlov","Medvedev"] },
  USA: { arch: "Wrestler", first: ["Marcus","Tyler","Deshawn","Cody","Brandon","Jake","Derek","Chris","Ryan","Justin","Kevin","Andre"], last: ["Johnson","Miller","Carter","Reyes","Brooks","Hall","Davis","Wilson","Thompson","Anderson","Garcia","Martinez"] },
  Netherlands: { arch: "Muay Thai", first: ["Rico","Jasper","Melvin","Daan","Sem","Bram","Lars","Thijs","Kevin","Niels","Stefan","Marco"], last: ["Verhoeven","de Vries","Bakker","Visser","Smit","Mulder","Jansen","Dekker","Groot","Vos","Bos","Willems"] },
  Japan: { arch: "All-Rounder", first: ["Kenta","Ryo","Takeshi","Yuki","Shinya","Kaito","Hiroshi","Kenji","Taro","Shun","Masa","Sota"], last: ["Sato","Tanaka","Yamamoto","Kobayashi","Aoki","Mori","Watanabe","Suzuki","Ito","Takahashi","Nakamura","Shimizu"] },
  Nigeria: { arch: "All-Rounder", first: ["Kamaru","Chidi","Israel","Emeka","Tobi","Sodiq","Babatunde","Oluwaseun","Chibueze","Ndubuisi","Adebayo","Ikechukwu"], last: ["Adesanya","Okafor","Usman","Balogun","Eze","Ade","Olawale","Nnamdi","Obi","Onyeka","Afolabi","Akintola"] },
  UK: { arch: "Boxer", first: ["Liam","Callum","Darren","Owen","Reece","Kieran","Connor","Scott","Jamie","Lewis","Aaron","Gareth"], last: ["Edwards","Till","Pearson","Aspinall","Wood","Hardy","Thompson","Walker","Clark","Wright","Mitchell","Collins"] },
  Indonesia: { arch: "Boxer", first: ["Bima","Raka","Dimas","Agus","Yoga","Rizky","Andi","Bayu","Eko","Fajar","Hendra","Irfan"], last: ["Saputra","Wijaya","Pratama","Santoso","Hidayat","Nugroho","Siregar","Susanto","Halim","Gunawan","Setiawan","Kusuma"] },
};
