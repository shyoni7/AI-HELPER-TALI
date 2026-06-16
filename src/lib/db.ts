/**
 * Postgres access via a shared connection pool.
 *
 * Uses a module-level singleton so serverless invocations on Vercel reuse the
 * pool across warm starts instead of opening a new connection per request.
 */
import { Pool, type QueryResultRow } from "pg";
import { getEnv } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var __taliPgPool: Pool | undefined;
}

function createPool(): Pool {
  const { DATABASE_URL } = getEnv();
  if (!DATABASE_URL) {
    // Callers wrap DB access in try/catch and degrade (e.g. placeholder data).
    throw new Error("DATABASE_URL is not configured");
  }
  return new Pool({
    connectionString: DATABASE_URL,
    // Keep the pool small — serverless functions are short-lived and the
    // managed Postgres pooler does the heavy lifting.
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });
}

export function getPool(): Pool {
  if (!global.__taliPgPool) {
    global.__taliPgPool = createPool();
  }
  return global.__taliPgPool;
}

/** Typed query helper. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params as never[]);
  return result.rows;
}

/** Run a function inside a transaction; rolls back on error. */
export async function withTransaction<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
