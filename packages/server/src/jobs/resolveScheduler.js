import { Queue, Worker } from "bullmq";
import pg from "pg";
import { resolveFight } from "../services/resolveFight.js";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CONNECTION = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
};

const QUEUE_NAME = "fight-resolve";

export function startResolveScheduler() {
  const queue = new Queue(QUEUE_NAME, { connection: CONNECTION });

  // Repeating job every 60 seconds
  queue.upsertJobScheduler(
    "resolve-pending-fights",
    { every: 60000 },
    { name: "resolve-pending-fights" }
  ).catch((err) => console.error("Queue scheduler error:", err.message));

  const worker = new Worker(
    QUEUE_NAME,
    async () => {
      const result = await pool.query(
        `SELECT id FROM fights
         WHERE status = 'pending'
         AND plan_a IS NOT NULL
         AND plan_b IS NOT NULL`
      );

      for (const row of result.rows) {
        try {
          await resolveFight(row.id);
          console.log(`⚡ Auto-resolved fight ${row.id.slice(0, 8)}`);
        } catch (err) {
          console.error(`⚠️  Auto-resolve failed for ${row.id.slice(0, 8)}: ${err.message}`);
        }
      }

      if (result.rows.length > 0) {
        console.log(`📊 Resolved ${result.rows.length} fight(s)`);
      }
    },
    { connection: CONNECTION }
  );

  worker.on("error", (err) => {
    console.error("BullMQ worker error:", err.message);
  });

  console.log("⏰ Fight resolve scheduler started (every 60s)");
  return { queue, worker };
}
