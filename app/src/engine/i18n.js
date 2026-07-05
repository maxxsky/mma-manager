// ============================================================
//   i18n — Full Indonesian + English strings
//   Usage: import { t } from "./i18n.js";  t("ATTR.striking")
//   Language stored in: localStorage["mma-lang"]
// ============================================================

export function getLang() {
  try { return localStorage.getItem("mma-lang") || "id"; } catch { return "id"; }
}

export function setLang(l) {
  try { localStorage.setItem("mma-lang", l); } catch {}
}

const EN = {
  // ---- ATTRS ----
  "ATTR.striking": "Striking", "ATTR.wrestling": "Wrestling", "ATTR.bjj": "BJJ",
  "ATTR.footwork": "Footwork", "ATTR.strength": "Strength", "ATTR.cardio": "Cardio",
  "ATTR.chin": "Chin", "ATTR.fightIQ": "Fight IQ",
  // ---- WEIGHTS ----
  "WEIGHT.Flyweight": "Flyweight", "WEIGHT.Bantamweight": "Bantamweight",
  "WEIGHT.Featherweight": "Featherweight", "WEIGHT.Lightweight": "Lightweight",
  "WEIGHT.Welterweight": "Welterweight", "WEIGHT.Middleweight": "Middleweight",
  "WEIGHT.LightHeavyweight": "Light Heavyweight", "WEIGHT.Heavyweight": "Heavyweight",
  // ---- ARCHETYPES ----
  "ARCH.Boxer": "Boxer", "ARCH.Muay Thai": "Muay Thai", "ARCH.Wrestler": "Wrestler",
  "ARCH.BJJ Specialist": "BJJ Specialist", "ARCH.All-Rounder": "All-Rounder",
  // ---- TRAINING ----
  "TRAIN.striking": "Striking", "TRAIN.grappling": "Grappling",
  "TRAIN.conditioning": "S&C", "TRAIN.sparring": "Sparring",
  "TRAIN.recovery": "Recovery", "TRAIN.fightcamp": "Fight Camp",
  "TRAIN.content": "📱 Content",
  // ---- INTENSITY ----
  "INTENS.Light": "Light", "INTENS.Medium": "Medium", "INTENS.Hard": "Hard",
  // ---- TRAITS ----
  "TRAIT.Iron Will": "Iron Will",
  "TRAIT.Glass Jaw": "Glass Jaw",
  "TRAIT.Iron Chin": "Iron Chin",
  "TRAIT.Natural Talent": "Natural Talent",
  "TRAIT.Team Player": "Team Player",
  "TRAIT.Diva": "Diva",
  "TRAIT.Crowd Favorite": "Crowd Favorite",
  "TRAIT.Warrior": "Warrior",
  "TRAIT.Cautious": "Cautious",
  "TRAIT.Explosive": "Explosive",
  "TRAIT.Grinder": "Grinder",
  "TRAIT.Showboat": "Showboat",
  // ---- AMBITIONS ----
  "AMB.Belt Chaser": "Belt Chaser",
  "AMB.Paycheck": "Paycheck",
  "AMB.Legacy": "Legacy",
  "AMB.Family Man": "Family Man",
  "AMB.Grinder": "Grinder",
  "AMB.Star Power": "Star Power",
  // ---- AGENT ----
  "AGENT.none": "No Agent",
  "AGENT.Budget": "Budget Agent",
  "AGENT.Standard": "Standard Agent",
  "AGENT.Power": "Power Agent",
  // ---- TIERS ----
  "TIER.Prospect": "Prospect", "TIER.Pro": "Pro",
  "TIER.Main Card": "Main Card", "TIER.Elite": "Elite",
  "TIER.0": "Local Gym", "TIER.1": "Regional Camp",
  "TIER.2": "National Center", "TIER.3": "Elite MMA Factory",
  "TIER.4": "World-Class Institute",
  // ---- PROMO ----
  "PROMO.Local": "Local", "PROMO.Regional": "Regional",
  "PROMO.National": "National", "PROMO.Major": "Major",
  "PROMO.Premier": "Premier",
  // ---- FACILITIES ----
  "FAC.mats": "Training Mats", "FAC.ring": "Boxing Ring",
  "FAC.weights": "Weight Room", "FAC.medical": "Medical Room",
  // ---- MISC UI ----
  "UI.bank": "Bank", "UI.camp": "Camp", "UI.roster": "Roster",
  "UI.rank": "Rank", "UI.scout": "Scout", "UI.inbox": "Inbox",
  "UI.staff": "Staff", "UI.rival": "Rival",
  "UI.week": "Week", "UI.month": "Month", "UI.year": "Year",
  "UI.morale": "Morale", "UI.popularity": "Popularity",
  "UI.overtraining": "Overtraining", "UI.reputation": "Reputation",
  "UI.chemistry": "Chemistry", "UI.legacy": "Legacy",
  "UI.cashflow": "Cash Flow", "UI.income": "Income", "UI.expense": "Expense",
  "UI.fightSchedule": "Fight Schedule", "UI.campFeed": "Camp Feed",
  "UI.selectClass": "Weight Class:",
  "UI.accept": "Accept", "UI.reject": "Reject", "UI.cancel": "Cancel",
  "UI.send": "Send", "UI.hire": "Hire", "UI.fire": "Fire",
  "UI.upgrade": "Upgrade", "UI.buyback": "Buy-back",
  "UI.endContract": "End Contract",
  "UI.viewMode": "View:", "UI.tick": "Tick-by-Tick",
  "UI.summary": "Round Summary", "UI.skip": "Skip to Result",
  "UI.ringBell": "🔔 Ring the Bell",
  // ---- TIER DESCRIPTIONS ----
  "TIER.desc0": "Small local gym. Limited upgrades.",
  "TIER.desc1": "Well-known regional camp. More capacity & coaches.",
  "TIER.desc2": "National training center. Premium facilities.",
  "TIER.desc3": "World-class factory. Auto-scout per month.",
  "TIER.desc4": "MMA Institute — peak of the industry. Full facility unlock.",
  // ---- INJURY ----
  "INJURY.0": "🚑 Minor", "INJURY.1": "⚕️ Moderate",
  "INJURY.2": "🆘 Serious", "INJURY.3": "💀 Career-Threatening",
  // ---- SPONSOR ----
  "SPONSOR.placement": "Placement Fee", "SPONSOR.royalty": "Royalty",
  "SPONSOR.noSponsor": "No sponsors yet — advance weeks to receive offers from brands (based on camp reputation). Max 3 active sponsors.",
  // ---- INVESTOR ----
  "INVESTOR.Angel": "Angel", "INVESTOR.Venture": "Venture",
  "INVESTOR.Private Equity": "Private Equity",
  // ---- EXTERNAL PARTNER ----
  "PARTNER.Local": "Local Partner", "PARTNER.Regular": "Regular Partner",
  "PARTNER.Pro": "Pro Partner", "PARTNER.Elite": "Elite Partner",
  // ---- SPECIALISATION ----
  "SPEC.Striking Factory": "Striking Factory",
  "SPEC.Wrestling Hub": "Wrestling Hub",
  "SPEC.BJJ Academy": "BJJ Academy",
  "SPEC.Prospect Mill": "Prospect Mill",
  "SPEC.Elite Stable": "Elite Stable",
  // ---- GAME PLANS ----
  "PLAN.Take It Down": "Take It Down",
  "PLAN.Keep It Standing": "Keep It Standing",
  "PLAN.Finish It": "Finish It",
  "PLAN.Survive & Outpoint": "Survive & Outpoint",
  // ---- ATTITUDE ----
  "ATTI.Respectful": "Respectful", "ATTI.Professional": "Professional",
  "ATTI.Trash Talk": "Trash Talk",
  // ---- BUTTONS ----
  "BTN.advance": "▶ Week",
  "BTN.upgradeTo": "Upgrade to",
  "BTN.resetGame": "Reset Game & Start New",
  "BTN.confirmReset": "Confirm — Delete All",
  // ---- LANGUAGE ----
  "LANG.en": "English", "LANG.id": "Bahasa Indonesia",
};

const ID = {
  "ATTR.striking": "Pukulan", "ATTR.wrestling": "Gulat", "ATTR.bjj": "BJJ",
  "ATTR.footwork": "Footwork", "ATTR.strength": "Kekuatan", "ATTR.cardio": "Cardio",
  "ATTR.chin": "Dagu", "ATTR.fightIQ": "IQ Tarung",
  "WEIGHT.Flyweight": "Flyweight", "WEIGHT.Bantamweight": "Bantamweight",
  "WEIGHT.Featherweight": "Featherweight", "WEIGHT.Lightweight": "Lightweight",
  "WEIGHT.Welterweight": "Welterweight", "WEIGHT.Middleweight": "Middleweight",
  "WEIGHT.LightHeavyweight": "Light Heavyweight", "WEIGHT.Heavyweight": "Heavyweight",
  "ARCH.Boxer": "Petinju", "ARCH.Muay Thai": "Muay Thai", "ARCH.Wrestler": "Pegulat",
  "ARCH.BJJ Specialist": "Spesialis BJJ", "ARCH.All-Rounder": "Serba Bisa",
  "TRAIN.striking": "Pukulan", "TRAIN.grappling": "Gulat",
  "TRAIN.conditioning": "S&C", "TRAIN.sparring": "Sparring",
  "TRAIN.recovery": "Pemulihan", "TRAIN.fightcamp": "Fight Camp",
  "TRAIN.content": "📱 Konten",
  "INTENS.Light": "Ringan", "INTENS.Medium": "Sedang", "INTENS.Hard": "Berat",
  "TRAIT.Iron Will": "Tekad Baja",
  "TRAIT.Glass Jaw": "Dagu Kaca",
  "TRAIT.Iron Chin": "Dagu Besi",
  "TRAIT.Natural Talent": "Bakat Alami",
  "TRAIT.Team Player": "Pemain Tim",
  "TRAIT.Diva": "Diva",
  "TRAIT.Crowd Favorite": "Favorit Penonton",
  "TRAIT.Warrior": "Prajurit",
  "TRAIT.Cautious": "Hati-hati",
  "TRAIT.Explosive": "Eksplosif",
  "TRAIT.Grinder": "Penggiling",
  "TRAIT.Showboat": "Pamer",
  "AMB.Belt Chaser": "Pemburu Sabuk",
  "AMB.Paycheck": "Gaji",
  "AMB.Legacy": "Warisan",
  "AMB.Family Man": "Keluarga",
  "AMB.Grinder": "Penggiling",
  "AMB.Star Power": "Kekuatan Bintang",
  "AGENT.none": "Tanpa Agen",
  "AGENT.Budget": "Agen Budget",
  "AGENT.Standard": "Agen Standar",
  "AGENT.Power": "Agen Besar",
  "TIER.Prospect": "Prospek", "TIER.Pro": "Pro",
  "TIER.Main Card": "Kartu Utama", "TIER.Elite": "Elit",
  "TIER.0": "Gym Lokal", "TIER.1": "Camp Regional",
  "TIER.2": "Pusat Nasional", "TIER.3": "Pabrik Elit MMA",
  "TIER.4": "Institut Kelas Dunia",
  "PROMO.Local": "Lokal", "PROMO.Regional": "Regional",
  "PROMO.National": "Nasional", "PROMO.Major": "Utama",
  "PROMO.Premier": "Premier",
  "FAC.mats": "Matras Latihan", "FAC.ring": "Ring Tinju",
  "FAC.weights": "Ruang Beban", "FAC.medical": "Ruang Medis",
  "UI.bank": "Bank", "UI.camp": "Camp", "UI.roster": "Roster",
  "UI.rank": "Peringkat", "UI.scout": "Pencari", "UI.inbox": "Kotak Masuk",
  "UI.staff": "Staf", "UI.rival": "Saingan",
  "UI.week": "Minggu", "UI.month": "Bulan", "UI.year": "Tahun",
  "UI.morale": "Moral", "UI.popularity": "Popularitas",
  "UI.overtraining": "Latihan Berlebih", "UI.reputation": "Reputasi",
  "UI.chemistry": "Kimia", "UI.legacy": "Warisan",
  "UI.cashflow": "Arus Kas", "UI.income": "Pemasukan", "UI.expense": "Pengeluaran",
  "UI.fightSchedule": "Jadwal Tarung", "UI.campFeed": "Berita Camp",
  "UI.selectClass": "Kelas:",
  "UI.accept": "Terima", "UI.reject": "Tolak", "UI.cancel": "Batal",
  "UI.send": "Kirim", "UI.hire": "Rekrut", "UI.fire": "Pecat",
  "UI.upgrade": "Upgrade", "UI.buyback": "Beli Kembali",
  "UI.endContract": "Akhiri Kontrak",
  "UI.viewMode": "Tampilan:", "UI.tick": "Detik-detik",
  "UI.summary": "Ringkasan", "UI.skip": "Langsung Hasil",
  "UI.ringBell": "🔔 Bunyikan Bel",
  "TIER.desc0": "Gym kecil lingkungan. Upgrade terbatas.",
  "TIER.desc1": "Camp terkenal secara regional. Kapasitas & pelatih naik.",
  "TIER.desc2": "Pusat latihan nasional. Fasilitas premium.",
  "TIER.desc3": "Pabrik kelas dunia. Pencarian bakat otomatis.",
  "TIER.desc4": "Institut MMA — puncak industri. Fasilitas penuh.",
  "INJURY.0": "🚑 Ringan", "INJURY.1": "⚕️ Sedang",
  "INJURY.2": "🆘 Serius", "INJURY.3": "💀 Ancaman Karir",
  "SPONSOR.placement": "Biaya Penempatan", "SPONSOR.royalty": "Royalti",
  "SPONSOR.noSponsor": "Belum ada sponsor — majukan minggu untuk menerima tawaran (berdasarkan reputasi camp). Maks 3 sponsor aktif.",
  "INVESTOR.Angel": "Malaikat", "INVESTOR.Venture": "Venture",
  "INVESTOR.Private Equity": "Ekuitas Swasta",
  "PARTNER.Local": "Partner Lokal", "PARTNER.Regular": "Partner Reguler",
  "PARTNER.Pro": "Partner Pro", "PARTNER.Elite": "Partner Elit",
  "SPEC.Striking Factory": "Pabrik Pukulan",
  "SPEC.Wrestling Hub": "Pusat Gulat",
  "SPEC.BJJ Academy": "Akademi BJJ",
  "SPEC.Prospect Mill": "Penggiling Prospek",
  "SPEC.Elite Stable": "Kandang Elit",
  "PLAN.Take It Down": "Bawa ke Bawah",
  "PLAN.Keep It Standing": "Jaga Berdiri",
  "PLAN.Finish It": "Selesaikan",
  "PLAN.Survive & Outpoint": "Bertahan & Poin",
  "ATTI.Respectful": "Hormat", "ATTI.Professional": "Profesional",
  "ATTI.Trash Talk": "Caci Maki",
  "BTN.advance": "▶ Minggu",
  "BTN.upgradeTo": "Upgrade ke",
  "BTN.resetGame": "Hapus Save & Mulai Baru",
  "BTN.confirmReset": "Yakin — Hapus Semua",
  "LANG.en": "English", "LANG.id": "Bahasa Indonesia",
};

// Fallback: if a key is missing in the chosen language, try EN
export function t(key, lang) {
  const l = lang || getLang();
  const dict = l === "id" ? ID : EN;
  if (dict[key] !== undefined) return dict[key];
  if (EN[key] !== undefined) return EN[key];
  return key;
}
