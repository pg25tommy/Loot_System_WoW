// Phase list: create phases, switch which one is active, and jump into the
// end-of-phase transition tool from whichever phase you're leaving.
import Link from "next/link";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { createPhaseAction, activatePhaseAction } from "@/lib/actions/phase";

export default async function PhasesPage() {
  await requireOfficer();
  const phases = await prisma.phase.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Phases</h1>
        <p className="mt-1 text-sm text-muted">
          Set bracket config for a new phase before transitioning into it (see Bracket config).
        </p>
      </div>

      <form action={createPhaseAction} className="flex max-w-md items-end gap-3">
        <label className="flex-1 text-sm">
          New phase name
          <input name="name" required className="mt-1 w-full input" />
        </label>
        <button type="submit" className="btn">
          Create
        </button>
      </form>

      <ul className="divide-y divide-list">
        {phases.map((phase) => (
          <li key={phase.id} className="flex items-center justify-between py-3 text-sm">
            <div>
              <span className="font-medium">{phase.name}</span>
              {phase.isActive ? <span className="ml-2 text-xs text-success">active</span> : null}
            </div>
            <div className="flex items-center gap-3">
              {!phase.isActive ? (
                <form action={activatePhaseAction.bind(null, phase.id)}>
                  <button type="submit" className="link text-xs">Activate</button>
                </form>
              ) : null}
              <Link href={`/officer/phase/${phase.id}/transition`} className="link text-xs">
                Transition from here
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
