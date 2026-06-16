/**
 * Tool: cancel_appointment — cancel a booking (SENSITIVE).
 *
 * Cancelling frees a slot, removes the calendar event, and triggers the smart
 * waitlist: the freed slot is offered to the best-matching waiting patient.
 */
import type { Tool, ToolResult, ToolContext } from "./types";
import { query } from "@/lib/db";
import { getCalendar } from "@/agent/calendar/google";
import { handleFreedSlot, type OpenSlot } from "@/waitlist/matcher";
import { logger } from "@/lib/logger";

interface Input {
  appointment_id: string;
}

interface ApptRow {
  id: string;
  therapist_id: string;
  starts_at: string;
  ends_at: string;
  gcal_event_id: string | null;
  status: string;
  therapist_name: string;
  google_calendar_id: string | null;
  specialties: string[];
}

export const cancelAppointmentTool: Tool<Input> = {
  name: "cancel_appointment",
  description:
    "בטל פגישה קיימת לפי מזהה. פעולה רגישה — אשר עם המשתמש לפני הקריאה. ביטול מפנה את הזמן ומפעיל אוטומטית פנייה למתאימים ברשימת ההמתנה.",
  sensitive: true,
  input_schema: {
    type: "object",
    properties: {
      appointment_id: { type: "string", description: "מזהה הפגישה לביטול." },
    },
    required: ["appointment_id"],
  },
  async execute(input: Input, _ctx: ToolContext): Promise<ToolResult> {
    const rows = await query<ApptRow>(
      `SELECT a.id, a.therapist_id, a.starts_at, a.ends_at, a.gcal_event_id, a.status,
              t.full_name AS therapist_name, t.google_calendar_id, t.specialties
         FROM appointments a
         JOIN therapists t ON t.id = a.therapist_id
        WHERE a.id = $1`,
      [input.appointment_id],
    );
    const appt = rows[0];
    if (!appt) {
      return { content: { error: "פגישה לא נמצאה." }, isError: true };
    }
    if (appt.status !== "booked") {
      return {
        content: { error: `לא ניתן לבטל פגישה במצב '${appt.status}'.` },
        isError: true,
      };
    }

    await query(`UPDATE appointments SET status = 'cancelled' WHERE id = $1`, [
      appt.id,
    ]);

    // Remove the calendar event (stubbed in Phase 0).
    if (appt.gcal_event_id && appt.google_calendar_id) {
      try {
        await getCalendar().deleteEvent(appt.google_calendar_id, appt.gcal_event_id);
      } catch (err) {
        logger.warn("calendar event delete failed (continuing)", {
          err: String(err),
        });
      }
    }

    // Fire the smart-waitlist outreach for the freed slot.
    const freed: OpenSlot = {
      therapistId: appt.therapist_id,
      therapistName: appt.therapist_name,
      therapistSpecialties: appt.specialties,
      startsAt: appt.starts_at,
      endsAt: appt.ends_at,
    };
    const outreach = await handleFreedSlot(freed);

    logger.info("appointment cancelled", {
      appointmentId: appt.id,
      offered: outreach.offered,
    });

    return {
      content: {
        ok: true,
        cancelled_appointment_id: appt.id,
        waitlist_offer_sent: outreach.offered,
      },
    };
  },
};
