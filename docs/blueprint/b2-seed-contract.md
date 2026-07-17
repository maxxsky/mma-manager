# B2 — Server Seed Authority Contract (Async MVP)

**Status:** Design, belum diimplementasi.
**Supersedes bagian ini dari:** `backend-blueprint-v1.md` § "Live Fight + Corner Decision" — bagian itu ditunda ke fase berikutnya (live WS), dokumen ini fokus ke async MVP dulu.
**Keputusan yang udah dikunci:** MVP async-only (nggak ada live viewing/WS dulu). Solo play tetap 100% client-only untuk sekarang, nggak lewat kontrak ini.

---

## 1. Kenapa async lebih simpel dari yang dikira

`runFight(A, B, plan, cornerPolicy, seed, totalRounds)` di `@ironfist/engine` udah nerima `cornerPolicy` sebagai **function**, dipanggil sekali per ronde secara internal:

```js
const corner = r === 1 ? "go" : cornerPolicy(null, r, { staA, staB, momentum, totalDmgA, totalDmgB, cutA, cutB });
```

Artinya: seluruh fight (semua ronde) bisa diselesaikan dalam **satu panggilan sinkron**, nggak butuh round-trip client↔server per ronde. Ini pas banget buat model async — server nggak perlu nunggu real-time input, karena `cornerPolicy` bisa berupa function yang udah "tau" jawabannya dari awal (dari gameplan yang di-submit sebelum fight resolve).

**Konsekuensi penting:** engine nggak perlu diubah buat MVP ini. `setRNG(fn)` juga udah cukup fleksibel. B2 murni soal *kontrak data & alur*, bukan perubahan kode engine.

---

## 2. Alur end-to-end

```
1. Player A challenge Player B (atau matchmaking assign)
   → POST /api/fight/book
   → tersimpan di scheduled_fights, status: "pending"

2. Masing-masing player submit gameplan sebelum fight resolve
   (reuse UI yang udah ada di WeighIn.jsx — plan/attitude, bukan fitur baru)
   → PUT /api/fight/:id/gameplan  { plan: "Balanced", cornerPreference: "..." }
   → Kalau salah satu belum submit sampai deadline → default plan dipakai
     (sama kayak behavior corner timer di single-player sekarang)

3. Trigger resolve (cron cek scheduled_fights yang gameplan-nya lengkap ATAU
   waktunya udah lewat):
   a. Server generate seed — crypto-random, BUKAN dari client, BUKAN dari
      Math.random() sisi mana pun yang bisa ditebak.
   b. Build cornerPolicy function dari gameplan yang disubmit tiap sisi
      (mapping sederhana dulu untuk MVP — lihat §3).
   c. runFight(A, B, plan, cornerPolicy, seed, totalRounds) — SATU panggilan,
      dapet full result + round log deterministik.
   d. Simpan { seed, plan_a, plan_b, corner_policy_a, corner_policy_b, result,
      round_log } ke tabel `fights`.
   e. Update record + ranking kedua fighter (reuse commitFightResult()).

4. Notifikasi async ke kedua player (inbox message / push notification):
   "Fight #{id} selesai — buka buat liat hasilnya"

5. Client buka hasil:
   → Bisa langsung render dari `result` + `round_log` yang tersimpan, ATAU
   → Re-run runFight() lokal pakai seed+input yang sama buat animasi round-
     by-round (opsional, murni presentasi — hasilnya dijamin identik karena
     deterministik, jadi replay lokal aman dipercaya).
```

---

## 3. cornerPolicy untuk MVP — TIDAK perlu kompleks

Untuk async MVP, `cornerPolicy` nggak perlu real per-ronde decision tree yang canggih. Cukup salah satu dari dua opsi (pilih satu, jangan overengineer):

- **Opsi simpel (rekomendasi MVP):** satu corner choice yang disubmit player di awal, dipakai konstan tiap ronde (`cornerPolicy = () => submittedChoice`). Ini paling gampang diimplementasi dan dites, dan player yang mau kontrol real-time per-ronde tetap bisa nunggu fase live-WS berikutnya.
- **Opsi menengah:** mapping kecil dari `plan` (yang udah ada) ke corner choice yang beda tergantung state ronde (misal: kalau `cutA >= 4` otomatis `"stop_bleed"` walau player pilih `"go"` — safety override), tanpa butuh input baru dari player.

**Keputusan ini didorong ke Brahma saat implementasi B3 dimulai** — bukan hal yang perlu dikunci sekarang, karena dua-duanya sama-sama valid dan nggak mengubah kontrak seed/alur di atas.

---

## 4. Yang TIDAK termasuk kontrak ini (out of scope, sengaja)

- Live WebSocket round-by-round — fase berikutnya, setelah async terbukti stabil.
- Real-time corner decision dengan timer 15 detik — bagian dari live fase, bukan MVP ini.
- Solo play migration ke server — keputusan terpisah, tetap client-only untuk sekarang.
- `tick(g)` idempotency — ini tanggung jawab job-scheduler (BullMQ) di B3, bukan kontrak data di B2 ini. `tick()` sendiri nggak perlu diubah; yang perlu dijamin adalah *at-most-once execution* di level orkestrasi job.

---

## 4.5. KNOWN LIMITATION

`corner_choice_b`: Sesuai desain `runFight()` di engine, `cornerPolicy` cuma dikirim buat fighter A. Fighter B pake default AI. Ini berarti `corner_choice_b` yang dikumpulin dari player lawan di PvP nggak kepake. Buat MVP ini nggak masalah karena dua-duanya pake strategi konstan ("go"), tapi kalau nanti ada strategi per-ronde yang berarti, fighter B harus dapet cornerPolicy juga — perlu ubah engine.

---

## 5. Yang perlu ada di database (minimal untuk MVP ini)

Tabel `fights` minimal butuh kolom: `id`, `fighter_a_id`, `fighter_b_id`, `seed` (integer), `plan_a`, `plan_b`, `corner_choice_a`, `corner_choice_b`, `status` (pending/resolved), `result` (JSON — winner, how, round), `round_log` (JSON, opsional bisa di-regenerate dari seed+input), `resolved_at`.

Detail schema lengkap (index, FK, dll) diserahkan ke implementasi B3 — ini cuma daftar field minimal yang kontraknya udah pasti dibutuhkan dari desain di atas.
