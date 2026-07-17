import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use TEST_DATABASE_URL or fallback to a test-specific database
const TEST_DB_URL = process.env.TEST_DATABASE_URL || "postgresql://postgres@localhost:5432/mma_manager_test";

/**
 * Ensure the test database exists and has the schema applied.
 * Called once before all tests.
 */
export async function setupTestDb() {
  // Connect to postgres default DB to create test DB if needed
  const admin = new pg.Pool({ connectionString: "postgresql://postgres@localhost:5432/postgres" });
  try {
    await admin.query("CREATE DATABASE mma_manager_test");
  } catch {
    // Already exists — fine
  }
  await admin.end();

  // Run migration on test DB — drop first to handle re-runs
  const pool = new pg.Pool({ connectionString: TEST_DB_URL });
  const migration = readFileSync(join(__dirname, "..", "..", "migrations", "001_init.sql"), "utf8");
  // Drop all tables first (inside the migration's BEGIN/COMMIT block won't work, so we wrap it)
  await pool.query("DROP TABLE IF EXISTS fights, fighters, camps, users CASCADE");
  await pool.query(migration);
  await pool.end();
}

/**
 * Clean all rows from all tables between tests.
 */
export async function cleanTestDb() {
  const pool = new pg.Pool({ connectionString: TEST_DB_URL });
  await pool.query("TRUNCATE users, camps, fighters, fights CASCADE");
  await pool.end();
}

/**
 * Get a pool connected to the test database.
 */
export function getTestPool() {
  return new pg.Pool({ connectionString: TEST_DB_URL });
}

export { TEST_DB_URL };
