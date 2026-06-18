/**
 * Add a staff user (manager or therapist) — managers are created manually.
 * Usage:
 *   node --env-file=.env scripts/add-staff.mjs --phone 0500000000 --name "מנהל" --role manager
 *   node --env-file=.env scripts/add-staff.mjs --phone 0501111111 --name "ד״ר כהן" --role therapist --therapist-id <uuid>
 *
 * Phone is normalized (spaces/dashes stripped) to match the login flow.
 */
import pg from "pg";

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function normalizePhone(p) {
  return p.replace(/[\s\-()]/g, "");
}

async function main() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NON_POOLING;
  if (!url) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }
  const phone = arg("phone");
  const name = arg("name");
  const role = arg("role");
  const therapistId = arg("therapist-id") ?? null;

  if (!phone || !name || !["manager", "therapist"].includes(role)) {
    console.error(
      "Required: --phone <phone> --name <name> --role <manager|therapist> [--therapist-id <uuid>]",
    );
    process.exit(1);
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query(
      `INSERT INTO staff_users (phone, full_name, role, therapist_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (phone) DO UPDATE
         SET full_name = EXCLUDED.full_name,
             role = EXCLUDED.role,
             therapist_id = EXCLUDED.therapist_id,
             active = TRUE
       RETURNING id, phone, role`,
      [normalizePhone(phone), name, role, therapistId],
    );
    console.log("✓ staff user upserted:", rows[0]);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("add-staff failed:", err.message);
  process.exit(1);
});
