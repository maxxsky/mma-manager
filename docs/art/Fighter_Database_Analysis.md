# Fighter Database Analysis

> Analisis data fighter untuk keperluan produksi portrait.
> Berdasarkan kode sumber (`fighter.js`, `builders.js`, `rankings.js`, `rivals.js`, `ai-fighter.js`).

---

## 1. Struktur Data Fighter (JSON)

Setiap fighter direpresentasikan sebagai object JavaScript dengan struktur berikut:

```js
{
  // ── Identitas ──
  id:            "number",     // Unique ID (uid)
  name:          "string",     // Nama depan + belakang, digenerate dari region
  region:        "string",     // Kode negara (Brazil, Russia, USA, Netherlands, Japan, Nigeria, UK, Indonesia)
  age:           "number",     // 18–31 (genFighter), bisa lebih tua via aging

  // ── Fisik & Kelas ──
  weightClass:   "string",     // Flyweight, Bantamweight, Featherweight, Lightweight, Welterweight, Middleweight, Light Heavyweight, Heavyweight
  natWeight:     "number",     // Natural weight dalam lbs (125–291)
  reach:         "number",     // Reach dalam cm (160–210, tergantung weight class)
  weightClassDelta: "number",  // Pergeseran weight class (0 = natural)

  // ── Atribut Tempur (8 skills) ──
  attrs: {
    striking:    "number 15–95",
    wrestling:   "number 15–95",
    bjj:         "number 15–95",
    footwork:    "number 15–95",
    strength:    "number 15–95",
    cardio:      "number 15–95",
    chin:        "number 15–95",
    fightIQ:     "number 15–95",
  },
  ceilings: { ... },           // Potensi maksimum per atribut (attrs[i] + 8-30, max 99)

  // ── Gaya Bertarung ──
  archetype:     "string",     // Boxer, Muay Thai, Wrestler, BJJ Specialist, All-Rounder
  traits:        "string[]",   // 0–2 trait (Iron Will, Glass Jaw, dll — 13 trait total)
  ambition:      "string",     // Belt Chaser, Paycheck, Legacy, Family Man, Grinder, Star Power

  // ── Status Camp ──
  morale:        "number 0–100",   // Default 55–80
  popularity:    "number 0–100",   // Default 0–25
  loyalty:       "number 0–100",   // Default 30–80
  overtraining:  "number 0–100",   // Default 0
  injury:        "null | { weeks, label, cost, tier, costPerWeek, permanent? }",
  booked:        "null | object",  // Jadwal fight mendatang

  // ── Karir ──
  record:        "{ w, l, ko, sub, dec }",
  titles:        "string[]",       // ["Major World Champion", ...]
  rankPoints:    "number",
  joinedWeek:    "number",
  lastFightWeek: "number",
  streakL:       "number",
  streakW:       "number",
  fightHistory:  "array",
  trainingHistory: "array",

  // ── Kontrak & Finansial ──
  agent:         "string",     // "none", "Budget", "Standard", "Power"
  contract:      "null | { managerCut, fightsLeft, fightsTotal, durationMo, signedWeek, ... }",
  asking:        "number",     // Signing bonus (exponential: ~$500–$250K)

  // ── Narrative ──
  bio:           "null | string",  // Narasi latar belakang
  careerHistory: "array",
  ambitionRevealed: "boolean",
  convincedOnce: "boolean",
  giantKills:    "number",
  milestoneFirstTitle: "boolean",
  titleDefenses: "number",
  reignHistory:  "array",
  rivalries:     "object",     // { opponentName: { count, wins, losses, lastMeetingWeek } }
}
```

---

## 2. Field untuk Identitas Visual Portrait

Field yang **sudah ada** dan relevan untuk generate portrait:

| Field | Contoh | Untuk Portrait |
|---|---|---|
| `name` | "Eko Kusuma" | Label portrait |
| `region` | "Indonesia" | Penampilan etnis, gaya rambut, warna kulit |
| `age` | 25 | Tingkat kerutan, kematuran wajah |
| `weightClass` | "Lightweight" | Proporsi tubuh (otot, lemak) |
| `natWeight` | 170 lbs | Patokan massa tubuh |
| `reach` | 180 cm | Panjang lengan, proporsi |
| `archetype` | "Boxer" | Bentuk tubuh khas (Boxer = bahu bidang, BJJ = kompak) |
| `traits` | ["Crowd Favorite"] | Ekspresi / aura (tidak langsung visual) |
| `ambition` | "Star Power" | Ekspresi percaya diri / karisma |

Field yang **belum ada** dan perlu ditambahkan untuk portrait:

| Field yang Kurang | Alasan |
|---|---|
| `appearance.gender` | Semua fighter saat ini diasumsikan pria. Perlu field eksplisit. |
| `appearance.skinTone` | Region bisa jadi petunjuk, tapi tidak akurat untuk semua etnis dalam satu negara. |
| `appearance.faceShape` | Oval, bulat, persegi, hati, diamond — variasi wajah. |
| `appearance.hairStyle` | Botak, pendek, buzz cut, cornrows, dreadlocks, slicked back, dll. |
| `appearance.hairColor` | Hitam, cokelat, pirang, merah, abu-abu (hanya warna natural). |
| `appearance.facialHair` | Clean shaven, goatee, full beard, mustache, stubble. |
| `appearance.eyeColor` | Cokelat, biru, hijau, abu-abu. |
| `appearance.physique` | Rata-rata, berotot, kurus, atletis — lebih granular dari weight class. |
| `appearance.tattoos` | Ada/tidak, posisi (dada, lengan, leher). |
| `appearance.scar` | Ada/tidak, posisi (alis, pipi, dagu). |
| `stance` | Orthodox, Southpaw, Switch. |

---

## 3. Total Fighter

### Saat New Game

| Sumber | Jumlah | Detail |
|---|---|---|
| Player roster | **2** | 1 fighter Indonesia (level 0.55) + 1 random (level 0.5) |
| Divisi (AI) | **120** | 8 weight classes × 15 fighter per divisi (level 0.8–1.5) |
| Rival camps | **~12–15** | 3 camp × 4–6 fighter per camp (level 0.35–1.2) |
| **Total** | **~134–137** | |

### Sepanjang Game

| Mekanisme | Frekuensi | Perubahan |
|---|---|---|
| AI rotation | Tiap 48 minggu | 3 fighter terbawah per divisi pensiun + 3 prospect baru |
| AI recruitment | Tiap 6–12 minggu | Rival camp scout fighter baru (jika < 8 fighter) |
| Player recruitment | Kapan saja | Via scout + sign prospect |
| Retirement | Tiap tahun | Fighter usia ≥ 40 pensiun |

---

## 4. Distribusi Berdasarkan Negara

8 region dengan probabilitas seimbang (via `pickRegion()`):

| Negara | Jumlah Awal (est.) | Archetype Dominan | Ciri Fisik (implied) |
|---|---|---|---|
| **Brazil** | ~17 | BJJ Specialist | Kulit sawo matang–cokelat, rambut hitam ikal/pendek |
| **Russia** | ~17 | Wrestler | Kulit putih, rambut cokelat/pirang pendek, tubuh kekar |
| **USA** | ~17 | Wrestler | Multi-etnis, variasi wajah tinggi, tubuh atletis |
| **Netherlands** | ~17 | Muay Thai | Kulit putih, rambut pirang/cokelat, tinggi |
| **Japan** | ~17 | All-Rounder | Kulit kuning langsat, rambut hitam lurus |
| **Nigeria** | ~17 | All-Rounder | Kulit gelap, rambut hitam pendek/cornrows, tubuh atletis |
| **UK** | ~17 | Boxer | Kulit putih–sawo matang, rambut cokelat pendek |
| **Indonesia** | ~17 | Boxer | Kulit sawo matang–cokelat, rambut hitam lurus/ikal |
| **Total** | **~136** | | |

Distribusi merata karena `pickRegion()` random seragam dari 8 region.
Player roster: 1 fighter Indonesia + 1 random.

---

## 5. Distribusi Berdasarkan Kelas Berat

8 weight classes dengan distribusi merata:

| Kelas | Batas (lbs) | Jumlah Awal | Reach Range (cm) |
|---|---|---|---|
| Flyweight | 125 | ~17 | 160–180 |
| Bantamweight | 135 | ~17 | 160–180 |
| Featherweight | 145 | ~17 | 170–190 |
| Lightweight | 155 | ~17 | 170–190 |
| Welterweight | 170 | ~17 | 180–198 |
| Middleweight | 185 | ~17 | 180–198 |
| Light Heavyweight | 205 | ~17 | 190–210 |
| Heavyweight | 265 | ~17 | 190–210 |
| **Total** | | **~136** | |

Setiap divisi memiliki 15 AI fighter + 1 champion (dari 15 tersebut).
Player roster: kelas acak (via `pick(WEIGHTS)`).

---

## 6. Archetype Distribution

| Archetype | Terkait Region | Proporsi |
|---|---|---|
| **Boxer** | UK, Indonesia | ~55% di region arch + 45% random |
| **Muay Thai** | Netherlands | Sama |
| **Wrestler** | Russia, USA | Sama |
| **BJJ Specialist** | Brazil | Sama |
| **All-Rounder** | Japan, Nigeria | Sama |

`pickArchetypeForRegion(region)` → 55% chance region native arch, 45% chance any arch.

---

## 7. Analisis Kesiapan Portrait

### Sudah Siap Digunakan:
- **Nama** → label portrait
- **Region** → penampilan etnis (cukup akurat untuk variasi kulit, rambut, fitur wajah dasar)
- **Weight class** → proporsi tubuh
- **Reach** → panjang lengan
- **Age** → kematuran wajah

### Perlu Data Tambahan untuk Variasi Visual yang Baik:

1. **Skin tone** — Region saja tidak cukup (USA multi-etnis, Brazil beragam). Perlu field `skinTone` eksplisit atau mapping region-to-skin-tone yang lebih granular.
2. **Hair style** — Semua fighter saat ini tidak punya data rambut. Padahal ini adalah elemen identitas visual paling kuat setelah wajah. Minimal 4–6 variasi per region.
3. **Hair color** — Hanya warna natural, bervariasi per region.
4. **Facial hair** — Janggut/kumis pengaruh besar ke bentuk wajah. Perlu random generation per region (misal: Russia tinggi, Japan rendah).
5. **Face shape / head shape** — Tanpa ini, portrait akan terlihat seragam.
6. **Stance** — Orthodox/Southpaw/Switch — identitas visual di poster fight.
7. **Fight shorts color** — Setiap fighter butuh warna kostum tetap untuk konsistensi.

### Rekomendasi:

Tambahkan blok data `appearance` pada setiap fighter:

```js
appearance: {
  skinTone:     "fair" | "light" | "olive" | "brown" | "dark" | "ebony",
  faceShape:    "oval" | "round" | "square" | "heart" | "diamond",
  hairStyle:    "bald" | "buzz" | "short" | "curly" | "cornrows" | "dreadlocks" | "slicked" | "mohawk",
  hairColor:    "black" | "brown" | "blonde" | "red" | "gray",
  facialHair:   "clean" | "stubble" | "goatee" | "beard" | "mustache",
  eyeColor:     "brown" | "blue" | "green" | "gray",
  physique:     "average" | "muscular" | "lean" | "athletic",
  tattoos:      "none" | "chest" | "arm" | "neck" | "fullSleeve",
  scars:        "none" | "eyebrow" | "cheek" | "chin" | "nose",
  shortsColor:  "#hex",
}
```

---

## 8. Ringkasan untuk Produksi

| Metrik | Angka |
|---|---|
| Total fighter awal | ~136 |
| Total fighter potensial (dengan AI rotation + recruitment) | ~200+ dalam 2 tahun |
| Negara | 8, distribusi merata |
| Kelas berat | 8, distribusi merata |
| Archetype | 5, dengan regional bias 55% |
| Gender | 100% pria (saat ini, tidak ada field gender) |
| Usia | 18–42 tahun |
| Prioritas portrait | Player roster (2) → Champions (8) → Ranked AI (120) → Rival camps (~15) |
| Field portrait siap pakai | name, region, age, weightClass, reach |
| Field portrait kurang | skinTone, hairStyle, hairColor, facialHair, faceShape, eyeColor, stance, shortsColor |
