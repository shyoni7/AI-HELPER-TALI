/**
 * Tool: check_availability — real availability via Google Calendar freebusy.
 *
 * Combines the central calendar + therapist calendars to compute open slots in
 * a requested window. Read-only, so not marked sensitive.
 */
import type { Tool, ToolResult, ToolContext } from "./types";
import { query } from "@/lib/db";
import type { Therapist, TimeSlot } from "@/types/domain";
import { getCalendar, computeOpenSlots } from "@/agent/calendar/google";

interface Input {
  /** ISO 8601 start of the search window. */
  from: string;
  /** ISO 8601 end of the search window. */
  to: string;
  /** Optional: limit to a specific therapist. */
  therapist_id?: string;
  /** Optional: filter therapists by specialty. */
  specialty?: string;
}

export const checkAvailabilityTool: Tool<Input> = {
  name: "check_availability",
  description:
    "בדוק זמינות אמיתית של מטפלים בטווח זמן נתון מול Google Calendar. החזר רשימת זמנים פנויים. השתמש בכלי הזה לפני שמציעים ללקוח זמן לפגישה.",
  input_schema: {
    type: "object",
    properties: {
      from: { type: "string", description: "תחילת טווח החיפוש (ISO 8601)." },
      to: { type: "string", description: "סוף טווח החיפוש (ISO 8601)." },
      therapist_id: {
        type: "string",
        description: "אופציונלי: הגבל למטפל מסוים לפי מזהה.",
      },
      specialty: {
        type: "string",
        description: "אופציונלי: סנן מטפלים לפי התמחות.",
      },
    },
    required: ["from", "to"],
  },
  async execute(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    const params: unknown[] = [];
    const conditions = ["active = TRUE", "google_calendar_id IS NOT NULL"];
    if (input.therapist_id) {
      params.push(input.therapist_id);
      conditions.push(`id = $${params.length}`);
    }
    if (input.specialty) {
      params.push(input.specialty);
      conditions.push(`$${params.length} = ANY(specialties)`);
    }
    const therapists = await query<Therapist>(
      `SELECT id, full_name, specialties, google_calendar_id, default_slot_minutes
         FROM therapists WHERE ${conditions.join(" AND ")}`,
      params,
    );

    const calendar = getCalendar();
    const windowStart = new Date(input.from);
    const windowEnd = new Date(input.to);
    const allSlots: (TimeSlot & { therapist_name: string })[] = [];

    for (const t of therapists) {
      if (!t.google_calendar_id) continue;
      const busy = await calendar.getFreeBusy({
        calendarId: t.google_calendar_id,
        timeMin: input.from,
        timeMax: input.to,
      });
      const open = computeOpenSlots(
        t.id,
        windowStart,
        windowEnd,
        busy,
        t.default_slot_minutes,
      );
      for (const slot of open.slice(0, 5)) {
        allSlots.push({ ...slot, therapist_name: t.full_name });
      }
    }

    return {
      content: {
        note:
          therapists.length === 0
            ? "לא נמצאו מטפלים תואמים עם יומן מחובר. בשלב 0 ייתכן שאין מטפלים מוגדרים עדיין."
            : undefined,
        slots: allSlots.slice(0, 15),
      },
    };
  },
};
