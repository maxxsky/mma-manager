# IronFist — MMA Manager

[![CI](https://github.com/maxxsky/mma-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/maxxsky/mma-manager/actions/workflows/ci.yml)

Game manajemen camp MMA single-player berbasis React dan engine JavaScript murni.
Rekrut dan latih petarung, kelola biaya, terima tawaran, dan bangun prestise lintas generasi.
Status dokumentasi: 23 Oktober 2026. Backend tersedia sebagai eksperimen terpisah dan
**tetap ditunda**; browser belum memakai akun/server untuk permainan single-player.

## Menjalankan lokal

Gunakan Node.js 20+ dan npm dari root repository:

```sh
npm ci
npm run dev -w app
npm run build -w app
npm run preview -w app
```

Build statis ada di `app/dist/`. Tidak perlu PostgreSQL untuk bermain di browser.

## Fitur dan lingkup

- Tujuh tier camp, dari Local Gym hingga Dynasty Institution; kapasitas roster,
  coach, dan fasilitas mengikuti tier. Tier akhir juga memerlukan Prestise dan cadangan biaya.
- Dua sumbu progres: Reputasi untuk akses/bisnis, Prestise untuk pencapaian lintas
  generasi. Legacy dan identitas tetap tersimpan sebagai arsip sejarah.
- Latihan dengan program, intensitas, batas potensi, faktor yang terlihat, cedera,
  penuaan, ambisi, janji, coach dan staf pendukung yang memiliki efek nyata.
- Negosiasi kontrak melalui engine: bonus, bagian camp, jumlah laga dan durasi.
  Equity baru, mentor pasif dan relasi antar-fighter sudah dipangkas.
- Scouting memakai laporan scout, bukan membocorkan atribut asli; grade dibatasi
  metode dan reputasi. Prospek berperingkat dunia mempunyai profil combat persisten.
- Fight Night dengan penimbangan, penalti cut/catchweight, game plan dan corner dua
  sisi, penilaian per ronde, statistik nyata, narasi berbasis hasil, serta bonus yang dibayar.
- Peringkat divisi dan P4P; sabuk per tier terpisah. Mandatory defense dan simulasi
  juara AI saat ini khusus Major. Rival camp dihapus; outside offers untuk fighter
  tidak puas tetap berjalan.
- Keuangan memakai rumus bersama untuk preview dan settlement. Purse reguler
  Major/Premier mengikuti ranking; kontrak equity lama tetap dihormati dan terlihat sebagai biaya.
- Bahasa utama Indonesia. Katalog UI/narasi juga menangani pesan Inggris yang
  dikenali dari save lama; teks custom yang tidak dikenal tetap tampil asli.
- Tiga slot localStorage, autosave, backup/impor, undo/redo dan checkpoint RNG dunia.
  Simpan backup sebelum membersihkan data browser. Tombol Maju Minggu selalu terlihat di HP.

Keputusan lengkap: [lingkup single-player](docs/SINGLE_PLAYER_SCOPE.md),
[bahasa](docs/LANGUAGE.md), [aturan ekonomi dan hasil ukur](docs/balance/P3_39_ECONOMY.md).

## Verifikasi

```sh
npm test -w app
npm run build -w app
npm run fight-balance
npm run balance
npm run economy -- 960 3 --check
npm run smoke -- 4
```

Smoke menjalankan Chrome headless, membuka semua tab, memajukan minggu dan
menyelesaikan minimal satu FightNight. Set `CHROME_PATH` jika Chrome/Chromium/Edge
belum terdeteksi; `SMOKE_HEADFUL=1` untuk melihat browser. `SMOKE_PROFILE` bisa menunjuk
profil khusus pengujian. Jangan gunakan profil browser pribadi. CI menjalankan tes app
**dan server**, kedua harness, build, lalu smoke browser.

Tes server memerlukan PostgreSQL dengan database pengujian yang boleh dikosongkan:

```sh
# Set TEST_DATABASE_URL ke database pengujian, lalu:
npm test -w packages/server
# Atau kedua workspace:
npm test
```

Jangan gunakan database produksi untuk tes. PostgreSQL 16 disediakan oleh service CI.
Harness dunia menjaga kas agar dunia tetap bergerak; ia menguji koherensi dunia,
**bukan** balance ekonomi. Harness ekonomi memakai bot anggaran tanpa injeksi kas.
Tiga seed acuan bukan jaminan semua strategi bermain selalu berhasil.

## Struktur

```text
app/src/                 React UI, hooks, layanan save dan terjemahan presentasi
packages/engine/src/     Engine murni: tick, reducer domain, fight, ranking, ekonomi
packages/server/         Backend eksperimen; pengembangan ditunda
app/src/__tests__/       Tes engine, integrasi UI/hook, regresi save
packages/server/src/tests/  Tes auth/API/config server
.github/workflows/ci.yml Tes dan pemeriksaan browser di GitHub Actions
tools/                   Harness fight, dunia, ekonomi dan smoke
docs/audit/              Review Oktober dan log perbaikan aktif
docs/balance/            Riwayat pengukuran, termasuk hasil sebelum/sesudah
design/                  Spesifikasi championship/promotion
```

## Sumber acuan

- [GDD dan status terverifikasi](GDD_v4.md)
- [Prioritas dan log progres](docs/audit/Prioritas%20Perbaikan%20IronFist.md)
- [Constraints engine](CONSTRAINTS.md) dan [konstitusi proyek](PROJECT_CONSTITUTION.md)
- [Spesifikasi championship](design/CHAMPIONSHIP_SYSTEM_SPEC.md)
- [Indeks arsip dan manifest](docs/archive/README.md)

Engine tidak mengimpor React/DOM dan semua RNG engine lewat `rng.js`. UI mengirim aksi
ke reducer; hook mengambil snapshot sebelum mutasi dan menyimpan checkpoint RNG.
Terjemahan hanya mengubah tampilan, bukan isi state atau keputusan simulasi.

Implementasi dan simulasi sudah diperiksa; pacing serta kebosanan tetap memerlukan
playtest manusia jangka panjang. Bundle produksi masih melewati ambang peringatan
Vite 500 KB. Backend belum siap dilanjutkan: lihat #55–#58 di log prioritas.

## Lisensi

Proyek belum memiliki lisensi publik. Hak cipta tetap pada penulis.
