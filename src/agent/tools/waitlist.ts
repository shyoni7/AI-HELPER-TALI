/**
 * Tool: join_waitlist — add a patient to the smart waitlist (SENSITIVE).
 *
 * Sensitive because it records consent to be contacted proactively. The model
 * must confirm the patient agreed to outreach before calling.
 */
import type { Tool, ToolResult, ToolContext } from "./types";
import { query, withTransaction } from "@/lib/db";
import type { AvailabilityWindow } from "@/types/domain";

interface Input {
  patient: {
    full_name?: string;
    email?: string;
    phone?: string;
    preferred_channel?: "email" | "whatsapp";
  };
  therapist_id?: string;
  preferred_specialties?: string[];
  availability_windows?: AvailabilityWindow[];
  /** Must be true — the patient agreed to be contacted proactively. */
  consent_contact: boolean;
}

export const joinWaitlistTool: Tool<Input> = {
  name: "join_waitlist",
  description:
    "הוסף מטופל לרשימת ההמתנה החכמה כשאין זמן פנוי מתאים. פעולה רגישה — חובה לוודא שהמטופל הסכים לפנייה יזומה (consent_contact=true) ולאסוף חלונות זמינות והעדפות לפני הקריאה.",
  sensitive: true,
  input_schema: {
    type: "object",
    properties: {
      patient: {
        type: "object",
        properties: {
          full_name: { type: "string" },
          email: { type: "string" },
          phone: { type: "string" },
          preferred_channel: { type: "string", enum: ["email", "whatsapp"] },
        },
      },
      therapist_id: {
        type: "string",
        description: "אופציונלי: העדפה למטפל מסוים.",
      },
      preferred_specialties: {
        type: "array",
        items: { type: "string" },
        description: "התמחויות מועדפות.",
      },
      availability_windows: {
        type: "array",
        description: "חלונות זמן שבהם המטופל פנוי.",
        items: {
          type: "object",
          properties: {
            weekday: { type: "integer", description: "0=ראשון .. 6=שבת" },
            from: { type: "string", description: "HH:mm" },
            to: { type: "string", description: "HH:mm" },
          },
          required: ["weekday", "from", "to"],
        },
      },
      consent_contact: {
        type: "boolean",
        description: "האם המטופל הסכים לפנייה יזומה. חובה true כדי להירשם.",
      },
    },
    required: ["patient", "consent_contact"],
  },
  async execute(input: Input, ctx: ToolContext): Promise<ToolResult> {
    if (!input.consent_contact) {
      return {
        content: { error: "נדרשת הסכמה לפנייה יזומה כדי להצטרף לרשימת ההמתנה." },
        isError: true,
      };
    }

    const result = await withTransaction(async (client) => {
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
          await client.query(
            `UPDATE patients SET consent_contact = TRUE, consent_at = now(),
               preferred_channel = COALESCE($2, preferred_channel)
             WHERE id = $1`,
            [patientId, input.patient.preferred_channel ?? null],
          );
        } else {
          const ins = await client.query<{ id: string }>(
            `INSERT INTO patients
               (full_name, email, phone, preferred_channel, consent_contact, consent_at)
             VALUES ($1, $2, $3, COALESCE($4,'email'), TRUE, now())
             RETURNING id`,
            [
              input.patient.full_name ?? null,
              input.patient.email ?? null,
              input.patient.phone ?? null,
              input.patient.preferred_channel ?? null,
            ],
          );
          patientId = ins.rows[0].id;
        }
      }

      const wl = await client.query<{ id: string }>(
        `INSERT INTO waitlist
           (patient_id, therapist_id, preferred_specialties, availability_windows)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          patientId,
          input.therapist_id ?? null,
          input.preferred_specialties ?? [],
          JSON.stringify(input.availability_windows ?? []),
        ],
      );
      return { waitlistId: wl.rows[0].id };
    });

    return { content: { ok: true, waitlist_id: result.waitlistId } };
  },
};
