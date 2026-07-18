import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pg from "pg";
import rateLimit from "express-rate-limit";
import { getJwtSecret } from "../config.js";

const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const SALT_ROUNDS = 10;
const JWT_SECRET = getJwtSecret();
const JWT_EXPIRY = "7d";

export const authRouter = Router();

// Rate limiting: 10 attempts per 15 minutes per IP
// Disabled in test environment so test suite can run without blocking
const authLimiter = process.env.NODE_ENV === "test"
  ? (req, _res, next) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: "Too many attempts. Try again later." },
    });

authRouter.post("/register", authLimiter, async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ error: "username, email, and password are required" });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email, created_at`,
      [username, email, password_hash]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    res.status(201).json({ user, token });
  } catch (err) {
    // Handle unique constraint violations
    if (err.code === "23505") {
      const field = err.constraint?.includes("username") ? "username" : "email";
      return res.status(409).json({ error: `${field} already exists` });
    }
    console.error("Register error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/auth/login ─────────────────────────────────────
authRouter.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    // Find user by email
    const result = await pool.query(
      `SELECT id, username, email, password_hash FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];

    // Compare password
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRY });

    res.json({ user: { id: user.id, username: user.username, email: user.email }, token });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
});
