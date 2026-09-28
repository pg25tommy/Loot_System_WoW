// Public "Recent loot" feed shown on the home page and reused (as a
// separate query) on the officer dashboard. getRecentDrops is exported
// separately so the home page can fetch it in parallel with its other
// queries instead of this component doing its own sequential fetch.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ResolutionMethodBadge } from "@/components/ui/ResolutionMethodBadge";
import { ClassIcon } from "@/components/ui/ClassIcon";
import { classColor } from "@/lib/wowClasses";

export type RecentDrop = Awaited<ReturnType<typeof getRecentDrops>>[number];

export function getRecentDrops(limit = 12) {
  return prisma.lootDrop.findMany({
    where: { status: "RESOLVED" },
    include: { item: true, winnerCharacter: true },
    orderBy: { resolvedAt: "desc" },
    take: limit,
  });
}

export function LootLogFeed({ drops }: { drops: RecentDrop[] }) {
  return (
    <div className="panel">
      <h2 className="text-sm font-semibold">Recent loot</h2>
      {drops.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No resolved drops yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-list">
          {drops.map((drop) => (
            <li key={drop.id} className="flex items-center gap-2 py-2 text-sm">
              {drop.winnerCharacter ? <ClassIcon className={drop.winnerCharacter.class} size="sm" /> : null}
              <div className="min-w-0 flex-1">
                <Link href={`/items/${drop.itemId}`} className="link font-medium">
                  {drop.item.name}
                </Link>
                <div className="text-xs text-muted">
                  {drop.winnerCharacter ? (
                    <Link
                      href={`/characters/${drop.winnerCharacter.id}`}
                      style={{ color: classColor(drop.winnerCharacter.class) }}
                    >
                      {drop.winnerCharacter.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                  {" · "}
                  {drop.raidDate.toLocaleDateString()}
                </div>
                {drop.resolutionSummary ? (
                  <div className="mt-0.5 text-xs text-faint">{drop.resolutionSummary}</div>
                ) : null}
              </div>
              {drop.resolutionMethod ? <ResolutionMethodBadge method={drop.resolutionMethod} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
