# IronFist — GDD v4.1 dan status implementasi

Diperbarui 23 Oktober 2026. Arah produk: manajemen camp MMA single-player,
berbasis state dan cerita emergen. Rencana multiplayer tetap ada, tetapi backend
#55–#58 ditunda atas instruksi user. Dokumen ini menggantikan status audit kode
5 Juli; [blueprint asli disimpan utuh](docs/archive/2026-07/GDD_v4_original.md).

## Cara membaca status

- ✅: perilaku implementasi memiliki bukti tes atau simulasi yang disebutkan.
- 🟡: sebagian ada, batas perilakunya dijelaskan; bukan janji fitur lengkap.
- Dipangkas/tidak termasuk: keputusan lingkup, bukan pekerjaan tersembunyi yang masih harus dibangun.
- Ditunda: memerlukan fase/keputusan berikutnya.

Lulus tes tidak sama dengan terbukti menyenangkan atau seimbang untuk semua
strategi. Hasil kuantitatif dan commit disimpan di [log prioritas](docs/audit/Prioritas%20Perbaikan%20IronFist.md).

## Status sistem single-player

| Sistem | Status | Bukti dan batas |
|---|---|---|
| Loop mingguan dan dunia | ✅ | Tes state/world dan harness dunia 480 minggu × 5 seed; kas harness dunia dijaga, bukan bukti ekonomi. |
| Penilaian fight | ✅ | Kartu 10-point must membaca semua ronde; tes scoring serta harness mirror/archetype/trait. |
| Plan/corner kedua sisi | ✅ | Instruksi punya trade-off; ronde pertama neutral. Harness fight memeriksa simetri dan band archetype. |
| Weight cut/catchweight | ✅ | Stamina cap dan penalti purse masuk simulasi/pembayaran; tes weight cut dan purse. |
| Fight Night | ✅ | Tes callback commit sekali, STR/TD kumulatif, transisi ronde, bonus dan achievement; smoke menyelesaikan laga browser. |
| Mode menonton | 🟡 | Ringkasan dan tick tersedia; tidak mengklaim tiga mode independen yang setara. |
| Narasi laga | ✅ | Dari skor ronde, metadata submission, ranking dan gelar; tes evidence termasuk seed regresi. |
| Peringkat dan sabuk | ✅ | Selector ranking bersama; sabuk per tier terpisah dan migrasi save diuji. Mandatory/AI title defense khusus Major. |
| Profil lawan ranked | ✅ | Atribut persisten, tawaran memakai clone; migrasi legacy deterministik dan booking lama diprioritaskan. |
| Program/intensitas latihan | ✅ | Gain/risk dan faktor yang terlihat diuji. Hard punya keuntungan jangka pendek dengan risiko dan kelelahan. |
| Sparring | 🟡 | Kecocokan intra-camp; tidak ada klaim pasar external sparring partner penuh. |
| Ambisi fighter | ✅ | Paycheck, Legacy, Family Man, Star Power dan ambisi lain punya perilaku; tes ambitions. |
| Janji ke fighter | ✅ | Tenggat dan akibat ditepati/diingkari; tes promises. |
| Pindah kelas | 🟡 | Permintaan fighter menggunakan streak nyata. Perintah bebas pemain memulai pindah kelas bukan fitur yang diklaim selesai. |
| Aging/retirement/Hall of Fame | ✅ | Tick yearly dan arsip alumni; kriteria Hall of Fame diperketat menurut gelar/karier. |
| Cedera | ✅ | Peluang fight mengikuti damage, metode, fasilitas dan trait; tes injury/prone. Jalur karier cedera latihan dan fight tetap punya batas berbeda. |
| Coach dan staf | ✅ | Kepribadian memberi efek; Cutman menangani cut, Nutritionist masuk weight cut; nama pasar unik dan payroll bisa dikurangi. |
| Scouting | ✅ | OVR/warna dari laporan; grade dibatasi metode dan reputasi. Tes scout-report/scouting. |
| Kontrak | ✅ | Engine menghitung odds/counter dan validasi cash/kapasitas. Empat tuas: bonus, cut, jumlah laga, durasi. |
| Sponsor | ✅ | Pemasukan reputasi tetap ditambah kontrak sponsor; expiry/renewal mengikuti settlement. |
| Promotor | ✅ | Relasi/perilaku menaikkan purse dan peluang main event/eliminator, bukan frekuensi offer. |
| Ekonomi | ✅ | Preview dan settlement memakai rumus bersama; band bot 20 tahun ditulis di dokumen ekonomi. Bukan jaminan semua strategi selalu untung. |
| Penjualan darurat | ✅ | Benar-benar menjual level fasilitas; tes emergency-sale. |
| Reputasi/Prestise | ✅ | Dua sumbu progres utama. Reputasi kemenangan dibatasi tier; Prestise membaca sejarah camp. Tier fasilitas menunjukkan kapasitas. |
| Save/undo/RNG | ✅ | Tiga slot, backup, snapshot immutable, checkpoint RNG dunia dan UID; tes hook/save/undo. Versioning migrasi tambahan belum diklaim selesai. |
| Pencapaian | ✅ | Konteks fight dikomit sebelum pengecekan; achievement ditampilkan dan ID lama dipertahankan. |
| Bahasa/onboarding/HP | ✅ | Bahasa Indonesia, katalog narasi termasuk save lama, tips sesuai mekanik, CTA minggu terlihat pada 320/390/767px. |
| Relasi antar fighter/mentor pasif/rival camp | Dipangkas | #21/#28/#34. Outside offers dan rivalitas per lawan tetap ada. |
| Equity/investor baru/museum kosmetik | Dipangkas | #63. Kontrak/flag tersimpan tetap dihormati; biaya legacy terlihat. |
| Pinjaman | Tidak termasuk | Keputusan #33/#39: pemulihan lewat kas, payroll dan aset nyata; tidak menambah sistem utang. |

## Keputusan desain aktif

1. **Bahasa:** Indonesia untuk kontrol dan narasi; istilah MMA, nama dan brand
   tetap dapat memakai bentuk asli. [Aturan bahasa](docs/LANGUAGE.md).
2. **Progres:** Reputasi untuk akses/bisnis saat ini dan Prestise untuk hasil lintas
   generasi. Legacy/identitas adalah arsip sejarah, bukan tangga hadiah tambahan.
3. **Ekonomi:** purse reguler Major/Premier perlu ranking. Pertahankan onboarding
   ekonomi awal; kurangi hasil marjinal popularitas dan ukur camp yang mengatur anggaran.
   [Target, angka dan keterbatasan simulasi](docs/balance/P3_39_ECONOMY.md).
4. **Lingkup:** simpan sistem yang memiliki efek nyata dan pilihan yang terbaca;
   pangkas yang kosmetik atau tidak berfungsi. [Keputusan per fitur](docs/SINGLE_PLAYER_SCOPE.md).
5. **Progres lama:** jangan reset kas, gelar, atribut atau histori. Penyesuaian
   berlaku pada hasil/offer baru; transaksi yang telah disepakati tetap dihormati.

## Batas arsitektur

- Engine ada di `packages/engine/src/`, tanpa React/DOM. UI ada di `app/src/`.
- Engine memutasi state lewat reducer domain; hook UI mengambil snapshot untuk
  React dan undo. Semua RNG engine melalui `rng.js`; checkpoint dunia ikut save.
- Aksi disimpan sebagai data; terjemahan pada batas render tidak menjadi aturan game.
- Ikuti [CONSTRAINTS.md](CONSTRAINTS.md) dan spesifikasi
  [championship](design/CHAMPIONSHIP_SYSTEM_SPEC.md) untuk batas gelar per tier.

## Fase berikutnya

Single-player perlu playtest manusia beberapa jam untuk pacing, kejelasan keputusan,
dan kebosanan. Tandai masalah yang bisa direproduksi sebelum menambah sistem baru.

Backend tetap ditahan. #55 plan/corner sisi B, #56 transaksi resolve, #57 persetujuan
PvP, dan #58 skema/migrasi merupakan pekerjaan fase berikutnya. Frontend saat ini
belum memakai backend untuk permainan. Jangan membaca blueprint Juli sebagai
instruksi membangun ulang arsitektur yang sudah dipisah.

Keputusan multiplayer yang masih terbuka: jadwal serempak/tersebar, perilaku laga
tanpa penonton, carry-over progres single-player, skala pemain dan hosting. Itu
memerlukan kebutuhan fase online serta riset teknologi saat implementasi dimulai.
