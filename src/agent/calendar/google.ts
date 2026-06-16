/**
 * Google Calendar integration.
 *
 * PHASE 0: this is a typed stub. The interface is final; the bodies return
 * deterministic placeholder data and are clearly marked so Phase 1 can fill in
 * the real `googleapis` freebusy / events / watch calls without touching callers.
 *
 * Design:
 *   - The center has ONE central calendar plus one calendar per therapist.
 *   - `getFreeBusy` checks REAL availability via the Calendar freebusy API.
 *   - `createEvent` / `deleteEvent` write through to keep both sides in sync.
 *   - `watchCalendar` registers push notifications so cancellations elsewhere
 *     (e.g. a therapist deleting an event) are detected and can trigger the
 *     waitlist outreach flow.
 */
import type { TimeSlot } from "@/types/domain";
import { logger } from "@/lib/logger";

export interface FreeBusyQuery {
  calendarId: string;
  timeMin: string; // ISO 8601
  timeMax: string; // ISO 8601
}

export interface BusyInterval {
  start: string;
  end: string;
}

export interface CalendarEventInput {
  calendarId: string;
  summary: string;
  startsAt: string;
  endsAt: string;
  /** Non-clinical description only. */
  description?: string;
  attendeeEmail?: string;
}

export interface CalendarPort {
  getFreeBusy(query: FreeBusyQuery): Promise<BusyInterval[]>;
  createEvent(input: CalendarEventInput): Promise<{ eventId: string }>;
  deleteEvent(calendarId: string, eventId: string): Promise<void>;
  watchCalendar(calendarId: string, webhookUrl: string): Promise<{ channelId: string }>;
}

/**
 * Phase 0 stub implementation. Returns no busy intervals (everything "free")
 * and fake event ids. Replace with a `googleapis`-backed adapter in Phase 1.
 */
class StubGoogleCalendar implements CalendarPort {
  async getFreeBusy(query: FreeBusyQuery): Promise<BusyInterval[]> {
    logger.debug("[stub] getFreeBusy", query);
    return [];
  }

  async createEvent(input: CalendarEventInput): Promise<{ eventId: string }> {
    logger.debug("[stub] createEvent", { calendarId: input.calendarId });
    return { eventId: `stub-event-${Date.now()}` };
  }

  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    logger.debug("[stub] deleteEvent", { calendarId, eventId });
  }

  async watchCalendar(
    calendarId: string,
    webhookUrl: string,
  ): Promise<{ channelId: string }> {
    logger.debug("[stub] watchCalendar", { calendarId, webhookUrl });
    return { channelId: `stub-channel-${Date.now()}` };
  }
}

let instance: CalendarPort | null = null;

/** Returns the active calendar adapter. Swappable for tests / Phase 1. */
export function getCalendar(): CalendarPort {
  if (!instance) instance = new StubGoogleCalendar();
  return instance;
}

/** Override the adapter (used by Phase 1 wiring and tests). */
export function setCalendar(adapter: CalendarPort): void {
  instance = adapter;
}

/**
 * Compute open slots from busy intervals within a window.
 * Pure helper so it can be unit-tested without hitting Google.
 */
export function computeOpenSlots(
  therapistId: string,
  windowStart: Date,
  windowEnd: Date,
  busy: BusyInterval[],
  slotMinutes: number,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const stepMs = slotMinutes * 60_000;
  const busyRanges = busy.map((b) => [
    new Date(b.start).getTime(),
    new Date(b.end).getTime(),
  ]);

  for (let t = windowStart.getTime(); t + stepMs <= windowEnd.getTime(); t += stepMs) {
    const slotStart = t;
    const slotEnd = t + stepMs;
    const overlaps = busyRanges.some(([bs, be]) => slotStart < be && slotEnd > bs);
    if (!overlaps) {
      slots.push({
        therapist_id: therapistId,
        starts_at: new Date(slotStart).toISOString(),
        ends_at: new Date(slotEnd).toISOString(),
      });
    }
  }
  return slots;
}
