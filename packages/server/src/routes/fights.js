import { Router } from "express";
import pg from "pg";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";
import { runFight, prepFighter } from "@ironfist/engine/fight.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const fightRouter = Router();
fightRouter.use(requireAuth);

// ── POST /api/fights/book ────────────────────────────────────
fightRouter.post("/book", async (req, res) => {
  try {
    const { fighterAId, fighterBId } = req.body;
    if (!fighterAId || !fighterBId) {
      return res.status(400).json({ error: "fighterAId and fighterBId are required" });
    }

    // Get user's camp
    const camp = await pool.query("SELECT id FROM camps WHERE user_id = $1", [req.userId]);
    if (camp.rows.length === 0) {
      return res.status(404).json({ error: "User has no camp" });
    }
    const campId = camp.rows[0].id;

    // Fetch both fighters
    const a = await pool.query("SELECT * FROM fighters WHERE id = $1", [fighterAId]);
    const b = await pool.query("SELECT * FROM fighters WHERE id = $1", [fighterBId]);

    if (a.rows.length === 0) return res.status(404).json({ error: "fighterA not found" });
    if (b.rows.length === 0) return res.status(404).json({ error: "fighterB not found" });

    const fighterA = a.rows[0];
    const fighterB = b.rows[0];

    // fighterA must belong to the user's camp
    if (fighterA.camp_id !== campId) {
      return res.status(403).json({ error: "fighterA does not belong to your camp" });
    }

    // Weight class must match
    if (fighterA.weight_class !== fighterB.weight_class) {
      return res.status(400).json({ error: "Weight class mismatch" });
    }

    // Determine if PvP (different camps)
    const isPvp = fighterB.camp_id !== campId;

    const result = await pool.query(
      `INSERT INTO fights (fighter_a_id, fighter_b_id, weight_class, is_pvp)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [fighterAId, fighterBId, fighterA.weight_class, isPvp]
    );

    res.status(201).json({ fight: result.rows[0] });
  } catch (err) {
    console.error("Book fight error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/fights/:id/gameplan ─────────────────────────────
fightRouter.put("/:id/gameplan", async (req, res) => {
  try {
    const { plan, cornerChoice } = req.body;
    if (!plan || !cornerChoice) {
      return res.status(400).json({ error: "plan and cornerChoice are required" });
    }

    // Get user's camp
    const camp = await pool.query("SELECT id FROM camps WHERE user_id = $1", [req.userId]);
    if (camp.rows.length === 0) {
      return res.status(404).json({ error: "User has no camp" });
    }
    const campId = camp.rows[0].id;

    // Fetch fight
    const fight = await pool.query(
      `SELECT f.*, fa.camp_id AS camp_a, fb.camp_id AS camp_b
       FROM fights f
       JOIN fighters fa ON fa.id = f.fighter_a_id
       JOIN fighters fb ON fb.id = f.fighter_b_id
       WHERE f.id = $1`,
      [req.params.id]
    );

    if (fight.rows.length === 0) {
      return res.status(404).json({ error: "Fight not found" });
    }

    const f = fight.rows[0];

    if (f.status !== "pending") {
      return res.status(409).json({ error: "Fight is not in pending status" });
    }

    // Determine which side the user owns
    // For same-camp fights, user owns both — auto-assign to unset plan
    let column = null;
    let cornerCol = null;
    const ownsA = f.camp_a === campId;
    const ownsB = f.camp_b === campId;

    if (ownsA && ownsB) {
      // User owns both fighters — assign to the side that's still null
      if (!f.plan_a) {
        column = "plan_a";
        cornerCol = "corner_choice_a";
      } else {
        column = "plan_b";
        cornerCol = "corner_choice_b";
      }
    } else if (ownsA) {
      column = "plan_a";
      cornerCol = "corner_choice_a";
    } else if (ownsB) {
      column = "plan_b";
      cornerCol = "corner_choice_b";
    } else {
      return res.status(403).json({ error: "You do not own either fighter in this fight" });
    }

    const result = await pool.query(
      `UPDATE fights SET ${column} = $1, ${cornerCol} = $2 WHERE id = $3 RETURNING *`,
      [plan, cornerChoice, req.params.id]
    );

    res.json({ fight: result.rows[0] });
  } catch (err) {
    console.error("Gameplan error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/fights/:id/resolve ─────────────────────────────
fightRouter.post("/:id/resolve", async (req, res) => {
  try {
    // Get user's camp
    const camp = await pool.query("SELECT id FROM camps WHERE user_id = $1", [req.userId]);
    if (camp.rows.length === 0) {
      return res.status(404).json({ error: "User has no camp" });
    }
    const campId = camp.rows[0].id;

    // Fetch fight with fighter camp info
    const fight = await pool.query(
      `SELECT f.*, fa.camp_id AS camp_a, fb.camp_id AS camp_b
       FROM fights f
       JOIN fighters fa ON fa.id = f.fighter_a_id
       JOIN fighters fb ON fb.id = f.fighter_b_id
       WHERE f.id = $1`,
      [req.params.id]
    );

    if (fight.rows.length === 0) {
      return res.status(404).json({ error: "Fight not found" });
    }

    const f = fight.rows[0];

    // Must be owner of at least one fighter
    if (f.camp_a !== campId && f.camp_b !== campId) {
      return res.status(403).json({ error: "You do not own either fighter in this fight" });
    }

    // Must be pending
    if (f.status !== "pending") {
      return res.status(409).json({ error: "Fight is not in pending status" });
    }

    // Both gameplans required
    if (!f.plan_a || !f.plan_b) {
      return res.status(400).json({ error: "Both gameplans required" });
    }

    // Fetch full fighter data from DB
    const [aRes, bRes] = await Promise.all([
      pool.query("SELECT * FROM fighters WHERE id = $1", [f.fighter_a_id]),
      pool.query("SELECT * FROM fighters WHERE id = $1", [f.fighter_b_id]),
    ]);
    const fighterA = aRes.rows[0];
    const fighterB = bRes.rows[0];

    // Generate seed — crypto.randomInt, NOT Math.random
    const seed = crypto.randomInt(1, 2147483647);

    // Prep fighters (morale/age modifiers, weight class delta)
    const A = prepFighter(fighterA);
    const B = prepFighter(fighterB);

    // Corner policy: return stored choice every round (simple MVP)
    // runFight applies cornerPolicy to fighter A; fighter B uses AI default
    const cornerPolicy = () => f.corner_choice_a || "go";

    // runFight already calls setRNG(mulberry32(seed)) internally
    // Default 3 rounds for non-title fights
    const result = runFight(A, B, f.plan_a, cornerPolicy, seed, 3);

    // Map winner "A"/"B" back to UUID
    const winnerId = result.winner === "A" ? f.fighter_a_id : f.fighter_b_id;

    // Update fight record
    const updated = await pool.query(
      `UPDATE fights SET
        status = 'resolved', seed = $1, round = $2,
        winner_id = $3, how = $4, round_log = $5,
        resolved_at = now()
       WHERE id = $6 RETURNING *`,
      [
        seed,
        result.round,
        winnerId,
        result.how || "Decision",
        JSON.stringify(result.roundLogs),
        req.params.id,
      ]
    );

    res.json({ fight: updated.rows[0] });
  } catch (err) {
    console.error("Resolve error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});
