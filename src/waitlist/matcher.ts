/**
 * Smart waitlist matching.
 *
 * When an appointment is cancelled, a slot opens up. This module finds the best
 * waitlist candidates for that slot and (Phase 1) sends a proactive offer.
 *
 * Phase 0 ships the pure matching/scoring logic + the orchestration skeleton.
 * The DB reads/writes and notification send are wired but tolerant of the
 * stubbed calendar/email layers.
 */
import type { AvailabilityWindow, WaitlistEntry } from "@/types/domain";
import { query } from "@/lib/db";
import { notify } from "@/notifications";
import { logger } from "@/lib/logger";

export interface OpenSlot {
  therapistId: string;
  therapistName: string;
  therapistSpecialties: string[];
  startsAt: string; // ISO 8601
  endsAt: string; // ISO 8601
}

/** Does a slot fall inside any of the patient's availability windows? */
export function slotFitsWindows(
  startsAt: string,
  windows: AvailabilityWindow[],
): boolean {
  if (windows.length === 0) return true; // no constraints = available anytime
  const d = new Date(startsAt);
  const weekday = d.getUTCDay();
  const hhmm = d.toISOString().slice(11, 16); // "HH:mm" in UTC
  return windows.some(
    (w) => w.weekday === weekday && hhmm >= w.from && hhmm <= w.to,
  );
}

/**
 * Score how well a waitlist entry matches an open slot. Higher = better.
 * Pure and deterministic so it is trivially unit-testable.
 */
export function scoreCandidate(entry: WaitlistEntry, slot: OpenSlot): number {
  let score = 0;

  // Hard preference: specific therapist requested and it matches.
  if (entry.therapist_id) {
    if (entry.therapist_id !== slot.therapistId) return -1; // disqualified
    score += 100;
  }

  // Specialty overlap.
  const overlap = entry.preferred_specialties.filter((s) =>
    slot.therapistSpecialties.includes(s),
  ).length;
  score += overlap * 10;

  // Time-window fit is required; if it doesn't fit, disqualify.
  if (!slotFitsWindows(slot.startsAt, entry.availability_windows)) return -1;

  // Priority and waiting time (older entries rank higher).
  score += entry.priority * 5;
  const ageDays =
    (Date.now() - new Date(entry.created_at).getTime()) / 86_400_000;
  score += Math.min(ageDays, 30); // cap the age bonus at 30 days

  return score;
}

/** Load active waitlist entries that could plausibly match this slot. */
async function loadCandidates(slot: OpenSlot): Promise<WaitlistEntry[]> {
  // Either no therapist preference, or it matches this slot's therapist.
  return query<WaitlistEntry>(
    `SELECT * FROM waitlist
      WHERE status = 'active'
        AND (therapist_id IS NULL OR therapist_id = $1)
      ORDER BY priority DESC, created_at ASC`,
    [slot.therapistId],
  );
}

export interface MatchResult {
  entry: WaitlistEntry;
  score: number;
}

/** Rank candidates for a slot, best first, dropping disqualified ones. */
export function rankCandidates(
  candidates: WaitlistEntry[],
  slot: OpenSlot,
): MatchResult[] {
  return candidates
    .map((entry) => ({ entry, score: scoreCandidate(entry, slot) }))
    .filter((r) => r.score >= 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Orchestrate outreach for a freed slot: find the best candidate, send an
 * offer, and mark them as `offered`. Returns whether an offer went out.
 *
 * Phase 0 contacts only the single top candidate. A future iteration can fan
 * out to the top-N with a hold/first-come window.
 */
export async function handleFreedSlot(slot: OpenSlot): Promise<{ offered: boolean }> {
  const candidates = await loadCandidates(slot);
  const ranked = rankCandidates(candidates, slot);
  if (ranked.length === 0) {
    logger.info("no waitlist match for freed slot", {
      therapistId: slot.therapistId,
      startsAt: slot.startsAt,
    });
    return { offered: false };
  }

  const top = ranked[0].entry;
  const patients = await query<{
    full_name: string | null;
    email: string | null;
    phone: string | null;
    preferred_channel: "email" | "whatsapp";
  }>(
    `SELECT full_name, email, phone, preferred_channel
       FROM patients WHERE id = $1`,
    [top.patient_id],
  );
  const patient = patients[0];
  if (!patient) return { offered: false };

  const to =
    patient.preferred_channel === "email" ? patient.email : patient.phone;
  if (!to) {
    logger.warn("matched patient has no contact for preferred channel", {
      waitlistId: top.id,
      channel: patient.preferred_channel,
    });
    return { offered: false };
  }

  const when = new Date(slot.startsAt).toLocaleString("he-IL", {
    timeZone: "Asia/Jerusalem",
  });
  const result = await notify(patient.preferred_channel, {
    to,
    subject: "התפנה זמן לפגישה",
    body: `שלום${patient.full_name ? " " + patient.full_name : ""},\n\nהתפנה זמן לפגישה אצל ${slot.therapistName} בתאריך ${when}.\nהאם תרצו לקבוע? השיבו להודעה זו או חזרו לצ'אט כדי לאשר.`,
  });

  if (result.ok) {
    await query(
      `UPDATE waitlist SET status = 'offered', last_offered_at = now() WHERE id = $1`,
      [top.id],
    );
  }
  return { offered: result.ok };
}
