/**
 * Stateless staff sessions — a compact HMAC-signed token stored in an
 * httpOnly cookie. No server-side session store needed; the signature +
 * expiry are self-validating. Runs in the Node runtime (route handlers and
 * server components), using Node's crypto.
 */
import crypto from "node:crypto";
import { getEnv } from "@/lib/env";

export const SESSION_COOKIE = "tali_staff_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export type StaffRole = "therapist" | "manager";

export interface SessionPayload {
  uid: string; // staff_user id
  role: StaffRole;
  exp: number; // unix seconds
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function sign(data: string): string {
  return b64url(
    crypto.createHmac("sha256", getEnv().AUTH_SECRET).update(data).digest(),
  );
}

/** Create a signed session token for a staff user. */
export function createSessionToken(uid: string, role: StaffRole): string {
  const payload: SessionPayload = {
    uid,
    role,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Verify a token; returns the payload or null if invalid/expired/tampered. */
export function verifySessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;

  const expected = sign(body);
  // Constant-time comparison to avoid timing leaks.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(),
    ) as SessionPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
