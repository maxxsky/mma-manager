# MMA Manager — Backend Blueprint v1

> **Tujuan:** Blueprint backend multiplayer untuk MMA Manager.
> Engine sudah pure JS & siap di-import server.
> **Ditujukan untuk:** Mateo (implementer) + Brahma (decision maker)
> **Supersedes:** GDD v4 Sec MP — versi teknis terperinci

---

## Arsitektur Akhir (Target)

```
┌─────────────────────────────────────────┐
│              CLIENT (React)             │
│  import engine/ hanya untuk render      │
│  WebSocket: lihat fight live            │
│  REST API: kelola camp, roster, dll     │
└────────────────────┬────────────────────┘
                     │ REST + WS
┌────────────────────┴────────────────────┐
│              SERVER (Node.js)           │
│                                          │
│  ┌──────────┐  ┌──────────┐  ┌───────┐  │
│  │ REST API │  │ WebSocket│  │ Cron  │  │
│  │ (Express)│  │(SocketIO)│  │Sched. │  │
│  └────┬─────┘  └────┬─────┘  └──┬────┘  │
│       │              │           │       │
│  ┌────┴──────────────┴───────────┴────┐  │
│  │     GAME ENGINE (import engine/)   │  │
│  │     Server-authoritative fight     │  │
│  └────────────────┬───────────────────┘  │
│                   │                      │
│  ┌────────────────┴───────────────────┐  │
│  │  DATABASE (PostgreSQL / SQLite)    │  │
│  │  users, camps, fighters, fights    │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

---

## Stack Spesifik

| Layer | Pilihan | Alasan |
|:------|:--------|:-------|
| **Runtime** | Node.js | Engine pure JS — zero porting |
| **Framework** | Express | Ringan, familiar, cocok |
| **WebSocket** | Socket.IO | Fallback long-polling, room support |
| **Database** | SQLite (dev) → PostgreSQL (prod) | SQLite gampang setup, PG untuk production |
| **ORM** | Knex.js | Query builder ringan, migration built-in |
| **Auth** | JWT (jsonwebtoken + bcrypt) | Simple, stateless |
| **Validation** | Zod | Schema validation, shared types |
| **Cron/Scheduler** | node-cron | Jadwalkan fight otomatis |
| **Deploy** | PM2 + VPS lo | Udah jalan, tinggal tambah service |

---

## Database Schema

```sql
-- ============================================================
-- USERS — satu user = satu camp
-- ============================================================
CREATE TABLE users (
  id            TEXT PRIMARY KEY,          -- uuid
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- CAMPS — game state per user
-- ============================================================
CREATE TABLE camps (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  name           TEXT NOT NULL,
  rep            INTEGER DEFAULT 8,
  chemistry      INTEGER DEFAULT 60,
  cash           INTEGER DEFAULT 100000,
  week           INTEGER DEFAULT 1,
  legacy         INTEGER DEFAULT 0,
  camp_tier      INTEGER DEFAULT 0,
  camp_tag       TEXT,
  facilities     TEXT DEFAULT '{"mats":1,"ring":1,"weights":1,"medical":1}',
  promoter_rel   TEXT DEFAULT '{}',        -- JSON object
  loan           TEXT,                     -- JSON or null
  created_at     TEXT DEFAULT (datetime('now')),
  last_tick_at   TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- FIGHTERS — roster semua pemain
-- ============================================================
CREATE TABLE fighters (
  id            TEXT PRIMARY KEY,
  camp_id       TEXT NOT NULL REFERENCES camps(id),
  name          TEXT NOT NULL,
  archetype     TEXT NOT NULL,
  region        TEXT NOT NULL,
  age           INTEGER NOT NULL,
  attrs         TEXT NOT NULL,             -- JSON: {"striking":75,...}
  skills        TEXT NOT NULL,
  morale        INTEGER DEFAULT 70,
  stamina       INTEGER DEFAULT 100,
  overtraining  INTEGER DEFAULT 0,
  traits        TEXT,                      -- JSON array
  ambition      TEXT,
  popularity    INTEGER DEFAULT 0,
  record        TEXT DEFAULT '{"wins":0,"losses":0,"draws":0,"kos":0,"subs":0}',
  weight_class  TEXT,
  weight        INTEGER,
  status        TEXT DEFAULT 'active',      -- active, injured, retired, converted
  injury        TEXT,                      -- JSON or null
  contract      TEXT,                      -- JSON
  agent         TEXT,                      -- JSON
  joined_week   INTEGER,
  last_fight_week INTEGER,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- DIVISIONS / RANKINGS
-- ============================================================
CREATE TABLE divisions (
  id          TEXT PRIMARY KEY,
  camp_id     TEXT NOT NULL REFERENCES camps(id),
  name        TEXT NOT NULL,              -- weight class name
  rank_1_15   TEXT NOT NULL,              -- JSON array of fighter IDs
  champion_id TEXT REFERENCES fighters(id),
  interim_id  TEXT REFERENCES fighters(id)
);

-- ============================================================
-- FIGHTS — histori pertarungan
-- ============================================================
CREATE TABLE fights (
  id            TEXT PRIMARY KEY,
  camp_id       TEXT NOT NULL REFERENCES camps(id),
  fighter_a_id  TEXT NOT NULL REFERENCES fighters(id),
  fighter_b_id  TEXT NOT NULL REFERENCES fighters(id),
  weight_class  TEXT NOT NULL,
  round         INTEGER,                  -- final round
  result        TEXT,                     -- KO, SUB, UD, etc.
  winner_id     TEXT REFERENCES fighters(id),
  fight_log     TEXT,                     -- JSON: full round-by-round
  seed          INTEGER,                  -- RNG seed for reproducibility
  status        TEXT DEFAULT 'scheduled', -- scheduled, live, completed, cancelled
  scheduled_at  TEXT,
  completed_at  TEXT,
  created_at    TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- SCHEDULED FIGHTS — upcoming matches (multiplayer)
-- ============================================================
CREATE TABLE scheduled_fights (
  id            TEXT PRIMARY KEY,
  camp_id       TEXT NOT NULL REFERENCES camps(id),
  fighter_a_id  TEXT NOT NULL REFERENCES fighters(id),
  fighter_b_id  TEXT NOT NULL REFERENCES fighters(id),
  fight_time    TEXT NOT NULL,            -- ISO timestamp
  status        TEXT DEFAULT 'pending',   -- pending, live, completed
  is_pvp        INTEGER DEFAULT 0        -- 1 = PvP, 0 = vs AI
);
```

---

## REST API Design

```
POST   /api/auth/register        — Daftar akun baru
POST   /api/auth/login           — Login, dapet JWT
GET    /api/auth/me              — Profile user

GET    /api/camp                 — State camp (JSON = game state)
PUT    /api/camp                 — Simpan state camp (auto-tick)

GET    /api/roster               — Daftar fighter camp
PUT    /api/roster/:id           — Update fighter (training, contract)

POST   /api/fight/book           — Jadwalkan fight
GET    /api/fight/:id            — Detail fight (termasuk log)
GET    /api/fights               — History fights

GET    /api/rankings/:weight     — Ranking per kelas
GET    /api/market               — Free agent market
GET    /api/leaderboard          — Peringkat global pemain
```

---

## Alur Multiplayer — Step by Step

### Solo Play (dulu, langsung bisa)

```
Client: POST /api/auth/register → dapet JWT
Client: POST /api/camp → initial state disimpan
Client: PUT /api/roster/:id → training fighter
Client: server jalanin tick() (pure engine)
Server: simpan hasil tick ke DB → return state baru
       └── Sama persis kayak skrg, cuma state di server
```

### PvP Fight Terjadwal (model Top Eleven)

```
1. Player A challenge player B → POST /api/fight/book
   ├── fight_time = besok 20:00 WITA
   └── tersimpan di scheduled_fights

2. Cron job tiap menit cek scheduled_fights
   └── kalo fight_time udah lewat → trigger

3. Server jalankan fight engine:
   ├── Ambil seed tersimpan → simRound deterministik
   ├── Produksi fight_log (array of events)
   ├── Simpan hasil di fights table
   └── Update record + ranking kedua fighter

4. Client WebSocket dapet notifikasi:
   └── "Fight #{id} completed! Buka untuk replay"
```

### Live Fight + Corner Decision

```
1. Sama kayak PvP, fight dijadwalkan

2. Saat T tiba, server mulai fight di WebSocket room:
   └── socket.join(`fight:${fightId}`)

3. Server kirim tick ke room:
   ├── "Round 1 dimulai" → client render animasi
   ├── Antara round: server minta corner decision
   │   ├── Player A: "go / body / save / swap" — 15 detik
   │   └── Player B: sama
   └── Server tunggu 15s → kalo gak respon = default
       └── Lanjut round berikutnya

4. Setelah fight selesai → simpan + notifikasi semua
```

---

## Refactor Engine untuk Backend (Minimal)

Engine udah pure JS + siap di-import. Yang perlu diubah:

| File | Perubahan | Kenapa |
|:-----|:----------|:-------|
| `rng.js` | Export `setSeed(n)` | Server perlu seeded RNG buat reproducibility |
| `fight.js` | `simRound()` jadi pure function | Udah ✅ pure — cuma input + output |
| `state.js` | `tick(g)` jadi idempotent | Harus bisa jalan di cron tanpa side effect |
| `data.js` | Semua data pindah ke file shared | Bisa di-import client & server |
| **Baru** | `index.js` | Entry point server — export semua yang dipake API |

**Enginenya gak perlu ditulis ulang.** Cuma tambah export biar bisa dipake Node.js.

---

## Folder Structure (Target)

```
mma-manager/
├── app/                          ← Frontend (React, existing)
│   ├── src/
│   │   ├── engine/               ← Pure JS — shared dengan server
│   │   ├── ui/                   ← React components
│   │   └── App.jsx
│   └── package.json
│
├── server/                       ← Backend (baru)
│   ├── index.js                  ← Entry: Express + Socket.IO
│   ├── config.js                 ← DB, JWT secret, port
│   ├── db/
│   │   ├── knex.js               ← Knex config
│   │   └── migrations/           ← Auto buat tabel
│   ├── routes/
│   │   ├── auth.js
│   │   ├── camp.js
│   │   ├── roster.js
│   │   └── fights.js
│   ├── ws/
│   │   └── fight.js              ← WebSocket handler
│   ├── scheduler/
│   │   └── index.js              ← Cron: cek scheduled fights
│   └── package.json
│
├── shared/                       ← Symlink / import engine dari sini
│   └── engine -> ../app/src/engine
│
├── GDD_v4.md
├── ARCHITECTURE.md
└── README.md
```

---

## Urutan Build

| Fase | Isi | Hasil |
|:-----|:----|:------|
| **1** | `server/` skeleton: Express + Knex + auth | Backend nyala, register/login bisa |
| **2** | Migrasi state ke DB: simpan/load camp state | Game state persist walau browser ditutup |
| **3** | Pindahin `tick()` ke server | Server jadi otoritas game loop |
| **4** | Scheduled fights via cron | Fight jalan otomatis walau player offline |
| **5** | WebSocket + live fight streaming | Player bisa nonton fight real-time + corner decision |
| **6** | PvP matchmaking | Tantang pemain lain, leaderboard |

---

## Deployment — Di VPS Lo

```
VPS lo sekarang:
  port 3462 → finance-api
  port 3463 → subcon-monitor
  port 5173 → mma-manager (dev)
  
  → Tambah: port 3464 → mma-manager server
  → Tambah: port 5174 → mma-manager client production build
  
  PM2: tinggal tambah service
  pm2 start server/index.js --name mma-server
```

---

**Status dokumen ini:** v1 — draft untuk direview Mateo & Brahma. Kalo setuju arsitekturnya, aku bisa mulai tulis kode backend fase 1 (skeleton + auth + DB).
