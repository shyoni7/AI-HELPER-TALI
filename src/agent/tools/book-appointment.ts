/**
 * Tool: book_appointment — create a booking (SENSITIVE).
 *
 * Hard-to-reverse + outward-facing (writes to the calendar, commits a slot), so
 * it is marked sensitive: the model must confirm details with the user first.
 *
 * Concurrency safety: the unique index uq_appointments_active_slot guarantees
 * two users can't book the same therapist/slot. We surface a friendly conflict
 * error if that race is lost.
 */
import type { Tool, ToolResult, ToolContext } from "./types";
import { query, withTransaction } from "@/lib/db";
import type { Therapist } from "@/types/domain";
import { getCalendar } from "@/agent/calendar/google";
import { logger } from "@/lib/logger";

interface Input {
  therapist_id: string;
  /** ISO 8601 start time of the requested slot. */
  starts_at: string;
  /** Patient details (used to find-or-create the patient row). */
  patient: {
    full_name?: string;
    email?: string;
    phone?: string;
    consent_contact?: boolean;
  };
  /** Short, non-clinical label only. */
  reason?: string;
}

export const bookAppointmentTool: Tool<Input> = {
  name: "book_appointment",
  description:
    "קבע פגישה למטופל בזמן פנוי שאומת. פעולה רגישה ובלתי-הפיכה — אשר עם המשתמש את המטפל, התאריך והשעה לפני הקריאה. אל תאחסן מידע קליני בשדה reason.",
  sensitive: true,
  input_schema: {
    type: "object",
    properties: {
      therapist_id: { type: "string", description: "מזהה המטפל." },
      starts_at: { type: "string", description: "שעת התחלה (ISO 8601)." },
      patient: {
        type: "object",
        description: "פרטי המטופל לזיהוי או יצירה.",
        properties: {
          full_name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          consent_contact: {
            type: "boolean",
            description: "האם המטופל הסכים ליצירת קשר יזום.",
          },
        },
      },
      reason: {
        type: "string",
        description: "תווית קצרה ולא-קלינית לפגישה (לדוגמה 'פגישת היכרות').",
      },
    },
    required: ["therapist_id", "starts_at", "patient"],
  },
  async execute(input: Input, ctx: ToolContext): Promise<ToolResult> {
    const therapists = await query<Therapist>(
      `SELECT id, full_name, google_calendar_id, default_slot_minutes
         FROM therapists WHERE id = $1 AND active = TRUE`,
      [input.therapist_id],
    );
    const therapist = therapists[0];
    if (!therapist) {
      return { content: { error: "מטפל לא נמצא או אינו פעיל." }, isError: true };
    }

    const startsAt = new Date(input.starts_at);
    const endsAt = new Date(
      startsAt.getTime() + therapist.default_slot_minutes * 60_000,
    );

    try {
      const result = await withTransaction(async (client) => {
        // Find-or-create patient (PII single source of truth).
        let patientId = ctx.patientId;
        if (!patientId) {
          const found = input.patient.email
            ? await client.query<{ id: string }>(
                `SELECT id FROM patients WHERE lower(email) = lower($1)`,
                [input.patient.email],
              )
            : { rows: [] as { id: string }[] };
          if (found.rows[0]) {
            patientId = found.rows[0].id;
          } else {
            const ins = await client.query<{ id: string }>(
              `INSERT INTO patients (full_name, email, phone, consent_contact, consent_at)
               VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN now() ELSE NULL END)
               RETURNING id`,
              [
                input.patient.full_name ?? null,
                input.patient.email ?? null,
                input.patient.phone ?? null,
                input.patient.consent_contact ?? false,
              ],
            );
            patientId = ins.rows[0].id;
          }
        }

        // Insert the appointment; the partial unique index enforces no double-book.
        const appt = await client.query<{ id: string }>(
          `INSERT INTO appointments
             (therapist_id, patient_id, starts_at, ends_at, reason, source)
           VALUES ($1, $2, $3, $4, $5, 'chat')
           RETURNING id`,
          [
            therapist.id,
            patientId,
            startsAt.toISOString(),
            endsAt.toISOString(),
            input.reason ?? null,
          ],
        );
        return { appointmentId: appt.rows[0].id, patientId };
      });

      // Mirror to Google Calendar (stubbed in Phase 0).
      let gcalEventId: string | null = null;
      if (therapist.google_calendar_id) {
        const ev = await getCalendar().createEvent({
          calendarId: therapist.google_calendar_id,
          summary: `פגישה: ${input.patient.full_name ?? "מטופל/ת"}`,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          description: input.reason,
          attendeeEmail: input.patient.email,
        });
        gcalEventId = ev.eventId;
        await query(`UPDATE appointments SET gcal_event_id = $1 WHERE id = $2`, [
          gcalEventId,
          result.appointmentId,
        ]);
      }

      logger.info("appointment booked", {
        appointmentId: result.appointmentId,
        therapistId: therapist.id,
      });

      return {
        content: {
          ok: true,
          appointment_id: result.appointmentId,
          therapist_name: therapist.full_name,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
        },
      };
    } catch (err) {
      // Unique-violation on the active-slot index => someone took it first.
      if (typeof err === "object" && err && (err as { code?: string }).code === "23505") {
        return {
          content: { error: "הזמן הזה נתפס זה עתה. אנא בחרו זמן אחר." },
          isError: true,
        };
      }
      logger.error("booking failed", { err: String(err) });
      return { content: { error: "אירעה שגיאה בקביעת הפגישה." }, isError: true };
    }
  },
};
