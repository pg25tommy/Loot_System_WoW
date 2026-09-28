// Admin-only officer account management. The self-demote/self-delete
// checkboxes and Remove button are hidden/disabled for your own row (see
// isSelf below) — the actual guard lives server-side in config.ts.
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createOfficerAction, deleteOfficerAction, updateOfficerRoleAction } from "@/lib/actions/config";

export default async function OfficersConfigPage() {
  const session = await requireAdmin();
  const officers = await prisma.officer.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Officers</h1>
        <p className="mt-1 text-sm text-muted">
          Admin only — only admins can add, edit, or remove officer accounts. Tank officers can claim tank priority
          and auto-win tiebreaks.
        </p>
      </div>

      <form action={createOfficerAction} className="grid max-w-lg gap-3 panel sm:grid-cols-2">
        <input name="username" placeholder="Username" required className="input" />
        <input name="password" type="password" placeholder="Password" required className="input" />
        <input name="displayName" placeholder="Display name" className="input sm:col-span-2" />
        <div className="flex gap-4 text-sm sm:col-span-2">
          <label className="flex items-center gap-1"><input type="checkbox" name="isAdmin" /> Admin</label>
          <label className="flex items-center gap-1"><input type="checkbox" name="isTankOfficer" /> Tank officer</label>
        </div>
        <button type="submit" className="btn sm:col-span-2">
          Create officer
        </button>
      </form>

      <ul className="divide-y divide-list text-sm">
        {officers.map((o) => {
          const isSelf = o.id === session.user.officerId;
          const updateAction = updateOfficerRoleAction.bind(null, o.id);
          const deleteAction = deleteOfficerAction.bind(null, o.id);
          return (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span>
                {o.displayName} ({o.username}){isSelf ? <span className="ml-2 text-xs text-muted">you</span> : null}
              </span>
              <form action={updateAction} className="flex items-center gap-3">
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" name="isAdmin" defaultChecked={o.isAdmin} disabled={isSelf} /> Admin
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" name="isTankOfficer" defaultChecked={o.isTankOfficer} /> Tank
                </label>
                <button type="submit" className="link text-xs">
                  Save
                </button>
              </form>
              {!isSelf ? (
                <form action={deleteAction}>
                  <button type="submit" className="text-xs text-danger underline">
                    Remove
                  </button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
