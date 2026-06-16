/**
 * POST /api/auth/verify-otp — verify a code and start a staff session.
 * On success sets an httpOnly, SameSite=Lax session cookie.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOtp } from "@/auth/otp";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from "@/auth/session";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const schema = z.object({
  phone: z.string().min(6).max(20),
  code: z.string().regex(/^\d{6}$/, "code must be 6 digits"),
});

export async function POST(req: Request) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const result = await verifyOtp(body.phone, body.code);
    if (!result.ok || !result.staff) {
      return NextResponse.json(
        { ok: false, error: result.error ?? "קוד שגוי." },
        { status: 401 },
      );
    }

    const token = createSessionToken(result.staff.id, result.staff.role);
    const res = NextResponse.json({
      ok: true,
      role: result.staff.role,
      full_name: result.staff.full_name,
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
    return res;
  } catch (err) {
    logger.error("verify-otp failed", { err: String(err) });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
