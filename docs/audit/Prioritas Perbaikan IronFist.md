# Prioritas Perbaikan IronFist

- Dibuat: 22 Oktober 2026, dari [Review IronFist - 2026-10-21.md](Review%20IronFist%20-%202026-10-21.md).
- Kode dalam kurung (misalnya `FT1`) merujuk ke temuan di file review.
- Ukuran adalah perkiraan kasar dari membaca kode: **K** = kecil (jam), **S** = sedang (1–2 hari), **B** = besar (butuh keputusan desain atau beberapa hari).
- **Status terbaru 22 Oktober 2026:** P0 #1–#7, seluruh P1 #8–#25, seluruh P2 #26–#37, P3 #40, dan P5 #53–#54 selesai (40 dari 63 item; #33 sebagian: pinjaman ditunda ke P3 sesuai saran). #19–#37, #40, dan #53–#54 dikerjakan di branch `claude/quirky-mccarthy-7jogso`. Sebelas commit P1 telah digabung ke `master` lewat merge `f672cbc`; source terbaru ada di worktree `mma-manager-fight-night`. Validasi lokal hasil merge lulus; status GitHub CI dilihat pada commit terbaru setelah push. Rincian ada di log progres.

## Prinsip urutan

1. **Fight harus jujur dulu.** Training, kontrak, ekonomi, dan ranking semuanya bergantung pada hasil fight. Tuning apa pun sebelum fight jujur akan terbuang.
2. **Pasang alat ukur sebelum tuning.** Bug fight lolos karena test hanya mengecek bentuk data. Test statistik dan harness di CI harus ada sebelum angka balance diubah.
3. **Bug yang merusak state sebelum balancing.** Sabuk, ranking, sponsor, undo, dan RNG membuat data save salah. Balancing di atas data salah tidak berarti.
4. **Sistem palsu: perbaiki atau buang, jangan biarkan.** Fitur yang tampil tapi tidak berfungsi lebih buruk daripada fitur yang tidak ada.
5. **Backend ditahan** sampai Fase 1 selesai, kecuali perbaikan keamanan kecil.

## P0 — Fight jujur (blokir semua yang lain)

| # | Perbaikan | Temuan | Lokasi utama | Ukuran |
|---|---|---|---|---|
| 1 | Skor keputusan juri dari total ronde (10-9 per ronde), aturan seri yang adil, hapus seri otomatis ke pemain | FT1 | `packages/engine/src/fight.js` (`runFight`, `simRound`), `app/src/ui/FightNight.jsx` (`processResult`) | K |
| 2 | Lawan diberi game plan dan logika corner sendiri; `drainB` ikut modifier plan/corner | FT2 | `fight.js` (`simRound`, `drainB`) | S |
| 3 | Trait Warrior, Explosive, Cautious dihitung untuk kedua sisi | FT3 | `fight.js` | K |
| 4 | Test statistik fight: fighter identik sekitar 50% (sisi ditukar), pemenang keputusan = mayoritas ronde. Jalankan harness balance di CI | PR1 | `app/src/__tests__/fight.test.js`, `tools/balance.mjs`, konfigurasi CI | S |
| 5 | Corner: setiap pilihan punya trade-off nyata; "Work the body" punya efek; hapus paksaan "go" di ronde 1 | FT5 | `fight.js`, `FightNight.jsx` | S |
| 6 | Penalti weight cut masuk ke simulasi; pilihan catchweight punya dampak | FT6 | penimbangan di Fight Night, `fight.js` | S |
| 7 | Tuning archetype sampai win rate di OVR setara masuk 45–55%. Kerjakan **setelah** #1–#6, ukur ulang dengan alat dari #4 | FT4 | `fight.js`, data archetype | B |

Selesai kalau: fighter identik 48–52% di kedua sisi, keputusan juri tidak pernah bertentangan dengan jumlah ronde, tidak ada pilihan corner yang selalu terbaik, archetype 45–55%.

## P1 — Bug yang merusak state dan data save

| # | Perbaikan | Temuan | Lokasi utama | Ukuran |
|---|---|---|---|---|
| 8 | Sabuk per tier: Regional/National/Minor tidak boleh merebut sabuk dunia divisi | DU1 | `packages/engine/src/fights/commitResult.js`, `design/CHAMPIONSHIP_SYSTEM_SPEC.md` | B |
| 9 | Engine memakai urutan ranking berdasarkan poin, sama dengan layar | DU2 | `packages/engine/src/tick/rankings.js` dan semua pemilih lawan/penantang | S |
| 10 | Rotasi tahunan memensiunkan yang terlemah, bukan prospek terbaru | DU4 | `tickRankings` di `tick/rankings.js` | K |
| 11 | Poin ranking AI: jitter rata-rata 0 atau berbasis hasil fight, supaya tidak mentok 120 | DU3 | `tick/rankings.js` | K |
| 12 | Sponsor menambah pemasukan, bukan mengganti angka dasar | EK2 | `computeMonthlyIncome` di `packages/engine/src/economy.js:46` | K |
| 13 | Undo: `up()` tidak menghapus `_undoStack` | SV1 | `app/src/hooks/useGameState.js` | K |
| 14 | Simpan state RNG dunia di save | SV2 | `packages/engine/src/rng.js`, save/load | K |
| 15 | Pencapaian: kirim konteks fight ke `done()`, kirim `koStreak` dan `signedSProspect` | SV4 | `FightNight.jsx`, pemanggil `done()` | K |
| 16 | Fight Night: isi state STR/TD; FOTN hanya muncul kalau benar-benar diberikan dan uangnya masuk kas; timestamp komentar urut | FN1, FN2, FN4 | `FightNight.jsx`, `app/src/components/fight/ResultScreen.jsx:49` | K |
| 17 | Selidiki cerita tarung yang bertentangan dengan komentar ronde | FN3 | `FightNight.jsx`, `narrative.js` | S |
| 18 | Lawan ber-ranking punya atribut tetap yang disimpan, bukan dibuat ulang tiap tawaran | DU5 | data dunia, pembuat tawaran fight | S |
| 19 | Scouting: OVR dan warna atribut di layar Pencari memakai angka laporan scout | CA1 | layar Pencari | K |
| 20 | Perburuan rival: harga ikut OVR sekarang, peluang lebih bergantung kekuatan, reducer `POACH_FIGHTER` menghitung ulang biaya/peluang dan cek batas roster | CA5 | `packages/engine/src/reducer/fighter.js:113`, `RivalsScreen.jsx` | S |
| 21 | Satu sistem rival camp saja; duel rival pakai fight engine; rival tidak latih semua atribut gratis. **Diputuskan: rival camp dibuang** (lihat log) | DU6 | `tick/rivals.js`, `shadow-ai.js` | B |
| 22 | Cedera fight: pakai peluang TKO, perbaiki key doctor stoppage, ikut damage, fasilitas medis berpengaruh | FT7 | `commitResult.js` | S |
| 23 | Pindah kelas: hitung kemenangan beruntun sungguhan | FI7 | `packages/engine/src/tick/weight-change.js` | K |
| 24 | Samakan rumus diskon medis | CA4 | `commitResult.js` | K |
| 25 | Relasi promotor tidak bergantung pencocokan teks log; samakan batas log UI dan engine | DU8 | relasi promotor, `useGameState.js`, engine | S |

## P2 — Sistem yang tidak berfungsi sesuai deskripsinya

Setiap baris butuh keputusan: **implementasikan** atau **buang**. Saran ada di kolom terakhir.

| # | Sistem | Temuan | Saran |
|---|---|---|---|
| 26 | Ambisi Paycheck, Legacy, Family Man, Star Power | FI3 | Implementasikan; logikanya sederhana. `fightsThisYear` harus bertambah. **Selesai: diimplementasikan** |
| 27 | Kontrak: counter-offer terbalik; logika negosiasi di UI | EK3 | Perbaiki arah counter-offer, pindahkan logika ke engine, ukur 7 tuas lalu buang yang tidak terasa. **Selesai** |
| 28 | Relasi antar fighter | FI2 | Buang dulu kecuali ada rencana event yang mengubah relasi. **Selesai: dibuang** |
| 29 | Kepribadian coach Motivator dan Player's Coach | CA3 | Implementasikan sesuai deskripsi. **Selesai** |
| 30 | Staf Cutman dan Nutritionist | CA2 | Cutman mengurangi cut; Nutritionist digabung ke weight cut (setelah #6). **Selesai** |
| 31 | Janji ke fighter | FI5 | Catat janji dan beri akibat kalau diingkari. **Selesai** |
| 32 | Event chemistry | FI8 | Opsi gratis diberi kelemahan, atau opsi berbiaya diberi hasil lebih besar. **Selesai** |
| 33 | Pinjaman dan penjualan darurat | EK4 | Pinjaman baru perlu kalau ekonomi sudah ketat (setelah P3). Penjualan darurat jual aset nyata. **Penjualan darurat selesai; pinjaman masih ditunda** |
| 34 | Mentor | FI6 | Perbesar dan tampilkan, atau buang. **Selesai: dibuang** |
| 35 | Kepribadian promotor | DU8 | Beri efek nyata (purse, tipe lawan) atau buang. **Selesai: diberi efek purse** |
| 36 | Trait Injury Prone | FI4 | Bisa didapat, atau hapus pengecekannya. **Selesai: bisa didapat dari cedera mana pun** |
| 37 | `SET_SPONSOR` lama | EK5 | Hapus. **Selesai** |

## P3 — Balancing (setelah P0 dan P1)

| # | Perbaikan | Temuan |
|---|---|---|
| 38 | Gabungkan angka status camp (Reputasi, Prestise, Legacy, Tier, Identitas Dinasti) jadi 1–2 | EK1 |
| 39 | Ekonomi late game: kurangi banjir uang dan reputasi; prestise sekitar 50 di tahun ke-10. Ukur ulang setelah bug sabuk (#8) dan sponsor (#12) diperbaiki | EK1 |
| 40 | Grade scout tidak otomatis S hanya karena reputasi tinggi. **Selesai** | CA1 |
| 41 | Intensitas Hard: gain lebih tinggi atau risiko lebih rendah sampai layak dipilih | FI1 |
| 42 | Kurangi atau tampilkan pengali training yang tidak terlihat | FI1 |
| 43 | Pergantian juara AI lebih jarang | DU7 |
| 44 | Ambang Hall of Fame lebih tinggi | SV5 |
| 45 | Event: kurangi "Division Shake-up", hilangkan dobel dengan "New Champion", tambah variasi template | DU9 |

## P4 — UI, bahasa, aksesibilitas

| # | Perbaikan | Temuan | Ukuran |
|---|---|---|---|
| 46 | Putuskan bahasa game dulu (GDD "Hal yang belum diputuskan" poin 1), lalu terjemahkan sekitar 400 teks pesan engine, komentar fight, Dunia, Pencapaian, onboarding | UI1, FN4, PR3 | B |
| 47 | Label bocor dan aksesibilitas: "UI.DIVISION", filter "Kelas Berat", 12 aria-label, `lang` di `app/index.html` | UI2 | K |
| 48 | Label salah: judul Fasilitas, "Biaya Penempatan", Hot Streak, "Warisan Tertinggi $0", "Coach Basic ()", teks layar Promotor | UI3, DU8 | K |
| 49 | Tips onboarding: Medical Room, sponsor, nama tombol "Maju Minggu" | UI4 | K |
| 50 | Tombol Maju Minggu terlihat langsung di HP | UI5 | K |
| 51 | Daftar nama staf/coach lebih banyak, cegah nama kembar | UI6 | K |
| 52 | Kontras warna merah di panel terang | UI7 | K |

## P5 — Backend (ditahan, kecuali keamanan)

| # | Perbaikan | Temuan | Kapan |
|---|---|---|---|
| 53 | Hapus secret JWT cadangan; server menolak start tanpa `JWT_SECRET` | BE4 | Sekarang (kecil, keamanan) |
| 54 | Batasi pembuatan fighter; validasi password dan email | BE5 | Sekarang (kecil) |
| 55 | `resolveFight.js` memakai plan/corner sisi B | BE1 | Setelah P0 #2 |
| 56 | Cek status "pending" di dalam transaksi, cegah resolve dobel | BE2 | Saat backend dilanjutkan |
| 57 | Booking PvP butuh persetujuan lawan | BE3 | Saat backend dilanjutkan |
| 58 | Skema DB: kolom yang hilang, key `record`, index, `camps.user_id` unik, tabel versi migrasi | BE6, SV3 | Saat backend dilanjutkan |

## P6 — Kebersihan proyek

| # | Perbaikan | Temuan |
|---|---|---|
| 59 | Test untuk FightNight, useGameState, NegotiateModal; smoke test di CI | PR1 |
| 60 | Perbarui README | PR2 |
| 61 | Perbarui tabel status GDD: ✅ hanya untuk yang berfungsi | PR3 |
| 62 | Arsipkan dokumen lama; pertahankan `CONSTRAINTS.md`, riwayat simulasi balance, spesifikasi championship | PR4 |
| 63 | Pangkas fitur sesuai tabel "Fitur yang sebaiknya dipangkas" di review, setelah dimainkan beberapa jam | — |

## Log progres

- **22 Oktober 2026: P0 #1 selesai.** Commit `5262448` di branch `fix/judges-scoring`.
  - Skor juri sekarang 10-9 per ronde. Ronde dengan poin persis sama dinilai 10-10. Ronde jadi 10-8 kalau pemenang ronde menjatuhkan lawan dan poinnya minimal 2× lawan (sekitar 6–7% ronde).
  - Kalau total skor seri, pemenang ditentukan dari total poin, lalu damage, lalu undian dengan seed. Tidak pernah dari sisi mana yang pemain.
  - Keputusan yang bertentangan dengan jumlah ronde turun dari 14,0% ke 0,5%. Sisanya kartu skor seri karena ada ronde 10-8.
  - Layar hasil menampilkan skor juri. Cerita tarung sekarang membaca semua ronde, bukan cuma ronde terakhir (kemungkinan memperbaiki FN3).
  - Bug baru ditemukan dan diperbaiki: ronde finish tercatat `undefined` (layar "Round" tanpa angka, log "R undefined").
  - Kode: `packages/engine/src/fight/scoring.js` (baru), `fight.js`, `fight/config.js`, `FightNight.jsx`, `ResultScreen.jsx`, test `app/src/__tests__/scoring.test.js`.
- **22 Oktober 2026: P0 #2 selesai.** Commit `dc1dfec` di branch `fix/side-symmetry` (dibuat dari `fix/judges-scoring`).
  - Lawan (sisi B) sekarang punya game plan (`autoGamePlan`) dan corner tiap ronde (`aiCorner` baru, tanpa RNG). Semua efek plan/corner berlaku untuk kedua sisi: output striking/clinch, drain stamina, takedown, body/leg damage, peluang cut, penalti poin clinch, peluang knockdown.
  - Bias sisi lain yang ikut diperbaiki: rentang strike mendarat A 3–7 vs B 2–6 (sekarang sama 2,5–6,5); momentum cuma menaikkan output A; damage clinch yang seri selalu membuat B yang kena knockdown; bonus matchup striking A tidak dihitung di knockdown; scramble dan pembulatan momentum condong ke A.
  - Hasil (fighter identik, plan/corner sama di dua sisi, 10.000 fight per baris): sisi A menang 49,7–50,7% di 25 kombinasi plan × corner. Sebelumnya 53,8% netral, 68,9% "go", 42,1% "save".
  - Layar penimbangan menampilkan rencana lawan. Komentar detik-detik menampilkan instruksi corner lawan.
  - `runFight` dan `simRound` menerima pilihan sisi B lewat argumen opsional terakhir; pemanggil lama otomatis dapat lawan AI.
  - Kode: `fight.js`, `fight/resolve-striking.js`, `resolve-clinch.js`, `resolve-takedown.js`, `resolve-ground.js`, `exchanges.js`, `config.js`, `FightNight.jsx`, `WeighIn.jsx`, `i18n/index.js`, test baru `app/src/__tests__/side-symmetry.test.js`.
  - Masih terbuka untuk #5: pemain dengan "go" tiap ronde melawan corner AI menang 59%, "save" 35%. "Go" tetap pilihan terbaik.
  - Masih terbuka untuk #3: Warrior, Explosive, Cautious masih hanya untuk sisi A.
  - Masih terbuka untuk #7 dan #55: damage clinch sekitar 19–37 per exchange (strike jauh lebih kecil), kemungkinan sumber Muay Thai terlalu kuat. `resolveFight.js` di server belum mengirim plan/corner sisi B.
- **22 Oktober 2026: P0 #3 selesai.** Commit `b1b720d` di branch `fix/trait-symmetry` (dibuat dari `fix/side-symmetry`).
  - Warrior: bonus damage +15% saat tertinggal poin sekarang juga berlaku untuk sisi B.
  - Explosive: output striking sisi B ikut naik 15% di ronde 1 dan turun 15% di ronde 3+.
  - Cautious: sebelumnya trait sisi A mengurangi peluang knockdown kedua arah, jadi juga melindungi A. Sekarang yang dihitung trait penyerang, untuk kedua sisi. Cautious hanya mengurangi peluang knockdown fighter itu sendiri.
  - Komentar Explosive dan Warrior sekarang juga muncul untuk sisi B.
  - Hasil (fighter identik, satu diberi trait, 15.000 fight per baris). Trait di sisi A lalu di sisi B, win rate fighter bertrait:
    - Warrior: 50,7% dan 50,5%.
    - Explosive: 50,2% dan 50,1%.
    - Cautious: 49,3% dan 49,6%. KO oleh fighter Cautious 7,6% dan 7,5%; tanpa trait sekitar 8,7%.
  - Sebelumnya trait di sisi B tidak berefek sama sekali (hasil persis sama dengan tanpa trait).
  - `resolveStriking` tidak lagi menerima argumen posisi `explosiveMult`. Multiplier Explosive dikirim lewat `side.expMultA` / `side.expMultB`.
  - Kode: `fight.js`, `fight/resolve-striking.js`, `fight/resolve-takedown.js` (import tak terpakai dihapus), `fight/commentary.js`, test baru `app/src/__tests__/trait-symmetry.test.js`.
  - Masih terbuka untuk #7: efek ketiga trait kecil (win rate bergeser di bawah 1 poin persen). Cautious belum mengurangi finish submission. "Risiko cedera −15%" dari Cautious hanya berlaku di latihan, tidak di cedera fight (#22).
  - Komentar trait lain (Iron Chin, Grinder, Showboat hanya sisi A; Glass Jaw hanya sisi B) masih satu sisi. Hanya teks, tidak memengaruhi hasil.
- **22 Oktober 2026: P0 #4 selesai.** Commit `16140f0` di branch `test/fight-stats` (dari `fix/side-symmetry`), dikerjakan di worktree `mma-manager-p04` karena P0 #3 sedang dikerjakan di checkout utama. Tidak menyentuh kode engine, jadi tidak bentrok dengan #3.
  - Harness baru `tools/fight-balance.mjs` (`npm run fight-balance`, sekitar 74.000 fight, 4 detik). Gagal (exit 1) kalau: fighter identik di luar 48–52% (total) atau 46–54% (per sel plan × corner); fighter berbeda dengan corner AI di kedua sisi menang lebih sering dari satu sisi (selisih > 5pp); keputusan melawan jumlah ronde lebih dari 2%, atau ada satu saja tanpa ronde 10-8.
  - Harness juga melaporkan win rate archetype di OVR setara untuk #7, tanpa menggagalkan CI. Argumen `scale` (misalnya `node tools/fight-balance.mjs 4`) menambah jumlah fight.
  - CI sekarang menjalankan `npm run fight-balance` dan `npm run balance` setelah test.
  - Test baru `app/src/__tests__/fight-stats.test.js`: side swap untuk 3 pasangan archetype, total sisi A 47–53% di 20 pasangan, keputusan mengikuti ronde di fight 3 dan 5 ronde. Satu `it.todo` untuk trait (#3).
  - Hasil sekarang: mirror 50,4%, side swap 50,2% (selisih per pasangan ≤ 1,4pp di skala 4), keputusan melawan jumlah ronde 1,1% dan semuanya karena ronde 10-8. Bias sisi A 5% di strike mendarat (sekitar +2pp win share) membuat harness gagal.
  - Win rate archetype (OVR setara, corner AI, tanpa trait): Muay Thai 61%, Wrestler 60%, BJJ 52%, Boxer 40%, All-Rounder 36%. Berbeda dari FT4 (Muay Thai 73%, BJJ 35%), lihat temuan di bawah.
  - Fighter di harness tidak punya trait. Setelah #3 selesai, tambahkan kasus trait ke harness dan ganti `it.todo`.
- Temuan baru saat P0 #4, belum diperbaiki:
  - Game plan "Keep It Standing" tidak dipakai engine sama sekali. Hasilnya persis sama dengan "Balanced" di semua corner. Relevan untuk #5.
  - `genFighter` memberi fighter Muay Thai atribut palsu `clinch: 15` (multiplier `clinch` di `ARCHETYPES` bukan atribut). OVR yang tampil jadi sekitar 5 lebih rendah dari delapan atribut aslinya. Kemungkinan ikut menjelaskan Muay Thai 73% di FT4. Relevan untuk #7.
  - Test lama "WeighIn.jsx no longer contains Tale of the Tape" di `rankings.test.js` membaca file dengan path relatif ke `app/`, jadi gagal kalau vitest dijalankan dari root repo. Lewat `npm test` normal.
- **22 Oktober 2026: P0 #5 selesai.** Commit `cfccf03` di branch `fix/corner-tradeoffs` (dibuat dari `fix/trait-symmetry`).
  - Efek corner sekarang satu tabel `CORNER_EFFECTS` di `fight/config.js`. Tiap pilihan mengatur output sendiri, seberapa banyak pukulan lawan masuk ("terbuka"), drain stamina sendiri, dan peluang knockdown sendiri. Semua pilihan selain `neutral` punya untung dan biaya.
    - "Push the pace" (`go`): output +20%, tapi lawan mendarat +16%, stamina terkuras 1,4×.
    - "Save your gas": output −20%, lawan mendarat −15%, drain 0,55×.
    - "Work the body": tiap pukulan yang mendarat (striking dan clinch) memotong 0,25 stamina lawan, dikali faktor cardio lawan. Sekitar 7 stamina per ronde di OVR 65, dan terbawa ke ronde berikutnya. Biayanya output −15% dan peluang knockdown sendiri 0,6×. Ada komentar "the body work is adding up" kalau efeknya terasa.
    - "Empty the tank": output dan "terbuka" sama-sama +35%, peluang knockdown 1,4×. Taruhan varians untuk ronde terakhir.
    - "Clinch and recover" sekarang juga menurunkan output, selain −2 poin dan drain 0,5×.
  - Ronde 1 dan timer corner yang habis sekarang `neutral`, bukan `go`. `runFight` memanggil `cornerPolicy` untuk ronde 1 juga.
  - Teks trade-off corner (EN dan ID) diperbarui sesuai efek sebenarnya.
  - Hasil: sisi A pakai satu corner tiap ronde, lawan AI, 4.000 fight per baris. Win rate A untuk `neutral` / `go` / `save` / `body`:
    - Setara 3 ronde: 45,4 / 44,6 / 47,3 / 44,9.
    - Setara 5 ronde: 44,5 / 40,0 / 49,8 / 50,2.
    - A cardio rendah: 33,2 / 29,3 / 39,0 / 30,5.
    - A cardio tinggi: 57,5 / 59,3 / 58,2 / 61,0.
    - Sebelumnya `go` terbaik di semua skenario (misalnya 51,2 vs 45,7 di setara 3 ronde), dan `body` persis sama dengan `neutral`.
  - Pilihan terbaik per situasi, dari studi bercabang (ronde sebelumnya sama, hanya pilihan di satu ronde yang beda):
    - Ronde 2 dari 3: `neutral` umumnya terbaik; `save` kalau A lebih luka.
    - Ronde 2 dari 5: `save` atau `body`.
    - Ronde terakhir: `empty_tank` atau `go` kalau tertinggal atau imbang; `save` kalau unggul.
  - Harness P0 #4 (disalin, ronde 1 "go" dihapus, 8 corner, skala 2): mirror 49,8% (sel terburuk 48,6%), side swap 50,2%, selisih terburuk 3,7pp. Semua band lolos.
  - Test baru `app/src/__tests__/corner-tradeoffs.test.js`. Dua test lama disesuaikan: test clinch di `side-symmetry.test.js` (output clinch tidak lagi sama dengan neutral) dan sampel KO Cautious di `trait-symmetry.test.js` (300 → 1000 per archetype, karena margin 5% ada di dalam noise).
  - Kode: `fight.js`, `fight/config.js`, `fight/resolve-striking.js`, `fight/resolve-clinch.js`, `FightNight.jsx`, `i18n/index.js`.
  - Perlu saat merge dengan `test/fight-stats` (#4): hapus mirror "go" ronde 1 di `tools/fight-balance.mjs` (baris 67 dan 115) dan `app/src/__tests__/fight-stats.test.js` (baris 34). Kalau tidak, sisi B dapat "go" di ronde 1 sementara sisi A tidak lagi.
  - Masih terbuka:
    - Selisih antar pilihan corner kecil: 1–3pp per keputusan di tengah fight, sampai sekitar 6pp kalau dipakai sepanjang fight. Bisa dibesarkan saat #7.
    - Game plan "Keep It Standing" masih tanpa efek (sama persis dengan "Balanced"). FightNight memakai plan itu kalau pemain tidak memilih.
    - `resolveFight.js` di server memakai default "go" dan sekarang juga untuk ronde 1 (#55). `tools/economy.mjs` memakai "go" di semua ronde.
- Temuan baru saat menguji, belum diperbaiki:
  - Kartu fight di Dashboard menampilkan "T--4w" kalau fight sudah lewat jadwal; fight tidak berjalan otomatis.
  - `tools/smoke.mjs` gagal di Windows (`spawn npx` ENOENT).

- **22 Oktober 2026: P0 #6 selesai.** Commit `6f3b75b` di branch `fix/weight-cut` (dibuat dari `fix/corner-tradeoffs`).
  - Perhitungan weight cut dipusatkan di engine dan dipakai oleh penimbangan, `simRound`, dan `runFight`. Cut di atas 3% menurunkan stamina awal/cap menjadi 95; di atas 7% menjadi 90 (sebelumnya semua mulai 100). Berlaku untuk kedua sisi berdasarkan berat dan kelas masing-masing, sejak exchange pertama. Penalti tidak dipotong ulang tiap ronde; stamina yang tersisa tetap dibawa ke ronde berikutnya.
  - Pengurangan penalti Nutritionist yang sudah ada kini ikut simulasi: skill 10 mengubah cap cut besar dari 90 menjadi 94. Opsi headless `nutritionistSkillA/B` tersedia untuk kedua sisi. Berat yang hilang/tidak valid di save lama tidak menghasilkan penalti atau NaN.
  - Catchweight memotong 30% dari uang tampil dan bonus menang yang didapat, sebelum bagian camp dihitung. Contoh show $1.000 + win $500, bagian camp 20%: sebelumnya $300, sekarang $210; kalau kalah, sebelumnya $200, sekarang $140. Layar hasil dan pembayaran memakai fungsi yang sama, booking tidak dimutasi untuk menghitung potongan. Penalti stamina tetap berlaku sesudah menerima catchweight.
  - Gagal timbang sekarang mengunci tombol mulai sampai catchweight atau pembatalan dipilih. Catchweight tetap ditandai gagal timbang; pembatalan bisa dikonfirmasi tanpa memilih game plan, menghapus booking, dan memberi rep −4 tanpa hasil fight/pembayaran. Batas timbang UI diperbaiki (misalnya 170 → 155 lbs, bukan 170 → 170).
  - Roll gagal timbang memakai seed booking tersendiri, sehingga remount fight dengan seed yang sama memberi hasil timbang yang sama dan tidak mengonsumsi RNG simulasi. Save lama tanpa seed tetap memakai fallback RNG.
  - Hasil (fighter All-Rounder identik, Lightweight, atribut 60/50/40/55/58/52/48/45, Balanced dan corner neutral dua sisi, 3 ronde, 10.000 fight per skenario, seed `i * 7919`):
    - Tanpa cut (155 vs 155 lbs): sisi A menang 50,46%; stamina A sesudah ronde 1 rata-rata 88,39.
    - Cut sedang A (163 vs 155): A menang 40,28%; stamina ronde 1 83,39.
    - Cut besar A (170 vs 155): A menang 30,57%; stamina ronde 1 78,39. Cut besar di B: B menang 30,66%.
    - Kedua sisi cut besar (170 vs 170): A menang 49,98%.
    - Cut besar A + Nutritionist skill 10: A menang 38,12%; stamina ronde 1 82,39.
    - Sebelumnya perbedaan berat ini tidak masuk simulasi; semuanya memakai cap 100 dan hasil yang sama pada seed/atribut/pilihan yang sama.
  - Validasi: 22 test baru (16 engine/pembayaran dan 6 hook/UI); seluruh 668 test aplikasi lolos, build Vite lolos, `npm run balance` lolos seluruh band (480 minggu × 5 seed), `git diff --check` bersih. Test constraint lama dijalankan lewat Git Bash karena memakai Unix `find`; dalam sandbox Windows, direktori temp Vitest juga perlu diarahkan ke workspace. Suite server dicoba lewat `npm test`, tetapi 22 test tidak bisa berjalan karena Postgres lokal menolak koneksi di port 5432 (`ECONNREFUSED`).
  - Kode: `packages/engine/src/fight/weight-cut.js` dan `fight/purse.js` (baru), `fight.js`, `fights/commitResult.js`, `app/src/hooks/useFightPrep.js`, `ui/FightNight.jsx`, `components/fight/WeighIn.jsx`, `ResultScreen.jsx`, `i18n/index.js`, test baru `weight-cut.test.js` dan `weight-cut-ui.test.js`.
  - Masih terbuka: P2 #30 untuk desain staf Cutman/Nutritionist lebih lanjut; tuning archetype dan besarnya efek fight di #7. Lawan mendapat penalti stamina dari cut, tetapi alur gagal timbang/catchweight lawan belum ada. Harness #4 tetap di branch terpisah, belum digabung; catatan penghapusan mirror `go` ronde 1 saat merge tetap berlaku. Tidak ada push.

- **22 Oktober 2026: push dan merge perbaikan selesai P0 #1–#6.** Hasil integrasi `16b88f3` sudah di-push ke `master` GitHub, dari `d35e6af`.
  - Branch `fix/judges-scoring`, `fix/side-symmetry`, `fix/trait-symmetry`, `fix/corner-tradeoffs`, `fix/weight-cut`, dan `test/fight-stats` sudah tersedia di origin. Branch integrasi: `integrate/completed-fight-fixes`.
  - Harness #4 digabung dengan perbaikan sampai #6. Mirror `go` ronde 1 sisi B dihapus dari harness dan test statistik agar sesuai kebijakan ronde pertama sesudah #5.
  - `app/vitest.config.js` memakai plugin React seperti build Vite, memperbaiki lima test UI yang gagal dengan `React is not defined` pada instalasi dependency baru.
  - Validasi lokal: 674 test aplikasi lolos, 1 todo lama; build Vite lolos; fight harness 74.000 fight lolos seluruh band (mirror 50,0%, side swap 50,2%); world balance 480 minggu × 5 seed lolos. CI GitHub untuk hash yang sama berhasil, termasuk tes server dengan PostgreSQL: https://github.com/maxxsky/mma-manager/actions/runs/39731313193.
  - Integrasi dilakukan di checkout terpisah. Perubahan balancing P0 #7 yang belum di-commit di `balance/archetypes`, staging checkout utama, dan `.claude/` tidak diubah atau disertakan.
  - Masih terbuka: P0 #7 dan temuan yang belum selesai dari log sebelumnya. Satu todo statistik trait masih ada; pengujian trait terpisah sudah berjalan.

- **22 Oktober 2026: P0 #7 selesai.** Commit `08c3a38` di branch `balance/archetypes` (dibuat dari `fix/weight-cut`).
  - Harness, test statistik, script npm, dan langkah CI dari P0 #4 (`16140f0`) sudah dibawa ke branch ini. Mirror `go` khusus ronde 1 dihapus sesuai #5; seluruh delapan corner diukur. Todo trait diganti test nyata untuk Warrior, Explosive, dan Cautious, ditambah mirror trait di harness.
  - Clinch sekarang membandingkan output dengan pertahanan wrestling/strength, bukan raw striking × 0,3–0,6. Volume dan damage turun dari puluhan hit per exchange ke skala yang sebanding dengan striking; strength dan stamina ikut damage. Keunggulan clinch Muay Thai tetap ada. Drain `Work the body` disesuaikan 0,25 → 0,55 per hit agar payoff setelah koreksi volume tetap terasa; test trade-off corner tetap lulus.
  - `Keep It Standing` kini berfungsi untuk dua sisi: +2 bobot strike, bobot tembakan sendiri 1, peluang tembakan −0,12, defense takedown +0,10. Bobot TD umum 2 / `Take It Down` 4 menggantikan lonjakan pada wrestling 55; divisor selisih skill TD 60 → 100. Tabel matchup dituning ulang.
  - Bonus GNP/submission hanya berlaku untuk penyerang dan bonus sweep hanya untuk fighter di bawah. Sebelumnya bonus dua archetype dijumlahkan untuk kedua pihak. Submission memakai threshold bersama 75, eligibility lebih rendah, tekanan berbasis selisih skill +12, dan maksimal 12 poin untuk ancaman yang membuat progres; tanpa progres mendapat nol. Bonus adaptation All-Rounder yang semula metadata kini memberi +5,5% atribut efektif, tanpa menaikkan atribut save atau OVR.
  - `genFighter` hanya memproses delapan atribut asli; key palsu `clinch` di data Muay Thai dihapus. Badge OVR memakai `avgSkill`, termasuk untuk save lama yang masih membawa `attrs.clinch`.
  - Sebelum/sesudah dengan **harness baru yang sama**, scale 1, 137.000 fight per run (AI dua sisi, OVR 50/65/80, tiga dan lima ronde): Boxer **37,0 → 50,7%**, Muay Thai **61,5 → 48,5%**, Wrestler **61,2 → 50,8%**, BJJ Specialist **55,6 → 50,2%**, All-Rounder **34,7 → 49,8%**. Engine lama `6f3b75b` diuji dari salinan sementara dan ditolak 27 band; engine baru lulus 39 band.
  - Konfirmasi scale 4: **548.000 fight**, agregat Boxer **50,6%**, Muay Thai **48,7%**, Wrestler **50,9%**, BJJ **50,1%**, All-Rounder **49,8%**. Semua agregat per OVR dan per durasi juga masuk 45–55%. Mirror identik A **49,6%**, sel mirror terjauh **48,8%**; side swap A **50,1%**, gap pasangan terbesar **1,4pp**. Keputusan melawan jumlah ronde **0,8%**, semuanya dijelaskan ronde 10-8. Mirror Warrior/Explosive/Cautious **50,1 / 49,9 / 49,7%**.
  - Validasi: **691 test aplikasi (38 file) lulus**, build Vite lulus, harness fight standar CI dan scale 4 lulus, harness dunia 480 minggu × 5 seed lulus, diff bersih. Test cut lama diperbaiki menjadi 1.000 pasang seed, test determinisme membandingkan replay penuh, serta test clinch menyesuaikan porsi poin setelah volume dikoreksi. `npm test` lengkap dicoba; 22 test server tertahan karena Postgres lokal menolak koneksi port 5432. Test constraint Unix dijalankan melalui Git Bash, temp Vitest di workspace.
  - Kode utama: `fight.js`, `fight/config.js`, `exchanges.js`, `matchup.js`, `resolve-clinch.js`, `resolve-ground.js`, `resolve-takedown.js`, `trait-effects.js`, `archetype-expression.js`, `data/archetypes.js`, `fighter.js`, `app/src/ui/theme.jsx`; test baru `archetype-balance.test.js` dan integrasi `fight-stats.test.js`, harness `tools/fight-balance.mjs`, package script dan CI. Metode, hasil lengkap, serta batas pengukuran tersimpan di `mma-manager/docs/balance/P0_7_ARCHETYPE_BALANCE.md`.
  - Masih terbuka: band 45–55% berlaku pada agregat tiap archetype, tiap OVR, dan tiap durasi secara terpisah; bukan seluruh sel gabungan OVR × durasi. Pada scale 4 BJJ OVR 50/tiga ronde masih 42,4%, dan OVR 80/lima ronde 57,4%; Boxer OVR 50/tiga ronde 55,6%. Matrix lengkap tetap dilaporkan untuk tuning berikutnya. Server plan/corner tetap #55; tidak mengubah backend. Tidak ada push; `.claude/` tetap tidak di-commit.

- **22 Oktober 2026: integrasi P0 #7 ke `master` selesai.** Commit `bec8423` membawa `08c3a38` ke master yang sudah memuat integrasi P0 #1–#6 (`16b88f3`).
  - Konflik harness/test statistik dan komentar CI diselesaikan memakai versi terbaru #7; konfigurasi React untuk Vitest dari master tetap dipertahankan.
  - Validasi sebelum push: 691 test aplikasi lulus, build Vite lulus, harness fight 137.000 fight lulus seluruh 39 band, harness dunia 480 minggu × 5 seed lulus.
  - Sudah di-push setelah user memberi izin eksplisit push langsung ke `master`. CI GitHub **success**, termasuk 22 test server dengan PostgreSQL dan kedua harness: https://github.com/maxxsky/mma-manager/actions/runs/39736991850.
  - Masih terbuka: batas matrix gabungan OVR × durasi yang dicatat pada #7 tetap berlaku; tidak ada tuning baru.

- **22 Oktober 2026: P1 #12 selesai.** Commit `29ced42` di branch `fix/sponsor-income` (dari master `bec8423`).
  - Kontrak sponsor kini ditambahkan ke pemasukan dasar reputasi, bukan menggantikannya. Bonus juara dan royalti hanya mengalikan nilai kontrak.
  - Reputasi 40: tanpa sponsor tetap $15.000/bulan; kontrak $400 menjadi **$15.400** (sebelumnya $400); tiga kontrak total $1.050 menjadi **$16.050** (sebelumnya $1.050). Setelah sponsor berakhir, pemasukan dasar tetap ada.
  - Test mencakup penambahan/penghapusan sponsor, bonus juara/royalti, kesesuaian preview dan uang settlement, serta expiry. Tes ekonomi lama yang mengunci perilaku salah diperbarui. 22 test ekonomi/sponsor lulus.
  - Kode: `packages/engine/src/economy.js`, `app/src/__tests__/economy.test.js`, test baru `sponsor-income.test.js`.
  - Masih terbuka: tuning ekonomi late game #39 dan penghapusan aksi sponsor lama #37. Tidak ada push.

- **22 Oktober 2026: P1 #13 selesai.** Commit `69ef770` di branch `fix/undo-history` (dari `fix/sponsor-income`).
  - `useGameState.up()` mempertahankan tumpukan undo/redo. State aktif di-clone terpisah dan array stack disalin tanpa menserialisasi seluruh riwayat di setiap update.
  - Reducer menyalin snapshot saat undo/redo agar perubahan setelah restore tidak memutasi state React sebelumnya.
  - Test melalui hook aplikasi membuktikan undo beberapa aksi berurutan, redo, batas 20 snapshot, invalidasi redo setelah aksi baru, imutabilitas state sebelumnya, dan autosave hasil undo. 13 test hook/undo lulus saat commit.
  - Kode: `app/src/hooks/useGameState.js`, `packages/engine/src/reducer.js`, test baru `game-state-hook.test.js`.
  - Masih terbuka: cakupan test UI lain di #59. Tidak ada push.

- **22 Oktober 2026: P1 #14 selesai.** Commit `730d068` di branch `fix/save-world-rng` (dari `fix/undo-history`).
  - Save memuat `worldRngState: { state, nextUID }`: posisi terkini PRNG dunia dan counter ID. Load memulihkannya sebelum migrasi. PRNG fight yang sementara tidak disimpan sebagai RNG dunia.
  - Autosave mencatat checkpoint saat state berubah, sebelum delay satu detik; penyimpanan tidak mengambil posisi RNG dari state yang lebih baru. Hasil Fight Night juga mencatat checkpoint. Undo/redo memulihkan checkpoint snapshot.
  - Save lama/tanpa metadata valid mendapat seed konsisten dari hash isi save, dan counter ID di atas ID yang sudah ada. Roll seed booking dalam migrasi sekarang memakai RNG ber-seed. Checkpoint dicatat lagi setelah migrasi memakai angka acak/ID.
  - Pengujian membandingkan **12 minggu simulasi penuh** setelah load dengan permainan yang berjalan terus: seluruh state dan posisi RNG sama. Test tambahan mencakup migrasi save lama + 4 minggu, ID, dua slot, seed nol, metadata rusak, isolasi fight, checkpoint autosave tertunda, serta undo/redo RNG.
  - Validasi akhir gabungan #12–#14: **707 test aplikasi / 42 file lulus**, build Vite lulus, harness fight 137.000 fight / 39 band lulus, harness dunia 480 minggu × 5 seed lulus, diff bersih. Suite server lokal dicoba; 22 test tertahan oleh `ECONNREFUSED` pada PostgreSQL localhost:5432. CI hijau di atas berlaku untuk master P0 #7, bukan tiga commit lokal ini.
  - Kode: `packages/engine/src/rng.js`, `app/src/services/saveService.js`, hooks `useGameState.js` / `useSaveLoad.js`, `App.jsx`; test `world-rng-save.test.js`, `save-load-hook.test.js`, dan tambahan `game-state-hook.test.js`.
  - Masih terbuka: versi skema migrasi save #58/SV3. Tiga branch P1 ini belum di-push/merge ke master; `.claude/` tetap tidak di-commit.

- **22 Oktober 2026: P1 #8 selesai.** Commit `24e6a27` di branch `fix/title-tiers` (dari `fix/save-world-rng`, `730d068`).
  - `division.champ` kini hanya untuk Major World Champion. Regional, National, Minor, Premier, dan Interim punya slot `division.tierChamps[tier]` masing-masing. Kelima kemenangan tier tersebut tidak lagi mengganti juara atau mengakhiri era Major; juara Regional tidak mendapat mandatory defense Major.
  - Reign mencatat tier, minggu merebut/bertahan, dan jumlah defense. Defense dihitung dari kepemilikan sabuk yang sedang dipertandingkan, bukan jumlah defense karier. Kalah laga gelar memindahkan sabuk yang sama kepada lawan; label juara aktif pemain lama dihapus. Kekalahan laga non-gelar tidak memindahkan sabuk. Unifikasi Major membersihkan Interim.
  - Reject/expiry/strip mandatory Major hanya mencopot Major, mempertahankan sabuk tier lain. Vacate/keluar/pensiun/pindah kelas membersihkan slot yang dipegang. Pencarian pemegang melintasi divisi mengatasi pemanggil pindah kelas yang sudah mengubah `weightClass` sebelum vacate.
  - Save lama dimigrasikan secara deterministik lewat hook load. Pemain yang salah tercatat sebagai juara dunia tetapi hanya punya label lower tier dipindah ke slot yang sesuai, Major dibuat vacant. Identitas juara AI yang dahulu tertimpa tidak bisa direkonstruksi; era yang tercipta karena bug dibersihkan. Migrasi tidak mengonsumsi RNG dan tidak diulang untuk save baru.
  - Metadata booking disimpan sebelum `f.booked` dikosongkan, sehingga commit hasil juga benar saat argumen fighter merupakan objek roster yang sama. Juara Major tetap bisa menerima tawaran Premier di antara jadwal mandatory.
  - Validasi #8: **724 test aplikasi / 43 file lulus** sebelum tambahan satu tes hook migrasi; sesudahnya **19 tes title-tier + hook load lulus**. Build dan harness dunia 480 minggu × 5 seed lulus. Validasi gabungan akhir dengan #9 tercatat di bawah.
  - Kode: modul baru `packages/engine/src/championships.js`, `fights/commitResult.js`, `rankings.js`, `reducer/fight.js`, `tick/fight-offers.js`, hook `useSaveLoad.js`, `Inbox.jsx`, spesifikasi championship, tes baru `title-tiers.test.js`, tambahan `save-load-hook.test.js`.
  - Masih terbuka: kalender mandatory/simulasi juara AI per tier selain Major belum diperluas; tier lain berpindah lewat hasil laga gelar. Counter total defense karier dan bonus legacy belum dituning (#39). Tidak ada push.

- **22 Oktober 2026: P1 #9 selesai.** Commit `b7f2091` di branch `fix/ranking-order` (dari `fix/title-tiers`).
  - Selector `divisionRankings()` menjadi satu sumber urutan untuk layar Ranking dan engine: gabungkan AI + pemain berdasarkan poin, keluarkan juara Major, sertakan rekan satu camp dalam posisi ranking, serta batasi status ranked di top 15. Juara Major memakai rank 0; seri poin diurutkan deterministik (AI lebih dulu, lalu ID/nama).
  - Pemilihan lawan biasa, rivalry nudge, vacant title, mandatory defense, penantang juara AI, pengganti juara pensiun, berita top 3, dan penilaian ranking rival camp semuanya memakai urutan tersebut. Label `oppRank` adalah peringkat dari tabel gabungan, bukan indeks array AI. Rekan satu camp tidak dipilih sebagai lawan biasa.
  - Selector menghitung ulang saat dibaca, sehingga hasil langsung mengikuti perubahan poin tanpa menunggu tick/migrasi. Array penyimpanan tidak diurutkan atau dimutasi oleh selector. Contoh snapshot 240 minggu, seed 12345: **84 dari 112** posisi array mentah berbeda dari urutan poin; pemilih lawan kini tidak memakai posisi mentah tersebut.
  - Tes baru mencakup urutan layar lewat render komponen, rank pemain/rekan camp/juara, batas top 15, poin seri, perubahan poin langsung, mandatory/vacant/AI title/retired champion, dan berita top 3. Pada loop **60 seed**, tawaran ranked yang terbit cocok dengan nama + peringkat layar dan tetap sama ketika array storage dibalik.
  - Dua fixture lama diperjelas: pengganti juara diberi poin berbeda agar tidak bergantung pada array/ID acak; simulasi retensi diakhiri tepat pada settlement minggu 240, bukan minggu 241 saat fighter dapat baru sembuh sesudah cleanup bulanan. Ditambah tes deterministik yang memeriksa pesan cedera sembuh/fighter hilang dihapus dan cedera aktif tetap disimpan. Tidak mengubah perilaku retensi produk.
  - Validasi akhir gabungan #8–#9: **738 test aplikasi / 44 file lulus**, build Vite lulus, harness dunia **480 minggu × 5 seed** lulus semua band, harness fight **137.000 fight / 39 band** lulus, `git diff --check` bersih. Test server tidak diulang karena backend tidak diubah; PostgreSQL lokal sebelumnya tidak tersedia. Peringatan bundle Vite di atas 500 KB tetap ada.
  - Kode: `rankings.js`, `index.js`, `tick/fight-offers.js`, `world.js`, `shadow-ai.js`, `narrative/generators/world-news.js`, `app/src/ui/Rankings.jsx`, tes baru `ranking-order.test.js`, penyesuaian `world.test.js` dan `inbox-retention.test.js`.
  - Masih terbuka: rotasi tahunan tetap item **#10**, jitter poin tetap **#11**, atribut lawan ranked tetap **#18**. Tidak mengubah balancing poin atau aturan rotasi. Tidak ada push; lima commit P1 bertumpuk lokal dari `master`, `.claude/` tetap tidak di-commit.

- **22 Oktober 2026: P1 #10 selesai.** Commit `3e3e47f` di branch `fix/ranking-retirement` (dari `fix/ranking-order`, `b7f2091`).
  - Rotasi tahunan memakai urutan poin dari `rankedAIContenders()` dan mengganti tiga AI berperingkat terendah yang memenuhi syarat, bukan tiga elemen terakhir storage. Prospek baru tidak otomatis dipensiunkan: kalau poinnya lebih tinggi, ia bertahan; kalau memang terlemah, ia tetap bisa terganti.
  - Pemegang sabuk Major dan tier lain dilindungi dari rotasi ini. Survivor mempertahankan posisi storage; hanya kandidat terpilih dihapus. Divisi kecil mengganti sesuai jumlah kandidat yang ada (0–3), tanpa menambah populasi semu. Log menampilkan jumlah yang benar. Aturan pensiun karena usia di simulasi dunia tetap berlaku terpisah.
  - Tes baru membuktikan tiga terlemah terganti saat berada di awal/tengah array, prospek kuat di akhir tetap ada, storage dibalik tetap memilih kandidat sama termasuk saat poin seri, pemegang sabuk tetap ada, divisi kecil tidak membesar, dan replay RNG/ID deterministik.
  - Tes timestamp inbox lama dibuat deterministik pada batas settlement: pesan tanpa tanggal mendapat `createdWeek` dan tanggal lama dipertahankan. Simulasi sebelumnya kebetulan tidak menghasilkan pesan baru di minggu terakhir; perubahan aliran dunia menyingkap asumsi itu. Perilaku produk tidak diubah.
  - Validasi saat commit: **746 test aplikasi / 45 file lulus**, harness dunia **480 minggu × 5 seed** lulus, diff bersih. Kode: `packages/engine/src/tick/rankings.js`, tes baru `app/src/__tests__/ranking-retirement.test.js`, penyesuaian `inbox-retention.test.js`. Tidak ada push.

- **22 Oktober 2026: P1 #11 selesai.** Commit `f2518ac` di branch `fix/ranking-point-drift` (dari `fix/ranking-retirement`).
  - Jitter AI diubah **−8…+12 → −8…+8**. Nilai mentah sekarang simetris dan rata-rata nol, bukan +2 per update. Update sebenarnya berjalan **bulanan** lewat `tickSettlement()`; sebutan jitter mingguan di review awal kurang tepat. Batas poin tetap 5–120.
  - Pengukuran terisolasi dengan metode yang sama sebelum/sesudah (#10 sudah aktif): **100 seed × 100 fighter**, semua mulai 60 poin, **120 update bulanan** tanpa aging/fight/rotasi. Rata-rata akhir **113,6444 → 61,4684**; jumlah di 120 **3.881 → 329 dari 10.000** (**38,81% → 3,29%**). Clipping di batas dapat menggeser rata-rata populasi sedikit; yang nol adalah distribusi roll mentah.
  - Dunia penuh **480 tick × 5 seed** (`1000 + i × 7919`, kas minimal $250.000), 200 slot top 5 lintas divisi: rata-rata poin **115,26 → 104,65**, proporsi di 120 **24% → 11%**. Simulasi ini tetap mencakup hasil dunia/aging dan seleksi rotasi; tidak menjanjikan semua poin berhenti naik atau tidak pernah mencapai cap.
  - Tes baru menjaga distribusi nol/simetris, batas poin dan kemampuan keluar dari cap lama, replay seed, populasi terisolasi sepuluh tahun, serta headroom top 5 dunia selama sepuluh tahun. Tes statistik memakai seed tetap dan ikut CI melalui suite aplikasi.
  - Validasi akhir gabungan #10–#11: **751 test aplikasi / 46 file lulus**, build Vite lulus, harness dunia **480 minggu × 5 seed** lulus seluruh band, `git diff --check` bersih. Fight harness dan tes server tidak diulang karena kode fight/backend tidak diubah; PostgreSQL lokal sebelumnya tidak tersedia. Peringatan bundle Vite di atas 500 KB tetap ada.
  - Kode: `packages/engine/src/tick/rankings.js`, tes baru `app/src/__tests__/ranking-point-drift.test.js`.
  - Masih terbuka: atribut tetap lawan ranked **#18**, lalu P1 **#15–#17 dan #19–#25**. Save lama yang sudah punya banyak poin 120 tidak direset/rescale; jitter baru memungkinkan poin bergerak turun secara alami. Tujuh commit P1 masih lokal, tidak ada push/merge; `.claude/` tidak disertakan.

- **22 Oktober 2026: P1 #18 selesai.** Commit `b6544c6` di branch `fix/persistent-ranked-fighters` (dari `fix/ranking-point-drift`, `f2518ac`).
  - Fighter dunia menyimpan atribut asli, trait, usia, kelas/berat, ID, dan rekor. Generator divisi awal mempertahankan atribut/trait dari fighter yang sudah dibuat, bukan membuangnya. Pengganti tahunan serta rookie/veteran dunia juga memiliki profil combat tersimpan.
  - Tawaran biasa, mandatory defense, vacant title, dan perebutan sabuk mengambil clone profil yang sama. Tidak ada lagi fighter acak baru yang hanya diganti nama/archetype, bonus level tersembunyi mandatory, atau rekor nol kemenangan yang diganti rekor acak. Unifikasi melawan pemain menyalin fighter pemain secara lengkap.
  - Juara AI menyimpan `worldFighterId` dan profil. Saat sabuk berpindah, mantan juara tetap memakai ID dan atributnya; hanya poin ranking diturunkan. Aging/development yang sudah ada mengubah atribut tersimpan sesuai perubahan level, tanpa roll ulang. OVR Ranking dan P4P memakai atribut aktual jika tersedia.
  - Save lama dimigrasikan dengan seed lokal berbasis identitas fighter, tanpa memakai stream RNG dunia atau UID. Jika atribut satu-satunya ada di booking/inbox lama, booking didahulukan dan profil tersebut dipertahankan agar laga yang sudah dipesan tidak berubah lawan. Profil valid tidak dibuat ulang saat load berikutnya.
  - Tes baru: profil awal dan replacement, **80 seed tawaran** dengan profil lawan yang tetap sama, isolasi clone, migrasi/load berulang dan booking lama, mandatory/vacant tanpa boost, identitas mantan juara, aging tersimpan, dan replay fight penuh. Dua tes camp lama diperjelas: sampling replacement lewat population factory langsung; pencarian event juara mencocokkan camp/divisi yang dituju, karena champion sekarang membawa camp sebenarnya.
  - Validasi #18: **759 test aplikasi / 47 file lulus** sebelum tambahan satu tes hook migrasi; setelah tambahan, **11 tes profil + hook load lulus**. Build dan harness dunia 480 minggu × 5 seed lulus. Ukuran save maksimum harness **129 KB** (sebelumnya 97 KB), masih di bawah band 1 MB. Validasi gabungan akhir di #15.
  - Kode utama: modul baru `packages/engine/src/world/fighter-profile.js`, `rankings.js`, `tick/rankings.js`, `tick/fight-offers.js`, `world.js`, `world/ai-fighter.js`, `fights/commitResult.js`, hook `useSaveLoad.js`, layar `Rankings.jsx`, tes baru `persistent-world-fighters.test.js` dan tambahan hook load. Tidak ada push.
  - Batas: profil untuk save lama tanpa atribut perlu dibentuk sekali; profil tawaran ranked berikutnya tetap sama. Lawan independen yang belum ada di dunia tetap boleh dibuat untuk tawaran biasa. Simulasi juara AI masih model sederhana, bukan fight engine penuh.

- **22 Oktober 2026: P1 #15 selesai.** Commit `66c5e4e` di branch `fix/achievement-context` (dari `fix/persistent-ranked-fighters`).
  - FightNight mengirim konteks hasil ke `done()`. `commitFightResult()` mengembalikan konteks yang sudah mengetahui kepemilikan sabuk aktual dan `koStreak`; App memeriksa pencapaian sesudah hasil diterapkan melalui `applyFightCompletion()`, sehingga First Blood, Knockout Artist, Submission Specialist, dan gelar pertama terbuka pada hasil yang benar.
  - KO/submission/title hanya membuka pencapaian jika pemain menang, bukan ketika kalah dengan metode tersebut atau draw. `titleWon` berasal dari sabuk yang benar-benar diberikan; pertahanan gelar tidak dianggap kemenangan gelar baru. Pembatalan tidak membawa konteks kemenangan. Tombol commit hasil dilindungi dari klik berulang.
  - Tiga KO beruntun dicatat per fighter, reset pada kalah/decision/submission, tersimpan dalam save, dan bisa melanjutkan riwayat KO save lama yang belum punya field `koStreak`. Doctor Stoppage mengikuti kategori KO yang sudah dipakai record engine.
  - Perekrutan prospek grade S yang berhasil di reducer kontrak langsung mengirim `signedSProspect`, sehingga Talent Scout tersimpan pada aksi sign. Grade dibaca dari prospect state; ekstensi kontrak, prospect tidak ada, dan flag buatan pada action tidak memberikan pencapaian.
  - Tambahan **22 tes**: 19 hasil/pencapaian/kontrak, 2 alur komponen FightNight nyata dari staredown → weigh-in → finish → commit (KO/submission, callback dan guard commit ganda), serta 1 hook dispatch grade S dengan undo/redo/autosave. Tes juga memastikan streak antar-fighter tidak digabung, save/load melanjutkan streak, dan achievement/log tidak digandakan.
  - Validasi akhir gabungan #18–#15: **782 test aplikasi / 49 file lulus**, build Vite lulus, harness dunia **480 minggu × 5 seed** lulus seluruh band, `git diff --check` bersih. Fight harness tidak diulang karena mekanik simulasi fight tidak berubah (replay input profil diuji langsung). Backend tidak diubah; tes server tidak diulang karena PostgreSQL lokal sebelumnya belum tersedia. Peringatan bundle Vite di atas 500 KB tetap ada.
  - Kode: `achievements.js`, `fights/commitResult.js`, `reducer/contract.js`, `FightNight.jsx`, `App.jsx`, service baru `app/src/services/fightCompletion.js`, tes baru `fight-achievements.test.js` / `fight-night-achievements.test.js`, tambahan `game-state-hook.test.js`.
  - Masih terbuka: Fight Night statistik/FOTN/timestamp **#16**, kesesuaian narasi **#17**, lalu #19–#25. Tidak ada push/merge; sembilan commit P1 masih lokal dan `.claude/` tidak disertakan.

- **22 Oktober 2026: P1 #16 selesai.** Commit `d9033c8` di branch `fix/fight-night-stats` (dari `fix/achievement-context`, `66c5e4e`).
  - STR/TD Fight Night dan layar hasil menjumlahkan log seluruh ronde. TD dihitung pada setiap takedown berhasil, bukan dari posisi akhir ronde. Nilai HP/stamina nol tidak lagi ditampilkan sebagai 100. Riwayat hasil menyimpan statistik dan bonus aktual.
  - Modul murni `fight/report.js` menjadi sumber bersama untuk statistik dan Fight of the Night. Bonus $50.000 gross fighter diberikan untuk laga selesai minimal ronde 3, total landed >40 dengan masing-masing >=15, kedua sisi pernah memenangkan ronde, dan selisih total kartu juri <=2. Draw atau data ronde tidak lengkap tidak mendapat bonus. Bonus bisa didapat saat menang maupun kalah.
  - Perhitungan purse yang sama dipakai UI dan commit: bonus masuk gross fighter, lalu bagian manajer masuk kas camp (contoh cut 20% memberi tambahan $10.000). Penalti catchweight hanya memotong show/win bonus; FOTN tetap utuh. Baris bonus tidak muncul jika tidak diberikan.
  - Komentar memakai timestamp numerik yang diurutkan stabil dan dibatasi 0:00–5:00; exchange pertama mulai setelah pengantar/corner. Tick mode membaca tickLog dan kembali ke corner saat ronde belum menghasilkan finish. Knockdown tanpa finish tidak mengakhiri laga; submission finish memproses hasil; pemeriksaan dokter menahan timer corner.
  - Tambahan 11 tes mencakup pembayaran/render menang-kalah, catchweight, tanpa bonus semu, akumulasi ronde, alur tick, nilai nol, serta 200 ronde nyata untuk jumlah TD dan urutan waktu. Validasi saat commit: **793 test aplikasi / 50 file**, build Vite, harness fight **137.000 fight / 39 band** lulus. Penyortiran timestamp dioptimalkan ke angka setelah run awal mengalami timeout; suite penuh diulang dan lulus tanpa menaikkan timeout.
  - Kode: `fight.js`, `fight/commentary.js`, modul baru `fight/report.js`, `fight/purse.js`, `fights/commitResult.js`, `narrative.js`, `FightNight.jsx`, komponen `Scoreboard.jsx` / `ResultScreen.jsx`, tes baru `fight-reporting.test.js` dan tambahan `fight-night-achievements.test.js`.
  - Batas: FOTN ditentukan per laga; belum ada pemilihan satu laga terbaik dari kartu event berisi banyak laga. Hasil legacy tanpa roundLogs tidak diberi bonus retroaktif. Tuning ekonomi keseluruhan tetap #39. Tidak ada push/merge.

- **22 Oktober 2026: P1 #17 selesai.** Commit `6ef0f24` di branch `fix/fight-narrative-evidence` (dari `fix/fight-night-stats`).
  - Investigasi **2.000 fight seeded** menemukan **19** narasi pembuka yang menunjuk pengendali berlawanan dengan pemenang kedua ronde awal. Contoh seed **217**: pemain kalah landed 17–29 dan 11–19 tetapi menang skor ronde 41–39 dan 72–33; narasi lama mengklaim lawan mengendalikan pembuka. Kini narasi menyebut pemain mengambil ronde awal meski mendaratkan lebih sedikit pukulan.
  - Pengendali awal, turning point, comeback, beatdown, dan keputusan ketat memakai pemenang/skor ronde dari aturan juri. Comeback memerlukan ketertinggalan kartu sebelum finish dan berlaku untuk kedua sisi. Kemenangan kartu 3–0 tidak otomatis disebut razor-close hanya karena raw points berdekatan. Teks finish menyebut pemenang aktual tanpa mengarang tekanan atau detail penghentian.
  - Engine mencatat jumlah upaya submission tiap sisi secara terstruktur. Signature submission clinic memerlukan >=3 upaya dari satu pihak, bukan kecocokan kata submission pada komentar skill yang gagal. Metadata tambahan tidak mengubah RNG atau fisika fight.
  - Booking menyimpan playerRank. Huge upset memerlukan bukti posisi pemain dibanding lawan top 3; booking legacy tanpa peringkat tidak mengarang upset. Final-Round Finish hanya muncul pada ronde terakhir jadwal aktual dan metode finish yang dikenal. Perebutan gelar menampilkan And New; pertahanan menampilkan And Still, dengan konteks menang/kalah yang sesuai.
  - Tambahan **11 tes** mencakup seed 217, comeback dua sisi, skor juri, submission nyata/stall, ranking booking, gelar/render EN-ID, dan pemeriksaan narasi pada **2.000 fight seeded** tanpa mengubah RNG. Fixture tes lama diperjelas agar menggambarkan hasil yang konsisten.
  - Validasi akhir kedua item: **804 test aplikasi / 51 file lulus** pada source final, build Vite lulus, harness fight **137.000 fight / 39 band** lulus (mirror 49,6%; side swap 49,9%; gap terbesar 2,0pp), harness dunia **480 minggu × 5 seed** lulus semua band (save maksimum 129 KB), diff bersih. Peringatan bundle >500 KB tetap ada. Backend tidak diubah; tes server tidak diulang karena PostgreSQL lokal sebelumnya tidak tersedia.
  - Kode: `narrative.js`, `fight.js`, `fight/resolve-ground.js`, `reducer/fight.js`, `ResultScreen.jsx`, `i18n/index.js`, tes baru `narrative-evidence.test.js`, dan penyesuaian `narrative.test.js`. Data legacy tanpa jumlah submission terstruktur tidak diberi signature clinic berdasarkan teks saja.
  - **Lokasi kerja terbaru:** `C:\Users\maxgu\Documents\mma manager\mma-manager-fight-night`, native Git worktree yang dibuat dari `66c5e4e` karena checkout utama sempat berganti oleh sesi lain saat dibaca. Dua commit ini ada di worktree tersebut; lanjutkan dari `fix/fight-narrative-evidence`, bukan mengasumsikan checkout utama sudah memuatnya. Checkout utama terakhir teramati tetap `fix/achievement-context` / `66c5e4e`; `.claude/` tidak disentuh. Sebelas commit P1 masih lokal, tidak ada push/merge. Dua item yang diminta selesai; berikutnya #19 dan #20 bila user memberi instruksi baru.

- **22 Oktober 2026: integrasi seluruh P1 selesai (#8–#18).** User mengizinkan push dan merge semua perbaikan yang belum masuk GitHub. Merge commit `f672cbc` menggabungkan sebelas commit dari `fix/fight-narrative-evidence` ke `master` `be0cdd1` tanpa konflik; dokumen audit yang sudah ada di master dipertahankan.
  - Validasi pada hasil merge: **804 test aplikasi / 51 file**, build Vite, harness fight **137.000 fight / 39 band**, dan harness dunia **480 minggu × 5 seed** lulus. Peringatan ukuran bundle tetap ada; server lokal tidak diulang, CI menyediakan PostgreSQL.
  - Scope push: `master` serta sebelas branch P1 (#12, #13, #14, #8, #9, #10, #11, #18, #15, #16, #17), tanpa force push. Dokumen prioritas di `docs/audit/` disinkronkan. Status CI GitHub diperiksa setelah push; lihat run commit terbaru pada GitHub Actions. Tidak ada item baru yang dikerjakan.
  - Worktree terbaru `mma-manager-fight-night` kini checkout `master`. Checkout utama `mma-manager` tetap berada di branch pencapaian yang lama; jangan berasumsi working tree itu otomatis berisi integrasi terbaru. `.claude/` tidak disentuh.

- **22 Oktober 2026: P1 #19 selesai.** Branch `claude/quirky-mccarthy-7jogso` (dari master `9b28d22`).
  - `makeReport` sekarang juga menyimpan `estVal`, angka perkiraan scout per atribut (`null` kalau tersembunyi). Angka ini berasal dari roll yang sama dengan huruf grade, jadi pemakaian RNG tidak berubah.
  - Layar Pencari menghitung OVR dari `estVal` (rata-rata atribut yang diketahui) dan mewarnai atribut dari angka yang sama. Atribut asli prospek tidak lagi dipakai di layar itu. Kalau semua atribut tersembunyi, OVR tampil "?".
  - Prospek di save lama tanpa `estVal` memakai nilai tengah huruf grade (A+ 90, A 80, B+ 70, B 60, C+ 50, C 40, D 28).
  - Modal negosiasi sudah dicek dan tidak menampilkan atribut atau OVR prospek.
  - Validasi: test baru `scout-report.test.js` (6 test; 2 test render gagal di kode lama), **810 test aplikasi / 52 file lulus**, build Vite lulus, harness dunia 480 minggu × 5 seed lulus. Fight harness tidak diulang karena kode fight tidak berubah.
  - Kode: `packages/engine/src/fighter.js` (`makeReport`, `reportAttrValue`, `reportOvr` baru), `index.js`, `app/src/ui/Scout.jsx`.
  - Masih terbuka (bagian lain CA1, belum masuk #19): grade scout ditentukan reputasi saja, dan reputasi mentok 100 di tahun 2–4, jadi semua laporan cepat menjadi grade S. Ini masalah balancing (P3).

- **22 Oktober 2026: P1 #20 selesai.** Branch `claude/quirky-mccarthy-7jogso`.
  - Fungsi baru `poachTerms(g, rival, target)` di `packages/engine/src/rivals.js` menjadi satu sumber harga, biaya gagal, peluang, dan alasan blokir. Layar Rivals dan reducer `POACH_FIGHTER` sama-sama memakainya. Reducer tidak lagi membaca `cost`, `failCost`, atau `successChance` dari action.
  - Harga: `300 × (OVR − 30)^1,5 × (1 + rivalry/100)`, dari OVR sekarang. `asking` saat fighter dibuat tidak dipakai lagi. Biaya gagal tetap 20% harga.
  - Peluang: `60 − rivalry × 0,4 − (OVR − 50) × 2 + selisih reputasi × 0,15` (selisih dibatasi ±10), lalu dibatasi 5–85%. Sebelumnya peluang hanya turun 0,3 poin per OVR.
  - Contoh review (OVR 66, rivalry 0, reputasi sama): sebelumnya sekitar $2.003 dengan peluang 50%, sekarang **$64.800 dengan peluang 28%** (gagal −$12.960). OVR 50: $26.833, peluang 60%. OVR 80: $106.066, peluang 5%.
  - Reducer menolak tanpa memotong kas dan tanpa roll RNG kalau roster penuh (batas `CAMP_TIERS`), kas kurang, atau target cedera/sudah dijadwalkan. Penolakan dicatat di log.
  - Angka harga dan peluang adalah pilihan balancing awal, dipatok kira-kira ke biaya Diamond in the Rough dan kas pemain di harness ekonomi (sekitar $14.000–37.000 di tahun pertama). Bisa dituning lagi di P3.
  - Validasi: test baru `poach.test.js` (9 test; 4 test reducer gagal di reducer lama), dua test lama di `reducer.test.js` disesuaikan agar tidak bergantung pada angka dari action. **819 test aplikasi / 53 file lulus**, build Vite lulus, harness dunia 480 minggu × 5 seed lulus, diff bersih.
  - Kode: `rivals.js`, `index.js`, `reducer/fighter.js`, `app/src/ui/RivalsScreen.jsx`.
  - Digantikan oleh #21: rival camp dibuang, termasuk `poachTerms` dan reducer `POACH_FIGHTER`.

- **22 Oktober 2026: P1 #21 selesai — rival camp dibuang.** Branch `claude/quirky-mccarthy-7jogso`. Keputusan user: konsep rival camp tidak dipertahankan. Satu mekanik kecil tanpa camp disimpan.
  - Alasan teknis, dari kode dan simulasi 480 minggu (seed 1000): `shadow-ai.js` mengembangkan field `level` yang tidak pernah diubah jadi atribut, sehingga label lifecycle salah (camp reputasi 86 berlabel "Decline"). Reputasi rival diubah dua sistem dan mentok sekitar 86 sejak tahun ke-2. Fighter rival tidak pernah menua atau pensiun, dan roster membeku di 8 sejak tahun pertama. Duel rival tetap undian 50/50.
  - Event "rival coba poach" fighter pemain praktis tidak pernah muncul. Syaratnya rivalry > 15, yang hanya tercapai kalau pemain sendiri memancing rival. Diukur: 0 event di harness dunia (480 minggu × 5 seed; 103 cek dengan fighter yang memenuhi syarat) dan 0 di harness ekonomi (960 minggu × 3 seed).
  - Dihapus: `tick/rivals.js`, `shadow-ai.js` dan folder `shadow-ai/`, `rivals.js` (`genRivalCamp`, `poachTerms` dari #20), `RivalsScreen.jsx`, tab dan ikon Rivals, 54 teks i18n `RIVAL.*`/`UI.rival(s)`, reducer `POACH_FIGHTER`, handler `coachPoach`, tag camp (`campId`/`campName`) pada fighter dunia, juara, dan layar Ranking, nudge rivalry camp di `commitResult`, serta bonus grudge karena rivalry camp. `RIVAL_NAMES`/`RIVAL_TRAITS` dihapus; `PROMO_TIERS` dipindah ke `data/promo-tiers.js`.
  - Tetap ada: rivalitas personal antar fighter (`f.rivalries`) beserta bonus grudge match +25% kalau bertemu lawan yang sama dua kali.
  - Pengganti: `tick/outside-offers.js`. Tiap 8 minggu, kalau ada fighter dengan morale < 70, loyalty < 60, kontrak masih berjalan, tidak cedera/terjadwal, dan belum punya tawaran tertunda, peluang 25% muncul event "Camp lain mendekati …" dengan pilihan counter / biarkan pergi / bicara (handler lama). Bonus counter = `asking × 1,25`. Tidak memakai RNG kalau tidak ada fighter yang memenuhi syarat. Frekuensi terukur: 18 event di harness dunia (480 minggu × 5 seed, sekitar 3–4 per 10 tahun per save) dan 0 di harness ekonomi karena pemain skrip menjaga morale tinggi. Angka 25% adalah pilihan awal; bisa dituning di P3.
  - Migrasi save `migrateRemovedRivalCamps`: hapus `g.rivals`, tag camp di daftar divisi, juara, juara tier, booking, dan tawaran inbox, serta prompt coach-poach yang handler-nya sudah tidak ada. Prompt poach fighter lama tetap bisa dijawab. Tidak memakai RNG dan aman dijalankan berulang. Tab "rivals" yang tersimpan di memori UI dibuka sebagai dashboard.
  - RNG dunia bergeser karena tick rival tidak lagi mengambil angka acak. Hasil seed di harness ekonomi ikut berubah (misalnya seed 3222 sebelumnya bangkrut di minggu 345, sekarang bertahan 20 tahun). Ini efek urutan RNG, bukan bukti ekonomi membaik.
  - Test: `shadow-ai.test.js` dan `poach.test.js` dihapus. Test camp di `rankings.test.js`, `fight.test.js`, `media.test.js`, `invariants.test.js`, dan `reducer.test.js` dihapus atau diganti. Test baru `outside-offers.test.js` (7 test) dan blok baru di `rankings.test.js`: tidak ada camp atau tag setelah 10 tahun simulasi, gelar pemain tanpa field camp, grudge dari rivalitas personal tetap 1,25×. Satu test lama di `prestige.test.js` diperbaiki: `newGame()` dipanggil sesudah seed sehingga hanya satu sisi yang menghabiskan RNG; sebelumnya lulus karena kebetulan.
  - Validasi: **762 test aplikasi / 52 file lulus**, build Vite lulus, harness dunia 480 minggu × 5 seed lulus, harness fight lulus, smoke test browser (Chromium, 30 minggu, satu fight penuh, semua tab) lulus tanpa error console, diff bersih.

- **22 Oktober 2026: P1 #22 selesai.** Branch `claude/quirky-mccarthy-7jogso`.
  - Peluang cedera fight dihitung di modul murni baru `fights/injury.js` (`fightInjuryChance`), dipakai `commitResult`.
  - **Damage:** peluang dasar per hasil berlaku pada damage tipikal hasil itu. Pengali `0,5 + 0,5 × damage/referensi`, dibatasi 0,5–2,0. Referensi adalah median damage yang diterima per hasil, diukur dari 6.000 fight engine (OVR 36/51/66, 3 dan 5 ronde). Contoh: kalah KO median 40; p10 11, p90 97. Hasil tanpa angka damage (save lama) memakai peluang dasar.
  - **Fasilitas medis:** pengali `1 − (level − 1) × 0,05`, sama dengan cedera latihan. Level 5 = −20%.
  - **Trait:** Cautious ×0,85 dan Injury Prone ×2, sama dengan cedera latihan. Catatan P0 #3 menyerahkan Cautious ke item ini.
  - **TKO:** engine hanya punya satu finish "KO/TKO", yaitu knockdown yang langsung mengakhiri fight. Tidak ada penghentian wasit terpisah, jadi entri `TKO` (28%) adalah konfigurasi mati dan dihapus. KO/TKO memakai peluang KO.
  - **Doctor stoppage:** key label `"Doctor Stoppage"` diganti `Doctor`, sesuai key yang dipakai kode. Sebelumnya label cedera jatuh ke daftar Decision.
  - Fight Night sekarang mengirim damage dan `attitude` untuk hasil Doctor Stoppage. Sebelumnya keduanya hilang, jadi efek sikap staredown juga terlewat pada hasil ini.
  - Rata-rata peluang cedera per fighter per fight, fasilitas medis level 1, 6.000 fight: **5,60% → 6,02%**. Kenaikan kecil karena distribusi damage condong ke kanan. Dengan fasilitas medis level 2 ke atas, angkanya turun di bawah nilai lama.
  - Validasi: test baru `fight-injury.test.js` (6 test; 2 test roll gagal di kode lama), **768 test aplikasi / 53 file lulus**, build Vite, harness dunia, dan harness fight lulus, diff bersih.
  - Kode: `fights/injury.js` (baru), `fights/commitResult.js`, `data/injury.js`, `data.js`, `app/src/ui/FightNight.jsx`.
  - Masih terbuka: cedera fight tingkat 3 ("Berat") belum memberi kerusakan permanen seperti cedera latihan "Career-Threatening". Temuan baru: cedera latihan itu menampilkan pesan "Karirnya telah berakhir", padahal fighter tetap di roster dan hanya kehilangan 3–8 poin satu atribut. Teks dan perilakunya perlu disamakan; belum dikerjakan. Diskon medis untuk biaya physio di `commitResult` tetap item #24.

- **22 Oktober 2026: P1 #23 selesai.** Branch `claude/quirky-mccarthy-7jogso`.
  - `tick/weight-change.js` sekarang memakai `f.streakW`, kemenangan beruntun yang sudah dirawat `career.js` dan `commitResult`, bukan `record.w` (total kemenangan). Fighter 10-5 yang baru menang sekali tidak lagi dianggap menang 10 kali beruntun. Save tanpa `streakW` dianggap tanpa streak.
  - Validasi: test baru `weight-change.test.js` (3 test, semuanya gagal di kode lama), **771 test aplikasi / 54 file lulus**, harness dunia lulus, diff bersih.
  - Masih terbuka (bagian lain FI7): pemain tidak bisa memulai pindah kelas sendiri. Reducer `CLASS_CHANGE` ada di engine, tapi tidak ada UI yang memanggilnya. Ini keputusan desain/UI, belum dikerjakan.

- **22 Oktober 2026: P1 #24 selesai.** Branch `claude/quirky-mccarthy-7jogso`.
  - Biaya physio cedera fight di `commitResult` memakai `(g.facilities?.medical || 1 - 1)`, yang terbaca sebagai `medical || 0`. Diskonnya jadi `1 − level × 0,05`, satu level lebih besar dari rumus di cedera latihan (`1 − (level − 1) × 0,05`). Contoh: level 1 memberi −5%, padahal seharusnya 0%. Sekarang memakai `medicalInjuryMult(g)` dari `fights/injury.js`, rumus yang sama dengan latihan dan peluang cedera fight (#22).
  - Validasi: test tambahan di `fight-injury.test.js` (level 1, 2, 4; gagal di kode lama), **772 test aplikasi lulus**, diff bersih.
  - Catatan: reducer `RESOLVE_INJURY_CHOICE` memakai `physioCost` dari action (UI meneruskan angka dari pesan inbox buatan engine). Belum diubah.

- **22 Oktober 2026: P1 #25 selesai.** Branch `claude/quirky-mccarthy-7jogso`.
  - Decay relasi promotor tidak lagi mencocokkan teks log. Sebelumnya: kalau ada fighter mana pun yang fight dalam 12 minggu terakhir *dan* ada baris log yang memuat nama tier (misalnya "Local Amateur Circuit" dari scouting), tier itu dianggap aktif. Sekarang modul baru `promoter-activity.js` (`promoterTierActive`) menganggap tier aktif kalau ada fight di tier itu dalam 12 minggu terakhir (`fightHistory[].tier`/`week`) atau booking aktif di tier itu. Settlement dan layar Promotor memakai fungsi yang sama.
  - Batas log disatukan: konstanta `LOG_MAX = 30` di `reducer/constants.js` dipakai `tick()`. Pemotongan terpisah di `useGameState` dihapus. Sebelumnya UI memotong ke 30 dan engine ke 200, jadi harness berperilaku berbeda dari game. 30 dipilih karena itu nilai yang selama ini berlaku di game asli. Band harness dunia mengikuti `LOG_MAX`.
  - Validasi: test baru `promoter-activity.test.js` (4 test; test decay gagal di kode lama), **776 test aplikasi / 55 file lulus**, harness dunia (panjang log 30) dan harness fight lulus, smoke test browser lulus, diff bersih.
  - Masih terbuka (bagian lain DU8, di luar #25): layar Promotor menyebut relasi menentukan peluang bertarung, padahal peluang tawaran tetap 35% per minggu. Relasi juga turun di tier yang belum bisa dijangkau (misalnya Premier untuk camp baru). Kepribadian promotor masuk P2 #35.

- **22 Oktober 2026: integrasi P1 #19–#25 ke `master`.** Atas izin user, `master` di-fast-forward ke `927e0da` tanpa PR. CI untuk hash yang sama di branch sukses, termasuk test server PostgreSQL: https://github.com/maxxsky/mma-manager/actions/runs/39805450400.

- **22 Oktober 2026: P5 #53 dan #54 selesai.** Branch `claude/quirky-mccarthy-7jogso`.
  - **#53:** `getJwtSecret()` tidak lagi punya secret cadangan. Server menolak start kalau `JWT_SECRET` kosong, apa pun `NODE_ENV`-nya, juga kalau isinya placeholder (nilai `.env.example` atau secret lama di kode) atau lebih pendek dari 32 karakter. Pesan error menyertakan perintah untuk membuat secret acak. Konfigurasi vitest server mengisi secret khusus test, jadi CI tetap jalan.
  - **#54:** modul baru `packages/server/src/validation.js`. Register: username 3–32 karakter (huruf, angka, `_ . -`), email berformat `x@y.z` maksimal 254 karakter, password 8 karakter sampai 72 byte (batas bcrypt), semua harus string. Login menolak field yang bukan string sebelum query. `POST /api/fighters` sekarang dibatasi `rosterCap` tier camp (data `CAMP_TIERS` engine, sama dengan single-player). Cek dan insert berjalan dalam satu transaksi dengan baris camp dikunci (`FOR UPDATE`), jadi request paralel tidak bisa melewati batas. Roster penuh → 409.
  - Fixture test server lama disesuaikan (password `"x"`/`"pass"` dan username 1–2 karakter tidak lagi valid).
  - Validasi: test server dijalankan di PostgreSQL 16 lokal. **28 test server lulus** (22 lama, 6 baru; keenam test baru gagal di kode lama), termasuk 10 request paralel ke camp dengan batas 4. `npm test` dari root: 776 test app + 28 test server lulus, diff bersih.
  - Batas: pembuatan fighter di server masih gratis. Server belum punya alur melepas atau pensiun fighter, jadi semua fighter di camp dihitung ke batas roster. Email tidak dinormalisasi (huruf besar/kecil tetap dibedakan, sama seperti sebelumnya).

- **22 Oktober 2026: P2 #26 selesai — ambisi diimplementasikan.** Instruksi user: kerjakan perbaikan berikutnya tanpa menunggu playtest, ikuti saran dokumen, dan merge ke `master` tiap selesai.
  - Modul baru `ambitions.js` (`applyFightAmbition`), dipanggil sekali per fight selesai di `commitResult`, setelah semua perubahan popularitas.
  - `fightsThisYear` bertambah tiap fight selesai (menang atau kalah) dan tetap di-reset tahunan di `tick/yearly.js`. Sebelumnya tidak pernah bertambah.
  - Paycheck: morale +3 tiap fight. Legacy: morale +5 saat mengalahkan lawan ber-ranking atau juara (`booking.oppRank` tidak null). Family Man: morale −10 untuk tiap fight di atas 3 per tahun. Star Power: kenaikan bersih popularitas dari fight ×1,5 (penurunan tidak diperbesar). Angka-angka ini pilihan awal sesuai deskripsi ambisi; bisa dituning di P3.
  - Test baru `ambitions.test.js` (5 test, semuanya gagal di kode lama). Satu fixture lama di `rankings.test.js` dikunci ke ambisi Grinder, karena fighter acaknya ternyata Paycheck dan sekarang mendapat +3 morale.
  - Validasi: `npm test` dari root dengan PostgreSQL lokal: **781 test app + 28 test server lulus**. Build, harness dunia, dan harness fight lulus, diff bersih.

- **22 Oktober 2026: P2 #27 selesai — negosiasi kontrak.**
  - `managerCut` adalah bagian camp dari purse, jadi fighter dan agen ingin nilainya rendah. Rumus peluang terima sudah benar (cut di atas `cutFloor` agen diberi penalti), tapi counter-offer menaikkan cut (`max(floor, cut + 1..3)`), dan cek "tawaran lemah" menganggap cut di *bawah* floor sebagai lemah. Keduanya terbalik. Sekarang counter menurunkan cut 1–3 poin menuju floor (tidak pernah di atas tawaran), dan tawaran lemah = cut di atas floor atau bonus di bawah 85% asking (khusus tanda tangan baru).
  - Logika pindah dari `NegotiateModal.jsx` ke modul engine baru `contracts/negotiation.js`. Reducer baru: `NEGOTIATE_CONTRACT` (validasi + roll), `ACCEPT_COUNTER_OFFER` (menandatangani counter yang disimpan engine, bukan angka dari UI), `CLEAR_NEGOTIATION`. Tawaran di-snap ke opsi layar. Engine menolak tanpa roll kalau roster penuh atau kas kurang. Roll sekarang ikut checkpoint RNG reducer; sebelumnya UI memanggil `random()` langsung. `SIGN_CONTRACT` tetap ada untuk test dan pemanggil internal.
  - Tuas diukur dari kode: exclusivity (−8), rematch (−4), dan biaya medis (−3/−6) tidak dibaca di bagian mana pun dari game, jadi hanya menurunkan peluang terima. Ketiganya dihapus beserta 22 baris i18n. Yang dipertahankan karena berefek nyata: bonus (kas), cut (purse camp), jumlah fight dan durasi (masa kontrak), equity (bagian sponsor fighter). Contoh agen Standard: cut 25% vs 18% −29 poin, bonus 2× asking +22, 8 vs 2 fight +8, equity 20% +30.
  - Layar counter tidak lagi menampilkan "estimasi diterima" palsu (dulu 80–97%, padahal menerima counter selalu berhasil).
  - Validasi: test baru `negotiation.test.js` (11 test). `npm test` dari root: **792 test app + 28 test server lulus**. Build, harness dunia, smoke test browser lulus. Skrip browser tambahan menguji tanda tangan dan counter di game sungguhan: counter atas tawaran 25% menjadi 22%, kontrak tersimpan, `negotiation` bersih setelah modal ditutup, tanpa error console.

- **22 Oktober 2026: P2 #28 selesai — relasi antar fighter dibuang.** Sesuai saran (tidak ada rencana event yang mengubah relasi).
  - `addRel()` tidak pernah dipanggil, jadi semua relasi 0 dan pengali training `relMult` selalu 1. Dihapus: `relationships.js`, export `relKey/getRel/addRel`, `g.relationships` di game baru, `relMult` di training, dan decay relasi di tick chemistry. Save lama: `relationships` dihapus saat load.
  - Bukti tidak ada perubahan perilaku: simulasi 240 minggu × 3 seed menghasilkan hash state (roster, divisi, kas, reputasi, judul inbox) yang identik sebelum dan sesudah.
  - Tidak terpengaruh: kecocokan sparring (`calcSparringMult`) dan rivalitas personal (`f.rivalries`).
  - Validasi: test baru di `removed-systems.test.js`. `npm test` root: **793 test app + 28 test server lulus**. Build dan harness dunia lulus.

- **22 Oktober 2026: P2 #29 selesai — kepribadian coach.**
  - Motivator ("pemulihan morale +20% setelah kalah"): pemulihan morale mingguan menuju 60 naik dari +2 ke +2,4 untuk fighter yang fight terakhirnya kalah (`streakL > 0`). Sebelumnya tidak ada efek; Motivator hanya dipakai di teks rekomendasi dan gelar karier coach.
  - Player's Coach ("popularity gain +15%"): kenaikan bersih popularitas dari fight ×1,15, bertumpuk dengan Star Power (×1,5). Logika Star Power dan Player's Coach disatukan di `ambitions.js`. Chemistry +2/bulan sudah ada sebelumnya. Bonus penemuan talenta (+20% peluang, sudah ada di `talentPool.js` tapi tidak disebut) dipertahankan dan ditambahkan ke deskripsi.
  - Efek Motivator kecil (sekitar +0,4 morale per minggu); angkanya mengikuti deskripsi apa adanya dan bisa dituning di P3.
  - Fixture test lama: `createTestGame` ternyata punya coach Player's Coach. Tujuh test yang menghitung popularitas secara persis (`media.test.js`, `rankings.test.js`) dikunci ke coach Technician.
  - Validasi: test baru `coach-personalities.test.js` (3 test, gagal di kode lama). `npm test` root: **796 test app + 28 test server lulus**. Build dan harness dunia lulus.

- **22 Oktober 2026: P2 #30 selesai — Cutman.** Nutritionist sudah tergabung ke weight cut sejak P0 #6.
  - Cutman sekarang merawat cut di jeda antar ronde: `simRound` mengurangi cut sebanyak `ceil(skill / 3)` poin (skill 2–3: 1, 4–6: 2, 7–9: 3) di akhir tiap ronde yang tidak berakhir finish dan bukan ronde terakhir, *sebelum* pemeriksaan dokter. Berlaku di Fight Night (`cutmanSkillA` dari staf) dan `runFight` headless. Ada komentar "cutman closes the cut". Tanpa RNG. Bonus chin yang sudah ada (bagian "knockdown" dari deskripsi) dipertahankan.
  - **Temuan baru untuk P3:** cut hampir tidak pernah terjadi. Dari 8.000 fight engine (corner neutral), rata-rata tingkat cut di akhir ronde 0,13 (dokter memeriksa di ≥6) dan doctor stoppage 0,01%. Cut hanya berpengaruh lewat pemeriksaan dokter dan pilihan corner AI, jadi seluruh sistem cut (doctor stoppage, corner "target cut"/"stop bleed", cutman) praktis tidak berefek sampai frekuensi cut dituning. Dengan cutman skill 9, rata-rata cut di akhir ronde turun dari 0,13 ke 0,02.
  - Validasi: test baru `cutman.test.js` (3 test). `npm test` root: **799 test app + 28 test server lulus**. Build, harness dunia, dan harness fight lulus.

- **22 Oktober 2026: P2 #31 selesai — janji ke fighter.**
  - Modul baru `promises.js`. "Janji cari fight" mencatat janji dengan tenggat 12 minggu; "Janji upgrade" mencatat fasilitas dan levelnya dengan tenggat 24 minggu. Morale +3/+4 saat berjanji tetap ada. Satu janji terbuka per jenis per fighter.
  - Dicek tiap minggu (`checkPromises` di `tick()`). Ditepati (fighter dapat booking atau fight baru; fasilitas yang dijanjikan naik level): morale +2. Lewat tenggat: fight −10 morale −8 loyalty, upgrade −8 morale −6 loyalty, plus pesan inbox. Label pilihan menyebut tenggat dan akibatnya.
  - Angka akibat adalah pilihan awal; bisa dituning di P3.
  - Validasi: test baru `promises.test.js` (6 test lewat jalur pilihan inbox). `npm test` root: **805 test app + 28 test server lulus**. Build dan harness dunia lulus.

- **22 Oktober 2026: P2 #32 selesai — event chemistry, plus bug dispatch pilihan inbox.**
  - **Bug baru, lebih besar dari #32:** `dispatchEvent` hanya menjalankan handler *pertama* yang cocok dengan kunci pilihan, lalu berhenti. Pilihan dengan lebih dari satu efek kehilangan sisanya. Pemetaan menemukan 18 pilihan terdampak, misalnya: "Bonus retensi $X" (morale +30) dan "Minta maaf + bonus ($3.000)" menaikkan morale **tanpa memotong kas**; "Pesta besar ($5.000, chemistry +8)" dan "Kasih bonus kegiatan tim" **memotong kas tanpa menaikkan chemistry**; semua `chem` pada pilihan yang juga punya `moraleTo`, `complaint`, `coachResignChance`, atau `viralPop` tidak pernah diterapkan. Sekarang semua handler yang cocok dijalankan berurutan, lalu `chem`/`gamble`.
  - Roll gamble dilakukan engine dengan RNG reducer bila `gambleRoll` tidak diberikan. UI tidak lagi memanggil `random()`. `INBOX_EVENT` memakai pilihan yang tersimpan di pesan (berdasarkan `choiceIndex`, lalu label), bukan objek yang dikirim UI.
  - **Konflik sparring:** "Mediasi" (+5) sekarang berbiaya separuh biaya kegiatan tim (`rosterCap × 750 / 2`: $1.500 di Local Gym sampai $9.000 di tier tertinggi). "Pisahkan jadwal" (+2) tetap gratis. Label menyebut angkanya.
  - **Cemburu:** "Beri perhatian khusus" tetap chem +3 (yang kini benar-benar diterapkan) dan morale +6 untuk yang cemburu, tapi fighter bintang −4 morale. `moraleTo` menerima satu atau beberapa target.
  - Validasi: test baru `event-choices.test.js` (7 test; 6 gagal di kode lama). `npm test` root: **812 test app + 28 test server lulus**. Build dan harness dunia lulus. Harness ekonomi berjalan; hasil seed bergeser karena biaya dan efek pilihan sekarang benar-benar diterapkan.
  - Smoke test browser: 12 run, 11 lulus. Satu run (yang pertama) gagal dengan "2 problem(s)", tapi detailnya tidak tersimpan, sehingga penyebabnya belum diketahui. Game di-seed dari jam, jadi tiap run berbeda. Perlu diawasi; kalau muncul lagi, simpan log lengkapnya.
  - Temuan tawaran fight dikerjakan di entri berikutnya.

- **22 Oktober 2026: tawaran fight dibooking dari pesan inbox (temuan saat #32).**
  - `ACCEPT_FIGHT`, `COUNTER_FIGHT`, dan `REJECT_FIGHT` sekarang hanya menerima `messageId` dan membaca semua syarat dari pesan tawaran. Sebelumnya UI menyusun booking sendiri dan **membuang `promotionId` dan `isMainEvent`**. Akibatnya hitungan fight per promotor tidak pernah naik, kontrak eksklusif promotor (butuh ≥2 fight) tidak pernah ditawarkan, sisa fight kontrak eksklusif tidak pernah berkurang, dan narasi "main event" tidak pernah muncul.
  - Counter: roll dilakukan engine (`counterChance` = relasi tier + 20, dibatasi 10–90%; purse ×`1,15 + relasi/200`). Tombol menampilkan peluangnya. Counter ditolak = tawaran batal, seperti sebelumnya. Reject mencopot gelar berdasarkan tawaran (`defense`), bukan flag dari UI.
  - **Bug lanjutan yang tersingkap:** tawaran kontrak eksklusif juga ber-`type: "offer"`. UI merendernya sebagai tawaran fight (Accept/Counter/Reject, bukan "Terima/Tolak"), dan menerimanya membuat booking tanpa lawan yang tidak pernah selesai. Harness ekonomi terkena ini: begitu kontrak eksklusif mulai muncul, ketiga seed bangkrut karena fighter tertahan booking rusak. Sekarang pesan itu ber-`type: "event"` dengan pilihannya sendiri, tetap kedaluwarsa dalam 6 minggu, dan reducer fight menolak pesan tanpa lawan. Save lama dimigrasikan.
  - Harness ekonomi (960 minggu × 3 seed): ketiga seed bertahan 20 tahun. Sebelum perbaikan ini dua bertahan dan satu bangkrut. Kas akhir lebih besar karena bonus purse promotor kini berjalan; ekonomi akhir game memang sudah tercatat terlalu longgar (P3 #39).
  - Validasi: test baru `fight-offer-actions.test.js` (7 test). Tiga test lama disesuaikan agar memakai pesan tawaran. `npm test` root: **819 test app + 28 test server lulus**. Build, harness dunia, dan 3 run smoke test browser lulus.

- **22 Oktober 2026: P2 #33 (bagian penjualan darurat) selesai.** Pinjaman tetap ditunda ke P3 sesuai saran.
  - Pilihan "Potong biaya darurat" di event ambang bangkrut dulu memberi +$25.000 tanpa menjual apa pun, dan bisa diulang setiap kali kas jatuh di bawah batas. Sekarang `applyEmergencySale` (`finance.js`) menjual level fasilitas sungguhan, mulai dari yang tertinggi, masing-masing seharga 50% biaya pembangunannya, sampai kas kembali di atas batas bangkrut + $10.000 atau semua fasilitas di level 1. Label menyebut jumlah level dan uangnya. Kalau tidak ada yang bisa dijual, pilihan itu tidak muncul.
  - **Akibat yang perlu diketahui:** camp yang kesulitan dengan fasilitas masih level 1 kini benar-benar bisa bangkrut di tahun pertama. Sebelumnya uang gratis yang bisa diulang menutupinya. Di harness ekonomi: seed 3222 (camp yang terus kalah, reputasi 2–11, semua fasilitas level 1) bangkrut di minggu 57; dulu bertahan sekitar 7 tahun. **Saran untuk P3:** pinjaman dengan bunga sebagai jaring pengaman awal game, atau tinjau ulang pemasukan camp tier 0.
  - Harness ekonomi: pemain skrip tidak lagi membeli upgrade tier camp dengan uang terakhir (buffer sama dengan fasilitas, $60.000). Dengan itu seed 500 dan 1861 bertahan 20 tahun; 3222 bangkrut seperti dijelaskan di atas.
  - Validasi: test baru `emergency-sale.test.js` (3 test). `npm test` root: **822 test app + 28 test server lulus**. Build dan harness dunia lulus.

- **22 Oktober 2026: P2 #34 selesai — pengali mentor dibuang.**
  - `calcMentorBonus` memberi +1% per veteran, maksimal +3%, ke semua gain training secara otomatis dan tanpa tampilan. Syaratnya sangat longgar (usia 30+ atau 15+ fight, dan lebih senior dari trainee). Daftar pangkas di review menyarankan mempertahankan pengali yang dikontrol pemain dan membuang atau menampilkan sisanya. Karena mentor tidak dikontrol pemain dan efeknya nyaris tak terasa, pengalinya dihapus.
  - Event cerita "veteran membimbing rookie" (chemistry +4, `events/generators/rebuilding.js`) tetap ada karena terpisah dari pengali ini.
  - Efek: gain training turun paling banyak 3% untuk camp yang punya veteran. Tanpa RNG; harness dunia lulus.
  - Validasi: test di `removed-systems.test.js`. `npm test` root: **823 test app + 28 test server lulus**. Build lulus.

- **22 Oktober 2026: P2 #35 selesai — kepribadian promotor diberi efek.**
  - Sebelumnya kepribadian hanya sedikit memengaruhi promotor mana yang dipasang ke tawaran. Sekarang `promotionOfferTerms` menerapkan efek sekali, saat promotor dipasang ke tawaran fight: High Roller purse +20% dan tawaran kedaluwarsa dalam 2 minggu (kecuali mandatory defense); Grassroots +10% untuk fighter unranked; Talent Focused +10% untuk fighter ber-ranking; Old School +10% untuk pemegang sabuk. Deskripsi kepribadian menyebut efeknya, dan Inbox menampilkan catatan purse.
  - Pemasangan promotor di akhir tick dan untuk mandatory defense sekarang meneruskan fighter, rank, dan streak. Sebelumnya konteksnya kosong, sehingga pembobotan Grassroots selalu aktif.
  - Efek "tipe lawan" dari saran tidak dikerjakan; efek purse dipilih karena sederhana dan langsung terlihat.
  - Validasi: test baru `promoter-personality.test.js` (3 test). `npm test` root: **826 test app + 28 test server lulus**. Build dan harness dunia lulus; harness ekonomi sama seperti sebelumnya (500 dan 1861 bertahan, 3222 bangkrut minggu 56).

- **22 Oktober 2026: P2 #36 selesai — Injury Prone.**
  - Koreksi atas FI4: trait ini sebenarnya bisa didapat (setelah 4 cedera serius), tapi pengecekannya hanya berjalan di cabang cedera latihan. Kalau cedera serius ke-4 terjadi di fight, trait baru diberikan pada cedera latihan berikutnya, atau tidak sama sekali.
  - `checkInjuryProne` (`fights/injury.js`) dipanggil setelah cedera latihan maupun cedera fight. Ambang tetap 4 (`INJURY_PRONE_SERIOUS_INJURIES`). Efeknya ×2 risiko di latihan dan, sejak #22, di fight.
  - Trait ini tidak ada di tabel deskripsi `TRAITS`, jadi tooltip-nya kosong. Ditambahkan tabel `ACQUIRED_TRAITS` (trait yang didapat selama karier, tidak di-roll saat fighter dibuat), dipakai tooltip di detail fighter.
  - Validasi: test baru `injury-prone.test.js` (2 test; test cedera fight gagal di kode lama). `npm test` root: **828 test app + 28 test server lulus**. Build dan harness dunia lulus.

- **22 Oktober 2026: P2 #37 selesai — `SET_SPONSOR` lama dihapus.** Aksi ini tidak dipanggil dari mana pun dan menulis ke field lama `g.sponsor` (sistem sponsor sekarang memakai `g.sponsors`, dan save lama sudah dimigrasikan). Test di `removed-systems.test.js`. `npm test` root: 829 test app + 28 test server lulus.
- **Seluruh P2 selesai** (dengan #33 bagian pinjaman ditunda ke P3). Berikutnya P3 (balancing).

- **22 Oktober 2026: P3 #40 selesai — grade scout per metode, scouting pindah ke engine.**
  - Grade laporan dulu hanya dari reputasi (S di rep ≥60), dan reputasi mencapai 100 dalam 2–4 tahun, jadi semua laporan cepat menjadi grade S (angka persis). Sekarang `scoutGradeFor` = yang lebih rendah dari grade reputasi dan batas metode: Local maksimal B, Regional maksimal A, National maksimal S, Diamond in the Rough maksimal A. Kartu metode menampilkan grade yang akan didapat.
  - Modul baru `scouting.js`: daftar metode (biaya, level, batas grade), cek blokir (roster penuh, kas kurang, Diamond terkunci), dan `runScout` yang membuat prospek, laporan, dan alasan pindah untuk Diamond. Reducer `SCOUT` hanya menerima `methodId` dan filter. Sebelumnya `App.jsx` membuat fighter, laporan, grade, dan biaya lalu mengirimnya apa adanya, dengan roll RNG di luar reducer.
  - **Temuan, belum dikerjakan:** deskripsi tier "Elite MMA Factory" menjanjikan "Scout otomatis per bulan", tapi tidak ada kode yang menjalankannya.
  - Validasi: test baru `scouting.test.js` (5 test). `npm test` root: **834 test app + 28 test server lulus**. Build, harness dunia, 2 run smoke test, dan skrip browser Scout → Negosiasi lulus tanpa error console.

## Urutan kerja yang disarankan

1. P0 #1–#7 dan P1 #8–#18 selesai; seluruh commit sudah digabung ke master melalui `f672cbc`. P1 #19–#25 selesai di branch `claude/quirky-mccarthy-7jogso` (#21: rival camp dibuang). Seluruh P1 selesai.
2. P1 #19–#25 sudah di `master` (`927e0da`). P5 #53–#54 juga sudah di `master`. Atas instruksi user, P2 dikerjakan tanpa menunggu playtest, mengikuti kolom saran; tiap item langsung di-merge ke `master`.
3. Mainkan beberapa jam setelah bug state utama selesai; tandai temuan yang sudah terbantu dan yang masih bisa direproduksi.
4. Putuskan P2 dan daftar pangkas.
5. P3, lalu P4, lalu P6.
6. Backend (#55–#58) setelah Fase 1 terasa proper dan ada playtester.
