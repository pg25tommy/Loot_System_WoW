// Public home page ("Roster"): searchable character list + the live recent-loot
// feed side by side. No login required — this is the read-only entry point
// members use to check their own or others' loot lists.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ClassIcon } from "@/components/ui/ClassIcon";
import { classColor } from "@/lib/wowClasses";
import { LootLogFeed, getRecentDrops } from "@/components/LootLogFeed";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const [characters, recentDrops] = await Promise.all([
    prisma.character.findMany({
      where: {
        isActive: true,
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      include: { rankTier: true },
      orderBy: [{ rankTier: { sortOrder: "desc" } }, { name: "asc" }],
    }),
    getRecentDrops(12),
  ]);

  return (
    <div className="grid gap-8 sm:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Roster</h1>
          <p className="mt-1 text-sm text-muted">
            Pick a character to see their current loot list, bids, and blocked slots.
          </p>
        </div>

        <form className="max-w-sm">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by name..."
            className="w-full input"
          />
        </form>

        {characters.length === 0 ? (
          <p className="text-sm text-muted">No characters found.</p>
        ) : (
          <ul className="divide-y divide-list">
            {characters.map((character) => (
              <li key={character.id}>
                <Link
                  href={`/characters/${character.id}`}
                  className="flex items-center justify-between py-3 hover-row"
                >
                  <div className="flex items-center gap-3">
                    <ClassIcon className={character.class} size="sm" />
                    <div>
                      <span className="font-medium" style={{ color: classColor(character.class) }}>
                        {character.name}
                      </span>
                      <span className="ml-2 text-sm text-muted">
                        {character.class} · {character.spec}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted">{character.rankTier.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="min-w-0">
        <LootLogFeed drops={recentDrops} />
      </div>
    </div>
  );
}
