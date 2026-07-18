import pg from "pg";
import crypto from "crypto";
import { runFight, prepFighter } from "@ironfist/engine/fight.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Resolve a fight: run the engine, update fight record + fighter records.
 * All writes are wrapped in a single DB transaction for atomicity.
 * @param {string} fightId - UUID of the fight to resolve
 * @returns {object} The updated fight row
 */
export async function resolveFight(fightId) {
  // Fetch fight with fighter data (read-only, outside transaction)
  const fight = await pool.query(
    `SELECT f.*, fa.camp_id AS camp_a, fb.camp_id AS camp_b
     FROM fights f
     JOIN fighters fa ON fa.id = f.fighter_a_id
     JOIN fighters fb ON fb.id = f.fighter_b_id
     WHERE f.id = $1`,
    [fightId]
  );

  if (fight.rows.length === 0) {
    throw new Error("Fight not found");
  }

  const f = fight.rows[0];

  if (f.status !== "pending") {
    throw new Error("Fight is not in pending status");
  }

  if (!f.plan_a || !f.plan_b) {
    throw new Error("Both gameplans required");
  }

  // Fetch full fighter data (read-only, outside transaction)
  const [aRes, bRes] = await Promise.all([
    pool.query("SELECT * FROM fighters WHERE id = $1", [f.fighter_a_id]),
    pool.query("SELECT * FROM fighters WHERE id = $1", [f.fighter_b_id]),
  ]);
  const fighterA = aRes.rows[0];
  const fighterB = bRes.rows[0];

  // Generate seed
  const seed = crypto.randomInt(1, 2147483647);

  // Prep fighters
  const A = prepFighter(fighterA);
  const B = prepFighter(fighterB);

  // Corner policy: constant from stored choice
  const cornerPolicy = () => f.corner_choice_a || "go";

  // Run fight
  const result = runFight(A, B, f.plan_a, cornerPolicy, seed, 3);

  // Map winner
  const winnerId = result.winner === "A" ? f.fighter_a_id : f.fighter_b_id;
  const how = result.how || "Decision";
  const loserId = result.winner === "A" ? f.fighter_b_id : f.fighter_a_id;

  // ── All writes in a single transaction ──
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Update fight record
    const updated = await client.query(
      `UPDATE fights SET
        status = 'resolved', seed = $1, round = $2,
        winner_id = $3, how = $4, round_log = $5,
        resolved_at = now()
       WHERE id = $6 RETURNING *`,
      [seed, result.round, winnerId, how, JSON.stringify(result.logs || result.roundLogs), fightId]
    );

    // Update fighter records
    const [wRes, lRes] = await Promise.all([
      client.query("SELECT record FROM fighters WHERE id = $1", [winnerId]),
      client.query("SELECT record FROM fighters WHERE id = $1", [loserId]),
    ]);

    const wRec = wRes.rows[0].record;
    const lRec = lRes.rows[0].record;

    wRec.w = (wRec.w || 0) + 1;
    if (how === "KO/TKO" || how === "Doctor Stoppage") wRec.ko = (wRec.ko || 0) + 1;
    else if (how === "Submission") wRec.sub = (wRec.sub || 0) + 1;
    else wRec.dec = (wRec.dec || 0) + 1;

    lRec.l = (lRec.l || 0) + 1;

    await Promise.all([
      client.query("UPDATE fighters SET record = $1 WHERE id = $2", [JSON.stringify(wRec), winnerId]),
      client.query("UPDATE fighters SET record = $1 WHERE id = $2", [JSON.stringify(lRec), loserId]),
    ]);

    await client.query("COMMIT");
    return updated.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
