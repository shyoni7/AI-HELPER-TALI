/**
 * Domain types mirroring the database schema (db/schema.sql).
 * Kept hand-written and minimal for Phase 0; can be generated later.
 */

export type PreferredChannel = "email" | "whatsapp";
export type AppointmentStatus = "booked" | "cancelled" | "completed" | "no_show";
export type WaitlistStatus = "active" | "offered" | "placed" | "cancelled" | "expired";

export interface Therapist {
  id: string;
  full_name: string;
  specialties: string[];
  languages: string[];
  google_calendar_id: string | null;
  default_slot_minutes: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  preferred_channel: PreferredChannel;
  preferred_language: string;
  consent_contact: boolean;
  consent_at: string | null;
  anonymized_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  therapist_id: string;
  patient_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  reason: string | null;
  gcal_event_id: string | null;
  source: "chat" | "staff" | "waitlist";
  created_at: string;
  updated_at: string;
}

/** A recurring availability window the patient can attend. No clinical content. */
export interface AvailabilityWindow {
  weekday: number; // 0 = Sunday .. 6 = Saturday
  from: string; // "HH:mm"
  to: string; // "HH:mm"
}

export interface WaitlistEntry {
  id: string;
  patient_id: string;
  therapist_id: string | null;
  preferred_specialties: string[];
  availability_windows: AvailabilityWindow[];
  priority: number;
  status: WaitlistStatus;
  last_offered_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A free/busy slot used when checking real calendar availability. */
export interface TimeSlot {
  therapist_id: string;
  starts_at: string; // ISO 8601
  ends_at: string; // ISO 8601
}
