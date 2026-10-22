# P0 #7 — Balance archetype

22 Oktober 2026. Branch `balance/archetypes`, dari `fix/weight-cut` (`6f3b75b`).

## Metode dan target

Harness P0 #4 dibawa dari commit `16140f0`, lalu disesuaikan dengan P0 #5:
tidak ada lagi mirror `go` khusus ronde pertama. Fighter dibangun dari delapan
atribut asli dengan profil archetype dan noise ±8, lalu diratakan ke OVR 50,
65, atau 80. Semua pasangan archetype bertanding dua arah dengan seed sama,
plan otomatis, dan corner AI untuk kedua sisi. Matrix tidak memakai trait,
weight cut, perbedaan umur, atau morale.

Band wajib 45–55% berlaku untuk agregat setiap archetype, juga secara terpisah
untuk setiap tingkat OVR dan untuk laga tiga/lima ronde. Setiap lawan mendapat
bobot yang sama. Angka ini bukan tuntutan setiap pasangan gaya harus 50/50.
Matrix gabungan OVR × durasi tetap dicetak agar agregat tidak menutupi variasi.
Mirror identik, side swap, keputusan juri, dan mirror trait juga wajib lulus.

## Sebelum dan sesudah

Perbandingan dengan **harness baru yang sama**, scale 1 (137.000 fight per run).
Engine sebelum tuning adalah `6f3b75b`, dijalankan dari salinan sementara tanpa
mengubah checkout. Engine lama gagal 27 band; engine baru lulus seluruh band.

| Archetype | Sebelum | Sesudah |
|---|---:|---:|
| Boxer | 37,0% | 50,7% |
| Muay Thai | 61,5% | 48,5% |
| Wrestler | 61,2% | 50,8% |
| BJJ Specialist | 55,6% | 50,2% |
| All-Rounder | 34,7% | 49,8% |

Konfirmasi scale 4, **548.000 fight**, 76.800 penampilan per archetype dalam
matrix pasangan. Hasil berikut membulatkan persentase ke satu desimal.

| Archetype | Agregat | 3 ronde | 5 ronde | OVR 50 | OVR 65 | OVR 80 |
|---|---:|---:|---:|---:|---:|---:|
| Boxer | 50,6% | 52,7% | 48,5% | 54,4% | 49,2% | 48,2% |
| Muay Thai | 48,7% | 50,7% | 46,7% | 51,0% | 47,4% | 47,7% |
| Wrestler | 50,9% | 51,1% | 50,7% | 51,8% | 53,4% | 47,4% |
| BJJ Specialist | 50,1% | 45,7% | 54,4% | 46,0% | 51,0% | 53,2% |
| All-Rounder | 49,8% | 49,8% | 49,7% | 46,8% | 48,9% | 53,6% |

Mirror identik: A menang 49,6%; sel plan × corner terjauh 48,8%.
Side swap: A menang 50,1%; selisih pasangan terbesar 1,4 poin persen.
Keputusan yang mengalahkan jumlah ronde sekitar 0,8%, semuanya dijelaskan ronde
10-8. Mirror Warrior 50,1%, Explosive 49,9%, Cautious 49,7%.

## Perubahan yang menghasilkan angka ini

- Clinch menghitung rasio output terhadap pertahanan wrestling/strength,
  dengan rentang 2,5–6,5 hit sebelum rasio diterapkan. Sebelumnya raw striking
  dikali 0,3–0,6 menghasilkan puluhan hit per exchange. Damage sekarang ikut
  strength dan stamina; bonus volume 1,3× dan damage 1,1× Muay Thai tetap ada.
- `Keep It Standing` menambah dua entri strike, menurunkan bobot tembakan
  takedown sendiri menjadi satu, memberi defense takedown +0,10, dan mengurangi
  peluang tembakan sendiri 0,12. Berlaku untuk kedua sisi.
- Bobot takedown dasar menjadi dua, atau empat dengan `Take It Down`.
  Ambang wrestling 55 yang mendadak mengubah volume tembakan dihapus.
  Divisor selisih skill takedown 60 → 100; matchup dituning ulang.
- Bonus GNP dan submission hanya milik penyerang; bonus sweep hanya milik
  fighter di bawah. Sebelumnya bonus dua archetype dijumlahkan untuk siapa pun.
- Submission memakai threshold 75 untuk semua matchup, termasuk ketika ada
  BJJ Specialist. Eligibility striker 70 → 35, peluang mencoba 15% → 40%,
  eligibility umum 50 → 30. Bobot skill serangan dan defense sama-sama total
  satu, dengan tekanan dasar +12. Ancaman yang membuat progres mendapat
  maksimal 12 poin; ancaman tanpa progres mendapat nol. Ini mengurangi lonjakan
  kekuatan BJJ di OVR tinggi tanpa menghilangkan peran submission.
- Bonus adaptation All-Rounder yang sebelumnya hanya metadata kini memberi
  +5,5% atribut efektif saat bertarung, tanpa mengubah atribut save atau OVR.
- Drain `Work the body` 0,25 → 0,55 per hit, untuk menjaga payoff stamina setelah
  volume clinch diperbaiki. Seluruh test manfaat dan trade-off corner tetap lulus.
- `genFighter` hanya memproses delapan atribut asli; key `clinch` palsu dihapus
  dari data Muay Thai. Badge OVR memakai `avgSkill`, sehingga save lama yang
  masih membawa `attrs.clinch` juga menampilkan OVR yang benar.

## Verifikasi

```text
npm test -w app                         38 file, 691 test lulus
npm run build -w app                    lulus
npm run fight-balance                   137.000 fight, 39 band lulus
node tools/fight-balance.mjs 4           548.000 fight, 39 band lulus
npm run balance                        480 minggu × 5 seed, seluruh band lulus
git diff --check                       bersih
```

Di Windows, test constraint lama memerlukan Git Bash untuk perintah Unix
`find`; temp Vitest diarahkan ke workspace. `npm test` lengkap juga dicoba:
691 test aplikasi lulus, tetapi suite server tidak dapat menjalankan 22 test
karena Postgres lokal di port 5432 menolak koneksi. CI menyediakan Postgres.

Test baru melindungi volume/defense clinch, kedua sisi standing plan,
kepemilikan bonus ground, ancaman tanpa progres, generation, dan OVR save lama.
Test cut lama kini memakai 1.000 pasang seed; test determinisme membandingkan
hasil replay penuh. Todo trait dari #4 diganti tiga test mirror trait.

## Batas pengukuran

Target lulus pada agregat di atas, bukan seluruh sel gabungan OVR × durasi.
Contohnya BJJ di OVR 50/tiga ronde masih 42,4%, sedangkan OVR 80/lima ronde
57,4%. Boxer OVR 50/tiga ronde 55,6%. Variasi ini tetap terlihat di output
harness dan merupakan ruang tuning lebih lanjut. Trait, cut, game plan manual,
dan profil atribut hasil latihan bisa menghasilkan matchup lain.

Server `resolveFight.js` belum disamakan alur plan/corner-nya (#55).
Tidak ada perubahan backend atau push dalam item ini.
