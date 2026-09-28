// Wraps ResolveWizard with the item/character data and isTankOfficer flag
// (which gates the tank-priority controls) it needs.
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { ResolveWizard } from "@/components/loot/ResolveWizard";

export default async function ResolveLootPage() {
  const session = await requireOfficer();

  const [activePhase, items, characters] = await Promise.all([
    prisma.phase.findFirst({ where: { isActive: true } }),
    prisma.item.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.character.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, class: true },
    }),
  ]);

  if (!activePhase) {
    return (
      <p className="text-sm text-muted">
        No active phase configured. Set one up under Phases before resolving loot.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Resolve a loot drop</h1>
        <p className="mt-1 text-sm text-muted">
          Ranks eligible bidders, applies the tiebreak chain, and blocks the winning slot once you confirm.
        </p>
      </div>
      <ResolveWizard
        phaseId={activePhase.id}
        items={items}
        characters={characters}
        isTankOfficer={session.user.isTankOfficer}
      />
    </div>
  );
}
