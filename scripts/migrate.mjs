/**
 * Minimal migration runner — applies db/schema.sql.
 * Usage: node --env-file=.env scripts/migrate.mjs
 *
 * Phase 0 keeps this intentionally simple (single idempotent schema file using
 * IF NOT EXISTS). Swap for a real migration tool (e.g. node-pg-migrate, Drizzle)
 * when migrations start to evolve.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const sql = readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8");
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
    console.log("✓ schema applied");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("migration failed:", err.message);
  process.exit(1);
});
