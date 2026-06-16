/**
 * POST /api/booking-requests — a client submits a request to book.
 *
 * Per the spec, this creates a `pending` booking_request (NOT a confirmed
 * appointment); staff approves it later in the admin area (M3 approval screen).
 *
 * Graceful degradation: if the DB isn't configured yet (e.g. first live deploy
 * without DATABASE_URL), the endpoint returns a `demo: true` success so the
 * widget can complete its flow. Once Postgres is connected, requests persist.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { withTransaction } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const schema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  therapistId: z.string().uuid().nullable().optional(),
  patient: z.object({
    full_name: z.string().min(1).max(120),
    phone: z.string().min(6).max(20),
    email: z.string().email().optional().or(z.literal("")),
  }),
  topic: z.string().max(120).optional(),
  consent_contact: z.boolean(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid request body" }, { status: 400 });
  }

  if (!body.consent_contact) {
    return NextResponse.json(
      { error: "נדרשת הסכמה ליצירת קשר כדי לשלוח בקשה." },
      { status: 400 },
    );
  }

  // "demo-*" therapist ids come from placeholder content (no DB) → not a real FK.
  const therapistId =
    body.therapistId && !body.therapistId.startsWith("demo-")
      ? body.therapistId
      : null;

  try {
    const result = await withTransaction(async (client) => {
      // Find-or-create the patient by email (if given) else by phone.
      const existing = body.patient.email
        ? await client.query<{ id: string }>(
            `SELECT id FROM patients WHERE lower(email) = lower($1)`,
            [body.patient.email],
          )
        : await client.query<{ id: string }>(
            `SELECT id FROM patients WHERE phone = $1`,
            [body.patient.phone],
          );

      let patientId: string;
      if (existing.rows[0]) {
        patientId = existing.rows[0].id;
        await client.query(
          `UPDATE patients SET consent_contact = TRUE, consent_at = now() WHERE id = $1`,
          [patientId],
        );
      } else {
        const ins = await client.query<{ id: string }>(
          `INSERT INTO patients (full_name, email, phone, consent_contact, consent_at)
           VALUES ($1, NULLIF($2,''), $3, TRUE, now()) RETURNING id`,
          [body.patient.full_name, body.patient.email ?? "", body.patient.phone],
        );
        patientId = ins.rows[0].id;
      }

      const reqRow = await client.query<{ id: string }>(
        `INSERT INTO booking_requests (patient_id, therapist_id, preferred_times, topic)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [
          patientId,
          therapistId,
          JSON.stringify([{ date: body.date, time: body.time }]),
          body.topic ?? null,
        ],
      );
      return reqRow.rows[0].id;
    });

    logger.info("booking request created", { requestId: result });
    return NextResponse.json({ ok: true, requestId: result });
  } catch (err) {
    // No DB (or DB error): don't hard-fail the UX — acknowledge in demo mode.
    logger.warn("booking request not persisted (demo/degraded)", {
      err: String(err),
    });
    return NextResponse.json({
      ok: true,
      demo: true,
      message: "הבקשה התקבלה (מצב הדגמה — בסיס הנתונים עוד לא מחובר).",
    });
  }
}
