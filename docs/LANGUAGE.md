# Bahasa game

Keputusan 23 Oktober 2026, sesuai izin user untuk keputusan desain: Bahasa
Indonesia menjadi bahasa utama single-player. Istilah MMA seperti clinch,
submission, ground and pound, nama archetype, promotor, brand, dan julukan
petarung boleh tetap dalam bentuk aslinya. Pilihan EN di toolbar disembunyikan;
kamus EN dan API bahasa tetap tersedia untuk kompatibilitas kode.

Teks engine tetap menjadi data kanonik. Terjemahan dilakukan pada batas render
komponen dan primitive UI melalui `app/src/i18n/presentation.jsx` serta katalog
`messages-id.js`. Ini juga menerjemahkan pesan Inggris pada save lama tanpa
menulis ulang histori. ID aksi, nilai option, handler, skor, timestamp, dan
state RNG tidak diterjemahkan. Argumen template disisipkan apa adanya agar
nama dan nilai hasil simulasi tidak berubah.

Untuk teks baru, utamakan key `t()` yang sudah ada. Untuk narasi engine baru,
tambahkan pasangan template lengkap dengan placeholder `{0}`, `{1}`, dst. ke
katalog, lalu tambahkan contoh nyata di tes lokal. Hindari substitusi kata bebas:
terjemahan harus cocok dengan kalimat/pola yang diketahui. Teks yang tidak
dikenal dipertahankan, sehingga nama dan histori eksternal tidak ditebak.

Validasi mencakup render berita/pencapaian lama, integritas placeholder,
komentar seeded beberapa plan/corner, tidak berubahnya bukti fight, serta
browser smoke seluruh tab dan FightNight. Katalog adalah batas cakupan: teks
custom dari luar katalog tetap tampil asli. Ini bukan klaim semua bahasa
asing pada save impor bisa diterjemahkan otomatis.
