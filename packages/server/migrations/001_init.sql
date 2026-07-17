-- Migration 001 — 4 tabel: users, camps, fighters, fights
-- PostgreSQL 16, native types.
--
-- Catatan:
-- - divisions/rankings dan tabel blueprint lama belum dibikin — di luar scope.
-- - camp_id nggak ada di fights langsung — camp masing-masing fighter lewat
--   join fighters.camp_id, biar gak ambigu buat PvP lintas-camp.

BEGIN;

-- ── users ────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── camps ────────────────────────────────────────────────────
CREATE TABLE camps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id),
  name           TEXT NOT NULL,
  rep            INTEGER DEFAULT 8,
  chemistry      INTEGER DEFAULT 60,
  cash           INTEGER DEFAULT 100000,
  week           INTEGER DEFAULT 1,
  legacy         INTEGER DEFAULT 0,
  camp_tier      INTEGER DEFAULT 0,
  facilities     JSONB DEFAULT '{"mats":1,"ring":1,"weights":1,"medical":1}',
  promoter_rel   JSONB DEFAULT '{}',
  loan           JSONB,
  created_at     TIMESTAMPTZ DEFAULT now(),
  last_tick_at   TIMESTAMPTZ DEFAULT now()
);

-- ── fighters ─────────────────────────────────────────────────
CREATE TABLE fighters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id         UUID NOT NULL REFERENCES camps(id),
  name            TEXT NOT NULL,
  archetype       TEXT NOT NULL,
  region          TEXT NOT NULL,
  age             INTEGER NOT NULL,
  attrs           JSONB NOT NULL,
  skills          JSONB NOT NULL,
  morale          INTEGER DEFAULT 70,
  stamina         INTEGER DEFAULT 100,
  overtraining    INTEGER DEFAULT 0,
  traits          JSONB,
  ambition        TEXT,
  popularity      INTEGER DEFAULT 0,
  record          JSONB DEFAULT '{"wins":0,"losses":0,"draws":0,"kos":0,"subs":0}',
  weight_class    TEXT,
  weight          INTEGER,
  status          TEXT DEFAULT 'active',
  injury          JSONB,
  contract        JSONB,
  agent           JSONB,
  joined_week     INTEGER,
  last_fight_week INTEGER,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── fights ───────────────────────────────────────────────────
CREATE TABLE fights (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fighter_a_id      UUID NOT NULL REFERENCES fighters(id),
  fighter_b_id      UUID NOT NULL REFERENCES fighters(id),
  is_pvp            BOOLEAN DEFAULT false,
  weight_class      TEXT NOT NULL,
  status            TEXT DEFAULT 'pending',  -- pending, ready_to_resolve, resolved, cancelled
  seed              BIGINT,
  plan_a            TEXT,
  plan_b            TEXT,
  corner_choice_a   TEXT,
  corner_choice_b   TEXT,
  round             INTEGER,
  winner_id         UUID REFERENCES fighters(id),
  how               TEXT,
  round_log         JSONB,
  scheduled_at      TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

COMMIT;
