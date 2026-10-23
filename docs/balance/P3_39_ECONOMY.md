# Ekonomi single-player — 23 Oktober 2026

Keputusan desain #33/#39 berdasarkan izin user: pertahankan ekonomi sederhana;
tidak menambahkan pinjaman atau pasar utang. Pemulihan memakai arus kas, pengurangan
payroll, dan penjualan fasilitas nyata. Save, kas, dan booking lama tidak direset.

## Target yang bisa diuji

- Bot yang menghitung anggaran bertahan 20 tahun pada tiga seed acuan, tanpa injeksi kas.
- Median kas akhir $0,1–8 juta; semua seed di bawah $15 juta. Surplus tetap boleh
  ditabung untuk pembelian akademi $4 juta dan institusi $20 juta.
- Median reputasi tahun 2 maksimal 80. Kemenangan lokal tidak otomatis membuat camp terkenal sedunia.
- Median prestise tahun 20 berada 40–90; jangan menaikkan skor hanya supaya semua camp
  mencapai 50 di tahun 10. Setelah bug sabuk diperbaiki, prestise harus datang dari
  juara/pertahanan yang benar. Target lama sekitar 50 adalah aspirasi camp kuat, bukan hadiah usia save.

## Aturan

- Purse reguler Major memerlukan ranking 15 besar; Premier memerlukan lima besar.
- Purse Local/Regional dipertahankan. National $10–35K, Major $20–70K,
  Premier $50–120K sebelum pengali relasi, streak, gelar, dan promotor.
- Reputasi dari kemenangan dibatasi tingkat lawan: 35/60/80/95/100.
  Sikap Professional mengikuti batas yang sama. Menang di tier rendah tidak mengurangi reputasi yang sudah diperoleh.
- Sponsor popularitas dan merchandise melambat setelah popularitas 30, tanpa mengurangi
  tarif 30 poin pertama. Dukungan per fighter $600 + $1.000 × tier camp per bulan.
- Coach terakhir bisa dipecat dengan pesangon satu bulan gaji yang dihitung engine.
  Camp kosong tidak terjebak membayar coach mahal selamanya. UI menyediakan tindakan ini.
- Preview Finance memakai total income bersama termasuk bonus juara yang sebelumnya terlewat.

## Pengukuran dan batas bukti

Lihat `P3_39_BEFORE.txt` dan `P3_39_AFTER.txt`. Keduanya tiga seed × 960 minggu.
Harness baru juga memperbaiki kebijakan bot: anggaran biaya enam bulan, 75% penerimaan
fight tahunan sebagai proyeksi, intake sesuai biaya operasi, pemangkasan payroll,
negosiasi perpanjangan kontrak sungguhan, dan istirahat cedera. Sebelumnya klik
`openExtend` hanya menutup prompt tanpa memperpanjang kontrak. Karena kebijakan bot
juga berubah, angka sebelum/sesudah bukan estimasi efek kausal satu parameter.

Sebelum: kas akhir $2,62–24,85 juta, median $4,89 juta; ada seed mencapai $19,23 juta
di tahun 16. Sesudah: $4,52–8,23 juta, median $6,63 juta; 0/3 bangkrut. Median prestise
akhir 61, dan variasi atribut fighter tetap ada. Target median ini membatasi bot acuan,
bukan jaminan bahwa strategi pemain mana pun selalu untung atau tidak pernah bangkrut.

Jalankan `node tools/economy.mjs 960 3 --check` untuk memeriksa band yang dicatat.
