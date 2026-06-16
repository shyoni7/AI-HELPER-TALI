/**
 * Centralized, validated environment access.
 *
 * Why a module: it keeps `process.env` reads in one place, fails fast with a
 * clear message when a required secret is missing, and never logs secret values.
 */
import { z } from "zod";

const schema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  ANTHROPIC_MODEL: z.string().default("claude-opus-4-8"),

  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection string"),

  // Secret used to sign staff session tokens (HMAC). Required for the staff area.
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters"),

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

export const allowedOrigins = (): string[] =>
  getEnv()
    .ALLOWED_ORIGINS.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
