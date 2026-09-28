// One resolved (or in-progress) drop's detail view: how it was decided, its
// resolutionSummary, and the pass-chain panel if it's currently being passed.
import { notFound } from "next/navigation";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ResolutionMethodBadge } from "@/components/ui/ResolutionMethodBadge";
import { PassChainPanel } from "@/components/loot/PassChainPanel";
import { trackLabel } from "@/lib/trackLabels";

export default async function DropDetailPage({
  params,
}: {
  params: Promise<{ dropId: string }>;
}) {
  await requireOfficer();
  const { dropId } = await params;

  const drop = await prisma.lootDrop.findUnique({
    where: { id: dropId },
    include: {
      item: true,
      winnerCharacter: true,
      passRecords: { include: { character: true }, orderBy: { sequence: "asc" } },
    },
  });
  if (!drop) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{drop.item.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {drop.raidDate.toLocaleDateString()} · {trackLabel(drop.track)} {drop.droppedFrom ? `· ${drop.droppedFrom}` : ""}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <StatusBadge status={drop.status} />
          {drop.resolutionMethod ? <ResolutionMethodBadge method={drop.resolutionMethod} /> : null}
        </div>
        <p className="mt-2 text-sm">
          Current holder: <span className="font-medium">{drop.winnerCharacter?.name ?? "none"}</span>
        </p>
        {drop.resolutionSummary ? (
          <p className="mt-1 text-sm text-muted">{drop.resolutionSummary}</p>
        ) : null}
      </div>

      {drop.passRecords.length > 0 ? (
        <div>
          <h2 className="text-lg font-medium">Pass history</h2>
          <ul className="mt-2 divide-y divide-list text-sm">
            {drop.passRecords.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <span>{r.character.name}</span>
                <span className="text-muted">
                  {r.decision}
                  {r.reason ? ` — ${r.reason}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <PassChainPanel dropId={drop.id} currentHolderId={drop.winnerCharacterId} currentHolderName={drop.winnerCharacter?.name ?? null} />
    </div>
  );
}
