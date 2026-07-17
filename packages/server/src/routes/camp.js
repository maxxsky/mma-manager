import { Router } from "express";
import pg from "pg";
import { requireAuth } from "../middleware/auth.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const campRouter = Router();
campRouter.use(requireAuth);

// ── POST /api/camp — create a new camp ──
campRouter.post("/", async (req, res) => {
  try {
    // Check if user already has a camp
    const existing = await pool.query("SELECT id FROM camps WHERE user_id = $1", [req.userId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "User already has a camp" });
    }

    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "name is required" });
    }

    const result = await pool.query(
      `INSERT INTO camps (user_id, name) VALUES ($1, $2) RETURNING *`,
      [req.userId, name]
    );

    res.status(201).json({ camp: result.rows[0] });
  } catch (err) {
    console.error("Create camp error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/camp — get current user's camp ──
campRouter.get("/", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM camps WHERE user_id = $1", [req.userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Camp not found" });
    }
    res.json({ camp: result.rows[0] });
  } catch (err) {
    console.error("Get camp error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});
