# Review IronFist (MMA Manager)

- Tanggal review: 21–22 Oktober 2026
- Repo: github.com/maxxsky/mma-manager, commit terakhir d35e6af (17 Agustus 2026)
- Cara review: baca kode, jalankan test + harness balance/economy + smoke, simulasi ribuan fight dengan engine, dan 1 fight dimainkan lewat otomasi browser. Belum dimainkan manual berjam-jam.
- Urutan perbaikan ada di file terpisah: [Prioritas Perbaikan IronFist.md](Prioritas%20Perbaikan%20IronFist.md). Setiap temuan di bawah punya kode (misalnya `FT1`) yang dipakai di file itu.

## Rating keseluruhan: 4,5/10

Fondasi teknis dan cakupan fitur sudah sekelas game indie serius. Masalah utamanya di hasil fight: simulasi fight punya bias dan bug, jadi sistem lain (training, kontrak, ekonomi) ikut kehilangan arti. Di luar fight, banyak sistem yang tampil di layar tetapi tidak berfungsi sesuai deskripsinya (sponsor, undo, pencapaian, ambisi, relasi, weight cut).

Riwayat rating: 5,5 (21 Oktober) → 5 (setelah temuan sponsor, undo, pencapaian) → 4,5 (setelah temuan sabuk Regional, ranking, scouting).

## Rating per bagian

| Area | Bagian | Rating | Alasan singkat |
|---|---|---|---|
| Fight | Simulasi fight | 5 | Model posisi, cut, knockdown, submission dalam, tapi bias besar |
| Fight | Fight Night | 5 | Alur staredown sampai hasil bagus, tampilan banyak yang salah |
| Fight | Cedera fight | 5 | Peluang masuk akal, tapi tidak bergantung damage dan tidak pernah mengakhiri karier |
| Fight | Instruksi corner | 3 | Satu pilihan selalu paling unggul |
| Fighter | Identitas fighter (region, julukan) | 7 | Tiap region punya kecenderungan archetype, trait, ambisi, bonus atribut |
| Fighter | Training & progresi | 6 | Ceiling, overtraining, umur. Tapi 11 pengali ditumpuk, intensitas Hard jebakan |
| Fighter | Karier, pensiun, mentor | 5 | Pilihan pensiun bagus. Mentor maksimal +3%, tidak terasa |
| Fighter | Pindah kelas berat | 5 | Permintaan fighter beralasan. Pemain tidak bisa memulai; hitungan beruntun salah |
| Fighter | Traits & ambisi | 4 | Trait sebagian besar berfungsi, 3 dari 6 ambisi tidak |
| Fighter | Chemistry & relasi | 3 | Event chemistry punya jawaban gratis terbaik; relasi antar fighter tidak pernah bertambah |
| Camp | Fasilitas | 6 | +6%/level training, ruang medis kurangi cedera latihan. Bug kecil rumus diskon medis |
| Camp | Coach | 4 | Spesialisasi dan gaji jalan. 2 dari 4 kepribadian tidak sesuai deskripsi |
| Camp | Staf | 3 | Sports Psych berfungsi. Cutman dan Nutritionist tidak |
| Camp | Scouting | 3 | Layar Pencari membocorkan atribut asli |
| Camp | Perburuan fighter rival | 2 | Murah, peluang hampir tidak bergantung kekuatan, reducer percaya angka dari UI |
| Dunia | Event & narasi | 5 | Arsitektur bagus (flag, memori, konsekuensi tertunda). Isi tipis dan berulang |
| Dunia | Promotor & tawaran fight | 5 | Tangga gelar, purse, streak, short notice bagus. Lawan ranked cuma nama |
| Dunia | Ranking & gelar | 3,5 | Sabuk Regional merebut sabuk dunia; urutan engine beda dengan layar |
| Dunia | Rival camp AI | 3 | Dua sistem menggerakkan rival yang sama, duel antar rival lempar koin |
| Ekonomi | Kontrak | 5 | Banyak tuas negosiasi, logika di UI, counter-offer terbalik |
| Ekonomi | Prestise | 5 | Rumus rapi, tapi target (sekitar 50 di tahun ke-10) meleset jauh |
| Ekonomi | Ekonomi umum | 4 | Late game kebanjiran uang dan reputasi |
| Ekonomi | Pinjaman & penjualan darurat | 3 | Pinjaman tidak ada; penjualan darurat tanpa aset |
| Ekonomi | Sponsor | 2 | Menerima sponsor justru menurunkan pemasukan |
| Meta | Dinasti & Hall of Fame | 7 | Rekor kumulatif dan arsip alumni matang. Ambang Hall of Fame rendah |
| Meta | Save/load/backup | 4 | 3 slot dan backup ada. Undo rusak, RNG dunia tidak disimpan |
| Meta | Pencapaian | 2 | 6 dari 14 tidak pernah bisa terbuka |
| UI | Kontras warna | 8 | Hampir semua lolos WCAG AA, kecuali merah di panel terang |
| UI | Performa | 8 | Bundle 555 KB (169 KB gzip), sekitar 0,5 ms per minggu, memori sekitar 7 MB |
| UI | UI/UX umum | 6 | Rapi, prioritas mingguan jelas, bahasa campur aduk |
| UI | Onboarding | 5 | Checklist dan tips ada, tapi berbahasa Inggris dan sebagian salah |
| UI | Tampilan HP | 5 | Responsif, tapi tombol Maju Minggu tersembunyi di menu |
| UI | Aksesibilitas | 4 | 12 label navigasi berisi key mentah, bahasa halaman "en" |
| Teknis | Fondasi teknis | 8 | 597 test lolos, CI, RNG pakai seed, engine terpisah dari UI |
| Teknis | Keamanan backend | 5 | bcrypt, rate limit, JWT. Secret cadangan di kode, pembuatan fighter tanpa batas |
| Teknis | Backend server | 4 | Transaksi DB dan auth ada. Sisi B diabaikan, resolve dobel |
| Teknis | Dokumen proyek | 4 | Sekitar 90 dokumen dari Juli, sudah tidak cocok dengan kode |
| Teknis | Kualitas test | 3 | Engine tercakup 67%, UI/hook hampir 0%. Test cek bentuk data, bukan kebenaran hasil |
| Teknis | Skema database server | 3 | Belum siap untuk multiplayer |

## Temuan per area

Status: **diuji** = dibuktikan dengan simulasi atau menjalankan kode; **dicek** = dibaca langsung di kode; **dugaan** = belum diukur.

### Fight (FT)

- **FT1. Keputusan juri cuma lihat ronde terakhir** (diuji). Dari 4.000 simulasi, 11,3% kemenangan angka diberikan ke fighter yang kalah jumlah ronde. Ronde terakhir yang poinnya seri otomatis dimenangkan pemain.
  - Lokasi: `packages/engine/src/fight.js` (`runFight`, bagian `if (!winner)`; `simRound` return `ptsA >= ptsB ? "A" : "B"`), `app/src/ui/FightNight.jsx` (`processResult` memakai `roundLog` ronde terakhir).
- **FT2. Sisi pemain diuntungkan** (diuji). Dua fighter identik: sisi pemain menang 56,6% tanpa instruksi corner, 70% kalau selalu "push the pace", 44,3% kalau selalu "save". Lawan tidak punya game plan maupun corner.
  - Lokasi: `simRound` hanya membaca `planA`/`cornerA`; `drainB` tanpa modifier plan/corner.
- **FT3. Trait lawan sebagian diabaikan** (dicek). Warrior, Explosive, dan Cautious hanya dihitung untuk sisi pemain.
- **FT4. Archetype timpang** (diuji). OVR setara (selisih ≤3), 4.000 fight: Muay Thai 72,8%, Boxer 53,9%, Wrestler 49,9%, All-Rounder 40,1%, BJJ Specialist 34,7%. Head-to-head (sisi ditukar bergantian, sekitar 1.100–1.400 fight per pasangan):
  - Muay Thai vs BJJ: Muay Thai 80%
  - Muay Thai vs Wrestler: Muay Thai 77%
  - Wrestler vs BJJ: Wrestler 59%
  - Boxer vs Wrestler: Wrestler 53%
- **FT5. Pilihan corner tidak berarti** (diuji). "Push the pace" selalu terbaik. "Work the body" hasilnya sama persis dengan tanpa instruksi di 3.000 simulasi. Ronde 1 selalu dipaksa "go".
- **FT6. Weight cut hampir tanpa efek** (dicek). Penalti "−X% stamina cap" cuma tampil di layar penimbangan, tidak masuk ke simulasi. Pilihan catchweight setelah gagal timbang tidak berdampak; hanya "batal" yang berdampak (rep −4).
- **FT7. Cedera fight** (dicek).
  - Peluang cedera tidak bergantung pada damage yang diterima.
  - Cedera fight tidak pernah mengakhiri karier (cedera latihan bisa).
  - Kalah TKO selalu memakai peluang KO; peluang TKO 28% tidak pernah dipakai.
  - Doctor stoppage memakai label cedera "Decision" karena key tidak cocok.
  - Fasilitas medis tidak mengurangi peluang cedera fight.

### Fight Night (FN)

- **FN1. Statistik STR/TD selalu 0** (diuji). State `totalLandA/B` dan `totalTdA/B` di `FightNight.jsx` tidak pernah di-set.
- **FN2. "Fight of the Night $50K" palsu** (dicek). Muncul di setiap kemenangan (`app/src/components/fight/ResultScreen.jsx:49`, `result.won ? "$50K"`); uangnya tidak pernah masuk ke kas.
- **FN3. Cerita tarung bisa bertentangan dengan komentar ronde** (terlihat di 1 fight; penyebab belum diselidiki).
- **FN4. Komentar fight** berbahasa Inggris walau UI Bahasa Indonesia; timestamp ada yang mundur ([0:05] lalu [0:00]).

### Fighter (FI)

- **FI1. Training sulit dipahami dan intensitas Hard jebakan** (dicek). 11 pengali ditumpuk. Hard: gain 1,4× Medium, risiko cedera 4× (0,08 vs 0,02 per minggu). Dari angka dasar, peluang cedera pengakhir karier sekitar 19%/tahun di Hard vs sekitar 5%/tahun di Medium.
- **FI2. Relasi antar fighter mati** (dicek). `addRel()` tidak pernah dipanggil. Nilai relasi selalu 0, jadi pengali relasi di training selalu 1. GDD menandainya ✅.
- **FI3. 3 dari 6 ambisi tidak berfungsi** (dicek). Paycheck (morale naik tiap fight), Legacy (morale naik saat kalahkan lawan ranked), Family Man (maks 3 fight/tahun; `fightsThisYear` tidak pernah bertambah). Star Power hanya separuh (bonus popularitas +50% tidak ada).
- **FI4. Trait "Injury Prone"** dicek di training tapi tidak pernah bisa didapat fighter (dicek).
- **FI5. Janji ke fighter gratis** (dicek). "Janji cari fight" dan "Janji upgrade" langsung menaikkan morale tanpa dicatat; tidak ada akibat kalau diingkari.
- **FI6. Mentor** maksimal +3%, praktis tak terasa (dicek).
- **FI7. Pindah kelas** (dicek). `packages/engine/src/tick/weight-change.js` mengisi "kemenangan beruntun" dengan `record.w` (total menang) kalau fight terakhir menang. Fighter 10-5 yang baru menang sekali dianggap menang 10 kali beruntun. Pemain juga tidak bisa memulai pindah kelas sendiri.
- **FI8. Event chemistry punya jawaban gratis terbaik** (dicek). "Konflik sparring": Mediasi +5 chemistry tanpa biaya, lebih baik dari "Pisahkan jadwal" (+2) dan opsi untung-untungan. "Cemburu": "Beri perhatian khusus" +3 chemistry +6 morale gratis.

### Camp (CA)

- **CA1. Scouting membocorkan data asli** (dicek). OVR prospek di layar Pencari dihitung dari atribut asli, dan warna nilai atribut juga memakai angka asli. Selain itu grade scout bergantung reputasi, yang sudah mentok 100 di tahun 2–4, jadi semua laporan cepat jadi grade S (akurasi sempurna).
- **CA2. Staf** (dicek). Cutman cuma menambah chin, bukan mengurangi cut. Nutritionist praktis tidak berguna karena penalti weight cut tidak berlaku (FT6). Sports Psych berfungsi.
- **CA3. Kepribadian coach tidak sesuai deskripsi** (dicek). Motivator ("pemulihan morale +20% setelah kalah") tidak diterapkan di hasil fight. Player's Coach ("popularitas +15%") tidak diterapkan; yang ada malah bonus penemuan talenta.
- **CA4. Fasilitas medis** (dicek). Rumus diskon medis di `packages/engine/src/fights/commitResult.js` beda 1 level dengan tempat lain.
- **CA5. Perburuan fighter rival bisa dieksploitasi** (diuji).
  - Harga dihitung dari `asking` saat fighter dibuat dan tidak pernah naik walau fighter makin kuat. Peluang sukses hanya turun 0,3% per poin OVR.
  - Contoh bulan ke-8: fighter rival OVR 66 bisa dibajak seharga $2.003 dengan peluang 50% (gagal cuma rugi $401), sementara fighter sendiri masih OVR 32–39.
  - Reducer `POACH_FIGHTER` (`packages/engine/src/reducer/fighter.js:113`) memakai biaya, peluang, dan cek slot dari UI tanpa memeriksa ulang; batas roster tidak dicek di engine.

### Dunia & kompetisi (DU)

- **DU1. Menang sabuk Regional merebut sabuk juara dunia divisi** (diuji). Di `commitResult.js`, semua kemenangan title fight (tier apa pun) menjadikan fighter pemain juara divisi. Setelah itu muncul kewajiban mandatory defense tier Major.
  - Akar: `design/CHAMPIONSHIP_SYSTEM_SPEC.md` sengaja mendesain satu sabuk per divisi. Tangga Regional/National/Minor ditambahkan belakangan di atas struktur itu, sehingga semua tier jatuh ke sabuk yang sama.
- **DU2. Peringkat di engine tidak sama dengan di layar** (diuji). Layar Ranking mengurutkan berdasarkan poin, engine memakai posisi array yang tidak pernah diurutkan. Setelah 5 tahun: list #1 tampil #6 di layar, list #5 tampil #11. Tawaran "vs #5", lawan perebutan gelar, penantang juara AI, dan pengganti juara yang pensiun semuanya dipilih dari urutan yang salah.
- **DU3. Poin ranking AI mentok di batas 120** (diuji). Jitter mingguan rata-rata +2, jadi dalam sekitar 1 tahun 5 besar sudah berkisar 113–120. Peringkat atas jadi acak.
- **DU4. Rotasi tahunan memensiunkan prospek terbaru** (dicek). `tickRankings` (`packages/engine/src/tick/rankings.js`) membuang 3 entri terakhir array, yaitu prospek yang baru masuk tahun sebelumnya.
- **DU5. Lawan ber-ranking tidak punya identitas tetap** (dicek). Fighter dunia hanya disimpan sebagai angka level. Tiap tawaran membuat fighter acak baru dengan nama si ranked fighter, lalu label archetype ditimpa tanpa membuat ulang atributnya.
- **DU6. Rival camp digerakkan dua sistem** (dicek). `tick/rivals.js` (mingguan) dan `shadow-ai.js` (kuartalan) men-tick rival yang sama. Duel rival vs rival 50/50 tanpa melihat skill. Fighter rival melatih semua 8 atribut gratis tiap minggu.
- **DU7. Juara AI terlalu sering ganti** (diuji). Dalam 8 bulan pertama, 3 dari 8 divisi sudah berganti juara dunia.
- **DU8. Relasi promotor** (dicek).
  - Decay mencocokkan teks log (`g.log.some(l => l.includes(t))`); rapuh karena teks bisa kebetulan cocok.
  - Log dipotong beda: UI 30 baris tiap minggu, engine 200. Relasi promotor jadi berperilaku beda antara game asli dan harness.
  - Layar Promotor bilang relasi menentukan peluang bertarung, padahal peluang tawaran tetap 35% per minggu; relasi hanya memengaruhi purse dan main event.
  - Relasi turun di semua tier, termasuk Premier yang belum bisa dijangkau camp baru.
  - Kepribadian promotor cuma memengaruhi nama promotor di tawaran.
- **DU9. Event berulang** (diuji). Simulasi 3 × 5 tahun: 1.644 pesan dari sekitar 50 template. "Division Shake-up" muncul sekitar 20 kali per tahun dan sering dobel dengan "New Champion".

### Ekonomi (EK)

- **EK1. Ekonomi meledak di late game** (diuji dengan harness). Reputasi mentok 100 di tahun 2–4, kas tembus jutaan dolar di tahun 6–8, prestise mentok 100 sekitar tahun 16 (target desain sekitar 50 di tahun ke-10; bug DU1 ikut menggelembungkannya). Catatan: bot harness sederhana dan harness pernah kena bug.
- **EK2. Sponsor menurunkan pemasukan** (diuji). Tanpa sponsor, pemasukan dasar = min(rep, 30) × $500, maksimal $15.000/bulan. Begitu menerima satu sponsor, angka dasar diganti tarif sponsornya. Di rep 40: tanpa sponsor $15.000; 1 sponsor $400; 3 sponsor (maksimal) $1.050.
  - Lokasi: `computeMonthlyIncome` di `packages/engine/src/economy.js:46`.
- **EK3. Kontrak** (dicek). Saat negosiasi gagal, agen minta potongan camp lebih besar (merugikan kliennya sendiri). Logika negosiasi ada di `app/src/ui/NegotiateModal.jsx`, bukan di engine. Dari 7 tuas, kemungkinan cuma 3–4 yang terasa (dugaan dari rumus, belum diukur).
- **EK4. Pinjaman tidak ada** (dicek). GDD v4 menandainya ✅, tapi `g.loan` hanya tersisa di komentar tipe data. Penjualan darurat cuma +$25.000 tanpa aset yang benar-benar dijual.
- **EK5. Fungsi sponsor lama mati** (dicek). Aksi `SET_SPONSOR` (`packages/engine/src/reducer/camp.js:47`) tidak pernah dipanggil dari UI dan masih menulis ke field lama `g.sponsor`.

### Meta & save (SV)

- **SV1. Undo tidak berfungsi** (diuji). `up()` di `app/src/hooks/useGameState.js` menghapus `_undoStack` sebelum setiap aksi, jadi Undo selalu menemukan tumpukan kosong.
- **SV2. RNG dunia tidak disimpan** (dicek). Seed diambil dari jam saat halaman dibuka, jadi reload mengubah hasil minggu berikutnya (cedera, tawaran). Pemain bisa save-scum.
- **SV3. Migrasi save tanpa nomor versi** (dicek).
- **SV4. 6 dari 14 pencapaian tidak bisa didapat** (dicek). FightNight memanggil `done()` tanpa konteks fight, sehingga First Blood, Knockout Artist, Submission Specialist, dan gelar pertama tidak pernah terbuka. Konteks `koStreak` dan `signedSProspect` tidak pernah dikirim dari mana pun.
- **SV5. Ambang Hall of Fame rendah** (dicek). 10 menang + sabuk Regional sudah cukup.

### UI & bahasa (UI)

- **UI1. Bahasa campur** (dicek).
  - Komentar fight, berita dunia, halaman Dunia, halaman Pencapaian, onboarding, dan teks siklus latihan berbahasa Inggris.
  - Sekitar 400 judul/isi pesan di engine tidak lewat sistem terjemahan, jadi tombol ganti bahasa tidak mengubahnya.
- **UI2. Label bocor dan aksesibilitas** (dicek).
  - "UI.DIVISION" di layar Pencari; filter archetype berlabel "Kelas Berat".
  - 12 tombol navigasi punya aria-label berupa key mentah ("UI.dashboard").
  - `app/index.html:2` memakai `lang="en"` padahal UI Bahasa Indonesia.
- **UI3. Label salah** (dicek).
  - Halaman Fasilitas berjudul "STAF".
  - Pemasukan dasar dari reputasi dilabeli "Biaya Penempatan" di Keuangan.
  - Pencapaian "Hot Streak" berdeskripsi "Win 5 fights total" (bukan beruntun).
  - Layar Dinasti: "Warisan Tertinggi $0", padahal legacy itu poin.
  - Layar Detail Fighter: "Coach Basic ()" dengan kurung kosong.
- **UI4. Tips onboarding salah** (dicek). Tips cedera bilang Medical Room mempercepat pemulihan (di kode tidak). Tips sponsor bilang sponsor menambah pemasukan (lihat EK2). Hint "Click 'Advance Week'" padahal tombolnya "Maju Minggu".
- **UI5. Tampilan HP** (diuji). Tombol Maju Minggu ada di dalam menu tersembunyi; shortcut spasi tidak ada di HP.
- **UI6. Nama kembar** (diuji). Nama staf dan coach diambil dari daftar 10 nama (contoh: Cutman dan Sports Psychologist sama-sama "R. Vasquez").
- **UI7. Kontras** (diuji). Warna merah (neg) di panel terang 3,9–4,3:1, di bawah WCAG AA 4,5:1.

### Backend (BE)

Frontend saat ini tidak memanggil server sama sekali.

- **BE1. Backend mewarisi bias fight** (dicek). `packages/server/src/services/resolveFight.js` hanya memakai plan dan corner sisi A; pilihan sisi B disimpan tapi diabaikan. Di PvP, yang booking selalu diuntungkan.
- **BE2. Fight bisa di-resolve dobel** (dicek). Cek status "pending" dilakukan di luar transaksi, sedangkan route manual dan scheduler bisa me-resolve fight yang sama.
- **BE3. Booking PvP tanpa persetujuan lawan** (dicek).
- **BE4. Secret JWT cadangan di kode** (dicek). Kalau server jalan tanpa `NODE_ENV=production` dan tanpa `JWT_SECRET`, token ditandatangani dengan secret yang tertulis di kode, sehingga token bisa dipalsukan.
- **BE5. Validasi input lemah** (dicek). `POST /api/fighters` membuat fighter gratis tanpa batas. Tidak ada validasi panjang password atau format email.
- **BE6. Skema database** (dicek).
  - Tidak ada kolom untuk ceilings, gelar, poin ranking, potensi, jadwal fight, dan puluhan field lain yang dipakai single-player.
  - Default `record` memakai key `wins/losses/kos/subs`, kode memakai `w/l/ko/sub/dec`.
  - Tidak ada index untuk kolom yang sering dicari (camp_id, status fight).
  - `camps.user_id` tidak unik, padahal semua route hanya mengambil camp pertama.
  - Belum ada tabel versi migrasi.

### Test & dokumen proyek (PR)

- **PR1. Kualitas test** (diuji dengan coverage v8). Engine 67%, layar UI sekitar 4% dari file yang dimuat, hook 0%. FightNight, useGameState, dan NegotiateModal 0%. Bug FT1, FN1, FN2, SV1, dan SV4 semuanya ada di lapisan yang tidak dites. Test fight umumnya mengecek "pemenangnya A atau B" dan determinisme, bukan siapa yang seharusnya menang. CI tidak menjalankan harness balance/economy maupun smoke test.
- **PR2. README usang** (dicek). Bagian "Project Structure" menyebut lokasi engine lama (sekarang `packages/engine`), 5 tier camp (kode punya 7), dan "Full EN ↔ ID" padahal bahasa masih campur.
- **PR3. GDD v4 tidak cocok dengan kode** (dicek). GDD dan tabel status implementasinya dibuat 5 Juli 2026, sebelum seluruh 411 commit. Contoh ✅ yang tidak berfungsi: weight cut (FT6), pinjaman (EK4), relasi (FI2). GDD sendiri memperingatkan bahwa ✅ berarti "ada di kode", bukan "berfungsi". 6 hal di "Hal yang belum diputuskan" masih terbuka; bahasa game (poin 1) paling terlihat dampaknya.
- **PR4. Dokumen lama menyesatkan** (dicek). Sekitar 90 file, sekitar 26.000 baris, hampir semua 6–23 Juli.
  - 16 audit kepatuhan desain menyatakan kepatuhan sekitar 95%, dan audit pra-rilis (10 Juli) menilai Core Gameplay "A (90%), balanced". Audit menilai dari membaca kode, bukan mengukur perilaku, sehingga FT1, FT2, EK2, dan DU1 tidak tertangkap.
  - `docs/audit/archetype-balance.md` memprediksi BJJ unggul atas Muay Thai (60%) dan Wrestler (58%); hasil terukur sebaliknya (lihat FT4).
  - Laporan balance Task 70 (14 Juli) mencatat semua archetype 45–55% (Muay Thai 54,7%, BJJ 51,9%). Kode fight hampir tidak berubah sejak itu; penyebab selisih dengan FT4 belum ditelusuri.
  - Yang masih berguna: riwayat simulasi balance (v2–v27), `CONSTRAINTS.md`, dan spesifikasi championship.
- Catatan: test server gagal di lingkungan review hanya karena tidak ada Postgres, bukan bug kode.

## Fitur yang sebaiknya dipangkas atau digabung

Penilaian desain dari review kode, belum dari main langsung. Saran: sembunyikan atau matikan dulu, mainkan beberapa jam, baru putuskan hapus.

| Fitur | Saran |
|---|---|
| Dua sistem rival camp (DU6) | Pertahankan satu, sebaiknya yang memakai fight engine sungguhan |
| Angka status camp: Reputasi, Prestise, Legacy, Tier Camp, Identitas Dinasti, Pencapaian | Semua mengukur hal mirip. Gabungkan jadi 1–2 |
| Pengali training tak terlihat: kecocokan sparring, relasi, perhatian pelatih, mentor | Pertahankan yang bisa dikontrol pemain (program, intensitas, pelatih, fasilitas); buang atau tampilkan sisanya |
| Relasi antar fighter (FI2) | Implementasikan dengan event yang mengubah relasi, atau hapus |
| Mentor (FI6) | Perbesar dan tampilkan efeknya, atau buang |
| Ambisi yang tidak berfungsi (FI3) | Implementasikan atau hapus dari daftar |
| Tuas negosiasi kontrak yang efeknya kecil (EK3) | Ukur dulu, lalu buang yang tidak terasa |
| Equity dan investor | Memotong pemasukan padahal masalahnya kelebihan uang |
| Relasi promotor per tier (DU8) | Sederhanakan atau ganti dengan reputasi |
| Kepribadian promotor (DU8) | Beri efek nyata (purse, tipe lawan) atau buang |
| Nutritionist (CA2) | Gabungkan ke weight cut setelah penaltinya berlaku, atau buang |
| Fight Legacy Museum ($300K, kosmetik) | Tidak berguna sebagai pengurang uang karena kas late game puluhan juta |
| Folder dokumen lama (PR4) | Arsipkan; pertahankan yang masih dipakai |
| Backend server | Jangan dibuang: GDD v4 menetapkan arah multiplayer gaya Top Eleven. Tahan pengembangannya sampai fight jujur, karena server memakai fight engine yang sama |

Jangan dibuang: fight engine, Fight Night, scouting, cedera, aging, ranking.

## Koreksi atas versi awal review

- Weight cut awalnya disebut "sudah ada". Yang benar: tampilannya ada, efek mekanisnya hampir tidak ada (FT6).
- Backend awalnya disarankan dibekukan atau dibuang. Diluruskan: backend sesuai arah multiplayer di GDD v4. Masalahnya, Fase 2 sudah dimulai padahal Fase 1 belum "terasa proper" dan belum ada playtester.
- Scouting awalnya dinilai 6, turun ke 3 setelah ditemukan kebocoran data (CA1).
- Ranking awalnya dinilai 6,5, turun ke 3,5 setelah DU1–DU4.
- Event & narasi awalnya dinilai 6, turun ke 5 setelah DU9.

## Belum direview

- Main manual dalam waktu lama (pacing, rasa progresi, kebosanan). Perlu dimainkan langsung.
- Isi tiap dokumen di `docs/`, `audits/`, `knowledge/`, `skills/`, dan `engineering/` tidak dibaca kata per kata; yang dicek adalah tanggal, kesimpulan, dan klaim yang bisa diuji.
