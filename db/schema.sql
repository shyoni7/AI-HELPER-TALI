-- ═════════════════════════════════════════════════════════════════════════════
-- AI-HELPER-TALI — data model (Phase 0)
--
-- Tables: therapists, patients, appointments, waitlist, conversations.
-- Postgres 14+.
--
-- Privacy / security ("פרטיות ואבטחת מידע בריאותי מההתחלה"):
--   * No raw health notes are stored in this schema. Free-text clinical content
--     is intentionally kept out of Phase 0. The `reason` field on appointments is
--     a short, non-clinical label (e.g. "פגישת היכרות") — not a medical record.
--   * PII (name / email / phone) lives only on `patients`. Other tables reference
--     patients by id, so PII has a single source of truth and is easy to redact
--     or delete (right-to-erasure) by anonymizing one row.
--   * `conversations.transcript` may contain PII typed by the user; it is column-
--     scoped so it can be purged on a retention schedule. See PLAN.md §Privacy.
-- ═════════════════════════════════════════════════════════════════════════════

-- UUIDs as primary keys (avoids enumeration of patients via sequential ids).
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Reusable trigger to keep updated_at fresh.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- therapists — the center's practitioners. Each owns a Google Calendar.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS therapists (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT        NOT NULL,
  -- Specialties as text array, e.g. {'CBT','זוגי','ילדים'}. Used for matching.
  specialties         TEXT[]      NOT NULL DEFAULT '{}',
  -- Languages the therapist works in, e.g. {'he','en','ru'}.
  languages           TEXT[]      NOT NULL DEFAULT '{}',
  -- The therapist's Google Calendar id (freebusy + event source).
  google_calendar_id  TEXT        UNIQUE,
  -- Default session length in minutes.
  default_slot_minutes INTEGER    NOT NULL DEFAULT 50,
  active              BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_therapists_updated
  BEFORE UPDATE ON therapists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- patients — the single source of truth for PII.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS patients (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     TEXT,
  -- Stored lowercased; unique when present so we can dedupe returning patients.
  email         TEXT,
  phone         TEXT,
  -- Preferred contact channel for proactive outreach (waitlist offers).
  preferred_channel TEXT NOT NULL DEFAULT 'email'
                    CHECK (preferred_channel IN ('email', 'whatsapp')),
  preferred_language TEXT NOT NULL DEFAULT 'he',
  -- Consent flags — record that the user agreed to be contacted / data stored.
  consent_contact  BOOLEAN NOT NULL DEFAULT FALSE,
  consent_at       TIMESTAMPTZ,
  -- Set when a patient exercises right-to-erasure; PII columns nulled, row kept
  -- to preserve referential history without identifying the person.
  anonymized_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_patients_email
  ON patients (lower(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients (phone) WHERE phone IS NOT NULL;

CREATE TRIGGER trg_patients_updated
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- appointments — bookings, kept in sync with Google Calendar.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id    UUID NOT NULL REFERENCES therapists(id) ON DELETE RESTRICT,
  patient_id      UUID NOT NULL REFERENCES patients(id)   ON DELETE RESTRICT,
  starts_at       TIMESTAMPTZ NOT NULL,
  ends_at         TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'booked'
                  CHECK (status IN ('booked', 'cancelled', 'completed', 'no_show')),
  -- Short, non-clinical label only. NOT a medical record.
  reason          TEXT,
  -- Mirror of the Google Calendar event so cancellations sync both ways.
  gcal_event_id   TEXT,
  -- How the booking was created.
  source          TEXT NOT NULL DEFAULT 'chat'
                  CHECK (source IN ('chat', 'staff', 'waitlist')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_appointments_therapist_time
  ON appointments (therapist_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_patient
  ON appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON appointments (status);
-- Prevent two active bookings on the same therapist/slot at the DB layer.
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointments_active_slot
  ON appointments (therapist_id, starts_at)
  WHERE status = 'booked';

CREATE TRIGGER trg_appointments_updated
  BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- waitlist — patients waiting for a slot. Drives proactive outreach on cancels.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  -- Optional preference for a specific therapist; NULL = any.
  therapist_id    UUID REFERENCES therapists(id) ON DELETE SET NULL,
  -- Matching preferences.
  preferred_specialties TEXT[] NOT NULL DEFAULT '{}',
  -- Time windows the patient can attend, stored as structured JSON, e.g.
  -- [{"weekday":0,"from":"09:00","to":"14:00"}, ...]. No clinical content.
  availability_windows  JSONB  NOT NULL DEFAULT '[]',
  priority        INTEGER NOT NULL DEFAULT 0,  -- higher = contacted first
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'offered', 'placed', 'cancelled', 'expired')),
  -- Bookkeeping for the most recent outreach attempt.
  last_offered_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_active
  ON waitlist (status, priority DESC, created_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_waitlist_therapist ON waitlist (therapist_id);

CREATE TRIGGER trg_waitlist_updated
  BEFORE UPDATE ON waitlist
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- conversations — chat sessions with the agent.
-- `transcript` is a JSONB array of {role, content, ts}. May contain user-typed
-- PII; purge on a retention schedule (see PLAN.md §Privacy).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Nullable: a conversation can start before we identify the patient.
  patient_id      UUID REFERENCES patients(id) ON DELETE SET NULL,
  -- Opaque session token from the client (cookie / random id), not PII.
  session_token   TEXT,
  channel         TEXT NOT NULL DEFAULT 'web'
                  CHECK (channel IN ('web', 'whatsapp')),
  transcript      JSONB NOT NULL DEFAULT '[]',
  -- Set when the transcript is purged for retention; metadata row is kept.
  purged_at       TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_patient ON conversations (patient_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations (session_token);

CREATE TRIGGER trg_conversations_updated
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- M2: staff & authentication
-- ─────────────────────────────────────────────────────────────────────────────

-- staff_users — center employees (therapists) and managers. Phone-based login.
CREATE TABLE IF NOT EXISTS staff_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- E.164-normalized phone, the login identifier.
  phone         TEXT NOT NULL UNIQUE,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('therapist', 'manager')),
  -- Link to the therapist record when role = 'therapist'.
  therapist_id  UUID REFERENCES therapists(id) ON DELETE SET NULL,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_staff_users_updated
  BEFORE UPDATE ON staff_users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- auth_otp — one-time login codes. Only an HMAC of the code is stored, never
-- the plaintext. Short expiry + attempt cap mitigate brute force.
CREATE TABLE IF NOT EXISTS auth_otp (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_phone ON auth_otp (phone, created_at DESC);
