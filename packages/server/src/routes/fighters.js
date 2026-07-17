import { Router } from "express";
import pg from "pg";
import { requireAuth } from "../middleware/auth.js";
import { genFighter } from "@ironfist/engine/fighter.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const fighterRouter = Router();
fighterRouter.use(requireAuth);

// ── POST /api/fighters — generate + add fighter to roster ──
fighterRouter.post("/", async (req, res) => {
  try {
    // Get user's camp
    const campResult = await pool.query(
      "SELECT id FROM camps WHERE user_id = $1",
      [req.userId]
    );
    if (campResult.rows.length === 0) {
      return res.status(404).json({ error: "User has no camp" });
    }
    const campId = campResult.rows[0].id;

    // Generate fighter with seeded engine call
    // Level range 0.35-0.6 matches genTalentEntry() in talentPool.js
    const level = 0.35 + Math.random() * 0.25;
    const f = genFighter(level);

    // Map genFighter() fields to DB columns
    const result = await pool.query(
      `INSERT INTO fighters (
        camp_id, name, archetype, region, age,
        attrs, skills, morale, stamina, overtraining,
        traits, ambition, popularity,
        record, weight_class, weight,
        status, injury, contract, agent,
        joined_week, last_fight_week
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
      RETURNING *`,
      [
        campId,
        f.name,
        f.archetype,
        f.region,
        f.age,

        // attrs: JSON from genFighter
        JSON.stringify(f.attrs),
        // skills: not produced by genFighter — store empty object
        "{}",
        f.morale,
        // stamina: not produced by genFighter — default 100
        100,
        f.overtraining || 0,

        // traits: array → JSONB
        JSON.stringify(f.traits || []),
        f.ambition || null,
        f.popularity || 0,

        // record: object → JSONB
        JSON.stringify(f.record || { wins: 0, losses: 0, draws: 0, kos: 0, subs: 0 }),
        f.weightClass,
        f.natWeight || null,

        "active",
        // injury: null → JSONB null
        f.injury ? JSON.stringify(f.injury) : null,
        // contract: null → JSONB null
        f.contract ? JSON.stringify(f.contract) : null,
        // agent: string
        JSON.stringify(f.agent || "none"),

        f.joinedWeek || 0,
        f.lastFightWeek || 0,
      ]
    );

    res.status(201).json({ fighter: result.rows[0] });
  } catch (err) {
    console.error("Create fighter error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/fighters — list user's roster ──
fighterRouter.get("/", async (req, res) => {
  try {
    const campResult = await pool.query(
      "SELECT id FROM camps WHERE user_id = $1",
      [req.userId]
    );
    if (campResult.rows.length === 0) {
      return res.status(404).json({ error: "User has no camp" });
    }
    const campId = campResult.rows[0].id;

    const result = await pool.query(
      "SELECT * FROM fighters WHERE camp_id = $1 ORDER BY created_at DESC",
      [campId]
    );

    res.json({ fighters: result.rows, count: result.rows.length });
  } catch (err) {
    console.error("Get fighters error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});
