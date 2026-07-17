import { Router } from "express";
import pg from "pg";
import { requireAuth } from "../middleware/auth.js";

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
    let column = null;
    let cornerCol = null;
    if (f.camp_a === campId) {
      column = "plan_a";
      cornerCol = "corner_choice_a";
    } else if (f.camp_b === campId) {
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
