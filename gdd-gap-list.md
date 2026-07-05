# Gap List — GDD v3 vs Implementasi Saat Ini

Catatan cara kerja dokumen ini: setiap baris di bawah kucek langsung ke file kode
(`mma-manager.jsx`, grep per keyword + baca ulang blok terkait), bukan dari ingatanku
soal apa yang pernah kukerjakan. Kalau aku tidak yakin suatu sistem ada/tidak ada,
kutulis eksplisit "perlu dicek lagi" — jangan anggap semua baris di sini 100% presisi
tanpa kamu coba sendiri di game, karena aku tidak menjalankan playtest penuh.

Legenda:
- ❌ Tidak ada sama sekali (terkonfirmasi 0 referensi di kode)
- 🟡 Ada sebagian / disederhanakan dari spek GDD
- ✅ Ada dan tampak sesuai spek (belum tentu ter-balance)

---

## Sec 3 — Weight Class & Fighting Weight

- 🟡 Weight class & fighting weight ada (Sec 3.1–3.2)
- 🟡 Weight cutting: ada penalti stamina di weigh-in (Sec 3.3), tapi:
  - ❌ Tidak ada drama **miss weight** (percobaan kedua, catchweight, fight cancelled)
  - ❌ Tidak ada mekanik **naik/turun kelas** sebagai keputusan player
  - Catatan: kamu sempat bilang tidak mau weight cutting ditambah lebih dalam — ini
    kucatat sebagai keputusan sadar, bukan sekadar terlewat.

## Sec 4 — Camp System

- ✅ Reputation, Chemistry ada dan mekanis (mempengaruhi training & event)
- ❌ **Facilities sebagai tier L1–L5 dengan capacity/unlock camp progression** (Sec 4.2)
  belum ada — yang ada cuma facility per kategori (mats/ring/weights/medical) upgrade
  linear, tanpa tier "Local Gym → Elite MMA Factory" dan tanpa cap jumlah fighter yang naik
- ❌ **Camp Specialization Tag** (Striking Factory, BJJ Academy, dll — Sec 4.4) sama sekali
  tidak ada
- 🟡 Chemistry event ada tapi baru 1 jenis (konflik sparring). GDD punya 4+ variasi
  (coach minta naik gaji, fighter cemburu ke fighter lain yang dapat offer besar, video viral)
- 🟡 Coach personality x fighter trait compatibility (Sec 4.5) — coach punya `spec` dan
  `skill`, tapi **tidak ada** field `personality` (Motivator/Technician/Disciplinarian/
  Player's Coach) atau bonus compatibility dengan trait fighter

## Sec 5 — Fighter System

- ✅ Personality traits (2 per fighter) — mekanis
- ✅ Fighter Ambitions — baru ditambahkan, mekanis (morale hooks)
- ✅ Aging & retirement — ada, termasuk event pensiun 3 pilihan
- ❌ **Fighter Relationships / relationship matrix antar fighter** (Sec 5.5) — 0 referensi
  di kode. Tidak ada efek sparring lebih efektif karena relasi positif, tidak ada
  drama "cemburu karena satu lebih sukses", dsb.

## Sec 6 — Scouting

- ✅ Scout method + grade (C/B/A/S) + report dengan estimasi yang bisa meleset — ada
- ❌ **Regional specialties sebagai flavor eksplisit** (Sec 6.3) — region memang
  mempengaruhi archetype fighter yang digenerate, tapi tidak ditampilkan sebagai
  info scouting yang bisa dibaca player secara eksplisit di UI

## Sec 7 — Training

- ✅ Training activities, overtraining meter, attribute ceiling & diminishing returns — ada
- ✅ Fight Camp game plan selector — ada
- ❌ **Sparring Network** (Sec 7.2): kualitas sparring partner (intra-camp vs external,
  archetype compatibility, partner level vs fighter level) — tidak ada. Intensitas
  training (Light/Medium/Hard) ada, tapi ini beda konsep dari sparring partner quality

## Sec 8 — Contract System

- 🟡 Baru saja ditambahkan: kontrak (manager cut, fight commitment, durasi, signing
  bonus), agent tier (Budget/Standard/Power), negosiasi, lifecycle (fight commitment
  habis → free agent), renegotiation trigger (Top 10 / Diva)
- ❌ **Exclusivity** (exclusive vs multi-promo) — tidak ada
- ❌ **Rematch clause** — tidak ada
- ❌ **Medical coverage sebagai variabel kontrak** — tidak ada (biaya medis selalu
  otomatis dipotong dari cash camp, tidak ada opsi Yes/No/Partial)
- ❌ **Camp equity** sebagai lever negosiasi — tidak ada
- Catatan jujur: sistem kontrak ini paling baru kutambahkan dan **belum ada laporan
  playtest darimu** soal apakah lifecycle-nya (fightsLeft berkurang, event extend
  muncul) benar-benar berjalan mulus di gameplay nyata. Aku sudah smoke-test logika
  intinya di luar React dan tidak menemukan error, tapi itu bukan pengganti kamu
  benar-benar memainkannya beberapa bulan in-game.

## Sec 9 — Economy

- ✅ Revenue (manager cut, training fee, sponsor) & expense dasar — ada
- ❌ **Financial Tools** (Sec 9.5): Bank Loan, Investor (trade equity), Emergency Sale
  — 0 referensi di kode, sama sekali belum ada

## Sec 10 — Promoter & Event Offer

- ✅ Promoter tier (Local/Regional/National/Major/Premier — meski Premier belum
  benar-benar terpisah dari Major di kode, perlu dicek lagi apakah keduanya
  sudah dibedakan atau digabung)
- ❌ **Promoter Relationship Score** (Sec 10.3) — 0 referensi di kode. Accept/reject
  offer sekarang tidak mempengaruhi hubungan jangka panjang dengan promotor
  manapun; setiap offer independen
- ❌ **Counter offer** (minta purse lebih besar / lebih banyak waktu persiapan) —
  tidak ada, cuma Accept/Reject

## Sec 11 — Fight Night

- ✅ Weigh-in (dengan cut penalty), game plan selector, corner decisions dengan
  timer, hasil fight — ada dan ini yang paling detail dikerjakan
- ❌ **Staredown & Press Conference** (pilih attitude Respectful/Professional/Trash
  Talk) — tidak ada
- ❌ **Doctor stoppage mid-fight** (cek cut/injury antar ronde, opsi continue/retire)
  — tidak ada. Cedera post-fight ada, tapi bukan keputusan real-time saat fight
- ❌ **Fight viewing mode** (Tick-by-Tick / Round Summary / Skip to Result) — hanya
  ada 1 mode (semacam round summary), tidak ada pilihan mode

## Sec 12 — Championship & Title

- 🟡 Title hierarchy 3 tingkat (Regional/National/Major) — baru diperketat supaya
  berjenjang. Ranking 1-15 per divisi ada dan mekanis.
- ❌ **Minor World Title** (tingkat ke-4 antara National dan Major, level
  Bellator/ONE) — dilewati, hanya 3 tingkat bukan 4
- ❌ **Interim title** (saat champion cedera 3+ bulan) — tidak ada

## Sec 13 — Reputation

- ✅ Rep unlock table sebagian (coach slot bertambah, scout grade naik) — ada
- 🟡 Rep unlock lain dari tabel GDD 13.2 (mis. Video Analysis Room di rep 60,
  Level 3 facilities di rep 70) — perlu dicek lagi apakah semua unlock spesifik
  itu benar-benar terhubung ke rep threshold di kode, atau baru sebagian

## Sec 14 — Rival Camp

- ❌ **Seluruhnya tidak ada.** 0 referensi ke "rival" di kode. Tidak ada AI camp
  lain, tidak ada scouting war, tidak ada coach/fighter poaching dari rival,
  tidak ada kolaborasi joint training.

## Sec 15 — Media & Popularity

- ✅ Popularity tiers & fighter sponsor formula dasar — ada
- ❌ **Sponsor negotiable** (placement fee vs royalty, tipe brand Apparel/
  Supplement/Tech) — tidak ada, sponsor sekarang otomatis lewat formula tanpa
  keputusan player
- ❌ **Content creation weekly** (popularity +2, cost training time) — tidak ada
  sebagai opsi aktivitas

## Sec 16 — Injury

- 🟡 Ada 2 tier (ringan/sedang) dari 4 tier di GDD (Minor/Moderate/Serious/
  Career-Threatening)
- ❌ **Career-threatening injury** dengan risiko retirement — tidak ada
- ❌ **Permanent attribute reduction** setelah 3+ cedera area sama — tidak ada
- ❌ **Trait "Injury Prone"** setelah 4+ cedera serius — tidak ada

## Sec 17 — Win Conditions & Legacy

- 🟡 Win condition Gold ("World Class") — ada
- ❌ Bronze, Silver, Platinum, GOAT — tidak ada, hanya 1 dari 5 tingkat
- ✅ Legacy Score — ada dan terakumulasi

## Sistem lintas-GDD yang juga belum ada

- ❌ Fighter request lain di luar release (mis. "request more fights", "request
  weight class change", "complain about camp conditions" — Sec 8.4) — hanya
  release yang ada
- ❌ Coach poaching oleh rival (Sec 14.2) — terkait rival camp yang belum ada
- ❌ Open Gym Days, Partner Camp Fee sebagai sumber income (Sec 9.2) — tidak ada

---

## Ringkasan prioritas (perkiraanku, bukan fakta baku)

Kalau harus kuurutkan mana yang paling mengubah rasa main berikutnya, ini
perkiraan subjektifku — bukan hasil pengukuran, jadi anggap sebagai saran,
bukan kesimpulan pasti:

1. **Rival Camp** — paling besar dampaknya ke rasa "dunia hidup", dan paling
   jelas 0% dikerjakan
2. **Promoter Relationship Score** — melengkapi sistem offer yang sudah ada,
   effort sedang
3. **Financial Tools (loan/investor)** — relevan kalau kamu ingin tekanan
   finansial jadi lebih strategis, bukan cuma "kalah = bangkrut"
4. **Career-threatening injury + permanent decline** — menambah taruhan nyata
   ke setiap fight, effort kecil-sedang karena sistem injury dasar sudah ada

Aku tidak tahu mana yang paling penting buatmu — itu murni pilihanmu, bukan
sesuatu yang bisa kutentukan dari GDD saja.
