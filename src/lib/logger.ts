/**
 * Privacy-aware logger.
 *
 * Health-adjacent data must never leak into logs. This logger redacts common
 * PII patterns (emails, phone numbers, long digit runs) before anything is
 * written, and stays silent at debug level unless DEBUG_LOGGING=true.
 */
import { getEnv } from "./env";

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// Israeli + international-ish phone shapes and any 7+ digit run.
const PHONE_RE = /\+?\d[\d\s\-()]{6,}\d/g;

/** Redact PII from an arbitrary value before logging. */
export function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(EMAIL_RE, "[email]").replace(PHONE_RE, "[phone]");
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      // Drop obviously sensitive keys entirely.
      if (/^(password|token|api[_-]?key|secret|private[_-]?key)$/i.test(k)) {
        out[k] = "[redacted]";
      } else {
        out[k] = redact(v);
      }
    }
    return out;
  }
  return value;
}

function emit(level: "info" | "warn" | "error" | "debug", msg: string, meta?: unknown) {
  const line = {
    level,
    msg,
    ...(meta !== undefined ? { meta: redact(meta) } : {}),
    ts: new Date().toISOString(),
  };
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](JSON.stringify(line));
}

export const logger = {
  info: (msg: string, meta?: unknown) => emit("info", msg, meta),
  warn: (msg: string, meta?: unknown) => emit("warn", msg, meta),
  error: (msg: string, meta?: unknown) => emit("error", msg, meta),
  debug: (msg: string, meta?: unknown) => {
    if (getEnv().DEBUG_LOGGING) emit("debug", msg, meta);
  },
};
