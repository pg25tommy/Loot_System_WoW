// Wraps WorldBossForm with the active phase and character list it needs.
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { WorldBossForm } from "@/components/loot/WorldBossForm";

export default async function WorldBossPage() {
  await requireOfficer();

  const [activePhase, characters] = await Promise.all([
    prisma.phase.findFirst({ where: { isActive: true } }),
    prisma.character.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!activePhase) return <p className="text-sm text-muted">No active phase configured.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">World boss rolls</h1>
        <p className="mt-1 text-sm text-muted">Main spec = need, off spec = greed, everyone else passes.</p>
      </div>
      <WorldBossForm phaseId={activePhase.id} characters={characters} />
    </div>
  );
}
