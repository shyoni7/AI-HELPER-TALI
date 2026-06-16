import Link from "next/link";
import { requireStaff } from "@/auth/guard";
import LogoutButton from "@/components/LogoutButton";

// Protected staff chrome. requireStaff() redirects to /staff/login when there
// is no valid session, so everything under this group is authenticated.
export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  manager: "מנהל/ת",
  therapist: "מטפל/ת",
};

export default async function StaffAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaff();

  return (
    <div className="staff-shell">
      <header className="staff-header">
        <div className="container inner">
          <Link href="/staff" className="brand">
            לוח ניהול
          </Link>
          <nav className="nav">
            <Link href="/staff">בקשות</Link>
            <Link href="/staff/calendar">יומן</Link>
            {session.role === "manager" && <Link href="/staff/therapists">מטפלים</Link>}
            <span className="tag">{ROLE_LABEL[session.role] ?? session.role}</span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="container" style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}>
        {children}
      </main>
    </div>
  );
}
