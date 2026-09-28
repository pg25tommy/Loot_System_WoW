// Public item detail page: who's currently bidding on it, and its full drop
// history with how each past winner was decided.
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ResolutionMethodBadge } from "@/components/ui/ResolutionMethodBadge";
import { trackLabel } from "@/lib/trackLabels";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const { itemId } = await params;

  const [item, bidders, dropHistory] = await Promise.all([
    prisma.item.findUnique({ where: { id: itemId } }),
    prisma.bidSlot.findMany({
      where: { itemId, status: { in: ["ACTIVE", "PENDING"] } },
      include: { character: true },
      orderBy: [{ track: "asc" }, { bracket: "asc" }],
    }),
    prisma.lootDrop.findMany({
      where: { itemId, status: "RESOLVED" },
      include: { winnerCharacter: true },
      orderBy: { raidDate: "desc" },
      take: 20,
    }),
  ]);
  if (!item) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{item.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {item.slot ?? "No slot set"}
          {item.sourceRaid ? ` · ${item.sourceRaid}` : ""}
          {item.sourceBoss ? ` (${item.sourceBoss})` : ""}
        </p>
      </div>

      <div>
        <h2 className="text-lg font-medium">Current bidders</h2>
        {bidders.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nobody has this on their loot list right now.</p>
        ) : (
          <ul className="mt-2 divide-y divide-list">
            {bidders.map((slot) => (
              <li key={slot.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/characters/${slot.characterId}`} className="hover:underline">
                  {slot.character.name}
                </Link>
                <span className="text-muted">
                  {trackLabel(slot.track)} · Bracket {slot.bracket}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-lg font-medium">Drop history</h2>
        {dropHistory.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No recorded drops yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-list">
            {dropHistory.map((drop) => (
              <li key={drop.id} className="py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>
                    {drop.winnerCharacter ? (
                      <Link href={`/characters/${drop.winnerCharacter.id}`} className="hover:underline">
                        {drop.winnerCharacter.name}
                      </Link>
                    ) : (
                      <span className="text-faint">no winner</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2 text-muted">
                    {drop.raidDate.toLocaleDateString()}
                    {drop.resolutionMethod ? <ResolutionMethodBadge method={drop.resolutionMethod} /> : null}
                  </span>
                </div>
                {drop.resolutionSummary ? (
                  <div className="mt-0.5 text-xs text-faint">{drop.resolutionSummary}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
