// Wraps TransitionPanel with the source phase and the list of possible
// target phases to transition into.
import { notFound } from "next/navigation";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { TransitionPanel } from "@/components/loot/TransitionPanel";
import { trackLabel } from "@/lib/trackLabels";

export default async function TransitionPage({
  params,
}: {
  params: Promise<{ phaseId: string }>;
}) {
  await requireOfficer();
  const { phaseId } = await params;

  const fromPhase = await prisma.phase.findUnique({ where: { id: phaseId } });
  if (!fromPhase) notFound();

  const otherPhases = await prisma.phase.findMany({
    where: { id: { not: phaseId } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">End-of-phase transition: {fromPhase.name}</h1>
        <p className="mt-1 text-sm text-muted">
          Moves this phase&apos;s {trackLabel("NON_LEGACY")} list to {trackLabel("LEGACY")} on the target phase,
          clears the old {trackLabel("LEGACY")} list, and builds a fresh {trackLabel("NON_LEGACY")} list. Bracket 0
          is excluded from the automatic carry — handle it in Discord per the rules, then use the identical-slot
          unlock below if needed.
        </p>
      </div>
      <TransitionPanel fromPhaseId={fromPhase.id} otherPhases={otherPhases.map((p) => ({ id: p.id, name: p.name }))} />
    </div>
  );
}
