/**
 * Server-side staff guards.
 *
 * Use in server components / layouts of the protected staff area. Reads the
 * session cookie, verifies the signature+expiry, and redirects to login if
 * absent/invalid. `requireRole` additionally enforces RBAC.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE,
  verifySessionToken,
  type SessionPayload,
  type StaffRole,
} from "./session";

/** Returns the session payload or redirects to /staff/login. */
export async function requireStaff(): Promise<SessionPayload> {
  const store = await cookies();
  const session = verifySessionToken(store.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/staff/login");
  return session;
}

/** Like requireStaff, but also enforces a minimum role. */
export async function requireRole(role: StaffRole): Promise<SessionPayload> {
  const session = await requireStaff();
  // Only 'manager' outranks 'therapist'. Extend if more roles are added.
  if (role === "manager" && session.role !== "manager") {
    redirect("/staff");
  }
  return session;
}

/** Non-redirecting read, for optional/conditional UI. */
export async function getStaffSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}
