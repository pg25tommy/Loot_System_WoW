// Full log of every LootDrop (resolved, pending, or void), newest first.
import Link from "next/link";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default async function DropsLogPage() {
  await requireOfficer();

  const drops = await prisma.lootDrop.findMany({
    include: { item: true, winnerCharacter: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Drop log</h1>
      <ul className="divide-y divide-list">
        {drops.map((drop) => (
          <li key={drop.id}>
            <Link href={`/officer/loot/drops/${drop.id}`} className="flex items-center justify-between py-3 text-sm hover-row">
              <div>
                <span className="font-medium">{drop.item.name}</span>
                <span className="ml-2 text-muted">{drop.winnerCharacter?.name ?? "—"}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted">{drop.raidDate.toLocaleDateString()}</span>
                <StatusBadge status={drop.status} />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
