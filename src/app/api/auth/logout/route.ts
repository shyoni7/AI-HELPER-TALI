/**
 * POST /api/auth/logout — clear the staff session cookie.
 */
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/auth/session";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
