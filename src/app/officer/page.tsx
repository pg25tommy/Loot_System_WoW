// Officer dashboard: quick stats + the most recent resolutions, with a
// primary CTA into the resolve wizard.
import Link from "next/link";
import { requireOfficer } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { Icon } from "@/components/ui/Icon";
import { ClassIcon } from "@/components/ui/ClassIcon";
import { classColor } from "@/lib/wowClasses";
import { ResolutionMethodBadge } from "@/components/ui/ResolutionMethodBadge";

function StatCard({
  icon,
  value,
  label,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  value: number;
  label: string;
}) {
  return (
    <div className="panel flex items-center gap-3">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
        style={{ background: "rgba(226,147,58,0.12)", color: "var(--accent)" }}
      >
        <Icon name={icon} size={20} />
      </span>
      <div>
        <div className="text-2xl font-bold leading-tight">{value}</div>
        <div className="text-sm text-muted">{label}</div>
      </div>
    </div>
  );
}

export default async function OfficerDashboardPage() {
  await requireOfficer();

  const [activePhase, characterCount, itemCount, recentDrops] = await Promise.all([
    prisma.phase.findFirst({ where: { isActive: true } }),
    prisma.character.count({ where: { isActive: true } }),
    prisma.item.count(),
    prisma.lootDrop.findMany({
      where: { status: "RESOLVED" },
      include: { item: true, winnerCharacter: true },
      orderBy: { resolvedAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Officer dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Active phase: {activePhase ? activePhase.name : "none set — visit Phases to create one"}
          </p>
        </div>
        <Link
          href="/officer/loot/resolve"
          className="btn"
        >
          <Icon name="resolve" size={16} />
          Resolve a drop
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard icon="characterCount" value={characterCount} label="Active characters" />
        <StatCard icon="itemCount" value={itemCount} label="Catalog items" />
        <StatCard icon="drops" value={recentDrops.length} label="Recent resolutions" />
      </div>

      <div>
        <h2 className="text-lg font-medium">Recent resolutions</h2>
        {recentDrops.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nothing resolved yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-list">
            {recentDrops.map((drop) => (
              <li key={drop.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  {drop.winnerCharacter ? <ClassIcon className={drop.winnerCharacter.class} size="sm" /> : null}
                  <div className="min-w-0">
                    <div className="truncate font-medium">{drop.item.name}</div>
                    <div className="text-xs text-muted">
                      {drop.winnerCharacter ? (
                        <span style={{ color: classColor(drop.winnerCharacter.class) }}>
                          {drop.winnerCharacter.name}
                        </span>
                      ) : (
                        "—"
                      )}
                    </div>
                    {drop.resolutionSummary ? (
                      <div className="mt-0.5 truncate text-xs text-faint">{drop.resolutionSummary}</div>
                    ) : null}
                  </div>
                </div>
                {drop.resolutionMethod ? <ResolutionMethodBadge method={drop.resolutionMethod} /> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
