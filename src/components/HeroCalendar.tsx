/**
 * HeroCalendar — a large, non-interactive month calendar shown inside the
 * scroll-reveal hero card. Purely visual for M1 (real booking lands in M3);
 * a few cells are highlighted to suggest available slots.
 *
 * Server component (no hooks) so it can be passed as children to the client
 * ContainerScroll component.
 */
const WEEKDAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
const MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

export default function HeroCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();

  const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // A handful of "available" days (deterministic-ish), excluding past days.
  const available = new Set(
    [today + 1, today + 3, today + 4, today + 8, today + 10].filter(
      (d) => d <= daysInMonth,
    ),
  );

  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="hero-cal">
      <div className="hero-cal-head">
        <span className="hero-cal-title">
          {MONTHS[month]} {year}
        </span>
        <span className="hero-cal-legend">
          <i className="dot" /> זמנים פנויים
        </span>
      </div>

      <div className="hero-cal-grid hero-cal-weekdays">
        {WEEKDAYS.map((d) => (
          <span key={d} className="hero-cal-weekday">
            {d}
          </span>
        ))}
      </div>

      <div className="hero-cal-grid">
        {cells.map((day, i) => {
          if (day === null) return <span key={`b${i}`} className="hero-cal-cell empty" />;
          const isToday = day === today;
          const isFree = available.has(day);
          return (
            <span
              key={day}
              className={`hero-cal-cell${isToday ? " today" : ""}${isFree ? " free" : ""}`}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}
