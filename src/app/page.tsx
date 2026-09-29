// Public home page ("Roster"): searchable character list + the live recent-loot
// feed side by side. No login required — this is the read-only entry point
// members use to check their own or others' loot lists.
import Link from "next/link";
import { prisma } from "@/lib/db";
import { Icon } from "@/components/ui/Icon";
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

        <details className="info-collapse">
          <summary>
            <Icon name="chevronRight" size={16} className="info-collapse-caret" />
            How does this work?
          </summary>
          <div className="info-collapse-body">
            <p>No login needed — this whole site is read-only for browsing. Here&apos;s how to use it:</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>
                <strong>Find a character</strong> — search by name below or just scroll the list, then{" "}
                <strong>click their name</strong> to open their full loot sheet.
              </li>
              <li>
                <strong>Read their brackets</strong> — each raider has two lists, <strong>Current Tier</strong>{" "}
                and <strong>Misc / PvP</strong>, each split into five priority brackets (Bracket 1 is the
                highest) plus a bonus slot. That page shows every item they&apos;re bidding on, bracket by
                bracket.
              </li>
              <li>
                <strong>Check what&apos;s already won</strong> — a shaded, bold slot means that item&apos;s
                been won and the slot is spent (blocked until the next reset); everything else is still an
                open bid. From a character&apos;s page you can also pick another raider to compare sheets
                side by side.
              </li>
            </ol>
            <p className="mt-2">
              Only officers can actually change what&apos;s on a bid list — if you want something added or
              moved, ask one. The panel on the right shows what&apos;s dropped recently and how each winner
              was decided, and <Link href="/master-list" className="link">All Bids</Link> up top shows every
              raider&apos;s full sheet at once.
            </p>
          </div>
        </details>

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
