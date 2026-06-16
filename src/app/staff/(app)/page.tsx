import { requireStaff } from "@/auth/guard";

// Dashboard shell (M2). Live data (pending booking requests, today's
// appointments) is wired in M3/M4; for now this lays out the panels.
export default async function StaffDashboard() {
  const session = await requireStaff();

  return (
    <>
      <h1 style={{ fontSize: "1.6rem" }}>שלום 👋</h1>
      <p style={{ color: "var(--muted)" }}>
        ברוך/ה הבא/ה ללוח הניהול. בקשות הפגישה והיומן יופיעו כאן בשלבים הבאים.
      </p>

      <div className="grid" style={{ marginTop: "1.5rem" }}>
        <div className="card">
          <h3>בקשות ממתינות</h3>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            יתווסף ב‑M3 — אישור/דחיית בקשות פגישה מלקוחות.
          </p>
        </div>
        <div className="card">
          <h3>הפגישות שלי היום</h3>
          <p style={{ color: "var(--muted)", margin: 0 }}>
            יתווסף ב‑M4 — מתוך Google Calendar.
          </p>
        </div>
        {session.role === "manager" && (
          <div className="card">
            <h3>ניהול מטפלים</h3>
            <p style={{ color: "var(--muted)", margin: 0 }}>
              הוספה ועריכה של מטפלים (זמין למנהל/ת).
            </p>
          </div>
        )}
      </div>
    </>
  );
}
