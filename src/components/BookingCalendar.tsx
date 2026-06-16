"use client";
/**
 * BookingCalendar — the live booking widget shown inside the hero card.
 *
 * Flow: pick a date → pick a therapist (specific or "any suitable") → pick an
 * available time → fill a short form → submit a booking REQUEST (pending staff
 * approval, per the spec). Availability comes from /api/availability and the
 * request is sent to /api/booking-requests (which degrades to demo mode when
 * the DB isn't connected yet).
 */
import React, { useEffect, useState, useCallback } from "react";

const WEEKDAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

interface Therapist {
  id: string;
  name: string;
  specialties: string[];
}

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const isWeekendClosed = (dateStr: string) => {
  const wd = new Date(`${dateStr}T00:00:00`).getDay();
  return wd === 5 || wd === 6;
};

export default function BookingCalendar() {
  const now = new Date();
  const todayStr = fmt(now.getFullYear(), now.getMonth(), now.getDate());

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [therapistId, setTherapistId] = useState<string | "any">("any");

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [closed, setClosed] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [form, setForm] = useState({ full_name: "", phone: "", email: "", consent: false });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/therapists")
      .then((r) => r.json())
      .then((d) => setTherapists(d.therapists ?? []))
      .catch(() => setTherapists([]));
  }, []);

  const loadSlots = useCallback(async (date: string, tid: string | "any") => {
    setLoadingSlots(true);
    setSlots(null);
    setSelectedTime(null);
    try {
      const qs = new URLSearchParams({ date });
      if (tid !== "any") qs.set("therapistId", tid);
      const res = await fetch(`/api/availability?${qs}`);
      const data = await res.json();
      setClosed(Boolean(data.closed));
      setSlots(data.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  function pickDate(date: string) {
    setSelectedDate(date);
    setDone(null);
    setError(null);
    loadSlots(date, therapistId);
  }

  function pickTherapist(tid: string | "any") {
    setTherapistId(tid);
    if (selectedDate) loadSlots(selectedDate, tid);
  }

  async function submit() {
    if (!selectedDate || !selectedTime) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          time: selectedTime,
          therapistId: therapistId === "any" ? null : therapistId,
          patient: {
            full_name: form.full_name,
            phone: form.phone,
            email: form.email || undefined,
          },
          consent_contact: form.consent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שליחה נכשלה");
      setDone(
        data.message ??
          "הבקשה נשלחה! ניצור קשר לאישור הפגישה בהקדם.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "שגיאה");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSelectedDate(null);
    setSelectedTime(null);
    setSlots(null);
    setDone(null);
    setError(null);
    setForm({ full_name: "", phone: "", email: "", consent: false });
  }

  // Build month cells.
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const canGoPrev = !(viewYear === now.getFullYear() && viewMonth === now.getMonth());

  const therapistName =
    therapistId === "any"
      ? "כל מטפל מתאים"
      : therapists.find((t) => t.id === therapistId)?.name ?? "";

  return (
    <div className="bk">
      {/* Calendar */}
      <div className="bk-cal">
        <div className="bk-cal-head">
          <button
            className="bk-nav"
            onClick={() => {
              if (!canGoPrev) return;
              const m = viewMonth - 1;
              if (m < 0) { setViewMonth(11); setViewYear((y) => y - 1); }
              else setViewMonth(m);
            }}
            disabled={!canGoPrev}
            aria-label="חודש קודם"
          >
            ›
          </button>
          <span className="bk-cal-title">{MONTHS[viewMonth]} {viewYear}</span>
          <button
            className="bk-nav"
            onClick={() => {
              const m = viewMonth + 1;
              if (m > 11) { setViewMonth(0); setViewYear((y) => y + 1); }
              else setViewMonth(m);
            }}
            aria-label="חודש הבא"
          >
            ‹
          </button>
        </div>

        <div className="bk-grid bk-weekdays">
          {WEEKDAYS.map((d) => <span key={d} className="bk-weekday">{d}</span>)}
        </div>

        <div className="bk-grid">
          {cells.map((day, i) => {
            if (day === null) return <span key={`b${i}`} className="bk-cell empty" />;
            const date = fmt(viewYear, viewMonth, day);
            const past = date < todayStr;
            const closedDay = isWeekendClosed(date);
            const disabled = past || closedDay;
            const isSelected = date === selectedDate;
            const isToday = date === todayStr;
            return (
              <button
                key={day}
                className={`bk-cell${disabled ? " disabled" : ""}${isSelected ? " selected" : ""}${isToday ? " today" : ""}`}
                onClick={() => !disabled && pickDate(date)}
                disabled={disabled}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel */}
      <div className="bk-panel">
        {/* Therapist picker */}
        <div className="bk-section">
          <div className="bk-label">בחירת מטפל/ת</div>
          <div className="bk-chips">
            <button
              className={`bk-chip${therapistId === "any" ? " active" : ""}`}
              onClick={() => pickTherapist("any")}
            >
              כל מטפל מתאים
            </button>
            {therapists.map((t) => (
              <button
                key={t.id}
                className={`bk-chip${therapistId === t.id ? " active" : ""}`}
                onClick={() => pickTherapist(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>

        {/* Step content */}
        {done ? (
          <div className="bk-section bk-done">
            <strong>✓ {done}</strong>
            <button className="btn btn-ghost" onClick={reset} style={{ marginTop: "0.75rem" }}>
              בקשה נוספת
            </button>
          </div>
        ) : !selectedDate ? (
          <p className="bk-hint">בחרו תאריך מהלוח כדי לראות שעות פנויות.</p>
        ) : !selectedTime ? (
          <div className="bk-section">
            <div className="bk-label">שעות פנויות · {selectedDate}</div>
            {loadingSlots ? (
              <p className="bk-hint">טוען…</p>
            ) : closed ? (
              <p className="bk-hint">המרכז סגור בתאריך זה.</p>
            ) : slots && slots.length > 0 ? (
              <div className="bk-chips">
                {slots.map((s) => (
                  <button key={s} className="bk-chip" onClick={() => setSelectedTime(s)}>
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <p className="bk-hint">אין זמנים פנויים ביום זה.</p>
            )}
          </div>
        ) : (
          <div className="bk-section">
            <div className="bk-label">
              {selectedDate} · {selectedTime} · {therapistName}
            </div>
            <input
              className="bk-input"
              placeholder="שם מלא"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
            <input
              className="bk-input"
              placeholder="טלפון"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <input
              className="bk-input"
              placeholder="אימייל (לא חובה)"
              inputMode="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <label className="bk-consent">
              <input
                type="checkbox"
                checked={form.consent}
                onChange={(e) => setForm({ ...form, consent: e.target.checked })}
              />
              אני מאשר/ת שניצור קשר לתיאום הפגישה.
            </label>
            <div className="bk-actions">
              <button
                className="btn btn-primary"
                onClick={submit}
                disabled={submitting || !form.full_name || form.phone.length < 6 || !form.consent}
              >
                {submitting ? "שולח…" : "שליחת בקשה"}
              </button>
              <button className="btn btn-ghost" onClick={() => setSelectedTime(null)}>
                חזרה
              </button>
            </div>
            {error && <p className="bk-error">{error}</p>}
            <p className="bk-fineprint">הבקשה ממתינה לאישור הצוות. אינה אישור פגישה סופי.</p>
          </div>
        )}
      </div>
    </div>
  );
}
