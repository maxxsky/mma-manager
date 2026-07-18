# 🧱 Engine Constraints & Invariants

Tiga aturan yang **WAJIB** dipegang siapa pun yang menyentuh kode di repo ini.

---

## 1. No `Math.random()` in `packages/engine/src/`

- **Aturan:** Semua RNG di jalur engine WAJIB lewat `random()` / `setRNG()` / `mulberry32()` dari `rng.js`.
- **Alasan:** Reproducibility — `Math.random()` tidak bisa di-seed, jadi fight simulation tidak bisa di-replay, test jadi flaky, dan multiplayer sync tidak mungkin.
- **Konsekuensi:** CI gagal. PR tidak bisa merge.

**Contoh yang benar:**
```js
import { setRNG, mulberry32, random } from "@ironfist/engine/rng.js";

const seed = crypto.randomBytes(4).readUInt32BE(0); // seed dari server
setRNG(mulberry32(seed));
const f = genFighter(0.35 + random() * 0.25);       // synchronous
```

---

## 2. No React / UI imports in `packages/engine/src/`

- **Aturan:** Engine (`@ironfist/engine`) adalah pure JavaScript library — zero dependency ke React, DOM, atau UI framework apapun.
- **Alasan:** Engine harus bisa jalan di Node.js (server) tanpa browser runtime. Import React di engine akan break server test dan multiplayer backend.
- **Konsekuensi:** CI gagal. PR tidak bisa merge.

---

## 3. Engine RNG calls MUST be synchronous (no `await` between `setRNG` and `read`)

- **Aturan:** Jangan pernah taro `await` di antara `setRNG(seed)` dan pemanggilan `random()` / fungsi engine lain yang membaca RNG state.
- **Alasan:** Engine state (`_rng`) adalah module-level variable. Di server dengan request paralel, `await` di celah itu bikin race condition — request B bisa meng-overwrite seed punya request A sebelum A selesai menggunakan RNG-nya.
- **Konsekuensi:** Bug intermittent yang sangat susah direproduksi. Data corruption di multiplayer.

**Pola aman (server route):**
```js
const seed = crypto.randomBytes(4).readUInt32BE(0); // 1. seed dulu
setRNG(mulberry32(seed));                            // 2. set RNG
// ✅ Semua panggilan random() dan fungsi engine synchronous di sini — tidak ada await
const f = genFighter(0.35 + random() * 0.25);
// ✅ await boleh setelah selesai pakai RNG
await db.query("INSERT ...", [f.name, ...]);
```

---

*Penegakan otomatis untuk aturan #1 dan #2 ada di `app/src/__tests__/engine-constraints.test.js`.*
