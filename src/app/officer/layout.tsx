// Shared officer chrome: sidebar nav + signed-in officer badge. The actual
// auth enforcement is middleware.ts, not this check — this only decides
// whether to render the sidebar (skipped on /officer/login, where there's
// no session yet).
import { getOfficerSession } from "@/lib/auth/session";
import { SignOutButton } from "@/components/officer/SignOutButton";
import { SidebarNav } from "@/components/officer/SidebarNav";

export default async function OfficerLayout({ children }: { children: React.ReactNode }) {
  const session = await getOfficerSession();

  if (!session?.user) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col gap-6 sm:flex-row">
      <aside className="shrink-0 sm:w-56">
        <div className="panel panel-sm mb-4 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{session.user.name}</div>
            <div className="text-xs text-faint">
              {session.user.isAdmin ? "Admin" : "Officer"}
              {session.user.isTankOfficer ? " · Tank" : ""}
            </div>
          </div>
          <SignOutButton />
        </div>
        <SidebarNav />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
