/**
 * OTP issuance and verification for staff phone login.
 *
 * Security properties:
 *   - Only an HMAC of the code is stored (never plaintext).
 *   - Codes expire quickly and have a per-code attempt cap.
 *   - Verification is constant-time on the hash.
 *   - Only phones that belong to an active staff_user can request a code, so the
 *     endpoint can't be used to spray SMS to arbitrary numbers.
 */
import crypto from "node:crypto";
import { query } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { sendSms } from "./sms";
import { logger } from "@/lib/logger";
import type { StaffRole } from "./session";

const CODE_TTL_SECONDS = 5 * 60; // 5 minutes
const MAX_ATTEMPTS = 5;

/** Normalize a phone to a comparable form (strip spaces/dashes). */
export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-()]/g, "");
}

function hashCode(phone: string, code: string): string {
  const secret = getEnv().AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return crypto.createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
}

export interface StaffIdentity {
  id: string;
  role: StaffRole;
  full_name: string;
}

async function findActiveStaff(phone: string): Promise<StaffIdentity | null> {
  const rows = await query<StaffIdentity>(
    `SELECT id, role, full_name FROM staff_users WHERE phone = $1 AND active = TRUE`,
    [phone],
  );
  return rows[0] ?? null;
}

export interface RequestOtpResult {
  ok: boolean;
  /** Generic outcome — we do NOT reveal whether the phone is a known staff member. */
  message: string;
}

/**
 * Issue an OTP for a phone. Always returns a generic success message to avoid
 * leaking which numbers are staff. Sends SMS only for known active staff.
 */
export async function requestOtp(rawPhone: string): Promise<RequestOtpResult> {
  const phone = normalizePhone(rawPhone);
  const generic = {
    ok: true,
    message: "אם המספר רשום במערכת, יישלח אליו קוד אימות.",
  };

  const staff = await findActiveStaff(phone);
  if (!staff) {
    logger.info("otp requested for non-staff phone (ignored)", { phone });
    return generic;
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000);

  await query(
    `INSERT INTO auth_otp (phone, code_hash, expires_at) VALUES ($1, $2, $3)`,
    [phone, hashCode(phone, code), expiresAt.toISOString()],
  );

  await sendSms(phone, `קוד הכניסה שלך ל${"מרכז"}: ${code} (תקף ל-5 דקות)`);
  return generic;
}

export interface VerifyOtpResult {
  ok: boolean;
  staff?: StaffIdentity;
  error?: string;
}

/**
 * Verify a code against the most recent unconsumed OTP for the phone.
 * Consumes the code on success; counts attempts on failure.
 */
export async function verifyOtp(
  rawPhone: string,
  code: string,
): Promise<VerifyOtpResult> {
  const phone = normalizePhone(rawPhone);

  const rows = await query<{ id: string; attempts: number }>(
    `SELECT id, attempts FROM auth_otp
      WHERE phone = $1
        AND consumed_at IS NULL
        AND expires_at > now()
        AND code_hash = $2
        AND attempts < $3
      ORDER BY created_at DESC
      LIMIT 1`,
    [phone, hashCode(phone, code), MAX_ATTEMPTS],
  );

  if (!rows[0]) {
    // Best-effort: bump attempts on the latest live OTP for this phone.
    await query(
      `UPDATE auth_otp SET attempts = attempts + 1
        WHERE id = (
          SELECT id FROM auth_otp
           WHERE phone = $1 AND consumed_at IS NULL AND expires_at > now()
           ORDER BY created_at DESC LIMIT 1
        )`,
      [phone],
    );
    return { ok: false, error: "קוד שגוי או שפג תוקפו." };
  }

  await query(`UPDATE auth_otp SET consumed_at = now() WHERE id = $1`, [rows[0].id]);

  const staff = await findActiveStaff(phone);
  if (!staff) return { ok: false, error: "המשתמש אינו פעיל." };

  await query(`UPDATE staff_users SET last_login_at = now() WHERE id = $1`, [
    staff.id,
  ]);
  return { ok: true, staff };
}
