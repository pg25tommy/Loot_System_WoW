// Wraps OpenRollForm with the item/character data it needs.
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { OpenRollForm } from "@/components/loot/OpenRollForm";

export default async function OpenRollsPage() {
  await requireOfficer();

  const [activePhase, items, characters] = await Promise.all([
    prisma.phase.findFirst({ where: { isActive: true } }),
    prisma.item.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.character.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!activePhase) {
    return <p className="text-sm text-muted">No active phase configured.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Open rolls</h1>
        <p className="mt-1 text-sm text-muted">
          For &quot;Open&quot; BoP items with no bids, or a pug MS&gt;OS raid where a guild member may win.
        </p>
      </div>
      <OpenRollForm phaseId={activePhase.id} items={items} characters={characters} />
    </div>
  );
}
