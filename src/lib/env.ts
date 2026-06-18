/**
 * Centralized, validated environment access.
 *
 * Why a module: it keeps `process.env` reads in one place, fails fast with a
 * clear message when a required secret is missing, and never logs secret values.
 */
import { z } from "zod";

// All external-service secrets are OPTIONAL at the schema level and enforced at
// the point of use (getAnthropic / getPool / session). This lets the app deploy
// and degrade gracefully when only some env vars are set (e.g. a first deploy
// with no DB yet) instead of failing every request on a missing var.
const schema = z.object({
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-opus-4-8"),

  DATABASE_URL: z.string().optional(),
  // Vercel Postgres / Neon inject these names. We accept any of them so
  // connecting a Vercel Postgres store "just works" without manual aliasing.
  POSTGRES_URL: z.string().optional(),
  POSTGRES_URL_NON_POOLING: z.string().optional(),

  // Secret used to sign staff session tokens (HMAC). Required for the staff area.
  AUTH_SECRET: z.string().optional(),

  // SMS provider for OTP delivery — provider chosen at M2. Optional: when unset,
  // the OTP is logged (dev) instead of sent, so the flow is testable end-to-end.
  SMS_PROVIDER_API_KEY: z.string().optional(),
  SMS_FROM: z.string().optional(),

  // Google Calendar — optional in Phase 0 (calendar layer is stubbed).
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().optional(),
  GOOGLE_CENTRAL_CALENDAR_ID: z.string().optional(),
  GOOGLE_WEBHOOK_BASE_URL: z.string().optional(),

  // Notifications.
  EMAIL_FROM: z.string().optional(),
  EMAIL_PROVIDER_API_KEY: z.string().optional(),
  WHATSAPP_API_KEY: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),

  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  CENTER_TIMEZONE: z.string().default("Asia/Jerusalem"),
  DEBUG_LOGGING: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/**
 * Parse and cache the environment. Throws a readable error on misconfiguration.
 * Call lazily (inside handlers) so importing this module never crashes at build.
 */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Resolve a Postgres connection string from any supported env var name. */
export const databaseUrl = (): string | undefined => {
  const e = getEnv();
  return e.DATABASE_URL ?? e.POSTGRES_URL ?? e.POSTGRES_URL_NON_POOLING;
};

export const allowedOrigins = (): string[] =>
  getEnv()
    .ALLOWED_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
