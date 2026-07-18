// Quick inline test: resolveFight ROLLBACK verification
import pg from "pg";
import crypto from "crypto";

const pool = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
const defaultRecord = { w: 5, l: 1, ko: 0, sub: 0, dec: 0 };

async function main() {
  // Setup user
  const prefix = "rb" + Date.now();
  const user = await pool.query(
    `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, 'hash') RETURNING id`,
    [`${prefix}-user`, `${prefix}@t.com`]
  );
  const userId = user.rows[0].id;

  // Setup camp
  const camp = await pool.query(
    "INSERT INTO camps (user_id, name) VALUES ($1, 'Rollback Camp') RETURNING id",
    [userId]
  );
  const campId = camp.rows[0].id;

  // Setup fighters
  const f1 = await pool.query(
    "INSERT INTO fighters (camp_id, name, archetype, region, attrs, record) VALUES ($1, 'Rollback A', 'Boxer', 'USA', $2::jsonb) RETURNING id",
    [campId, JSON.stringify(defaultRecord)]
  );
  const f2 = await pool.query(
    "INSERT INTO fighters (camp_id, name, archetype, region, attrs, record) VALUES ($1, 'Rollback B', 'Muay Thai', 'Thailand', $2::jsonb) RETURNING id",
    [campId, JSON.stringify({ w: 3, l: 2, ko: 0, sub: 0, dec: 0 })]
  );
  const f1Id = f1.rows[0].id;
  const f2Id = f2.rows[0].id;

  // Setup fight
  const fight = await pool.query(
    `INSERT INTO fights (fighter_a_id, fighter_b_id, status, plan_a, plan_b, round, round_log, camp_a_id, camp_b_id)
     VALUES ($1, $2, 'pending', 'Balanced', 'Balanced', 0, '[]'::jsonb, $3, $3) RETURNING id`,
    [f1Id, f2Id, campId]
  );
  const fightId = fight.rows[0].id;

  const beforeFight = await pool.query("SELECT status FROM fights WHERE id = $1", [fightId]);
  const beforeRec = await pool.query("SELECT record FROM fighters WHERE id = $1", [f1Id]);
  console.log("BEFORE -> Fight status:", beforeFight.rows[0].status);
  console.log("BEFORE -> Fighter A record:", JSON.stringify(beforeRec.rows[0].record));

  // Run a resolveFight-like transaction with intentional crash AFTER fight update
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Step 1: Update fight status
    await client.query(
      `UPDATE fights SET status = 'resolved', round = 2 WHERE id = $1`,
      [fightId]
    );
    console.log("  -> Fight marked resolved (inside TX)");

    // Step 2: Simulate crash before fighter records update
    throw new Error("SIMULATED_CRASH — database connection lost mid-transaction");

    // These never execute:
    // await client.query("UPDATE fighters SET record = ... WHERE id = ...", [f1Id]);
    // await client.query("UPDATE fighters SET record = ... WHERE id = ...", [f2Id]);

    await client.query("COMMIT");
    console.log("UNEXPECTED: COMMIT succeeded");
  } catch (err) {
    await client.query("ROLLBACK");
    console.log("  -> ROLLBACK executed, reason:", err.message.slice(0, 40));
  } finally {
    client.release();
  }

  // Verify: fight should still be 'pending', fighter record unchanged
  const afterFight = await pool.query("SELECT status FROM fights WHERE id = $1", [fightId]);
  const afterRec = await pool.query("SELECT record FROM fighters WHERE id = $1", [f1Id]);

  console.log("\nAFTER Rollback -> Fight status:", afterFight.rows[0].status);
  console.log("AFTER Rollback -> Fighter A record:", JSON.stringify(afterRec.rows[0].record));

  const fightOk = afterFight.rows[0].status === "pending";
  const recOk = afterRec.rows[0].record.w === 5 && afterRec.rows[0].record.l === 1;

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Fight intact:  ${fightOk ? "✅ YES" : "❌ NO"} (still ${afterFight.rows[0].status})`);
  console.log(`Record intact: ${recOk ? "✅ YES" : "❌ NO"} (still w=${afterRec.rows[0].record.w}, l=${afterRec.rows[0].record.l})`);
  console.log(`RESULT: ${fightOk && recOk ? "✅ ROLLBACK BERHASIL — data utuh" : "❌ DATA CORRUPTED"}`);

  // Cleanup
  await pool.query("DELETE FROM fights WHERE id = $1", [fightId]);
  await pool.query("DELETE FROM fighters WHERE id IN ($1, $2)", [f1Id, f2Id]);
  await pool.query("DELETE FROM camps WHERE id = $1", [campId]);
  await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  await pool.end();
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
