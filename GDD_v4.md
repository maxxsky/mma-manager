# 🥊 MMA Manager — Game Design Document (GDD) v4

> **Genre:** Sports Management Simulation
> **Perspective:** Camp/Gym Owner & Head Manager
> **Inspiration:** Football Manager (depth) + Punch Club (progression) + Top Eleven (online/live-match model)
> **Status:** v4 — Consolidation + Multiplayer-Ready Roadmap
> **Supersedes:** GDD v3 (2026-06-16)
> **Updated:** 2026-07-05

---

## CATATAN CARA BACA DOKUMEN INI (penting)

Dokumen ini disusun sebagai **blueprint & roadmap**, bukan laporan status yang
sudah terverifikasi playtest. Beberapa hal yang perlu kamu tahu soal keterbatasan
dokumen ini supaya tidak menyesatkan:

- **Status implementasi di bawah adalah perkiraan berdasarkan pembacaan kode**, bukan
  hasil memainkan game. Saya (Claude) mengaudit `App.jsx` versi Mateo dengan cara: baca
  definisi fungsi, telusuri isi `tick()`, cek build lolos tanpa error sintaks. Yang
  saya **tidak** lakukan: memainkan game, memverifikasi tiap fitur berjalan sesuai
  maksud, atau menilai balancing. Jadi label "✅ sudah ada" di sini berarti
  **"ada sebagai kode yang terkompilasi"**, bukan "terbukti berfungsi & seimbang".
- **Bug & balancing sengaja tidak dibahas di dokumen ini** — sesuai keputusanmu, itu
  kamu tangani lewat main langsung.
- **Rekomendasi stack multiplayer adalah perkiraan berdasarkan pengetahuan umum
  arsitektur**, bukan dari sumber yang baru diverifikasi. Versi software berubah cepat;
  sebelum Mateo mulai, sebaiknya cek versi terbaru tiap tool. Saya tandai bagian yang
  perlu diverifikasi.
- **Peran saya di sini: planner/blueprint saja.** Implementasi single-player lanjutan
  dan seluruh multiplayer akan dikerjakan Mateo. Saya tidak bisa deploy/menjalankan
  server, dan tidak bisa mengakses/mengubah file di laptopmu.

---

## 0. STATUS IMPLEMENTASI SAAT INI (hasil audit kode Mateo, 2026-07-05)

Basis kode: `app/src/App.jsx`, ±2429 baris, proyek **Vite + React 18** (murni frontend,
0 jejak backend). Berikut peta status per sistem GDD v3. Legenda:

- ✅ = ada sebagai implementasi kode (fungsi + dipanggil di game loop). **Bukan** jaminan bebas bug / seimbang.
- 🟡 = ada sebagian / tampak tipis / perlu dicek kedalamannya
- ❌ = tidak ditemukan referensi di kode
- ❓ = ada referensi tapi saya belum yakin apakah benar-benar berfungsi penuh (perlu Mateo/kamu konfirmasi)

| GDD Sec | Sistem | Status | Catatan audit |
|---|---|---|---|
| 3 | Weight class & fighting weight | ✅ | Ada |
| 3.3 | Weight cutting + miss weight + catchweight | ✅ | `catchweight`/`miss weight` muncul di kode |
| 3 | Pindah kelas sebagai keputusan pemain | ❌ | 0 referensi — kandidat penyempurnaan |
| 4 | Camp reputation, chemistry | ✅ | Mekanis |
| 4.2 | Camp progression tier (Local Gym→Elite Factory) | 🟡 | Ada `CAMP_TIERS` — perlu cek apakah cap kapasitas & unlock aktif |
| 4.4 | Camp specialization tag | ✅ | `campTag` + `RIVAL_TRAITS` dipakai |
| 4.5 | Coach personality × trait compatibility | ✅ | `COACH_PERSONALITIES` ada |
| 5.2 | Personality traits | ✅ | Mekanis |
| 5.3 | Fighter ambitions | ✅ | Mekanis |
| 5.4 | Aging, chin decay, retirement, convert-to-coach | ✅ | Ada |
| 5.5 | Fighter relationship matrix | ✅ | `relKey`/`getRel`/`addRel` + decay di tick() |
| 6 | Scouting bergrade C/B/A/S | ✅ | Ada |
| 7.2 | Sparring network / quality | 🟡 | Ada `sparringMult` sederhana (jumlah fighter) — belum sekaya spek GDD (archetype match, external partner) |
| 7.4 | Overtraining | ✅ | Ada |
| 7.5 | Attribute ceiling & diminishing returns | ✅ | Ada |
| 7.6 | Fight camp game plan | ✅ | Ada |
| 8 | Kontrak (cut, commitment, durasi, signing) | ✅ | Ada + `NegotiateModal` |
| 8.3 | Agent tiers | ✅ | `AGENT_TYPES`, `agentFor()` |
| 8.4 | Fighter requests (release, dll) | 🟡 | Sebagian — perlu cek variasi request |
| 9.5 | Financial: loan | ✅ | `g.loan` + cicilan di tick() |
| 9.5 | Financial: investor | ❓ | Perlu cek — "investor" muncul tapi belum saya konfirmasi berfungsi |
| 9.5 | Emergency sale facility | ❓ | Perlu cek |
| 10.3 | Promoter relationship score | ✅ | `initPromoterRel()` |
| 10.4 | Counter offer | ❓ | Perlu cek |
| 11.1 | Weigh-in | ✅ | Ada |
| 11.1 | Press conference / trash talk / staredown | ✅ | Referensi ada |
| 11.2 | Corner decisions + timer | ✅ | Ada |
| 11.2 | Doctor stoppage | ✅ | Referensi ada |
| 11.3 | Fight viewing mode (3 mode) | ❓ | 3 referensi — perlu cek apakah beneran ada pilihan mode atau cuma 1 |
| 12 | Ranking 1-15 + title ladder | ✅ | Ada |
| 12.1 | Interim title | ✅ | Ada di tick() (champion cedera 8+ mgg) |
| 13 | Reputation + unlock | ✅ | Ada |
| 14 | Rival camp AI + poaching | ✅ | `genRivalCamp()` + simulasi di tick() + tab Rival |
| 15 | Popularity + sponsor | 🟡 | Ada `SPONSOR_BRANDS` — sponsor negotiable (royalty/placement) tampak belum |
| 15.1 | Content creation (weekly) | ❓ | Perlu cek |
| 16 | Injury 4 tier | 🟡 | Perlu cek apakah sudah 4 tier penuh |
| 16.3 | Injury Prone trait | ✅ | `injuryProne` muncul |
| 16.3 | Permanent attribute reduction | ❓ | 1 referensi — perlu cek |
| 17 | Win conditions berjenjang (Bronze→GOAT) | ✅ | Referensi Bronze/Silver/Platinum/GOAT ada |
| 17.2 | Legacy score | ✅ | Ada |

**Kesimpulan audit:** Mateo sudah menutup MAYORITAS gap yang ada di gap-list v3 saya.
Yang tersisa untuk "menyempurnakan single-player" bukan lagi sistem-sistem besar yang
hilang, melainkan (a) sejumlah item ❓ yang perlu diverifikasi apakah benar berfungsi,
(b) sejumlah item 🟡/❌ yang tipis atau belum ada, dan (c) kualitas/kedalaman.

---

## ROADMAP BESAR (urutan fase)

```
FASE 1 — SEMPURNAKAN SINGLE-PLAYER (sekarang)
├── 1A. Verifikasi item ❓ (cek benar berfungsi atau tidak)
├── 1B. Lengkapi item 🟡/❌ yang masih tipis/hilang
├── 1C. Polish loop & UX (tanpa Claude sentuh bug/balance — itu kamu main langsung)
└── 1D. REFACTOR arsitektur data → siapkan untuk multiplayer (KRUSIAL, lihat Sec MP-2)

     ↓ (kamu main, rasa "sudah proper")

FASE 2 — FONDASI MULTIPLAYER (Model B, gaya Top Eleven)
├── 2A. Pilih & setup stack backend (lihat Sec MP-1)
├── 2B. Pindahkan fight engine dari client → server (authoritative sim)
├── 2C. Database + akun + persistensi server-side
└── 2D. Scheduled fights (server jalankan fight di waktu terjadwal, hasil tetap ada)

FASE 3 — LIVE MATCH + CORNER DECISION ONLINE
├── 3A. WebSocket: client "join" fight yang sedang berjalan
├── 3B. Corner decision dikirim ke server dalam window waktu
└── 3C. Notifikasi ("fight-mu mulai"), spectator, dropout handling

FASE 4 — LAPIS SOSIAL/KOMPETITIF (opsional, pasca-MVP online)
├── Liga/ranking antar pemain, tantang camp lain
├── Leaderboard global
└── Friendly / turnamen antar pemain
```

Prinsip yang kamu tetapkan: **stack yang dipakai langsung stack multiplayer**, supaya
migrasi tidak besar. Konsekuensinya ada di Fase 1D — beberapa refactor perlu dilakukan
di single-player SEKARANG walau multiplayer belum digarap. Detail di bawah.

---

## FASE 1 — PENYEMPURNAAN SINGLE-PLAYER (detail)

### 1A. Verifikasi item ❓ (Mateo cek dulu, sebelum bangun apa pun baru)

Ini bukan "bangun fitur", tapi "pastikan yang sudah ada benar jalan". Untuk tiap item,
cara cek: mainkan skenario pemicunya, lihat apakah efeknya muncul.

| Item | Cara verifikasi | Kalau ternyata tidak jalan |
|---|---|---|
| Investor (9.5) | Trigger kondisi late-game, cek apakah opsi tukar equity muncul | Bangun sesuai GDD v3 Sec 9.5 |
| Emergency sale facility | Cek apakah bisa jual facility untuk cash darurat | Tambahkan |
| Counter offer (10.4) | Pada offer promotor, cek apakah ada tombol Counter | Tambahkan (butuh promoter rel score, sudah ada) |
| Fight viewing mode (11.3) | Saat fight, cek apakah ada pilihan Tick-by-Tick / Summary / Skip | Kalau cuma 1 mode, tambah 2 lainnya |
| Content creation (15.1) | Cek apakah ada aktivitas mingguan "buat konten" | Tambahkan |
| Permanent attr reduction (16.3) | Trigger 3+ cedera area sama, cek apakah atribut turun permanen | Tambahkan |

> **Catatan jujur:** saya menandai ini ❓ karena dari pembacaan kode saya menemukan
> *referensi kata kunci* tapi tidak menelusuri apakah alurnya lengkap. Bisa jadi sudah
> berfungsi penuh — perlu Mateo/kamu yang pastikan dengan main.

### 1B. Item yang tampak tipis / hilang (kandidat dibangun/diperdalam)

Diurutkan dari yang paling menambah kedalaman (perkiraan saya, bukan fakta baku —
prioritas final terserah kamu):

**B1. Sparring network penuh (GDD 7.2)** — status 🟡
Sekarang sparring quality cuma fungsi jumlah fighter. GDD v3 mau lebih kaya:
- Intra-camp: butuh archetype yang cocok (wrestler butuh wrestler/BJJ untuk ground)
- External sparring partner (bayar $500–2000/mgg, pilih archetype & level)
- Multiplier berdasar level partner vs level fighter (challenged/normal/too easy)

**B2. Pindah kelas sebagai keputusan pemain (GDD 3)** — status ❌
Arahkan fighter naik/turun divisi. Naik = cut lebih mudah, lawan lebih besar. Turun =
size advantage, cut lebih berat. Terhubung ke sistem weight cut yang sudah ada.

**B3. Sponsor negotiable (GDD 15.3)** — status ❌ untuk bagian negotiable
Sekarang sponsor tampaknya otomatis via formula. GDD mau: brand mendekati fighter
populer, pemain pilih placement fee vs royalty, tipe brand (apparel/supplement/tech).

**B4. Camp progression tier aktif (GDD 4.2)** — status 🟡
Pastikan tier (Local Gym → Elite Factory) benar-benar mengatur cap kapasitas fighter &
unlock, bukan cuma label kosmetik.

**B5. Injury 4-tier penuh (GDD 16.1)** — status 🟡
Pastikan ada 4 tier (Minor/Moderate/Serious/Career-Threatening), bukan cuma 2.

### 1C. Polish loop & UX

Ini area yang sengaja saya buat ringan, karena "rasa proper" itu subyektif dan kamu
yang menilai lewat main. Beberapa kandidat umum (bukan keharusan):
- Onboarding/tutorial singkat untuk pemain baru
- Ringkasan mingguan yang lebih jelas (apa yang berubah minggu ini)
- Indikator visual untuk keputusan penting yang menunggu (offer expiring, dll)
- Konsistensi bahasa (campur ID/EN sekarang — putuskan mau full ID, full EN, atau campur konsisten)

> Bug & balancing TIDAK saya masukkan di sini — sesuai keputusanmu, itu ranah main langsung.

### 1D. REFACTOR ARSITEKTUR — persiapan multiplayer (KRUSIAL, kerjakan di Fase 1)

Ini bagian terpenting dari "pilih stack multiplayer sejak awal". Tujuannya: ubah struktur
kode single-player SEKARANG supaya saat multiplayer digarap, fight engine & state bisa
"diangkat" ke server tanpa menulis ulang total. Ini perkiraan arsitektur terbaik saya —
Mateo boleh menyesuaikan.

**D1. Pisahkan LOGIKA dari UI (paling penting).**
Saat ini `App.jsx` mencampur game logic (`tick`, `simRound`, `genFighter`, ekonomi) dengan
React UI dalam satu file 2400+ baris. Untuk multiplayer, **logika harus bisa jalan tanpa
React** (karena nanti jalan di server Node tanpa DOM). Rekomendasi:
```
src/
  engine/            ← PURE JS, tanpa import React sama sekali
    fighter.js       (genFighter, avgSkill, aging, dst)
    fight.js         (simRound, effAttr, prepFighter — INI yang nanti pindah ke server)
    economy.js       (loan, sponsor, settlement)
    rankings.js      (divisions, rankOf, title ladder)
    rivals.js
    tick.js          (game loop mingguan — orchestrator)
    state.js         (newGame, migrasi save, shape state)
  ui/                ← komponen React (import dari engine/)
    FightNight.jsx
    FighterCard.jsx
    NegotiateModal.jsx
    tabs/...
  App.jsx            ← tipis, cuma routing tab + state wiring
  main.jsx
```
Kenapa ini krusial: kalau `simRound` sudah jadi fungsi pure di `engine/fight.js` yang
tidak bergantung React/DOM/`window`, maka di Fase 2 fungsi yang SAMA bisa di-`import`
oleh server Node. Kalau tetap tercampur di komponen React, harus tulis ulang.

**D2. State harus serializable & tanpa referensi non-data.**
Sekarang update pakai `JSON.parse(JSON.stringify(state))`. Itu artinya state sudah
(hampir) serializable — bagus untuk multiplayer (state bisa dikirim server↔client sebagai
JSON). Yang perlu dijaga: **jangan simpan fungsi, closure, atau objek DOM di dalam state.**
Semua "aksi" harus berupa data (mis. `{type: 'ACCEPT_OFFER', offerId}`), bukan fungsi.
(Ini juga memperbaiki pola lama di mana event inbox pernah menyimpan `fx: (g)=>{}` —
sudah pernah kita ganti ke data; pertahankan pola itu di semua tempat.)

**D3. Semua randomness lewat satu titik (seedable RNG).**
Sekarang pakai `Math.random()` di mana-mana. Untuk multiplayer Model B, server harus jadi
sumber kebenaran — dan idealnya hasil fight bisa direproduksi (untuk replay & anti-cheat).
Rekomendasi: ganti `Math.random()` dengan RNG ber-seed (mis. mulberry32/xorshift — fungsi
kecil, tidak perlu library). Simpan seed di state fight. Dengan begitu:
- Server hitung fight dengan seed X → simpan seed + keputusan corner
- Client bisa "memutar ulang" fight identik dari seed yang sama (hemat bandwidth: kirim
  seed + keputusan, bukan tiap event)
Ini perkiraan desain terbaik saya; Mateo mungkin punya pendekatan lain yang sama validnya.

**D4. Pisahkan "aksi pemain" jadi reducer/command.**
Ubah dari "onClick langsung mutasi state" menjadi "onClick kirim ACTION → reducer proses".
Pola: `dispatch({type, payload})` → `reducer(state, action) → newState`. Kenapa: di
multiplayer, ACTION yang sama dikirim ke server untuk divalidasi. Kalau logika aksi sudah
berbentuk reducer murni, server bisa pakai reducer yang sama. Ini pola yang dipakai banyak
game online, tapi saya tidak punya sumber spesifik untuk dikutip — ini pengetahuan umum
arsitektur, jadi anggap sebagai rekomendasi yang perlu dinilai Mateo, bukan keharusan.

**Ringkas Fase 1D:** tiga hal yang kalau dilakukan sekarang akan sangat memperkecil migrasi —
(1) engine pure tanpa React, (2) state serializable + aksi berupa data, (3) RNG ber-seed.
Selebihnya (reducer) bagus tapi bisa menyusul.


---

## FASE 2–3 — BLUEPRINT MULTIPLAYER (Model B, gaya Top Eleven)

> **Peringatan kejujuran soal bagian ini:** rekomendasi teknologi & arsitektur di bawah
> adalah **perkiraan terbaik saya berdasarkan pengetahuan umum**, bukan dari sumber yang
> baru diverifikasi atau dari pengalaman men-deploy sistem serupa. Versi software berubah
> cepat — cek versi terbaru sebelum pakai. Untuk keputusan besar (pilih database, hosting),
> sebaiknya Mateo riset sendiri & bandingkan; anggap ini titik awal diskusi, bukan
> keputusan final.

### MP-1. Rekomendasi stack (dengan trade-off jujur)

Prinsipnya: **satu bahasa untuk client & server** (JavaScript/TypeScript) supaya fight
engine bisa dipakai bersama tanpa port ulang. Ini alasan utama, dan cukup kuat.

| Komponen | Rekomendasi utama | Alternatif | Alasan / trade-off |
|---|---|---|---|
| Bahasa server | Node.js (JS/TS) | Deno, Bun | JS sama dgn client → engine bisa dibagi. Bun/Deno lebih baru & cepat tapi ekosistem lebih kecil; perlu Mateo nilai kematangannya |
| Framework HTTP | Express atau Fastify | Hono | Express paling umum & banyak contoh; Fastify lebih cepat. Bukan keputusan kritikal, mudah ganti |
| Real-time | WebSocket via Socket.IO | ws (raw), µWebSockets | Socket.IO punya reconnect/room built-in (cocok "join match"). Trade-off: lebih berat dari ws mentah |
| Database | PostgreSQL | MySQL, MongoDB | Data game relasional (fighter↔camp↔fight↔user). Postgres kuat untuk itu. Mongo bisa, tapi relasi lebih ribet. **Perlu Mateo putuskan** |
| ORM/query | Prisma | Drizzle, Knex | Prisma enak dipakai + migrasi rapi. Alternatif lebih ringan. Opsional |
| Scheduled jobs | node-cron / BullMQ | cloud scheduler | Untuk "jalankan fight di waktu terjadwal". BullMQ (pakai Redis) lebih tahan kalau server restart |
| Hosting | Railway / Render / Fly.io | VPS sendiri | Managed lebih mudah untuk mulai. **Ini kamu/Mateo yang deploy — saya tidak bisa** |
| State sementara | Redis | in-memory | Untuk fight yang sedang berjalan + notifikasi. Bisa ditunda sampai butuh scale |

> Saya **tidak** merekomendasikan satu jawaban tunggal untuk database/hosting karena
> pilihan terbaik bergantung pada faktor yang saya tidak tahu: perkiraan jumlah pemain,
> budget, familiaritas Mateo dengan tool tertentu. Trade-off di atas untuk bantu diskusi.

### MP-2. Arsitektur inti — "server sebagai wasit tunggal"

Prinsip fondasi (saya cukup yakin ini benar untuk model semacam ini): **server yang
menjalankan simulasi fight, bukan browser pemain.** Ini konsekuensi langsung dari
keinginanmu "hasil tetap ada walau aku tidak nonton".

```
         ┌─────────────────────────────────────────────┐
         │                  SERVER                      │
         │  ┌───────────────────────────────────────┐   │
         │  │  ENGINE (shared dgn client, pure JS)  │   │
         │  │  fight.js, tick.js, economy.js ...    │   │
         │  └───────────────────────────────────────┘   │
         │  ┌──────────┐  ┌──────────┐  ┌───────────┐   │
         │  │ Scheduler│  │ WebSocket│  │ REST API  │   │
         │  │ (fights) │  │ (live)   │  │ (CRUD)    │   │
         │  └──────────┘  └──────────┘  └───────────┘   │
         │  ┌───────────────────────────────────────┐   │
         │  │       DATABASE (Postgres) + Redis     │   │
         │  └───────────────────────────────────────┘   │
         └───────────────┬─────────────────┬───────────┘
                         │ REST            │ WebSocket
                ┌────────┴──────┐   ┌──────┴────────┐
                │  CLIENT A     │   │  CLIENT B     │
                │ (React,       │   │ (React,       │
                │  import       │   │  import       │
                │  engine utk   │   │  engine utk   │
                │  render/replay│   │  render/replay│
                └───────────────┘   └───────────────┘
```

Client tetap punya salinan engine — **bukan** untuk menentukan hasil, tapi untuk
me-render/replay hasil yang dikirim server (dari seed + keputusan). Server tetap
otoritas final.

### MP-3. Alur fight terjadwal (Model B) — inti dari keinginanmu

Ini penerjemahan "Top Eleven tapi MMA + corner decision" ke alur teknis. Model B =
fight berjalan bertahap dengan window keputusan.

```
1. BOOKING
   Fight dijadwalkan pada timestamp T (mis. besok 20:00). Disimpan di DB.
   Pemain dapat entri jadwal + (nanti) notifikasi.

2. SAAT T TIBA (dipicu scheduler server)
   Server mulai menjalankan fight sebagai "sesi live":
   - buat state fight di Redis (seed, ronde=1, HP, stamina, dst)
   - broadcast via WebSocket ke siapa pun yang "join": event ronde 1

3. ANTAR-RONDE (window keputusan — INI kunci Model B)
   - Server buka window N detik (GDD: 60 dtk) untuk corner decision
   - Kalau pemain SEDANG nonton: kirim keputusan lewat WebSocket
   - Kalau pemain TIDAK nonton / window habis: server pakai default (game plan)
   - Server lanjut hitung ronde berikutnya dgn keputusan (atau default)

4. SELESAI
   - Server hitung hasil final, simpan ke DB (menang/kalah, cara, ranking, purse)
   - Broadcast hasil ke penonton
   - Fighter yang tidak ditonton: hasil TETAP tersimpan di DB (poin utama!)
   - Saat pemain login berikutnya: lihat hasil di inbox/riwayat

5. REPLAY (opsional, hemat)
   - Karena fight = seed + urutan keputusan, replay bisa direkonstruksi client
     tanpa server mengirim tiap event lagi
```

**Keputusan desain yang masih terbuka (kamu/Mateo putuskan):**
- **Durasi window nyata vs in-game.** Kalau window 60 detik nyata per ronde, satu fight 3
  ronde = beberapa menit. Untuk banyak fighter/pemain, apakah semua fight jalan serempak
  di jam tertentu (gaya Top Eleven) atau tersebar? Ini mempengaruhi beban server.
- **Apa yang terjadi kalau NOL orang nonton?** Opsi: (a) server tetap jalankan real-time
  dengan default tiap window, atau (b) server hitung instan (skip window) karena toh tak
  ada yang memberi keputusan. Opsi (b) jauh lebih hemat server. Saya condong ke (b) untuk
  fight tanpa penonton, tapi ini keputusanmu — ada trade-off "keadilan" (fight yang ditonton
  vs tidak, hasilnya harus statistik setara).
- **Corner decision di fight AI-vs-AI (rival camp).** Perlu diputuskan apakah pemain bisa
  intervensi hanya di fight yang melibatkan fighter-nya sendiri (kemungkinan besar ya).

### MP-4. Data & akun

Yang belum ada sama sekali sekarang (single-player pakai `window.storage` lokal):
- **Akun pemain** (auth). Rekomendasi: mulai sederhana (email+password atau OAuth). Ini
  area sensitif keamanan — sebaiknya Mateo pakai library auth matang, jangan gulung sendiri.
- **Skema DB inti** (perkiraan tabel awal, Mateo sesuaikan):
  ```
  users(id, email, ...)
  camps(id, user_id, name, rep, cash, chemistry, ...)
  fighters(id, camp_id, name, attrs_json, contract_json, ...)
  fights(id, timestamp, status, camp_a, fighter_a, opponent_json,
         seed, result_json, ...)
  divisions/rankings(...)
  ```
  Catatan: sebagian data kompleks (attrs, contract) bisa disimpan sebagai JSON column di
  Postgres — praktis untuk mulai, bisa dinormalisasi nanti kalau perlu query mendalam.

### MP-5. Migrasi dari save lokal → server

Saat multiplayer online, save `window.storage` lokal pemain lama perlu jalur migrasi
(atau reset bersih). Keputusan desain: apakah progress single-player dibawa ke online,
atau online mulai dari nol? Saya tidak tahu preferensimu — perlu diputuskan sebelum Fase 2.


---

## RINGKASAN UNTUK MATEO (checklist actionable)

Urutan yang saya sarankan (prioritas final terserah kamu/Brahma):

**Sekarang (Fase 1):**
- [ ] 1A: Verifikasi 6 item ❓ di tabel status — main skenario pemicunya, tandai mana yang benar jalan
- [ ] 1D-D1: Refactor `App.jsx` → pisahkan `engine/` (pure JS, no React) dari `ui/`
- [ ] 1D-D3: Ganti `Math.random()` → RNG ber-seed, simpan seed di state fight
- [ ] 1D-D2: Pastikan semua aksi berupa data (bukan fungsi dalam state)
- [ ] 1B: Bangun/perdalam item 🟡/❌ sesuai prioritas Brahma (sparring network, pindah kelas, sponsor negotiable, dst)
- [ ] 1C: Polish yang Brahma minta setelah main

**Nanti (Fase 2, setelah Brahma bilang "sudah proper"):**
- [ ] Pilih stack final (DB + hosting) — riset versi terbaru dulu
- [ ] Setup server Node + import `engine/` yang sudah dipisah di Fase 1
- [ ] Skema DB + auth
- [ ] Scheduler untuk scheduled fights

**Fase 3:**
- [ ] WebSocket join-match + corner decision window
- [ ] Notifikasi + spectator

---

## HAL YANG BELUM DIPUTUSKAN (perlu keputusan Brahma sebelum fase terkait)

Dikumpulkan di satu tempat supaya tidak terlewat:

1. **Bahasa game:** full Indonesia, full English, atau campur konsisten? (mempengaruhi semua teks)
2. **Model B — fight tanpa penonton:** server jalankan real-time atau hitung instan? (beban server)
3. **Serempak atau tersebar:** semua fight di jam tertentu (Top Eleven) atau kapan saja?
4. **Progress SP → MP:** dibawa atau mulai nol saat online?
5. **Skala target:** perkiraan berapa pemain? (mempengaruhi pilihan DB/hosting/Redis)
6. **Prioritas Fase 1B:** dari daftar item tipis/hilang, mana yang paling penting buatmu?

Saya tidak bisa memutuskan ini untukmu — semuanya bergantung preferensi & tujuan yang
hanya kamu yang tahu.

---

## APA YANG SAYA (CLAUDE) TIDAK BISA PASTIKAN DI DOKUMEN INI

Supaya transparan sampai akhir:
- Saya **tidak memainkan** game Mateo — status "✅" = ada di kode & build lolos, bukan
  terbukti berfungsi/seimbang saat dimainkan.
- Rekomendasi stack multiplayer = **pengetahuan umum arsitektur**, bukan dari sumber
  spesifik yang diverifikasi hari ini. Versi & "best practice" berubah; Mateo perlu cek ulang.
- Saya **tidak bisa** deploy, menjalankan server, atau mengakses laptopmu. Blueprint ini
  untuk dibaca & diimplementasikan Mateo, bukan sesuatu yang saya jalankan.
- Angka seperti "60 detik window" diambil dari GDD v3-mu; angka teknis lain (mis. beban
  server) tidak saya hitung — itu perlu diukur saat implementasi nyata.

*GDD v4 — Consolidation + Multiplayer-Ready Roadmap*
*Disusun sebagai blueprint oleh Claude atas permintaan Brahma, 2026-07-05*
*Implementasi: Mateo. Keputusan desain final: Brahma.*
