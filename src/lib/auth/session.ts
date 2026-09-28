// Auth guards for Server Components and Server Actions. Each require*()
// redirects rather than throwing, since these run during render/action
// dispatch where a thrown error would just crash the page.
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/authOptions";

/** Raw session read — null user when not logged in. */
export async function getOfficerSession() {
  return getServerSession(authOptions);
}

/** Gate for any officer-only page/action. Redirects to login if not signed in. */
export async function requireOfficer() {
  const session = await getOfficerSession();
  if (!session?.user) {
    redirect("/officer/login");
  }
  return session;
}

/** Gate for admin-only actions (officer account management). */
export async function requireAdmin() {
  const session = await requireOfficer();
  if (!session.user.isAdmin) {
    redirect("/officer");
  }
  return session;
}

/** Gate for tank-officer-only actions (tank priority claims, tank tiebreak overrides). */
export async function requireTankOfficer() {
  const session = await requireOfficer();
  if (!session.user.isTankOfficer) {
    redirect("/officer");
  }
  return session;
}
