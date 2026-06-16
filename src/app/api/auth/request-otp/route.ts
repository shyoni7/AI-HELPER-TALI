/**
 * POST /api/auth/request-otp — issue a login code for a staff phone.
 * Always returns a generic success (no enumeration of staff numbers).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { requestOtp } from "@/auth/otp";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const schema = z.object({ phone: z.string().min(6).max(20) });

export async function POST(req: Request) {
  let phone: string;
  try {
    ({ phone } = schema.parse(await req.json()));
  } catch {
    return NextResponse.json({ error: "invalid request" }, { status: 400 });
  }

  try {
    const result = await requestOtp(phone);
    return NextResponse.json({ ok: result.ok, message: result.message });
  } catch (err) {
    logger.error("request-otp failed", { err: String(err) });
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
