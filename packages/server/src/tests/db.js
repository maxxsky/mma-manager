import pg from "pg";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Use TEST_DATABASE_URL or fallback to a test-specific database
const TEST_DB_URL = process.env.TEST_DATABASE_URL || "postgresql://postgres@localhost:5432/mma_manager_test";

/**
 * Derive an admin connection URL from TEST_DB_URL by replacing
 * the database name with "postgres" (the default admin database).
 */
function adminUrl() {
  return TEST_DB_URL.replace(/\/[^/]+$/, "/postgres");
}

/**
 * Ensure the test database exists and has the schema applied.
 * Called once before all tests.
 */
export async function setupTestDb() {
  // Connect via admin database to create test DB if needed
  const admin = new pg.Pool({ connectionString: adminUrl() });
  try {
    await admin.query("CREATE DATABASE mma_manager_test");
  } catch (err) {
    // 42P04 = duplicate_database — already exists, that's fine
    if (err.code !== "42P04") throw err;
  }
  await admin.end();

  // Run migration on test DB — drop first to handle re-runs
  const pool = new pg.Pool({ connectionString: TEST_DB_URL });
  const migration = readFileSync(join(__dirname, "..", "..", "migrations", "001_init.sql"), "utf8");
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
