/**
 * GET /api/availability?date=YYYY-MM-DD&therapistId=...
 *
 * Returns open time slots for a date. Phase 0/M1: derived from the center's
 * working hours with a deterministic subset marked "taken" so the widget feels
 * live without a connected calendar. M4 replaces this with real Google Calendar
 * freebusy via the existing calendar port.
 *
 * No DB access — works on the live site before Postgres is provisioned.
 */
import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Center working hours: Sun–Thu, hourly starts 09:00–16:00. Fri/Sat closed.
const WORK_START_HOUR = 9;
const WORK_END_HOUR = 17; // last start = 16:00
const CLOSED_WEEKDAYS = new Set([5, 6]); // 5=Fri, 6=Sat

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  therapistId: z.string().optional(),
});

function seedFrom(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) n = (n + s.charCodeAt(i)) % 997;
  return n;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = schema.safeParse({
    date: url.searchParams.get("date") ?? "",
    therapistId: url.searchParams.get("therapistId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  const { date, therapistId } = parsed.data;
  // Parse as local center date; weekday is enough for open/closed.
  const d = new Date(`${date}T00:00:00`);
  const weekday = d.getDay();

  if (CLOSED_WEEKDAYS.has(weekday)) {
    return NextResponse.json({ date, closed: true, slots: [] });
  }

  const seed = seedFrom((therapistId ?? "any") + date) + d.getDate();
  const slots: string[] = [];
  for (let h = WORK_START_HOUR, i = 0; h < WORK_END_HOUR; h++, i++) {
    // ~1 in 3 deterministically "taken" to look realistic.
    if ((seed + i) % 3 === 0) continue;
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }

  return NextResponse.json({ date, closed: false, slots });
}
