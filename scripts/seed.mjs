/**
 * Seed a couple of therapists for local development.
 * Usage: node --env-file=.env scripts/seed.mjs
 *
 * Uses only non-PII demo data. Safe to re-run (skips if therapists exist).
 */
import pg from "pg";

async function main() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query("SELECT count(*)::int AS n FROM therapists");
    if (rows[0].n > 0) {
      console.log("therapists already present; skipping seed");
      return;
    }
    await client.query(
      `INSERT INTO therapists (full_name, specialties, languages, default_slot_minutes)
       VALUES
         ($1, $2, $3, 50),
         ($4, $5, $6, 50)`,
      [
        "ד\"ר נועה כהן",
        ["CBT", "פרטני", "חרדה"],
        ["he", "en"],
        "מיכאל לוי",
        ["זוגי", "מתבגרים"],
        ["he", "ru"],
      ],
    );
    console.log("✓ seeded 2 therapists");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("seed failed:", err.message);
  process.exit(1);
});
